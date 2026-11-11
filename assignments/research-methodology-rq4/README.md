# Research Methodology Assignment: Research Question 4

**RQ4:** *What challenges do lawyers face as they strive to pursue justice within legal institutions?*
Course teacher: Sumaiya Iqbal · Individual qualitative report, ≤ 3,000 words, 10 marks.

There are three individual reports, each with its own analytical angle so the three submissions are clearly different:

| Author | Report angle | Focal themes | File |
|---|---|---|---|
| Barrister M.A. Khan Nabin | *Justice by Date*: institutional delay and procedural obstruction | T1, T2, T3, T7 | `output/RQ4_Report_Barrister_M_A_Khan_Nabin.docx` |
| Apon Sikder | *Justice Out of Reach*: client-side barriers to access to justice | T5, T3, T1, T7 | `output/RQ4_Report_Apon_Sikder.docx` |
| Tanvir Ahmed Siddique | *Between Duty and Pressure*: integrity, influence and professional strain | T4, T6, T2, T7 | `output/RQ4_Report_Tanvir_Ahmed_Siddique.docx` |

Each report contains the sections the instructions require: (a) Introduction, (b) Methodology, (c) Findings from thematic analysis with quotations, plus the **coding paradigm** (Strauss & Corbin paradigm model) and a coding framework table, and (d) Research limitations and Conclusion. They also include a respondent profile table, a Braun & Clarke phases table, five figures, references, and appendices (interview guide and full coding framework).

Supporting documents:

- `output/RQ4_Fieldwork_Interview_Guide.docx`: printable interview pack with the interview schedule, consent script, profile sheet and the 12 semi-structured questions with probes and answer boxes.
- `output/RQ4_Interview_Transcripts_and_Coding_Sheet.docx`: every answer with its codes, plus a code key with frequencies. Useful as an annex.

## Important: the responses are placeholders

The answers for R1–R10 in `data/study.json` are **illustrative worked examples**, not real interviews. Do not attribute them to real classmates. The assignment requires findings from interviews you actually conduct, so:

1. **Interview your batchmates** using the fieldwork pack. Planned respondents: Mobarak, Nafiul Haque Kingshuk, Taj, Tashfia Ali, Shohag, Marzia Rahman, Imran Mridha, Mamun (Roll 2), Akram (Roll 38), and one more. Each author should swap themselves out if they appear on another author's list. Ten interviews of 20–30 minutes each is realistic in two or three days.
2. **Enter the real answers** in `data/study.json`: the respondent profile, the `text` of each answer, and the `codes` you assign. Keep respondents anonymised as R1–R10 in the report.
3. **Rebuild** (below). All charts, tables, counts, the word count and every quotation are regenerated from the data.
4. **Revise the prose** in `papers/<author>.md` so it matches what your respondents actually said. Some numbers in the prose are typed by hand (e.g. "mentioned by eight respondents"), so re-check them against `data/stats.json`. Update the paradigm boxes under `papers` in `data/study.json`.
5. Fill in the `[ ]` placeholders: roll, batch, date, interview mode, dates and duration.
6. Verify the pending-case and judge figures in each Introduction against the latest Supreme Court statistics.

## Rebuild

```bash
bash tools/build.sh        # needs python3 + matplotlib, and node with the `docx` package
```

`tools/charts.py` draws the figures into `charts/` and writes `data/stats.json`. `tools/build_docx.js` turns `papers/*.md` into the Word files in `output/`.

**Paper markup:** `## / ###` headings, `**bold**`, `*italic*`, `[[Q:R3:Q7]]` inserts respondent R3's answer to Q7 as a quotation, `[[FIG:file.png|caption]]`, `[[TABLE:profile|…]]`, `[[TABLE:phases|…]]`, `[[TABLE:framework:T1,T2|…]]`, `[[STAT:codes]]`, `[[STAT:segments]]`, `[[APPENDIX]]`.
