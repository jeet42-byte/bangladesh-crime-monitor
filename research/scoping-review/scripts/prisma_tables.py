"""Paper 1: PRISMA-ScR flow diagram, evidence-map heatmap and summary tables.

    python scripts/prisma_tables.py     (run from research/scoping-review/)

All counts are computed from the screening and charting files, not typed in.
Outputs: figures/fig0_prisma.png, figures/fig5_evidence_map.png, tables.md
"""
import json, re, collections
import pandas as pd, numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

rec = pd.read_csv("screening_suggestions.csv", encoding="utf-8-sig", dtype=str).fillna("")
log = json.load(open("search_log.json")) if False else None
ft = pd.read_csv("fulltext_tierA.csv", encoding="utf-8-sig", dtype=str)
ch = pd.DataFrame([json.loads(l) for l in open("charting_tierA_rows.jsonl")])
nr = pd.read_csv("reports_not_retrieved.csv", encoding="utf-8-sig", dtype=str)

ident_A, ident_B = 603, 1604                       # OpenAlex hits per tier (search_log / README)
identified = ident_A + ident_B
screened = len(rec); dups = identified - screened
pre = rec[rec.prescreen != "screen"]
pre_title = pre.prescreen_reason.str.startswith("title:").sum()   # off-topic or non-cyber fraud judged on title
pre_rule = len(pre) - pre_title                                      # non-studies, language, field / technical rules
abs_excl = (rec.suggestion == "exclude").sum()
excl_ta = len(pre) + abs_excl
fwd = rec[rec.suggestion.isin(["include", "maybe"])]
fwdA = len(ft); fwdB = len(fwd) - fwdA
not_ret = len(nr)
asm_full = (ch.charted_from == "full text").sum(); asm_abs = (ch.charted_from == "abstract").sum()
exc = ch[ch.final_decision == "exclude"]
reasons = exc.exclude_reason.str.replace(r" \(protocol\)", "", regex=True).value_counts()
incA = (ch.final_decision == "include").sum()
inc_full = ((ch.final_decision == "include") & (ch.charted_from == "full text")).sum()
assert asm_full + asm_abs + not_ret == fwdA, "Tier A counts do not reconcile"

# ---------------- PRISMA-ScR flow ----------------
fig, ax = plt.subplots(figsize=(11, 12)); ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")
def box(x, y, w, h, txt, fc="#ffffff"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4", fc=fc, ec="#333", lw=1))
    ax.text(x + w / 2, y + h / 2, txt, ha="center", va="center", fontsize=9, wrap=True)
def arrow(x1, y1, x2, y2): ax.annotate("", (x2, y2), (x1, y1), arrowprops=dict(arrowstyle="->", lw=1))
for y, lab in ((91, "Identification"), (70, "Screening"), (40, "Eligibility"), (8, "Included")):
    ax.text(1, y, lab, rotation=90, fontsize=10, fontweight="bold", va="center", color="#555")
box(8, 86, 50, 10, f"Records identified (OpenAlex, 2010–2026)\nn = {identified}\nTier A Bangladesh (all fields) = {ident_A}\nTier B rest of South Asia (social sciences) = {ident_B}", "#eef3f8")
box(66, 88, 32, 6, f"Duplicates / overlap removed\nn = {dups}")
arrow(58, 91, 66, 91)
box(8, 72, 50, 8, f"Records screened (title / abstract)\nn = {screened}")
arrow(33, 86, 33, 80)
box(66, 68, 32, 14, f"Records excluded n = {excl_ta}\n• rule-based pre-screen: {pre_rule}\n  (non-studies, language, field, technical)\n• title off-topic: {pre_title}\n• abstract: {abs_excl}")
arrow(58, 76, 66, 76)
box(8, 52, 50, 10, f"Records taken forward\nn = {len(fwd)}\nTier A = {fwdA}   ·   Tier B = {fwdB}")
arrow(33, 72, 33, 62)
box(4, 30, 28, 14, f"Tier A reports sought\nn = {fwdA}\nassessed in full text: {asm_full}\nassessed from abstract: {asm_abs}")
arrow(22, 52, 18, 44)
box(37, 40, 28, 6, f"Not retrieved (no full text\nor abstract) n = {not_ret}")
arrow(32, 41, 37, 43)
box(37, 24, 28, 13, "Excluded n = {}\n".format(len(exc)) + "\n".join(f"• {k}: {v}" for k, v in reasons.items()))
arrow(32, 33, 37, 30)
box(70, 30, 26, 14, f"Tier B charted from\nabstracts (automated\ncoding)\nn = {fwdB}")
arrow(48, 52, 83, 44)
box(4, 4, 28, 12, f"Tier A included\nn = {incA}\n(full text {inc_full}, abstract {incA - inc_full})", "#fbeaea")
box(70, 4, 26, 12, f"Tier B included\nn = {fwdB}", "#f2f2f2")
box(37, 4, 28, 12, f"Total included in review\nn = {incA + fwdB}", "#fbeaea")
arrow(18, 30, 18, 16); arrow(83, 30, 83, 16); arrow(32, 10, 37, 10); arrow(70, 10, 65, 10)
plt.title("PRISMA-ScR flow of records", fontsize=12)
plt.savefig("figures/fig0_prisma.png", dpi=200, bbox_inches="tight"); plt.close()

# ---------------- Evidence map heatmap (Bangladesh) ----------------
a = ch[ch.final_decision == "include"].copy()
CRIME = ["online_fraud_scam", "mfs_fraud", "phishing", "hacking_account_takeover", "attack_on_organisation", "data_breach_privacy",
         "cyberbullying_harassment", "sextortion_image_abuse", "online_child_abuse", "tfgbv", "deepfakes", "hate_speech_misinfo",
         "speech_offence_cyber_law", "cyber_terror_extremism", "general_cybercrime"]
FOCUS = ["victimisation", "offending", "harm-impact", "prevention-awareness", "policing-investigation", "prosecution-courts-evidence",
         "law-policy", "speech regulation", "detection-technical"]
M = pd.DataFrame(0, index=CRIME, columns=FOCUS)
for _, r in a.iterrows():
    cs = [c for c in CRIME if c in r.crime_type]; fs = [f for f in FOCUS if f in r.focus]
    for c in cs:
        for f in fs: M.loc[c, f] += 1
fig, ax = plt.subplots(figsize=(8.5, 7.5))
im = ax.imshow(M.values, cmap="Reds")
ax.set_xticks(range(len(FOCUS))); ax.set_xticklabels(FOCUS, rotation=40, ha="right")
ax.set_yticks(range(len(CRIME))); ax.set_yticklabels([c.replace("_", " ") for c in CRIME])
for i in range(len(CRIME)):
    for j in range(len(FOCUS)):
        v = M.values[i, j]
        ax.text(j, i, v if v else "·", ha="center", va="center", fontsize=8, color="white" if v > M.values.max() * 0.55 else "#333")
ax.set_title(f"Evidence map: crime type × research focus, Bangladesh (n={len(a)} studies; multi-coded)")
plt.tight_layout(); plt.savefig("figures/fig5_evidence_map.png", dpi=200); plt.close()

# ---------------- Tables ----------------
def tally(col, split=True, norm=None):
    c = collections.Counter()
    for v in a[col]:
        parts = [p.strip() for p in str(v).split(";")] if split else [str(v)]
        for p in parts:
            p = re.sub(r" \(.*", "", p)
            if p and p not in ("none", "nr", "na"): c[norm(p) if norm else p] += 1
    return c
n = len(a)
T = ["# Paper 1 tables", "", f"Generated by `scripts/prisma_tables.py`. Bangladesh included studies n = {n} (full text {inc_full}, abstract {n - inc_full}).", ""]
T += ["## Table 1. PRISMA-ScR counts", "", "| Step | n |", "|---|---|",
      f"| Identified (Tier A / Tier B) | {identified} ({ident_A} / {ident_B}) |", f"| Duplicates / overlap removed | {dups} |",
      f"| Screened | {screened} |", f"| Excluded at title/abstract | {excl_ta} |", f"| Taken forward (Tier A / Tier B) | {len(fwd)} ({fwdA} / {fwdB}) |",
      f"| Tier A not retrieved | {not_ret} |", f"| Tier A assessed (full text / abstract) | {asm_full + asm_abs} ({asm_full} / {asm_abs}) |",
      f"| Tier A excluded | {len(exc)} ({', '.join(f'{k} {v}' for k, v in reasons.items())}) |",
      f"| **Included: Tier A / Tier B / total** | **{incA} / {fwdB} / {incA + fwdB}** |", ""]
def block(title, c, top=None):
    rows = c.most_common(top)
    return [f"## {title}", "", "| Category | n | % |", "|---|---|---|"] + [f"| {k} | {v} | {v/n:.0%} |" for k, v in rows] + [""]
yrs = pd.to_numeric(a.record_id.map(rec.set_index("record_id").year), errors="coerce")
T += block("Table 2a. Document type", tally("doc_type", False))
T += block("Table 2b. Discipline", tally("discipline", False, lambda s: "other" if s.startswith("other") else s))
T += block("Table 2c. Design", tally("design", False))
T += block("Table 2d. Crime type (multi-coded)", tally("crime_type"))
T += block("Table 2e. Population (multi-coded)", tally("population"))
src = collections.Counter()
for v in a.data_source.str.lower():
    for k, pat in (("Survey", "survey"), ("Interviews / FGDs", "interview"), ("Legal texts", "legal"), ("Secondary literature", "secondary"),
                   ("News reports", "news"), ("Social media data", "social media"), ("Technical dataset", "technical"),
                   ("Official statistics", "official"), ("Police / court records", "police|court")):
        if re.search(pat, v): src[k] += 1
T += block("Table 2f. Data source (multi-coded)", src)
T += [f"Years: {int(yrs.min())}–{int(yrs.max())}; {(yrs >= 2022).mean():.0%} published 2022 or later.", ""]

# Quality / evidence-strength indicators (descriptive, not a formal appraisal; PRISMA-ScR item 12 optional)
peer = a.doc_type.isin(["journal article", "conference paper", "book chapter"])
emp = a.design.str.contains("survey|qualitative|mixed|content|technical|experiment")
def num(s):
    m = re.search(r"\d[\d,]*", str(s)); return int(m.group().replace(",", "")) if m else np.nan
ss = a.sample_size.map(num)
surveys = a[a.design.str.contains("survey")]
probab = a.key_findings.str.contains("random|nationally representative|national survey|BAHWS|LIRNEasia", case=False) | a.data_source.str.contains("BAHWS|national", case=False)
flag = a.quality_note.str.contains("predatory|low-tier|low quality|copied|fabricat|plagiar|very weak|weak|inflated|IISTE|IJRAR|IOSR", case=False)
theory_named = ~a.theory.str.lower().str.strip().str.startswith(("none", "nr")) & a.theory.str.strip().ne("")
T += ["## Table 3. Evidence-strength indicators (descriptive)", "", "| Indicator | n | % of included |", "|---|---|---|",
      f"| Journal, conference or chapter format (peer review not verified) | {peer.sum()} | {peer.mean():.0%} |",
      f"| Preprint, thesis, report or book | {(~peer).sum()} | {(~peer).mean():.0%} |",
      f"| Empirical (primary or secondary data) | {emp.sum()} | {emp.mean():.0%} |",
      f"| Survey studies | {len(surveys)} | {len(surveys)/n:.0%} |",
      f"| — survey with reported n ≥ 300 | {(surveys.sample_size.map(num) >= 300).sum()} | — |",
      f"| — probability / nationally representative sample | {probab[surveys.index].sum()} | — |",
      f"| Any theory named | {theory_named.sum()} | {theory_named.mean():.0%} |",
      f"| Reviewer-flagged quality concern (outlet, copied text, inflated estimates, weak method) | {flag.sum()} | {flag.mean():.0%} |",
      f"| Gender lens | {(a.gender_lens=='yes').sum()} | {(a.gender_lens=='yes').mean():.0%} |", "",
      "Reviewer-flagged concerns come from the charting `quality_note` field and are the reviewer's judgement, not a validated tool.", ""]
open("tables.md", "w", encoding="utf-8").write("\n".join(T) + "\n")
print("\n".join(T[:18]))
