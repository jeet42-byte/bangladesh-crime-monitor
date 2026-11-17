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
