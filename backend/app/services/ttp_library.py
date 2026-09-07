"""Curated TTP catalogue and the risk treatments that answer each pattern.

What this is
------------
A hand-authored library of offence patterns - tactics, techniques and
procedures - each broken into the stages an offender moves through, with the
treatments available to a citizen and to law enforcement at each stage.

Why it is curated rather than derived
-------------------------------------
The obvious design is to cluster the archive's narratives with an LLM and let
the patterns fall out. That was rejected for three reasons:

1. The narratives are de-identified summaries of news reports, not case files.
   They record *that* someone was defrauded, rarely *how*. Clustering them
   would produce categories, which the archive already has, not procedures.
2. Safety guidance that a reader may act on should not be generated fresh on
   every ingest run and shipped unread.
3. The free Gemini quota is already the binding constraint on ingestion.

So the qualitative content here is authored and stable. What *is* computed
live is prevalence: every profile carries match terms, and the API counts how
many archive records actually fit the pattern in the requested window. A
profile the archive cannot evidence says so rather than showing a confident
number - see ``ArchiveSupport``.

Framing
-------
Treatments use the ISO 31000 vocabulary - avoid, reduce, share, accept -
because "what do I do about it" has four possible shapes and readers conflate
them. A control that reduces a risk is not the same as one that transfers the
loss, and telling someone to "be careful" is an accept dressed as a reduce.

Sourcing note on contact channels
---------------------------------
Only channels verified against a primary government source are listed:
999 (national emergency), 333 (government information service), 102 (fire
service) and 16121 (National Consumer Complaint Centre, 24/7) were read off
dncrp.gov.bd and police.gov.bd; cybersupport.women@police.gov.bd is published
on police.gov.bd. Numbers that could not be verified against a primary source
are deliberately absent, because a wrong number in a crisis is worse than no
number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Sequence

# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

TreatmentKind = Literal["avoid", "reduce", "share", "accept"]
Audience = Literal["citizen", "law_enforcement"]

#: How well the archive can evidence a pattern. This is a statement about the
#: *dataset*, not about how real or how common the offence is.
ArchiveSupport = Literal["direct", "partial", "absent"]

SUPPORT_NOTE: dict[ArchiveSupport, str] = {
    "direct": (
        "The archive holds records that match this pattern directly; the "
        "count beside it is real."
    ),
    "partial": (
        "The archive holds adjacent records - the offence is usually reported "
        "under a neighbouring label - so the count understates it."
    ),
    "absent": (
        "The taxonomy has no category for this offence, so the archive cannot "
        "measure it. The pattern is documented here from open reporting; the "
        "count is not evidence of its scale."
    ),
}


@dataclass(frozen=True)
class Stage:
    """One step in the offender's sequence, and where it can be broken."""

    name: str
    description: str
    #: Observable to a potential victim at this stage. Empty when the stage is
    #: invisible from the outside, which is itself worth showing.
    indicators: Sequence[str] = ()


@dataclass(frozen=True)
class Treatment:
    """One control, addressed to one audience."""

    kind: TreatmentKind
    audience: Audience
    action: str
    #: Which stage this bites at, by index into ``TTPProfile.stages``.
    stage_index: int
    note: str = ""
    #: ISO/IEC 27001:2022 Annex A controls this treatment maps onto, so the
    #: output drops straight into a Statement of Applicability discussion
    #: rather than needing translation.
    #:
    #: Deliberately sparse. Most physical-crime treatments have no honest
    #: ISMS analogue, and inventing one would be exactly the sort of
    #: control-washing that makes security paperwork worthless. An empty
    #: tuple means "no ISMS control bites here", which is a real finding.
    iso27001: Sequence[str] = ()


@dataclass(frozen=True)
class TTPProfile:
    """One offence pattern."""

    id: str
    name: str
    threat_class: str
    #: Categories in the archive's taxonomy this pattern presents as.
    categories: Sequence[str]
    summary: str
    archive_support: ArchiveSupport
    stages: Sequence[Stage]
    treatments: Sequence[Treatment]
    #: Case-insensitive substrings counted against title + narrative to
    #: produce live prevalence. Deliberately specific: a term that matches
    #: half the archive tells the reader nothing.
    match_terms: Sequence[str] = ()
    #: Where the pattern description comes from, when not the archive itself.
    provenance: str = ""
    #: Site types from ``commercial_sites.SiteType`` where this threat is
    #: materially relevant to an enterprise asset owner. Empty means the
    #: pattern is a public-safety concern rather than an enterprise risk -
    #: which is a distinction worth preserving, not papering over.
    asset_classes: Sequence[str] = ()


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------

PROFILES: List[TTPProfile] = [
    # =====================================================================
    # FRAUD
    # =====================================================================
    TTPProfile(
        id="fraud-advance-payment-seller",
        name="Vanishing seller (advance payment)",
        threat_class="Fraud",
        categories=("Fraud", "Cybercrime"),
        archive_support="direct",
        summary=(
            "A storefront - most often a Facebook page rather than a website - "
            "advertises goods well below market price, insists on full or "
            "partial payment in advance through a mobile financial service, "
            "then stalls the buyer with delivery excuses until the page is "
            "deleted and the number stops working. The single most common "
            "consumer fraud pattern in Bangladesh, and the least likely to be "
            "reported: individual losses are small enough that pursuing them "
            "costs more than the loss."
        ),
        stages=(
            Stage(
                "Storefront",
                "A page or profile is created and seeded with stock imagery, "
                "fabricated reviews and bought followers to manufacture "
                "trading history.",
                indicators=(
                    "Page created recently, but claims years of trading",
                    "Reviews cluster within a few days of each other",
                    "Product photographs appear on reverse image search",
                    "No physical address, trade licence, or landline",
                ),
            ),
            Stage(
                "Lure",
                "Pricing sits far below the market - typically 40-70% of "
                "retail - with artificial scarcity and a countdown to force a "
                "decision before the buyer checks anything.",
                indicators=(
                    "Price implausible for the item's market rate",
                    "'Limited stock', 'offer ends tonight' pressure",
                    "Conversation pushed off-platform to WhatsApp/IMO",
                ),
            ),
            Stage(
                "Payment capture",
                "Cash on delivery is refused on a pretext - 'the courier does "
                "not accept COD for this item', 'advance confirms the order' - "
                "and payment is directed to a personal MFS number.",
                indicators=(
                    "Personal (not merchant) bKash/Nagad number",
                    "COD refused, or offered then withdrawn",
                    "Payment requested as 'Send Money', not 'Payment'",
                ),
            ),
            Stage(
                "Stall",
                "Delivery is deferred with courier, stock and holiday "
                "excuses, buying time to work the remaining marks before the "
                "complaints become visible on the page.",
                indicators=(
                    "Tracking number that no courier recognises",
                    "Comments disabled, or negative comments deleted",
                ),
            ),
            Stage(
                "Exit",
                "The page is deleted or renamed, numbers are discarded, and "
                "the same operator restarts with fresh assets.",
                indicators=("Page unreachable", "Number switched off or unused"),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Reverse image search the product photographs and check the "
                "page's creation date under Page transparency before "
                "engaging.",
                stage_index=0,
                note="Costs a minute and defeats the majority of these pages.",
                iso27001=("A.5.19", "A.6.3",),
            ),
            Treatment(
                "avoid", "citizen",
                "Treat a refusal of cash on delivery as disqualifying. There "
                "is no legitimate reason a domestic seller cannot offer it.",
                stage_index=2,
                note="The single highest-value rule in this profile.",
                iso27001=("A.5.19",),
            ),
            Treatment(
                "reduce", "citizen",
                "If paying in advance is unavoidable, use a merchant MFS "
                "account rather than a personal one, and keep the transaction "
                "ID, the conversation and the advertisement.",
                stage_index=2,
                note="Merchant accounts are identity-verified; personal ones "
                     "are far weaker evidence and far easier to abandon.",
                iso27001=("A.5.20",),
            ),
            Treatment(
                "share", "citizen",
                "Complain to the National Consumer Complaint Centre on 16121 "
                "(24/7). It is free, and a complaint can carry a compensation "
                "award of up to a quarter of the fine imposed.",
                stage_index=4,
                note="Transfers recovery to a regulator with statutory power, "
                     "rather than absorbing the loss privately.",
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Subpoena the MFS cash-out chain rather than the receiving "
                "number alone. The receiving account is usually a rented or "
                "coerced mule; the cash-out point is where the operator has "
                "to appear in person.",
                stage_index=2,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Cluster complaints by MFS number, device fingerprint and "
                "product imagery across jurisdictions. Individually these are "
                "petty sums that get filed as GDs; aggregated, they usually "
                "cross the threshold that justifies a case.",
                stage_index=4,
                note="The main reason this offence goes unpunished is that "
                     "each victim is below the threshold on their own.",
            ),
            Treatment(
                "share", "law_enforcement",
                "Refer confirmed storefronts to the platform and to the "
                "regulator in batches, so takedown and licensing action run "
                "alongside the criminal case.",
                stage_index=4,
            ),
        ),
        match_terms=(
            "online", "e-commerce", "ecommerce", "bkash", "nagad",
            "advance payment", "facebook page", "অনলাইন", "ই-কমার্স",
            "বিকাশ", "নগদ", "অগ্রিম", "ফেসবুক",
        ),
        # Relevant to enterprises as procurement / supplier-payment fraud,
        # which is the same technique pointed at an accounts payable clerk.
        asset_classes=(
            "commercial_area", "financial_district", "rmg_cluster", "epz",
        ),
    ),
    TTPProfile(
        id="fraud-otp-account-takeover",
        name="OTP capture and account takeover",
        threat_class="Fraud",
        categories=("Cybercrime", "Fraud"),
        archive_support="direct",
        summary=(
            "The offender never breaks anything technical. They telephone the "
            "victim posing as an MFS agent, a bank, a helpline or a prize "
            "draw, manufacture urgency, and get the victim to read back the "
            "one-time code that authorises a transaction the offender has "
            "already initiated."
        ),
        stages=(
            Stage(
                "Target selection",
                "Numbers are harvested from leaked databases, public "
                "marketplace listings, or bought in bulk.",
                indicators=("Caller already knows your name or recent order",),
            ),
            Stage(
                "Pretext call",
                "The caller claims an account problem, a blocked SIM, a "
                "refund or a prize, and asserts authority.",
                indicators=(
                    "Caller ID spoofed to resemble a short code",
                    "Refuses to let you call back on the published number",
                    "Threatens immediate account closure",
                ),
            ),
            Stage(
                "Code capture",
                "The offender triggers a genuine OTP and asks the victim to "
                "confirm or read it back.",
                indicators=(
                    "Any request for a code, PIN or password",
                    "An OTP arrives that you did not ask for",
                ),
            ),
            Stage(
                "Drain and layer",
                "Funds are moved through several accounts within minutes and "
                "cashed out.",
                indicators=("Transaction alerts for payments you did not make",),
            ),
        ),
        treatments=(
            Treatment(
                "avoid", "citizen",
                "No genuine institution asks for an OTP, PIN or password. "
                "Treat any such request as proof of fraud and end the call.",
                stage_index=2,
                note="This one rule defeats the entire pattern.",
                iso27001=("A.6.3", "A.8.5",),
            ),
            Treatment(
                "reduce", "citizen",
                "Hang up and dial the number printed on the card or the "
                "official app - never a number the caller gives you.",
                stage_index=1,
                iso27001=("A.6.3",),
            ),
            Treatment(
                "share", "citizen",
                "Report to the provider immediately; within the first minutes "
                "a transfer can sometimes still be frozen. Women facing "
                "online abuse or extortion can contact Police Cyber Support "
                "for Women at cybersupport.women@police.gov.bd.",
                stage_index=3,
                iso27001=("A.5.24", "A.5.26",),
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Push providers for velocity rules on newly registered "
                "accounts. Layering happens in minutes, so a hold measured in "
                "hours changes recovery rates more than any investigation "
                "conducted afterwards.",
                stage_index=3,
                iso27001=("A.8.16",),
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Work the mule layer as a recruitment offence in its own "
                "right. Mule accounts are typically rented from students and "
                "low-income workers, who are locatable and who lead upward.",
                stage_index=3,
            ),
        ),
        match_terms=(
            "otp", "one-time", "phishing", "hacked", "account takeover",
            "ওটিপি", "হ্যাক", "প্রতারণা", "সাইবার",
        ),
        asset_classes=(
            "financial_district", "commercial_area", "hitech_park", "epz",
            "rmg_cluster",
        ),
    ),
    TTPProfile(
        id="fraud-investment-betting-laundering",
        name="Online betting and investment schemes",
        threat_class="Fraud",
        categories=("Fraud", "Cybercrime"),
        archive_support="direct",
        summary=(
            "Foreign-hosted betting and 'investment' platforms recruit local "
            "agents to move money. Early withdrawals are honoured to build "
            "confidence and generate testimonials; deposits are then "
            "encouraged to grow until withdrawal is blocked behind escalating "
            "fees. The archive carries this pattern chiefly through CID "
            "enforcement against the agent and laundering layer."
        ),
        stages=(
            Stage(
                "Recruitment",
                "Local agents are recruited on commission through social "
                "media, often openly.",
                indicators=("'Earn from home' agent recruitment posts",),
            ),
            Stage(
                "Confidence build",
                "Small deposits are paid out promptly and publicised.",
                indicators=(
                    "Screenshots of winnings as marketing",
                    "Returns quoted as a fixed daily or weekly percentage",
                ),
            ),
            Stage(
                "Escalation",
                "The victim is moved to larger deposits, often borrowed.",
                indicators=("Pressure to reinvest rather than withdraw",),
            ),
            Stage(
                "Withdrawal block",
                "Withdrawal triggers tax, verification or unlocking fees that "
                "never end.",
                indicators=("A fee demanded before you can access your own money",),
            ),
            Stage(
                "Laundering",
                "Funds leave through mule accounts, hundi and crypto.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "avoid", "citizen",
                "A guaranteed fixed return is the definition of the fraud. No "
                "lawful investment can promise a daily percentage.",
                stage_index=1,
            ),
            Treatment(
                "avoid", "citizen",
                "Never pay a fee to release your own funds. Every such fee is "
                "a second theft, and no legitimate platform charges one.",
                stage_index=3,
            ),
            Treatment(
                "reduce", "citizen",
                "Declining to act as an agent is not only prudence - moving "
                "another person's money through your account is itself an "
                "offence, and the account holder is the one who is traceable.",
                stage_index=0,
                iso27001=("A.6.3",),
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Target the payment rails and the agent network rather than "
                "the platform. The site is offshore and replaceable; the "
                "cash-out network is domestic and is not.",
                stage_index=4,
            ),
            Treatment(
                "share", "law_enforcement",
                "Pair prosecution with published warnings while the campaign "
                "is still live. A named advisory during the recruitment stage "
                "prevents more loss than a conviction after it.",
                stage_index=0,
            ),
        ),
        match_terms=(
            "betting", "gambling", "investment", "ponzi", "money laundering",
            "জুয়া", "বেটিং", "বিনিয়োগ", "মানি লন্ডারিং", "অর্থপাচার",
        ),
        asset_classes=("financial_district",),
    ),
    # =====================================================================
    # TRAFFICKING
    # =====================================================================
    TTPProfile(
        id="trafficking-deceptive-recruitment",
        name="Deceptive recruitment into trafficking",
        threat_class="Human trafficking",
        # Scattered deliberately wide. Measured against the live archive,
        # trafficking records land under Other, Fraud and Extortion depending
        # on what the arrest was booked as - which is the taxonomy problem
        # this profile exists to make visible.
        categories=("Other", "Fraud", "Extortion", "Assault"),
        archive_support="partial",
        summary=(
            "Recruitment is by deception rather than force: a job abroad or "
            "in another district, a marriage, or an education placement, "
            "arranged through someone the family already trusts. Control is "
            "established after arrival through debt, document confiscation "
            "and isolation. The taxonomy has no trafficking category, so "
            "these records sit under whatever the arrest was booked as - "
            "Other, Fraud, Extortion - and the count below is therefore a "
            "floor, not a measurement."
        ),
        provenance=(
            "Stage model and indicators are from standard trafficking "
            "indicator sets and open reporting, not derived from this "
            "archive. The prevalence figure is from the archive."
        ),
        stages=(
            Stage(
                "Approach",
                "An offer arrives through a known intermediary - a relative, "
                "a neighbour, a local broker - which is what makes it work.",
                indicators=(
                    "Recruiter is known socially but not verifiable professionally",
                    "Wages quoted far above the going rate for the work",
                    "Urgency: the place must be taken this week",
                ),
            ),
            Stage(
                "Fee and debt",
                "A placement fee is paid, frequently by mortgaging land or "
                "borrowing, establishing the debt used later as leverage.",
                indicators=(
                    "No written contract, or one in a language not explained",
                    "Fee demanded in cash with no receipt",
                    "No verifiable licence number for the recruiting agency",
                ),
            ),
            Stage(
                "Movement",
                "Travel is arranged by the recruiter, sometimes on visitor or "
                "irregular routes rather than a work visa.",
                indicators=(
                    "Passport held 'for processing'",
                    "Route or employer changes without explanation",
                    "Travelling with strangers arranged by the broker",
                ),
            ),
            Stage(
                "Control",
                "On arrival the agreed terms are replaced: documents are "
                "confiscated, the debt is inflated, movement and contact are "
                "restricted.",
                indicators=(
                    "Contact home becomes monitored, scripted or stops",
                    "Different employer, work or location than promised",
                ),
            ),
            Stage(
                "Exploitation",
                "Labour or sexual exploitation is sustained by the debt, the "
                "absence of documents and fear of the authorities.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Verify the recruiting agency's licence with the Bureau of "
                "Manpower, Employment and Training before any money moves, "
                "and insist on a written contract you keep a copy of.",
                stage_index=1,
                note="Verification is free; the fee is usually not recoverable.",
                iso27001=("A.5.19", "A.5.21",),
            ),
            Treatment(
                "reduce", "citizen",
                "Keep photographs of the passport, visa, contract and the "
                "recruiter's identity with someone at home, and agree a "
                "check-in schedule and a duress word before departure.",
                stage_index=2,
                note="Makes both the identification and the missed check-in "
                     "actionable rather than a family's suspicion.",
                iso27001=("A.5.24",),
            ),
            Treatment(
                "avoid", "citizen",
                "Nobody legitimate needs to hold your passport. A recruiter "
                "who keeps it has already taken the step that makes leaving "
                "impossible.",
                stage_index=2,
            ),
            Treatment(
                "share", "citizen",
                "If someone has stopped making contact or their circumstances "
                "have changed on arrival, call 999 and involve the mission in "
                "the destination country. Waiting to be certain is the common "
                "and costly mistake.",
                stage_index=3,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Treat unlicensed recruitment and document retention as the "
                "intervention point. Both are provable before exploitation "
                "begins, which is the only stage at which the victim is still "
                "inside the jurisdiction.",
                stage_index=1,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Work the financial trail: placement fees are collected "
                "locally and leave a domestic record even when the "
                "exploitation is offshore.",
                stage_index=1,
            ),
            Treatment(
                "share", "law_enforcement",
                "Screen returnees and irregular-migration cases for "
                "trafficking indicators rather than processing them as "
                "immigration matters, which is where most cases are lost.",
                stage_index=4,
                iso27001=("A.5.19",),
            ),
            Treatment(
                "accept", "law_enforcement",
                "Residual: where exploitation occurs wholly outside the "
                "jurisdiction, domestic action is limited to the recruitment "
                "and financial layers. Naming that limit honestly is better "
                "than implying a reach that does not exist.",
                stage_index=4,
            ),
        ),
        match_terms=(
            "trafficking", "trafficked", "মানব পাচার", "নারী পাচার",
            "শিশু পাচার", "মানবপাচার",
        ),
        asset_classes=(
            "rmg_cluster", "epz", "economic_zone", "port", "land_port",
        ),
    ),
    # =====================================================================
    # HOMICIDE
    # =====================================================================
    TTPProfile(
        id="homicide-domestic-escalation",
        name="Domestic homicide following escalation",
        threat_class="Homicide",
        categories=("Homicide", "Assault"),
        archive_support="partial",
        summary=(
            "The least random and most predictable homicide pattern. It is "
            "preceded by a documented history - prior assaults, threats, "
            "dowry demands, separation - and the risk peaks around separation "
            "or its announcement. Reporting usually surfaces the killing "
            "without the history, so the archive shows the endpoint and not "
            "the escalation that preceded it."
        ),
        stages=(
            Stage(
                "History",
                "Coercive control, financial restriction and isolation, "
                "frequently unreported.",
                indicators=(
                    "Movement, phone or money controlled",
                    "Isolation from family and friends",
                    "Escalating dowry or property demands",
                ),
            ),
            Stage(
                "Escalation",
                "Assaults increase in frequency or severity; threats become "
                "specific.",
                indicators=(
                    "Threats naming a method or a deadline",
                    "Strangulation - a strong statistical predictor of "
                    "later lethal violence",
                    "Weapon introduced into the home",
                ),
            ),
            Stage(
                "Trigger",
                "Separation, a complaint, or an external intervention.",
                indicators=(
                    "Announced separation or filed complaint",
                    "Threats of suicide or of harming children",
                ),
            ),
            Stage(
                "Act",
                "Usually at home, usually with what is to hand.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Record the history - dates, photographs, messages, medical "
                "notes - and keep the copy somewhere the other person cannot "
                "reach. It is what converts a pattern into a case.",
                stage_index=0,
            ),
            Treatment(
                "reduce", "citizen",
                "Plan the separation rather than announcing it: documents, "
                "money and a destination arranged first, and someone told in "
                "advance. Risk rises at the point of announcement, not after "
                "the departure.",
                stage_index=2,
                note="The most consequential and most often inverted step.",
            ),
            Treatment(
                "share", "citizen",
                "Call 999. Report strangulation and specific threats "
                "explicitly - they change how the risk is assessed.",
                stage_index=1,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Apply structured risk assessment at every domestic call and "
                "flag strangulation, threats to kill and separation "
                "specifically, rather than grading by visible injury.",
                stage_index=1,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Link repeat calls to an address and a household rather than "
                "treating each as a first occurrence. Escalation is only "
                "visible in the sequence.",
                stage_index=1,
            ),
            Treatment(
                "share", "law_enforcement",
                "Co-ordinate with the courts on protection orders around the "
                "separation window, when risk is concentrated.",
                stage_index=2,
            ),
        ),
        match_terms=(
            "domestic", "wife", "husband", "dowry", "স্ত্রী", "স্বামী",
            "যৌতুক", "পারিবারিক", "গৃহবধূ",
        ),
        # Deliberately no asset_classes. This is a public-safety pattern, not
        # an enterprise one, and dressing it as a corporate risk to pad an
        # assessment would be dishonest. It stays in the catalogue because the
        # portal serves the public as well as clients.
    ),
    TTPProfile(
        id="homicide-land-dispute",
        name="Land and property dispute homicide",
        threat_class="Homicide",
        categories=("Homicide", "Assault"),
        archive_support="partial",
        summary=(
            "A long-running boundary, inheritance or possession dispute, "
            "often already in litigation, that resolves into a mass "
            "confrontation. Violence is frequently collective and pre-arranged "
            "rather than spontaneous, which is what makes it both foreseeable "
            "and preventable."
        ),
        stages=(
            Stage(
                "Dispute",
                "Competing claims over boundary, inheritance or possession, "
                "typically with a civil case running.",
                indicators=("Existing litigation", "Contested mutation records"),
            ),
            Stage(
                "Mobilisation",
                "Both sides gather kin and hired men; the dispute becomes "
                "collective.",
                indicators=(
                    "Outsiders arriving in the village",
                    "Open threats ahead of a court date or harvest",
                ),
            ),
            Stage(
                "Confrontation",
                "A possession attempt at a predictable moment - harvest, a "
                "court date, a construction start.",
                indicators=("Announced intention to take possession",),
            ),
            Stage(
                "Escalation to lethal force",
                "Agricultural implements and locally made weapons; deaths "
                "typically follow from a melee rather than a single attack.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Keep possession disputes in the civil process and do not "
                "attempt self-help possession, which is what converts a land "
                "case into a homicide.",
                stage_index=2,
            ),
            Treatment(
                "share", "citizen",
                "Report threats and mobilisation to the thana *before* the "
                "confrontation date. A pre-emptive report is on record; an "
                "after-the-fact one is a witness statement.",
                stage_index=1,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Treat known disputes as scheduled risk. Court dates, "
                "harvests and possession attempts are calendar events, so "
                "presence can be planned rather than dispatched.",
                stage_index=2,
                note="The rare pattern where the date is knowable in advance.",
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Act on mobilisation reports under preventive powers instead "
                "of waiting for the breach.",
                stage_index=1,
            ),
        ),
        match_terms=(
            "land dispute", "land", "property dispute", "জমি", "জমিজমা",
            "সীমানা", "দখল", "পূর্বশত্রুতা",
        ),
        # Land acquisition for zones and factory expansion is a live source
        # of exactly this dispute, so it is an enterprise risk here even
        # though the offence itself is not a corporate one.
        asset_classes=("economic_zone", "epz", "rmg_cluster"),
    ),
    TTPProfile(
        id="robbery-transit-mugging",
        name="Transit robbery and snatch",
        threat_class="Violent acquisitive",
        categories=("Robbery", "Theft", "Assault"),
        archive_support="direct",
        summary=(
            "Opportunistic robbery organised around predictable transit "
            "behaviour: rickshaw and CNG passengers stopped at unlit stretches, "
            "phone snatches from open windows in stalled traffic, and the "
            "'gamcha party' style vehicle-based robbery on intercity routes. "
            "Escalates to homicide when the victim resists."
        ),
        stages=(
            Stage(
                "Selection",
                "Targets are chosen on visible cues - a phone in hand, a bag "
                "on the lap, a lone passenger late at night.",
                indicators=(
                    "Being followed after leaving an ATM or a bank",
                    "A driver who declines the route you asked for",
                ),
            ),
            Stage(
                "Isolation",
                "The victim is taken to, or waited for at, an unlit or "
                "unmonitored stretch.",
                indicators=(
                    "Unexplained detour or an unfamiliar route",
                    "The vehicle stopping to pick up additional passengers",
                ),
            ),
            Stage(
                "Confrontation",
                "Rapid approach, usually by two or more, often with a blade "
                "displayed rather than used.",
                indicators=(),
            ),
            Stage(
                "Disposal",
                "Handsets are moved through second-hand markets within hours, "
                "IMEI altered where possible.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Keep the phone away from open windows in stalled traffic and "
                "off the seat beside you. Snatch requires reach, so removing "
                "reach removes the offence.",
                stage_index=0,
                iso27001=("A.7.9", "A.8.1",),
            ),
            Treatment(
                "reduce", "citizen",
                "Share your live trip location, and refuse a ride whose route "
                "or passenger count changes after you board.",
                stage_index=1,
                iso27001=("A.7.9",),
            ),
            Treatment(
                "accept", "citizen",
                "If confronted, give up the property. Resistance is what "
                "turns these into the injuries and deaths in this archive; "
                "the property is insurable and replaceable, and you are not.",
                stage_index=2,
                note="A deliberate accept: the residual loss is preferable to "
                     "the alternative.",
            ),
            Treatment(
                "share", "citizen",
                "Report with the IMEI and call 999. The IMEI is what makes a "
                "handset recoverable and links otherwise separate cases.",
                stage_index=3,
                iso27001=("A.5.24", "A.5.26",),
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Map snatch reports to time and road segment and patrol the "
                "concentrations. This offence is unusually well predicted by "
                "place and hour.",
                stage_index=1,
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Work the second-hand handset market as the disposal choke "
                "point; the offenders rotate but the outlets do not.",
                stage_index=3,
            ),
        ),
        match_terms=(
            "snatch", "mugging", "robbed", "robbery", "ছিনতাই", "ডাকাতি",
            "মোবাইল ছিনতাই",
        ),
        asset_classes=(
            "rmg_cluster", "epz", "commercial_area", "financial_district",
            "diplomatic_zone", "hitech_park", "airport",
        ),
    ),
    TTPProfile(
        id="extortion-chandabaji",
        name="Protection extortion (chandabaji)",
        threat_class="Extortion",
        categories=("Extortion",),
        archive_support="direct",
        summary=(
            "Recurring demands on businesses, construction sites and transport "
            "operators, backed by the threat of disruption or violence and "
            "frequently by claimed political protection. Sustained by the "
            "victim's rational judgement that paying costs less than "
            "reporting."
        ),
        stages=(
            Stage(
                "Identification",
                "New businesses, construction starts and transport routes are "
                "identified as revenue.",
                indicators=("An approach that coincides with opening or a build start",),
            ),
            Stage(
                "Demand",
                "A first demand framed as a subscription, donation or "
                "toll, often via an intermediary.",
                indicators=(
                    "Demand framed as a 'donation' or 'contribution'",
                    "Claimed backing from a party or local figure",
                ),
            ),
            Stage(
                "Demonstration",
                "Non-payment is answered with work stoppage, vandalism or an "
                "assault calibrated to be survivable.",
                indicators=("Equipment damaged or workers turned away",),
            ),
            Stage(
                "Regularisation",
                "The payment becomes periodic and is treated by both sides as "
                "a cost of operating.",
                indicators=(),
            ),
        ),
        treatments=(
            Treatment(
                "reduce", "citizen",
                "Record demands - dates, amounts, intermediaries, any "
                "message - before deciding anything. It is the only asset "
                "that appreciates.",
                stage_index=1,
                iso27001=("A.5.24",),
            ),
            Treatment(
                "avoid", "citizen",
                "Understand that the first payment sets the schedule rather "
                "than settling it. Demands escalate from a paying victim, not "
                "from a refusing one.",
                stage_index=3,
            ),
            Treatment(
                "share", "citizen",
                "Report collectively through a trade or owners' association "
                "where possible. Collective reporting removes the individual "
                "identifiability that makes reprisal credible.",
                stage_index=1,
                iso27001=("A.5.5",),
            ),
            Treatment(
                "reduce", "law_enforcement",
                "Build on the payment record rather than on testimony alone. "
                "Where demands run through MFS the schedule is documentary "
                "and does not depend on a witness who can be reached.",
                stage_index=3,
            ),
            Treatment(
                "share", "law_enforcement",
                "Provide a reporting route that does not identify the "
                "complainant to the local thana, since claimed local "
                "protection is precisely what suppresses reporting.",
                stage_index=1,
            ),
        ),
        match_terms=(
            "extortion", "chanda", "toll", "চাঁদা", "চাঁদাবাজি", "চাঁদাবাজ",
        ),
        asset_classes=(
            "rmg_cluster", "epz", "economic_zone", "commercial_area", "port",
            "land_port",
        ),
    ),
]


def profile_by_id(profile_id: str) -> TTPProfile | None:
    for profile in PROFILES:
        if profile.id == profile_id:
            return profile
    return None


def threat_classes() -> List[str]:
    """Distinct threat classes, in catalogue order."""
    seen: List[str] = []
    for profile in PROFILES:
        if profile.threat_class not in seen:
            seen.append(profile.threat_class)
    return seen


# ---------------------------------------------------------------------------
# ISO/IEC 27001:2022 Annex A control titles
#
# Only the controls actually referenced above. Kept here rather than in the
# API layer so the mapping and its labels cannot drift apart.
# ---------------------------------------------------------------------------
ISO27001_CONTROL_TITLE: dict[str, str] = {
    "A.5.5": "Contact with authorities",
    "A.5.19": "Information security in supplier relationships",
    "A.5.20": "Addressing information security within supplier agreements",
    "A.5.21": "Managing information security in the ICT supply chain",
    "A.5.24": "Information security incident management planning and preparation",
    "A.5.26": "Response to information security incidents",
    "A.6.3": "Information security awareness, education and training",
    "A.7.9": "Security of assets off-premises",
    "A.8.1": "User endpoint devices",
    "A.8.5": "Secure authentication",
    "A.8.16": "Monitoring activities",
}


def profiles_for_asset_class(asset_class: str) -> List[TTPProfile]:
    """Profiles materially relevant to one site type."""
    return [p for p in PROFILES if asset_class in p.asset_classes]
