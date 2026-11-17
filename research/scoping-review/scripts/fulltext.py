"""Find open-access full-text links for Tier A (Bangladesh) records that go on
to full-text review (include + maybe).

Uses OpenAlex's open_access, best_oa_location and locations fields.
Writes fulltext_tierA.csv. Run from research/scoping-review/.
"""
import csv
import json
import sys
import time
import urllib.parse
import urllib.request

SRC = "screening_suggestions.csv"
OUT = "fulltext_tierA.csv"
FIELDS = "id,doi,open_access,best_oa_location,primary_location,locations"


def get(url):
    for i in range(5):
        try:
            return json.load(urllib.request.urlopen(url, timeout=60))
        except Exception as e:  # noqa: BLE001
            print("retry", e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    return {}


def main():
    rows = [r for r in csv.DictReader(open(SRC, encoding="utf-8-sig"))
            if r["tier"].startswith("A") and r["suggestion"] in ("include", "maybe")]
    ids = [r["openalex_id"].rsplit("/", 1)[-1] for r in rows]
    found = {}
    for i in range(0, len(ids), 50):
        chunk = "|".join(ids[i:i + 50])
        url = "https://api.openalex.org/works?" + urllib.parse.urlencode(
            {"filter": f"openalex:{chunk}", "per-page": 50, "select": FIELDS})
        for w in get(url).get("results", []):
            found[w["id"].rsplit("/", 1)[-1]] = w
        time.sleep(0.3)

    out = []
    for r, wid in zip(rows, ids):
        w = found.get(wid, {})
        oa = w.get("open_access") or {}
        best = w.get("best_oa_location") or {}
        pdf = best.get("pdf_url") or ""
        page = best.get("landing_page_url") or oa.get("oa_url") or ""
        if not pdf:
            for loc in w.get("locations") or []:
                if loc.get("pdf_url"):
                    pdf = loc["pdf_url"]
                    break
        landing = ((w.get("primary_location") or {}).get("landing_page_url")) or (
            f"https://doi.org/{r['doi']}" if r["doi"] else "")
        status = "pdf" if pdf else ("oa_page" if oa.get("is_oa") and page else "find_manually")
        out.append({
            "record_id": r["record_id"], "suggestion": r["suggestion"], "year": r["year"],
            "title": r["title"], "doi": r["doi"], "type": r["type"],
            "status": status, "pdf_url": pdf, "oa_url": page, "landing_url": landing,
            "got_it": "", "notes": "",
        })
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]))
        wr.writeheader()
        wr.writerows(out)
    from collections import Counter
    print(len(out), Counter(o["status"] for o in out))


if __name__ == "__main__":
    main()
