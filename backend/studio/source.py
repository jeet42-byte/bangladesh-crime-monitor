"""Where episodes get their facts: the public API, or a JSON fixture.

The studio reads through the same public read API the dashboard uses, with a
guest token, so it can only ever see records a visitor could see (approved,
public incidents). It never talks to the database directly.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

USER_AGENT = "BangladeshCrimeMonitor-Studio/1.0 (+https://bangladesh-crime-monitor.vercel.app)"


class SourceError(RuntimeError):
    pass


class Source:
    """Read-only access to incidents and aggregates."""

    #: True when the data is a sample fixture, so the renderer can watermark it.
    is_sample = False

    def summary(self) -> dict: raise NotImplementedError
    def trends(self, days: int) -> dict: raise NotImplementedError
    def categories(self, days: int) -> dict: raise NotImplementedError
    def thanas(self, days: int, limit: int = 10) -> dict: raise NotImplementedError
    def feed(self, *, start_date: datetime | None = None, limit: int = 50,
             category: str | None = None, thana: str | None = None) -> dict: raise NotImplementedError
    def incident(self, incident_id: str) -> dict: raise NotImplementedError
    def ttp_profiles(self, days: int = 90) -> dict: raise NotImplementedError

    def article_text(self, url: str, max_chars: int = 6000) -> str:
        """Best-effort plain text of a source article, for long-form scripts."""
        return fetch_article_text(url, max_chars=max_chars)


class ApiSource(Source):
    def __init__(self, base_url: str, timeout: float = 90.0) -> None:
        self.base = base_url.rstrip("/")
        self.client = httpx.Client(timeout=timeout, headers={"User-Agent": USER_AGENT})
        self._token: Optional[str] = None

    def _auth(self) -> dict:
        if self._token is None:
            response = self.client.post(f"{self.base}/api/v1/auth/guest")
            if response.status_code != 200:
                raise SourceError(f"Could not get a guest token: HTTP {response.status_code} {response.text[:200]}")
            self._token = response.json()["access_token"]
        return {"Authorization": f"Bearer {self._token}"}

    def _get(self, path: str, **params: Any) -> dict:
        clean = {k: v for k, v in params.items() if v is not None}
        url = f"{self.base}/api/v1{path}"
        for attempt in range(3):
            try:
                response = self.client.get(url, params=clean, headers=self._auth())
            except httpx.HTTPError as exc:
                if attempt == 2:
                    raise SourceError(f"GET {path} failed: {exc}") from exc
                continue
            if response.status_code == 401 and attempt < 2:
                self._token = None  # expired guest token
                continue
            if response.status_code >= 500 and attempt < 2:
                continue
            if response.status_code != 200:
                raise SourceError(f"GET {path}: HTTP {response.status_code} {response.text[:200]}")
            return response.json()
        raise SourceError(f"GET {path} failed after retries")

    def summary(self) -> dict:
        return self._get("/analytics/summary", days=30)

    def trends(self, days: int) -> dict:
        return self._get("/analytics/trends", days=max(7, days))

    def categories(self, days: int) -> dict:
        return self._get("/analytics/categories", days=days)

    def thanas(self, days: int, limit: int = 10) -> dict:
        return self._get("/analytics/thanas", days=days, limit=limit)

    def feed(self, *, start_date=None, limit=50, category=None, thana=None) -> dict:
        return self._get(
            "/crimes/feed",
            start_date=start_date.isoformat() if start_date else None,
            limit=min(limit, 200),
            category=category,
            thana=thana,
        )

    def incident(self, incident_id: str) -> dict:
        return self._get(f"/crimes/{incident_id}")

    def ttp_profiles(self, days: int = 90) -> dict:
        return self._get("/ttp/profiles", days=days)


class FixtureSource(Source):
    """Serves a JSON file shaped like the API responses. For demos and tests."""

    is_sample = True

    def __init__(self, path: str | Path) -> None:
        self.data = json.loads(Path(path).read_text(encoding="utf-8"))
        self.is_sample = bool(self.data.get("sample", True))

    def summary(self) -> dict:
        return self.data["summary"]

    def trends(self, days: int) -> dict:
        points = self.data["trends"]["points"][-days:]
        return {**self.data["trends"], "points": points, "window_days": days}

    def categories(self, days: int) -> dict:
        return self.data["categories"]

    def thanas(self, days: int, limit: int = 10) -> dict:
        return {"thanas": self.data["thanas"]["thanas"][:limit], "window_days": days}

    def feed(self, *, start_date=None, limit=50, category=None, thana=None) -> dict:
        items = list(self.data["feed"]["items"])
        if category:
            items = [i for i in items if i["crime_category"] == category]
        if thana:
            items = [i for i in items if i["thana_name"] == thana]
        return {"items": items[:limit], "total": len(items), "limit": limit, "offset": 0,
                "has_more": len(items) > limit}

    def incident(self, incident_id: str) -> dict:
        for item in self.data["feed"]["items"]:
            if item["id"] == incident_id:
                return item
        raise SourceError(f"Incident {incident_id} not in fixture")

    def ttp_profiles(self, days: int = 90) -> dict:
        return self.data.get("ttp", {"profiles": []})

    def article_text(self, url: str, max_chars: int = 6000) -> str:
        return self.data.get("articles", {}).get(url, "")


def fetch_article_text(url: str, max_chars: int = 6000) -> str:
    """Download a news page and keep its paragraph text. Never raises."""
    if not url or not url.startswith("http"):
        return ""
    try:
        from bs4 import BeautifulSoup

        response = httpx.get(url, timeout=25, follow_redirects=True, headers={"User-Agent": USER_AGENT})
        if response.status_code != 200 or "html" not in response.headers.get("content-type", ""):
            return ""
        soup = BeautifulSoup(response.text, "lxml")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
            tag.decompose()
        container = soup.find("article") or soup.body or soup
        paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
        text = "\n".join(p for p in paragraphs if len(p) > 40)
        return re.sub(r"\s+\n", "\n", text)[:max_chars]
    except Exception as exc:  # noqa: BLE001 - enrichment only
        logger.info("Article fetch skipped for %s: %s", url, exc)
        return ""


def open_source(fixture: str | None) -> Source:
    if fixture:
        return FixtureSource(fixture)
    base = os.environ.get("BACKEND_URL", "").strip()
    if not base:
        raise SourceError("Set BACKEND_URL (the API base URL), or pass --fixture for sample data.")
    return ApiSource(base)


def hours_ago(hours: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


@dataclass
class Incident:
    """The fields a script needs, flattened from the API shape."""

    id: str
    title: str
    narrative: str
    category: str
    date: str
    thana: str
    district: str
    lat: float
    lon: float
    source_url: str
    source_handle: str
    source_platform: str
    verification: str
    confidence: int
    penal_code_tags: list

    @classmethod
    def from_api(cls, row: dict) -> "Incident":
        return cls(
            id=str(row["id"]),
            title=row.get("title", ""),
            narrative=row.get("narrative", ""),
            category=row.get("crime_category", "Other"),
            date=row.get("incident_date", ""),
            thana=row.get("thana_name", ""),
            district=row.get("district", ""),
            lat=float(row.get("latitude") or 23.8),
            lon=float(row.get("longitude") or 90.4),
            source_url=row.get("source_url", ""),
            source_handle=row.get("source_handle") or _host(row.get("source_url", "")),
            source_platform=row.get("source_platform", ""),
            verification=row.get("verification_level", "single_source"),
            confidence=int(row.get("source_confidence") or 0),
            penal_code_tags=list(row.get("penal_code_tags") or []),
        )


def _host(url: str) -> str:
    match = re.match(r"https?://(?:www\.)?([^/]+)", url or "")
    return match.group(1) if match else ""
