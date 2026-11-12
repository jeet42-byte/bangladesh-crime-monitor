"""The four programmes, each built from live data into an :class:`Episode`.

* ``brief``     - সাপ্তাহিক অপরাধ চিত্র: the week in numbers. Fully templated,
                  no language model, so every number is exactly the API's.
* ``daily``     - আজকের অপরাধ সংবাদ: a vertical Short of the day's top stories.
* ``case``      - একটি ঘটনার বিস্তারিত: one corroborated case, long-form.
* ``explainer`` - সতর্ক থাকুন: how a common scam or crime pattern works and
                  how to protect yourself, from the TTP library.

Story formats use Gemini to write Bangla from the English records, under the
rules in :mod:`studio.safety`. Templates take over when no key is set, for
the daily Short; long-form needs the model.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from studio import bangla, llm, safety
from studio.episode import Episode, Scene
from studio.source import Incident, Source, hours_ago

logger = logging.getLogger(__name__)

DEFAULT_ASPECT = {"brief": "16:9", "daily": "9:16", "case": "16:9", "explainer": "9:16"}

SHOW_NAME = {
    "brief": "সাপ্তাহিক অপরাধ চিত্র",
    "daily": "আজকের অপরাধ সংবাদ",
    "case": "ঘটনার বিস্তারিত",
    "explainer": "সতর্ক থাকুন",
}

BASE_TAGS = ["বাংলাদেশ", "অপরাধ", "সংবাদ", "বাংলা নিউজ", "crime news bangladesh", "bangla news"]

# Practical, non-legal safety advice per category: things that hold anywhere
# in the country. Three short steps each.
TIPS: Dict[str, List[str]] = {
    "Robbery": [
        "রাতে নির্জন রাস্তা এড়িয়ে চলুন, সম্ভব হলে পরিচিত পথে চলাচল করুন।",
        "রিকশা বা সিএনজিতে মোবাইল ও ব্যাগ শরীরের ভেতরের দিকে রাখুন।",
        "ছিনতাইকারীর সঙ্গে ধস্তাধস্তি করবেন না; জীবন আগে, তারপর ৯৯৯-এ কল করুন।",
    ],
    "Theft": [
        "বাসা ছাড়ার আগে দরজা-জানালা ভালোভাবে বন্ধ করুন, মূল্যবান জিনিস চোখের আড়ালে রাখুন।",
        "ভিড়ের মধ্যে মানিব্যাগ ও মোবাইল সামনের পকেটে রাখুন।",
        "চুরি হলে দেরি না করে থানায় জিডি করুন; মোবাইলের আইএমইআই নম্বর লিখে রাখুন।",
    ],
    "Fraud": [
        "অগ্রিম টাকা চাইলে আগে বিক্রেতার পরিচয় ও ঠিকানা যাচাই করুন।",
        "বাজারদরের চেয়ে অনেক কম দামের অফার দেখলে সতর্ক হোন।",
        "প্রতারণার শিকার হলে লেনদেনের প্রমাণ রেখে দ্রুত থানায় অভিযোগ করুন।",
    ],
    "Cybercrime": [
        "ওটিপি বা পিন কাউকে বলবেন না, ব্যাংক বা বিকাশ কখনো তা চায় না।",
        "ফেসবুক ও ইমেইলে টু-ফ্যাক্টর অথেনটিকেশন চালু রাখুন।",
        "হয়রানি বা হ্যাকিং হলে স্ক্রিনশট রেখে পুলিশের সাইবার সহায়তায় যোগাযোগ করুন।",
    ],
    "Narcotics": [
        "সন্তান বা পরিচিত কারও আচরণে হঠাৎ পরিবর্তন দেখলে খোলামেলা কথা বলুন।",
        "এলাকায় মাদক বিক্রির তথ্য থাকলে ৯৯৯ বা নিকটস্থ থানায় জানান।",
        "আসক্তি থেকে মুক্তির জন্য সরকারি নিরাময় কেন্দ্রের সহায়তা নিন।",
    ],
    "Extortion": [
        "চাঁদা দাবির ফোন বা বার্তা সংরক্ষণ করুন।",
        "একা মোকাবিলা না করে ব্যবসায়ী সমিতি ও পুলিশকে জানান।",
        "হুমকি পেলে থানায় জিডি করুন এবং তার কপি রেখে দিন।",
    ],
    "Homicide": [
        "পারিবারিক বা জমি নিয়ে বিরোধ বাড়লে আগেভাগে স্থানীয় প্রশাসন বা আইনি সহায়তা নিন।",
        "হুমকি পেলে বিষয়টি গোপন না রেখে থানায় জিডি করুন।",
        "জরুরি অবস্থায় দেরি না করে ৯৯৯-এ কল করুন।",
    ],
    "Assault": [
        "উত্তেজনাপূর্ণ পরিস্থিতিতে তর্ক এড়িয়ে নিরাপদ দূরত্বে সরে যান।",
        "আহত হলে আগে চিকিৎসা নিন এবং চিকিৎসার কাগজ সংরক্ষণ করুন।",
        "হামলার শিকার হলে থানায় মামলা বা জিডি করুন।",
    ],
    "Human Trafficking": [
        "বিদেশে চাকরির প্রস্তাব পেলে এজেন্সির লাইসেন্স বিএমইটি-তে যাচাই করুন।",
        "পাসপোর্ট বা কাগজপত্র কারও হাতে তুলে দেবেন না।",
        "সন্দেহজনক কিছু দেখলে ৯৯৯ বা ১০৯-এ জানান।",
    ],
    "Sexual Violence": [
        "বিপদে পড়লে সঙ্গে সঙ্গে ৯৯৯ বা ১০৯-এ কল করুন।",
        "ভুক্তভোগীর পরিচয় কখনো প্রকাশ বা শেয়ার করবেন না; এটি আইনত দণ্ডনীয়।",
        "সরকারি ওয়ান-স্টপ ক্রাইসিস সেন্টারে বিনামূল্যে চিকিৎসা ও আইনি সহায়তা পাওয়া যায়।",
    ],
    "Domestic Violence": [
        "নির্যাতনের শিকার হলে ১০৯-এ কল করুন, এটি বিনামূল্যে ও চব্বিশ ঘণ্টা খোলা।",
        "বিশ্বস্ত কাউকে জানিয়ে রাখুন এবং প্রমাণ সংরক্ষণ করুন।",
        "বিনামূল্যে আইনি সহায়তার জন্য ১৬৪৩০-এ যোগাযোগ করুন।",
    ],
}
GENERAL_TIPS = [
    "বিপদে পড়লে সঙ্গে সঙ্গে ৯৯৯-এ কল করুন, এটি বিনামূল্যে।",
    "সন্দেহজনক কিছু দেখলে নিকটস্থ থানাকে জানান।",
    "যেকোনো অপরাধের শিকার হলে থানায় জিডি বা মামলা করুন এবং কপি রেখে দিন।",
]


class NotEnoughData(RuntimeError):
    pass


def _today() -> datetime:
    return datetime.now(timezone.utc).astimezone(bangla.BST)


def _outro(site: str, headline: str) -> Scene:
    return Scene(
        "outro",
        "প্রতিদিনের নিরাপত্তা তথ্য পেতে চ্যানেলটি সাবস্ক্রাইব করুন। নিরাপদে থাকুন।",
        {"headline": headline, "site": site, "note": safety.DISCLAIMER_BN},
        min_seconds=5.0,
    )


def _description(summary: str, sources: List[dict], site: str, hashtags: List[str]) -> str:
    parts = [summary.strip(), ""]
    if sources:
        parts.append("📌 সূত্র:")
        parts += [f"• {s['label']}: {s['url']}" for s in sources if s.get("url")]
        parts.append("")
    parts.append(f"⚠️ {safety.DISCLAIMER_BN}")
    parts.append("")
    parts.append("☎️ " + " | ".join(f"{label}: {num}" for num, label in safety.HELPLINES_BN))
    if site:
        parts.append(f"🌐 লাইভ ম্যাপ ও তথ্য: {site}")
    parts.append("")
    parts.append(" ".join(f"#{h}" for h in hashtags))
    return "\n".join(parts)


def _clip(text: str, limit: int) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


# ===========================================================================
# 1. Weekly brief - numbers only, no model
# ===========================================================================
def build_brief(src: Source, aspect: str, site: str) -> Episode:
    summary = src.summary()
    week = int(summary.get("total_7d") or 0)
    prev = int(summary.get("total_previous_7d") or 0)
    if week == 0:
        raise NotEnoughData("No incidents in the last 7 days; nothing to brief.")
    points = src.trends(14).get("points", [])[-14:]
    cats = [c for c in src.categories(7).get("categories", []) if c.get("count")]
    thanas = [t for t in src.thanas(7, 10).get("thanas", []) if t.get("count")]

    end = _today().date()
    start = end - timedelta(days=6)
    span = bangla.date_range(start, end)
    change = bangla.percent_change(week, prev)

    scenes: List[Scene] = [
        Scene("title",
              f"{span}। গত সাত দিনে সংবাদমাধ্যমে প্রকাশিত অপরাধের খবর বিশ্লেষণ করে দেখা যাক, কোথায় কী ঘটেছে।",
              {"kicker": SHOW_NAME["brief"], "headline": "এক সপ্তাহে বাংলাদেশের অপরাধ চিত্র", "subline": span}),
    ]

    stat_line = f"এই সপ্তাহে মোট {bangla.count(week)} অপরাধের খবর প্রকাশিত হয়েছে।"
    delta_text = None
    if change is not None and prev:
        if abs(change) < 2:
            stat_line += f" আগের সপ্তাহে এই সংখ্যা ছিল {bangla.count(prev)}, অর্থাৎ প্রায় একই রকম।"
            delta_text = "আগের সপ্তাহের প্রায় সমান"
        else:
            direction = "বেশি" if change >= 0 else "কম"
            stat_line += f" আগের সপ্তাহে এই সংখ্যা ছিল {bangla.count(prev)}, অর্থাৎ প্রায় {bangla.number(abs(change))} শতাংশ {direction}।"
            delta_text = f"আগের সপ্তাহের চেয়ে {bangla.number(abs(change))}% {direction}"
    scenes.append(Scene("stat", stat_line, {
        "label": "গত ৭ দিনে প্রকাশিত অপরাধের খবর",
        "value": week, "unit": "টি ঘটনা",
        "delta_pct": change if delta_text else None, "delta_text": delta_text,
        "note": "সংবাদমাধ্যম ও সরকারি সূত্রে প্রকাশিত, যাচাই করা প্রতিবেদন",
    }))

    if len(points) >= 5:
        peak = max(points, key=lambda p: p["count"])
        scenes.append(Scene(
            "trend",
            f"গত দুই সপ্তাহের দৈনিক হিসাবে সবচেয়ে বেশি খবর এসেছে {bangla.date_long(peak['date'])}, সেদিন {bangla.count(peak['count'])} ঘটনা।",
            {"title": "দৈনিক ঘটনার সংখ্যা, গত ১৪ দিন",
             "points": [{"count": p["count"], "label": bangla.date_short(p["date"])} for p in points]},
        ))

    if cats:
        total = sum(c["count"] for c in cats)
        top = cats[0]
        line = (f"ধরন অনুযায়ী শীর্ষে রয়েছে {bangla.category(top['category'])}, "
                f"মোট ঘটনার প্রায় {bangla.number(top['count'] / total * 100)} শতাংশ।")
        rest = [bangla.category(c["category"]) for c in cats[1:3]]
        if rest:
            line += f" এরপর রয়েছে {' ও '.join(rest)}।"
        scenes.append(Scene("bars", line, {
            "title": "কোন ধরনের অপরাধ বেশি",
            "items": [{"label": bangla.category(c["category"]), "value": c["count"],
                       "color": bangla.category_color(c["category"])} for c in cats[:6]],
        }))

    if thanas:
        names = [bangla.place(t["thana_name"]) for t in thanas]
        line = f"এলাকাভিত্তিক হিসাবে সবচেয়ে বেশি খবর এসেছে {names[0]} থেকে, {bangla.count(thanas[0]['count'])}।"
        if len(names) > 2:
            line += f" এরপর রয়েছে {names[1]} ও {names[2]}।"
        scenes.append(Scene("map", line, {
            "title": "সবচেয়ে বেশি ঘটনা যেসব এলাকায়",
            "points": [{"lat": t["latitude"], "lon": t["longitude"], "count": t["count"], "rank": n}
                       for n, t in enumerate(thanas, 1)],
            "top": [{"label": n, "value_text": bangla.count(t["count"])} for n, t in zip(names, thanas)],
        }))

    top_cat = cats[0]["category"] if cats else "Other"
    tips = TIPS.get(top_cat, GENERAL_TIPS)
    scenes.append(Scene(
        "steps",
        f"{bangla.category(top_cat)} থেকে নিরাপদ থাকতে কয়েকটি বিষয় মনে রাখুন। " + " ".join(tips),
        {"heading": f"{bangla.category(top_cat)} থেকে নিরাপদ থাকতে", "steps": tips,
         "helplines": list(safety.HELPLINES_BN[:3]), "color": bangla.category_color(top_cat)},
    ))
    scenes.append(_outro(site, "আপনার এলাকা কতটা নিরাপদ?"))

    title = f"এক সপ্তাহে {bangla.count(week)} অপরাধ: কোথায় কী ঘটল ({span})"
    summary_text = (f"{span} — এই সপ্তাহে বাংলাদেশে সংবাদমাধ্যমে প্রকাশিত {bangla.count(week)} অপরাধের খবরের "
                    f"বিশ্লেষণ: দৈনিক প্রবণতা, অপরাধের ধরন এবং সবচেয়ে বেশি ঘটনা যেসব এলাকায়।")
    hashtags = ["বাংলাদেশ", "অপরাধ", "সাপ্তাহিক_অপরাধ_চিত্র"]
    return Episode(
        format="brief", aspect=aspect, slug=f"brief-{end.isoformat()}", show=SHOW_NAME["brief"],
        title=_clip(title, 100), description=_description(summary_text, [], site, hashtags),
        tags=BASE_TAGS + ["সাপ্তাহিক অপরাধ", "crime statistics bangladesh"],
        thumbnail={"headline": "এক সপ্তাহে কোথায় কী ঘটল", "kicker": SHOW_NAME["brief"],
                   "badge": bangla.count(week), "color": "#ef4444"},
        scenes=scenes,
    )


# ===========================================================================
# 2. Daily Short
# ===========================================================================
DAILY_SCHEMA = {
    "type": "object",
    "properties": {
        "youtube_title": {"type": "string", "description": "Bangla YouTube title, under 70 characters, factual, no clickbait."},
        "hook": {"type": "string", "description": "Opening line, under 18 words, Bangla."},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "headline": {"type": "string", "description": "Bangla on-screen headline, under 55 characters."},
                    "narration": {"type": "string", "description": "Two Bangla sentences, under 38 words total, with attribution."},
                },
                "required": ["id", "headline", "narration"],
            },
        },
    },
    "required": ["youtube_title", "hook", "items"],
}


def _incident_brief(i: Incident) -> dict:
    return {
        "id": i.id,
        "category_bn": bangla.category(i.category),
        "place_bn": bangla.place_full(i.thana, i.district),
        "date_bn": bangla.date_long(i.date),
        "title_en": i.title,
        "summary_en": i.narrative,
        "source": i.source_handle,
        "verification": i.verification,
    }


def _fallback_item(i: Incident) -> dict:
    place = bangla.place_full(i.thana, i.district)
    return {
        "headline": f"{bangla.place(i.thana, i.district)} এলাকায় {bangla.category_of(i.category)} ঘটনা",
        "narration": f"{place} এলাকায় একটি {bangla.category_of(i.category)} ঘটনার খবর প্রকাশ করেছে {i.source_handle}। বিস্তারিত বিবরণে লিংক দেওয়া আছে।",
    }


def build_daily(src: Source, aspect: str, site: str, count: int = 4) -> Episode:
    rows = src.feed(start_date=hours_ago(30), limit=150).get("items", [])
    pool = [Incident.from_api(r) for r in rows]
    eligible = [i for i in pool if safety.story_eligible(i) and i.category not in safety.NON_CRIME_CATEGORIES]
    chosen = safety.pick_diverse(safety.rank_for_story(eligible), count)
    if not chosen:
        raise NotEnoughData("No story-eligible incidents in the last 30 hours.")

    notes: List[str] = []
    written: Dict[str, dict] = {}
    hook = f"গত চব্বিশ ঘণ্টায় দেশের আলোচিত {bangla.count(len(chosen))} অপরাধের খবর।"
    yt_title = f"আজকের অপরাধ সংবাদ: {bangla.date_long(_today())}"
    if llm.available():
        prompt = (
            "You write a 60-second Bangla YouTube Short summarising today's crime news in Bangladesh.\n"
            + safety.STYLE_RULES
            + "\nFor each incident below write an on-screen headline and a two-sentence narration in Bangla, "
            "using the given Bangla place names. Keep the same ids. Then a hook line and a YouTube title.\n\n"
            + "Incidents (JSON):\n" + _json([_incident_brief(i) for i in chosen])
        )
        try:
            out = llm.generate_json(prompt, DAILY_SCHEMA, temperature=0.4)
            written = {str(item.get("id")): item for item in out.get("items", [])}
            hook = safety.scrub(out.get("hook") or hook)
            yt_title = safety.scrub(out.get("youtube_title") or yt_title)
        except llm.LLMUnavailable as exc:
            notes.append(f"Gemini unavailable ({exc}); used template narration.")
    else:
        notes.append("GEMINI_API_KEY not set; used template narration (thin). Set it for real scripts.")

    scenes = [Scene("title", hook, {
        "kicker": SHOW_NAME["daily"],
        "headline": f"২৪ ঘণ্টায় দেশের আলোচিত {bangla.count(len(chosen))} ঘটনা",
        "subline": bangla.date_long(_today(), weekday=True),
    }, min_seconds=3.0)]
    sources = []
    for n, inc in enumerate(chosen, 1):
        item = written.get(inc.id) or _fallback_item(inc)
        if inc.id not in written and written:
            notes.append(f"Model skipped incident {inc.id}; used template text.")
        scenes.append(Scene("incident", safety.scrub(item["narration"]), {
            "counter": f"{bangla.digits(n)}/{bangla.digits(len(chosen))}",
            "category": bangla.category(inc.category),
            "color": bangla.category_color(inc.category),
            "headline": _clip(safety.scrub(item["headline"]), 70),
            "place": bangla.place_full(inc.thana, inc.district),
            "date": bangla.date_long(inc.date),
            "source": inc.source_handle,
            "lat": inc.lat, "lon": inc.lon,
        }, min_seconds=4.0))
        sources.append({"label": inc.source_handle, "url": inc.source_url})
    scenes.append(Scene("outro", "এমন আরও খবর পেতে সাবস্ক্রাইব করুন।",
                        {"headline": "নিরাপদ থাকুন", "site": site, "note": safety.DISCLAIMER_BN}, min_seconds=3.5))

    summary = "গত ২৪ ঘণ্টায় বাংলাদেশে সংবাদমাধ্যমে প্রকাশিত আলোচিত অপরাধের খবর, সংক্ষেপে।"
    hashtags = ["shorts", "বাংলাদেশ", "অপরাধ", "আজকের_খবর"]
    lead = chosen[0]
    return Episode(
        format="daily", aspect=aspect, slug=f"daily-{_today().date().isoformat()}", show=SHOW_NAME["daily"],
        title=_clip(yt_title, 90), description=_description(summary, sources, site, hashtags),
        tags=BASE_TAGS + ["আজকের খবর", "shorts"],
        thumbnail={"headline": f"২৪ ঘণ্টায় আলোচিত {bangla.count(len(chosen))} ঘটনা", "kicker": SHOW_NAME["daily"],
                   "badge": bangla.category(lead.category), "color": bangla.category_color(lead.category)},
        scenes=scenes, sources=sources, notes=notes,
    )


# ===========================================================================
# 3. Case story, long-form
# ===========================================================================
CASE_SCHEMA = {
    "type": "object",
    "properties": {
        "youtube_title": {"type": "string", "description": "Bangla, under 80 characters, factual, no clickbait."},
        "headline": {"type": "string", "description": "Bangla on-screen headline, under 60 characters."},
        "thumbnail_text": {"type": "string", "description": "Bangla, 2-5 words, for the thumbnail."},
        "hook": {"type": "string", "description": "Opening narration, 25-45 words: what happened and why it matters, no spoilers beyond the facts."},
        "setup": {"type": "string", "description": "Narration over the where/when card, 30-60 words."},
        "sections": {
            "type": "array",
            "description": "3 to 6 sections telling the story in order, then its context.",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string", "description": "Bangla, under 45 characters."},
                    "narration": {"type": "string", "description": "Bangla, 60-120 words."},
                    "bullets": {"type": "array", "items": {"type": "string"}, "description": "2-3 short Bangla on-screen points, under 60 characters each."},
                },
                "required": ["heading", "narration", "bullets"],
            },
        },
        "safety_steps": {"type": "array", "items": {"type": "string"}, "description": "3 practical Bangla steps for viewers, under 90 characters each."},
        "summary": {"type": "string", "description": "Two-sentence Bangla summary for the YouTube description."},
    },
    "required": ["youtube_title", "headline", "thumbnail_text", "hook", "setup", "sections", "safety_steps", "summary"],
}


def _pick_case(src: Source, incident_id: Optional[str]) -> Incident:
    if incident_id:
        inc = Incident.from_api(src.incident(incident_id))
        if not safety.story_eligible(inc):
            raise NotEnoughData(
                f"Incident {incident_id} is not eligible for a story video "
                f"(category {inc.category}, verification {inc.verification})."
            )
        return inc
    rows = src.feed(start_date=hours_ago(24 * 10), limit=200).get("items", [])
    pool = [Incident.from_api(r) for r in rows]
    eligible = [i for i in pool if safety.story_eligible(i) and i.category not in safety.NON_CRIME_CATEGORIES]
    if not eligible:
        raise NotEnoughData("No eligible incident in the last 10 days.")
    rank = {"corroborated": 2, "single_source": 1}
    return max(eligible, key=lambda i: (rank.get(i.verification, 0), len(i.narrative), i.date))


def build_case(src: Source, aspect: str, site: str, incident_id: Optional[str] = None) -> Episode:
    if not llm.available():
        raise NotEnoughData("The case format needs GEMINI_API_KEY to write a long-form script.")
    inc = _pick_case(src, incident_id)
    since = hours_ago(24 * 90)
    local = src.feed(start_date=since, limit=1, category=inc.category, thana=inc.thana).get("total", 0)
    national = src.feed(start_date=since, limit=1, category=inc.category).get("total", 0)
    article = src.article_text(inc.source_url)

    prompt = (
        "You write a calm, factual long-form Bangla YouTube video script (about 4-7 minutes) about one "
        "crime incident in Bangladesh, for a public-safety news channel.\n"
        + safety.STYLE_RULES
        + "8. If the article text below is empty or unrelated, use only the record summary and keep the "
        "script short (3 sections). Never pad with invented detail. Context sections may explain the general "
        "pattern, the relevant law in plain words, and the official process, without giving legal advice.\n\n"
        f"Record (JSON):\n{_json(_incident_brief(inc))}\n"
        f"Penal code tags: {inc.penal_code_tags}\n\n"
        f"Article text from the source (may be Bangla or English):\n{article[:6000] or '(not available)'}\n"
    )
    out = llm.generate_json(prompt, CASE_SCHEMA, temperature=0.5)

    place = bangla.place_full(inc.thana, inc.district)
    color = bangla.category_color(inc.category)
    cat = bangla.category(inc.category)
    scenes = [
        Scene("title", safety.scrub(out["hook"]), {
            "kicker": cat, "color": color, "headline": _clip(safety.scrub(out["headline"]), 80),
            "subline": f"{place} · {bangla.date_long(inc.date)}"}),
        Scene("incident", safety.scrub(out["setup"]), {
            "category": cat, "color": color, "headline": _clip(safety.scrub(out["headline"]), 80),
            "place": place, "date": bangla.date_long(inc.date), "source": inc.source_handle,
            "lat": inc.lat, "lon": inc.lon}),
    ]
    for sec in out.get("sections", [])[:6]:
        scenes.append(Scene("points", safety.scrub(sec["narration"]), {
            "heading": _clip(safety.scrub(sec["heading"]), 60),
            "items": [_clip(safety.scrub(b), 90) for b in sec.get("bullets", [])[:3]],
            "color": color}))
    if national >= 5:
        line = f"আমাদের তথ্যভান্ডার অনুযায়ী, গত নব্বই দিনে সারা দেশে {bangla.category_of(inc.category)} {bangla.count(national)} খবর প্রকাশিত হয়েছে"
        line += f", যার {bangla.count(local)} {bangla.place(inc.thana)} এলাকায়।" if local else "।"
        scenes.append(Scene("stat", line, {
            "label": f"গত ৯০ দিনে সারা দেশে {bangla.category_of(inc.category)} খবর", "value": national, "unit": "টি",
            "note": f"{bangla.place(inc.thana)} এলাকায় {bangla.count(local)}" if local else ""}))
    steps = [_clip(safety.scrub(s), 110) for s in out.get("safety_steps", [])[:3]] or TIPS.get(inc.category, GENERAL_TIPS)
    scenes.append(Scene("steps", "নিজেকে ও পরিবারকে নিরাপদ রাখতে মনে রাখুন। " + " ".join(steps), {
        "heading": "নিরাপদ থাকতে যা করবেন", "steps": steps, "helplines": list(safety.HELPLINES_BN[:3]),
        "color": color}))
    scenes.append(_outro(site, "সত্য তথ্য, নিরাপদ সমাজ"))

    sources = [{"label": inc.source_handle, "url": inc.source_url}]
    hashtags = ["বাংলাদেশ", "অপরাধ", cat.replace(" ", "_")]
    return Episode(
        format="case", aspect=aspect, slug=f"case-{inc.id[:8]}", show=SHOW_NAME["case"],
        title=_clip(safety.scrub(out["youtube_title"]), 100),
        description=_description(safety.scrub(out.get("summary", "")), sources, site, hashtags),
        tags=BASE_TAGS + [cat, bangla.place(inc.thana)],
        thumbnail={"headline": _clip(safety.scrub(out.get("thumbnail_text") or out["headline"]), 40),
                   "kicker": cat, "badge": bangla.place(inc.thana), "color": color},
        scenes=scenes, sources=sources,
        notes=[] if article else ["Source article could not be fetched; script is based on the short record only."],
    )


# ===========================================================================
# 4. Safety explainer from the TTP library
# ===========================================================================
EXPLAINER_SCHEMA = {
    "type": "object",
    "properties": {
        "youtube_title": {"type": "string", "description": "Bangla, under 70 characters, e.g. a warning or question."},
        "headline": {"type": "string", "description": "Bangla on-screen title, under 50 characters."},
        "thumbnail_text": {"type": "string", "description": "Bangla, 2-4 words."},
        "hook": {"type": "string", "description": "Bangla, 15-30 words, speaks to the viewer directly."},
        "stages": {
            "type": "array",
            "description": "One per stage of the pattern, in order (2-4).",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string", "description": "Bangla, under 40 characters."},
                    "narration": {"type": "string", "description": "Bangla, 25-45 words."},
                    "signs": {"type": "array", "items": {"type": "string"}, "description": "2-3 warning signs, Bangla, under 55 characters each."},
                },
                "required": ["heading", "narration", "signs"],
            },
        },
        "protect": {"type": "array", "items": {"type": "string"}, "description": "3-4 protective steps, Bangla, under 80 characters each."},
        "if_victim": {"type": "array", "items": {"type": "string"}, "description": "2-3 steps if it already happened, Bangla, under 80 characters each."},
        "summary": {"type": "string", "description": "Two Bangla sentences for the description."},
    },
    "required": ["youtube_title", "headline", "thumbnail_text", "hook", "stages", "protect", "if_victim", "summary"],
}


def build_explainer(src: Source, aspect: str, site: str, topic: Optional[str] = None) -> Episode:
    if not llm.available():
        raise NotEnoughData("The explainer format needs GEMINI_API_KEY to write the Bangla script.")
    profiles = src.ttp_profiles(90).get("profiles", [])
    if not profiles:
        raise NotEnoughData("No TTP profiles returned by the API.")
    if topic:
        matches = [p for p in profiles if p["id"] == topic]
        if not matches:
            raise NotEnoughData(f"No profile '{topic}'. Options: {', '.join(p['id'] for p in profiles)}")
        prof = matches[0]
    else:
        ranked = sorted(profiles, key=lambda p: p.get("observed_count", 0), reverse=True)[:4]
        prof = ranked[_today().isocalendar().week % len(ranked)]

    public_treatments = [t for t in prof.get("treatments", []) if t.get("audience") == "citizen"]
    brief = {
        "name": prof["name"], "summary": prof["summary"],
        "stages": [{"name": s["name"], "description": s["description"], "indicators": s["indicators"]}
                   for s in prof.get("stages", [])],
        "countermeasures": [t["action"] for t in public_treatments][:8],
    }
    prompt = (
        "You write a 60-90 second Bangla YouTube Short that warns ordinary people in Bangladesh about a crime "
        "pattern and tells them how to protect themselves.\n" + safety.STYLE_RULES
        + "8. Speak to the viewer as 'আপনি'. Practical and calm, never fear-mongering.\n\n"
        f"Pattern (JSON, English):\n{_json(brief)}\n"
    )
    out = llm.generate_json(prompt, EXPLAINER_SCHEMA, temperature=0.5)
    color = bangla.category_color(prof.get("categories", ["Other"])[0])
    scenes = [Scene("title", safety.scrub(out["hook"]), {
        "kicker": SHOW_NAME["explainer"], "color": color, "headline": _clip(safety.scrub(out["headline"]), 70),
        "subline": "কীভাবে ঘটে, কীভাবে বাঁচবেন"})]
    observed = int(prof.get("observed_count") or 0)
    if observed >= 3:
        scenes.append(Scene("stat",
                            f"গত নব্বই দিনে আমাদের তথ্যভান্ডারে এই ধরনের {bangla.count(observed)} ঘটনার খবর এসেছে।",
                            {"label": "গত ৯০ দিনে এমন ঘটনার খবর", "value": observed, "unit": "টি"}, min_seconds=3.5))
    for n, stage in enumerate(out.get("stages", [])[:4], 1):
        scenes.append(Scene("points", safety.scrub(stage["narration"]), {
            "kicker": f"ধাপ {bangla.digits(n)}", "color": color, "heading": _clip(safety.scrub(stage["heading"]), 50),
            "items": [_clip(safety.scrub(s), 70) for s in stage.get("signs", [])[:3]]}))
    protect = [_clip(safety.scrub(s), 90) for s in out.get("protect", [])[:4]]
    scenes.append(Scene("steps", "নিজেকে রক্ষা করতে: " + " ".join(protect),
                        {"heading": "যেভাবে নিরাপদ থাকবেন", "steps": protect, "color": color}))
    victim = [_clip(safety.scrub(s), 90) for s in out.get("if_victim", [])[:3]]
    scenes.append(Scene("steps", "আর যদি এমনটা ঘটেই যায়: " + " ".join(victim),
                        {"heading": "শিকার হলে যা করবেন", "steps": victim, "color": color,
                         "helplines": list(safety.HELPLINES_BN[:3])}))
    scenes.append(Scene("outro", "ভিডিওটি পরিবারের সঙ্গে শেয়ার করুন, আর সাবস্ক্রাইব করুন।",
                        {"headline": "শেয়ার করে সবাইকে সতর্ক করুন", "site": site, "note": safety.DISCLAIMER_BN},
                        min_seconds=3.5))
    hashtags = ["shorts", "সতর্কতা", "বাংলাদেশ", "প্রতারণা" if "Fraud" in prof.get("categories", []) else "নিরাপত্তা"]
    return Episode(
        format="explainer", aspect=aspect, slug=f"explainer-{prof['id']}", show=SHOW_NAME["explainer"],
        title=_clip(safety.scrub(out["youtube_title"]), 90),
        description=_description(safety.scrub(out.get("summary", "")), [], site, hashtags),
        tags=BASE_TAGS + ["সতর্কতা", "নিরাপত্তা টিপস", "scam alert bangladesh"],
        thumbnail={"headline": _clip(safety.scrub(out.get("thumbnail_text") or out["headline"]), 34),
                   "kicker": SHOW_NAME["explainer"], "badge": "সাবধান!", "color": color},
        scenes=scenes,
    )


# ===========================================================================
def _json(value) -> str:
    import json
    return json.dumps(value, ensure_ascii=False, indent=1, default=str)


BUILDERS = {
    "brief": build_brief,
    "daily": build_daily,
    "case": build_case,
    "explainer": build_explainer,
}
