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
