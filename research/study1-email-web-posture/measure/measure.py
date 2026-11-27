"""Study 1 measurement: collect raw, passive observations for each domain.

    python measure.py ../frame/frame_FIN_v1.csv ../frame/frame_GOV_v1.csv --round 1
    python measure.py ../frame/frame_FIN_v1.csv --round pilot --limit 10

Writes one JSON file per domain to  raw/<round>/<domain>.json  (every DNS
answer and web observation, with UTC timestamps). Nothing is interpreted
here; outcomes.py turns the raw files into the protocol's variables.

Passive only (protocol section 5):
  * DNS lookups through two public resolvers (1.1.1.1 and 8.8.8.8)
  * one GET to https://<host>/ (and www.), one GET to http://<host>/
  * one TLS handshake each restricted to TLS 1.0 and TLS 1.1
No paths are guessed, no forms submitted, no ports scanned, and no mail
server is contacted. Resumable: a domain already measured in this round is
skipped.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import socket
import ssl
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import dns.flags
import dns.message
import dns.query
import dns.rdatatype
import dns.resolver
import httpx

# TLS 1.0/1.1 are deprecated in Python; testing whether servers still accept
# them is the point of the check, so the warning is silenced.
warnings.filterwarnings("ignore", category=DeprecationWarning, module=__name__)

RESOLVERS = {"cloudflare": "1.1.1.1", "google": "8.8.8.8"}
DKIM_SELECTORS = (
    "default google selector1 selector2 k1 k2 s1 s2 dkim mail smtp mx email "
    "everlytickey1 everlytickey2 mandrill mxvault zoho zmail protonmail protonmail2 "
    "protonmail3 sendgrid smtpapi sig1 cm mailjet ses amazonses 2024"
).split()
UA = "Mozilla/5.0 (academic measurement; passive; see https://osf.io [registration])"
WEB_TIMEOUT = 20
PAUSE_BETWEEN_DOMAINS = 1.0


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def resolver_for(ip: str) -> dns.resolver.Resolver:
    r = dns.resolver.Resolver(configure=False)
    r.nameservers = [ip]
    r.timeout = 5
    r.lifetime = 8
    return r


def query(res: dns.resolver.Resolver, name: str, rtype: str) -> dict:
    """One lookup; returns answers as text, or the error kind."""
    try:
        ans = res.resolve(name, rtype, raise_on_no_answer=False)
        rows = []
        for rr in ans:
            if rtype == "TXT":
                rows.append(b"".join(rr.strings).decode("utf-8", "replace"))
            else:
                rows.append(rr.to_text())
        return {"status": "ok" if rows else "noanswer", "answers": rows}
    except dns.resolver.NXDOMAIN:
        return {"status": "nxdomain", "answers": []}
    except dns.resolver.NoNameservers:
        return {"status": "servfail", "answers": []}
    except (dns.resolver.LifetimeTimeout, dns.exception.Timeout):
        return {"status": "timeout", "answers": []}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error:" + type(exc).__name__, "answers": []}


def ad_flag(ip: str, name: str) -> dict:
    """Does a validating resolver set AD (authenticated data) for this name?"""
    try:
        q = dns.message.make_query(name, dns.rdatatype.A, want_dnssec=True)
        q.flags |= dns.flags.AD
        resp = dns.query.udp(q, ip, timeout=5)
        return {"status": "ok", "ad": bool(resp.flags & dns.flags.AD), "rcode": resp.rcode()}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error:" + type(exc).__name__, "ad": None}


LOOKUP_TERMS = {"a", "mx", "ptr", "exists", "include", "redirect"}


def spf_term_name(term: str) -> str:
    return re.split(r"[:/=]", term.lstrip("+-~?").lower(), maxsplit=1)[0]


def spf_includes(res: dns.resolver.Resolver, record: str, depth: int = 0, seen=None) -> dict:
    """Follow include:/redirect= and count DNS-querying terms (RFC 7208 4.6.4: max 10)."""
    seen = seen if seen is not None else set()
    count, children = 0, {}
    for term in record.split()[1:]:
        name = spf_term_name(term)
        if name not in LOOKUP_TERMS:
            continue
        count += 1
        if name in ("include", "redirect"):
            target = re.split(r"[:=]", term, maxsplit=1)[1].lower()
            if depth < 10 and target not in seen:
                seen.add(target)
                sub = query(res, target, "TXT")
                spf = [x for x in sub["answers"] if x.lower().startswith("v=spf1")]
                if spf:
                    child = spf_includes(res, spf[0], depth + 1, seen)
                    count += child["lookups"]
                    children[target] = {"record": spf[0], **child}
                else:
                    children[target] = {"record": None, "lookups": 0, "status": sub["status"]}
    return {"lookups": count, "children": children}


def dns_block(domain: str) -> dict:
    out: dict = {"measured_at": now(), "by_resolver": {}}
    for name, ip in RESOLVERS.items():
        r = resolver_for(ip)
        block = {
            "A": query(r, domain, "A"),
            "MX": query(r, domain, "MX"),
            "TXT_apex": query(r, domain, "TXT"),
            "DMARC": query(r, f"_dmarc.{domain}", "TXT"),
            "DS": query(r, domain, "DS"),
            "CAA": query(r, domain, "CAA"),
            "MTA_STS": query(r, f"_mta-sts.{domain}", "TXT"),
            "TLS_RPT": query(r, f"_smtp._tls.{domain}", "TXT"),
            "AD": ad_flag(ip, domain),
        }
        spf = [x for x in block["TXT_apex"]["answers"] if x.lower().startswith("v=spf1")]
        block["SPF_tree"] = spf_includes(r, spf[0]) if len(spf) == 1 else None
        out["by_resolver"][name] = block
    # DKIM once (cloudflare), fixed selector list -> lower bound
    r = resolver_for(RESOLVERS["cloudflare"])
    found = {}
    for sel in DKIM_SELECTORS:
        res = query(r, f"{sel}._domainkey.{domain}", "TXT")
        if res["answers"]:
            found[sel] = res["answers"][:1]
    out["DKIM_found"] = found
    # Where do DMARC reports go? Resolve each report domain's MX for location work later.
    return out


def legacy_tls(host: str, version: ssl.TLSVersion) -> str:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.minimum_version = version
        ctx.maximum_version = version
        ctx.set_ciphers("DEFAULT:@SECLEVEL=0")
    except (ValueError, ssl.SSLError):
        return "client_cannot_test"
    try:
        with socket.create_connection((host, 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as tls:
                return "accepted:" + str(tls.version())
    except ssl.SSLError:
        return "refused"
    except OSError as exc:
        return "no_connection:" + type(exc).__name__


def cert_info(host: str) -> dict:
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((host, 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as tls:
                c = tls.getpeercert()
                return {"valid": True, "tls_version": tls.version(),
                        "issuer": dict(x[0] for x in c.get("issuer", ())),
                        "not_after": c.get("notAfter")}
    except ssl.SSLCertVerificationError as exc:
        return {"valid": False, "error": f"{exc.verify_message} (code {exc.verify_code})"}
    except Exception as exc:  # noqa: BLE001
        return {"valid": None, "error": type(exc).__name__ + ": " + str(exc)[:80]}


def web_block(host: str) -> dict:
    out: dict = {"measured_at": now(), "host": host}
    hdr_keys = ("strict-transport-security", "content-security-policy", "x-frame-options",
                "x-content-type-options", "referrer-policy", "server")
    for label, verify in (("https", True), ("https_noverify", False)):
        with httpx.Client(timeout=WEB_TIMEOUT, follow_redirects=True, verify=verify,
                          headers={"User-Agent": UA}) as c:
            for h in (host, "www." + host):
                try:
                    r = c.get(f"https://{h}/")
                    out[label] = {"requested": h, "final_url": str(r.url), "status": r.status_code,
                                  "redirects": len(r.history),
                                  "headers": {k: r.headers.get(k) for k in hdr_keys if r.headers.get(k)}}
                    break
                except Exception as exc:  # noqa: BLE001
                    out[label] = {"requested": h, "error": type(exc).__name__ + ": " + str(exc)[:100]}
        if label == "https" and "status" in out.get("https", {}):
            break  # verified fetch worked; no need for the unverified one
    with httpx.Client(timeout=WEB_TIMEOUT, follow_redirects=True, verify=False,
                      headers={"User-Agent": UA}) as c:
        try:
            r = c.get(f"http://{host}/")
            out["http"] = {"final_url": str(r.url), "status": r.status_code}
        except Exception as exc:  # noqa: BLE001
            out["http"] = {"error": type(exc).__name__ + ": " + str(exc)[:100]}
    tls_host = host
    final = (out.get("https") or out.get("https_noverify") or {}).get("final_url", "")
    if final.startswith("https://"):
        tls_host = final.split("/")[2].split(":")[0]
    out["tls_host"] = tls_host
    out["cert"] = cert_info(tls_host)
    out["tls1_0"] = legacy_tls(tls_host, ssl.TLSVersion.TLSv1)
    out["tls1_1"] = legacy_tls(tls_host, ssl.TLSVersion.TLSv1_1)
    return out


def load_frames(paths: list[str]) -> list[dict]:
    rows, seen = [], set()
    for p in paths:
        for r in csv.DictReader(open(p, encoding="utf-8-sig")):
            if r.get("analysis_group", "").startswith("duplicate"):
                continue
            d = r["candidate_domain"].strip().lower()
            if d in seen:
                continue
            seen.add(d)
            rows.append(r)
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("frames", nargs="+")
    ap.add_argument("--round", required=True, help="pilot, 1, 2 or benchmark")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    rows = load_frames(a.frames)
    if a.limit:
        rows = rows[: a.limit]
    outdir = Path(__file__).parent / "raw" / str(a.round)
    outdir.mkdir(parents=True, exist_ok=True)
    print(f"{len(rows)} domains -> {outdir}")
    for i, r in enumerate(rows, 1):
        dom = r["candidate_domain"].strip().lower()
        path = outdir / f"{dom}.json"
        if path.exists():
            continue
        t0 = time.time()
        mail_domains = [m for m in (r.get("mail_domains") or "").split(";") if m and m != dom]
        rec = {"domain": dom, "frame_row": r, "round": a.round,
               "dns": dns_block(dom),
               "mail_dns": {m: dns_block(m) for m in mail_domains},
               "web": web_block(r.get("web_host") or dom),
               "python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION}
        path.write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")
        d = rec["dns"]["by_resolver"]["cloudflare"]
        w = rec["web"]
        web = (str(w["https"]["status"]) if "status" in w.get("https", {}) else
               f"{w['https_noverify']['status']}(bad cert)" if "status" in w.get("https_noverify", {}) else
               "http-only" if "status" in w.get("http", {}) else "unreachable")
        print(f"{i:4}/{len(rows)} {dom:28} DMARC={'y' if d['DMARC']['answers'] else 'n'} "
              f"MX={len(d['MX']['answers'])} web={web} ({time.time() - t0:.0f}s)")
        time.sleep(PAUSE_BETWEEN_DOMAINS)


if __name__ == "__main__":
    main()
