# Paper 2: collecting the news corpus on your laptop (Windows)

The cloud session cannot reach the Wayback Machine or cirt.gov.bd, so collection runs on your computer.
All stages **resume** where they stopped, so you can run them over several days. Send me the output of
`status` (step 6) after each session, and the `.backfill-cyber` results at the end.

## 1. Get the latest code (once)
Open **Command Prompt** and run:
```
E:
cd "E:\crime auto\bangladesh-crime-monitor"
git fetch origin
git checkout claude/kind-carson-l4m0vg
git pull
```

## 2. Python environment (once)
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-research.txt
```
(Next time, just run `cd backend` then `.venv\Scripts\activate`.)

## 3. AI key for extraction (once)
1. Go to https://aistudio.google.com and sign in, then **Get API key** and **Create API key**.
2. Open `backend\.env` in Notepad (create it if it doesn't exist) and add this line:
   ```
   GEMINI_API_KEY=paste-your-key-here
   ```
3. **Never paste the key into the chat or commit it.** `.env` is git-ignored.

## 4. Find and download articles (about 1–3 days, can be stopped and resumed)
```
python backfill.py --topic cyber discover
python backfill.py --topic cyber fetch --limit 1000
```
Repeat the `fetch` line until `status` shows nothing left to fetch.

## 5. National CERT advisories (once)
```
python backfill.py --topic cyber cirt
```
If it fails (gov.bd sometimes blocks), tell me. It is optional for the first draft.

## 6. Check progress (any time)
```
python backfill.py --topic cyber status
```
Copy the output and send it to me.

## 7. AI extraction (daily free quota)
```
python backfill.py --topic cyber extract --max-calls 200
```
Run this once a day until `status` shows everything is extracted. The free quota is limited, which is why it runs in daily steps.

## 8. Send me the results
When extraction is done, zip the folder `backend\.backfill-cyber` and upload the zip here.
It contains names from news reports, so **don't share it publicly**. The repo already ignores it.

## Troubleshooting
- `python` not found: install Python 3.11+ from python.org and tick "Add to PATH".
- `pip` errors: send me the last 20 lines of the error.
- A stage stops halfway: just run the same command again, because it resumes.
