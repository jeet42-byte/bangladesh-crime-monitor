"""Gazetteer of Bangladeshi commercial and industrial sites.

Why this exists
---------------
The archive geocodes incidents to thanas. A thana name is meaningful to
someone in Dhaka and meaningless to a compliance manager in Stockholm
deciding whether their supplier is exposed. This layer converts the archive's
administrative geography into the geography a client actually thinks in:
"within 5 km of the Ashulia cluster", "near Chittagong Port".

Nothing here is derived from the incident data. It is static reference
geography, so it costs no LLM quota and does not change between ingest runs.

Coordinate precision - read this before quoting a distance
----------------------------------------------------------
These are **approximate centroids**, not surveyed boundaries. Several entries
name a cluster (Ashulia, Tejgaon Industrial Area) that sprawls over several
square kilometres and has no single point. A centroid is the honest
representation of "this general area", and distances computed from it carry
an error comparable to the site's own extent - typically 1-3 km for the
clusters, less for a discrete facility like a port terminal or an airport.

That is fine for the question this layer answers ("is there reported activity
in the vicinity") and wrong for any question that needs a perimeter. Do not
present these as site boundaries, and do not compute a distance to three
decimal places from them.

Where a client supplies their own site coordinates, use those instead; this
gazetteer exists so the product is useful *before* a client has onboarded.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal, Optional, Sequence

#: Kind of commercial asset. Drives which TTP profiles are considered
#: materially relevant to a site - see ``ttp_library.TTPProfile.asset_classes``.
SiteType = Literal[
    "epz",
    "economic_zone",
    "rmg_cluster",
    "financial_district",
    "commercial_area",
    "port",
    "land_port",
    "airport",
    "hitech_park",
    "diplomatic_zone",
]

SITE_TYPE_LABEL: Dict[str, str] = {
    "epz": "Export Processing Zone",
    "economic_zone": "Economic Zone",
    "rmg_cluster": "Garment manufacturing cluster",
    "financial_district": "Financial district",
    "commercial_area": "Commercial area",
    "port": "Seaport",
    "land_port": "Land port",
    "airport": "Airport",
    "hitech_park": "Hi-tech / software park",
    "diplomatic_zone": "Diplomatic zone",
}


@dataclass(frozen=True)
class CommercialSite:
    """One named commercial or industrial location."""

    id: str
    name: str
    site_type: SiteType
    district: str
    division: str
    latitude: float
    longitude: float
    #: Rough radius in km of the site's own extent. Used to warn when a
    #: requested search radius is smaller than the site itself, which would
    #: make the result meaningless.
    extent_km: float = 1.0
    note: str = ""


# ---------------------------------------------------------------------------
# The gazetteer
#
# Coverage is deliberately weighted towards export manufacturing, ports and
# the Dhaka/Chittagong commercial cores, because that is where the buyers of
# this data hold assets. It is not a complete list of Bangladeshi industry and
# does not pretend to be.
# ---------------------------------------------------------------------------
COMMERCIAL_SITES: List[CommercialSite] = [
    # ---------------------------------------------------------------- EPZs
    CommercialSite(
        "epz-dhaka", "Dhaka EPZ", "epz", "Dhaka", "Dhaka",
        23.8470, 90.2650, extent_km=1.5,
        note="Savar. One of the two largest EPZs by employment.",
    ),
    CommercialSite(
        "epz-chittagong", "Chittagong EPZ", "epz", "Chattogram", "Chattogram",
        22.3050, 91.7900, extent_km=1.5,
        note="South Halishahar, adjacent to the port.",
    ),
    CommercialSite(
        "epz-adamjee", "Adamjee EPZ", "epz", "Narayanganj", "Dhaka",
        23.7000, 90.5100, extent_km=1.2,
    ),
    CommercialSite(
        "epz-karnaphuli", "Karnaphuli EPZ", "epz", "Chattogram", "Chattogram",
        22.2600, 91.7800, extent_km=1.0,
    ),
    CommercialSite(
        "epz-comilla", "Comilla EPZ", "epz", "Cumilla", "Chattogram",
        23.4300, 91.1200, extent_km=1.0,
    ),
    CommercialSite(
        "epz-mongla", "Mongla EPZ", "epz", "Bagerhat", "Khulna",
        22.4900, 89.6000, extent_km=1.0,
    ),
    CommercialSite(
        "epz-ishwardi", "Ishwardi EPZ", "epz", "Pabna", "Rajshahi",
        24.1300, 89.0500, extent_km=1.0,
    ),
    CommercialSite(
        "epz-uttara", "Uttara EPZ", "epz", "Nilphamari", "Rangpur",
        25.8000, 88.9400, extent_km=1.0,
    ),

    # ------------------------------------------------------- Economic zones
    CommercialSite(
        "ez-mirsharai", "Bangabandhu Sheikh Mujib Shilpa Nagar",
        "economic_zone", "Chattogram", "Chattogram",
        22.7700, 91.4400, extent_km=6.0,
        note="Mirsharai. Very large footprint; a 5 km radius sits inside it.",
    ),
    CommercialSite(
        "ez-srihatta", "Srihatta Economic Zone", "economic_zone",
        "Moulvibazar", "Sylhet", 24.4300, 91.7500, extent_km=2.0,
    ),

    # --------------------------------------------------------- RMG clusters
    CommercialSite(
        "rmg-ashulia", "Ashulia garment cluster", "rmg_cluster",
        "Dhaka", "Dhaka", 23.9200, 90.3200, extent_km=4.0,
        note="Dense concentration of export factories and worker housing.",
    ),
    CommercialSite(
        "rmg-savar", "Savar garment cluster", "rmg_cluster",
        "Dhaka", "Dhaka", 23.8580, 90.2670, extent_km=3.0,
    ),
    CommercialSite(
        "rmg-gazipur", "Gazipur (Konabari / Kashimpur) cluster", "rmg_cluster",
        "Gazipur", "Dhaka", 23.9980, 90.4200, extent_km=5.0,
    ),
    CommercialSite(
        "rmg-tongi", "Tongi industrial area", "rmg_cluster",
        "Gazipur", "Dhaka", 23.8900, 90.4050, extent_km=2.5,
    ),
    CommercialSite(
        "rmg-narayanganj", "Narayanganj textile cluster", "rmg_cluster",
        "Narayanganj", "Dhaka", 23.6230, 90.5000, extent_km=3.0,
    ),
    CommercialSite(
        "rmg-fatullah", "Fatullah industrial area", "rmg_cluster",
        "Narayanganj", "Dhaka", 23.6400, 90.4900, extent_km=2.0,
    ),
    CommercialSite(
        "rmg-mirpur", "Mirpur garment belt", "rmg_cluster",
        "Dhaka", "Dhaka", 23.8060, 90.3690, extent_km=3.0,
    ),
    CommercialSite(
        "rmg-baizid", "Baizid Bostami industrial area", "rmg_cluster",
        "Chattogram", "Chattogram", 22.3800, 91.8100, extent_km=2.5,
    ),

    # -------------------------------------------- Financial / commercial
    CommercialSite(
        "fin-motijheel", "Motijheel commercial area", "financial_district",
        "Dhaka", "Dhaka", 23.7330, 90.4170, extent_km=1.2,
        note="Bangladesh Bank, head offices of most scheduled banks.",
    ),
    CommercialSite(
        "fin-dilkusha", "Dilkusha commercial area", "financial_district",
        "Dhaka", "Dhaka", 23.7290, 90.4180, extent_km=0.8,
    ),
    CommercialSite(
        "fin-agrabad", "Agrabad commercial area", "financial_district",
        "Chattogram", "Chattogram", 22.3280, 91.8130, extent_km=1.5,
    ),
    CommercialSite(
        "com-gulshan", "Gulshan", "commercial_area", "Dhaka", "Dhaka",
        23.7920, 90.4150, extent_km=1.8,
        note="Corporate head offices, expatriate residential.",
    ),
    CommercialSite(
        "com-banani", "Banani", "commercial_area", "Dhaka", "Dhaka",
        23.7940, 90.4040, extent_km=1.2,
    ),
    CommercialSite(
        "com-kawran-bazar", "Kawran Bazar", "commercial_area", "Dhaka", "Dhaka",
        23.7510, 90.3930, extent_km=1.0,
        note="Wholesale market, media houses, Janata Software Tower.",
    ),
    CommercialSite(
        "com-tejgaon", "Tejgaon Industrial Area", "commercial_area",
        "Dhaka", "Dhaka", 23.7650, 90.3950, extent_km=2.0,
    ),
    CommercialSite(
        "com-uttara", "Uttara Model Town", "commercial_area", "Dhaka", "Dhaka",
        23.8700, 90.4000, extent_km=2.5,
    ),
    CommercialSite(
        "com-dhanmondi", "Dhanmondi", "commercial_area", "Dhaka", "Dhaka",
        23.7460, 90.3760, extent_km=1.5,
    ),
    CommercialSite(
        "dip-baridhara", "Baridhara diplomatic zone", "diplomatic_zone",
        "Dhaka", "Dhaka", 23.8030, 90.4180, extent_km=1.0,
        note="Missions and international organisation offices.",
    ),

    # --------------------------------------------------------------- Ports
    CommercialSite(
        "port-chittagong", "Chittagong Port", "port",
        "Chattogram", "Chattogram", 22.3050, 91.8000, extent_km=3.0,
        note="Handles the large majority of national container throughput.",
    ),
    CommercialSite(
        "port-mongla", "Mongla Port", "port", "Bagerhat", "Khulna",
        22.4900, 89.5900, extent_km=2.0,
    ),
    CommercialSite(
        "port-payra", "Payra Port", "port", "Patuakhali", "Barishal",
        21.9800, 90.2500, extent_km=2.5,
    ),
    CommercialSite(
        "lport-benapole", "Benapole land port", "land_port",
        "Jashore", "Khulna", 23.0430, 88.9300, extent_km=1.0,
        note="Principal India land trade crossing.",
    ),
    CommercialSite(
        "lport-hili", "Hili land port", "land_port", "Dinajpur", "Rangpur",
        25.2900, 89.0100, extent_km=0.8,
    ),
    CommercialSite(
        "lport-teknaf", "Teknaf land port", "land_port",
        "Cox's Bazar", "Chattogram", 20.8700, 92.3000, extent_km=0.8,
    ),
    CommercialSite(
        "lport-akhaura", "Akhaura land port", "land_port",
        "Brahmanbaria", "Chattogram", 23.8700, 91.2200, extent_km=0.8,
    ),

    # ------------------------------------------------------------ Airports
    CommercialSite(
        "air-dac", "Hazrat Shahjalal International Airport", "airport",
        "Dhaka", "Dhaka", 23.8430, 90.3980, extent_km=2.0,
    ),
    CommercialSite(
        "air-cgp", "Shah Amanat International Airport", "airport",
        "Chattogram", "Chattogram", 22.2500, 91.8130, extent_km=1.5,
    ),
    CommercialSite(
        "air-zyl", "Osmani International Airport", "airport",
        "Sylhet", "Sylhet", 24.9600, 91.8670, extent_km=1.5,
    ),

    # -------------------------------------------------------- Hi-tech / IT
    CommercialSite(
        "tech-kaliakoir", "Bangabandhu Hi-Tech City", "hitech_park",
        "Gazipur", "Dhaka", 24.0700, 90.2200, extent_km=3.0,
        note="Kaliakoir. The national flagship IT park.",
    ),
    CommercialSite(
        "tech-jashore", "Sheikh Hasina Software Technology Park",
        "hitech_park", "Jashore", "Khulna", 23.1700, 89.2100, extent_km=1.0,
    ),
    CommercialSite(
        "tech-sylhet", "Sylhet Electronics City", "hitech_park",
        "Sylhet", "Sylhet", 24.8000, 91.8700, extent_km=1.5,
    ),
    CommercialSite(
        "tech-janata", "Janata Software Technology Park", "hitech_park",
        "Dhaka", "Dhaka", 23.7510, 90.3930, extent_km=0.4,
        note="Kawran Bazar tower; overlaps the Kawran Bazar commercial area.",
    ),
]


SITES_BY_ID: Dict[str, CommercialSite] = {
    site.id: site for site in COMMERCIAL_SITES
}


def site_by_id(site_id: str) -> Optional[CommercialSite]:
    return SITES_BY_ID.get(site_id)


def site_types() -> List[str]:
    """Distinct site types present in the gazetteer, in a stable order."""
    seen: List[str] = []
    for site in COMMERCIAL_SITES:
        if site.site_type not in seen:
            seen.append(site.site_type)
    return seen
