# Study 1 protocol (for OSF pre-registration)

**Title:** Can anyone send email as a Bangladeshi bank? A passive, multi-sector census of email-authentication and web-transport security in Bangladesh

**Version:** 1.0 draft, 26 Nov 2026. Register on OSF **before** any measurement is run. Any later change goes in the deviations log (§11) with its date and reason.

**Authors:** [Author], [Supervisor / co-author **CHECK**]

**Registration type:** OSF Preregistration (observational / measurement study)

---

## 1. Background and gap (summary)

The full gap analysis is in `gap_analysis.md`.
- **What exists:** Bangladeshi web-security studies actively scan small samples, about 20–40 sites. The only email-authentication data for Bangladesh is DMARC reporting on government domains, inside a global study (Cesar, Holz & Jonker, 2026).
- **What doesn't:**
  - No study measures SPF, DKIM or DMARC for banks, mobile financial services (MFS), universities, hospitals, telecoms or media, which are the brands most impersonated in phishing.
  - None models what predicts weak protection.
  - None compares Bangladesh with its neighbours.

## 2. Research questions and hypotheses

| | Question | Hypothesis (direction fixed in advance) |
|---|---|---|
| **RQ1** | What share of Bangladeshi institutional domains are **spoofable** (§6.1), overall and by sector? What share lack HTTPS, accept outdated TLS, lack HSTS or lack DNSSEC? | Descriptive. No hypothesis |
| **RQ2** | What predicts being spoofable? | **H1** Financial-sector domains (banks, MFS/PSPs) are *less* likely to be spoofable than universities and hospitals. **H2** Domains whose mail is run by a large managed provider (Google, Microsoft) are *less* likely to be spoofable than self-hosted or local-provider mail. **H3** Private institutions are less likely to be spoofable than public ones *within* the same sector. |
| **RQ3** | How does Bangladesh compare with India, Pakistan, Sri Lanka and Nepal on matched institution types? | **H4** Bangladesh's spoofable share for central bank plus top banks is *not lower* than the regional median. Two-sided test; the stated direction is our expectation, not a constraint |
| **RQ4** (exploratory) | Are institutions with spoofable domains named more often in news-reported phishing or fraud (Paper 2 data)? | Exploratory. Descriptive only, no inferential claim |
| **RQ5** (exploratory) | Where are DMARC reports sent: in Bangladesh, the US, elsewhere? | Exploratory. Extends Cesar et al. (2026) beyond government |

## 3. Design

- **Type:** cross-sectional census with one repeat measurement (§7.4). Strictly passive.
- **Unit of analysis:** one institution's primary official domain (§4.3).

## 4. Sampling frame (census; inclusion rules fixed now)

### 4.1 Sectors and source lists

| Code | Sector | Source list (official, dated snapshot saved) | Expected *n* |
|---|---|---|---|
| FIN-BANK | Bangladesh Bank and all scheduled banks | Bangladesh Bank, "Scheduled Banks" list | ~62 |
| FIN-MFS | MFS providers and payment service providers / operators | Bangladesh Bank PSD licence lists | ~25 |
| FIN-NBFI | Non-bank financial institutions | Bangladesh Bank NBFI list | ~35 |
| FIN-INS | Insurers | IDRA list of life and non-life insurers | ~80 |
| GOV-MIN | Ministries and divisions | National portal (bangladesh.gov.bd) directory | ~60 |
| GOV-AGY | Key national agencies: police, CID, BTRC, NBR, Election Commission, passport, NID, BCC, BGD e-GOV CIRT, DGHS, Directorate of Secondary and Higher Education, DSE/CSE, BSEC | Named list in Appendix A, fixed now | ~30 |
| EDU-PUB | Public universities | UGC list | ~55 |
| EDU-PRV | Private universities (with permission to operate) | UGC list | ~115 |
| HLT | Public medical college hospitals and large private hospitals | DGHS list (public); private hospitals with ≥ 250 beds **[CHECK source]** | ~80 |
| TEL | Mobile operators and nationwide ISPs | BTRC licence lists (MNOs; nationwide ISP category) | ~40 |
| MED | National daily newspapers and TV news | DFP media list (national dailies) plus TV channels with BTRC licences, if they have a website | ~80 |
| ECOM | Large e-commerce and ride or food platforms | e-CAB members, top 50 by Tranco rank **[CHECK]** | ~50 |

**Expected total: about 700–900 domains.** All source lists are downloaded and archived, with the download date, **before** measurement.

### 4.2 Regional benchmark (RQ3)

For **India, Pakistan, Sri Lanka and Nepal**, matched groups:
- the central bank
- the 10 largest commercial banks by total assets (latest central-bank or annual-report data)
- 5 matched ministries (finance, home/interior, foreign affairs, ICT, health)
- the 10 top-ranked universities (national ranking body or QS, whichever exists, stated per country)

That's about 26 domains per country, about 104 in total. Bangladesh's matched group is selected by the same rules.

### 4.3 Which domain counts

1. **Primary domain:** the domain of the institution's official website as listed by the regulator, or found from the regulator's link. For example, `bracbank.com`, `du.ac.bd`, `mof.gov.bd`.
2. **Mail domain:** if the official contact email on the website uses a different organisational domain, measure that domain too, and treat **the mail domain as primary for email outcomes**.
   - If there are several, prefer one with an MX record.
   - The website domain's spoofability is kept as a secondary variable (`spoofable_web_domain`), and so is `any_domain_spoofable`, because an attacker can impersonate either.
   - Free webmail addresses (gmail.com, yahoo.com, …) in official contact details are not organisational domains; their use is recorded as a separate indicator (`contact_uses_free_mail`).
   - Mail domains are taken from the homepage and one contact page (`frame/add_mail_domains.py`). Domains not clearly belonging to the institution are listed for a manual decision, not used automatically.
3. **Exclusions** (each logged with its reason):
   - the domain doesn't resolve on two measurement days
   - a parked or for-sale page
   - a duplicate (two listed entities sharing one domain are counted once, with both sector labels kept)
   - no official domain can be found
4. Subdomains (for example `mail.`, `portal.`) are **not** measured separately. The DMARC `sp=` tag covers subdomain policy.

## 5. Measurements (all passive)

### 5.1 DNS (two public resolvers: 1.1.1.1 and 8.8.8.8; disagreements flagged)

| Item | Record / method | Variables |
|---|---|---|
| Mail exchange | `MX` | has_mx; null MX (RFC 7505); **mail provider** from MX host (Google, Microsoft, Zoho, other foreign, Bangladeshi provider, self-hosted, government mail via BCC/NDC) |
| SPF | `TXT` at the apex starting `v=spf1` | has_spf; multiple SPF records (an error); final `all` qualifier (`-all`, `~all`, `?all`, `+all`, none); DNS-lookup count (> 10 is an error, RFC 7208); syntax valid |
| DMARC | `TXT` at `_dmarc.<domain>` | has_dmarc; syntax valid; `p` (none, quarantine, reject); `sp`; `pct`; `rua` and `ruf` destinations, with **the destination's country** (from the receiver domain's ccTLD or a known provider's headquarters, plus the MX IP's location) |
| DKIM | `TXT` at `<selector>._domainkey.<domain>` for a fixed list of 30 common selectors (Appendix B) | dkim_found (a **lower bound**, because selectors can't be listed passively) |
| DNSSEC | DS record at the parent; AD bit from a validating resolver | dnssec_signed; dnssec_valid |
| CAA | `CAA` | has_caa |
| MTA-STS / TLS-RPT | `_mta-sts` and `_smtp._tls` TXT | has_mta_sts; has_tls_rpt |

### 5.2 Web (one ordinary HTTPS visit per domain plus two TLS handshakes)

| Item | Method | Variables |
|---|---|---|
| HTTPS | GET `https://<domain>/` and `https://www.<domain>/`, following redirects (≤ 5) | https_ok; http_redirects_to_https (one GET to `http://`) |
| Certificate | From the handshake | cert_valid (chain, hostname, not expired); issuer; days_to_expiry |
| TLS | Negotiated version with a default client; plus one handshake each limited to TLS 1.0 and TLS 1.1 | max_tls; **accepts_legacy_tls** (1.0 or 1.1 accepted) |
| Headers | From the final response | HSTS (and max-age); CSP; X-Frame-Options / CSP frame-ancestors; X-Content-Type-Options; Referrer-Policy |

**Not done, ever:** vulnerability probes, path guessing, form submission, login attempts, port scans, more than the requests listed above, or any test of mail servers beyond DNS.

### 5.3 Organisational and infrastructure variables (predictors)

| Variable | Source |
|---|---|
| sector (12 codes, §4.1) | Frame |
| ownership: public, private, mixed or state-owned enterprise | Regulator list; for banks, Bangladesh Bank's categories (state-owned, private commercial, Islamic, foreign, specialised) |
| domain_type: `.gov.bd`, `.ac.bd` / `.edu.bd`, `.com.bd` / `.org.bd` / other `.bd`, generic (`.com`, `.org`, …) | Parsed from the domain |
| mail_provider (grouped): large managed (Google/Microsoft), other foreign, Bangladeshi provider or government mail, self-hosted, none | MX |
| web_hosting: Bangladeshi network (ASN registered in BD) vs foreign or cloud vs CDN | Website IP → ASN (Team Cymru IP-to-ASN DNS service) |
| size proxy (banks only): total assets band | Bangladesh Bank / annual reports |

## 6. Outcomes (definitions fixed now)

### 6.1 Primary outcome: **spoofable** (binary)

A domain is **protected** only if **all** of these hold:
1. It has exactly one syntactically valid DMARC record.
2. `p=quarantine` or `p=reject`.
3. `pct` is absent or equals 100.

Every other domain is **spoofable**: no DMARC, `p=none`, `pct` below 100, or an invalid or duplicate record.

**Why defined this way:** receiving mail servers act on the DMARC policy. Without an enforcing policy, a spoofed message can be delivered even if SPF is present. This matches the "spoofable" criterion in recent census studies (e.g. Khalil & Alamori, 2026) and the RFC 7489 model.

**Sensitivity analysis (pre-specified):**
- **Strict:** counts `quarantine` as spoofable (only `reject` protects).
- **Lenient:** counts `p=none` with SPF `-all` as protected.

### 6.2 Secondary outcomes

- **Email posture score, 0–10:**
  - SPF present and valid (1)
  - SPF ends in `-all` or `~all` (1)
  - SPF within 10 lookups (1)
  - DMARC present and valid (1)
  - p = quarantine (1) or reject (2)
  - pct = 100 (1)
  - `rua` set (1)
  - DKIM found (1)
  - DNSSEC valid (1)
- **Web posture score, 0–6:**
  - HTTPS with a valid certificate (1)
  - HTTP redirects to HTTPS (1)
  - no legacy TLS (1)
  - HSTS (1)
  - CSP or frame protection (1)
  - X-Content-Type-Options (1)
- Single indicators reported on their own: legacy TLS, no DNSSEC, DMARC report destination abroad.

## 7. Procedure

1. **Freeze the frame.** Download the source lists, build the domain table (`domains.csv`: institution, sector, ownership, domain, mail domain, source URL, access date), and have the second author check it (§10).
2. **Register on OSF** (this protocol plus the frozen frame).
3. **Measurement round 1:**
   - The script runs from the author's laptop in Bangladesh, at ≤ 2 queries per second to each resolver and one web visit per domain with ≥ 1 second between domains.
   - Every raw DNS answer and HTTP or TLS result is saved as JSON with a UTC timestamp.
4. **Measurement round 2,** 14–28 days later: same script, same frame. Report **round-1 values as primary**, plus round-1 vs round-2 agreement (κ for *spoofable*; % unchanged per indicator). Domains that changed are listed in aggregate.
5. **Benchmark measurement** (§4.2) in the same week as round 1.

## 8. Analysis plan

| Question | Analysis |
|---|---|
| RQ1 | Proportions with **Wilson 95% CIs**, overall and by sector; by ownership within sector |
| RQ1 tests | χ² test (Fisher exact if any expected cell < 5) of *spoofable* × sector; Holm correction for pairwise sector comparisons |
| RQ2 | **Logistic regression:** spoofable ~ sector group (financial / government / education / health / telecom-media-commerce) + ownership + mail_provider + domain_type + web_hosting. Odds ratios with 95% CIs. **Firth penalised** regression if separation occurs. Check multicollinearity (VIF < 5). Secondary: **linear regression** on the email posture score (and ordinal logistic as a robustness check) |
| RQ3 | Spoofable share per country for the matched groups. Fisher exact test of Bangladesh vs each neighbour; Holm correction |
| RQ4 | For banks and MFS only: number of Paper 2 incidents in which the institution is named, cross-tabulated with *spoofable*. **Descriptive only.** Rank correlation reported with the caveat that news coverage reflects size and salience |
| RQ5 | Share of DMARC `rua`/`ruf` destinations in Bangladesh / US / other, by sector |

- **Missing data:** a domain where a measurement fails on both resolvers or both rounds is coded "unmeasurable" for that item and left out of that item's denominator. The number is reported per item.
- **Power:** at *n* ≈ 800, a two-group comparison at 50% vs 38% (OR ≈ 1.6) has about 80% power at α = .05 for groups of about 270. Sector-level comparisons with small sectors (MFS, about 25) are reported as estimates with CIs, not tests.
- **Software:** Python 3 (dnspython, httpx, ssl), statsmodels, firthlogist. All code goes in `research/study1-email-web-posture/` and is released.

## 9. Ethics, legal position and responsible disclosure

- **Only publicly published information is collected:**
  - DNS records, which are public by design
  - the response to one ordinary visit to a public website
- **No system is tested for weaknesses.** Nothing beyond what any web browser or mail server does routinely. This is consistent with the passive-measurement norms of the Menlo Report and with recent census studies.
- **No personal data is collected.**
- **Reporting:**
  - Results are published **in aggregate** (by sector and ownership).
  - **No table names individual spoofable institutions.**
  - Named examples appear only for institutions with **good** practice, or with the institution's consent.
- **Disclosure:**
  - **At least 60 days before submission,** each spoofable institution in FIN-BANK, FIN-MFS, GOV-MIN and GOV-AGY gets a short private notice with fix guidance, sent through **BGD e-GOV CIRT** (and Bangladesh Bank's ICT security department for banks) **[CHECK channel]**.
  - The paper reports the number notified and any change by round 2.
- **[CHECK]** UIU research-ethics approval, or a written exemption, before round 1.

## 10. Quality control

- **Frame check:** the second author independently checks a random 20% of the domain table (correct institution? correct domain?). Errors above 5% trigger a full re-check.
- **Measurement check:** for a random 30 domains, results are re-checked by hand with `dig` and a browser.
- **Code:** unit tests for SPF / DMARC parsing against RFC examples and known edge cases (multiple records, `pct=50`, `+all`, more than 10 lookups).

## 11. Deviations log

| Date | Change | Reason |
|---|---|---|
| — | — | — |

## 12. Timeline (indicative)

| Week | Step |
|---|---|
| 1 | Build the domain frame; second-author check; ethics query |
| 2 | OSF registration; script finished and tested |
| 2–3 | Round 1 and benchmark |
| 3 | Disclosure notices sent |
| 5–6 | Round 2 |
| 6–8 | Analysis and manuscript |

---

## Appendix A: named national agencies (GOV-AGY)

**[To be fixed before registration.]** Bangladesh Police; CID; RAB; BTRC; NBR; Election Commission; Department of Immigration & Passports; NID Wing; Bangladesh Computer Council; BGD e-GOV CIRT; a2i; DGHS; DSHE; Directorate of Primary Education; Bangladesh Securities and Exchange Commission; Dhaka and Chittagong Stock Exchanges; Bangladesh Bureau of Statistics; Bangladesh Investment Development Authority; Prime Minister's / Chief Adviser's Office; Cabinet Division; Supreme Court; Anti-Corruption Commission; Bangladesh Post; Dhaka North and South City Corporations; Bangladesh Railway; Biman; Titas Gas; DESCO/DPDC; WASA (Dhaka).

## Appendix B: DKIM selector list

`default, google, selector1, selector2, k1, k2, s1, s2, dkim, mail, smtp, mx, email, everlytickey1, everlytickey2, mandrill, mxvault, zoho, zmail, protonmail, protonmail2, protonmail3, sendgrid, smtpapi, sig1, cm, mailjet, ses, amazonses, 2024`

(Results are a lower bound; this limitation is stated in the paper.)
