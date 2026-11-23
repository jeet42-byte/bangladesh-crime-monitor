"""Build the second-reviewer workbook (random samples + automatic agreement statistics).

    python scripts/second_reviewer.py     (run from research/scoping-review/)

Sheets
  Instructions         how to work
  1_Screening          random 20% of the 2,101 screened records; reviewer decides include/exclude BLIND
  2_Charting           random 20% of included Bangladesh records; reviewer checks the first reviewer's codes
  3_TierB_coding       random 60 Tier B records; reviewer checks the automatic codes
  Results              Cohen's kappa and % agreement, computed by Excel formulas
  key (hidden)         first reviewer's screening decisions — do not open before finishing sheet 1
"""
import json, random
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

SEED = 2026
rng = random.Random(SEED)
rec = pd.read_csv("screening_suggestions.csv", encoding="utf-8-sig", dtype=str).fillna("")
ch = pd.DataFrame([json.loads(l) for l in open("charting_tierA_rows.jsonl")])
codes = pd.read_csv("charting_abstracts.csv", encoding="utf-8-sig", dtype=str).fillna("").set_index("record_id")

def first_decision(r):
    return "include" if r.suggestion in ("include", "maybe") else "exclude"
rec["first"] = rec.apply(first_decision, axis=1)

scr = rec.iloc[sorted(rng.sample(range(len(rec)), round(0.2 * len(rec))))]
inc = ch[ch.final_decision == "include"]
chs = inc.iloc[sorted(rng.sample(range(len(inc)), round(0.2 * len(inc))))]
tb = rec[(rec.tier.str.startswith("B")) & rec.suggestion.isin(["include", "maybe"]) & (rec.abstract.str.len() > 50)]
tbs = tb.iloc[sorted(rng.sample(range(len(tb)), 60))]

wb = Workbook()
H = Font(bold=True, color="FFFFFF"); HF = PatternFill("solid", fgColor="7F1D1D"); YF = PatternFill("solid", fgColor="FFF4CC")
WR = Alignment(wrap_text=True, vertical="top")
def header(ws, cols, widths):
    ws.append(cols)
    for i, w in enumerate(widths, 1):
        c = ws.cell(1, i); c.font = H; c.fill = HF; c.alignment = WR
        ws.column_dimensions[c.column_letter].width = w
    ws.freeze_panes = "A2"

ins = wb.active; ins.title = "Instructions"
for line in [
    "SECOND-REVIEWER CHECK — scoping review: cybercrime research in South Asia (Bangladesh focus)",
    "",
    "Work only in the YELLOW columns. Use the drop-down lists. Do not open the hidden 'key' sheet.",
    "",
    "Sheet 1_Screening (≈420 records): read title + abstract and decide include / exclude using the rules below.",
    "   Decide independently — you do not see the first reviewer's decision.",
    "Sheet 2_Charting (≈39 records): open the paper (DOI link) and mark whether each code is correct (Y/N). Add a correction if N.",
    "Sheet 3_TierB_coding (60 records): read title + abstract; mark whether each automatic code is correct (Y/N).",
    "The Results sheet calculates Cohen's kappa and agreement automatically. Disagreements are discussed and resolved afterwards.",
    "",
    "ELIGIBILITY RULES (summary)",
    "INCLUDE: cybercrime or online harm (online fraud/scams, MFS fraud, phishing, hacking, cyberbullying/harassment, image-based abuse,",
    "   sextortion, online child sexual abuse, deepfakes, online hate) or cyber laws incl. speech offences; awareness surveys about cyber threats.",
    "   Tier A = Bangladesh, any discipline. Tier B = other South Asian countries, social sciences.",
    "EXCLUDE: crime is only one item in a list; fintech adoption/trust without a crime focus; offline fraud (Ponzi, chit funds, loan fraud);",
    "   news/opinion/editorials/protocols; purely technical work outside Bangladesh; organisational cyber-readiness without a crime focus;",
    "   mental-health studies that do not report cyberbullying; wrong country; not in English.",
    "If unsure, choose include (screening is deliberately inclusive).",
]:
    ins.append([line])
ins.column_dimensions["A"].width = 140

dv_ie = DataValidation(type="list", formula1='"include,exclude"', allow_blank=True)
dv_yn = DataValidation(type="list", formula1='"Y,N"', allow_blank=True)

s1 = wb.create_sheet("1_Screening")
header(s1, ["record_id", "tier", "year", "title", "abstract", "YOUR decision", "reason (if exclude)"], [10, 6, 6, 50, 90, 14, 28])
for _, r in scr.iterrows():
    s1.append([r.record_id, r.tier, r.year, r.title, r.abstract[:1500] or "(no abstract)", "", ""])
n1 = len(scr) + 1
for row in s1.iter_rows(min_row=2):
    for c in row: c.alignment = WR
    row[5].fill = YF; row[6].fill = YF
s1.add_data_validation(dv_ie); dv_ie.add(f"F2:F{n1}")

key = wb.create_sheet("key")
key.append(["record_id", "first_reviewer"])
for _, r in scr.iterrows():
    key.append([r.record_id, r.first])
key.sheet_state = "hidden"

s2 = wb.create_sheet("2_Charting")
fields = ["design", "crime_type", "focus", "population", "theory", "data_source"]
cols = ["record_id", "doi / link", "title", "charted_from"]
for f in fields: cols += [f, f"{f} OK? (Y/N)"]
cols += ["corrections / notes"]
header(s2, cols, [10, 22, 40, 10] + [24, 9] * len(fields) + [40])
tmap = rec.set_index("record_id")
for _, r in chs.iterrows():
    t = tmap.loc[r.record_id] if r.record_id in tmap.index else None
    doi = ("https://doi.org/" + t.doi) if t is not None and t.doi else ""
    row = [r.record_id, doi, t.title if t is not None else "", r.charted_from]
    for f in fields: row += [r[f], ""]
    s2.append(row + [""])
n2 = len(chs) + 1
yn_cols = [5 + 2 * i + 1 for i in range(len(fields))]
for row in s2.iter_rows(min_row=2):
    for c in row: c.alignment = WR
    for ci in yn_cols: row[ci - 1].fill = YF
    row[-1].fill = YF
s2.add_data_validation(dv_yn)
for ci in yn_cols:
    L = s2.cell(1, ci).column_letter; dv_yn.add(f"{L}2:{L}{n2}")

s3 = wb.create_sheet("3_TierB_coding")
f3 = ["country", "crime_type", "focus", "design"]
cols = ["record_id", "title", "abstract"]
for f in f3: cols += [f"auto {f}", f"{f} OK? (Y/N)"]
header(s3, cols, [10, 40, 80] + [20, 9] * len(f3))
for _, r in tbs.iterrows():
    c = codes.loc[r.record_id] if r.record_id in codes.index else None
    row = [r.record_id, r.title, r.abstract[:1500]]
    for f in f3: row += [(c[f] if c is not None else "") or "(none)", ""]
    s3.append(row)
n3 = len(tbs) + 1
yn3 = [4 + 2 * i + 1 for i in range(len(f3))]
for row in s3.iter_rows(min_row=2):
    for c in row: c.alignment = WR
    for ci in yn3: row[ci - 1].fill = YF
dv_yn3 = DataValidation(type="list", formula1='"Y,N"', allow_blank=True); s3.add_data_validation(dv_yn3)
for ci in yn3:
    L = s3.cell(1, ci).column_letter; dv_yn3.add(f"{L}2:{L}{n3}")

res = wb.create_sheet("Results")
Q2, Q3 = "'2_Charting'", "'3_TierB_coding'"
F = f"'1_Screening'!F2:F{n1}"; K = f"key!B2:B{n1}"
res.append(["SCREENING AGREEMENT (sheet 1)"]); res["A1"].font = Font(bold=True)
rows = [
    ("Records decided by second reviewer", f'=COUNTIF({F},"include")+COUNTIF({F},"exclude")'),
    ("a: both include", f'=COUNTIFS({F},"include",{K},"include")'),
    ("b: second include, first exclude", f'=COUNTIFS({F},"include",{K},"exclude")'),
    ("c: second exclude, first include", f'=COUNTIFS({F},"exclude",{K},"include")'),
    ("d: both exclude", f'=COUNTIFS({F},"exclude",{K},"exclude")'),
    ("Observed agreement po", "=IF(B2=0,\"\",(B3+B6)/B2)"),
    ("Expected agreement pe", "=IF(B2=0,\"\",((B3+B4)*(B3+B5)+(B5+B6)*(B4+B6))/B2^2)"),
    ("Cohen's kappa", "=IF(B2=0,\"\",(B7-B8)/(1-B8))"),
    ("", ""),
    ("CHARTING AGREEMENT (sheet 2) — % of codes marked Y", ""),
]
for lab, f in rows: res.append([lab, f])
r0 = res.max_row
for i, fname in enumerate(fields):
    L = s2.cell(1, yn_cols[i]).column_letter
    res.append([fname, f'=IFERROR(COUNTIF({Q2}!{L}2:{L}{n2},"Y")/(COUNTIF({Q2}!{L}2:{L}{n2},"Y")+COUNTIF({Q2}!{L}2:{L}{n2},"N")),"")'])
res.append(["", ""]); res.append(["TIER B AUTOMATIC CODING ACCURACY (sheet 3) — % marked Y", ""])
for i, fname in enumerate(f3):
    L = s3.cell(1, yn3[i]).column_letter
    res.append([fname, f'=IFERROR(COUNTIF({Q3}!{L}2:{L}{n3},"Y")/(COUNTIF({Q3}!{L}2:{L}{n3},"Y")+COUNTIF({Q3}!{L}2:{L}{n3},"N")),"")'])
res.append(["", ""]); res.append(["Interpretation of kappa: <0.40 poor, 0.40–0.60 moderate, 0.61–0.80 substantial, >0.80 almost perfect (Landis & Koch 1977)."])
res.column_dimensions["A"].width = 60; res.column_dimensions["B"].width = 14
for row in res.iter_rows(min_row=1):
    if isinstance(row[1].value, str) and row[1].value.startswith("=IF") and ("po" in str(row[0].value) or "pe" in str(row[0].value) or "kappa" in str(row[0].value) or "%" in str(row[0].value)):
        row[1].number_format = "0.000"
for r in range(r0 + 1, res.max_row + 1):
    res.cell(r, 2).number_format = "0%"
res["B7"].number_format = res["B8"].number_format = res["B9"].number_format = "0.000"

wb.save("second_reviewer_check.xlsx")
print("screening", len(scr), "charting", len(chs), "tierB", len(tbs))
print("first-reviewer include share in screening sample:", (scr["first"] == "include").mean().round(3))
