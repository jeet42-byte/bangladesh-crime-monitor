"""20-record calibration pilot for a prospective second reviewer.

    python scripts/pilot.py            -> builds pilot_screening.xlsx + pilot_key.csv
    python scripts/pilot.py RETURNED.xlsx  -> compares a returned pilot with the key

Records are drawn from OUTSIDE the main 20% sample (same seed logic as second_reviewer.py),
stratified: 10 first-reviewer includes, 6 clear excludes, 4 borderline ('maybe' / abstract-stage excludes).
The answer key is kept out of the pilot file.
"""
import random, sys
import pandas as pd
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

rec = pd.read_csv("screening_suggestions.csv", encoding="utf-8-sig", dtype=str).fillna("")
rec["first"] = rec.suggestion.isin(["include", "maybe"]).map({True: "include", False: "exclude"})

if len(sys.argv) > 1:
    key = pd.read_csv("pilot_key.csv", dtype=str)
    ws = load_workbook(sys.argv[1])["Pilot"]
    ans = {ws.cell(r, 1).value: (ws.cell(r, 5).value or "").strip().lower() for r in range(2, ws.max_row + 1)}
    key["second"] = key.record_id.map(ans)
    key["match"] = key.first == key.second
    print(key[["record_id", "stratum", "first", "second", "match"]].to_string(index=False))
    n = key.second.isin(["include", "exclude"]).sum()
    print(f"\nAgreement: {key.match.sum()} / {n}  ({key.match.sum()/max(n,1):.0%}).  Guide: >=16/20 -> send the full file.")
    sys.exit()

# exclude records in the main 20% sample
rng = random.Random(2026)
main = set(rec.iloc[sorted(rng.sample(range(len(rec)), round(0.2 * len(rec))))].record_id)
pool = rec[~rec.record_id.isin(main) & (rec.abstract.str.len() > 80)]
r2 = random.Random(7)
def pick(df, k): return df.iloc[sorted(r2.sample(range(len(df)), k))]
inc = pick(pool[pool.suggestion == "include"], 10).assign(stratum="clear include")
exc = pick(pool[pool.prescreen == "exclude"], 6).assign(stratum="clear exclude")
bord = pick(pool[pool.suggestion.isin(["maybe", "exclude"])], 4).assign(stratum="borderline")
pil = pd.concat([inc, exc, bord]).sample(frac=1, random_state=3)
pil[["record_id", "stratum", "first"]].to_csv("pilot_key.csv", index=False)

wb = Workbook(); ws = wb.active; ws.title = "Pilot"
ws.append(["record_id", "year", "title", "abstract", "YOUR decision", "reason (if exclude)"])
for i, w in enumerate([10, 6, 45, 95, 14, 30], 1):
    c = ws.cell(1, i); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="7F1D1D")
    ws.column_dimensions[c.column_letter].width = w
for _, r in pil.iterrows():
    ws.append([r.record_id, r.year, r.title, r.abstract[:1500], "", ""])
Y = PatternFill("solid", fgColor="FFF4CC")
for row in ws.iter_rows(min_row=2):
    for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
    row[4].fill = Y; row[5].fill = Y
dv = DataValidation(type="list", formula1='"include,exclude"'); ws.add_data_validation(dv); dv.add("E2:E21")
ws.freeze_panes = "A2"
ins = wb.create_sheet("Instructions", 0)
for line in ["CALIBRATION PILOT (20 records, ~20–30 minutes)", "",
             "For each record, read the title and abstract and choose include / exclude in the yellow column.",
             "INCLUDE: cybercrime or online harm (online fraud/scams, MFS fraud, phishing, hacking, cyberbullying/harassment, image-based abuse,",
             "   sextortion, online child sexual abuse, deepfakes, online hate) or cyber laws incl. speech offences; awareness surveys about cyber threats.",
             "   Bangladesh: any discipline. Other South Asian countries: social sciences.",
             "EXCLUDE: crime only one item in a list; fintech adoption/trust without a crime focus; offline fraud (Ponzi, chit funds, loan fraud);",
             "   news/opinion/editorials/protocols; purely technical work outside Bangladesh; organisational cyber-readiness without crime focus;",
             "   mental-health studies not reporting cyberbullying; wrong country; not English.",
             "If unsure, choose include.", "",
             "Save as pilot_<YourName>.xlsx and email it back."]:
    ins.append([line])
ins.column_dimensions["A"].width = 140
wb.save("pilot_screening.xlsx")
print(pil.stratum.value_counts().to_dict(), "first-reviewer:", pil["first"].value_counts().to_dict())
