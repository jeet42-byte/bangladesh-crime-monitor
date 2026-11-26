# Study 1: gap analysis

**Working title:** *Can anyone send email as a Bangladeshi bank? A passive, multi-sector census of email-authentication and web-transport security in Bangladesh*

**Status:** gap check, 26 Nov 2026, revision 2.
- OpenAlex: 16 queries.
- Google Scholar: 4 queries, first page each (run by the author).
- **Revision 2:** Scholar found a 2026 study that **already measures DMARC on Bangladeshi government domains** (Cesar, Holz & Jonker, NOMS 2026), plus two older Bangladesh TLS studies. G1 and G2 below are narrowed accordingly.
- **[CHECK]** Read Cesar et al. in full. Repeat the searches in IEEE Xplore and BanglaJOL.

---

## 1. What already exists

### 1a. Bangladesh: web security studies

| Study | Sample | Method | Measures |
|---|---|---|---|
| Masum, Sachcha & Nayem (2022), *IJEME*, doi:10.5815/ijeme.2022.02.03 | Government and financial websites (small set) | **Active** scanning (Acunetix, OWASP ZAP) | Clickjacking, CSRF, XSS, information disclosure |
| Rifat, Sultana & Hossain (2023), *IJIEEB*, doi:10.5815/ijieeb.2023.05.05 | Financial and government websites | **Active** scanning (ZAP) | Risk alerts by severity |
| Janny et al. (2025), *BEEI*, doi:10.11591/eei.v14i6.9349 | 20 universities | **Active** VAPT (penetration testing) | Web vulnerabilities; public vs private |
| Khan (2026), BRAC University MSc thesis | Tertiary institutions | **Active** vulnerability assessment | Attack vectors |
| Ahmed (2025), *OALib*, doi:10.4236/oalib.1112756 | Ministry of Land websites | **Active** penetration testing | CVE/CWE, SQLi, XSS |
| Chowdhury, Chowdhury & Ferdous (2020), *ICCIT*, doi:10.1109/iccit51783.2020.9392745 | 36 government websites | Manual heuristics | Password policies |
| Tanjin et al. (2021), LNICST, doi:10.1007/978-3-030-90016-8_3 | Government vs private, BD vs USA | Comparison | Privacy and security factors |
| Zaman (2018), *IJCSDF*, doi:10.17781/p002432 | BD web platform | Heartbleed test | One TLS vulnerability |
| Moniruzzaman, Chowdhury et al. (2019), IEEE ECCE, ieeexplore 8679426 (cited 25) | Bangladeshi websites | Scanning | **56% had insecure TLS/SSL** (untrusted certificates) |
| Dolon, Ridowan & Mouri (2024), ACM conf., doi:10.1145/3723178.3723203 | Private-sector websites | Active vulnerability assessment | **72% SSL problems** |
| Chowdhury, Rahman & Rahman (2024), *IJECE* | Educational websites | Script-based scanning | Headers, SSL/TLS, SQLi |
| Shaolin et al. (2026), BRAC University thesis | Bangladeshi web apps | Neural-network classifier | Uses security headers and TLS settings as *features* to predict vulnerability |
| Remus, Akter & Ferdous (2023), *EJCSIT* | Banks | **Survey** of staff | PAM, PCI DSS, SIEM adoption |

### 1b. Other countries: passive census studies (the design we follow)

| Study | Country / scope | Notes |
|---|---|---|
| Khalil & Alamori (2026), Research Square, doi:10.21203/rs.3.rs-11563211/v1 | Iraq, all 103 higher-education domains | Passive DNS only. SPF/DKIM/DMARC/DNSSEC. 90.3% spoofable. One sector, no regression. **Closest design model** |
| Waheed & Alazab (2026), *Future Internet*, doi:10.3390/fi18060313 | Maldives, 51 government and listed-company websites | HTTP security headers, benchmark comparison, Mann–Whitney U, effect sizes |
| Maroofi, Korczyński et al. (2021), *IEEE TNSM*, doi:10.1109/tnsm.2021.3065422 | Global: 236 m domains plus high-profile domains of 139 countries | SPF/DMARC adoption and misconfiguration. Country-level only, no sectors |
| **Cesar, Holz & Jonker (2026), *IEEE/IFIP NOMS*** | ccTLDs, longitudinal, including government domains per country | **Covers Bangladesh.** The Scholar snippet reads "278 instances (34.6%) of Bangladesh's governmental domains…", so about 800 `.gov.bd` domains were measured. **Closest prior work: read in full.** [CHECK] what the 34.6% refers to (no DMARC? `p=none`? enforced?), the date range, and whether SPF/DKIM or other sectors are covered |
| Karopoulos, Kouliaridis et al. (2022, 2023), EU JRC reports JRC128819 and JRC133313 | EU states plus comparison countries | Email-security standards uptake. **Bangladesh (`.bd`) appears** in the comparison (snippet: "bd, which scores 77%…"). Country-level only |
| Akula (2025), SSRN, doi:10.2139/ssrn.5297306 | India | DMARC adoption and threats (preprint) |
| Others | Italy (2026), Brazil municipal (2026), Canada government (2026), US non-federal government (2023), Finland (2020) | Same family of national passive measurements |

---

## 2. Gaps

| # | Gap | Evidence |
|---|---|---|
| **G1 (narrowed)** | **Email authentication is measured only for Bangladeshi *government* domains, and only DMARC.** | Cesar et al. (2026) report DMARC for about 800 `.gov.bd` domains inside a global ccTLD study, and the EU JRC reports give a `.bd`-wide score. **No study measures banks, MFS/fintech, universities, hospitals, telecoms or media**, which are the brands that phishers impersonate (Paper 2). None checks SPF quality (`+all`, `~all`, too many DNS lookups) or DKIM. |
| **G2** | **Bangladeshi web studies use active scanning on small samples** (≈20–40 sites), and the TLS figures are dated. | Active scanning without permission raises legal and ethical questions under the CSA 2023/2026. It can't be repeated freely, and results depend on the tool. TLS problems were reported at 56% (2019) and 72% (2024) on convenience samples. A **passive census** gives a clean, repeatable baseline. **Web transport is now a secondary outcome**; email is the main contribution. |
| **G3** | **No multi-sector comparison.** | Studies cover government, finance or universities separately. Nobody compares banks, MFS/fintech, government, universities, hospitals, telecoms, media and e-commerce in one standardised measurement. |
| **G4** | **No statistical modelling.** | Bangladeshi studies report counts of alerts. None tests what *predicts* weak security: sector, public vs private ownership, domain type (`.gov.bd` / `.com.bd` / `.com`), hosting (government data centre, local host or global cloud), or mail provider (Google/Microsoft vs self-hosted). |
| **G5** | **No regional benchmark.** | Single-country studies exist for Iraq, the Maldives, India and others, but there's no like-for-like comparison of Bangladesh with India, Pakistan, Sri Lanka and Nepal on the same sectors and method. |
| **G6** | **No link between technical posture and crime.** | No study connects how spoofable a bank's domain is with phishing or fraud reported against it. Paper 2's incident data makes this possible as an exploratory analysis. |
| **G7** | **No check against regulation.** | Bangladesh Bank's ICT Security Guideline and BGD e-GOV CIRT advisories recommend email and web hardening **[CHECK exact clauses]**. Nobody has measured compliance. |

**Contribution in one sentence (revised):** the first passive, multi-sector census of email authentication (SPF, DKIM, DMARC) in Bangladesh. It goes beyond government to the banks, MFS providers and other institutions that phishers impersonate, and models what predicts weak protection, with a South Asian benchmark. Web transport and DNSSEC are secondary outcomes.

**How we position against Cesar et al. (2026):**
- Their work is a global, longitudinal, government-only DMARC study, and Bangladesh is one of many ccTLDs.
- Ours is a single-country, multi-sector, multi-protocol study with organisational predictors and a link to fraud.
- We **cite them as the closest prior work** and compare our government-sector figure with theirs as a validity check. If both measurements agree, that strengthens both papers.

A reviewer could object that "DMARC measurement is not new". The answer is that the method is established, which is a strength, and the evidence for Bangladeshi sectors beyond government is new, with predictor models and a link to crime that other studies did not do.

---

## 3. Research questions

- **RQ1 (prevalence):** What share of Bangladeshi institutional domains, by sector, can be spoofed by email? That means no DMARC, `p=none`, or a weak or missing SPF record. What share also lack HTTPS, use outdated TLS, miss key security headers or have no DNSSEC?
- **RQ2 (predictors):** Which organisational and infrastructure factors predict a weak posture? Candidates: sector, ownership, domain type, hosting and mail provider. Method: logistic regression for "spoofable" and ordinal or linear models for a posture score.
- **RQ3 (benchmark):** How does Bangladesh compare with India, Pakistan, Sri Lanka and Nepal on the same sectors, such as central and commercial banks, ministries and top universities?
- **RQ4 (exploratory, links to Paper 2):** Are banks and MFS brands with spoofable domains named more often in news-reported phishing and fraud?

## 4. Design in brief

- **Sampling frame (census, not sample):**
  - every scheduled bank (Bangladesh Bank list)
  - MFS and PSP licensees
  - ministries and divisions (from the government portal)
  - public and private universities (UGC list)
  - major hospitals
  - mobile operators and ISPs
  - national newspapers
  - top e-commerce sites
  - The target is about 800–1,200 domains. Every inclusion rule is written down before measuring.
- **Measurement, strictly passive:**
  - DNS lookups (MX, SPF, DMARC, DKIM common selectors, DNSSEC, CAA) through two public resolvers.
  - One ordinary HTTPS request per site for TLS version, certificate validity and security headers.
  - No vulnerability probing, no login attempts, no port scanning.
  - Every raw answer is stored with a timestamp.
- **Outcomes:**
  - primary: a binary "spoofable" criterion, defined before data collection
  - secondary: a posture score built from published best practice
- **Analysis:**
  - prevalence with 95% CIs by sector
  - chi-square and Fisher tests
  - logistic regression (odds ratios)
  - regional comparison
  - a robustness re-scan two to four weeks later to check stability
- **Ethics and disclosure:**
  - Only public information is collected.
  - Results are published in aggregate, without naming individual vulnerable institutions.
  - Each affected institution is notified privately, with BGD e-GOV CIRT informed, before publication.
  - **[CHECK]** Ask the UIU supervisor about ethics approval.

## 5. Risks and how we handle them

| Risk | Handling |
|---|---|
| A similar Bangladesh study appears before we publish | Do the Scholar/IEEE checks now. Register the protocol on OSF early to time-stamp the idea |
| "Just counting records" (low novelty) | Lead with G3/G4 (sector models, predictors) and G5 (regional benchmark), and add the Paper 2 link (G6) |
| DKIM can't be fully enumerated passively | Report DKIM as "detected with common selectors" (a lower bound), as the Iraq study does |
| Domains block or rate-limit lookups | DNS via public resolvers isn't affected. HTTPS gets one request per site, with a pause |
| Naming weak banks could be misused | Aggregate reporting plus private notification. No per-institution table in the paper |

## 6. Candidate journals

- *Computers & Security* (Elsevier)
- *Journal of Cybersecurity* (Oxford)
- *IEEE Access*
- *Future Internet* (MDPI; published the Maldives study)
- *International Journal of Information Security* (Springer)
- Conference option: ACM IMC poster or PAM short paper

---

## Next steps

1. **You:** repeat 3–4 key searches in Google Scholar and IEEE Xplore, for example "DMARC Bangladesh", "email spoofing Bangladesh bank" and "Bangladesh website security headers". Tell me if anything new turns up.
2. **Me:** draft the protocol (inclusion rules, measurement definitions and the "spoofable" criterion fixed in advance), for OSF.
3. **Me:** build the domain list by sector from public lists. **You:** check it.
4. **Me:** write the measurement script. **You:** run it on the laptop, as for Paper 2.
