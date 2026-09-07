"""Thana gazetteer: name -> {lat, lon, district}.

Bengali-language reporting spells thana names a dozen different ways, and
social-media captions add Banglish transliterations on top of that. This
module owns the whole normalisation problem so that every ingestion path -
news, Facebook, manual - resolves to exactly one canonical thana name that
matches the ``jurisdictions`` table.

Public API
----------
``resolve_thana(name)``  -> ThanaLocation | None   (strict + alias + fuzzy)
``get_coordinates(name)`` -> dict | None           (raw lookup, no fuzzing)
``list_thanas()``         -> list[str]             (canonical names)
"""

from __future__ import annotations

import difflib
import re
import unicodedata
from typing import Dict, Iterable, List, Optional, TypedDict


class ThanaLocation(TypedDict):
    """Resolved jurisdiction centroid."""

    thana_name: str
    lat: float
    lon: float
    district: str


# Fallback used when a report names no recoverable thana. Ramna is the
# geographic and administrative centre of the DMP area; incidents pinned here
# are flagged in the API response so the map can style them differently.
DHAKA_CENTROID: ThanaLocation = {
    "thana_name": "Ramna",
    "lat": 23.7395,
    "lon": 90.3958,
    "district": "Dhaka",
}


# ---------------------------------------------------------------------------
# Canonical gazetteer - the 50 DMP thanas, mirroring init_schema.sql
# ---------------------------------------------------------------------------
THANA_COORDINATES: Dict[str, ThanaLocation] = {
    "Ramna":                   {"thana_name": "Ramna",                   "lat": 23.7395, "lon": 90.3958, "district": "Dhaka"},
    "Dhanmondi":               {"thana_name": "Dhanmondi",               "lat": 23.7459, "lon": 90.3763, "district": "Dhaka"},
    "Kotwali":                 {"thana_name": "Kotwali",                 "lat": 23.7088, "lon": 90.4074, "district": "Dhaka"},
    "Motijheel":               {"thana_name": "Motijheel",               "lat": 23.7281, "lon": 90.4189, "district": "Dhaka"},
    "Lalbagh":                 {"thana_name": "Lalbagh",                 "lat": 23.7178, "lon": 90.3884, "district": "Dhaka"},
    "Sutrapur":                {"thana_name": "Sutrapur",                "lat": 23.7083, "lon": 90.4217, "district": "Dhaka"},
    "Tejgaon":                 {"thana_name": "Tejgaon",                 "lat": 23.7596, "lon": 90.3931, "district": "Dhaka"},
    "Tejgaon Industrial Area": {"thana_name": "Tejgaon Industrial Area", "lat": 23.7667, "lon": 90.4041, "district": "Dhaka"},
    "Mirpur Model":            {"thana_name": "Mirpur Model",            "lat": 23.8063, "lon": 90.3682, "district": "Dhaka"},
    "Mohammadpur":             {"thana_name": "Mohammadpur",             "lat": 23.7660, "lon": 90.3586, "district": "Dhaka"},
    "Gulshan":                 {"thana_name": "Gulshan",                 "lat": 23.7923, "lon": 90.4143, "district": "Dhaka"},
    "Banani":                  {"thana_name": "Banani",                  "lat": 23.7939, "lon": 90.4010, "district": "Dhaka"},
    "Cantonment":              {"thana_name": "Cantonment",              "lat": 23.8169, "lon": 90.3973, "district": "Dhaka"},
    "Demra":                   {"thana_name": "Demra",                   "lat": 23.7125, "lon": 90.4926, "district": "Dhaka"},
    "Sabujbagh":               {"thana_name": "Sabujbagh",               "lat": 23.7413, "lon": 90.4368, "district": "Dhaka"},
    "Uttara East":             {"thana_name": "Uttara East",             "lat": 23.8699, "lon": 90.4012, "district": "Dhaka"},
    "Uttara West":             {"thana_name": "Uttara West",             "lat": 23.8745, "lon": 90.3834, "district": "Dhaka"},
    "Badda":                   {"thana_name": "Badda",                   "lat": 23.7809, "lon": 90.4258, "district": "Dhaka"},
    "Kafrul":                  {"thana_name": "Kafrul",                  "lat": 23.7977, "lon": 90.3836, "district": "Dhaka"},
    "Khilgaon":                {"thana_name": "Khilgaon",                "lat": 23.7506, "lon": 90.4283, "district": "Dhaka"},
    "Shahbagh":                {"thana_name": "Shahbagh",                "lat": 23.7387, "lon": 90.3953, "district": "Dhaka"},
    "New Market":              {"thana_name": "New Market",              "lat": 23.7335, "lon": 90.3847, "district": "Dhaka"},
    "Hazaribagh":              {"thana_name": "Hazaribagh",              "lat": 23.7324, "lon": 90.3655, "district": "Dhaka"},
    "Kamrangirchar":           {"thana_name": "Kamrangirchar",           "lat": 23.7123, "lon": 90.3721, "district": "Dhaka"},
    "Chawkbazar":              {"thana_name": "Chawkbazar",              "lat": 23.7168, "lon": 90.3962, "district": "Dhaka"},
    "Bangshal":                {"thana_name": "Bangshal",                "lat": 23.7194, "lon": 90.4076, "district": "Dhaka"},
    "Kadamtali":               {"thana_name": "Kadamtali",               "lat": 23.7002, "lon": 90.4372, "district": "Dhaka"},
    "Shyampur":                {"thana_name": "Shyampur",                "lat": 23.6931, "lon": 90.4342, "district": "Dhaka"},
    "Wari":                    {"thana_name": "Wari",                    "lat": 23.7176, "lon": 90.4182, "district": "Dhaka"},
    "Gendaria":                {"thana_name": "Gendaria",                "lat": 23.7084, "lon": 90.4287, "district": "Dhaka"},
    "Jatrabari":               {"thana_name": "Jatrabari",               "lat": 23.7108, "lon": 90.4469, "district": "Dhaka"},
    "Turag":                   {"thana_name": "Turag",                   "lat": 23.8681, "lon": 90.3635, "district": "Dhaka"},
    "Pallabi":                 {"thana_name": "Pallabi",                 "lat": 23.8235, "lon": 90.3652, "district": "Dhaka"},
    "Rupnagar":                {"thana_name": "Rupnagar",                "lat": 23.8228, "lon": 90.3548, "district": "Dhaka"},
    "Shah Ali":                {"thana_name": "Shah Ali",                "lat": 23.8047, "lon": 90.3546, "district": "Dhaka"},
    "Darus Salam":             {"thana_name": "Darus Salam",             "lat": 23.7864, "lon": 90.3517, "district": "Dhaka"},
    "Bhashantek":              {"thana_name": "Bhashantek",              "lat": 23.8221, "lon": 90.3864, "district": "Dhaka"},
    "Vatara":                  {"thana_name": "Vatara",                  "lat": 23.8036, "lon": 90.4289, "district": "Dhaka"},
    "Khilkhet":                {"thana_name": "Khilkhet",                "lat": 23.8289, "lon": 90.4207, "district": "Dhaka"},
    "Sherebangla Nagar":       {"thana_name": "Sherebangla Nagar",       "lat": 23.7682, "lon": 90.3778, "district": "Dhaka"},
    "Adabor":                  {"thana_name": "Adabor",                  "lat": 23.7718, "lon": 90.3526, "district": "Dhaka"},
    "Dakshinkhan":             {"thana_name": "Dakshinkhan",             "lat": 23.8741, "lon": 90.4187, "district": "Dhaka"},
    "Uttarkhan":               {"thana_name": "Uttarkhan",               "lat": 23.8798, "lon": 90.4284, "district": "Dhaka"},
    "Airport":                 {"thana_name": "Airport",                 "lat": 23.8452, "lon": 90.4045, "district": "Dhaka"},
    "Rampura":                 {"thana_name": "Rampura",                 "lat": 23.7608, "lon": 90.4214, "district": "Dhaka"},
    "Hatirjheel":              {"thana_name": "Hatirjheel",              "lat": 23.7563, "lon": 90.4068, "district": "Dhaka"},
    "Shahjahanpur":            {"thana_name": "Shahjahanpur",            "lat": 23.7377, "lon": 90.4219, "district": "Dhaka"},
    "Mugda":                   {"thana_name": "Mugda",                   "lat": 23.7354, "lon": 90.4375, "district": "Dhaka"},
    "Paltan":                  {"thana_name": "Paltan",                  "lat": 23.7349, "lon": 90.4127, "district": "Dhaka"},
    "Kalabagan":               {"thana_name": "Kalabagan",               "lat": 23.7489, "lon": 90.3839, "district": "Dhaka"},
}


# ---------------------------------------------------------------------------
# Alias table
#
# Keys are normalised (lowercase, punctuation-stripped) surface forms seen in
# real reporting; values are canonical thana names. Bengali script forms are
# included because Prothom Alo and Facebook captions rarely romanise.
# ---------------------------------------------------------------------------
_RAW_ALIASES: Dict[str, str] = {
    # --- English/Banglish variants ------------------------------------
    "mirpur": "Mirpur Model",
    "mirpur model thana": "Mirpur Model",
    "mirpur police station": "Mirpur Model",
    "dhanmondi model": "Dhanmondi",
    "dhanmandi": "Dhanmondi",
    "danmondi": "Dhanmondi",
    "gulshan model": "Gulshan",
    "gulshan 1": "Gulshan",
    "gulshan 2": "Gulshan",
    "banani model": "Banani",
    "uttara": "Uttara West",
    "uttara paschim": "Uttara West",
    "uttara purba": "Uttara East",
    "uttara east zone": "Uttara East",
    "uttar khan": "Uttarkhan",
    "dakshin khan": "Dakshinkhan",
    "dokkhinkhan": "Dakshinkhan",
    "biman bandar": "Airport",
    "bimanbandar": "Airport",
    "airport thana": "Airport",
    "hazrat shahjalal international airport": "Airport",
    "sher e bangla nagar": "Sherebangla Nagar",
    "sher-e-bangla nagar": "Sherebangla Nagar",
    "sherebangla": "Sherebangla Nagar",
    "shere bangla nagar": "Sherebangla Nagar",
    "tejgaon shilanchal": "Tejgaon Industrial Area",
    "tejgaon industrial": "Tejgaon Industrial Area",
    "shahbag": "Shahbagh",
    "shahabag": "Shahbagh",
    "newmarket": "New Market",
    "new market thana": "New Market",
    "niu market": "New Market",
    "jatrabari thana": "Jatrabari",
    "juraain": "Shyampur",
    "jurain": "Shyampur",
    "sutrapur thana": "Sutrapur",
    "kotwali dhaka": "Kotwali",
    "dhaka kotwali": "Kotwali",
    "chalkbazar": "Chawkbazar",
    "chalk bazar": "Chawkbazar",
    "chalkbazaar": "Chawkbazar",
    "chawk bazar": "Chawkbazar",
    "bongshal": "Bangshal",
    "banshal": "Bangshal",
    "kamrangir char": "Kamrangirchar",
    "kamrangichar": "Kamrangirchar",
    "hazaribag": "Hazaribagh",
    "sabujbag": "Sabujbagh",
    "sobujbag": "Sabujbagh",
    "khilgao": "Khilgaon",
    "khilgaon thana": "Khilgaon",
    "bhatara": "Vatara",
    "vatara thana": "Vatara",
    "bhatara thana": "Vatara",
    "shahali": "Shah Ali",
    "darussalam": "Darus Salam",
    "darus salaam": "Darus Salam",
    "bhasantek": "Bhashantek",
    "vashantek": "Bhashantek",
    "pallabi thana": "Pallabi",
    "rupnagar thana": "Rupnagar",
    "cantonment thana": "Cantonment",
    "dhaka cantonment": "Cantonment",
    "motijheel thana": "Motijheel",
    "paltan model": "Paltan",
    "ramna model": "Ramna",
    "wari thana": "Wari",
    "gendaria thana": "Gendaria",
    "kadamtoli": "Kadamtali",
    "shampur": "Shyampur",
    "shyampur thana": "Shyampur",
    "mugdapara": "Mugda",
    "mugda para": "Mugda",
    "rampura thana": "Rampura",
    "badda thana": "Badda",
    "north badda": "Badda",
    "south badda": "Badda",
    "merul badda": "Badda",
    "khilkhet thana": "Khilkhet",
    "kalabagan thana": "Kalabagan",
    "adabar": "Adabor",
    "mohammadpur thana": "Mohammadpur",
    "lalbag": "Lalbagh",
    "demra thana": "Demra",
    "turag thana": "Turag",
    "kafrul thana": "Kafrul",
    "hatirjheel thana": "Hatirjheel",
    "shahjahanpur thana": "Shahjahanpur",

    # --- Bengali script -----------------------------------------------
    "রমনা": "Ramna",
    "ধানমন্ডি": "Dhanmondi",
    "কোতয়ালি": "Kotwali",
    "মতিঝিল": "Motijheel",
    "লালবাগ": "Lalbagh",
    "সূত্রাপুর": "Sutrapur",
    "তেজগাঁও": "Tejgaon",
    "মিরপুর": "Mirpur Model",
    "মোহাম্মদপুর": "Mohammadpur",
    "গুলশান": "Gulshan",
    "বনানী": "Banani",
    "ক্যান্টনমেন্ট": "Cantonment",
    "ডেমরা": "Demra",
    "সবুজবাগ": "Sabujbagh",
    "বাড্ডা": "Badda",
    "কাফরুল": "Kafrul",
    "খিলগাঁও": "Khilgaon",
    "শাহবাগ": "Shahbagh",
    "নিউমার্কেট": "New Market",
    "হাজারীবাগ": "Hazaribagh",
    "কামরাঙ্গীরচর": "Kamrangirchar",
    "চকবাজার": "Chawkbazar",
    "বংশাল": "Bangshal",
    "কদমতলী": "Kadamtali",
    "শ্যামপুর": "Shyampur",
    "ওয়ারী": "Wari",
    "গেণ্ডারিয়া": "Gendaria",
    "যাত্রাবাড়ী": "Jatrabari",
    "তুরাগ": "Turag",
    "পল্লবী": "Pallabi",
    "রূপনগর": "Rupnagar",
    "শাহআলী": "Shah Ali",
    "দারুসসালাম": "Darus Salam",
    "ভাষান্তেক": "Bhashantek",
    "ভাটারা": "Vatara",
    "খিলক্ষেত": "Khilkhet",
    "আদাবর": "Adabor",
    "দক্ষিণখান": "Dakshinkhan",
    "উত্তরখান": "Uttarkhan",
    "বিমানবন্দর": "Airport",
    "রামপুরা": "Rampura",
    "হাতিরঝিল": "Hatirjheel",
    "শাহজাহানপুর": "Shahjahanpur",
    "মুগদা": "Mugda",
    "পল্টন": "Paltan",
    "কলাবাগান": "Kalabagan",
    "উত্তরা": "Uttara West",
}

# Noise words to strip before matching: "Mirpur Model Police Station" and
# "মিরপুর থানা" must both reduce to "mirpur".
_STOPWORDS = (
    "thana",
    "police station",
    "police",
    "station",
    "model",
    "metropolitan",
    "dmp",
    "area",
    "zone",
    "ps",
    "থানা",  # থানা
)


def _normalise(name: str) -> str:
    """Lowercase, strip punctuation, diacritics and administrative noise."""
    text = unicodedata.normalize("NFKC", name).strip().lower()
    # Keep Bengali codepoints; drop Latin punctuation and separators.
    text = re.sub(r"[^\wঀ-৿\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    for stop in _STOPWORDS:
        text = re.sub(rf"(?:^|\s){re.escape(stop)}(?:\s|$)", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
    return text


# Pre-computed lookup: normalised form -> canonical name.
_LOOKUP: Dict[str, str] = {}
for _canonical in THANA_COORDINATES:
    _LOOKUP[_normalise(_canonical)] = _canonical
for _alias, _canonical in _RAW_ALIASES.items():
    _LOOKUP.setdefault(_normalise(_alias), _canonical)


def list_thanas() -> List[str]:
    """Canonical thana names, alphabetically."""
    return sorted(THANA_COORDINATES)


def get_coordinates(thana_name: str) -> Optional[ThanaLocation]:
    """Exact-ish lookup: canonical name or a known alias. No fuzzy matching."""
    if not thana_name:
        return None
    canonical = _LOOKUP.get(_normalise(thana_name))
    return THANA_COORDINATES.get(canonical) if canonical else None


def resolve_thana(
    thana_name: Optional[str],
    *,
    fuzzy_cutoff: float = 0.82,
    fallback: bool = True,
) -> Optional[ThanaLocation]:
    """Resolve any surface form to a canonical thana.

    Resolution order:

    1. Exact / alias match on the normalised string.
    2. Containment - the reported string embeds a known thana name, which
       covers "Merul Badda, Dhaka" and "near Gulshan-2 circle".
    3. Fuzzy match via ``difflib``, catching transliteration drift such as
       "Jatrabary" or "Khilkhet".

    Returns ``DHAKA_CENTROID`` when nothing matches and ``fallback`` is set,
    otherwise ``None``.
    """
    if not thana_name or not thana_name.strip():
        return DHAKA_CENTROID if fallback else None

    needle = _normalise(thana_name)
    if not needle:
        return DHAKA_CENTROID if fallback else None

    # 1. Direct hit.
    canonical = _LOOKUP.get(needle)
    if canonical:
        return THANA_COORDINATES[canonical]

    # 2. Containment, longest key first so "Uttara East" beats "Uttara".
    for key in sorted(_LOOKUP, key=len, reverse=True):
        if len(key) < 4:
            continue
        if key in needle or needle in key:
            return THANA_COORDINATES[_LOOKUP[key]]

    # 3. Fuzzy.
    matches = difflib.get_close_matches(needle, _LOOKUP.keys(), n=1, cutoff=fuzzy_cutoff)
    if matches:
        return THANA_COORDINATES[_LOOKUP[matches[0]]]

    return DHAKA_CENTROID if fallback else None


def resolve_many(names: Iterable[str]) -> Dict[str, Optional[ThanaLocation]]:
    """Batch helper for scraper diagnostics."""
    return {name: resolve_thana(name, fallback=False) for name in names}


__all__ = [
    "THANA_COORDINATES",
    "DHAKA_CENTROID",
    "ThanaLocation",
    "get_coordinates",
    "resolve_thana",
    "resolve_many",
    "list_thanas",
]
