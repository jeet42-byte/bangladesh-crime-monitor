# Research Methodology Assignment: Research Question 4

**RQ4:** *What challenges do lawyers face as they strive to pursue justice within legal institutions?*
Course teacher: Sumaiya Iqbal · Individual qualitative report, ≤ 3,000 words, 10 marks.

There are three individual reports, each with its own analytical angle so the three submissions are clearly different:

| Author | Report angle | Focal themes | File |
|---|---|---|---|
| Minhaz Ahamed Khan Nabin (Roll 27) | *Justice by Date*: institutional delay and procedural obstruction | T1, T2, T3, T7 | `output/RQ4_Report_Minhaz_Ahamed_Khan_Nabin.docx` |
| Md. Jubaer Islam Apon (Roll 1) | *Justice Out of Reach*: client-side barriers to access to justice | T5, T3, T1, T7 | `output/RQ4_Report_Md_Jubaer_Islam_Apon.docx` |
| Tanvir Ahmed Siddique (Roll 28) | *Between Duty and Pressure*: integrity, influence and professional strain | T4, T6, T2, T7 | `output/RQ4_Report_Tanvir_Ahmed_Siddique.docx` |

Each report contains the sections the instructions require: (a) Introduction, (b) Methodology, (c) Findings from thematic analysis with quotations, plus the **coding paradigm** (Strauss & Corbin paradigm model) and a coding framework table, and (d) Research limitations and Conclusion. They also include a respondent profile table, a Braun & Clarke phases table, five figures, references, and appendices (interview guide and full coding framework).

Each student also has a **separate questionnaire document** with its own questions (Nabin 12, Apon 11, Tanvir 10, each built around that report's angle). It contains the consent script, the questions, and one form per respondent with name, roll and batch at the top. The same forms are attached at the end of each report as **Appendix C. Completed questionnaires**.

- `output/RQ4_Questionnaire_<author>.docx`: print it and take it to the interviews.
- `output/RQ4_Interview_Transcripts_and_Coding_Sheet.docx`: an illustrative example of how answers are coded.

## Filling in names, roll and batch

Everything personal lives in `data/study.json`:

- `course`: institution, programme, batch, course code, teacher's designation, submission date.
- `people.authors.<key>.roll`: the three authors' rolls.
- `people.respondents[]`: name and roll for each respondent. Optional fields are `profile` (e.g. "Male, 5 years"), `practice`, `interview` (date, mode and duration) and `consent: true`.
- `papers.<key>.responses`: the **real** answers, e.g. `"Mamun": ["answer to Q1", "answer to Q2", ...]`. These fill the answer boxes in Appendix C and in the questionnaire document. Boxes with no answer stay blank.

## Important: the responses are placeholders

The answers for R1–R10 in `data/study.json` are **illustrative worked examples**, not real interviews. Do not attribute them to real classmates. The assignment requires findings from interviews you actually conduct, so:

1. **Interview your batchmates** using your own questionnaire document. Respondents (from the MCCJ 2025–26 nominal roll): Mohammad Mobarak Hosen (25), Nafiul Hoque Kingshuk (22), Shams Bin Sharif Taj (14), Tashfia Ali (41), Shohag (roll to confirm), Marzia Rahman (29), Imran Mridha (33), Abdullah Al Mamun (2), Md. Akram Hossain Rifat (38) and Ahnaf Akif (24). Each author should swap themselves out if they appear on another author's list. Ten interviews of 20–30 minutes each is realistic in two or three days.
2. **Enter the real answers** in `data/study.json`: the respondent profile, the `text` of each answer, and the `codes` you assign. Keep respondents anonymised as R1–R10 in the report.
3. **Rebuild** (below). All charts, tables, counts, the word count and every quotation are regenerated from the data.
4. **Revise the prose** in `papers/<author>.md` so it matches what your respondents actually said. Some numbers in the prose are typed by hand (e.g. "mentioned by eight respondents"), so re-check them against `data/stats.json`. Update the paradigm boxes under `papers` in `data/study.json`.
5. Fill in the `[ ]` placeholders: roll, batch, date, interview mode, dates and duration.
6. Verify the pending-case and judge figures in each Introduction against the latest Supreme Court statistics.

## Rebuild

```bash
bash tools/build.sh        # needs python3 + matplotlib, and node with the `docx` package
```

`tools/charts.py` draws the figures into `charts/` and writes `data/stats.json`. `tools/build_docx.js` turns `papers/*.md` into the Word files in `output/`, and `tools/toc.py` fills the contents page with page numbers (two-pass build).

**Paper markup:** `## / ###` headings, `**bold**`, `*italic*`, `[[Q:R3:Q7]]` inserts respondent R3's answer to Q7 as a quotation, `[[FIG:file.png|caption]]`, `[[TABLE:profile|…]]`, `[[TABLE:phases|…]]`, `[[TABLE:framework:T1,T2|…]]`, `[[STAT:codes]]`, `[[STAT:segments]]`, `[[APPENDIX]]`.
