"""Incident clustering and the analyse stage on a synthetic corpus.

Run from backend/:  python -m pytest tests
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("INGEST_API_KEY", "test")
os.environ.setdefault("SECRET_KEY", "test")

from app.research.cyber_analysis import analyse, cluster_incidents, cyber_records  # noqa: E402


def _rec(outlet, kind, district, day, amount="", **extra):
    return {
        "outlet": outlet, "language": "en", "is_cybercrime": "yes",
        "cyber_type": kind, "platform": "mfs", "victim_type": "individual",
        "victim_gender": "female", "arrest_reported": "yes",
        "legal_basis": "cyber_security_act_2023", "district": district,
        "incident_date": day, "published": day, "amount_bdt": amount, **extra,
    }


def test_same_incident_in_two_outlets_is_one_incident():
    records = cyber_records([
        _rec("Daily Star", "mfs_fraud", "Chittagong", "2024-03-01", "50000"),
        _rec("Jagonews24", "mfs_fraud", "Chattogram", "2024-03-02", "50000"),
    ])
    assert len(cluster_incidents(records)) == 1


def test_different_amount_place_type_or_date_stay_separate():
    records = cyber_records([
        _rec("A", "mfs_fraud", "Dhaka", "2024-03-01", "50000"),
        _rec("B", "mfs_fraud", "Dhaka", "2024-03-01", "90000"),   # amount
        _rec("C", "mfs_fraud", "Khulna", "2024-03-01"),           # district
        _rec("D", "online_gambling", "Dhaka", "2024-03-01"),      # type
        _rec("E", "mfs_fraud", "Dhaka", "2024-04-20"),            # date
        _rec("F", "mfs_fraud", "unknown", "2024-03-01"),          # unplaced
        _rec("G", "mfs_fraud", "unknown", "2024-03-01"),
    ])
    assert len(cluster_incidents(records)) == 7


def test_analyse_writes_tables_and_figures(tmp_path):
    coded = [
        _rec("Daily Star", "mfs_fraud", "Dhaka", "2022-05-01", "20000"),
        _rec("Jagonews24", "mfs_fraud", "Dhaka", "2022-05-02", "20000"),
        _rec("Daily Star", "sextortion_image_abuse", "Rajshahi", "2024-01-10",
             platform="facebook", legal_basis="pornography_control_act_2012"),
        {"outlet": "Daily Star", "language": "en", "is_cybercrime": "no",
         "published": "2023-01-01"},
    ]
    advisories = [
        {"advisory_kind": "fraud_or_abuse_campaign", "cyber_type": "mfs_fraud"},
        {"advisory_kind": "fraud_or_abuse_campaign", "cyber_type": "other_online_fraud"},
        {"advisory_kind": "technical_vulnerability", "cyber_type": "attack_on_organisation"},
    ]
    report = analyse(coded, advisories, tmp_path)

    assert "4 articles coded; 3 report a cybercrime; estimated 2 distinct incidents" in report
    assert "| 2022 | 1 | 0 | 1 |" in report  # one mfs_fraud incident in 2022
    # News: mfs 50%, CIRT fraud advisories: mfs 50%, other_online_fraud 50%.
    assert "| mfs_fraud | 1 | 50.0 | 1 | 50.0 | +0.0 |" in report
    assert "| other_online_fraud | 0 | 0.0 | 1 | 50.0 | -50.0 |" in report
    for name in ("results.md", "year_type.csv", "cirt.csv"):
        assert (tmp_path / name).exists()
    try:
        import matplotlib  # noqa: F401
    except ImportError:
        return
    for name in ("fig1_trend_by_type.png", "fig2_platforms.png",
                 "fig3_districts.png", "fig4_news_vs_cirt.png"):
        assert (tmp_path / name).exists(), name
