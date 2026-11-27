"""20% second-person check of the Study 1 frame (protocol section 10).

    python preregistration/make_frame_check.py   ->  preregistration/frame_check_20pct.xlsx

Random 20% of institutions, stratified by sector, seed 2026. The checker
confirms, for each, that the domain belongs to the named institution and is
its official one. Agreement is computed in the Results sheet; above 5% errors
triggers a full re-check.
"""
import csv, random
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).resolve().parent
F = HERE.parent / "frame"
rows = []
for code in ("FIN", "GOV", "EDU"):
    for r in csv.DictReader(open(F / f"frame_{code}_v1.csv", encoding="utf-8-sig")):
        if r.get("analysis_group", "").startswith("duplicate"):
            continue
        rows.append(r)
rng = random.Random(2026)
by = {}
for r in rows:
    by.setdefault(r["sector"], []).append(r)
sample = []
for sector in sorted(by):
    grp = by[sector]
    k = max(1, round(0.2 * len(grp)))
    sample += [grp[i] for i in sorted(rng.sample(range(len(grp)), k))]

wb = Workbook()
ins = wb.active; ins.title = "Instructions"
for line in [
    "FRAME CHECK - Study 1 (email-security census of Bangladeshi institutions)",
    "",
    f"{len(sample)} institutions, a random 20% of the {len(rows)} in the study, stratified by sector (seed 2026).",
    "For each row:",
    "  1. Open the domain in a browser (add https:// in front).",
    "  2. Column F: is this the OFFICIAL website of the institution named in column A? (Y / N / unsure)",
    "     Check the name/logo on the page; if unsure, search Google for the institution's official site.",
    "  3. If N or unsure, write the correct domain (or a note) in column G.",
    "Do NOT log in, fill in forms or click anything beyond reading the home page.",
    "About 1 minute per row, ~1 hour in total. Save as frame_check_<YourName>.xlsx and email it back.",
]:
    ins.append([line])
ins.column_dimensions["A"].width = 120
ws = wb.create_sheet("Check")
hdr = ["institution", "sector", "subtype", "domain", "notes (from first check)", "OFFICIAL? (Y/N/unsure)", "correction / note"]
ws.append(hdr)
for i, w in enumerate([45, 10, 18, 30, 40, 16, 40], 1):
    c = ws.cell(1, i); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F3A5F")
    ws.column_dimensions[c.column_letter].width = w
for r in sample:
    ws.append([r["institution"], r["sector"], r["subtype"], r["candidate_domain"], "", "", ""])
Y = PatternFill("solid", fgColor="FFF4CC")
for row in ws.iter_rows(min_row=2):
    for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
    row[5].fill = Y; row[6].fill = Y
n = len(sample) + 1
dv = DataValidation(type="list", formula1='"Y,N,unsure"', allow_blank=True); ws.add_data_validation(dv); dv.add(f"F2:F{n}")
ws.freeze_panes = "A2"
res = wb.create_sheet("Results")
res.append(["Rows checked", f'=COUNTIF(Check!F2:F{n},"Y")+COUNTIF(Check!F2:F{n},"N")+COUNTIF(Check!F2:F{n},"unsure")'])
res.append(["Confirmed (Y)", f'=COUNTIF(Check!F2:F{n},"Y")'])
res.append(["Errors (N)", f'=COUNTIF(Check!F2:F{n},"N")'])
res.append(["Unsure", f'=COUNTIF(Check!F2:F{n},"unsure")'])
res.append(["Error rate", "=IF(B1=0,\"\",B3/B1)"])
res.append(["Rule (protocol 10): error rate above 5% -> full re-check of the frame"])
res["B5"].number_format = "0.0%"; res.column_dimensions["A"].width = 60
out = HERE / "frame_check_20pct.xlsx"
wb.save(out)
print(len(rows), "institutions;", len(sample), "in the check;", {s: sum(1 for x in sample if x['sector'] == s) for s in by})
