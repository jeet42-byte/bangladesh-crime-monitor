"""Codebook for the cybercrime study: one definition for coders and the model.

Why one source
--------------
The validation in ``research/cybercrime-paper/PLAN.md`` compares human coding
with model output field by field. That comparison only means something if
both sides answered the same question with the same options. So every field,
its allowed values and their definitions live here, and both the model prompt
and the coders' ``CODEBOOK.md`` are generated from this module.

    python backend/backfill.py --topic cyber codebook   # rewrites CODEBOOK.md

Change a definition here, regenerate, and re-code - never edit one side.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class Field:
    name: str
    question: str
    #: (value, definition). None for free-text fields.
    options: Optional[Tuple[Tuple[str, str], ...]] = None
    #: Scored in the validation (model vs. gold) and in coder agreement.
    scored: bool = True
    #: How to compare when scoring: "exact", "text" (case/space-insensitive)
    #: or "date" (within DATE_TOLERANCE_DAYS).
    compare: str = "exact"

    @property
    def values(self) -> List[str]:
        return [value for value, _ in self.options or ()]


DATE_TOLERANCE_DAYS = 3

FIELDS: Tuple[Field, ...] = (
    Field(
        "is_cybercrime",
        "Does the article report a specific cybercrime incident in Bangladesh - "
        "an offence, an arrest, a case filed, a court action, or a specific scam "
        "or abuse campaign circulating in Bangladesh?",
        (
            ("yes", "A specific incident, arrest, case or verdict in Bangladesh or "
                    "with Bangladeshi victims, where a computer, phone, network or "
                    "online service is the means or the target of the offence. "
                    "Includes a specific named scam or abuse campaign reported as "
                    "currently targeting people in Bangladesh (e.g. particular fake "
                    "pages, deepfake ads or fraud calls)."),
            ("no", "Anything else: offline crime; policy, law or court-order "
                   "debate; awareness pieces and safety tips; statistics and trend "
                   "reports; warnings about a risk rather than an event; and "
                   "incidents abroad or worldwide (e.g. a global data leak, a "
                   "foreign ransomware takedown) unless the article reports "
                   "Bangladeshi victims specifically."),
        ),
    ),
    Field(
        "cyber_type",
        "What kind of cybercrime is it? Pick the main one.",
        (
            ("mfs_fraud", "Fraud through mobile financial services: fake agent or "
                          "customer-care calls, wrong-send tricks, OTP/PIN theft on "
                          "bKash, Nagad, Rocket, Upay."),
            ("ecommerce_fraud", "Online shopping fraud: paid goods never delivered, "
                                "fake shops or Facebook pages, Ponzi-style "
                                "e-commerce (Evaly, e-Orange type)."),
            ("other_online_fraud", "Other online deception for money: fake jobs, "
                                   "visas, loans, lottery, investment or crypto "
                                   "schemes, romance scams."),
            ("sextortion_image_abuse", "Threats to share, or sharing of, intimate "
                                       "images or videos; morphed or deepfake "
                                       "sexual content."),
            ("harassment_stalking", "Online harassment, threats, stalking or "
                                    "impersonation without a sexual-image or "
                                    "money element."),
            ("account_hacking", "Taking over an individual's social-media, email "
                                "or phone account (not primarily to extort with "
                                "images)."),
            ("attack_on_organisation", "Hacking, ransomware, defacement, DDoS, data "
                                       "theft or fraudulent transfers against a "
                                       "business, bank or government system."),
            ("data_breach", "Leak or exposure of personal data held by an "
                            "organisation (e.g. NID data), with no named attacker "
                            "act described."),
            ("online_gambling", "Online gambling or betting operations."),
            ("speech_offence", "Prosecution or arrest over online speech: posts, "
                               "defamation, 'rumours', 'hurting religious "
                               "sentiment', under the DSA/CSA or similar."),
            ("other_cyber", "A cybercrime that fits none of the above."),
            ("none", "Use when is_cybercrime is 'no'."),
        ),
    ),
    Field(
        "platform",
        "Which platform or channel is mainly involved?",
        (
            ("facebook", "Facebook, including Messenger and Facebook pages."),
            ("whatsapp_imo_telegram", "WhatsApp, IMO, Telegram, Viber or similar "
                                      "messaging apps."),
            ("other_social", "TikTok, YouTube, Instagram, X or other social media."),
            ("mfs", "bKash, Nagad, Rocket, Upay or another mobile financial service."),
            ("bank_card", "Bank accounts, cards, ATMs, internet banking, SWIFT."),
            ("ecommerce_site", "An e-commerce website or app."),
            ("phone_sms_email", "Phone calls, SMS or email, with no app named."),
            ("org_system", "An organisation's own website, server or network."),
            ("other", "Another named platform."),
            ("unknown", "The article does not say."),
            ("none", "Use when is_cybercrime is 'no'."),
        ),
    ),
    Field(
        "victim_type",
        "Who is the victim?",
        (
            ("individual", "One or more named or described private persons."),
            ("business", "A company, shop or other private organisation."),
            ("financial_institution", "A bank, MFS provider or other financial "
                                      "institution."),
            ("government", "A government body, its systems or officials in their "
                           "official role."),
            ("public_many", "Many members of the public, not individually "
                            "described (a campaign, a data leak)."),
            ("no_direct_victim", "No direct victim (e.g. gambling, many speech "
                                 "offences)."),
            ("unknown", "The article does not say."),
            ("none", "Use when is_cybercrime is 'no'."),
        ),
    ),
    Field(
        "victim_gender",
        "If the victims are individuals, what is their gender as reported?",
        (
            ("female", "All reported individual victims are women or girls."),
            ("male", "All reported individual victims are men or boys."),
            ("mixed", "Both."),
            ("unknown", "Individuals, but gender not stated or inferable from "
                        "the text."),
            ("not_applicable", "Victim is not an individual, or is_cybercrime "
                               "is 'no'."),
        ),
    ),
    Field(
        "arrest_reported",
        "Does the article report that at least one suspect was arrested or "
        "detained?",
        (
            ("yes", "At least one arrest or detention is reported."),
            ("no", "No arrest reported, or is_cybercrime is 'no'."),
        ),
    ),
    Field(
        "legal_basis",
        "Which law does the article say the case was filed under?",
        (
            ("cyber_security_ordinance_2025", "Cyber Security Ordinance 2025 (in force "
                                              "21 May 2025; repealed the CSA 2023)."),
            ("cyber_security_act_2023", "Cyber Security Act 2023."),
            ("digital_security_act_2018", "Digital Security Act 2018."),
            ("ict_act_2006", "Information and Communication Technology Act 2006."),
            ("pornography_control_act_2012", "Pornography Control Act 2012."),
            ("penal_code", "Penal Code only."),
            ("other_law", "Another named law."),
            ("not_mentioned", "No law named, or is_cybercrime is 'no'."),
        ),
    ),
    Field(
        "district",
        "In which district did the incident happen (or the victim live)? Write "
        "the district name in English, e.g. 'Dhaka', 'Chattogram'. Write "
        "'unknown' if not stated, 'none' if is_cybercrime is 'no'.",
        compare="text",
    ),
    Field(
        "incident_date",
        "When did the incident (or the arrest, if that is all that is dated) "
        "happen? YYYY-MM-DD. Use the publication date to resolve 'yesterday' "
        "or a bare day and month. Write 'unknown' if it cannot be worked out, "
        "'none' if is_cybercrime is 'no'.",
        compare="date",
    ),
    Field(
        "amount_bdt",
        "Money lost or demanded, in Taka, as a plain number (convert 'Tk 5 "
        "lakh' to 500000, 'Tk 2 crore' to 20000000). Blank if not stated.",
        scored=False,
    ),
)

FIELDS_BY_NAME: Dict[str, Field] = {f.name: f for f in FIELDS}


# ---------------------------------------------------------------------------
# Model prompt and schema, generated from FIELDS
# ---------------------------------------------------------------------------
def _field_block(field: Field) -> str:
    lines = [f"- `{field.name}`: {field.question}"]
    for value, definition in field.options or ():
        lines.append(f"    - `{value}`: {definition}")
    return "\n".join(lines)


SYSTEM_PROMPT = (
    "You code Bangladeshi news articles for an academic study of cybercrime. "
    "Read the article and fill in every field below, exactly as a trained "
    "human coder would, using only what the article states. Do not guess: "
    "when the article does not say, use 'unknown' (or leave amount_bdt "
    "empty). If is_cybercrime is 'no', set every other field to its 'none', "
    "'not_applicable', 'no' or 'not_mentioned' option.\n\n"
    "Fields:\n"
    + "\n".join(_field_block(f) for f in FIELDS)
    + "\n\nReturn JSON conforming to the provided schema. Return nothing else."
)


def response_schema() -> Dict[str, object]:
    properties: Dict[str, object] = {}
    for field in FIELDS:
        if field.options:
            properties[field.name] = {"type": "string", "enum": field.values}
        else:
            properties[field.name] = {"type": "string"}
    return {
        "type": "object",
        "properties": properties,
        "required": [f.name for f in FIELDS],
    }


def normalise_record(raw: Dict[str, object]) -> Dict[str, str]:
    """Coerce model output to codebook values; unknown options become ''."""
    record: Dict[str, str] = {}
    for field in FIELDS:
        value = str(raw.get(field.name) or "").strip()
        if field.options:
            value = value.lower()
            if value not in field.values:
                value = ""
        record[field.name] = value
    return record


# ---------------------------------------------------------------------------
# Human-readable codebook for coders
# ---------------------------------------------------------------------------
def codebook_markdown() -> str:
    parts = [
        "# Codebook — cybercrime in Bangladeshi news",
        "",
        "Generated from `backend/app/research/cyber_codebook.py` — do not edit "
        "by hand; change the module and run "
        "`python backfill.py --topic cyber codebook`.",
        "",
        "The model is given these exact definitions, so code only what the "
        "article states. Each coder works alone on their own copy of "
        "`coding_sheet.csv`; disagreements are settled afterwards.",
        "",
        "If `is_cybercrime` is `no`, fill every other column with its "
        "`none` / `not_applicable` / `no` / `not_mentioned` option and leave "
        "`amount_bdt` blank.",
        "",
    ]
    for field in FIELDS:
        parts.append(f"## `{field.name}`")
        parts.append("")
        parts.append(field.question)
        parts.append("")
        if field.options:
            parts.append("| Value | Use when |")
            parts.append("|---|---|")
            for value, definition in field.options:
                parts.append(f"| `{value}` | {definition} |")
            parts.append("")
        if not field.scored:
            parts.append("_Recorded for analysis; not scored in validation._")
            parts.append("")
    return "\n".join(parts).rstrip() + "\n"
