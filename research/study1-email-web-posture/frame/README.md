# Building the Study 1 domain frame

The frame is the list of institutions and their official domains. It must be **checked against the official lists and frozen before OSF registration** (protocol §4, §7.1).

## Files

| File | What it is |
|---|---|
| `seed_FIN.csv` | **Draft** list of banks, MFS and PSPs, written from memory. **Unverified.** Domains marked "uncertain" or "CHECK" need extra care |
| `check_frame.py` | Visits each homepage once and records whether the domain works, redirects, the page title and the email domains the site publishes |
| `checked_FIN.csv` | Output of the check (you create it on the laptop) |
| `sources/` | Save the official lists here (PDF or screenshot) with the date you downloaded them |

## Steps (laptop, Command Prompt)

```
E:
cd "E:\crime auto\bangladesh-crime-monitor"
git pull
cd research\study1-email-web-posture\frame
..\..\..\backend\.venv\Scripts\python.exe check_frame.py seed_FIN.csv
```

That takes about 3 minutes for 75 institutions. It can run while the Paper 2 download continues; it uses a different folder.

Then:
1. **Download the official lists** and save them in `sources/` with the date:
   - Bangladesh Bank, *Scheduled Banks* (bb.org.bd → About Us → Banks & FIs)
   - Bangladesh Bank, *MFS providers* and *PSP / PSO licensees* (Payment Systems Department)
2. **Compare** `checked_FIN.csv` with the lists:
   - **Missing institution?** Add a row.
   - **Institution that no longer exists or has merged?** Note it in `notes`. The 2025 Islamic-bank merger is flagged.
   - **Page title doesn't match the institution?** The domain is wrong. Find the right one from the regulator's link.
   - **`redirects_off_domain = yes`?** Record where it goes. For example, foreign banks often redirect to a global site.
   - **`mail_domains_seen`** shows a different domain (e.g. the bank's site is `abc.com.bd` but its emails use `abcbank.com`)? Note it. Both domains are measured.
3. Upload `checked_FIN.csv` here. I'll make the corrections and build the next sectors in the same way.
