"""Date and body extraction against the page shapes found by `probe`.

Run from backend/:  python -m pytest tests
"""

import json
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


def test_next_data_body_beats_related_headline_strip():
    from app.scrapers.archive_harvester import extract_script_body

    article = "<p>" + "চাঁপাইনবাবগঞ্জে ফেসবুকে প্রতারণার অভিযোগে একজনকে গ্রেপ্তার করেছে পুলিশ। " * 8 + "</p>"
    payload = json.dumps({"props": {"pageProps": {"news": {"title": "শিরোনাম", "details": article,
                                                           "image": "https://x/y.jpg"}}}})
    soup = _soup(f'<script id="__NEXT_DATA__" type="application/json">{payload}</script>'
                 '<div>related headline one</div>')
    text = extract_script_body(soup)
    assert text.startswith("চাঁপাইনবাবগঞ্জে") and "<p>" not in text and len(text) > 300


def test_next_f_stream_body():
    from app.scrapers.archive_harvester import extract_script_body

    html = "<p>" + "ঢাকায় অনলাইন জুয়ার চক্রের পাঁচ সদস্যকে আটক করেছে র‍্যাব। " * 8 + "</p>"
    rsc = '5:["$","div",null,{"dangerouslySetInnerHTML":{"__html":' + json.dumps(html) + '}}]'
    soup = _soup("<script>self.__next_f.push([1," + json.dumps(rsc) + "])</script>")
    assert "র‍্যাব" in extract_script_body(soup)


def test_script_body_ignores_code_and_urls():
    from app.scrapers.archive_harvester import extract_script_body

    junk = json.dumps({"a": "https://cdn.example.com/" + "x/" * 200, "css": ".a{b:c}" * 80})
    assert extract_script_body(_soup(f'<script id="__NEXT_DATA__">{junk}</script>')) == ""


def test_article_id():
    from app.scrapers.archive_harvester import article_id

    assert article_id("https://www.dhakapost.com/country/107546%0A") == 107546
    assert article_id("https://www.dhakapost.com/country") is None
