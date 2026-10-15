"""Codebook, validation statistics, and the cyber extract -> export -> score
path end to end with the model stubbed out.

Run from backend/:  python -m pytest tests
"""

import argparse
import asyncio
import csv
import json
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("INGEST_API_KEY", "test")
os.environ.setdefault("SECRET_KEY", "test")

import backfill  # noqa: E402
from app.research import cyber_extractor  # noqa: E402
from app.research.cyber_codebook import (  # noqa: E402
    SYSTEM_PROMPT,
    codebook_markdown,
    normalise_record,
)
from app.research.cyber_validation import cohen_kappa, prf, same  # noqa: E402


def test_codebook_file_is_current():
    committed = backfill.CODEBOOK_PATH.read_text(encoding="utf-8")
    assert committed == codebook_markdown(), "run: python backfill.py --topic cyber codebook"


def test_prompt_carries_every_option():
    for value in ("mfs_fraud", "sextortion_image_abuse", "cyber_security_act_2023"):
        assert value in SYSTEM_PROMPT


def test_normalise_drops_values_outside_codebook():
    record = normalise_record({"is_cybercrime": "YES", "cyber_type": "bank robbery"})
    assert record["is_cybercrime"] == "yes"
    assert record["cyber_type"] == ""


def test_kappa_known_values():
    assert cohen_kappa(["a", "b", "a", "b"], ["a", "b", "a", "b"]) == 1.0
    # Textbook 2x2: 20 yes/yes, 5 yes/no, 10 no/yes, 15 no/no -> kappa 0.4
    a = ["y"] * 25 + ["n"] * 25
    b = ["y"] * 20 + ["n"] * 5 + ["y"] * 10 + ["n"] * 15
    assert cohen_kappa(a, b) == pytest.approx(0.4)


def test_prf_and_date_tolerance():
    assert prf(["yes", "yes", "no"], ["yes", "no", "yes"], "yes") == (0.5, 0.5, 0.5)
    assert same("incident_date", "2024-05-01", "2024-05-03")
    assert not same("incident_date", "2024-05-01", "2024-05-09")
    assert same("district", " Dhaka", "dhaka")


def _article(i: int, outlet: str) -> dict:
    return {
        "url": f"https://example.com/{i}",
        "outlet": outlet,
        "title": f"Article {i}",
        "body": "Body text",
        "published": "2024-05-01T00:00:00+00:00",
    }


def test_extract_export_score_end_to_end(tmp_path, monkeypatch):
    backfill._use_topic("cyber")
    monkeypatch.setattr(backfill, "STATE_DIR", tmp_path)
    monkeypatch.setattr(backfill, "ARTICLES_PATH", tmp_path / "articles.jsonl")
    monkeypatch.setattr(backfill, "CODED_PATH", tmp_path / "coded.jsonl")

    articles = [_article(i, "The Daily Star") for i in range(30)]
    articles += [_article(i, "Jagonews24") for i in range(30, 50)]
    backfill._append_jsonl(backfill.ARTICLES_PATH, articles)

    calls = {"n": 0}

    def fake_code(title, body, published):
        calls["n"] += 1
        if title == "Article 7":
            raise cyber_extractor.ModelUnavailable("unparseable", reached_model=True)
        cyber = int(title.split()[-1]) % 2 == 0
        return {
            "is_cybercrime": "yes" if cyber else "no",
            "cyber_type": "mfs_fraud" if cyber else "none",
            "platform": "mfs" if cyber else "none",
            "victim_type": "individual" if cyber else "none",
            "victim_gender": "female" if cyber else "not_applicable",
            "arrest_reported": "no",
            "legal_basis": "not_mentioned",
            "district": "Dhaka" if cyber else "none",
            "incident_date": "2024-04-30" if cyber else "none",
            "amount_bdt": "",
            "model": "stub",
            "coded_at": "now",
        }

    monkeypatch.setattr(cyber_extractor, "code_article", fake_code)
    args = argparse.Namespace(max_calls=100)
    assert asyncio.run(backfill.stage_extract(args)) == 0
    coded = backfill._read_jsonl(backfill.CODED_PATH)
    assert len(coded) == 49
    assert {r["language"] for r in coded} == {"en", "bn"}

    # Re-running does not re-call the model for anything already settled.
    calls["n"] = 0
    asyncio.run(backfill.stage_extract(args))
    assert calls["n"] == 0

    export = argparse.Namespace(sample=20, min_per_language=15, seed=1)
    assert backfill.stage_export(export) == 0
    with (tmp_path / "coding_sheet.csv").open(encoding="utf-8-sig") as handle:
        sheet = list(csv.DictReader(handle))
    assert len(sheet) == 30  # 15 + 15 top-up exceeds the requested 20
    assert sheet[0]["is_cybercrime"] == ""  # blind: no model answers on the sheet

    # Coder A agrees with the model everywhere; coder B flips one item.
    with (tmp_path / "model_key.csv").open(encoding="utf-8-sig") as handle:
        key = {row["item_id"]: row for row in csv.DictReader(handle)}
    for name, flip in (("a.csv", None), ("b.csv", sheet[0]["item_id"])):
        rows = []
        for row in sheet:
            filled = dict(row)
            for column in ("is_cybercrime", "cyber_type", "platform", "victim_type",
                           "victim_gender", "arrest_reported", "legal_basis",
                           "district", "incident_date"):
                filled[column] = key[row["item_id"]][column]
            if row["item_id"] == flip:
                filled["is_cybercrime"] = "no" if filled["is_cybercrime"] == "yes" else "yes"
            rows.append(filled)
        with (tmp_path / name).open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(sheet[0]))
            writer.writeheader()
            writer.writerows(rows)

    score = argparse.Namespace(
        coder_a=str(tmp_path / "a.csv"), coder_b=str(tmp_path / "b.csv"), gold=None
    )
    assert backfill.stage_score(score) == 0
    report = (tmp_path / "validation_report.md").read_text(encoding="utf-8")
    assert "| is_cybercrime | all | 30 | 96.7 |" in report
    # The disagreement is excluded from gold, so the model scores 1.00 on 29.
    assert "| is_cybercrime | all | 29 | 1.00 | 1.00 |" in report
    with (tmp_path / "disagreements.csv").open(encoding="utf-8-sig") as handle:
        assert len(list(csv.DictReader(handle))) == 1
