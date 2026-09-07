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


# ---------------------------------------------------------------------------
# District gazetteer - all 64 districts of Bangladesh
#
# The thana table above covers only the Dhaka Metropolitan Police area. The
# news feeds are national, so most incidents happen somewhere it cannot name.
# Resolving those to a district centroid is coarse but truthful; the previous
# behaviour - quietly pinning them to the Dhaka centroid - put a Bagerhat
# murder on a Dhaka street and manufactured a hotspot in Ramna.
# ---------------------------------------------------------------------------
DISTRICT_COORDINATES: Dict[str, tuple[float, float]] = {
    # Barishal
    "Barguna": (22.1596, 90.1265), "Barishal": (22.7010, 90.3535),
    "Bhola": (22.6859, 90.6482), "Jhalokati": (22.6406, 90.1987),
    "Patuakhali": (22.3596, 90.3298), "Pirojpur": (22.5791, 89.9759),
    # Chattogram
    "Bandarban": (22.1953, 92.2184), "Brahmanbaria": (23.9571, 91.1119),
    "Chandpur": (23.2333, 90.6712), "Chattogram": (22.3569, 91.7832),
    "Cumilla": (23.4607, 91.1809), "Cox's Bazar": (21.4272, 92.0058),
    "Feni": (23.0159, 91.3976), "Khagrachhari": (23.1193, 91.9847),
    "Lakshmipur": (22.9425, 90.8410), "Noakhali": (22.8696, 91.0995),
    "Rangamati": (22.6533, 92.1750),
    # Dhaka
    "Dhaka": (23.8103, 90.4125), "Faridpur": (23.6070, 89.8429),
    "Gazipur": (23.9999, 90.4203), "Gopalganj": (23.0050, 89.8266),
    "Kishoreganj": (24.4449, 90.7766), "Madaripur": (23.1641, 90.1897),
    "Manikganj": (23.8617, 90.0003), "Munshiganj": (23.5422, 90.5305),
    "Narayanganj": (23.6238, 90.5000), "Narsingdi": (23.9322, 90.7151),
    "Rajbari": (23.7574, 89.6444), "Shariatpur": (23.2423, 90.4348),
    "Tangail": (24.2513, 89.9167),
    # Khulna
    "Bagerhat": (22.6516, 89.7859), "Chuadanga": (23.6402, 88.8410),
    "Jashore": (23.1667, 89.2081), "Jhenaidah": (23.5450, 89.1726),
    "Khulna": (22.8456, 89.5403), "Kushtia": (23.9013, 89.1206),
    "Magura": (23.4855, 89.4198), "Meherpur": (23.7622, 88.6318),
    "Narail": (23.1725, 89.5125), "Satkhira": (22.7185, 89.0705),
    # Mymensingh
    "Jamalpur": (24.9375, 89.9372), "Mymensingh": (24.7471, 90.4203),
    "Netrokona": (24.8103, 90.8656), "Sherpur": (25.0205, 90.0153),
    # Rajshahi
    "Bogura": (24.8465, 89.3773), "Joypurhat": (25.0968, 89.0227),
    "Naogaon": (24.7936, 88.9318), "Natore": (24.4206, 89.0003),
    "Chapainawabganj": (24.5965, 88.2775), "Pabna": (24.0064, 89.2372),
    "Rajshahi": (24.3745, 88.6042), "Sirajganj": (24.4533, 89.7006),
    # Rangpur
    "Dinajpur": (25.6217, 88.6354), "Gaibandha": (25.3288, 89.5281),
    "Kurigram": (25.8054, 89.6362), "Lalmonirhat": (25.9923, 89.2847),
    "Nilphamari": (25.9317, 88.8560), "Panchagarh": (26.3411, 88.5542),
    "Rangpur": (25.7439, 89.2752), "Thakurgaon": (26.0337, 88.4616),
    # Sylhet
    "Habiganj": (24.3745, 91.4155), "Moulvibazar": (24.4829, 91.7774),
    "Sunamganj": (25.0658, 91.3950), "Sylhet": (24.8949, 91.8687),
}

# Spelling variants, well-known upazilas and towns, mapped to their district.
_DISTRICT_ALIASES: Dict[str, str] = {
    "comilla": "Cumilla", "barisal": "Barishal", "jessore": "Jashore",
    "chittagong": "Chattogram", "bogra": "Bogura", "coxs bazar": "Cox's Bazar",
    "cox bazar": "Cox's Bazar", "nawabganj": "Chapainawabganj",
    "chapai nawabganj": "Chapainawabganj", "maulvibazar": "Moulvibazar",
    "moulavibazar": "Moulvibazar", "sunamgonj": "Sunamganj",
    "khagrachari": "Khagrachhari", "jhenaidaha": "Jhenaidah",
    # Upazilas and towns that appear far more often than their district name.
    "savar": "Dhaka", "keraniganj": "Dhaka", "dohar": "Dhaka",
    "nawabganj dhaka": "Dhaka", "ashulia": "Dhaka",
    "tongi": "Gazipur", "kaliakair": "Gazipur", "sreepur": "Gazipur",
    "rupganj": "Narayanganj", "siddhirganj": "Narayanganj",
    "araihazar": "Narayanganj", "sonargaon": "Narayanganj",
    "raipur": "Lakshmipur", "ramganj": "Lakshmipur",
    "begumganj": "Noakhali", "companiganj": "Noakhali",
    "patiya": "Chattogram", "hathazari": "Chattogram", "sitakunda": "Chattogram",
    "teknaf": "Cox's Bazar", "ukhiya": "Cox's Bazar",
    "bhairab": "Kishoreganj", "bhaluka": "Mymensingh",
    "mongla": "Bagerhat", "sharsha": "Jashore", "benapole": "Jashore",
    "kaliganj": "Satkhira", "shibganj": "Chapainawabganj",
}

_DISTRICT_LOOKUP: Dict[str, str] = {}
for _name in DISTRICT_COORDINATES:
    _DISTRICT_LOOKUP[_normalise(_name)] = _name
for _alias, _canon in _DISTRICT_ALIASES.items():
    _DISTRICT_LOOKUP.setdefault(_normalise(_alias), _canon)


def resolve_district(name: str) -> Optional[ThanaLocation]:
    """Resolve a place name to a district centroid, or None."""
    if not name:
        return None
    needle = _normalise(name)
    if not needle:
        return None

    canonical = _DISTRICT_LOOKUP.get(needle)
    if not canonical:
        for key in sorted(_DISTRICT_LOOKUP, key=len, reverse=True):
            if len(key) < 4:
                continue
            if key in needle or needle in key:
                canonical = _DISTRICT_LOOKUP[key]
                break
    if not canonical:
        matches = difflib.get_close_matches(
            needle, _DISTRICT_LOOKUP.keys(), n=1, cutoff=0.86
        )
        if matches:
            canonical = _DISTRICT_LOOKUP[matches[0]]

    if not canonical:
        return None

    lat, lon = DISTRICT_COORDINATES[canonical]
    return {
        "thana_name": canonical,
        "lat": lat,
        "lon": lon,
        "district": canonical,
    }


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
    fallback: bool = False,
) -> Optional[ThanaLocation]:
    """Resolve any surface form to a DMP thana, else a district centroid.

    Resolution order:

    1. Exact / alias match on the normalised string.
    2. Containment - the reported string embeds a known thana name, which
       covers "Merul Badda, Dhaka" and "near Gulshan-2 circle".
    3. Fuzzy match via ``difflib``, catching transliteration drift such as
       "Jatrabary" or "Khilkhet".
    4. District gazetteer, for the whole country outside the DMP area.

    ``fallback`` defaults to False and should stay that way. It previously
    defaulted to True, which pinned every unrecognised place to the Dhaka
    centroid: once national feeds were added, roughly half of all records
    claimed to be in Ramna while actually describing incidents in Bagerhat,
    Panchagarh and Noakhali. An incident that cannot be placed should be
    dropped, not placed wrongly.
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

    # 4. Outside the DMP area: fall back to district-level precision, which is
    # coarse but honest, rather than to a Dhaka thana that is simply wrong.
    district = resolve_district(thana_name)
    if district is not None:
        return district

    return DHAKA_CENTROID if fallback else None



def find_place_in_text(text: str, *, max_chars: int = 400) -> Optional[ThanaLocation]:
    """Scan free text for a recognisable thana or district name.

    Used when the model reports a place the gazetteer does not know - an
    upazila such as "Kachua", or a bare "Sadar" - while the district is
    stated plainly in the headline ("Three arrested over triple murder in
    Bagerhat"). Without this those records are discarded despite being
    perfectly placeable.

    Only the opening ``max_chars`` are scanned: a headline and lede name the
    location, whereas deep body text often mentions other places (where a
    suspect was later transferred, where a court sits) that would mislocate
    the incident.
    """
    if not text:
        return None

    haystack = _normalise(text[:max_chars])
    if not haystack:
        return None

    padded = f" {haystack} "

    # Longest name first so "Cox's Bazar" is not shadowed by a shorter token,
    # and thana names win over district names when both appear.
    for lookup, table in ((_LOOKUP, THANA_COORDINATES), (_DISTRICT_LOOKUP, None)):
        for key in sorted(lookup, key=len, reverse=True):
            if len(key) < 5:
                continue
            if f" {key} " in padded:
                canonical = lookup[key]
                if table is not None:
                    return table[canonical]
                lat, lon = DISTRICT_COORDINATES[canonical]
                return {
                    "thana_name": canonical,
                    "lat": lat,
                    "lon": lon,
                    "district": canonical,
                }
    return None

def resolve_many(names: Iterable[str]) -> Dict[str, Optional[ThanaLocation]]:
    """Batch helper for scraper diagnostics."""
    return {name: resolve_thana(name, fallback=False) for name in names}


__all__ = [
    "THANA_COORDINATES",
    "DISTRICT_COORDINATES",
    "resolve_district",
    "find_place_in_text",
    "DHAKA_CENTROID",
    "ThanaLocation",
    "get_coordinates",
    "resolve_thana",
    "resolve_many",
    "list_thanas",
]
