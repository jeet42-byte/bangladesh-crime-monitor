"""Probe candidate public news sources from wherever the ingest job runs.

The development sandbox cannot reach news sites, so whether a feed exists, is
fresh, and lets an automated client read its articles can only be measured
from a GitHub runner - the same network the cron job uses. This prints one
line per candidate; nothing is written anywhere.

    python backend/tools/probe_sources.py
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote

import feedparser
import httpx

USER_AGENT = (
    "Mozilla/5.0 (compatible; BangladeshCrimeMonitor/1.0; "
    "+https://bangladesh-crime-monitor.vercel.app)"
)

# Outlet name -> candidate feed URLs, tried in order until one parses.
CANDIDATE_FEEDS: dict[str, list[str]] = {
    "New Age": ["https://www.newagebd.net/rss/rss.xml", "https://www.newagebd.net/feed"],
    "Daily Sun": ["https://www.daily-sun.com/rss/all-news", "https://www.daily-sun.com/feed"],
    "The Financial Express": ["https://thefinancialexpress.com.bd/rss", "https://today.thefinancialexpress.com.bd/feed"],
    "Daily Observer": ["https://www.observerbd.com/rss.php"],
    "UNB": ["https://unb.com.bd/rss", "https://unb.com.bd/feed"],
    "BSS": ["https://www.bssnews.net/rss", "https://www.bssnews.net/feed"],
    "The Business Post": ["https://businesspostbd.com/rss.xml"],
    "Bangla Tribune": ["https://www.banglatribune.com/feed/", "https://www.banglatribune.com/rss.xml"],
    "Samakal": ["https://samakal.com/rss.xml", "https://samakal.com/feed"],
    "Ittefaq": ["https://www.ittefaq.com.bd/rss.xml", "https://www.ittefaq.com.bd/feed"],
    "Kalbela": ["https://www.kalbela.com/rss.xml", "https://www.kalbela.com/feed"],
    "Desh Rupantor": ["https://www.deshrupantor.com/rss.xml"],
    "Bangladesh Pratidin": ["https://www.bd-pratidin.com/rss.xml"],
    "Manab Zamin": ["https://mzamin.com/rss.php", "https://mzamin.com/rss.xml"],
    "Naya Diganta": ["https://www.dailynayadiganta.com/rss.xml", "https://www.dailynayadiganta.com/rss"],
    "Inqilab": ["https://dailyinqilab.com/rss.xml"],
    "Bonik Barta": ["https://bonikbarta.com/rss.xml"],
    "Somoy News": ["https://www.somoynews.tv/rss.xml"],
    "Channel 24": ["https://www.channel24bd.tv/rss.xml"],
    "Jamuna TV": ["https://jamuna.tv/rss.xml"],
    "Barta24": ["https://barta24.com/rss.xml"],
    "Sarabangla": ["https://sarabangla.net/feed/"],
    "Bhorer Kagoj": ["https://www.bhorerkagoj.com/feed"],
    "Amader Shomoy": ["https://www.dainikamadershomoy.com/rss.xml"],
    "Daily Sangram": ["https://dailysangram.com/rss.xml"],
    "The Daily Star (Crime)": ["https://www.thedailystar.net/news/bangladesh/crime-justice/rss.xml"],
    "Bangla Tribune (Crime)": ["https://www.banglatribune.com/crime/feed/", "https://www.banglatribune.com/feed/crime"],
    "Prothom Alo (English)": ["https://en.prothomalo.com/feed"],
    "Dhaka Tribune (Bangla)": ["https://bangla.dhakatribune.com/feed"],
    "Jagonews24 (English)": ["https://www.jagonews24.com/en/rss/rss.xml"],
    "Risingbd (English)": ["https://www.risingbd.com/english/rss/rss.xml"],
}

# (query, locale) - Bangla queries need the Bangla edition or return nothing.
GOOGLE_NEWS_QUERIES = [
    ("Bangladesh murder OR robbery OR arrested OR police", "en"),
    ("Bangladesh harassment OR rape OR \"sexual assault\" OR stalking", "en"),
    ("Bangladesh cybercrime OR hacking OR sextortion OR bKash fraud", "en"),
    ("হত্যা OR ছিনতাই OR গ্রেপ্তার OR ধর্ষণ", "bn"),
    ("প্রতারণা OR হ্যাকিং OR সাইবার OR বিকাশ", "bn"),
    ("যৌন হয়রানি OR ইভটিজিং OR নির্যাতন", "bn"),
]

# Pages publishing aggregate statistics rather than incidents.
STATISTICS_PAGES = {
    "Ain o Salish Kendra (statistics)": "https://www.askbd.org/ask/category/statistics/",
    "Ain o Salish Kendra (home)": "https://www.askbd.org/",
    "Odhikar": "https://odhikar.org/",
    "Bangladesh Mahila Parishad": "https://mahilaparishad.org/",
    "BGD e-GOV CIRT alerts": "https://www.cirt.gov.bd/alerts/",
}

GDELT_QUERIES = [
    "Bangladesh murder sourcecountry:bangladesh",
    "(murder OR robbery OR rape OR harassment OR hacking) sourcecountry:bangladesh",
]

TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def _newest(parsed: feedparser.FeedParserDict) -> Optional[str]:
    stamps = []
    for entry in parsed.entries:
        struct = entry.get("published_parsed") or entry.get("updated_parsed")
        if struct:
            stamps.append(datetime(*struct[:6], tzinfo=timezone.utc))
    return max(stamps).strftime("%Y-%m-%d %H:%M") if stamps else None


async def _article_ok(client: httpx.AsyncClient, url: str) -> str:
    """Can an automated client read an article body, or is it walled?"""
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        return f"article-error:{type(exc).__name__}"
    text = response.text.lower()
    if response.status_code != 200:
        return f"article-{response.status_code}"
    if "just a moment" in text or "cf-chl" in text or "challenge-platform" in text:
        return "article-CLOUDFLARE"
    return f"article-ok({len(response.text) // 1024}KB)"


async def probe_feed(client: httpx.AsyncClient, outlet: str, urls: list[str]) -> str:
    last = "no-candidate"
    for url in urls:
        try:
            response = await client.get(url)
        except httpx.HTTPError as exc:
            last = f"{url} error:{type(exc).__name__}"
            continue
        parsed = feedparser.parse(response.content)
        if response.status_code == 200 and parsed.entries:
            first_link = parsed.entries[0].get("link", "")
            summaries = [len(e.get("summary", "")) for e in parsed.entries]
            article_hint = f"avg-summary={sum(summaries) // max(len(summaries), 1)}ch"
            article = await _article_ok(client, first_link) if first_link else "no-link"
            return (
                f"OK    {outlet:28} {url}  entries={len(parsed.entries)} "
                f"newest={_newest(parsed)} {article} {article_hint}"
            )
        last = f"{url} status={response.status_code} entries={len(parsed.entries)}"
    return f"FAIL  {outlet:28} {last}"


async def probe_google_news(client: httpx.AsyncClient, query: str, lang: str) -> str:
    url = (
        "https://news.google.com/rss/search?q="
        f"{quote(query + ' when:2d')}&hl={lang}&gl=BD&ceid=BD:{lang}"
    )
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        return f"FAIL  GoogleNews {query!r} error:{type(exc).__name__}"
    parsed = feedparser.parse(response.content)
    sources = sorted({e.get("source", {}).get("title", "?") for e in parsed.entries})
    samples = " | ".join(e.get("title", "")[:90] for e in parsed.entries[:3])
    resolved = "n/a"
    if parsed.entries:
        try:
            hop = await client.get(parsed.entries[0].link)
            resolved = f"{hop.status_code} -> {str(hop.url)[:80]}"
        except httpx.HTTPError as exc:
            resolved = f"error:{type(exc).__name__}"
    return (
        f"{'OK  ' if parsed.entries else 'FAIL'}  GoogleNews {query!r} status={response.status_code} "
        f"entries={len(parsed.entries)} outlets={len(sources)} first-link={resolved}\n"
        f"      outlets: {', '.join(sources[:25])}\n"
        f"      samples: {samples}"
    )


async def probe_gdelt(client: httpx.AsyncClient, query: str) -> str:
    url = (
        "https://api.gdeltproject.org/api/v2/doc/doc?query="
        f"{quote(query)}&mode=artlist&format=json&maxrecords=250&timespan=3d"
    )
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        return f"FAIL  GDELT {query!r} error:{type(exc).__name__}"
    try:
        articles = json.loads(response.text or "{}").get("articles", [])
    except ValueError:
        return f"FAIL  GDELT {query!r} status={response.status_code} body={response.text[:200]!r}"
    domains: dict[str, int] = {}
    for item in articles:
        domains[item.get("domain", "?")] = domains.get(item.get("domain", "?"), 0) + 1
    top = sorted(domains.items(), key=lambda kv: -kv[1])[:20]
    return (
        f"{'OK  ' if articles else 'FAIL'}  GDELT {query!r} status={response.status_code} "
        f"articles={len(articles)}\n      domains: {top}"
    )


async def main() -> None:
    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en,bn;q=0.9"},
        timeout=TIMEOUT,
        follow_redirects=True,
    ) as client:
        feed_lines = await asyncio.gather(
            *(probe_feed(client, outlet, urls) for outlet, urls in CANDIDATE_FEEDS.items())
        )
        print("=== RSS feeds ===")
        for line in sorted(feed_lines):
            print(line)
        print("\n=== Google News RSS ===")
        for query, lang in GOOGLE_NEWS_QUERIES:
            print(await probe_google_news(client, query, lang))
        print("\n=== Statistics / advisory pages ===")
        for name, url in STATISTICS_PAGES.items():
            print(f"      {name:34} {await _article_ok(client, url)}  {url}")
        print("\n=== GDELT DOC API ===")
        for query in GDELT_QUERIES:
            print(await probe_gdelt(client, query))
            await asyncio.sleep(6)  # GDELT asks for one request per 5s


if __name__ == "__main__":
    asyncio.run(main())
