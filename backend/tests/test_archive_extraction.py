"""Date and body extraction against the page shapes found by `probe`.

Run from backend/:  python -m pytest tests
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.scrapers.archive_harvester import (  # noqa: E402
    extract_body,
    extract_jsonld_body,
    extract_published,
)

PARA = "<p>" + "ঢাকায় অনলাইনে প্রতারণার অভিযোগে দুইজন গ্রেপ্তার হয়েছেন। " * 4 + "</p>"


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def test_jsonld_date_inside_graph():
    soup = _soup(
        '<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},'
        '{"@type":"NewsArticle","datePublished":"2026-02-01T10:00:00+06:00"}]}</script>'
    )
    assert extract_published(soup).date().isoformat() == "2026-02-01"


def test_unix_update_time_fallback():
    soup = _soup('<meta property="og:updated_time" content="1714022133">')
    assert extract_published(soup) == datetime.fromtimestamp(1714022133, tz=timezone.utc)


def test_visible_bangla_published_line_not_masthead():
    soup = _soup(
        "<div>২ নভেম্বর ২০২৬</div><div>প্রকাশিত: ১৫:৩০, ২৫ এপ্রিল ২০২৪</div>"
    )
    assert extract_published(soup).date().isoformat() == "2024-04-25"


def test_visible_english_published_line():
    soup = _soup("<span>Published: 12:00 AM, May 1, 2024</span>")
    assert extract_published(soup).date().isoformat() == "2024-05-01"


def test_no_date_stays_none():
    assert extract_published(_soup("<div>নভেম্বর ২০২৬</div>")) is None


def test_div_paragraph_body_fallback():
    block = "এটি একটি দীর্ঘ অনুচ্ছেদ যেখানে ঘটনাটির বিস্তারিত বর্ণনা আছে। " * 2
    soup = _soup(f"<div><div>{block}</div><div>{block}</div><div>{block}</div></div>")
    assert len(extract_body(soup, ("div.news-details",))) > 200


def test_jsonld_article_body():
    soup = _soup(
        '<script type="application/ld+json">{"@type":"NewsArticle","articleBody":"'
        + "Police arrested a hacker in Dhaka. " * 10
        + '"}</script>'
    )
    assert extract_jsonld_body(soup).startswith("Police arrested")
