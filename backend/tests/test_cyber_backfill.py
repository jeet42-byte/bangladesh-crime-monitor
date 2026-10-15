"""Cybercrime gate and the --topic cyber discovery plumbing.

Run from backend/:  python -m pytest tests
"""

import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.parsers.cyber_lexicon import is_cyber_relevant, slug_is_cyber_candidate  # noqa: E402
from app.scrapers.archive_harvester import ArchiveSource, discover  # noqa: E402


@pytest.mark.parametrize(
    "text",
    [
        "Two held for hacking Facebook accounts and blackmailing women",
        "Fake bKash agent calls swindle Tk 5 lakh from farmer",
        "Youth arrested under Digital Security Act for Facebook post",
        "Bangladesh Bank heist: hackers stole $81 million",
        "Online gambling ring busted in Chattogram",
        "Sextortion gang targeting schoolgirls on Instagram",
        "NID data leak exposes millions of citizens",
        "Hackers launched ransomware attack on hospital, police tell press conference",
        "ফেসবুকে প্রতারণা, চক্রের তিন সদস্য গ্রেপ্তার",
        "বিকাশে প্রতারণা: প্রতারক চক্রের ২ সদস্য আটক",
        "সাইবার নিরাপত্তা আইনে মামলা, সাংবাদিক গ্রেফতার",
        "অনলাইনে জুয়া, চারজন আটক",
    ],
)
def test_keeps_cybercrime(text):
    assert is_cyber_relevant(text)


@pytest.mark.parametrize(
    "text",
    [
        "Robbers loot jewellery shop in Old Dhaka",
        "Garment exports rise 12 percent",
        "Cyber security awareness workshop held at university",
        "Hackathon winners announced",
        "Bangladesh beat Sri Lanka in the T20 match",
        "Apply now: government jobs circular",
        "Similar cases rise in Rajshahi",
        "বাজারে চালের দাম বেড়েছে",
        "",
    ],
)
def test_drops_everything_else(text):
    assert not is_cyber_relevant(text)


def test_slug_filter():
    star = "https://www.thedailystar.net/news/bangladesh/crime-justice/news/{}-3456789"
    assert slug_is_cyber_candidate(star.format("two-held-hacking-facebook-accounts"), strict=True)
    assert not slug_is_cyber_candidate(star.format("garment-exports-rise"), strict=True)
    assert not slug_is_cyber_candidate("https://www.thedailystar.net/news", strict=True)
    # Bengali outlets: section + numeric id is unjudgeable, keep for post-fetch.
    assert slug_is_cyber_candidate("https://www.jagonews24.com/country/news/1234567")


def test_discover_uses_topic_gate_and_extra_prefixes():
    queried = []

    def handler(request: httpx.Request) -> httpx.Response:
        params = parse_qs(urlparse(str(request.url)).query)
        prefix = params["url"][0]
        queried.append(prefix)
        rows = [["timestamp", "original"]]
        if prefix == "example.com/tech/*":
            rows += [
                ["20240101000000", "https://example.com/tech/hackers-breach-bank-server"],
                ["20240101000000", "https://example.com/tech/new-phone-launch-review"],
            ]
        return httpx.Response(200, text=json.dumps(rows))

    source = ArchiveSource("Example", "example.com", path_prefixes=("news/*",))

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await discover(
                client,
                source,
                from_date="20240101",
                to_date="20241231",
                slug_filter=slug_is_cyber_candidate,
                extra_prefixes=("tech/*",),
            )

    found = asyncio.run(run())
    assert queried == ["example.com/news/*", "example.com/tech/*"]
    assert [f["url"] for f in found] == ["https://example.com/tech/hackers-breach-bank-server"]
