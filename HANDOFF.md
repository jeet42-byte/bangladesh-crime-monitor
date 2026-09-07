# Handoff — Bangladesh Crime Monitor

State as of **7 September 2026**. Written so a fresh session can resume
without re-deriving anything. Read this first, then `README.md` for setup.

---

## 1. Live services

| Piece | URL / identifier |
|---|---|
| Dashboard | https://bangladesh-crime-monitor.vercel.app |
| API | https://bd-crime-monitor-api.onrender.com (docs disabled) |
| Repo | https://github.com/jeet42-byte/bangladesh-crime-monitor |
| Database | Neon `bangladesh-crime-monitor`, PostgreSQL 18.6, `aws-ap-southeast-1` |
| Render service | `srv-daf0it9t0dsc73c1mjn0` |
| Neon direct host | `ep-holy-shadow-b3fe2isl.c-4.ap-southeast-1.aws.neon.tech` |
| Neon pooled host | `ep-holy-shadow-b3fe2isl-pooler.c-4.ap-southeast-1.aws.neon.tech` |

Local working copy: `E:\crime auto\bangladesh-crime-monitor`

**Data:** ~83 incident records. Sources: news portals (majority) + 6 CID
official press releases. One owner account (`ahnaf`).

---

## 2. Security items still open

- [ ] **Rotate the Neon database password.** It was printed by `neonctl`
      during setup and has been through an assistant context. Neon console →
      Branches → Roles → reset, then update `DATABASE_URL` on Render.
- [x] **Gemini API key — already dead.** The previous key was committed into
      this file, Google's secret scanning caught it on a public repository and
      revoked it automatically. Ingestion stops working until a new key is
      issued. Delete the old key object and mint a replacement:
      ```
      gcloud services api-keys delete 774a0899-3a16-4727-838c-44eabb195c81
      gcloud services api-keys create --display-name="Bangladesh Crime Monitor" \
        --api-target=service=generativelanguage.googleapis.com
      ```
      Then set `GEMINI_API_KEY` on Render and as a GitHub secret.

> **Never put a live credential in this file.** It is committed to a public
> repository. Reference secrets by name, by key ID, or by where they are
> stored — never by value.
- [x] Owner password — changed by the owner through `/account`.
      `OWNER_PASSWORD_FORCE` is set to `false`; leave it that way or a restart
      will overwrite the chosen password.

---

## 3. Environment variables

**Render** (set): `DATABASE_URL`, `INGEST_API_KEY`, `GEMINI_API_KEY`,
`GEMINI_MODEL`, `CORS_ORIGINS`, `SECRET_KEY`, `ALLOW_REGISTRATION`,
`OWNER_EMAIL`, `OWNER_USERNAME`, `OWNER_PASSWORD`, `OWNER_PASSWORD_FORCE`,
`PUBLIC_API=false`, `ENABLE_DOCS=false`, `LOG_LEVEL`, `PYTHON_VERSION`

**Render (NOT set — blocks signup):** `RESEND_API_KEY`

**GitHub secrets:** `BACKEND_URL`, `INGEST_API_KEY`, `GEMINI_API_KEY`

**Vercel:** `NEXT_PUBLIC_API_BASE_URL`

---

## 4. Blocking issue

**`RESEND_API_KEY` is unset, so "Create account" returns 503.** Since
Analytics / Archive / Methodology are gated behind an account, nobody but the
owner can currently get past the Command Center. Get a key at resend.com and
set it on Render — that is the single highest-value action outstanding.

The 503 is deliberate: with no provider the app refuses rather than telling
someone to check an inbox while writing the code to a log.

---

## 5. Things that are deliberate, not bugs

Re-investigating these wastes a session. Each was tested.

**Deploys are manual.** Neither Render nor Vercel auto-deploys on push — the
GitHub App is not installed on the account, and `vercel git connect` fails.
Render deploys via API POST; Vercel via `vercel deploy --prod --yes` from
`frontend/`. Render's `autoDeploy: yes` setting is misleading; it does not
fire.

**bdnews24, Jugantor, Kaler Kantho are excluded.** They serve Cloudflare
interstitials to all automated clients, including through a text-extraction
proxy. The decision was not to route around it. Four Bengali outlets that do
publish open feeds were added instead.

**`cid.gov.bd` and `police.gov.bd` are unreachable from GitHub runners**
(ConnectError, not 403). Official records need a manual top-up from a machine
that can reach `.gov.bd`:
```bash
python backend/run_scrapers.py --backend-url "$BACKEND_URL" \
  --ingest-key "$INGEST_API_KEY" --lookback-hours 400
```

**Telegram is off by default.** Of 25 Bangladeshi channels probed, only The
Daily Star's still posts, and it duplicates that outlet's RSS. Enable with
`--with-telegram` if wanted.

**Every other social platform is closed.** Facebook (Cloudflare), Instagram
(429), X/Twitter (429, Nitter dead), Reddit (403, OAuth required), LinkedIn
(login wall), Bluesky and Mastodon (reachable, no Bangladesh content).

**`GEMINI_MODEL` is a floating alias**, not pinned. `gemini-2.0-flash` was
retired mid-project and every call 404'd silently. `gemini-flash-latest` has
no free-tier quota — use `gemini-flash-lite-latest`.

**The API is closed on purpose.** `PUBLIC_API=false` gates reads behind a
session; the site mints anonymous guest tokens via `POST /auth/guest`. Set
`PUBLIC_API=true` to reopen without a code change. This deters scraping, it
does not prevent it — guest tokens are issued to anyone, because browsers
need them.

**`/corrections` is outside the account gate on purpose.** Someone who finds
a record naming them must be able to request removal without registering.

---

## 6. Known data-quality limits

All documented on `/methodology`; do not "fix" them silently.

- Outside Dhaka, locations are **district centroids** — markers can be tens of
  kilometres off. Only the 50 DMP thanas have thana-level precision.
- Unplaceable incidents are **discarded, not pinned**. An earlier bug pinned
  them to Ramna and manufactured a fake hotspot; 16 such records were deleted.
- Cold-case reports are dated to the **announcement**, not the offence. The
  date clamp that fixes hallucinated years cannot tell a real historical date
  from an invented one.
- Deduplication is **headline-based**, so the same incident under a Bengali
  and an English headline survives twice.
- Without a Gemini key the pipeline inserts **nothing** — the heuristic
  extractor caps confidence at 0.4, below the 0.45 gate. That gate is what
  stops garbage like a Miami plane crash being filed as a Dhaka homicide.

---

## 7. Next planned work

1. **Risk analysis section** — the owner's stated next feature.
2. **Expose `verification_level` through the API** and add a "Live Signals"
   strip to the Command Center. The column, corroboration logic and 30-minute
   cadence all exist; only the presentation layer is missing.
3. **Password reset flow** — schema reserves `password_reset` but no endpoint
   uses it. Needs the email provider first.
4. **Verify the scheduled cron actually fires.** Every run so far has been
   `workflow_dispatch`. Check with:
   `gh run list --workflow=ingest_cron.yml` and look for `schedule` in the
   event column.

---

## 8. Local development

```bash
# backend
cd backend && python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000        # needs backend/.env

# frontend
cd frontend && npm install && npm run dev
```

`backend/.env` and `frontend/.env.local` are gitignored and hold working local
config. Set `ALLOW_CONSOLE_EMAIL=true` locally to print verification codes to
the log instead of emailing them.

Migrations run in order: `init_schema.sql` → `002_auth.sql` →
`003_live_signals.sql`.

**Do not run `npm run build` while `npm run dev` is running** — they share
`.next` and the dev server starts serving unstyled pages. Kill node, delete
`.next`, restart.
