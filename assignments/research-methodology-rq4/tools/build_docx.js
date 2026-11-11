// Builds the Word documents from papers/*.md + data/study.json + charts/*.png
// Run: node tools/build_docx.js   (after python3 tools/charts.py)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
  Footer, Header, PageNumber, LevelFormat, TableOfContents, LineRuleType,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "data/study.json"), "utf8"));
const ST = JSON.parse(fs.readFileSync(path.join(ROOT, "data/stats.json"), "utf8"));
const OUT = path.join(ROOT, "output");
fs.mkdirSync(OUT, { recursive: true });

const FONT = "Times New Roman";
const PAGE_W = 11906, MARGIN = 1440, CONTENT_W = PAGE_W - 2 * MARGIN; // A4
let ACCENT = "1F4E79", CUR = null;
const C = S.course, PEOPLE = S.people;
const NUMW = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen"];
function tint(hex, f = 0.88) { const n = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); return n.map(v => Math.round(v + (255 - v) * f).toString(16).padStart(2, "0")).join("").toUpperCase(); }
const resp = Object.fromEntries(S.respondents.map(r => [r.id, r]));
const theme = Object.fromEntries(S.themes.map(t => [t.id, t]));
const STATS = { codes: String(S.codes.length), segments: String(ST.total_segments), nq: "" };
const DRAFT_NOTE = "DRAFT FOR GUIDANCE: the respondent answers, codes, counts and quotations in this version are illustrative placeholders (R1–R10), not real interview data. Conduct your own interviews, enter the real answers in data/study.json, update the bracketed [ ] details, and rebuild before submitting.";

// ---------- helpers ----------
function runs(text, base = {}) {
  text = text.replace(/\[\[STAT:(\w+)\]\]/g, (_, k) => STATS[k] ?? k);
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean);
  return parts.map(p => {
    if (p.startsWith("***")) return new TextRun({ ...base, text: p.slice(3, -3), bold: true, italics: true });
    if (p.startsWith("**")) return new TextRun({ ...base, text: p.slice(2, -2), bold: true });
    if (p.startsWith("*")) return new TextRun({ ...base, text: p.slice(1, -1), italics: true });
    return new TextRun({ ...base, text: p });
  });
}
const para = (text, opts = {}) => new Paragraph({ children: runs(text, opts.run || {}), spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED, ...opts.p });
const caption = text => new Paragraph({ children: runs(text, { size: 20, italics: false, color: "404040" }), spacing: { before: 60, after: 220 }, alignment: AlignmentType.CENTER, keepLines: true });
function pngSize(file) { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function figure(file, cap) {
  const own = file.replace(/\.png$/, `_${CUR}.png`);
  const f = path.join(ROOT, "charts", fs.existsSync(path.join(ROOT, "charts", own)) ? own : file);
  const { w, h } = pngSize(f);
  const maxW = 600; // px at 96dpi ≈ 6.25in
  const width = maxW, height = Math.round(maxW * h / w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, line: 240, lineRule: LineRuleType.AUTO },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(f), transformation: { width, height },
        altText: { title: cap, description: cap, name: file } })] }),
    caption(cap),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, width, { head = false, shade = null, bold = false } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    shading: head ? { fill: ACCENT, type: ShadingType.CLEAR, color: "auto" } : shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: runs(String(text), { size: 19, bold: head || bold, color: head ? "FFFFFF" : undefined, font: FONT }) })],
  });
}
function table(headers, rows, widths, cap, shadeFn) {
  const total = widths.reduce((a, b) => a + b, 0);
  const out = [];
  if (cap) out.push(new Paragraph({ children: runs(cap, { size: 20, bold: true }), spacing: { before: 200, after: 80 }, keepNext: true }));
  out.push(new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { head: true })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { shade: shadeFn ? shadeFn(ri, r) : (ri % 2 ? "F2F2F2" : null) })) })),
    ],
  }));
  out.push(new Paragraph({ children: [], spacing: { after: 120 } }));
  return out;
}
const attribution = id => {
  const r = resp[id];
  return `${id}, ${r.gender.toLowerCase()}, ${r.area.toLowerCase()}, ${r.years} year${r.years === 1 ? "" : "s"} in practice`;
};
function quote(rid, qid) {
  const a = resp[rid].answers[qid];
  if (!a) throw new Error(`missing ${rid} ${qid}`);
  return new Paragraph({
    indent: { left: 720, right: 720 }, spacing: { before: 60, after: 160 }, alignment: AlignmentType.JUSTIFIED,
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: "2A78D6", space: 8 } },
    children: [new TextRun({ text: `“${a.text}”`, italics: true }), new TextRun({ text: `  (${attribution(rid)})`, size: 20, color: "404040" })],
  });
}
const resp_count = cid => (ST.resp_per_code[cid] || []).length;

// ---------- tables from data ----------
function profileTable(cap) {
  return table(["ID", "Gender", "Years", "Role", "Main forum", "Practice area"],
    S.respondents.map(r => [r.id, r.gender, r.years, r.role, r.forum, r.area]),
    [700, 1000, 750, 2000, 2526, 2050], cap);
}
function phasesTable(cap) {
  const rows = [
    ["1. Familiarisation", "Transcripts were read several times alongside the recordings and notes, and initial impressions were noted in the margins."],
    ["2. Generating initial codes", `Line-by-line open coding produced ${STATS.codes} initial codes across ${STATS.segments} coded segments (Appendix B).`],
    ["3. Searching for themes", "Related codes were clustered into candidate themes, and axial coding with the Strauss and Corbin coding paradigm was used to connect them."],
    ["4. Reviewing themes", "Themes were checked against the coded extracts and the whole dataset using a respondent × theme framework matrix (Figure 3)."],
    ["5. Defining and naming themes", "Seven themes were defined and named, and a central phenomenon was identified for the paradigm model."],
    ["6. Producing the report", "Vivid, representative quotations were selected and the analysis was related back to the research question and the literature."],
  ];
  return table(["Phase (Braun & Clarke, 2006)", "How it was applied in this study"], rows, [2600, CONTENT_W - 2600], cap);
}
function frameworkTable(themeIds, cap) {
  const rows = [];
  const fills = ["EAF1FB", "FFFFFF"];
  themeIds.forEach((tid, ti) => {
    S.codes.filter(c => c.theme === tid).forEach((c, ci) => {
      rows.push({ ti, cells: [ci === 0 ? `**${tid}: ${theme[tid].name}**` : "", `${c.id}  ${c.label}`, `${resp_count(c.id)}/${S.respondents.length}`, (ST.resp_per_code[c.id] || []).join(", ")] });
    });
  });
  return table(["Theme (selective coding)", "Initial code (open coding)", "n", "Respondents"], rows.map(r => r.cells),
    [2500, 3500, 650, CONTENT_W - 6650], cap, ri => fills[rows[ri].ti % 2]);
}
function questionList(qs, out) {
  qs.forEach(q => {
    out.push(new Paragraph({ numbering: { reference: "qs", level: 0 }, spacing: { after: 40 }, children: runs(q.text) }));
    out.push(new Paragraph({ indent: { left: 1080 }, spacing: { after: 120 }, children: runs(`*Probes:* ${q.probes.join(" / ")}`, { size: 20, color: "404040" }) }));
  });
}
function infoTable(rows) {
  const w = [2600, CONTENT_W - 2600];
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: w,
    rows: rows.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(k, w[0], { bold: true, shade: tint(ACCENT) }), cell(v, w[1])] })) });
}
function answerBox(text) {
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    rows: [new TableRow({ height: { value: text ? 400 : 1150, rule: "atLeast" }, cantSplit: true, children: [new TableCell({ width: { size: CONTENT_W, type: WidthType.DXA }, borders,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: text ? runs(text, { size: 21 }) : runs("*Response:*", { size: 18, color: "8C8C8C" }) })] })] })] });
}
// One questionnaire form per named respondent. Answers are filled only from real
// interview data (papers.<key>.responses[name] = [answer1, answer2, ...]).
function respondentForms(key) {
  const P = S.papers[key], A = PEOPLE.authors[key], out = [];
  PEOPLE.respondents.forEach((person, idx) => {
    const ans = (P.responses || {})[person.name] || [];
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: true, children: [new TextRun(`Questionnaire ${idx + 1} of ${PEOPLE.respondents.length}: ${person.name}`)] }));
    out.push(infoTable([
      ["Respondent name", person.name], ["Roll", person.roll], ["Batch", person.batch || C.batch],
      ["Gender / years in practice", person.profile || ""], ["Main court / practice area", person.practice || ""],
      ["Date, mode and duration", person.interview || ""], ["Interviewed by", `${A.name} (Roll ${A.roll}, Batch ${C.batch})`],
      ["Informed consent", person.consent ? "Yes, verbal consent given" : "☐ Yes   ☐ No"],
    ]));
    out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    P.questionnaire.forEach((q, i) => {
      out.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 50 }, children: runs(`**Q${i + 1}.** ${q.text}`, { size: 22 }) }));
      out.push(answerBox(ans[i] || ""));
    });
  });
  return out;
}
function appendix(key) {
  const P = S.papers[key];
  const out = [new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Appendix A. Semi-structured interview questionnaire")] }),
    para(`*Opening:* introduce the study, confirm consent and permission to record, and note the respondent's name, roll, batch, gender, years in practice and main court. The ${NUMW[P.questionnaire.length]} core questions below were asked in every interview; probes were used where helpful.`),
  ];
  questionList(P.questionnaire, out);
  out.push(para("*Closing:* thank the respondent, ask whether there is anything they would like to add, and remind them of confidentiality and their right to withdraw."));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Appendix B. Complete coding framework")] }));
  out.push(...frameworkTable(S.themes.map(t => t.id), null));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Appendix C. Completed questionnaires")] }));
  out.push(para(`This appendix contains the questionnaire completed for each of the ${NUMW[PEOPLE.respondents.length]} respondents interviewed by ${PEOPLE.authors[key].name}. Names appear here for verification by the course teacher only; in the body of the report respondents are anonymised.`));
  out.push(...respondentForms(key).map((x, i) => i === 0 ? x : x));
  return out;
}
function coverPage(key, meta, words) {
  const A = PEOPLE.authors[key], light = tint(ACCENT), W = CONTENT_W;
  const band = (children, fill) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR, color: "auto" },
      borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
      margins: { top: 220, bottom: 220, left: 240, right: 240 }, children })] })] });
  const ctr = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 60 }, children: runs(text, o.run || {}) });
  const half = (W - 200) / 2;
  const block = (title, lines) => new TableCell({ width: { size: half, type: WidthType.DXA }, borders,
    shading: { fill: light, type: ShadingType.CLEAR, color: "auto" }, margins: { top: 140, bottom: 140, left: 200, right: 200 },
    children: [new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: title, bold: true, size: 22, color: ACCENT, allCaps: true })] }),
      ...lines.map(([k, v]) => new Paragraph({ spacing: { after: 50 }, children: runs(k ? `**${k}:** ${v}` : v, { size: 22 }) }))] });
  const gap = new TableCell({ width: { size: 200, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [new Paragraph("")] });
  return [
    band([ctr(C.institution, { run: { bold: true, size: 30, color: "FFFFFF" } }), ctr(`${C.programme} · Batch ${C.batch}`, { run: { size: 22, color: "FFFFFF" }, after: 0 })], ACCENT),
    ctr("", { after: 500 }),
    ctr(`**Course:** ${C.course} (${C.course_code})`, { run: { size: 24 } }),
    ctr("Individual Qualitative Research Report · Assignment (10 marks)", { run: { size: 22, color: "595959" }, after: 500 }),
    new Paragraph({ style: "Title", children: [new TextRun(meta.title)] }),
    ctr(`*${meta.subtitle}*`, { run: { size: 23, color: "404040" }, after: 400 }),
    band([ctr("**RESEARCH QUESTION 4**", { run: { size: 20, color: ACCENT } }), ctr(`*${S.research_question}*`, { run: { size: 23 }, after: 0 })], light),
    ctr("", { after: 500 }),
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [half, 200, half], rows: [new TableRow({ children: [
      block("Submitted to", [["", `**${C.teacher}**`], ["", C.teacher_designation], ["", C.institution]]),
      gap,
      block("Submitted by", [["Name", A.name], ["Roll", A.roll], ["Batch", C.batch], ["Programme", C.programme]]),
    ] })] }),
    ctr("", { after: 300 }),
    ctr(`**Date of submission:** ${C.submission_date}     **Word count:** ${words.toLocaleString("en-US")} (Sections 1–5)`, { run: { size: 21 } }),
    draftBox(),
  ];
}

// ---------- document shell ----------
const mkStyles = () => ({
  default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 300, lineRule: LineRuleType.AUTO } } } },
  paragraphStyles: [
    { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 36, bold: true, color: ACCENT }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, keepNext: true } },
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: ACCENT }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: "262626" }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
  ],
});
const numbering = { config: [
  { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "qs", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "Q%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 600 } } } }] },
  { reference: "refs", levels: [{ level: 0, format: LevelFormat.BULLET, text: "", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 720 } } } }] },
] };
function footer() {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] });
}
function header(t) {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t, size: 18, color: "7F7F7F", italics: true })] })] });
}
function draftBox() {
  return new Paragraph({
    spacing: { before: 300, after: 200 }, alignment: AlignmentType.LEFT,
    shading: { fill: "FFF4E5", type: ShadingType.CLEAR, color: "auto" },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: "EB6834", space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "EB6834", space: 4 }, left: { style: BorderStyle.SINGLE, size: 8, color: "EB6834", space: 4 }, right: { style: BorderStyle.SINGLE, size: 8, color: "EB6834", space: 4 } },
    children: [new TextRun({ text: DRAFT_NOTE, size: 20, bold: true, color: "8A3B12" })],
  });
}
async function save(doc, name) {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log("wrote output/" + name);
}

// ---------- word count (body: Introduction .. Conclusion, incl. quotations) ----------
function wordCount(lines) {
  let n = 0, inBody = false;
  for (const l of lines) {
    if (/^## 1\./.test(l)) inBody = true;
    if (/^## References/.test(l)) inBody = false;
    if (!inBody) continue;
    if (/^\[\[(FIG|TABLE)/.test(l)) continue;
    const m = l.match(/^\[\[Q:(R\d+):(Q\d+)\]\]/);
    const text = m ? resp[m[1]].answers[m[2]].text : l.replace(/^#+\s*/, "").replace(/\[\[STAT:\w+\]\]/g, "0");
    n += text.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  }
  return n;
}

// ---------- paper builder ----------
async function buildPaper(file) {
  CUR = file.replace(/\.md$/, "");
  ACCENT = S.papers[CUR].accent;
  STATS.nq = NUMW[S.papers[CUR].questionnaire.length];
  const src = fs.readFileSync(path.join(ROOT, "papers", file), "utf8");
  const [, fm, body] = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = Object.fromEntries(fm.split("\n").map(l => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  const lines = body.split("\n");
  const words = wordCount(lines);

  const cover = [
    ...coverPage(meta.key, meta, words),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }),
    new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
    new Paragraph({ children: runs("*Right-click the table of contents and choose “Update field” in Word if page numbers do not appear.*", { size: 18, color: "7F7F7F" }) }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const content = [];
  let inRefs = false;
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^## (.*)/))) { inRefs = /References/.test(m[1]); content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: inRefs, children: [new TextRun(m[1])] })); continue; }
    if ((m = l.match(/^### (.*)/))) { content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(m[1]) })); continue; }
    if ((m = l.match(/^\[\[Q:(R\d+):(Q\d+)\]\]/))) { content.push(quote(m[1], m[2])); continue; }
    if ((m = l.match(/^\[\[FIG:([^|]+)\|(.*)\]\]/))) { content.push(...figure(m[1], m[2])); continue; }
    if ((m = l.match(/^\[\[TABLE:profile\|(.*)\]\]/))) { content.push(...profileTable(m[1])); continue; }
    if ((m = l.match(/^\[\[TABLE:phases\|(.*)\]\]/))) { content.push(...phasesTable(m[1])); continue; }
    if ((m = l.match(/^\[\[TABLE:framework:([^|]+)\|(.*)\]\]/))) { content.push(...frameworkTable(m[1].split(","), m[2])); continue; }
    if (l === "[[APPENDIX]]") { content.push(...appendix(CUR)); continue; }
    if ((m = l.match(/^- (.*)/))) {
      content.push(inRefs
        ? new Paragraph({ indent: { left: 720, hanging: 720 }, spacing: { after: 100 }, children: runs(m[1]) })
        : new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(m[1]) }));
      continue;
    }
    content.push(para(l));
  }

  const doc = new Document({
    creator: meta.author, title: meta.title, styles: mkStyles(), numbering, features: { updateFields: true },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      headers: { default: header(`${meta.author} · Roll ${PEOPLE.authors[CUR].roll} · Research Methodology · RQ4`) }, footers: { default: footer() },
      children: [...cover, ...content],
    }],
  });
  const safe = meta.author.replace(/[^A-Za-z]+/g, "_").replace(/^_|_$/g, "");
  await save(doc, `RQ4_Report_${safe}.docx`);
  await buildQuestionnaire(CUR);
  return { author: meta.author, words };
}

// ---------- transcripts + coding sheet ----------
async function buildTranscripts() {
  const ch = [
    new Paragraph({ style: "Title", children: [new TextRun("Interview Transcripts and Coding Sheet")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: runs(`*Research question 4:* ${S.research_question}`) }),
    draftBox(),
    para(`Each answer is followed by the open codes assigned to it. ${STATS.codes} codes were grouped into ${S.themes.length} themes (see the code key at the end). Respondents are pseudonymised as R1–R10.`),
  ];
  const codeLabel = Object.fromEntries(S.codes.map(c => [c.id, c.label]));
  S.respondents.forEach((r, i) => {
    ch.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: i > 0, children: [new TextRun(`Respondent ${r.id}`)] }));
    ch.push(para(`**Profile:** ${r.gender}; ${r.years} year${r.years === 1 ? "" : "s"} in practice; ${r.role}; ${r.forum}; ${r.area}.`));
    ch.push(para("**Interview date / mode / duration:** [  ]   **Consent obtained:** [ yes ]"));
    S.questions.forEach(q => {
      const a = r.answers[q.id];
      ch.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 40 }, children: runs(`**${q.id}.** ${q.text}`, { size: 22 }) }));
      ch.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 40 }, alignment: AlignmentType.JUSTIFIED, children: runs(a.text) }));
      ch.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 100 }, children: [new TextRun({ text: "Codes: " + (a.codes.length ? a.codes.map(c => `${c} ${codeLabel[c]}`).join("; ") : "(background, not coded)"), size: 18, color: "2A78D6" })] }));
    });
  });
  ch.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Code key and frequencies")] }));
  ch.push(...frameworkTable(S.themes.map(t => t.id), null));
  const doc = new Document({ styles: mkStyles(), numbering, sections: [{ properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, footers: { default: footer() }, children: ch }] });
  await save(doc, "RQ4_Interview_Transcripts_and_Coding_Sheet.docx");
}

// ---------- separate questionnaire document per author ----------
async function buildQuestionnaire(key) {
  const P = S.papers[key], A = PEOPLE.authors[key];
  const ch = [
    new Paragraph({ style: "Title", children: [new TextRun("Semi-Structured Interview Questionnaire")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: runs(`*Research question 4:* ${S.research_question}`) }),
    infoTable([["Course", `${C.course} (${C.course_code})`], ["Researcher", A.name], ["Roll", A.roll], ["Batch", C.batch], ["Programme", C.programme], ["Submitted to", C.teacher]]),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Consent script (read aloud)")] }),
    para("“I am conducting a short qualitative study for my Research Methodology course on the challenges lawyers face in pursuing justice within legal institutions. The interview will take about 25–40 minutes. Participation is voluntary; you can skip any question or stop at any time. Your name will not appear in the body of the report, and no client or case details will be used. May I record the interview (or take notes)? Do you agree to take part?”"),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`Questions (${P.questionnaire.length})`)] }),
  ];
  questionList(P.questionnaire, ch);
  ch.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Respondent questionnaires")] }));
  ch.push(...respondentForms(key));
  const doc = new Document({ styles: mkStyles(), numbering, sections: [{ properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, headers: { default: header(`Questionnaire · ${A.name} · Roll ${A.roll}`) }, footers: { default: footer() }, children: ch }] });
  const safe = A.name.replace(/[^A-Za-z]+/g, "_").replace(/^_|_$/g, "");
  await save(doc, `RQ4_Questionnaire_${safe}.docx`);
}

(async () => {
  const results = [];
  for (const f of ["nabin.md", "apon.md", "tanvir.md"]) results.push(await buildPaper(f));
  await buildTranscripts();
  for (const r of results) console.log(`${r.author}: ${r.words} words`);
})();
