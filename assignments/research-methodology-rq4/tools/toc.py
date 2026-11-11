"""Fill the static table of contents with page numbers.

Renders each report to PDF with LibreOffice, finds the page on which every
heading appears, writes data/toc_<key>.json, then build_docx.js is re-run.
"""
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS = {"nabin": "RQ4_Report_Minhaz_Ahamed_Khan_Nabin", "apon": "RQ4_Report_Md_Jubaer_Islam_Apon",
           "tanvir": "RQ4_Report_Tanvir_Ahmed_Siddique"}
norm = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())

with tempfile.TemporaryDirectory() as tmp:
    for key, name in REPORTS.items():
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp,
                        os.path.join(ROOT, "output", name + ".docx")], check=True, capture_output=True)
        pdf = os.path.join(tmp, name + ".pdf")
        text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
        pages = [norm(p) for p in text.split("\f")]
        items = json.load(open(os.path.join(ROOT, "data", f"tocitems_{key}.json"), encoding="utf-8"))
        found, start = {}, 2  # skip cover (1) and contents page (2)
        for it in items:
            needle = norm(it)[:40]
            for i in range(start, len(pages)):
                if needle in pages[i]:
                    found[it] = i + 1
                    start = i
                    break
            else:
                print(f"  ! {key}: heading not found: {it}", file=sys.stderr)
        json.dump(found, open(os.path.join(ROOT, "data", f"toc_{key}.json"), "w", encoding="utf-8"), indent=1)
        print(f"{key}: {len(found)}/{len(items)} headings paged")
