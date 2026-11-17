import json, sys, urllib.parse
from search import CONCEPT, MFS, PLACES_B, SOC_FIELDS, get
CRIM = ('(victim OR victims OR victimization OR victimisation OR offender OR offenders OR perpetrator OR perpetrators '
        'OR police OR policing OR law OR legal OR criminal OR crime OR crimes OR reporting OR justice)')
def build(tier):
    if tier == "A":
        return f'title_and_abstract.search:({CONCEPT} OR {MFS}) AND (bangladesh OR bangladeshi),publication_year:>2009'
    return (f'title.search:{CONCEPT},title_and_abstract.search:{PLACES_B} AND {CRIM},publication_year:>2009,'
            f'primary_topic.field.id:{SOC_FIELDS}')
def abstract(inv):
    if not inv: return ""
    pos = sorted((p, w) for w, ps in inv.items() for p in ps)
    return " ".join(w for _, w in pos)
def run(tier, out):
    rows, cursor = [], "*"
    while cursor:
        u = 'https://api.openalex.org/works?' + urllib.parse.urlencode({'filter': build(tier), 'per-page': 200, 'cursor': cursor})
        r = get(u)
        for w in r["results"]:
            loc = (w.get("primary_location") or {}).get("source") or {}
            rows.append({
                "openalex_id": w["id"], "doi": w.get("doi") or "", "title": w.get("title") or "",
                "year": w.get("publication_year"), "type": w.get("type"), "venue": loc.get("display_name") or "",
                "authors": "; ".join(a["author"]["display_name"] for a in w.get("authorships", [])[:10]),
                "countries": "; ".join(sorted({c for a in w.get("authorships", []) for c in a.get("countries", [])})),
                "language": w.get("language"), "cited_by": w.get("cited_by_count"),
                "field": ((w.get("primary_topic") or {}).get("field") or {}).get("display_name", ""),
                "abstract": abstract(w.get("abstract_inverted_index")),
                "tier": tier,
            })
        cursor = r["meta"].get("next_cursor")
        if not r["results"]: break
    json.dump(rows, open(out, "w"), ensure_ascii=False)
    print(tier, len(rows))
if __name__ == "__main__":
    print("B narrowed count:", get('https://api.openalex.org/works?' + urllib.parse.urlencode({'filter': build("B"), 'per-page': 1}))["meta"]["count"])
    run("A", "tierA.json")
