"""Unit tests for the pre-registered definitions (protocol section 10).

    python -m pytest -q test_outcomes.py
"""
from outcomes import mail_provider, parse_dmarc, parse_spf, report_country, spoofable
from measure import spf_term_name


def d(rec, spf_all=None):
    v = parse_dmarc([rec] if isinstance(rec, str) else rec)
    v["spf_all"] = spf_all
    return v


def test_reject_full_is_protected():
    assert not spoofable(d("v=DMARC1; p=reject; rua=mailto:a@x.com"))


def test_quarantine_protected_primary_but_not_strict():
    v = d("v=DMARC1; p=quarantine")
    assert not spoofable(v) and spoofable(v, "strict")


def test_none_is_spoofable_unless_lenient_with_hard_fail_spf():
    assert spoofable(d("v=DMARC1; p=none"))
    assert spoofable(d("v=DMARC1; p=none", "~all"), "lenient")
    assert not spoofable(d("v=DMARC1; p=none", "-all"), "lenient")


def test_partial_pct_is_spoofable():
    assert spoofable(d("v=DMARC1; p=reject; pct=50"))
    assert not spoofable(d("v=DMARC1; p=reject; pct=100"))


def test_missing_duplicate_and_invalid_records():
    assert spoofable(d([]))
    assert spoofable(d(["v=DMARC1; p=reject", "v=DMARC1; p=none"]))
    assert spoofable(d("v=DMARC1; p=block"))
    assert spoofable(d("v=DMARC1; p=reject; pct=abc"))
    assert d("v=DMARC1; p=reject; rua=mailto:a@x.com,mailto:b@y.com")["rua"] == [
        "mailto:a@x.com", "mailto:b@y.com"]


def test_spf_parsing():
    assert parse_spf(["v=spf1 include:_spf.google.com -all"], {"lookups": 4})["spf_all"] == "-all"
    assert parse_spf(["v=spf1 a mx ~all"], {"lookups": 2})["spf_all"] == "~all"
    assert parse_spf(["v=spf1 +all"], {"lookups": 0})["spf_all"] == "+all"
    assert parse_spf(["v=spf1 a all"], {"lookups": 1})["spf_all"] == "+all"
    assert parse_spf(["v=spf1 redirect=_spf.x.com"], {"lookups": 3})["spf_all"] == "redirect"
    two = parse_spf(["v=spf1 -all", "v=spf1 ~all"], None)
    assert two["spf_count"] == 2 and two["spf_all"] is None
    assert not parse_spf(["v=spf1 include:a include:b -all"], {"lookups": 11})["spf_valid"]


def test_spf_lookup_terms():
    names = [spf_term_name(t) for t in
             "a a:x.com a/24 mx mx:y.com ptr exists:%{i}.z include:q.com redirect=r.com ip4:1.2.3.4 -all exp=e".split()]
    counted = [n for n in names if n in {"a", "mx", "ptr", "exists", "include", "redirect"}]
    assert len(counted) == 9


def test_mail_provider():
    assert mail_provider(["10 aspmx.l.google.com."], "x.com.bd") == "google"
    assert mail_provider(["0 x-com-bd.mail.protection.outlook.com."], "x.com.bd") == "microsoft"
    assert mail_provider(["10 mail.x.com.bd."], "x.com.bd") == "self_hosted"
    assert mail_provider(["10 mx.bcc.gov.bd."], "moa.gov.bd") == "bd_government_mail"
    assert mail_provider(["0 ."], "x.com") == "null_mx"
    assert mail_provider([], "x.com") == "none"


def test_report_country():
    assert report_country("mailto:dmarc@ruf.dmp.cisco.com", "x.gov.bd") == "US"
    assert report_country("mailto:dmarc@x.gov.bd", "x.gov.bd") == "own_domain"
    assert report_country("mailto:r@cirt.gov.bd", "x.gov.bd") == "BD"
    assert report_country("mailto:r@example.co.uk", "x.com") == "UK"


def _dns(mx, dmarc):
    blk = lambda a: {"status": "ok" if a else "noanswer", "answers": a}
    res = {"A": blk(["1.2.3.4"]), "MX": blk(mx), "TXT_apex": blk(["v=spf1 -all"]), "DMARC": blk(dmarc),
           "DS": blk([]), "CAA": blk([]), "MTA_STS": blk([]), "TLS_RPT": blk([]), "AD": {"ad": False},
           "SPF_tree": {"lookups": 0}}
    return {"by_resolver": {"cloudflare": res, "google": res}, "DKIM_found": {}}


def test_separate_mail_domain_is_primary_for_email():
    from outcomes import domain_row
    web = {"https": {"status": 200, "headers": {}}, "http": {}, "cert": {"valid": True}}
    rec = {"domain": "bank.com", "frame_row": {}, "dns": _dns([], []), "web": web,
           "mail_dns": {"bank.com.bd": _dns(["10 mx.bank.com.bd."], ["v=DMARC1; p=reject"])}}
    r = domain_row(rec)
    assert r["email_domain"] == "bank.com.bd" and not r["spoofable"]
    assert r["spoofable_web_domain"] and r["any_domain_spoofable"]
    assert domain_row(dict(rec, mail_dns={}))["email_domain"] == "bank.com"
