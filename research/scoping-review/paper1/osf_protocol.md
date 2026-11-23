# OSF registration text: scoping review protocol (retrospective)

Paste into OSF Registries using the **"Generalized Systematic Review Registration"** template (or "OSF Preregistration" with these headings). Upload this file plus `CHARTING_FORM.md` and `scripts/search.py` as attachments.

---

**Title:** Mapping cybercrime research in South Asia, with a focus on Bangladesh: a scoping review with bibliometric and topic-modelling analysis

**Authors:** [Your name], [affiliation]; [second reviewer], [affiliation]

**Registration type and timing (transparency statement):**
This protocol is registered **retrospectively**. The review protocol was written before the search (internal document "Scoping Review Protocol – Cybercrime Research in South Asia"). The search was run on 17 November 2026. Screening, charting and the data-mining analysis were completed before registration. Deviations from the original protocol are listed below and will be reported in the manuscript.

**Type of review:** Scoping review following Arksey and O'Malley (2005), Levac et al. (2010) and JBI guidance (Peters et al., 2020), reported to PRISMA-ScR (Tricco et al., 2018), and supplemented with bibliometric and text-mining analysis.

**Review questions**
1. How has cybercrime research in South Asia grown (volume, countries, disciplines, outlets, collaboration)?
2. What themes dominate, and how have they changed over time?
3. For Bangladesh: which crime types, populations, designs, data sources and theories are used, and which are missing?
4. How strong is the evidence base (format, sampling, theory use, quality concerns)?
5. What research agenda follows?

**Eligibility criteria (Population–Concept–Context)**
- *Concept:* cybercrime and online harm: cyber-dependent and cyber-enabled crime, online fraud and scams, MFS fraud, cyberbullying and harassment, image-based abuse and sextortion, online child sexual abuse, deepfakes, online hate, and cyber laws including speech offences. Awareness surveys about cyber threats are included.
- *Context:* Tier A = Bangladesh, all disciplines. Tier B = the other South Asian countries (India, Pakistan, Nepal, Sri Lanka, Bhutan, Maldives, Afghanistan), social sciences only.
- *Types of evidence:* empirical studies, legal/doctrinal analyses, reviews, theses and reports, published 2010–2026, in English.
- *Exclusions:* crime is only one item in a list; fintech adoption or trust without a crime focus; offline fraud; news, opinion, editorials, protocols; purely technical work outside Bangladesh; organisational cyber-readiness without a crime focus; mental-health studies that do not report cyberbullying.

**Information sources and search:** OpenAlex API (titles and abstracts), 2010–2026. The full queries are in `scripts/search.py`. Supplementary searches (Google Scholar, BanglaJOL, Scopus/Web of Science where accessible) are [planned / completed on DATE].

**Selection:**
- A rule-based pre-screen, then title/abstract screening by one reviewer using written decision rules (rule-assisted suggestions, every suggested exclusion checked by hand).
- Full-text assessment for Tier A.
- A second reviewer independently re-screens a random 20% sample at each stage; agreement is reported as Cohen's κ.

**Data charting:** a standard form (`CHARTING_FORM.md`) covering document type, discipline, design, data source, population, sample, location, years, crime type, focus, law, theory, gender lens, key findings, prevalence, author-stated gaps, recommendations and quality notes.
- Tier A is charted from full text where available, otherwise from the abstract (flagged).
- Tier B is charted from abstracts with rule-based automated coding.
- A second reviewer checks a random 20% of charted records.

**Analysis:**
- Descriptive mapping (counts, cross-tabulations, evidence map).
- Bibliometrics: publication trends, country focus, venues, citations, co-authorship.
- Topic modelling: non-negative matrix factorisation on TF-IDF of titles and abstracts, k = 12, seed 42.
- Term co-occurrence network (association strength).
- Chi-square tests comparing Bangladesh, India and Pakistan on like-for-like subsets.
- Formal risk-of-bias appraisal is not required for scoping reviews. Descriptive evidence-strength indicators are reported instead.

**Deviations from the original protocol**
1. OpenAlex replaced Scopus and Web of Science, because no institutional access was available.
2. Mobile-money terms were searched only in combination with fraud, scam, crime or theft terms, after the first run returned mainly adoption studies.
3. Tier B required a cybercrime term in the title, to keep screening feasible (5,480 records otherwise).
4. Tier A records without accessible full text were charted from abstracts. Records with neither full text nor abstract (n = 74) are reported as not retrieved.
5. An AI assistant supported rule drafting, screening suggestions, charting and analysis code. All decisions were checked by the reviewer (see the manuscript's AI-use statement).

**Data and code availability:** all records, decisions, charting data and analysis scripts are in a public repository [GitHub/OSF link].

**Funding:** none. **Conflicts of interest:** none.
