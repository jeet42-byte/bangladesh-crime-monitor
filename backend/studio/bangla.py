"""Bangla text helpers: digits, dates, categories and place names.

Everything a viewer reads or hears goes through here, so the videos use one
spelling for every place and category, and never show Latin digits.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

BST = timezone(timedelta(hours=6))

_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")

MONTHS = (
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
)
MONTHS_SHORT = ("জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে")
WEEKDAYS = ("সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার")
WEEKDAYS_SHORT = ("সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি", "রবি")

CATEGORY_BN: dict[str, str] = {
    "Homicide": "হত্যা",
    "Robbery": "ডাকাতি ও ছিনতাই",
    "Assault": "হামলা ও মারধর",
    "Narcotics": "মাদক",
    "Cybercrime": "সাইবার অপরাধ",
    "Fraud": "প্রতারণা",
    "Extortion": "চাঁদাবাজি",
    "Theft": "চুরি",
    "Sexual Violence": "যৌন সহিংসতা",
    "Domestic Violence": "পারিবারিক সহিংসতা",
    "Human Trafficking": "মানবপাচার",
    "Industrial Accident": "শিল্প দুর্ঘটনা",
    "Labour Unrest": "শ্রমিক অসন্তোষ",
    "Other": "অন্যান্য",
}

# Genitive forms ("of X"), because Bangla inflects rather than adding "-এর".
CATEGORY_GEN: dict[str, str] = {
    "Homicide": "হত্যার",
    "Robbery": "ডাকাতি ও ছিনতাইয়ের",
    "Assault": "হামলা ও মারধরের",
    "Narcotics": "মাদকের",
    "Cybercrime": "সাইবার অপরাধের",
    "Fraud": "প্রতারণার",
    "Extortion": "চাঁদাবাজির",
    "Theft": "চুরির",
    "Sexual Violence": "যৌন সহিংসতার",
    "Domestic Violence": "পারিবারিক সহিংসতার",
    "Human Trafficking": "মানবপাচারের",
    "Industrial Accident": "শিল্প দুর্ঘটনার",
    "Labour Unrest": "শ্রমিক অসন্তোষের",
    "Other": "অপরাধের",
}

# Accent colour per category, shared by charts, chips and thumbnails.
CATEGORY_COLOR: dict[str, str] = {
    "Homicide": "#ef4444",
    "Robbery": "#f97316",
    "Assault": "#f59e0b",
    "Narcotics": "#a855f7",
    "Cybercrime": "#06b6d4",
    "Fraud": "#3b82f6",
    "Extortion": "#eab308",
    "Theft": "#84cc16",
    "Sexual Violence": "#ec4899",
    "Domestic Violence": "#f43f5e",
    "Human Trafficking": "#8b5cf6",
    "Industrial Accident": "#fb923c",
    "Labour Unrest": "#14b8a6",
    "Other": "#94a3b8",
}

# The 50 Dhaka Metropolitan Police thanas, matching app/utils/thana_coordinates.py.
DMP_THANA_BN: dict[str, str] = {
    "Ramna": "রমনা", "Dhanmondi": "ধানমন্ডি", "Kotwali": "কোতোয়ালী",
    "Motijheel": "মতিঝিল", "Lalbagh": "লালবাগ", "Sutrapur": "সূত্রাপুর",
    "Tejgaon": "তেজগাঁও", "Tejgaon Industrial Area": "তেজগাঁও শিল্পাঞ্চল",
    "Mirpur Model": "মিরপুর মডেল", "Mohammadpur": "মোহাম্মদপুর",
    "Gulshan": "গুলশান", "Banani": "বনানী", "Cantonment": "ক্যান্টনমেন্ট",
    "Demra": "ডেমরা", "Sabujbagh": "সবুজবাগ", "Uttara East": "উত্তরা পূর্ব",
    "Uttara West": "উত্তরা পশ্চিম", "Badda": "বাড্ডা", "Kafrul": "কাফরুল",
    "Khilgaon": "খিলগাঁও", "Shahbagh": "শাহবাগ", "New Market": "নিউমার্কেট",
    "Hazaribagh": "হাজারীবাগ", "Kamrangirchar": "কামরাঙ্গীরচর",
    "Chawkbazar": "চকবাজার", "Bangshal": "বংশাল", "Kadamtali": "কদমতলী",
    "Shyampur": "শ্যামপুর", "Wari": "ওয়ারী", "Gendaria": "গেন্ডারিয়া",
    "Jatrabari": "যাত্রাবাড়ী", "Turag": "তুরাগ", "Pallabi": "পল্লবী",
    "Rupnagar": "রূপনগর", "Shah Ali": "শাহ আলী", "Darus Salam": "দারুস সালাম",
    "Bhashantek": "ভাষানটেক", "Vatara": "ভাটারা", "Khilkhet": "খিলক্ষেত",
    "Sherebangla Nagar": "শেরেবাংলা নগর", "Adabor": "আদাবর",
    "Dakshinkhan": "দক্ষিণখান", "Uttarkhan": "উত্তরখান", "Airport": "বিমানবন্দর",
    "Rampura": "রামপুরা", "Hatirjheel": "হাতিরঝিল", "Shahjahanpur": "শাহজাহানপুর",
    "Mugda": "মুগদা", "Paltan": "পল্টন", "Kalabagan": "কলাবাগান",
}

DISTRICT_BN: dict[str, str] = {
    "Bagerhat": "বাগেরহাট", "Bandarban": "বান্দরবান", "Barguna": "বরগুনা",
    "Barisal": "বরিশাল", "Bhola": "ভোলা", "Bogura": "বগুড়া",
    "Brahmanbaria": "ব্রাহ্মণবাড়িয়া", "Chandpur": "চাঁদপুর",
    "Chapai Nawabganj": "চাঁপাইনবাবগঞ্জ", "Chattogram": "চট্টগ্রাম",
    "Chuadanga": "চুয়াডাঙ্গা", "Cox's Bazar": "কক্সবাজার", "Cumilla": "কুমিল্লা",
    "Dhaka": "ঢাকা", "Dinajpur": "দিনাজপুর", "Faridpur": "ফরিদপুর", "Feni": "ফেনী",
    "Gaibandha": "গাইবান্ধা", "Gazipur": "গাজীপুর", "Gopalganj": "গোপালগঞ্জ",
    "Habiganj": "হবিগঞ্জ", "Jamalpur": "জামালপুর", "Jashore": "যশোর",
    "Jhalokathi": "ঝালকাঠি", "Jhenaidah": "ঝিনাইদহ", "Joypurhat": "জয়পুরহাট",
    "Khagrachari": "খাগড়াছড়ি", "Khulna": "খুলনা", "Kishoreganj": "কিশোরগঞ্জ",
    "Kurigram": "কুড়িগ্রাম", "Kushtia": "কুষ্টিয়া", "Lakshmipur": "লক্ষ্মীপুর",
    "Lalmonirhat": "লালমনিরহাট", "Madaripur": "মাদারীপুর", "Magura": "মাগুরা",
    "Manikganj": "মানিকগঞ্জ", "Meherpur": "মেহেরপুর", "Moulvibazar": "মৌলভীবাজার",
    "Munshiganj": "মুন্সীগঞ্জ", "Mymensingh": "ময়মনসিংহ", "Naogaon": "নওগাঁ",
    "Narail": "নড়াইল", "Narayanganj": "নারায়ণগঞ্জ", "Narsingdi": "নরসিংদী",
    "Natore": "নাটোর", "Netrokona": "নেত্রকোনা", "Nilphamari": "নীলফামারী",
    "Noakhali": "নোয়াখালী", "Pabna": "পাবনা", "Panchagarh": "পঞ্চগড়",
    "Patuakhali": "পটুয়াখালী", "Pirojpur": "পিরোজপুর", "Rajbari": "রাজবাড়ী",
    "Rajshahi": "রাজশাহী", "Rangamati": "রাঙ্গামাটি", "Rangpur": "রংপুর",
    "Satkhira": "সাতক্ষীরা", "Shariatpur": "শরীয়তপুর", "Sherpur": "শেরপুর",
    "Sirajganj": "সিরাজগঞ্জ", "Sunamganj": "সুনামগঞ্জ", "Sylhet": "সিলেট",
    "Tangail": "টাঙ্গাইল", "Thakurgaon": "ঠাকুরগাঁও",
}


def digits(value: object) -> str:
    """Render any number or string with Bangla digits."""
    return str(value).translate(_DIGITS)


def number(value: float, decimals: int = 0) -> str:
    """Grouped number in Bangla digits, e.g. 12500 -> ১২,৫০০."""
    text = f"{value:,.{decimals}f}" if decimals else f"{int(round(value)):,}"
    return digits(text)


def count(value: int, unit: str = "টি") -> str:
    """'৪২টি' - Bangla counts take a classifier suffix."""
    return f"{number(value)}{unit}"


def _as_date(value: date | datetime | str) -> date:
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            value = value.astimezone(BST)
        return value.date()
    return value


def date_long(value: date | datetime | str, weekday: bool = False) -> str:
    """'১২ নভেম্বর ২০২৬' (optionally with the weekday)."""
    d = _as_date(value)
    text = f"{digits(d.day)} {MONTHS[d.month - 1]} {digits(d.year)}"
    return f"{WEEKDAYS[d.weekday()]}, {text}" if weekday else text


def date_short(value: date | datetime | str) -> str:
    """'১২ নভে' style label for chart axes: day and short month."""
    d = _as_date(value)
    return f"{digits(d.day)} {MONTHS_SHORT[d.month - 1]}"


def date_range(start: date | datetime | str, end: date | datetime | str) -> str:
    a, b = _as_date(start), _as_date(end)
    if a.year == b.year and a.month == b.month:
        return f"{digits(a.day)}–{digits(b.day)} {MONTHS[b.month - 1]} {digits(b.year)}"
    if a.year == b.year:
        return f"{digits(a.day)} {MONTHS[a.month - 1]} – {digits(b.day)} {MONTHS[b.month - 1]} {digits(b.year)}"
    return f"{date_long(a)} – {date_long(b)}"


def category(name: str) -> str:
    return CATEGORY_BN.get(name, name)


def category_of(name: str) -> str:
    """Genitive: 'ছিনতাইয়ের' rather than 'ছিনতাই-এর'."""
    return CATEGORY_GEN.get(name, f"{category(name)}-এর")


def category_color(name: str) -> str:
    return CATEGORY_COLOR.get(name, CATEGORY_COLOR["Other"])


@lru_cache(maxsize=1)
def _upazila_bn() -> dict[str, str]:
    path = Path(__file__).resolve().parents[1] / "app" / "utils" / "upazilas.json"
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {row["upazila"]: row["bn"] for row in rows if row.get("bn")}


def place(thana: str | None, district: str | None = None) -> str:
    """Bangla name for a thana/upazila, falling back to the given spelling."""
    if not thana:
        return district_name(district) if district else "বাংলাদেশ"
    return DMP_THANA_BN.get(thana) or _upazila_bn().get(thana) or DISTRICT_BN.get(thana) or thana


def district_name(district: str | None) -> str:
    if not district:
        return ""
    return DISTRICT_BN.get(district, district)


def place_full(thana: str | None, district: str | None) -> str:
    """'মিরপুর মডেল, ঢাকা' - thana and district, without repeating."""
    a, b = place(thana, district), district_name(district)
    if not b or a == b:
        return a
    return f"{a}, {b}"


def percent_change(current: int, previous: int) -> float | None:
    if previous <= 0:
        return None
    return (current - previous) / previous * 100.0
