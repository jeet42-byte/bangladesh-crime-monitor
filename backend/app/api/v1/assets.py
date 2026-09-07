"""Asset-centric exposure: the ESRM view of the archive.

The rest of the API is incident-centric - it answers "what happened". ESRM
starts from the asset and asks "what threatens *this*, and how exposed is it",
so this router inverts the query: give it a site, get back the reported
activity in its vicinity, the threat patterns that apply to that class of
asset, and - unavoidably, and as a first-class field rather than a footnote -
how much collection actually stands behind the answer.

On the coverage field
---------------------
At this archive's density most sites return zero nearby incidents. A zero
rendered without context reads as "safe". It is not: it usually means nothing
was collected in that district at all. Every response therefore carries a
``coverage`` block whose wording is decided by district collection volume,
not by the incident count, so a nil return cannot be mistaken for assurance.
See ``app.services.exposure.assess_coverage``.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.deps import DbSession, require_reader
from app.db.models import CrimeIncident, public_incidents
from app.services.commercial_sites import (
    COMMERCIAL_SITES,
    SITE_TYPE_LABEL,
    CommercialSite,
    site_by_id,
    site_types,
)
from app.services.exposure import (
    GEOCODING_NOTE,
    assess_coverage,
    bounding_box,
    haversine_km,
    resolution_warning,
)
from app.services.ttp_library import (
    ISO27001_CONTROL_TITLE,
    profiles_for_asset_class,
)

router = APIRouter(
    prefix="/assets",
    tags=["assets"],
    dependencies=[Depends(require_reader)],
)


# ===========================================================================
# Response models
# ===========================================================================
class SiteOut(BaseModel):
    id: str
    name: str
    site_type: str
    site_type_label: str
    district: str
    division: str
    latitude: float
    longitude: float
    extent_km: float
    note: str


class SitesResponse(BaseModel):
    sites: List[SiteOut]
    site_types: List[str]
    site_type_labels: dict[str, str]
    #: Stated on every listing, because a centroid is not a perimeter.
    precision_note: str


class NearbyIncident(BaseModel):
    id: str
    title: str
    crime_category: str
    incident_date: datetime
    thana_name: str
    district: str
    distance_km: float
    #: True when the record never resolved below district level, so its
    #: coordinates are a district centroid and its real location is unknown.
    district_level_only: bool
    source_platform: str
    source_handle: Optional[str]
    verification_level: str
    source_url: str


class CoverageOut(BaseModel):
    district_records: int
    national_records: int
    signal: str
    interpretation: str


class ControlOut(BaseModel):
    control: str
    title: str


class ApplicableThreat(BaseModel):
    id: str
    name: str
    threat_class: str
    summary: str
    archive_support: str
    #: Annex A controls drawn from this profile's treatments. Empty where no
    #: ISMS control honestly applies.
    iso27001_controls: List[ControlOut]


class ExposureResponse(BaseModel):
    site: SiteOut
    radius_km: float
    window_days: int
    incident_count: int
    by_category: dict[str, int]
    incidents: List[NearbyIncident]
    applicable_threats: List[ApplicableThreat]
    coverage: CoverageOut
    #: Set when the search radius is smaller than the site's own footprint,
    #: which makes the result geometrically meaningless.
    radius_warning: Optional[str]
    #: Always present. Incidents sit on thana centroids, so proximity has a
    #: hard resolution floor that consumers must not design around.
    geocoding_note: str
    #: Set when the request implies more precision than the data supports.
    resolution_warning: Optional[str]
    #: How many of the returned incidents carry only a district centroid.
    district_level_incidents: int
    generated_at: datetime


# ===========================================================================
# Helpers
# ===========================================================================
def _site_out(site: CommercialSite) -> SiteOut:
    return SiteOut(
        id=site.id,
        name=site.name,
        site_type=site.site_type,
        site_type_label=SITE_TYPE_LABEL.get(site.site_type, site.site_type),
        district=site.district,
        division=site.division,
        latitude=site.latitude,
        longitude=site.longitude,
        extent_km=site.extent_km,
        note=site.note,
    )


PRECISION_NOTE = (
    "Coordinates are approximate centroids, not surveyed boundaries. Several "
    "entries name a cluster that spans several square kilometres, so a "
    "distance derived from them carries an error comparable to the site's own "
    "extent. Use client-supplied coordinates where precision matters."
)


def _controls_for(profile) -> List[ControlOut]:
    seen: List[str] = []
    for treatment in profile.treatments:
        for control in treatment.iso27001:
            if control not in seen:
                seen.append(control)
    return [
        ControlOut(control=c, title=ISO27001_CONTROL_TITLE.get(c, ""))
        for c in sorted(seen)
    ]


# ===========================================================================
# Endpoints
# ===========================================================================
@router.get("/sites", response_model=SitesResponse)
async def list_sites(
    site_type: Optional[str] = Query(None, description="Filter by site type."),
) -> SitesResponse:
    """The commercial gazetteer.

    Static reference geography - it does not depend on the archive and does
    not change between ingest runs.
    """
    sites = COMMERCIAL_SITES
    if site_type:
        sites = [s for s in sites if s.site_type == site_type]

    return SitesResponse(
        sites=[_site_out(s) for s in sites],
        site_types=site_types(),
        site_type_labels=SITE_TYPE_LABEL,
        precision_note=PRECISION_NOTE,
    )


@router.get("/exposure", response_model=ExposureResponse)
async def site_exposure(
    session: DbSession,
    site_id: Optional[str] = Query(
        None, description="Gazetteer site id. Omit to use latitude/longitude."
    ),
    latitude: Optional[float] = Query(None, ge=20.0, le=27.0),
    longitude: Optional[float] = Query(None, ge=88.0, le=93.0),
    name: str = Query("Custom location", max_length=120),
    district: Optional[str] = Query(
        None,
        description=(
            "District for the coverage assessment when using coordinates. "
            "Without it, coverage is reported nationally and will overstate "
            "how much collection stands behind the result."
        ),
    ),
    radius_km: float = Query(5.0, gt=0, le=50),
    days: int = Query(90, ge=7, le=730),
) -> ExposureResponse:
    """Reported activity in the vicinity of one asset, with its coverage.

    Accepts either a gazetteer ``site_id`` or a client's own coordinates, so
    an engagement can point this at real sites rather than the nearest
    approximation in the gazetteer.
    """
    if site_id:
        site = site_by_id(site_id)
        if site is None:
            raise HTTPException(404, f"Unknown site '{site_id}'.")
    elif latitude is not None and longitude is not None:
        site = CommercialSite(
            id="custom",
            name=name,
            site_type="commercial_area",
            district=district or "Unknown",
            division="",
            latitude=latitude,
            longitude=longitude,
            extent_km=0.0,
            note="Client-supplied coordinates.",
        )
    else:
        raise HTTPException(
            400, "Provide either site_id, or both latitude and longitude."
        )

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Bounding box in SQL to cut the candidate set, exact distance in Python.
    # The archive is small enough that a precise pass over the box costs
    # nothing, and this avoids depending on PostGIS being present.
    min_lat, max_lat, min_lon, max_lon = bounding_box(
        site.latitude, site.longitude, radius_km
    )

    rows = (
        await session.execute(
            select(CrimeIncident)
            .where(
                public_incidents(),
                CrimeIncident.incident_date >= since,
                CrimeIncident.latitude >= min_lat,
                CrimeIncident.latitude <= max_lat,
                CrimeIncident.longitude >= min_lon,
                CrimeIncident.longitude <= max_lon,
            )
            .order_by(CrimeIncident.incident_date.desc())
        )
    ).scalars().all()

    nearby: List[NearbyIncident] = []
    by_category: dict[str, int] = {}
    district_level_count = 0

    for row in rows:
        distance = haversine_km(
            site.latitude, site.longitude, float(row.latitude), float(row.longitude)
        )
        if distance > radius_km:
            continue

        # thana_name == district means thana resolution failed and the row
        # fell back to the district centroid.
        district_level = row.thana_name.strip().lower() == row.district.strip().lower()
        if district_level:
            district_level_count += 1

        nearby.append(
            NearbyIncident(
                id=str(row.id),
                title=row.title,
                crime_category=row.crime_category,
                incident_date=row.incident_date,
                thana_name=row.thana_name,
                district=row.district,
                distance_km=round(distance, 2),
                district_level_only=district_level,
                source_platform=row.source_platform,
                source_handle=row.source_handle,
                verification_level=row.verification_level,
                source_url=row.source_url,
            )
        )
        by_category[row.crime_category] = by_category.get(row.crime_category, 0) + 1

    nearby.sort(key=lambda item: item.distance_km)

    # --- Coverage -------------------------------------------------------
    national_records = await session.scalar(
        select(func.count())
        .select_from(CrimeIncident)
        .where(public_incidents(), CrimeIncident.incident_date >= since)
    )
    district_records = (
        await session.scalar(
            select(func.count())
            .select_from(CrimeIncident)
            .where(
                public_incidents(),
                CrimeIncident.incident_date >= since,
                CrimeIncident.district == site.district,
            )
        )
        if site.district and site.district != "Unknown"
        else national_records
    )

    coverage = assess_coverage(
        district_records=int(district_records or 0),
        national_records=int(national_records or 0),
        incidents_found=len(nearby),
        district=site.district if site.district != "Unknown" else "Bangladesh",
        window_days=days,
    )

    # --- Applicable threats for this class of asset ----------------------
    threats = [
        ApplicableThreat(
            id=p.id,
            name=p.name,
            threat_class=p.threat_class,
            summary=p.summary,
            archive_support=p.archive_support,
            iso27001_controls=_controls_for(p),
        )
        for p in profiles_for_asset_class(site.site_type)
    ]

    radius_warning = None
    if site.extent_km and radius_km < site.extent_km:
        radius_warning = (
            f"The search radius ({radius_km:g} km) is smaller than this "
            f"site's own footprint (about {site.extent_km:g} km). The result "
            f"describes a fraction of the site, not its surroundings - widen "
            f"the radius or use specific building coordinates."
        )

    return ExposureResponse(
        site=_site_out(site),
        radius_km=radius_km,
        window_days=days,
        incident_count=len(nearby),
        by_category=dict(
            sorted(by_category.items(), key=lambda kv: kv[1], reverse=True)
        ),
        incidents=nearby,
        applicable_threats=threats,
        coverage=CoverageOut(
            district_records=coverage.district_records,
            national_records=coverage.national_records,
            signal=coverage.signal,
            interpretation=coverage.interpretation,
        ),
        radius_warning=radius_warning,
        geocoding_note=GEOCODING_NOTE,
        resolution_warning=resolution_warning(radius_km, district_level_count),
        district_level_incidents=district_level_count,
        generated_at=datetime.now(timezone.utc),
    )
