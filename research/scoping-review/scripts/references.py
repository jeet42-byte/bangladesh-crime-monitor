"""Build APA 7 references for included studies cited in the manuscript, from OpenAlex metadata,
and replace [R####] markers with author–year citations.

    python scripts/references.py     (run from research/scoping-review/)

Reads  paper1/manuscript_draft.md   (with [R####] markers)
Writes paper1/manuscript_cited.md   (author–year citations + merged reference list)
       paper1/references_included.csv (record_id -> citation, reference, needs_check)
Author names, titles and venues come from OpenAlex and MUST be checked against the papers
(OpenAlex occasionally has wrong name order, missing pages or repository venues).
"""
import json, re, time, urllib.parse, urllib.request, csv
import pandas as pd

MS = "paper1/manuscript_draft.md"
rec = pd.read_csv("screening_suggestions.csv", encoding="utf-8-sig", dtype=str).fillna("").set_index("record_id")
text = open(MS, encoding="utf-8").read()
ids = sorted(set(re.findall(r"R\d{4}", text)))

def get(url):
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(url, timeout=60))
        except Exception:
            time.sleep(3 * (i + 1))
    return {}

oa = {}
wids = {r: rec.loc[r, "openalex_id"].rsplit("/", 1)[-1] for r in ids if rec.loc[r, "openalex_id"]}
chunk = "|".join(wids.values())
res = get("https://api.openalex.org/works?" + urllib.parse.urlencode(
    {"filter": f"openalex:{chunk}", "per-page": 100,
     "select": "id,doi,title,publication_year,type,authorships,primary_location,biblio"}))
for w in res.get("results", []):
    oa[w["id"].rsplit("/", 1)[-1]] = w

# Author lists corrected by hand after checking the full text (OpenAlex merged or mis-split names).
AUTHOR_OVERRIDES = {
    "R0578": ["Md. Faruk Hossain", "Md. Arifuzzaman"],
    "R0016": ["Mostafizur Rahaman", "Rajib Chandra Das", "Md. Rimon"],
}
def split_name(full):
    full = re.sub(r"\bMd\.(?=\S)", "Md. ", full)
    parts = full.replace(",", " ").split()
    if not parts: return "", ""
    last = parts[-1]
    initials = " ".join(p[0].upper() + "." for p in parts[:-1] if p and p[0].isalpha())
    return last, initials

def apa_authors(names):
    out = []
    for n in names[:20]:
        l, i = split_name(n)
        out.append(f"{l}, {i}".strip().rstrip(","))
    if len(names) > 20:
        out = out[:19] + ["..."] + [", ".join(split_name(names[-1]))]
    if len(out) == 1: return out[0]
    return ", ".join(out[:-1]) + ", & " + out[-1]

rows = []
for r in ids:
    w = oa.get(wids.get(r, ""), {})
    names = AUTHOR_OVERRIDES.get(r) or [a["author"]["display_name"] for a in w.get("authorships", []) if a.get("author")] or \
            [x.strip() for x in rec.loc[r, "authors"].split(";") if x.strip()]
    year = w.get("publication_year") or rec.loc[r, "year"]
    title = (w.get("title") or rec.loc[r, "title"]).strip().rstrip(".")
    src = ((w.get("primary_location") or {}).get("source") or {}).get("display_name") or rec.loc[r, "venue"]
    b = w.get("biblio") or {}
    doi = (w.get("doi") or ("https://doi.org/" + rec.loc[r, "doi"] if rec.loc[r, "doi"] else "")).replace("http://", "https://")
    vol = b.get("volume"); iss = b.get("issue"); fp = b.get("first_page"); lp = b.get("last_page")
    typ = w.get("type") or rec.loc[r, "type"]
    loc = ""
    if src:
        loc = f"*{src}*"
        if vol: loc += f", *{vol}*" + (f"({iss})" if iss else "")
        if fp: loc += f", {fp}" + (f"–{lp}" if lp and lp != fp else "")
    ref = f"{apa_authors(names)} ({year}). {title}. {loc}." + (f" {doi}" if doi else "")
    ref = ref.replace("..", ".").replace(". .", ".")
    last = [split_name(n)[0] for n in names]
    cite = (last[0] if len(last) == 1 else f"{last[0]} & {last[1]}" if len(last) == 2 else f"{last[0]} et al.") if last else title[:30]
    flags = []
    if not names: flags.append("no authors")
    if len(names) == 1 and len(names[0].split()) == 1: flags.append("single-word author name")
    if not src: flags.append("no venue")
    if any(k in (src or "").lower() for k in ("zenodo", "research square", "arxiv", "ssrn", "preprint")): flags.append("repository/preprint")
    if typ == "article" and not vol: flags.append("no volume/pages")
    rows.append(dict(record_id=r, cite_name=cite, year=str(year), reference=ref, needs_check="; ".join(flags), first=last[0] if last else title))

df = pd.DataFrame(rows)
# disambiguate identical author-year strings (a, b ...)
for key, g in df.groupby(["cite_name", "year"]):
    if len(g) > 1:
        for k, idx in enumerate(g.sort_values("reference").index):
            df.loc[idx, "year"] = f"{key[1]}{'abcdefgh'[k]}"
            df.loc[idx, "reference"] = df.loc[idx, "reference"].replace(f"({key[1]})", f"({key[1]}{'abcdefgh'[k]})", 1)
df["citation"] = df.cite_name + ", " + df.year
cmap = dict(zip(df.record_id, df.citation))

def repl(m):
    inner = m.group(1)
    parts = re.split(r"\s*,\s*|\s*;\s*", inner)
    out = []
    for p in parts:
        mm = re.match(r"(R\d{4})(.*)", p.strip())
        if mm:
            extra = mm.group(2).strip().strip("()").strip()
            out.append(cmap[mm.group(1)] + (f", {extra}" if extra else ""))
        else:
            out.append(p.strip())
    return "(" + "; ".join(out) + ")"
new = re.sub(r"\[((?:R\d{4}[^\]\[]*?)(?:[,;]\s*R\d{4}[^\]\[]*?)*)\]", repl, text)
new = re.sub(r"\bR\d{4}\b", lambda m: cmap.get(m.group(0), m.group(0)), new)   # any stray IDs

# merge with core references and sort
core_start = new.index("### References")
core_end = new.index("---", core_start)
core_block = new[core_start:core_end]
core = [l[2:].strip() for l in core_block.splitlines() if l.startswith("- ")]
allrefs = sorted(core + df.reference.tolist(), key=lambda s: re.sub(r"[^a-z]", "", s.lower()))
block = ("### References\n\nCore methods references (checked by hand) and included studies (generated from OpenAlex — "
         "**[CHECK each against the original paper]**).\n\n" + "\n".join(f"- {r}" for r in allrefs) + "\n\n")
new = new[:core_start] + block + new[core_end:]
new = new.replace("record IDs (R####) in brackets are to be replaced by full citations.", "citations generated by `scripts/references.py`.")
open("paper1/manuscript_cited.md", "w", encoding="utf-8").write(new)
df[["record_id", "citation", "reference", "needs_check"]].to_csv("paper1/references_included.csv", index=False)
print(len(df), "included-study references;", (df.needs_check != "").sum(), "flagged for checking")
print("unresolved IDs left:", re.findall(r"R\d{4}", new))
