"""Check a draft domain list before it is frozen as the Study 1 frame.

    python check_frame.py seed_FIN.csv          ->  checked_FIN.csv

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
CONTACT_RE = re.compile(r'href=["\']([^"\']*contact[^"\']*)["\']', re.I)
SKIP_MAIL = ("example.com", "sentry.io", "wixpress.com", "domain.com", "email.com")


def resolves(domain: str) -> str:
    try:
        return ",".join(sorted({a[4][0] for a in socket.getaddrinfo(domain, 443)})[:3])
    except OSError:
        return ""


def fetch(client: httpx.Client, url: str):
    try:
        return client.get(url)
    except httpx.HTTPError as exc:
        return exc


def emails(text: str) -> set[str]:
    found = set()
    for m in EMAIL_RE.finditer(html.unescape(text)):
        dom = m.group(1).lower().rstrip(".")
        if not dom.endswith(SKIP_MAIL) and not re.search(r"\.(png|jpg|jpeg|gif|svg|webp)$", dom):
            found.add(dom)
    return found


def main(seed: str) -> None:
    rows = list(csv.DictReader(open(seed, encoding="utf-8-sig")))
    out_path = Path(seed).with_name(Path(seed).name.replace("seed_", "checked_"))
    fields = list(rows[0].keys()) + [
        "resolves_ip", "final_url", "http_status", "page_title",
        "redirects_off_domain", "mail_domains_seen", "check_error",
    ]
    with httpx.Client(timeout=25, follow_redirects=True, headers={"User-Agent": UA},
                      verify=True) as client, open(out_path, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for i, row in enumerate(rows, 1):
            dom = row["candidate_domain"].strip().lower()
            rec = dict(row, resolves_ip=resolves(dom) or resolves("www." + dom))
            resp = None
            for url in (f"https://{dom}/", f"https://www.{dom}/", f"http://{dom}/"):
                resp = fetch(client, url)
                if isinstance(resp, httpx.Response):
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
                )
            else:
                rec["check_error"] = type(resp).__name__ if resp is not None else "no attempt"
            writer.writerow(rec)
            fh.flush()
            print(f"{i:3}/{len(rows)} {dom:28} {rec.get('http_status','-')!s:4} "
                  f"{(rec.get('page_title') or rec.get('check_error',''))[:60]}")
            time.sleep(1.5)
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "seed_FIN.csv")
