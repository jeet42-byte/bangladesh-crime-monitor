"""Download the open-access full texts listed in fulltext_tierA.csv.

Run on your own computer from research/scoping-review/:

    python scripts/download_pdfs.py

Saves to research/scoping-review/pdfs/R0010.pdf etc. (git-ignored), skips files
already downloaded, and writes download_log.csv listing what failed so those
can be fetched by hand. Standard library only.
"""
import csv
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
SRC = HERE / "fulltext_tierA.csv"
OUT_DIR = HERE / "pdfs"
LOG = HERE / "download_log.csv"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8",
}


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read(), resp.headers.get("Content-Type", "")


def main():
    OUT_DIR.mkdir(exist_ok=True)
    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
    log = []
    for n, r in enumerate(rows, 1):
        rid = r["record_id"]
        target = OUT_DIR / f"{rid}.pdf"
        if target.exists() and target.stat().st_size > 10_000:
            log.append({"record_id": rid, "result": "already have", "url": ""})
            continue
        urls = [u for u in (r["pdf_url"], r["oa_url"]) if u]
        result, used = "no free link", ""
        for url in urls:
            try:
                data, ctype = fetch(url)
            except Exception as e:  # noqa: BLE001
                result, used = f"error: {str(e)[:60]}", url
                continue
            if data[:4] == b"%PDF":
                target.write_bytes(data)
                result, used = "pdf saved", url
                break
            result, used = f"not a pdf ({ctype.split(';')[0]}) - open by hand", url
        log.append({"record_id": rid, "result": result, "url": used or r["landing_url"]})
        print(f"[{n}/{len(rows)}] {rid}: {result}")
        time.sleep(1)
    with open(LOG, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["record_id", "result", "url"])
        w.writeheader()
        w.writerows(log)
    saved = sum(1 for x in log if x["result"] in ("pdf saved", "already have"))
    print(f"\n{saved} of {len(rows)} PDFs in {OUT_DIR}")
    print(f"Open {LOG.name} for the ones to fetch by hand.")


if __name__ == "__main__":
    main()
