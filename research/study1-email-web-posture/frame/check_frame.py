"""Check a draft domain list before it is frozen as the Study 1 frame.

    python check_frame.py seed_FIN.csv            ->  checked_FIN.csv
    python check_frame.py seed_GOV.csv --recheck  ->  re-check only the rows that failed

For every row: does the domain resolve, where does its homepage end up
(redirects), what is the page title (so a human can confirm it is the right
institution), and which email domains are published on the homepage and on
one "contact" page (so the mail domain can be measured if it differs).

This is frame-building, not measurement: one ordinary visit to the homepage
and at most one to a contact page, with a pause between institutions. No
other paths are requested.

Needs only httpx (already in the Paper 2 environment). Run from this folder:
    ..\\..\\..\\backend\\.venv\\Scripts\\python.exe check_frame.py seed_FIN.csv
"""
from __future__ import annotations

import csv
import html
import re
import socket
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx

UA = "Mozilla/5.0 (research frame check; passive; one visit per site)"
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)")
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
CONTACT_RE = re.compile(r'href=["\'](?!mailto:)([^"\'@\s]*contact[^"\'@\s]*)["\']', re.I)
SKIP_MAIL = ("example.com", "sentry.io", "wixpress.com", "domain.com", "email.com")


def resolves(domain: str) -> str:
    try:
        return ",".join(sorted({a[4][0] for a in socket.getaddrinfo(domain, 443)})[:3])
    except OSError:
        return ""


def fetch(client: httpx.Client, url: str):
    # Any failure (network, TLS, a malformed link on the page) is recorded
    # for that institution and the run moves on.
    if urlparse(url).scheme not in ("http", "https"):
        return ValueError("not a web link")
    try:
        return client.get(url)
    except Exception as exc:  # noqa: BLE001
        return exc


def emails(text: str) -> set[str]:
    found = set()
    for m in EMAIL_RE.finditer(html.unescape(text)):
        dom = m.group(1).lower().rstrip(".")
        if not dom.endswith(SKIP_MAIL) and not re.search(r"\.(png|jpg|jpeg|gif|svg|webp)$", dom):
            found.add(dom)
    return found


def main(seed: str, recheck: bool = False) -> None:
    rows = list(csv.DictReader(open(seed, encoding="utf-8-sig")))
    out_path = Path(seed).with_name(Path(seed).name.replace("seed_", "checked_"))
    fields = list(rows[0].keys()) + [
        "resolves_ip", "final_url", "http_status", "page_title",
        "redirects_off_domain", "mail_domains_seen", "check_error", "cert_note",
    ]
    # Resume: keep rows already checked in an earlier, interrupted run.
    # With --recheck, rows that failed (no 200/403 page) are checked again and
    # replaced; good rows are kept as they are.
    kept: list[dict] = []
    if out_path.exists():
        previous = list(csv.DictReader(open(out_path, encoding="utf-8-sig")))
        if recheck:
            kept = [r for r in previous if str(r.get("http_status")) in ("200", "403")]
        else:
            kept = previous
    done = {r["candidate_domain"] for r in kept}
    with httpx.Client(timeout=25, follow_redirects=True, headers={"User-Agent": UA},
                      verify=True) as client, httpx.Client(
                      timeout=25, follow_redirects=True, headers={"User-Agent": UA},
                      verify=False) as insecure, open(out_path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for r in kept:
            writer.writerow({k: r.get(k, "") for k in fields})
        for i, row in enumerate(rows, 1):
            dom = row["candidate_domain"].strip().lower()
            if row["candidate_domain"] in done:
                continue
            rec = dict(row, resolves_ip=resolves(dom) or resolves("www." + dom))
            resp = None
            cert_note = ""
            for url in (f"https://{dom}/", f"https://www.{dom}/", f"http://{dom}/"):
                resp = fetch(client, url)
                if isinstance(resp, httpx.Response):
                    break
                if "CERTIFICATE_VERIFY_FAILED" in str(resp) and not cert_note:
                    # Identity check only: read the title without verifying the
                    # certificate (what a person does by clicking "Advanced").
                    # The failure itself is recorded as a finding.
                    cert_note = "certificate verify failed: " + str(resp).split("certificate verify failed:")[-1][:60].strip(" )'")
                    alt = fetch(insecure, url)
                    if isinstance(alt, httpx.Response):
                        resp = alt
                        break
            if isinstance(resp, httpx.Response):
                final = str(resp.url)
                host = urlparse(final).hostname or ""
                title = TITLE_RE.search(resp.text or "")
                mails = emails(resp.text or "")
                link = CONTACT_RE.search(resp.text or "")
                if link:
                    time.sleep(1)
                    c = fetch(client, urljoin(final, link.group(1)))
                    if isinstance(c, httpx.Response):
                        mails |= emails(c.text or "")
                rec.update(
                    final_url=final,
                    http_status=resp.status_code,
                    page_title=re.sub(r"\s+", " ", html.unescape(title.group(1))).strip()[:120] if title else "",
                    redirects_off_domain="yes" if host and not host.endswith(dom) else "",
                    mail_domains_seen=";".join(sorted(mails)),
                    cert_note=cert_note,
                )
            else:
                rec["check_error"] = (type(resp).__name__ + ": " + str(resp)[:80]) if resp is not None else "no attempt"
                rec["cert_note"] = cert_note
            writer.writerow(rec)
            fh.flush()
            print(f"{i:3}/{len(rows)} {dom:28} {rec.get('http_status','-')!s:4} "
                  f"{(rec.get('page_title') or rec.get('check_error',''))[:60]}")
            time.sleep(1.5)
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args[0] if args else "seed_FIN.csv", recheck="--recheck" in sys.argv)
