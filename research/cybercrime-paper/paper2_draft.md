# Mapping reported cybercrime in Bangladesh: an LLM-assisted analysis of news-reported incidents, 2018–2026

**Draft 0: introduction, background and methods only.** Results, discussion and the validation figures are added once AI coding of the corpus finishes. **[CHECK]** marks items to confirm. Counts are as of 23 Nov 2026 and will be updated by the pipeline.

[Author name]¹, [Second coder]² · ¹ [Affiliation] · ² [Affiliation]

---

## Abstract (to be written last)

---

## 1. Introduction

Bangladesh has more than [X] million internet subscriptions and one of the world's largest mobile financial services (MFS) markets **[CHECK: BTRC and Bangladesh Bank figures]**. Fraud through bKash and Nagad, account hacking, sextortion and online harassment are now routine news. Yet the country publishes **no regular official statistics on cybercrime**. Police complaint data and Cyber Tribunal records are not released in research-usable form. Our scoping review of 193 Bangladeshi studies (Paper 1, [citation]) found that:
- only two studies use police or court records
- only four surveys use probability samples
- mobile-money fraud, offending and the justice response are among the least-studied areas

Researchers and policymakers therefore have no basic picture of *what* cybercrime is reported, *where*, *against whom* and *with what response*.

News reports are an imperfect but available source. Event data coded from newspapers are widely used in criminology and conflict research where official data are missing or untrusted **[CHECK: cite e.g. event-data and media-crime literature]**. Large language models (LLMs) now make it feasible to code thousands of articles in English and Bangla, provided their accuracy is measured against human coders.

This paper builds the first open, structured dataset of news-reported cybercrime incidents in Bangladesh (2018–2026) and asks:
- **RQ1:** Which cybercrimes are reported, and how has the mix changed between 2018 and 2026?
- **RQ2:** Who are the victims, which platforms are involved, where do incidents occur, how much money is lost, and how often are arrests reported?
- **RQ3:** Which laws are cases reported under, and how did this shift across the Digital Security Act 2018, the Cyber Security Act 2023, the Cyber Security Ordinance 2025 and the Cyber Security Act 2026?
- **RQ4 (method):** How accurately does an LLM extract structured incident records from Bangladeshi English and Bangla news, compared with human coders?

## 2. Background

### 2.1 Cybercrime in Bangladesh
**[Draw on Paper 1.]** Key points:
- rapid MFS adoption, and fraud through it (fake agent calls, OTP theft)
- e-commerce Ponzi schemes (the Evaly and e-Orange type)
- gendered online abuse and sextortion
- organisational breaches (the 2016 Bangladesh Bank heist; the 2023 national ID data exposure)
- speech prosecutions under the DSA 2018 and CSA 2023 (Riaz/CGS case data)
- the absence of official incident statistics (the "dark figure")

### 2.2 Theoretical framing
- **Routine activity and cyber-lifestyle–routine activities theory** (Cohen & Felson, 1979; Reyns et al., 2011). Rapid platform adoption increases the number of suitable targets and motivated offenders, while capable guardianship (platform moderation, MFS security, policing) lags. We use this framework descriptively, to interpret platform and victim patterns.
- **The dark figure and media filtering.** News coverage over-represents serious, unusual, urban and resolved cases (those with an arrest). We treat the dataset as *reported and newsworthy* cybercrime, not total cybercrime, and examine where the selection is likely to be biased.

### 2.3 News as crime data, and LLM-based extraction
- The strengths and biases of newspaper-derived event data **[CHECK: cite]**.
- LLMs for information extraction from news, and the need for validation against human coders, especially for low-resource languages such as Bangla **[CHECK: cite]**.

## 3. Data and methods

### 3.1 Sources
- **Six national outlets**, covering both languages and a range of styles:
  - English: *The Daily Star*, *The Business Standard*, *Dhaka Tribune*
  - Bangla: *Dhaka Post*, *Risingbd*, *Jagonews24*
- Other major outlets (e.g. bdnews24, Jugantor, Kaler Kantho) could not be harvested reliably because of bot protection. This is a limitation.
- **[Optional] National CERT advisories** (BGD e-GOV CIRT), to compare news reporting with technical threat reporting.

### 3.2 Article discovery and collection
- Article URLs for 2018–2026 were discovered from the **Internet Archive Wayback Machine** (its CDX index), restricted to each outlet's news sections.
- Archived snapshots were fetched in place of live pages, which avoids paywalls and later edits and makes the corpus reproducible.
- Discovery yielded **88,085 candidate URLs**.

### 3.3 Relevance gate
A transparent lexicon (`cyber_lexicon.py`) admitted an article if it contained:
- **(a)** a *strong* term found only in cybercrime reporting (e.g. hacking, phishing, sextortion, ransomware, Cyber Security Act), or
- **(b)** a *channel* term (e.g. Facebook, bKash) **together with** a *harm* term (e.g. fraud, blackmail).

The gate was applied first to the URL slug (for English outlets) and then to the headline and opening paragraph. It is deliberately recall-leaning: it lets in more articles than needed, and the LLM then decides whether each describes a cybercrime incident. The validation sample measures how much irrelevant material passed the gate. **897 articles** passed.

### 3.4 Coding scheme and LLM extraction
- Each article was coded with the codebook in Supplement S1 (`CODEBOOK.md`). The **same definitions** are given to the model and to the human coders.
- Fields:
  - whether the article reports a cybercrime incident in Bangladesh
  - cybercrime type (12 categories)
  - platform
  - victim type and victim gender
  - arrest reported
  - legal basis (ICT Act 2006 through CSA 2026)
  - district
  - incident date
  - amount lost or demanded (BDT)
- Extraction used **Google Gemini** (`gemini-flash-lite-latest`) at temperature **[CHECK]**, with a structured JSON output schema. The exact model version string is stored on every record, because "latest" model aliases change over time.
- The model was told to code only what the article states.
- Calls were rate-limited (about 14 per minute) and capped per day.

### 3.5 Validation (RQ4)
- A stratified random sample of about 400 articles (at least 100 per language) is exported as a blind coding sheet (`backfill.py export`).
- Two human coders code it independently with the codebook. We report:
  1. **inter-coder agreement** (Cohen's κ per field)
  2. **model accuracy** against the adjudicated gold standard (accuracy and macro-F1 per field, by language)
- An error analysis covers Bangla articles, articles reporting several incidents, and the boundary between speech offences and other categories.

### 3.6 From articles to incidents
- Several outlets may report the same incident. Articles are merged into one incident when they share the same type and district, have dates within ±3 days, and report no conflicting amount.
- Both article-level and incident-level counts are reported.

### 3.7 Analysis
Descriptive statistics and cross-tabulations:
- incidents by year × type
- type × platform
- type × victim type and gender
- legal basis by year
- arrests reported by type
- money lost by type (median and total)
- district distribution (centroid map)
- **[Optional]** news incidents compared with CIRT advisory topics

Where useful, chi-square tests and trend tests check changes over time. Interrupted time-series around the law changes are considered if annual counts allow.

### 3.8 Ethics
- Only publicly published news was used.
- The released dataset will contain **no names** of victims or accused, and will be at incident level, with article links.
- Raw harvested text is kept private (it is git-ignored).
- **[CHECK]** Ask the UIU supervisor whether formal ethics approval is required.

## 4. Results (pending)
- 4.1 Corpus and extraction performance (RQ4)
- 4.2 What is reported (RQ1)
- 4.3 Victims, platforms, places, money and arrests (RQ2)
- 4.4 The legal basis of reported cases (RQ3)

## 5. Discussion (pending)
## 6. Limitations (draft)
- **Media selection:** newsworthiness bias, an urban (Dhaka) bias, and coverage tilted towards cases that end in an arrest.
- **Outlets:** six outlets only; bot-protected outlets are excluded.
- **Wayback coverage:** archive coverage is uneven over time, which may distort trends. Annual counts will be checked against the number of archived snapshots per year.
- **Gate recall:** relevant articles without lexicon terms are missed.
- **District geocoding:** districts are mapped to a centroid point, so locations are approximate.
- **Model drift:** the model version is logged on each record.

## Data and code availability
Pipeline code: `backend/` (backfill, lexicon, codebook, extractor, analysis). Dataset release (without names): [repository / OSF **CHECK**].
