"""Abstract-level charting for Tier B (rest of South Asia), plus the same
coding for Tier A as a first-pass evidence map before full-text charting.

Rule-based: each code is assigned when its pattern appears in the title or
abstract. Codes are multi-label (joined by ';'). Output is for an evidence
map of what has been studied, where and how, not for findings.

    python scripts/chart_abstracts.py   (run from research/scoping-review/)
"""
import csv
import re
from collections import Counter

SRC = "screening_suggestions.csv"
OUT = "charting_abstracts.csv"
MAP = "evidence_map.md"

COUNTRY = {
    "Bangladesh": r"bangladesh|dhaka|chattogram|chittagong|rajshahi|khulna|sylhet",
    "India": r"india|indian|kerala|tamil|karnataka|maharashtra|delhi|mumbai|kolkata|"
             r"bengaluru|bangalore|hyderabad|uttar pradesh|bihar|assam|odisha|punjab(?!.*pakistan)|gujarat|rajasthan|ncrb",
    "Pakistan": r"pakistan|karachi|lahore|islamabad|rawalpindi|peshawar|sindh|khyber|peca",
    "Nepal": r"nepal|kathmandu",
    "Sri Lanka": r"sri lanka|colombo",
    "Bhutan": r"bhutan",
    "Maldives": r"maldives",
    "Afghanistan": r"afghanistan",
}
CRIME = {
    "mfs_fraud": r"mobile (money|financial)|\bmfs\b|bkash|nagad|upi\b|paytm|easypaisa|jazzcash",
    "online_fraud_scam": r"fraud|scam|ponzi|cheat|deceiv|deception|e-?commerce fraud|loan app",
    "phishing": r"phish|vishing|smishing",
    "hacking": r"hack|account takeover|unauthori[sz]ed access|intrusion",
    "sextortion_image_abuse": r"sextort|image[- ]based|revenge porn|non-?consensual (intimate|image|porn)|morphed",
    "cyberbullying_harassment": r"cyber[- ]?bull|harass|stalk|troll|doxx|online abuse|cyber[- ]?victim",
    "tfgbv": r"gender[- ]based|tfgbv|violence against women|against women|women'?s safety|misogyn",
    "online_child_abuse": r"child (sexual|abuse|porn|exploit)|csam|online child|grooming",
    "deepfakes": r"deep ?fake|synthetic media|ai-generated (image|video)",
    "hate_misinfo": r"hate speech|misinformation|disinformation|fake news|rumou?r",
    "online_gambling": r"gambl|betting",
    "data_breach_privacy": r"data breach|data leak|privacy|data protection|identity theft",
    "attack_on_organisation": r"ransomware|malware|ddos|cyber[- ]?attack|critical infrastructure|bank heist|swift",
    "cyber_terror_extremism": r"terror|extrem|radicali",
    "speech_cyber_law": r"freedom of (speech|expression)|censor|digital security act|defamation|dissent|journalist",
}
FOCUS = {
    "victimisation": r"victim|prevalence|experienc|survivor",
    "offending": r"offender|perpetrat|criminal behaviou?r|motivation of|cyber ?criminals?\b",
    "policing": r"police|policing|investigat|law enforcement|cyber cell",
    "courts_evidence": r"court|judicia|prosecut|evidence|admissib|conviction",
    "law_policy": r"\blaw\b|laws\b|legal|legislat|act,? \d{4}|statut|regulat|policy|ordinance",
    "prevention_awareness": r"awareness|prevent|literacy|protective behaviou?r|safety practice",
    "harm_impact": r"mental health|depress|anxiety|suicid|wellbeing|well-being|psycholog|financial loss|impact",
    "detection_technical": r"machine learning|deep learning|neural|classif|detection model|algorithm",
}
DESIGN = {
    "survey": r"survey|questionnaire|respondents|cross-sectional|likert|n ?= ?\d+",
    "qualitative": r"interview|focus group|qualitative|thematic analysis|ethnograph|case stud",
    "legal_doctrinal": r"doctrinal|legal analysis|critical analysis of (the )?(law|act)|statutory|"
                       r"case law|jurisprudence|comparative legal",
    "review": r"systematic review|literature review|scoping review|meta-analysis|review of (the )?literature|bibliometric|scientometric",
    "content_analysis": r"content analysis|news(paper)? (report|articles|coverage)|media coverage|tweets|twitter data|social media data",
    "official_data": r"ncrb|crime records|official (statistics|data)|police (records|data)|fir\b",
    "experiment": r"experiment|randomi[sz]ed|intervention",
    "technical": r"machine learning|deep learning|neural|dataset|accuracy of|precision|f1",
}
POPULATION = {
    "university_students": r"universit|undergraduate|college students|tertiary",
    "school_adolescents": r"adolescen|school (students|children)|teen|secondary school|youth",
    "women": r"\bwomen\b|female|girls",
    "children": r"\bchild",
    "journalists": r"journalist",
    "police_justice": r"police officers|investigators|judges|lawyers|prosecutors",
    "organisations": r"\bbanks?\b|organi[sz]ation|firms|companies|smes?\b",
}
THEORY = {
    "routine_activity": r"routine activit|lifestyle",
    "strain": r"strain theory",
    "social_learning": r"social learning|differential association",
    "space_transition": r"space transition",
    "self_control": r"self-control|self control",
    "feminist": r"feminis|patriarch",
    "securitisation": r"securiti[sz]ation",
    "deterrence_rational": r"deterrence|rational choice",
    "neutralisation": r"neutrali[sz]ation",
}


def tags(patterns, text):
    return ";".join(k for k, p in patterns.items() if re.search(p, text))


def main():
    rows = [r for r in csv.DictReader(open(SRC, encoding="utf-8-sig"))
            if r["suggestion"] in ("include", "maybe")]
    out = []
    for r in rows:
        text = f"{r['title']} {r['abstract']}".lower()
        out.append({
            "record_id": r["record_id"], "tier": r["tier"], "suggestion": r["suggestion"],
            "year": r["year"], "type": r["type"], "title": r["title"],
            "has_abstract": "yes" if r["abstract"].strip() else "no",
            "country": tags(COUNTRY, text), "crime_type": tags(CRIME, text),
            "focus": tags(FOCUS, text), "design": tags(DESIGN, text),
            "population": tags(POPULATION, text), "theory": tags(THEORY, text),
        })
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    write_map(out)


def count(rows, field):
    c = Counter()
    for r in rows:
        for t in (r[field].split(";") if r[field] else ["(none coded)"]):
            c[t] += 1
    return c


def table(rows, field, groups):
    keys = sorted({t for g in groups.values() for t in count(g, field)},
                  key=lambda k: -count(rows, field)[k])
    head = "| " + field + " | " + " | ".join(f"{g} (n={len(v)})" for g, v in groups.items()) + " |"
    lines = [head, "|---" * (len(groups) + 1) + "|"]
    for k in keys:
        cells = []
        for v in groups.values():
            n = count(v, field)[k]
            cells.append(f"{n} ({100 * n / len(v):.0f}%)" if v else "0")
        lines.append(f"| {k} | " + " | ".join(cells) + " |")
    return "\n".join(lines)


def write_map(rows):
    with_abs = [r for r in rows if r["has_abstract"] == "yes"]
    bd = [r for r in with_abs if "Bangladesh" in r["country"]]
    ind = [r for r in with_abs if "India" in r["country"] and "Bangladesh" not in r["country"]]
    pak = [r for r in with_abs if "Pakistan" in r["country"] and "Bangladesh" not in r["country"]]
    other = [r for r in with_abs if r not in bd and r not in ind and r not in pak]
    groups = {"Bangladesh": bd, "India": ind, "Pakistan": pak, "Other/unclear": other}
    years = Counter((r["year"], "BD" if r in bd else "other") for r in with_abs)
    parts = [
        "# Evidence map, first pass (abstract level)",
        "",
        "Automatic keyword coding of titles and abstracts (`scripts/chart_abstracts.py`).",
        f"{len(rows)} records suggested include or maybe; {len(with_abs)} have an abstract",
        "and are counted below. Codes are multi-label, so percentages add up to more",
        "than 100. **This is a rough first pass. The Bangladesh figures will be",
        "replaced by full-text charting.**",
        "",
        "## Records by year",
        "",
        "| Year | Bangladesh | Other South Asia |",
        "|---|---|---|",
    ]
    for y in sorted({r["year"] for r in with_abs}):
        parts.append(f"| {y} | {years[(y, 'BD')]} | {years[(y, 'other')]} |")
    for field, label in (("crime_type", "Crime type"), ("focus", "Focus"),
                         ("design", "Design / data"), ("population", "Population"),
                         ("theory", "Criminological theory named")):
        parts += ["", f"## {label}", "", table(with_abs, field, groups)]
    open(MAP, "w", encoding="utf-8").write("\n".join(parts) + "\n")
    print("bd", len(bd), "india", len(ind), "pak", len(pak), "other", len(other))


if __name__ == "__main__":
    main()
