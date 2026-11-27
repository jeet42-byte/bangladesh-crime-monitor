"""Add each institution's mail domain(s) to the frame (protocol section 4.3).

    python add_mail_domains.py FIN      (reads frame_FIN_v1.csv + checked_FIN.csv -> frame_FIN_v2.csv)
    python add_mail_domains.py GOV

check_frame.py recorded the email domains each homepage (and one contact page)
publishes. Rule, fixed in the protocol:
  * an address on a DIFFERENT organisational domain (e.g. the website is
    abc.com.bd but contact@abcbank.com) means that domain is measured too and
    is the primary domain for email outcomes;
  * free webmail (gmail.com, yahoo.com, ...) is not an organisational domain;
    its use for official contact is recorded as a separate indicator;
  * domains of other institutions (a regulator, a partner) are ignored when
    they appear on the page as links, by requiring the domain to share a
    word stem with the institution's own website domain, or to be confirmed
    by hand in the printed list.
Only the changes are printed, for checking.
"""
from __future__ import annotations

import csv
import re
import sys

FREE_MAIL = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "ymail.com",
             "yahoo.co.in", "rocketmail.com", "aol.com", "icloud.com", "protonmail.com"}
THIRD_PARTY_HINTS = ("bb.org.bd", "bangladesh.gov.bd", "cirt.gov.bd", "btrc.gov.bd", "sentry",
                     "google.com", "facebook.com", "w3.org", "schema.org", "jquery", "wordpress")


PUBLIC_SUFFIXES = sorted([".com.bd", ".org.bd", ".gov.bd", ".ac.bd", ".edu.bd", ".net.bd", ".mil.bd",
                          ".co.in", ".com.pk", ".co.uk", ".com", ".org", ".net", ".info", ".edu", ".bd",
                          ".biz", ".co"], key=len, reverse=True)


def stem(domain: str) -> str:
    """Registrable label: 'mail.communitybankbd.info' -> 'communitybankbd'; 'mof.gov.bd' -> 'mof'."""
    d = domain.lower().rstrip(".")
    for suffix in PUBLIC_SUFFIXES:
        if d.endswith(suffix):
            d = d[: -len(suffix)]
            break
    return d.split(".")[-1]


def related(a: str, b: str) -> bool:
    sa, sb = stem(a), stem(b)
    shorter = min(len(sa), len(sb))
    if sa == sb:
        return True
    # Short labels (ministry acronyms like mof / mofa) must match exactly.
    return shorter >= 5 and (sa in sb or sb in sa or sa[:6] == sb[:6])


def looks_like_domain(d: str) -> bool:
    """Drops version numbers picked up from script URLs (jquery@1.11.3 -> '1.11.3')."""
    return bool(re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}", d))


def load_decisions() -> dict:
    try:
        rows = csv.DictReader(open("mail_domain_decisions.csv", encoding="utf-8-sig"))
    except FileNotFoundError:
        return {}
    return {(r["web_domain"], r["mail_domain"]): r["decision"] for r in rows}


def main(code: str) -> None:
    decisions = load_decisions()
    frame = list(csv.DictReader(open(f"frame_{code}_v1.csv", encoding="utf-8-sig")))
    checked = {r["candidate_domain"]: r for r in csv.DictReader(open(f"checked_{code}.csv", encoding="utf-8-sig"))}
    out = []
    print(f"{'institution':40} {'web domain':26} -> mail domain(s) / notes")
    for r in frame:
        web = r["candidate_domain"].strip().lower()
        seen = [d for d in (checked.get(web, {}).get("mail_domains_seen") or "").split(";")
                if d and looks_like_domain(d)]
        free = sorted(d for d in seen if d in FREE_MAIL)
        own = [d for d in seen if d not in FREE_MAIL and not d.endswith(THIRD_PARTY_HINTS)
               and d != web and not d.endswith("." + web) and related(d, web)]
        other = [d for d in seen if d not in FREE_MAIL and d != web and not d.endswith("." + web) and d not in own]
        # Manual decisions (mail_domain_decisions.csv) override the automatic rule.
        own += [d for d in other if decisions.get((web, d)) == "accept"]
        own = [d for d in own if decisions.get((web, d)) != "reject"]
        other = [d for d in other if (web, d) not in decisions]
        r["mail_domains"] = ";".join(sorted(set(own)))
        r["contact_uses_free_mail"] = "yes" if free else ""
        r["mail_domains_unmatched"] = ";".join(sorted(set(other)))
        if own or free or other:
            note = []
            if own:
                note.append("MAIL: " + ", ".join(sorted(set(own))))
            if free:
                note.append("free webmail: " + ", ".join(free))
            if other:
                note.append("other (ignored, check): " + ", ".join(sorted(set(other)))[:70])
            print(f"{r['institution'][:40]:40} {web:26} -> {' | '.join(note)}")
        out.append(r)
    with open(f"frame_{code}_v2.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    print(f"\nwrote frame_{code}_v2.csv  ({sum(1 for r in out if r['mail_domains'])} with a separate mail domain, "
          f"{sum(1 for r in out if r['contact_uses_free_mail'])} list free webmail)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "FIN")
