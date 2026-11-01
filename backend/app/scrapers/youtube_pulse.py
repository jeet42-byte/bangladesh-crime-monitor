"""Find viral Bangladeshi videos and read their comment sections.

Uses the official YouTube Data API v3 (free key, 10,000 quota units a day):

    videos.list chart=mostPopular regionCode=BD   1 unit   what Bangladesh is watching
    newsroom channel RSS (no key, no quota)       0        what the TV newsrooms posted
    search.list (optional, per query)             100      a topic named in PULSE_SEARCHES
    videos.list id=... (50 ids per call)          1        views, likes, comment counts
    commentThreads.list (100 comments per page)   1        the comments themselves

A run of 15 videos costs well under 100 units.

Facebook would be the bigger audience, but reading comments on public posts
requires Meta's app review and scraping breaks its terms, so it is not used.

Privacy: comments are reduced to text and like count the moment they are
parsed. Author names, channel IDs and avatars are never kept.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

import feedparser
import httpx

from app.scrapers.youtube_scraper import FEED_URL, YOUTUBE_CHANNELS, _deobfuscate

logger = logging.getLogger(__name__)

API = "https://www.googleapis.com/youtube/v3"
TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: YouTube categories with no public-affairs reaction worth reading:
#: Film, Autos, Music, Pets, Sports, Travel, Gaming, Comedy.
EXCLUDED_CATEGORIES = frozenset({"1", "2", "10", "15", "17", "19", "20", "23"})

#: Below this a comment section says little about public mood.
MIN_COMMENTS = 40
#: Only recent videos: an old viral video is history, not pulse.
MAX_AGE = timedelta(days=5)

#: Optional topical searches (100 quota units each), Bangla first.
PULSE_SEARCHES: tuple[str, ...] = (
    "ঢাকা খবর",
)


@dataclass
class Video:
    video_id: str
    title: str
    channel: str
    published_at: Optional[datetime]
    category_id: str = ""
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    discovered_via: str = "trending"
    comments: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def url(self) -> str:
        return f"https://www.youtube.com/watch?v={self.video_id}"

    def virality(self, now: datetime) -> float:
        """Engagement per hour since publication, log-scaled."""
        hours = max(1.0, (now - (self.published_at or now)).total_seconds() / 3600)
        return math.log1p(self.view_count / hours) + 2 * math.log1p(self.comment_count / hours)


class YouTubeAPIError(RuntimeError):
    pass


class YouTubeClient:
    def __init__(self, api_key: str, client: Optional[httpx.Client] = None) -> None:
        if not api_key:
            raise YouTubeAPIError("YOUTUBE_API_KEY is not set")
        self.api_key = api_key
        self.client = client or httpx.Client(timeout=TIMEOUT)
        self.units = 0

    def _get(self, path: str, cost: int, **params: Any) -> Dict[str, Any]:
        params["key"] = self.api_key
        response = self.client.get(f"{API}/{path}", params=params)
        self.units += cost
        if response.status_code != 200:
            try:
                error = response.json()["error"]
                reason = error["errors"][0].get("reason", "")
                message = error.get("message", "")
            except (ValueError, KeyError, IndexError):
                reason, message = "", response.text[:200]
            raise YouTubeAPIError(f"{path} HTTP {response.status_code} {reason}: {message}")
        return response.json()

    # -- discovery ----------------------------------------------------------
    def trending(self, region: str = "BD", limit: int = 50) -> List[str]:
        data = self._get(
            "videos", 1, part="id", chart="mostPopular", regionCode=region, maxResults=min(limit, 50)
        )
        return [item["id"] for item in data.get("items", [])]

    def search(self, query: str, since: datetime, limit: int = 25) -> List[str]:
        data = self._get(
            "search", 100, part="id", q=query, type="video", regionCode="BD",
            relevanceLanguage="bn", order="viewCount", maxResults=min(limit, 50),
            publishedAfter=since.strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
        return [item["id"]["videoId"] for item in data.get("items", []) if item.get("id", {}).get("videoId")]

    def details(self, video_ids: Iterable[str]) -> List[Video]:
        ids = list(dict.fromkeys(video_ids))
        videos: List[Video] = []
        for start in range(0, len(ids), 50):
            data = self._get("videos", 1, part="snippet,statistics", id=",".join(ids[start:start + 50]))
            for item in data.get("items", []):
                videos.append(parse_video(item))
        return videos

    # -- comments -----------------------------------------------------------
    def comments(self, video_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        """Top comments by relevance, as {text, likes} only."""
        out: List[Dict[str, Any]] = []
        token: Optional[str] = None
        while len(out) < limit:
            params: Dict[str, Any] = {
                "part": "snippet", "videoId": video_id, "order": "relevance",
                "textFormat": "plainText", "maxResults": 100,
            }
            if token:
                params["pageToken"] = token
            data = self._get("commentThreads", 1, **params)
            out.extend(parse_comments(data))
            token = data.get("nextPageToken")
            if not token:
                break
        return out[:limit]


def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_video(item: Dict[str, Any]) -> Video:
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    return Video(
        video_id=item["id"],
        title=_deobfuscate(snippet.get("title", "")),
        channel=snippet.get("channelTitle", ""),
        published_at=_parse_time(snippet.get("publishedAt")),
        category_id=str(snippet.get("categoryId", "")),
        view_count=int(stats.get("viewCount", 0) or 0),
        like_count=int(stats.get("likeCount", 0) or 0),
        # Absent when comments are disabled.
        comment_count=int(stats.get("commentCount", 0) or 0),
    )


def parse_comments(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Keep the text and like count of each top-level comment; nothing else."""
    out = []
    for thread in data.get("items", []):
        top = thread.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
        text = (top.get("textOriginal") or top.get("textDisplay") or "").strip()
        if text:
            out.append({"text": text, "likes": int(top.get("likeCount", 0) or 0)})
    return out


def newsroom_video_ids(since: datetime, client: Optional[httpx.Client] = None) -> List[str]:
    """Recent uploads from the TV newsrooms, via keyless channel RSS."""
    http = client or httpx.Client(timeout=TIMEOUT)
    ids: List[str] = []
    for channel in YOUTUBE_CHANNELS:
        try:
            response = http.get(FEED_URL.format(channel_id=channel.channel_id))
            feed = feedparser.parse(response.content)
        except httpx.HTTPError as exc:
            logger.warning("newsroom feed %s failed: %s", channel.outlet, exc)
            continue
        for entry in feed.entries:
            published = _parse_time(entry.get("published"))
            video_id = entry.get("yt_videoid")
            if video_id and (published is None or published >= since):
                ids.append(video_id)
    return ids


def select_viral(
    videos: Iterable[Video],
    *,
    limit: int,
    skip: Iterable[str] = (),
    now: Optional[datetime] = None,
) -> List[Video]:
    """The most viral eligible videos, best first."""
    now = now or datetime.now(timezone.utc)
    skipped = set(skip)
    eligible = [
        v for v in videos
        if v.video_id not in skipped
        and v.category_id not in EXCLUDED_CATEGORIES
        and v.comment_count >= MIN_COMMENTS
        and (v.published_at is None or now - v.published_at <= MAX_AGE)
    ]
    eligible.sort(key=lambda v: v.virality(now), reverse=True)
    return eligible[:limit]
