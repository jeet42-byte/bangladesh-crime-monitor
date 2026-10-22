# Study Hub

A static study site for GitHub Pages: no build step, no framework, no backend. Open `index.html` locally or publish the folder with GitHub Pages.

| Section | What it does |
|---|---|
| **Exams** | Interactive MCQ banks: hints, instant green/red marking with the right answer ticked, explanation + textbook/slide reference, filters (topic, wrong-only, unanswered), "highest probability first" ordering. Short-essay practice with saved drafts, key-point checklists and model answers. A probability-analysis tab ranks every syllabus topic. |
| **Resources** | Downloadable slides, book chapters and notes, grouped by course. |
| **Grade & CGPA** | Marks needed out of 50 in the final for each grade or a target grade point, a "what if I score X" check, and a CGPA / target-CGPA calculator. |
| **Assignments** | Instructions, suggested headings, definitions, theories, classifications, APA 7 references with in-text citations, and an APA citation helper. |
| **Forecast** | Countdowns to exams, important dates, notices and the class routine. TBA dates can be set personally. |

Student progress (answers, drafts, marks, personal dates) is stored in each visitor's browser only.

## Adding content

Everything lives in `data/`. Each file calls `HUB.add(kind, …)`, so adding a course never touches the view code.

- **New course** → add an entry to `data/courses.js`.
- **New quiz** → copy `data/quizzes/research-methods-ch3.js`, change `id`/`course`/questions, and add a `<script>` line for it in `index.html`.
  - MCQ fields: `t` topic id, `q` question, `o` options, `a` index of the correct option (0 = A), `h` hint, `e` explanation, `r` reference.
  - Topic factors `S`, `D`, `E`, `F` (0–1) drive the probability score: `45·S + 25·D + 15·E + 15·F`.
- **Files to download** → put them in `resources/<course-id>/` and list them in `data/resources.js`.
- **Assignment guides** → `data/assignments.js` (every section is optional).
- **Dates, notices, class routine** → `data/schedule.js`. Use `date: null` while a date is TBA.
- **Grading scale / mark distribution** → `data/grading.js` (default: UGC Bangladesh uniform grading, final out of 50).

## Publishing on GitHub Pages

1. Push this folder's contents to the root of a repository (e.g. `study-hub`).
2. Repository → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)`.
3. The site appears at `https://<username>.github.io/study-hub/`.

Copyrighted textbook scans should be shared through a private class drive rather than committed to a public repository; link them with `url` in `data/resources.js`.
