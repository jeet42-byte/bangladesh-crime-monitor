"""Rule-based screening suggestions for the title/abstract stage.

Encodes the decision rules agreed during the first screening session
(see README, "Screening rules"). Output is a SUGGESTION per record; the
reviewer confirms or overrides every one in Rayyan.

    python scripts/suggest.py   (run from research/scoping-review/)
"""
import csv
import re
from collections import Counter

SRC = "screening_prescreened.csv"
OUT = "screening_suggestions.csv"

# Cybercrime / online-harm vocabulary.
CORE = re.compile(
    r"cyber ?crime|cyber[- ]?criminal|cyber[- ]?bull|cyber[- ]?harass|cyber[- ]?stalk|"
    r"cyber[- ]?victim|cyber[- ]?attack|cyber[- ]?fraud|cyber[- ]?threat|cyber[- ]?offen|"
    r"cyber[- ]?law|cyber[- ]?violence|cyber[- ]?abuse|cyber[- ]?deviance|cyber[- ]?slave|"
    r"cyber[- ]?radical|cyber[- ]?terror|cyber[- ]?security act|cyber security ordinance|"
    r"cyber protection ordinance|digital security act|ict act|information technology act|"
    r"online (fraud|scam|harass|abuse|violence|sexual|child|gambl|crime|hate|bully|threat|exploit)|"
    r"internet (fraud|crime|gambl)|phish|hack(ing|er|ed)|sextort|image[- ]based (sexual )?abuse|"
    r"revenge porn|non-?consensual|deep ?fake|technology[- ]facilitated|tfgbv|"
    r"identity theft|data breach|ransomware|malware|scam|fraud|digital (violence|harass|abuse|repression)|"
    r"online safety|trolling|doxx|e-?commerce fraud|mobile money fraud|mfs fraud|"
    r"pegasus|spyware|cyber ?space|cybersecurity awareness|cyber security awareness"
)
# Broader: any sign of cyber law, online speech control or online harm.
BROAD = re.compile(
    r"cyber|bully|harass|censor|surveil|self-censor|free(dom of)? (speech|expression)|"
    r"defamation|digital security|online (violence|abuse|harm|safety)|unlawful|criminal|crime|"
    r"victim|deepfake|fraud|scam|stalk|exploit|abuse|misuse|hate speech|disinformation|"
    r"digital (evidence|repression|control|rights)|data protection|privacy|security act|ordinance"
)
# Mental-health / wellbeing studies: cyberbullying usually one factor among many.
HEALTH = re.compile(
    r"suicid|depress|anxiety|mental health|wellbeing|well-being|self-harm|self-injury|"
    r"body image|psycholog|addiction|sleep|eating"
)
# Adoption / trust / fintech without crime focus.
ADOPTION = re.compile(
    r"adoption|intention|acceptance|satisfaction|perceived (security|risk|trust)|"
    r"financial inclusion|trust in|consumer trust|usage|technology acceptance"
)
# Purely technical work.
TECH = re.compile(
    r"\b(deep learning|machine learning|neural network|bert|lstm|cnn|transformer|"
    r"classifier|classification|detection (model|system|framework)|algorithm|"
    r"blockchain|encryption|steganograph|dataset|federated|xgboost|random forest)\b"
)
NOT_RESEARCH_TYPES = {"book-review", "reference-entry", "conference-abstract",
                      "study-registration", "other"}
NEWSY = re.compile(r"^(opinion|editorial|news|interview|weekly|monthly|"
                   r"briefing|press release)\b|\breport update\b", re.I)
SA_CODES = {"BD", "IN", "PK", "NP", "LK", "BT", "MV", "AF"}
SOUTH_ASIA = re.compile(
    r"kerala|tamil|karnataka|maharashtra|punjab|sindh|gujarat|hyderabad|bangalore|bengaluru|"
    r"chennai|islamabad|rawalpindi|peshawar|uttar pradesh|bihar|assam|odisha|rajasthan|"
    r"bangladesh|india|pakistan|nepal|sri lanka|bhutan|maldives|afghanistan|"
    r"south asia|dhaka|karachi|lahore|delhi|mumbai|kolkata|bengal|kathmandu|colombo"
)


def suggest(r):
    title = r["title"].lower()
    abstract = r["abstract"].lower()
    text = f"{title} {abstract}"
    tier = r["tier"]
    core_t = bool(CORE.search(title))
    core_a = len(CORE.findall(abstract))

    if r["type"] in NOT_RESEARCH_TYPES or NEWSY.search(r["title"]):
        return "exclude", "not research"

    if tier.startswith("B") or tier == "A+B":
        countries = set(filter(None, re.split(r"[;, ]+", r["countries"])))
        if not SOUTH_ASIA.search(text):
            if countries and not countries & SA_CODES:
                return "exclude", "wrong country"
            if not countries & SA_CODES:
                return "maybe", "South Asia link unclear"
        if TECH.search(title) and not re.search(r"law|legal|polic|criminal|victim|social", title):
            return "exclude", "wrong field"
        if not abstract.strip():
            return ("include", "title on-topic, no abstract") if core_t else ("maybe", "no abstract")
        return "include", "on-topic"

    # Tier A (Bangladesh, any field).
    if not abstract.strip():
        return ("include", "title on-topic, no abstract") if core_t else ("maybe", "no abstract")
    broad_t = bool(BROAD.search(title))
    broad_a = len(BROAD.findall(abstract))
    if HEALTH.search(title) and not core_t:
        return ("maybe", "cyberbullying one of several factors") if re.search(
            r"cyber|online (harass|bully|abuse)", abstract) else ("exclude", "not cybercrime")
    if core_t:
        if ADOPTION.search(title) and not re.search(r"fraud|scam|crime|victim", title):
            return "exclude", "not cybercrime"
        return "include", "on-topic"
    if (ADOPTION.search(title) or re.search(r"financial service|fintech|mobile banking|payment", title)) and not broad_t:
        return ("maybe", "fraud may be a main theme") if core_a >= 4 else ("exclude", "not cybercrime")
    if broad_t:
        return "include", "on-topic (law, speech or online harm)"
    if core_a + broad_a >= 4:
        return "maybe", "cyber harm prominent in abstract"
    if core_a + broad_a >= 2:
        return "maybe", "cyber harm mentioned"
    return "exclude", "not cybercrime"


def main():
    rows = [r for r in csv.DictReader(open(SRC, encoding="utf-8-sig"))]
    for r in rows:
        if r["prescreen"] != "screen":
            r["suggestion"], r["suggestion_reason"] = "", ""
            continue
        r["suggestion"], r["suggestion_reason"] = suggest(r)
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    c = Counter((r["tier"][0], r["suggestion"]) for r in rows if r["suggestion"])
    print(sorted(c.items()))
    print(Counter(r["suggestion_reason"] for r in rows if r["suggestion"]).most_common())


if __name__ == "__main__":
    main()


# ---------------------------------------------------------------------------
# Reviewer overrides: decisions made by hand in the first Rayyan session
# (2026-11-17) and corrections after checking every suggested exclusion.
# ---------------------------------------------------------------------------
OVERRIDES = {
    # Decided in session.
    "R0005": ("include", "reviewer"), "R0007": ("include", "reviewer"),
    "R0006": ("exclude", "not cybercrime"), "R0044": ("exclude", "not cybercrime"),
    "R0046": ("exclude", "not cybercrime"), "R0062": ("exclude", "not cybercrime"),
    "R0056": ("exclude", "not cybercrime"), "R0068": ("exclude", "not cybercrime"),
    "R0077": ("exclude", "not cybercrime"), "R0133": ("exclude", "not cybercrime"),
    "R0117": ("exclude", "not research"), "R0120": ("exclude", "not cybercrime"),
    "R0128": ("exclude", "wrong country"), "R0112": ("exclude", "not cybercrime"),
    "R0121": ("maybe", "Bangladesh one case of several"),
    "R0102": ("maybe", "cyberbullying one of several factors"),
    "R0111": ("maybe", "cyberbullying one of several factors"),
    "R0109": ("maybe", "online harassment one main theme"),
    "R0074": ("maybe", "DSA one of four dimensions"),
    "R0076": ("maybe", "digital evidence in general"),
    "R0073": ("maybe", "no abstract; censorship"),
    "R0113": ("include", "reviewer"), "R0107": ("include", "reviewer"),
    "R0055": ("include", "reviewer"), "R0081": ("include", "reviewer"),
    "R0101": ("include", "reviewer"), "R0079": ("include", "reviewer"),
    "R0063": ("include", "reviewer"), "R0058": ("include", "reviewer"),
    # Corrections after checking the suggested exclusions.
    "R0038": ("maybe", "PROTOCOL of a related TFGBV scoping review - check if completed"),
    "R0294": ("maybe", "mixed-method study on Zenodo"),
    "R0781": ("include", "empirical study (type mis-tagged)"),
    "R1336": ("include", "India deepfake regulation (type mis-tagged)"),
    "R1526": ("maybe", "conference abstract"), "R1135": ("maybe", "conference abstract"),
    "R1574": ("include", "cybercrime rates by Indian state"),
    "R2000": ("include", "legal analysis of IT Act offences"),
    "R0988": ("maybe", "ethics essay"),
}


def apply_overrides():
    rows = list(csv.DictReader(open(OUT, encoding="utf-8-sig")))
    for r in rows:
        if r["record_id"] in OVERRIDES:
            r["suggestion"], r["suggestion_reason"] = OVERRIDES[r["record_id"]]
        elif r["suggestion_reason"] == "wrong country" and not r["abstract"].strip():
            r["suggestion"], r["suggestion_reason"] = "maybe", "no abstract; South Asia link unclear"
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    c = Counter((r["tier"][0], r["suggestion"]) for r in rows if r["suggestion"])
    print("after overrides:", sorted(c.items()))


if __name__ == "__main__":
    apply_overrides()
