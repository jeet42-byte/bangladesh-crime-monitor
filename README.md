# Bangladesh Crime Monitor

Continuous open-source crime tracking for Bangladesh: a scheduled OSINT
pipeline, a public read-only API, and an intelligence dashboard — running
entirely on free-tier infrastructure.

| Layer | Technology | Host | Free-tier limit that matters |
|---|---|---|---|
| Database | PostgreSQL 16 (+ PostGIS, pg_trgm) | Neon | 0.5 GB storage, scale-to-zero |
| API | FastAPI + async SQLAlchemy | Render | sleeps after 15 min idle |
| Ingestion | Python collectors + Gemini Flash | GitHub Actions | 2,000 min/month |
| Frontend | Next.js 14, Tailwind, Leaflet, Recharts | Vercel | 100 GB bandwidth/month |

```
bangladesh-crime-monitor/
├── .github/workflows/ingest_cron.yml   cron: every 6 hours
├── backend/
│   ├── app/
│   │   ├── api/          deps.py + v1/{crimes,ingest,analytics}.py
│   │   ├── core/         config.py
│   │   ├── db/           database.py, models.py
│   │   ├── parsers/      llm_extractor.py
│   │   ├── scrapers/     news_scraper.py, fb_scraper.py
│   │   ├── utils/        thana_coordinates.py
│   │   └── main.py
│   ├── db_migrations/init_schema.sql
│   ├── requirements.txt, .env.example, run_scrapers.py
├── frontend/
│   └── src/{app,components,lib,types}
├── render.yaml
└── scaffold.sh
```

---

## How data flows

```
RSS feeds + public FB pages
        │  keyword gate (drops ~90% before any model call)
        ▼
  Gemini Flash, JSON schema output
        │  title, summary, category, date, thana, statutes
        ▼
  thana gazetteer  → canonical thana + centroid lat/lon
        │
  SHA-256(date | thana | title) → raw_content_hash
        ▼
  POST /api/v1/ingest/batch   (X-Ingest-Key)
        │  ON CONFLICT (raw_content_hash) DO NOTHING
        ▼
  Neon PostgreSQL  →  public read API  →  dashboard
```

The hash is the idempotency story: the cron job can replay the same window
forever and insert nothing new, and outlets whose headlines normalise alike
collapse into one row. It does **not** catch every duplicate — a Bengali
headline and an English one about the same incident hash differently and both
survive. Genuine near-duplicate collapse needs embedding similarity, which
does not fit inside a free LLM quota.

---

## Phase 6 — deployment checklist

Prerequisites: a GitHub account, Node 18.17+, Python 3.11+, and `psql`.

### 1. Neon — database

1. Create a project at <https://neon.tech> (region **AWS ap-southeast-1**, the
   closest to Bangladesh).
2. Enable PostGIS from the Neon SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Copy the **pooled** connection string (its host contains `-pooler`).
4. Run the schema:

```bash
psql "postgresql://neondb_owner:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f backend/db_migrations/init_schema.sql
```

Expect `NOTICE: Schema ready. jurisdictions seeded: 50 rows.` Verify:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM jurisdictions;"
```

### 2. Local run (do this before deploying)

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # then fill DATABASE_URL, INGEST_API_KEY, GEMINI_API_KEY
uvicorn app.main:app --reload
```

Generate a strong ingest key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Check it works, then try a dry-run scrape (writes nothing):

```bash
curl http://127.0.0.1:8000/health
python run_scrapers.py --lookback-hours 48 --dry-run
```

### 2b. Running against a local PostgreSQL instead of Neon

Neon is the deployment target, but the whole pipeline runs against any
PostgreSQL 14+. Useful when you want to exercise ingestion without touching
the hosted database.

`app/db/database.py` detects a `localhost` / `127.0.0.1` host and skips the
TLS requirement — a development Postgres usually has no TLS listener, while
anything remote is still certificate-verified.

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:5432/bdcrime
INGEST_API_KEY=any-local-string
CORS_ORIGINS=http://localhost:3000
```

PostGIS is optional: `init_schema.sql` guards the geometry columns and logs
`PostGIS not installed; skipping geometry columns.` when the extension is
absent. Everything except the GiST index works without it.

Then, in three terminals:

```bash
uvicorn app.main:app --port 8000                      # backend/
python run_scrapers.py --backend-url http://127.0.0.1:8000 --ingest-key any-local-string --lookback-hours 96
npm run dev                                           # frontend/
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env.local`.

> Without `GEMINI_API_KEY` the run inserts **nothing**: the heuristic
> extractor caps its confidence at 0.4 and the default `--min-confidence`
> is 0.45. To generate throwaway local data anyway, pass
> `--min-confidence 0.0` — and read the warning under *Extraction quality*
> below before trusting a single row of it.

### 3. Render — API

1. Push the repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Instance Type: **Free**
   - Health Check Path: `/health`
4. Environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `INGEST_API_KEY` | the token generated above |
   | `GEMINI_API_KEY` | from <https://aistudio.google.com/apikey> |
   | `CORS_ORIGINS` | `https://YOUR-APP.vercel.app,http://localhost:3000` |
   | `PYTHON_VERSION` | `3.11.9` |

5. Deploy, then confirm:

```bash
curl https://YOUR-SERVICE.onrender.com/health
```

> `render.yaml` in the repo root does steps 3.1–3.3 for you if you use
> Render's Blueprint flow; the four secret values still have to be pasted.

**Koyeb alternative** (no sleep on the free tier):

```bash
koyeb app init bd-crime-monitor \
  --git github.com/YOUR-USER/bangladesh-crime-monitor \
  --git-branch main \
  --git-build-command "pip install -r backend/requirements.txt" \
  --git-run-command "uvicorn app.main:app --host 0.0.0.0 --port 8000" \
  --ports 8000:http --routes /:8000 \
  --env DATABASE_URL=@database-url \
  --env INGEST_API_KEY=@ingest-key \
  --env GEMINI_API_KEY=@gemini-key \
  --env CORS_ORIGINS=https://YOUR-APP.vercel.app
```

### 4. GitHub Actions — the cron scraper

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value | Required |
|---|---|---|
| `BACKEND_URL` | `https://YOUR-SERVICE.onrender.com` (no trailing slash) | yes |
| `INGEST_API_KEY` | must match Render **exactly** | yes |
| `GEMINI_API_KEY` | Google AI Studio key | recommended |
| `FB_PAGE_ACCESS_TOKEN` | Meta Page token | optional |

Or from the CLI:

```bash
gh secret set BACKEND_URL --body "https://YOUR-SERVICE.onrender.com"
gh secret set INGEST_API_KEY --body "PASTE_THE_SAME_KEY"
gh secret set GEMINI_API_KEY --body "PASTE_GEMINI_KEY"
```

Trigger the first run by hand rather than waiting six hours:

```bash
gh workflow run ingest_cron.yml -f lookback_hours=48
gh run watch
```

Without `GEMINI_API_KEY` the pipeline still runs — it falls back to a keyword
extractor and produces lower-confidence rows, which `run_scrapers.py` filters
at `--min-confidence`.

### 5. Vercel — frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000

npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
# paste: https://YOUR-SERVICE.onrender.com
vercel --prod
```

Or through the dashboard: **New Project** → import the repo → Root Directory
`frontend` → add `NEXT_PUBLIC_API_BASE_URL` → Deploy.

**Finally**, go back to Render and set `CORS_ORIGINS` to the real Vercel
domain. A blank dashboard with data present in the API is almost always this
step being skipped.

---

## Verifying the whole chain

```bash
curl -s "$BACKEND_URL/health"
curl -s "$BACKEND_URL/api/v1/analytics/summary" | head -c 400
curl -s "$BACKEND_URL/api/v1/crimes/feed?limit=3" | head -c 400
psql "$DATABASE_URL" -c "SELECT crime_category, COUNT(*) FROM crime_incidents GROUP BY 1 ORDER BY 2 DESC;"
```

Re-running the ingest immediately should insert nothing:

```json
{ "inserted": 0, "duplicates_skipped": 37, "received": 37 }
```

That is the deduplication working, not a failure.

---

## Business intelligence

`vw_powerbi_directquery` flattens the schema for DirectQuery connectors: no
arrays, no UUIDs, date parts pre-expanded in Asia/Dhaka, plus a
`severity_weight` column for bubble sizing.

Power BI → Get Data → PostgreSQL → host from the Neon string, database
`neondb`, **DirectQuery** → select `vw_powerbi_directquery`.

---

## Extraction quality

**Gemini is not optional in practice.** Without `GEMINI_API_KEY` the pipeline
falls back to a keyword classifier whose output is poor enough that the
default confidence gate rejects all of it. Observed on a live 96-hour window
with the gate forced open:

- A cargo-plane crash in **Miami** (`prothomalo.com/world/usa/...`) was filed
  as `Homicide` in `Airport` thana, Dhaka — "নিহত" matched the homicide
  lexicon and "runway" fuzzy-matched the Airport gazetteer entry.
- "More than 140 killed in latest **Yemen** clashes" was filed as `Homicide`
  in `Ramna`.
- 15 of 23 rows were classified `Homicide`; 7 landed on the Ramna fallback
  centroid because no thana could be recovered.

The keyword gate has no concept of *where* an incident happened or *whether
it is a crime at all*. Gemini's `is_crime_report` flag and its
"in Bangladesh" instruction are what actually enforce both. Treat heuristic
rows as a liveness check for the plumbing, never as data.

### Redaction

Redaction runs in two independent passes, because an instruction to a model
is not an enforcement mechanism:

1. The Gemini prompt is told to omit names, minors, addresses and contact
   details.
2. `redact()` in `llm_extractor.py` then strips phone numbers, emails and
   NID/passport identifiers from **every** title and narrative, on every
   path, before the record is built.

Pass 2 cannot remove personal names — no regex reliably can, across Bengali
and English prose. This is why the heuristic path publishes a generated
placeholder narrative rather than article text: Bangladeshi crime reporting
routinely prints the full names and ages of arrested people, and with no
model in the loop there is nothing to strip them.

## Operating notes

- **Cron cadence vs. lookback.** The workflow runs every 6 hours with an
  8-hour lookback. The overlap is deliberate — a late feed update is picked up
  on the next pass, and the content hash absorbs the repeats.
- **Free-tier Gemini** allows roughly 1,500 requests/day. The keyword gate
  keeps a run to 30–60 model calls, so four runs a day sit well inside it.
- **Neon scale-to-zero** means the first query after idle takes a few seconds.
  `pool_pre_ping` and the API's retry logic cover it.
- **Adding a thana**: add the row to `init_schema.sql`, the entry to
  `THANA_COORDINATES`, and any alias to `_RAW_ALIASES`. All three, or the
  gazetteer and the database disagree.

## Scope and ethics

Only material that is already public is collected: syndication feeds published
by news outlets, and posts published openly by official accounts. No private
group, closed account, or authenticated surface is read.

Records describe **allegations as reported**, not adjudicated findings, and are
de-identified at extraction. See `/methodology` on the deployed site for the
full statement, the confidence-scoring criteria, and the corrections process.
