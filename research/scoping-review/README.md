# Scoping review — search records

Search run on 17 Nov 2026 against the OpenAlex API (Scopus and Web of Science
were not available). Protocol: the "Scoping Review Protocol — Cybercrime
Research in South Asia" document.

| Step | Records |
|---|---|
| Tier A — Bangladesh, all fields | 603 |
| Tier B — rest of South Asia, social-science fields, cybercrime term in title, crime/victim/law term in title or abstract | 1,604 |
| Duplicates removed (DOI or identical title) | 106 |
| **To screen** | **2,101** |

Files

- `screening_records.csv` — one row per record, with abstract; `decision` and
  `reason` columns are for screening (open in Excel or import to Rayyan).
- `screening_records.ris` — the same records for Zotero or Rayyan.
- `search_log.json` — counts for the PRISMA-ScR flow diagram.
- `scripts/` — the exact queries (`search.py`) and download code (`fetch.py`);
  rerun with an OpenAlex API key to reproduce or update the search.

Deviations from the protocol, to report in the paper

- OpenAlex replaced Scopus and Web of Science.
- Mobile-money terms count only alongside fraud/scam/crime/theft terms, after
  the first run returned mainly fintech-adoption papers.
- Tier B requires the cybercrime term in the title, to keep screening
  feasible (5,480 records otherwise).

## First-pass title prescreen (2026-11-17)

Exclusion was deliberately conservative: only records that are clearly off-topic
from the title. Anything uncertain stays in.

| Step | Records |
|---|---|
| Records after deduplication | 2,101 |
| Excluded by rules (non-research items, clearly technical-only, etc.) | 135 |
| Excluded on title by reviewer (no cybercrime element; offline scams such as Ponzi/chit-fund/2G) | 131 |
| **Left for title/abstract screening** | **1,835** (Tier A 354, Tier B 1,467, both 14) |

- `screening_prescreened.csv`: every record, with the `prescreen` and `prescreen_reason` columns.
- `to_screen_rayyan.ris`: the 1,835 records for import into Rayyan.

These are first-pass, single-reviewer exclusions. Report them in the PRISMA-ScR
flow as "excluded on title". A second reviewer should check a random 10–20%
sample of them.

## Screening suggestions (2026-11-17)

`scripts/suggest.py` applies the screening rules agreed in the first session
(see the rules table below) and writes `screening_suggestions.csv`, with
`suggestion` and `suggestion_reason` columns. It also adds the hand decisions
from that session and corrections made after checking every suggested exclusion
by hand.

| Suggestion | Tier A (Bangladesh) | Tier B (rest of South Asia) |
|---|---|---|
| Include | 258 | 1,421 |
| Maybe | 83 | 33 |
| Exclude | 27 | 13 |

Validation:
- Against the 37 decisions made by hand, there were no false exclusions.
- The only disagreements were include vs maybe, which carry no risk because both
  go forward.
- A random check of 30 Tier B includes found about 26 clearly in scope.

`to_screen_rayyan_suggested.ris` carries each suggestion as a keyword
(`SUGGEST_INCLUDE`, `SUGGEST_MAYBE`, `SUGGEST_EXCLUDE`) so the decisions can be
confirmed in bulk in Rayyan. Final decisions are the reviewer's. In the
methods, report this as rule-assisted screening with human verification.

### Screening rules

| Paper is about | Decision |
|---|---|
| Cybercrime, fraud or scams, hacking, deepfakes, cyberbullying, online harassment, sextortion or image abuse, online child abuse | Include |
| Bangladesh's cyber laws (DSA, CSA, Ordinance, ICT Act), including their use against speech | Include (tag: speech) |
| Awareness or protective-behaviour surveys about cyber threats | Include (tag: awareness) |
| Crime is one of several main factors; or no abstract; or digital evidence, surveillance or shutdowns in general | Maybe |
| Bangladesh or South Asia is one case among several from other regions | Maybe |
| Fraud or harassment is one item in a list; or payment or fintech adoption and trust; or offline scams | Exclude: not cybercrime |
| News, opinion, idea pitches, posters | Exclude: not research |
| Rest of South Asia and purely technical | Exclude: wrong field |

## Final title/abstract screening (2026-11-17)

The reviewer checked the suggestions in `screening_check.xlsx` and accepted them
without changes.

| PRISMA-ScR step | Records |
|---|---|
| Identified (OpenAlex: Tier A 603, Tier B 1,604) | 2,207 |
| Duplicates removed | 106 |
| Screened (title/abstract) | 2,101 |
| Excluded at title/abstract stage | 306 (135 by rule, 131 on title, 40 on abstract) |
| Taken forward | 1,795 (Tier A 341 for full text; Tier B 1,454 charted from abstracts) |

Full texts: `scripts/download_pdfs.py` downloads the open-access PDFs on a local
machine into `pdfs/`, which is git-ignored for copyright reasons.
