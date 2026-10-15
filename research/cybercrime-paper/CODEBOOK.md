# Codebook — cybercrime in Bangladeshi news

Generated from `backend/app/research/cyber_codebook.py` — do not edit by hand; change the module and run `python backfill.py --topic cyber codebook`.

The model is given these exact definitions, so code only what the article states. Each coder works alone on their own copy of `coding_sheet.csv`; disagreements are settled afterwards.

If `is_cybercrime` is `no`, fill every other column with its `none` / `not_applicable` / `no` / `not_mentioned` option and leave `amount_bdt` blank.

## `is_cybercrime`

Does the article report a specific cybercrime incident in Bangladesh - an offence, an arrest, a case filed or a court action about one?

| Value | Use when |
|---|---|
| `yes` | A specific incident, arrest, case or verdict, in Bangladesh, where a computer, phone, network or online service is the means or the target of the offence. |
| `no` | Anything else: offline crime, policy or law debate, awareness pieces, statistics round-ups, incidents abroad, warnings about a risk rather than an event. |

## `cyber_type`

What kind of cybercrime is it? Pick the main one.

| Value | Use when |
|---|---|
| `mfs_fraud` | Fraud through mobile financial services: fake agent or customer-care calls, wrong-send tricks, OTP/PIN theft on bKash, Nagad, Rocket, Upay. |
| `ecommerce_fraud` | Online shopping fraud: paid goods never delivered, fake shops or Facebook pages, Ponzi-style e-commerce (Evaly, e-Orange type). |
| `other_online_fraud` | Other online deception for money: fake jobs, visas, loans, lottery, investment or crypto schemes, romance scams. |
| `sextortion_image_abuse` | Threats to share, or sharing of, intimate images or videos; morphed or deepfake sexual content. |
| `harassment_stalking` | Online harassment, threats, stalking or impersonation without a sexual-image or money element. |
| `account_hacking` | Taking over an individual's social-media, email or phone account (not primarily to extort with images). |
| `attack_on_organisation` | Hacking, ransomware, defacement, DDoS, data theft or fraudulent transfers against a business, bank or government system. |
| `data_breach` | Leak or exposure of personal data held by an organisation (e.g. NID data), with no named attacker act described. |
| `online_gambling` | Online gambling or betting operations. |
| `speech_offence` | Prosecution or arrest over online speech: posts, defamation, 'rumours', 'hurting religious sentiment', under the DSA/CSA or similar. |
| `other_cyber` | A cybercrime that fits none of the above. |
| `none` | Use when is_cybercrime is 'no'. |

## `platform`

Which platform or channel is mainly involved?

| Value | Use when |
|---|---|
| `facebook` | Facebook, including Messenger and Facebook pages. |
| `whatsapp_imo_telegram` | WhatsApp, IMO, Telegram, Viber or similar messaging apps. |
| `other_social` | TikTok, YouTube, Instagram, X or other social media. |
| `mfs` | bKash, Nagad, Rocket, Upay or another mobile financial service. |
| `bank_card` | Bank accounts, cards, ATMs, internet banking, SWIFT. |
| `ecommerce_site` | An e-commerce website or app. |
| `phone_sms_email` | Phone calls, SMS or email, with no app named. |
| `org_system` | An organisation's own website, server or network. |
| `other` | Another named platform. |
| `unknown` | The article does not say. |
| `none` | Use when is_cybercrime is 'no'. |

## `victim_type`

Who is the victim?

| Value | Use when |
|---|---|
| `individual` | One or more named or described private persons. |
| `business` | A company, shop or other private organisation. |
| `financial_institution` | A bank, MFS provider or other financial institution. |
| `government` | A government body, its systems or officials in their official role. |
| `public_many` | Many members of the public, not individually described (a campaign, a data leak). |
| `no_direct_victim` | No direct victim (e.g. gambling, many speech offences). |
| `unknown` | The article does not say. |
| `none` | Use when is_cybercrime is 'no'. |

## `victim_gender`

If the victims are individuals, what is their gender as reported?

| Value | Use when |
|---|---|
| `female` | All reported individual victims are women or girls. |
| `male` | All reported individual victims are men or boys. |
| `mixed` | Both. |
| `unknown` | Individuals, but gender not stated or inferable from the text. |
| `not_applicable` | Victim is not an individual, or is_cybercrime is 'no'. |

## `arrest_reported`

Does the article report that at least one suspect was arrested or detained?

| Value | Use when |
|---|---|
| `yes` | At least one arrest or detention is reported. |
| `no` | No arrest reported, or is_cybercrime is 'no'. |

## `legal_basis`

Which law does the article say the case was filed under?

| Value | Use when |
|---|---|
| `cyber_security_ordinance_2025` | Cyber Security Ordinance 2025 (in force 21 May 2025; repealed the CSA 2023). |
| `cyber_security_act_2023` | Cyber Security Act 2023. |
| `digital_security_act_2018` | Digital Security Act 2018. |
| `ict_act_2006` | Information and Communication Technology Act 2006. |
| `pornography_control_act_2012` | Pornography Control Act 2012. |
| `penal_code` | Penal Code only. |
| `other_law` | Another named law. |
| `not_mentioned` | No law named, or is_cybercrime is 'no'. |

## `district`

In which district did the incident happen (or the victim live)? Write the district name in English, e.g. 'Dhaka', 'Chattogram'. Write 'unknown' if not stated, 'none' if is_cybercrime is 'no'.

## `incident_date`

When did the incident (or the arrest, if that is all that is dated) happen? YYYY-MM-DD. Use the publication date to resolve 'yesterday' or a bare day and month. Write 'unknown' if it cannot be worked out, 'none' if is_cybercrime is 'no'.

## `amount_bdt`

Money lost or demanded, in Taka, as a plain number (convert 'Tk 5 lakh' to 500000, 'Tk 2 crore' to 20000000). Blank if not stated.

_Recorded for analysis; not scored in validation._
