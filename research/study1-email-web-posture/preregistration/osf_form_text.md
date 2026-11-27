# OSF Preregistration: text to paste, field by field

On osf.io, **Create a project → Registrations → New registration → template "OSF Preregistration"**. Copy each block into the matching field. Attach `protocol.md` (as PDF), the frame files (`frame_FIN_v2.csv`, `frame_GOV_v2.csv`, `frame_EDU_v2.csv`, `excluded_institutions.csv`, `mail_domain_decisions.csv`, `alt_domains.csv`), the UGC source PDF and the measurement code (`measure/`).

**Register before Round 1 is run.** The pilot (10 domains, 27 Nov 2026) is declared below.

---

### Title
Can anyone send email as a Bangladeshi bank? A passive, multi-sector census of email-authentication and web-transport security in Bangladesh

### Description
A pre-registered, passive census of email-spoofing protection (SPF, DKIM, DMARC) and basic web-transport security (HTTPS, TLS, security headers, DNSSEC) for Bangladeshi banks and mobile financial services, government ministries and agencies, and public and private universities.
- It estimates the share of institutional domains that can be spoofed, by sector.
- It models what predicts weak protection.
- It compares Bangladesh with India, Pakistan, Sri Lanka and Nepal on matched institutions.

### Hypotheses
- **H1:** Financial-sector domains (banks, MFS/PSPs) are less likely to be spoofable than university domains.
- **H2:** Domains whose mail is handled by a large managed provider (Google, Microsoft) are less likely to be spoofable than self-hosted or local-provider mail.
- **H3:** Within a sector, private institutions are less likely to be spoofable than public ones.
- **H4:** Bangladesh's spoofable share for the central bank plus the top banks is not lower than the regional median. This is a two-sided test.
- RQ4 (news-reported fraud against spoofable institutions) and RQ5 (where DMARC reports are sent) are exploratory.

### Design plan
- **Study type:** observational, cross-sectional census with one repeat measurement 14–28 days later.
- **Blinding:** not applicable. All measurement is automated, and the outcome definitions are fixed in code before data collection (`measure/outcomes.py`, with unit tests).

### Sampling plan
- **Existing data:** none. Registration precedes data collection, except for a 10-domain pilot (27 Nov 2026) used only to test scripts. It is reported as a pilot and excluded from the analysis.
- **Data collection procedure:**
  - DNS lookups through two public resolvers (1.1.1.1 and 8.8.8.8).
  - One HTTPS and one HTTP request to each homepage, and one TLS handshake each limited to TLS 1.0 and TLS 1.1.
  - Everything runs from the author's computer in Bangladesh, at ≤ 1 domain per second.
  - No vulnerability probing, logins, form submission or port scanning.
- **Sample size:** a census of 322 institutions after the documented exclusions:
  - 72 financial: Bangladesh Bank, 60 scheduled banks, 11 MFS/PSPs, with 3 duplicates removed
  - 88 government
  - 162 universities: 49 public and 113 private
  - 4 universities excluded as not operating, or with no official domain
  - plus their separate mail domains and alternate domains
- **Sampling frame sources:** Bangladesh Bank lists, the national portal, and the UGC university lists (dated copies archived).
  - Each domain was verified by script and, where needed, by browser.
  - A second person independently checks a random 20% of the frame, stratified by sector (seed 2026).
  - An error rate above 5% triggers a full re-check.
- **Stopping rule:** a census. Every frame domain is measured once per round.

### Variables
- **Primary outcome, *spoofable*:**
  - **Protected** means exactly one valid DMARC record with `p=quarantine` or `p=reject` and `pct` absent or equal to 100. Every other domain is spoofable.
  - Sensitivity versions:
    - **strict:** only `p=reject` protects
    - **lenient:** `p=none` with SPF `-all` also counts as protected
- **Email domain used:** the institution's separate organisational mail domain where one is published, preferring one with MX; otherwise the website domain.
  - Also recorded: `spoofable_web_domain` and `any_domain_spoofable`, the latter covering the website, mail and alternate domains.
- **Secondary outcomes:**
  - an email posture score (0–10) and a web posture score (0–6), as defined in the protocol (§6.2)
  - single indicators: SPF validity (≤ 10 DNS lookups), DKIM detected with 30 common selectors (a lower bound), DNSSEC, MTA-STS, HTTPS with a valid certificate, HTTP→HTTPS redirect, acceptance of TLS 1.0/1.1, HSTS, CSP or frame protection, X-Content-Type-Options, and DMARC report destination country
- **Predictors:**
  - sector group (finance / government / education)
  - ownership
  - mail provider (from MX: Google, Microsoft, other foreign, Bangladeshi or government mail, self-hosted, none)
  - domain type (`.gov.bd`, `.ac.bd`/`.edu.bd`, other `.bd`, generic or foreign)
  - web hosting (Bangladeshi vs foreign network, from IP→ASN)
  - free webmail in the official contact details

### Analysis plan
- **RQ1:** proportions with Wilson 95% confidence intervals, overall and by sector; χ² or Fisher exact tests across sectors, with Holm correction for pairwise comparisons.
- **RQ2:** logistic regression, *spoofable* ~ sector group + ownership + mail provider + domain type + hosting.
  - Odds ratios with 95% CIs.
  - Firth penalised regression if separation occurs.
  - VIF < 5.
  - Secondary: linear and ordinal models of the email posture score.
- **RQ3:** Fisher exact tests, Bangladesh vs each neighbour on matched institutions, with Holm correction.
- **Missing data:** an item that fails on both resolvers in both rounds is coded unmeasurable and left out of that item's denominator. The counts are reported.
- **Inference criteria:** α = .05, two-sided. Effect sizes with CIs are reported for all comparisons. Small sectors (for example MFS) are reported as estimates without tests.
- **Robustness:**
  - Round 1 vs Round 2 agreement (κ for *spoofable*)
  - the strict and lenient definitions
  - foreign banks analysed separately

### Other
- **Ethics:** passive measurement of public information only; no personal data.
  - Results are published by sector and ownership, and no institution is named as weak.
  - Spoofable banks and government bodies are notified privately at least 60 days before submission, through BGD e-GOV CIRT (and Bangladesh Bank).
  - [UIU ethics decision: **fill in** after your supervisor replies.]
- **Closest prior work:** Cesar, Holz & Jonker (2026, IEEE/IFIP NOMS). That study measures DMARC only, for government domains only; this one extends to other sectors and to SPF and DKIM, and models predictors.
