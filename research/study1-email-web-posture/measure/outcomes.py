"""Turn raw measurement files into the protocol's variables (protocol section 6).

    python outcomes.py raw/1            ->  results_1.csv  (one row per domain)

Every definition here is the pre-registered one; change it only with an entry
in the protocol's deviations log.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# DMARC
# ---------------------------------------------------------------------------
def parse_dmarc(records: list[str]) -> dict:
    """RFC 7489: exactly one record starting v=DMARC1; tag=value pairs."""
    dmarc = [r for r in records if r.strip().lower().startswith("v=dmarc1")]
    out = {"dmarc_count": len(dmarc), "dmarc_valid": False, "p": None, "sp": None,
           "pct": None, "rua": [], "ruf": []}
    if len(dmarc) != 1:
        return out
    tags = {}
    for part in dmarc[0].split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            tags[k.strip().lower()] = v.strip()
    p = tags.get("p", "").lower()
    out["p"] = p or None
    out["sp"] = tags.get("sp", "").lower() or None
    try:
        out["pct"] = int(tags["pct"]) if "pct" in tags else None
    except ValueError:
        out["pct"] = -1
    out["rua"] = [x.strip() for x in tags.get("rua", "").split(",") if x.strip()]
    out["ruf"] = [x.strip() for x in tags.get("ruf", "").split(",") if x.strip()]
    out["dmarc_valid"] = p in ("none", "quarantine", "reject") and out["pct"] != -1 and \
        (out["pct"] is None or 0 <= out["pct"] <= 100)
    return out


def spoofable(d: dict, variant: str = "primary") -> bool:
    """Protocol 6.1. Protected = one valid record, p=quarantine|reject, pct absent or 100.

    variant='strict'  : only p=reject protects
    variant='lenient' : p=none with SPF '-all' also counts as protected (needs spf_all)
    """
    full = d["pct"] in (None, 100)
    if not d["dmarc_valid"]:
        return True
    if variant == "strict":
        return not (d["p"] == "reject" and full)
    if variant == "lenient" and d["p"] == "none" and d.get("spf_all") == "-all":
        return False
    return not (d["p"] in ("quarantine", "reject") and full)


# ---------------------------------------------------------------------------
# SPF
# ---------------------------------------------------------------------------
def parse_spf(txt: list[str], tree: dict | None) -> dict:
    spf = [r for r in txt if r.strip().lower().startswith("v=spf1")]
    out = {"spf_count": len(spf), "spf_all": None, "spf_lookups": None, "spf_valid": False}
    if len(spf) != 1:
        return out
    terms = spf[0].lower().split()[1:]
    for t in terms:
        if t.lstrip("+-~?") == "all":
            out["spf_all"] = (t[0] if t[0] in "+-~?" else "+") + "all"
    if out["spf_all"] is None and any(t.startswith("redirect=") for t in terms):
        out["spf_all"] = "redirect"
    out["spf_lookups"] = tree["lookups"] if tree else None
    out["spf_valid"] = out["spf_lookups"] is None or out["spf_lookups"] <= 10
    return out


# ---------------------------------------------------------------------------
# Mail provider (from MX hosts)
# ---------------------------------------------------------------------------
PROVIDERS = [
    ("google", ("google.com.", "googlemail.com.", "smtp.google.com.")),
    ("microsoft", ("outlook.com.", "protection.outlook.com.")),
    ("zoho", ("zoho.com.", "zoho.in.", "zohomail.com.")),
    ("secure_gateway_foreign", ("pphosted.com.", "mimecast.com.", "iphmx.com.", "barracudanetworks.com.",
                                "messagelabs.com.", "trendmicro.com.", "sophos.com.", "fortimail.com.")),
]


def mail_provider(mx: list[str], domain: str) -> str:
    hosts = [m.split()[-1].lower() for m in mx]
    if not hosts:
        return "none"
    if hosts == ["."]:
        return "null_mx"
    for label, suffixes in PROVIDERS:
        if any(h.endswith(suffixes) for h in hosts):
            return label
    if all(h.rstrip(".").endswith(domain) for h in hosts):
        return "self_hosted"
    if any(h.rstrip(".").endswith(".gov.bd") for h in hosts):
        return "bd_government_mail"
    if any(h.rstrip(".").endswith(".bd") for h in hosts):
        return "bd_provider"
    return "other_foreign_or_unknown"


# ---------------------------------------------------------------------------
# DMARC report destinations (RQ5)
# ---------------------------------------------------------------------------
KNOWN_REPORT_PROCESSORS = {  # receiver domain suffix -> country of the company
    "dmarcian.com": "US", "valimail.com": "US", "agari.com": "US", "cisco.com": "US",
    "postmarkapp.com": "US", "google.com": "US", "microsoft.com": "US", "proofpoint.com": "US",
    "mimecast.com": "UK", "redsift.cloud": "UK", "ondmarc.com": "UK", "uriports.com": "NL",
    "easydmarc.us": "US", "easydmarc.com": "US", "dmarcanalyzer.com": "NL",
    "dmarc-reports.cloudflare.net": "US", "cloudflare.net": "US",
}


def report_country(uri: str, own_domain: str) -> str:
    m = re.match(r"mailto:[^@]+@([^!\s]+)", uri.strip(), re.I)
    if not m:
        return "unparseable"
    dom = m.group(1).lower().rstrip(".")
    if dom == own_domain or dom.endswith("." + own_domain):
        return "own_domain"
    for suffix, cc in KNOWN_REPORT_PROCESSORS.items():
        if dom == suffix or dom.endswith("." + suffix):
            return cc
    if dom.endswith(".bd"):
        return "BD"
    tld = dom.rsplit(".", 1)[-1]
    return tld.upper() if len(tld) == 2 else "unknown_generic_tld"


# ---------------------------------------------------------------------------
# Web
# ---------------------------------------------------------------------------
def web_vars(w: dict) -> dict:
    https = w.get("https") or {}
    noverify = w.get("https_noverify") or {}
    page = https if "status" in https else noverify
    hdr = {k.lower(): v for k, v in (page.get("headers") or {}).items()}
    http = w.get("http") or {}
    csp = hdr.get("content-security-policy", "")
    return {
        "https_ok": "status" in https,
        "https_reachable_any": "status" in https or "status" in noverify,
        "cert_valid": (w.get("cert") or {}).get("valid"),
        "cert_error": (w.get("cert") or {}).get("error", ""),
        "http_redirects_to_https": str(http.get("final_url", "")).startswith("https://"),
        "accepts_legacy_tls": any(str(w.get(k, "")).startswith("accepted") for k in ("tls1_0", "tls1_1")),
        "legacy_tls_testable": not all(w.get(k) == "client_cannot_test" for k in ("tls1_0", "tls1_1")),
        "hsts": "strict-transport-security" in hdr,
        "csp_or_frame": bool(csp) or "x-frame-options" in hdr or "frame-ancestors" in csp,
        "xcto": hdr.get("x-content-type-options", "").lower() == "nosniff",
    }


# ---------------------------------------------------------------------------
# Scores (protocol 6.2)
# ---------------------------------------------------------------------------
def email_score(v: dict) -> int:
    s = 0
    s += v["spf_count"] == 1 and v["spf_valid"]
    s += v["spf_all"] in ("-all", "~all")
    s += v["spf_lookups"] is not None and v["spf_lookups"] <= 10
    s += v["dmarc_valid"]
    s += {"quarantine": 1, "reject": 2}.get(v["p"] or "", 0) if v["dmarc_valid"] else 0
    s += v["dmarc_valid"] and v["pct"] in (None, 100)
    s += bool(v["rua"])
    s += v["dkim_found"]
    s += bool(v["dnssec_valid"])
    return int(s)


def web_score(v: dict) -> int:
    return int(bool(v["https_ok"] and v["cert_valid"]) + v["http_redirects_to_https"]
               + (not v["accepts_legacy_tls"]) + v["hsts"] + v["csp_or_frame"] + v["xcto"])


# ---------------------------------------------------------------------------
def email_vars(dns_rec: dict, domain: str) -> dict:
    """All email/DNS variables for one measured domain."""
    cf = dns_rec["by_resolver"]["cloudflare"]
    gg = dns_rec["by_resolver"]["google"]
    v: dict = {"resolvers_agree_dmarc": sorted(cf["DMARC"]["answers"]) == sorted(gg["DMARC"]["answers"])}
    v.update(parse_dmarc(cf["DMARC"]["answers"]))
    v.update(parse_spf(cf["TXT_apex"]["answers"], cf.get("SPF_tree")))
    v["spoofable"] = spoofable(v)
    v["spoofable_strict"] = spoofable(v, "strict")
    v["spoofable_lenient"] = spoofable(v, "lenient")
    v["dkim_found"] = bool(dns_rec.get("DKIM_found"))
    v["has_mx"] = bool(cf["MX"]["answers"])
    v["mail_provider"] = mail_provider(cf["MX"]["answers"], domain)
    v["dnssec_signed"] = bool(cf["DS"]["answers"])
    v["dnssec_valid"] = bool(cf["AD"].get("ad")) and v["dnssec_signed"]
    v["has_caa"] = bool(cf["CAA"]["answers"])
    v["has_mta_sts"] = any("v=stsv1" in x.lower() for x in cf["MTA_STS"]["answers"])
    v["has_tls_rpt"] = any("v=tlsrptv1" in x.lower() for x in cf["TLS_RPT"]["answers"])
    dests = sorted({report_country(u, domain) for u in v["rua"] + v["ruf"]})
    v["report_destinations"] = ";".join(dests)
    v["reports_leave_bd"] = any(d not in ("BD", "own_domain", "unparseable") for d in dests)
    return v


def domain_row(rec: dict) -> dict:
    """One row per institution. Email outcomes use the mail domain when the
    institution publishes a separate one (protocol 4.3), preferring one with MX;
    the website domain's spoofability is kept as a secondary variable."""
    dom = rec["domain"]
    f = rec["frame_row"]
    v: dict = {"domain": dom}
    for k in ("institution", "sector", "subtype", "ownership", "analysis_group", "contact_uses_free_mail"):
        v[k] = f.get(k, "")
    web_email = email_vars(rec["dns"], dom)
    mail = rec.get("mail_dns") or {}
    candidates = [(m, email_vars(d, m)) for m, d in sorted(mail.items())]
    with_mx = [c for c in candidates if c[1]["has_mx"]]
    chosen_domain, chosen = (with_mx or candidates or [(dom, web_email)])[0]
    if not with_mx and web_email["has_mx"]:
        chosen_domain, chosen = dom, web_email
    v["email_domain"] = chosen_domain
    v.update(chosen)
    v["spoofable_web_domain"] = web_email["spoofable"]
    alts = [email_vars(d, m) for m, d in sorted((rec.get("alt_dns") or {}).items())]
    v["alt_domains_measured"] = len(alts)
    v["any_domain_spoofable"] = (web_email["spoofable"] or any(c[1]["spoofable"] for c in candidates)
                                 or any(a["spoofable"] for a in alts))
    v.update(web_vars(rec["web"]))
    v["email_score"] = email_score(v)
    v["web_score"] = web_score(v)
    v["rua"] = ";".join(v["rua"])
    v["ruf"] = ";".join(v["ruf"])
    return v


def main(raw_dir: str) -> None:
    files = sorted(Path(raw_dir).glob("*.json"))
    rows = [domain_row(json.loads(p.read_text(encoding="utf-8"))) for p in files]
    out = Path(__file__).parent / f"results_{Path(raw_dir).name}.csv"
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    n = len(rows)
    sp = sum(r["spoofable"] for r in rows)
    print(f"{n} domains -> {out}\nspoofable: {sp}/{n} ({sp / max(n, 1):.0%})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "raw/pilot")
