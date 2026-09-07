"""Proximity maths and, more importantly, the honesty around it.

The distance part is trivial. The part that matters is
``assess_coverage``: at this archive's collection density most sites will
return zero nearby incidents, and a zero is dangerously easy to read as
"safe" when it actually means "we collected nothing here".

A security assessment that produces false assurance is worse than one that
produces nothing, because it lowers the reader's guard on the strength of the
assessor's own blind spot. So coverage is returned as a first-class field
alongside every result, and the wording of a zero is decided by how much
collection exists for that district - never by the incident count alone.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

EARTH_RADIUS_KM = 6371.0088

#: Below this many district records in the window, a nil return says nothing
#: about the site and must not be reported as an absence of risk.
THIN_COVERAGE_RECORDS = 5

CoverageSignal = Literal["no_signal", "thin", "adequate"]


def haversine_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Great-circle distance in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bounding_box(
    latitude: float, longitude: float, radius_km: float
) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lon, max_lon) enclosing the search circle.

    Used to cut the candidate set in SQL before the exact distance is computed
    in Python. Generous by construction - it is a superset of the circle, so
    it can never exclude a row the precise test would have kept.
    """
    lat_delta = radius_km / 111.32

    # Longitude degrees shrink towards the poles. Bangladesh sits around
    # 21-27 N so the factor is ~0.9, but clamp anyway rather than divide by
    # something near zero if this is ever reused elsewhere.
    cos_lat = max(math.cos(math.radians(latitude)), 0.01)
    lon_delta = radius_km / (111.32 * cos_lat)

    return (
        latitude - lat_delta,
        latitude + lat_delta,
        longitude - lon_delta,
        longitude + lon_delta,
    )


@dataclass(frozen=True)
class Coverage:
    """How much collection stands behind a result, and how to read it."""

    district_records: int
    national_records: int
    signal: CoverageSignal
    interpretation: str


def assess_coverage(
    *,
    district_records: int,
    national_records: int,
    incidents_found: int,
    district: str,
    window_days: int,
) -> Coverage:  # noqa: C901
    """Decide what a result means given how thin the collection is.

    The three signals are about the *dataset*, not the site:

        no_signal  nothing was collected in this district at all
        thin       some collection, too little to support an inference
        adequate   enough that a nil return is weak evidence of quiet
    """
    # Finding incidents in the radius is itself proof that collection exists
    # in the area, even when the site's nominal district has none of its own.
    # A search near a district boundary routinely picks up records booked to
    # the neighbouring district; reporting that as "no signal" while listing
    # the incidents would be incoherent.
    if incidents_found > 0 and district_records == 0:
        return Coverage(
            district_records=district_records,
            national_records=national_records,
            signal="thin",
            interpretation=(
                f"No records were collected in {district} itself over the "
                f"last {window_days} days - the {incidents_found} incident"
                f"{'' if incidents_found == 1 else 's'} shown were booked to "
                f"a neighbouring district. Treat the count as a floor: "
                f"collection for this site's own district is nil."
            ),
        )

    if district_records == 0:
        signal: CoverageSignal = "no_signal"
        interpretation = (
            f"No records were collected anywhere in {district} over the last "
            f"{window_days} days. This result describes the absence of "
            f"reporting, not the absence of incidents, and must not be read "
            f"as a low-risk finding."
        )
    elif district_records < THIN_COVERAGE_RECORDS:
        signal = "thin"
        interpretation = (
            f"Only {district_records} record"
            f"{'' if district_records == 1 else 's'} were collected across "
            f"the whole of {district} in {window_days} days. Coverage is too "
            f"sparse to support an inference about any single site; treat a "
            f"nil return as no signal rather than as reassurance."
        )
    elif incidents_found == 0:
        signal = "adequate"
        interpretation = (
            f"{district_records} records were collected in {district} over "
            f"{window_days} days, none of them within the search radius. "
            f"That is weak evidence of a quieter vicinity - but the archive "
            f"captures reported incidents only, and under-reported offences "
            f"are absent here for the same reason they are under-reported."
        )
    else:
        signal = "adequate"
        interpretation = (
            f"Drawn from {district_records} records collected in {district} "
            f"over {window_days} days. The archive captures reported "
            f"incidents only; counts are a floor, never a total."
        )

    return Coverage(
        district_records=district_records,
        national_records=national_records,
        signal=signal,
        interpretation=interpretation,
    )


# ---------------------------------------------------------------------------
# Geocoding resolution
#
# Every incident is pinned to the centroid of its thana, not to the place it
# happened: 90 records in the archive occupy 31 distinct coordinates, one per
# thana. Distances computed against those points therefore measure
# "distance to the thana centre", and two sites a few kilometres apart inside
# the same city will return near-identical results.
#
# That is a hard floor on what proximity can mean here, and it has to be said
# out loud - a client comparing "54 incidents near Gulshan" with "53 near
# Motijheel" is comparing the same incidents twice.
# ---------------------------------------------------------------------------

#: Below roughly this radius an urban result stops being informative, because
#: it is smaller than the thana the coordinates were derived from.
THANA_RESOLUTION_FLOOR_KM = 3.0

GEOCODING_NOTE = (
    "Incidents are geocoded to the centroid of their thana, not to the "
    "location of the event. Proximity is therefore meaningful at thana scale "
    "and no finer: two sites within the same few thanas will return "
    "substantially the same incidents regardless of the distance between "
    "them. Distances shown are to the thana centre."
)


def resolution_warning(radius_km: float, district_level_count: int) -> str | None:
    """Warn when the radius implies more precision than the data supports."""
    parts: list[str] = []

    if radius_km < THANA_RESOLUTION_FLOOR_KM:
        parts.append(
            f"A {radius_km:g} km radius is finer than the geocoding "
            f"resolution: incidents sit on thana centroids, so a circle this "
            f"small mostly measures which centroid happens to fall inside it."
        )

    if district_level_count:
        parts.append(
            f"{district_level_count} of the incidents shown could not be "
            f"resolved below district level and carry the district centroid "
            f"as their position. Their true locations are unknown and may be "
            f"tens of kilometres away."
        )

    return " ".join(parts) if parts else None
