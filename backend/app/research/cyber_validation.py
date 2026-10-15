"""Validation of model coding against human coding (RQ4 of the paper).

Workflow
--------
1. ``export`` draws a random sample of model-coded articles and writes
   ``coding_sheet.csv`` - article text plus empty codebook columns, with no
   model answers in it, so the coders are blind - and ``model_key.csv`` with
   the model's answers for the same item ids.
2. Two coders each fill a copy of the sheet independently.
3. ``score`` reports, per field, overall and by language:
   * coder agreement (percent and Cohen's kappa) - the reliability of the
     gold standard itself;
   * model vs. gold (accuracy, kappa, macro-F1; precision/recall/F1 of "yes"
     for ``is_cybercrime``).

   Gold is an adjudicated sheet if one is given. Otherwise, per field, the
   items where both coders agree; disagreements are written to
   ``disagreements.csv`` for adjudication and left out of the model scores
   until then. The report states which basis was used.

Standard library only, so the numbers can be checked by hand.
"""

from __future__ import annotations

import csv
import random
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from app.research.cyber_codebook import DATE_TOLERANCE_DAYS, FIELDS, FIELDS_BY_NAME

SCORED_FIELDS = [f.name for f in FIELDS if f.scored]
CODE_COLUMNS = [f.name for f in FIELDS]
META_COLUMNS = ["item_id", "language", "outlet", "published", "url", "title", "text"]

#: Characters of body text on the sheet. Enough for the lede and the facts;
#: the URL is there for anything longer.
SHEET_TEXT_CHARS = 3000

Coding = Dict[str, Dict[str, str]]


# ---------------------------------------------------------------------------
# Sampling and export
# ---------------------------------------------------------------------------
def draw_sample(
    records: Sequence[Dict[str, object]],
    n: int,
    *,
    min_per_language: int = 0,
    seed: int = 2026,
) -> List[Dict[str, object]]:
    """Simple random sample of ``n`` records, topping up any language below
    ``min_per_language`` so per-language scores have enough items.

    The seed is fixed by default so the sample in the paper can be redrawn
    exactly from the same corpus.
    """
    rng = random.Random(seed)
    pool = list(records)
    rng.shuffle(pool)

    by_language: Dict[str, List[Dict[str, object]]] = defaultdict(list)
    for record in pool:
        by_language[str(record.get("language") or "unknown")].append(record)

    chosen: List[Dict[str, object]] = []
    taken: set[int] = set()
    for items in by_language.values():
        for record in items[:min_per_language]:
            chosen.append(record)
            taken.add(id(record))

    for record in pool:
        if len(chosen) >= n:
            break
        if id(record) not in taken:
            chosen.append(record)
            taken.add(id(record))

    rng.shuffle(chosen)
    return chosen


def write_sheets(
    sample: Sequence[Dict[str, object]], sheet_path: Path, key_path: Path
) -> None:
    """Blind coding sheet plus the model's answers, joined by item_id.

    utf-8-sig so Excel opens the Bangla text correctly.
    """
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    with sheet_path.open("w", newline="", encoding="utf-8-sig") as sheet, key_path.open(
        "w", newline="", encoding="utf-8-sig"
    ) as key:
        sheet_writer = csv.DictWriter(sheet, fieldnames=META_COLUMNS + CODE_COLUMNS + ["notes"])
        key_writer = csv.DictWriter(key, fieldnames=["item_id", "url", "model"] + CODE_COLUMNS)
        sheet_writer.writeheader()
        key_writer.writeheader()
        for index, record in enumerate(sample, start=1):
            item_id = f"C{index:04d}"
            sheet_writer.writerow(
                {
                    "item_id": item_id,
                    "language": record.get("language", ""),
                    "outlet": record.get("outlet", ""),
                    "published": str(record.get("published", ""))[:10],
                    "url": record.get("url", ""),
                    "title": record.get("title", ""),
                    "text": str(record.get("body", ""))[:SHEET_TEXT_CHARS],
                }
            )
            key_writer.writerow(
                {
                    "item_id": item_id,
                    "url": record.get("url", ""),
                    "model": record.get("model", ""),
                    **{c: record.get(c, "") for c in CODE_COLUMNS},
                }
            )


def read_coding(path: Path) -> Tuple[Coding, Dict[str, str]]:
    """item_id -> {field: value}, plus item_id -> language."""
    coding: Coding = {}
    languages: Dict[str, str] = {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            item_id = (row.get("item_id") or "").strip()
            if not item_id:
                continue
            coding[item_id] = {c: (row.get(c) or "").strip() for c in CODE_COLUMNS}
            if row.get("language"):
                languages[item_id] = row["language"].strip()
    return coding, languages


# ---------------------------------------------------------------------------
# Comparison and statistics
# ---------------------------------------------------------------------------
def _canon(field: str, value: str) -> str:
    value = (value or "").strip()
    return value.lower() if FIELDS_BY_NAME[field].compare in ("exact", "text") else value


def same(field: str, a: str, b: str) -> bool:
    """Whether two codings of one field agree, per the field's compare rule."""
    a, b = _canon(field, a), _canon(field, b)
    if FIELDS_BY_NAME[field].compare != "date":
        return a == b
    try:
        da, db = date.fromisoformat(a), date.fromisoformat(b)
    except ValueError:
        return a == b
    return abs((da - db).days) <= DATE_TOLERANCE_DAYS


def _labels(field: str, a: Sequence[str], b: Sequence[str]) -> Tuple[List[str], List[str]]:
    """Map values to labels for kappa/F1. Dates within tolerance collapse to
    one label so a 1-day difference is not counted as a different class."""
    if FIELDS_BY_NAME[field].compare != "date":
        return [_canon(field, x) for x in a], [_canon(field, x) for x in b]
    la, lb = [], []
    for x, y in zip(a, b):
        x, y = _canon(field, x), _canon(field, y)
        la.append(x)
        lb.append(x if same(field, x, y) else y)
    return la, lb


def cohen_kappa(a: Sequence[str], b: Sequence[str]) -> Optional[float]:
    """Cohen's kappa for two raters over the same items. None if undefined."""
    n = len(a)
    if n == 0 or n != len(b):
        return None
    observed = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    expected = sum(ca[k] * cb.get(k, 0) for k in ca) / (n * n)
    if expected == 1.0:
        return 1.0 if observed == 1.0 else None
    return (observed - expected) / (1 - expected)


def prf(gold: Sequence[str], pred: Sequence[str], positive: str) -> Tuple[float, float, float]:
    tp = sum(g == positive and p == positive for g, p in zip(gold, pred))
    fp = sum(g != positive and p == positive for g, p in zip(gold, pred))
    fn = sum(g == positive and p != positive for g, p in zip(gold, pred))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


def macro_f1(gold: Sequence[str], pred: Sequence[str]) -> float:
    classes = sorted(set(gold))
    if not classes:
        return 0.0
    return sum(prf(gold, pred, c)[2] for c in classes) / len(classes)


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def _fmt(value: Optional[float]) -> str:
    return "–" if value is None else f"{value:.2f}"


def _items_by_group(items: Iterable[str], languages: Dict[str, str]) -> Dict[str, List[str]]:
    groups: Dict[str, List[str]] = {"all": []}
    for item in items:
        groups["all"].append(item)
        groups.setdefault(languages.get(item, "unknown"), []).append(item)
    return groups


def score(
    coder_a: Coding,
    coder_b: Optional[Coding],
    model: Coding,
    languages: Dict[str, str],
    *,
    gold: Optional[Coding] = None,
) -> Tuple[str, List[Dict[str, str]]]:
    """Markdown report and the list of coder disagreements."""
    lines: List[str] = ["# Validation report", ""]
    disagreements: List[Dict[str, str]] = []

    # --- Coder agreement -------------------------------------------------
    if coder_b is not None:
        shared = sorted(set(coder_a) & set(coder_b))
        lines += [
            "## Coder agreement",
            "",
            f"{len(shared)} items coded by both coders.",
            "",
            "| Field | Group | n | % agree | Cohen's κ |",
            "|---|---|---|---|---|",
        ]
        for field in SCORED_FIELDS:
            for group, items in _items_by_group(shared, languages).items():
                a = [coder_a[i][field] for i in items]
                b = [coder_b[i][field] for i in items]
                agree = [same(field, x, y) for x, y in zip(a, b)]
                la, lb = _labels(field, a, b)
                pct = 100 * sum(agree) / len(agree) if agree else None
                lines.append(
                    f"| {field} | {group} | {len(items)} | "
                    f"{'–' if pct is None else f'{pct:.1f}'} | {_fmt(cohen_kappa(la, lb))} |"
                )
            for item in shared:
                x, y = coder_a[item][field], coder_b[item][field]
                if not same(field, x, y):
                    disagreements.append(
                        {"item_id": item, "field": field, "coder_a": x, "coder_b": y}
                    )
        lines.append("")

    # --- Gold standard ---------------------------------------------------
    if gold is not None:
        basis = "adjudicated gold sheet"

        def gold_value(item: str, field: str) -> Optional[str]:
            value = gold.get(item, {}).get(field, "")
            return value if value else None
    elif coder_b is not None:
        basis = (
            "items where both coders agree (per field); disagreements excluded "
            "until adjudicated"
        )

        def gold_value(item: str, field: str) -> Optional[str]:
            if item not in coder_a or item not in coder_b:
                return None
            x, y = coder_a[item][field], coder_b[item][field]
            return x if x and same(field, x, y) else None
    else:
        basis = "single coder (coder A) - report as preliminary"

        def gold_value(item: str, field: str) -> Optional[str]:
            value = coder_a.get(item, {}).get(field, "")
            return value or None

    # --- Model vs. gold --------------------------------------------------
    lines += [
        "## Model vs. gold",
        "",
        f"Gold basis: {basis}. Dates count as matching within "
        f"±{DATE_TOLERANCE_DAYS} days.",
        "",
        "| Field | Group | n | Accuracy | Cohen's κ | Macro-F1 | P (yes) | R (yes) | F1 (yes) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for field in SCORED_FIELDS:
        candidates = [i for i in model if gold_value(i, field) is not None]
        for group, items in _items_by_group(candidates, languages).items():
            g = [gold_value(i, field) or "" for i in items]
            p = [model[i][field] for i in items]
            if not items:
                lines.append(f"| {field} | {group} | 0 | – | – | – | – | – | – |")
                continue
            accuracy = sum(same(field, x, y) for x, y in zip(g, p)) / len(items)
            lg, lp = _labels(field, g, p)
            row = (
                f"| {field} | {group} | {len(items)} | {accuracy:.2f} | "
                f"{_fmt(cohen_kappa(lg, lp))} | {macro_f1(lg, lp):.2f} |"
            )
            if field == "is_cybercrime":
                precision, recall, f1 = prf(lg, lp, "yes")
                row += f" {precision:.2f} | {recall:.2f} | {f1:.2f} |"
            else:
                row += " | | |"
            lines.append(row)
    lines.append("")
    return "\n".join(lines), disagreements


def write_disagreements(rows: Sequence[Dict[str, str]], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle, fieldnames=["item_id", "field", "coder_a", "coder_b", "resolved"]
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({**row, "resolved": ""})
