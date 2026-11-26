# Study 1 measurement

| File | Role |
|---|---|
| `measure.py` | Collects raw, passive observations per domain: DNS via 1.1.1.1 and 8.8.8.8, one web visit, two TLS handshakes. Saved to `raw/<round>/<domain>.json` |
| `outcomes.py` | Applies the pre-registered definitions (protocol §6) and writes `results_<round>.csv` |
| `test_outcomes.py` | Unit tests for those definitions |

`raw/` and `results_*.csv` are **git-ignored**. They show which named institutions are spoofable, and the protocol (§9) says those results are released only in aggregate.

## Run on the laptop (Command Prompt)

Once only, install the DNS library into the Paper 2 environment:
```
E: && cd "E:\crime auto\bangladesh-crime-monitor\backend" && .venv\Scripts\python.exe -m pip install dnspython
```

**Pilot** (10 domains; declared as a pilot, used only to test the script):
```
cd "E:\crime auto\bangladesh-crime-monitor\research\study1-email-web-posture\measure"
..\..\..\backend\.venv\Scripts\python.exe measure.py ..\frame\frame_FIN_v1.csv --round pilot --limit 10
..\..\..\backend\.venv\Scripts\python.exe outcomes.py raw\pilot
```

**Round 1:** only after OSF registration.
```
..\..\..\backend\.venv\Scripts\python.exe measure.py ..\frame\frame_FIN_v1.csv ..\frame\frame_GOV_v1.csv --round 1
..\..\..\backend\.venv\Scripts\python.exe outcomes.py raw\1
```
That takes about 30–60 seconds per domain, so about 2 hours for 160 domains. It resumes if stopped.
