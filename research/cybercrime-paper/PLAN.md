# Paper plan — Cybercrime in Bangladesh

Working plan for the cyber security master's paper (UIU), which also serves as
the writing sample and evidence of research ability for PhD applications.

## Working title

**Mapping cybercrime in Bangladesh: an LLM-assisted analysis of news-reported
incidents and national CERT advisories, 2018–2026**

## Research questions

1. **What** cybercrime is reported in Bangladesh, and how has the mix changed
   over 2018–2026? (MFS/bKash–Nagad fraud, sextortion and image abuse,
   account hacking, phishing, e-commerce fraud, deepfakes, attacks on
   organisations.)
2. **Who and where:** victim and offender profiles, platforms used, and the
   geographic spread of reported incidents.
3. **Media vs. technical view:** how far do incidents reported in the press
   line up with the threats BGD e-GOV CIRT publishes advisories about? Which
   harms are visible only in one of the two?
4. **Method:** how accurately does an LLM extract structured incident records
   from Bangladeshi news (English and Bangla) compared with human coding?

RQ4 is the technical contribution (cyber security / NLP); RQ1–3 are the
criminological contribution. Together they make the paper fit both degrees.

## Contribution claims

- The first open, structured dataset of reported cybercrime incidents in
  Bangladesh across several years (no official statistics of this kind are
  published).
- A validated, reproducible LLM extraction pipeline for low-resource
  Global-South crime reporting.
- An empirical comparison of public-harm reporting against national CERT
  threat reporting.
- Mapping of incidents to MITRE ATT&CK techniques where the reporting allows
  it (reuses `backend/app/services/ttp_library.py`).

## Data — current state and what is needed

| Item | Status |
|---|---|
| Live pipeline (`news_scraper.py`) | ~83 incident records in total as of Sept 2026; only a few are Cybercrime. **Not enough for a paper.** |
| Gemini key | Revoked; ingestion is stopped until a new key is set (see `HANDOFF.md`). |
| Historical backfill (`backfill.py` + `archive_harvester.py`) | Working, checkpointed Wayback CDX harvester — but filtered for *asset-protection* relevance, not cybercrime. |
| CIRT advisories (`cirt_scraper.py`) | Collector exists; needs a full historical pull. |

**Target corpus:** 1,000–2,000 cybercrime articles, 2018–2026, from the
outlets already in `NEWS_FEEDS` plus the full CIRT advisory archive.

### Collection steps

1. ~~Add a cybercrime lexicon and a `--topic cyber` backfill mode.~~ Done:
   `backend/app/parsers/cyber_lexicon.py`; state goes to
   `backend/.backfill-cyber/` (git-ignored — it contains names).
2. Run discovery and fetching for 2018–2026 from a home machine (Wayback is
   not reachable from the cloud session). Stages resume, so this can run
   across several days:
   ```
   cd backend
   python backfill.py --topic cyber discover
   python backfill.py --topic cyber fetch --limit 1000   # repeat until done
   python backfill.py --topic cyber extract --max-calls 200   # daily quota
   python backfill.py --topic cyber status
   ```
3. Pull the full CIRT `/alerts` history.
4. `extract` with a hard model-call ceiling per day; store raw JSONL as the
   frozen research dataset (separate from the live dashboard database).
5. Deduplicate multi-outlet coverage of the same incident (existing
   `source_confidence` logic as a start).

## Validation (RQ4)

- Randomly sample **300–500 articles**; two coders (you + one classmate)
  hand-code: is it a cybercrime report, category, platform, victim type,
  location, date.
- Report inter-coder agreement (Cohen's κ), then LLM vs. gold standard:
  precision, recall, F1 per field and per language.
- Error analysis: where the model fails (Bangla, multi-incident articles,
  cold cases dated to announcement).

## Analysis (RQ1–3)

- Descriptive counts and trends by year and category; change around the
  Cyber Security Act 2023 (replacing the Digital Security Act 2018) —
  descriptive only, not a causal claim.
- Victim/offender/platform cross-tabs.
- Division/district map (district centroids; note the precision limit
  documented in `HANDOFF.md` §6).
- CIRT vs. news: category overlap, time lag between advisory and first press
  report, harms present in only one stream.
- Theory framing: routine activity theory / cyber-lifestyle–routine
  activities (Reyns et al.), and the "dark figure" of cybercrime.

## Paper structure (~7,000–8,000 words)

1. Introduction — digital growth in Bangladesh, MFS adoption, lack of
   official cybercrime statistics, the four RQs.
2. Background — cybercrime in South Asia; DSA 2018 → CSA 2023; media as a
   data source for crime research; LLMs for event extraction.
3. Data and methods — sources, harvesting, extraction schema, validation
   design, ethics.
4. Extraction performance (RQ4).
5. Findings (RQ1–3).
6. Discussion — what this shows about the Bangladeshi cybercrime landscape;
   media bias and the dark figure; policy implications.
7. Limitations — media selection bias, Cloudflare-excluded outlets
   (bdnews24, Jugantor, Kaler Kantho), centroid geolocation, model drift.
8. Conclusion and data/code availability.

## Ethics

- Public news only; no scraping of private accounts.
- Release the dataset at incident level **without names** of victims or
  accused, consistent with the project's `/corrections` policy.
- Ask the UIU supervisor whether formal ethics approval is required.

## Venues

- Journals: *Journal of Cybersecurity* (OUP), *International Journal of
  Cyber Criminology*, *Crime Science*, *Asian Journal of Criminology*.
- Faster: IEEE ICCIT (Bangladesh), APWG eCrime.
- Post a preprint (SSRN / arXiv cs.CR or cs.CL) as soon as a full draft
  exists — this is what goes in PhD outreach emails.

## Timeline (from mid-October 2026)

| Weeks | Work |
|---|---|
| 1 | New Gemini key; cyber lexicon + `--topic cyber` backfill mode; start discovery |
| 2–3 | Fetch + extract; CIRT history; build coding sheet |
| 4–5 | Hand-coding of validation sample; agreement + accuracy metrics |
| 6–7 | Analysis, figures, map |
| 8–9 | Full draft; supervisor feedback |
| 10 | Preprint; start PhD emails with it attached |
