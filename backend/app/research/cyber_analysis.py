"""Results tables and figures for the cybercrime paper (RQ1-3).

    python backend/backfill.py --topic cyber analyse

Reads ``coded.jsonl`` (and ``cirt.jsonl`` if present) and writes to
``.backfill-cyber/analysis/``:

* ``results.md``  - every table, ready to paste into the draft
* ``*.csv``       - the same tables for Excel/SPSS/R
* ``fig*.png``    - figures, if matplotlib is installed
                    (``pip install -r requirements-research.txt``)

Articles vs. incidents
----------------------
Several outlets often report the same incident, and one outlet may follow it
up. Counting articles would weight a story by how much attention it got, not
by how often the thing happens. So incidents are estimated by clustering
articles with the same cyber type and district whose incident dates fall
within ``DUPLICATE_WINDOW_DAYS`` and whose stated amounts do not conflict.
This is a heuristic, stated as such in the methods; both counts are
reported so a reader can see how much it changes.
"""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from statistics import median
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from app.research.cyber_codebook import FIELDS_BY_NAME

DUPLICATE_WINDOW_DAYS = 3

Record = Dict[str, object]
Table = Tuple[List[str], List[List[object]]]


# ---------------------------------------------------------------------------
# Preparation
# ---------------------------------------------------------------------------
def _year(record: Record) -> str:
    """Incident year, falling back to publication year when undated."""
    value = str(record.get("incident_date") or "")
    if len(value) >= 4 and value[:4].isdigit():
        return value[:4]
    return str(record.get("published") or "")[:4] or "unknown"


def _date(record: Record) -> Optional[date]:
    for key in ("incident_date", "published"):
        try:
            return date.fromisoformat(str(record.get(key) or "")[:10])
        except ValueError:
            continue
    return None


def _amount(record: Record) -> Optional[float]:
    text = str(record.get("amount_bdt") or "").replace(",", "").strip()
    try:
        value = float(text)
    except ValueError:
        return None
    return value if value > 0 else None


def cyber_records(records: Iterable[Record]) -> List[Record]:
    """Cybercrime articles, with district spellings made canonical
    ("Chittagong" and "Chattogram" are one district) for clustering and
    the district table."""
    from app.utils.thana_coordinates import resolve_district

    rows = []
    for record in records:
        if record.get("is_cybercrime") != "yes":
            continue
        row = dict(record)
        place = resolve_district(str(row.get("district") or ""))
        if place:
            row["district"] = place["district"]
        rows.append(row)
    return rows


def cluster_incidents(records: Sequence[Record]) -> List[List[Record]]:
    """Group articles that report the same incident (see module docstring).

    Undated or unplaced articles are never merged: without a date and a place
    there is nothing to say two reports are the same event.
    """
    clusters: List[List[Record]] = []
    groups: Dict[Tuple[str, str], List[List[Record]]] = defaultdict(list)

    for record in sorted(records, key=lambda r: _date(r) or date.min):
        district = str(record.get("district") or "").strip().lower()
        day = _date(record)
        if not day or district in ("", "unknown", "none"):
            clusters.append([record])
            continue

        key = (str(record.get("cyber_type")), district)
        placed = False
        for cluster in groups[key]:
            anchor = cluster[-1]
            anchor_day = _date(anchor)
            if anchor_day is None or abs((day - anchor_day).days) > DUPLICATE_WINDOW_DAYS:
                continue
            amounts = {_amount(r) for r in cluster} | {_amount(record)}
            amounts.discard(None)
            if len(amounts) > 1:
                continue
            cluster.append(record)
            placed = True
            break
        if not placed:
            new = [record]
            groups[key].append(new)
            clusters.append(new)
    return clusters


def incident_rows(clusters: Sequence[List[Record]]) -> List[Record]:
    """One row per incident: the earliest article, with the cluster size."""
    rows = []
    for cluster in clusters:
        first = dict(cluster[0])
        first["n_articles"] = len(cluster)
        first["n_outlets"] = len({r.get("outlet") for r in cluster})
        rows.append(first)
    return rows


# ---------------------------------------------------------------------------
# Tables
# ---------------------------------------------------------------------------
def _crosstab(
    rows: Sequence[Record], row_key: str, col_key: str, *, col_order: Sequence[str] = ()
) -> Table:
    counts: Dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        counts[str(row.get(row_key) or "")][str(row.get(col_key) or "")] += 1
    columns = list(col_order) or sorted({c for counter in counts.values() for c in counter})
    columns = [c for c in columns if any(counts[r][c] for r in counts)]
    header = [row_key] + columns + ["total"]
    body = []
    for key in sorted(counts):
        values = [counts[key][c] for c in columns]
        body.append([key] + values + [sum(values)])
    totals = [sum(counts[k][c] for k in counts) for c in columns]
    body.append(["total"] + totals + [sum(totals)])
    return header, body


def _share_column(table: Table) -> Table:
    header, body = table
    grand = body[-1][-1] or 1
    return header + ["%"], [row + [f"{100 * row[-1] / grand:.1f}"] for row in body]


def corpus_table(coded: Sequence[Record]) -> Table:
    by: Dict[Tuple[str, str], Counter] = defaultdict(Counter)
    for record in coded:
        key = (str(record.get("outlet")), str(record.get("language")))
        by[key]["coded"] += 1
        by[key]["cyber"] += record.get("is_cybercrime") == "yes"
    body = [
        [outlet, language, c["coded"], c["cyber"]]
        for (outlet, language), c in sorted(by.items())
    ]
    body.append(
        ["total", "", sum(r[2] for r in body), sum(r[3] for r in body)]
    )
    return ["outlet", "language", "articles coded", "cybercrime articles"], body


def amount_table(incidents: Sequence[Record]) -> Table:
    amounts: Dict[str, List[float]] = defaultdict(list)
    for row in incidents:
        value = _amount(row)
        if value is not None:
            amounts[str(row.get("cyber_type"))].append(value)
    body = [
        [kind, len(values), f"{median(values):,.0f}", f"{sum(values):,.0f}"]
        for kind, values in sorted(amounts.items())
    ]
    return ["cyber_type", "incidents with amount", "median Tk", "total Tk"], body


def arrest_table(incidents: Sequence[Record]) -> Table:
    by: Dict[str, Counter] = defaultdict(Counter)
    for row in incidents:
        by[str(row.get("cyber_type"))][str(row.get("arrest_reported"))] += 1
    body = []
    for kind, counter in sorted(by.items()):
        total = sum(counter.values())
        body.append([kind, total, counter["yes"], f"{100 * counter['yes'] / total:.1f}"])
    return ["cyber_type", "incidents", "arrest reported", "% arrest"], body


def cirt_comparison(incidents: Sequence[Record], advisories: Sequence[Record]) -> Table:
    """Share of each cyber type in news incidents vs. fraud/abuse advisories."""
    news = Counter(str(r.get("cyber_type")) for r in incidents)
    cert = Counter(
        str(r.get("cyber_type"))
        for r in advisories
        if r.get("advisory_kind") == "fraud_or_abuse_campaign"
    )
    n_news, n_cert = sum(news.values()) or 1, sum(cert.values()) or 1
    order = FIELDS_BY_NAME["cyber_type"].values
    body = []
    for kind in order:
        if not news[kind] and not cert[kind]:
            continue
        body.append(
            [
                kind,
                news[kind],
                f"{100 * news[kind] / n_news:.1f}",
                cert[kind],
                f"{100 * cert[kind] / n_cert:.1f}",
                f"{100 * news[kind] / n_news - 100 * cert[kind] / n_cert:+.1f}",
            ]
        )
    return (
        ["cyber_type", "news incidents", "news %", "CIRT advisories", "CIRT %",
         "difference (pp)"],
        body,
    )


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def _markdown(title: str, table: Table, note: str = "") -> str:
    header, body = table
    lines = [f"## {title}", ""]
    if note:
        lines += [note, ""]
    if not body:
        return "\n".join(lines + ["_No data._", ""])
    lines.append("| " + " | ".join(header) + " |")
    lines.append("|" + "---|" * len(header))
    for row in body:
        lines.append("| " + " | ".join(str(v) for v in row) + " |")
    return "\n".join(lines + [""])


def _write_csv(path: Path, table: Table) -> None:
    header, body = table
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(body)


def _figures(out: Path, incidents: Sequence[Record], tables: Dict[str, Table]) -> List[str]:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return []

    from app.utils.thana_coordinates import resolve_district

    written = []

    # Fig 1: incidents per year, stacked by type.
    header, body = tables["year_type"]
    types = header[1:-1]
    years = [row[0] for row in body[:-1]]
    if years:
        fig, ax = plt.subplots(figsize=(9, 5))
        bottom = [0] * len(years)
        for index, kind in enumerate(types):
            values = [row[1 + index] for row in body[:-1]]
            ax.bar(years, values, bottom=bottom, label=kind)
            bottom = [b + v for b, v in zip(bottom, values)]
        ax.set_ylabel("Incidents (estimated)")
        ax.set_title("Reported cybercrime incidents by year and type")
        ax.legend(fontsize=7, loc="upper left", bbox_to_anchor=(1.01, 1))
        fig.tight_layout()
        fig.savefig(out / "fig1_trend_by_type.png", dpi=200)
        plt.close(fig)
        written.append("fig1_trend_by_type.png")

    # Fig 2: platforms.
    platforms = Counter(str(r.get("platform")) for r in incidents)
    if platforms:
        labels, values = zip(*platforms.most_common())
        fig, ax = plt.subplots(figsize=(8, 4.5))
        ax.barh(labels[::-1], values[::-1])
        ax.set_xlabel("Incidents (estimated)")
        ax.set_title("Platform or channel involved")
        fig.tight_layout()
        fig.savefig(out / "fig2_platforms.png", dpi=200)
        plt.close(fig)
        written.append("fig2_platforms.png")

    # Fig 3: district bubble map on centroids. No basemap, deliberately: the
    # locations are district centroids, and a street map would imply
    # precision the data does not have (HANDOFF.md §6).
    points: Counter = Counter()
    for row in incidents:
        place = resolve_district(str(row.get("district") or ""))
        if place:
            points[(place["lon"], place["lat"], place["district"])] += 1
    if points:
        fig, ax = plt.subplots(figsize=(6, 7.5))
        xs, ys, sizes = zip(*[(x, y, n) for (x, y, _), n in points.items()])
        ax.scatter(xs, ys, s=[20 + 12 * n for n in sizes], alpha=0.5)
        for (x, y, name), n in points.most_common(10):
            ax.annotate(f"{name} ({n})", (x, y), fontsize=7)
        ax.set_xlabel("Longitude")
        ax.set_ylabel("Latitude")
        ax.set_title("Incidents by district (centroids)")
        # Bangladesh's bounding box, so every run is drawn on the same frame.
        ax.set_xlim(88.0, 92.7)
        ax.set_ylim(20.6, 26.7)
        ax.set_aspect("equal")
        fig.tight_layout()
        fig.savefig(out / "fig3_districts.png", dpi=200)
        plt.close(fig)
        written.append("fig3_districts.png")

    # Fig 4: news vs. CIRT shares.
    if "cirt" in tables and tables["cirt"][1]:
        _, body = tables["cirt"]
        kinds = [row[0] for row in body]
        news = [float(row[2]) for row in body]
        cert = [float(row[4]) for row in body]
        positions = range(len(kinds))
        fig, ax = plt.subplots(figsize=(9, 5))
        ax.bar([p - 0.2 for p in positions], news, width=0.4, label="News incidents")
        ax.bar([p + 0.2 for p in positions], cert, width=0.4, label="CIRT advisories")
        ax.set_xticks(list(positions))
        ax.set_xticklabels(kinds, rotation=35, ha="right", fontsize=8)
        ax.set_ylabel("% of stream")
        ax.set_title("What the press reports vs. what the national CERT warns about")
        ax.legend()
        fig.tight_layout()
        fig.savefig(out / "fig4_news_vs_cirt.png", dpi=200)
        plt.close(fig)
        written.append("fig4_news_vs_cirt.png")

    return written


def analyse(
    coded: Sequence[Record], advisories: Sequence[Record], out: Path
) -> str:
    """Write every table and figure; return the markdown report."""
    out.mkdir(parents=True, exist_ok=True)
    articles = cyber_records(coded)
    incidents = incident_rows(cluster_incidents(articles))
    type_order = FIELDS_BY_NAME["cyber_type"].values
    for row in incidents:
        row["year"] = _year(row)

    tables: Dict[str, Table] = {
        "corpus": corpus_table(coded),
        "year_type": _crosstab(incidents, "year", "cyber_type", col_order=type_order),
        "type_platform": _crosstab(
            incidents, "cyber_type", "platform",
            col_order=FIELDS_BY_NAME["platform"].values,
        ),
        "type_victim": _crosstab(
            incidents, "cyber_type", "victim_type",
            col_order=FIELDS_BY_NAME["victim_type"].values,
        ),
        "type_gender": _crosstab(
            incidents, "cyber_type", "victim_gender",
            col_order=FIELDS_BY_NAME["victim_gender"].values,
        ),
        "year_law": _crosstab(
            incidents, "year", "legal_basis",
            col_order=FIELDS_BY_NAME["legal_basis"].values,
        ),
        "arrests": arrest_table(incidents),
        "amounts": amount_table(incidents),
        "districts": _share_column(_crosstab(incidents, "district", "cyber_type",
                                             col_order=type_order)),
    }
    if advisories:
        tables["cirt"] = cirt_comparison(incidents, advisories)

    for name, table in tables.items():
        _write_csv(out / f"{name}.csv", table)
    figures = _figures(out, incidents, tables)

    sections = [
        "# Results",
        "",
        f"{len(coded)} articles coded; {len(articles)} report a cybercrime; "
        f"estimated {len(incidents)} distinct incidents after merging "
        f"same-type, same-district reports within ±{DUPLICATE_WINDOW_DAYS} days "
        f"(articles per incident: "
        f"{(len(articles) / len(incidents)) if incidents else 0:.2f}).",
        "",
        _markdown("Table 1. Corpus", tables["corpus"]),
        _markdown("Table 2. Incidents by year and type (RQ1)", tables["year_type"],
                  "Year of the incident; publication year where the incident is undated."),
        _markdown("Table 3. Type × platform (RQ2)", tables["type_platform"]),
        _markdown("Table 4. Type × victim (RQ2)", tables["type_victim"]),
        _markdown("Table 5. Type × victim gender (RQ2)", tables["type_gender"],
                  "As reported; 'unknown' where the article does not say."),
        _markdown("Table 6. Law cited, by year", tables["year_law"],
                  "The Cyber Security Act 2023 replaced the Digital Security Act 2018 "
                  "in September 2023. Descriptive only."),
        _markdown("Table 7. Arrests reported, by type", tables["arrests"]),
        _markdown("Table 8. Money lost or demanded, by type", tables["amounts"],
                  "Only incidents whose article states an amount."),
        _markdown("Table 9. Districts (RQ2)", tables["districts"]),
    ]
    if "cirt" in tables:
        sections.append(
            _markdown(
                "Table 10. News incidents vs. CIRT fraud/abuse advisories (RQ3)",
                tables["cirt"],
                "Shares within each stream. Positive difference: more prominent "
                "in the press than in CERT warnings.",
            )
        )
    if figures:
        sections += ["## Figures", ""] + [f"- `{name}`" for name in figures] + [""]
    report = "\n".join(sections)
    (out / "results.md").write_text(report, encoding="utf-8")
    return report
