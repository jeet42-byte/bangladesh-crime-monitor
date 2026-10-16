/**
 * Cyber-incident typing for the Cyber page.
 *
 * The types and their order mirror the research codebook on the cybercrime
 * paper branch (backend/app/research/cyber_codebook.py, `cyber_type`), so the
 * page and the paper speak the same language. The live archive does not yet
 * store a cyber type per record, so here it is assigned by keyword over the
 * English title and summary the extractor writes. That is a first pass, not
 * the validated coding - the page says so where it shows the breakdown.
 */

import type { CrimeIncident } from "@/types/crime";

export type CyberType =
  | "mfs_fraud"
  | "ecommerce_fraud"
  | "other_online_fraud"
  | "sextortion_image_abuse"
  | "harassment_stalking"
  | "account_hacking"
  | "attack_on_organisation"
  | "data_breach"
  | "online_gambling"
  | "speech_offence"
  | "other_cyber";

export const CYBER_TYPE_LABEL: Record<CyberType, string> = {
  mfs_fraud: "Mobile money fraud",
  ecommerce_fraud: "E-commerce fraud",
  other_online_fraud: "Other online fraud",
  sextortion_image_abuse: "Sextortion & image abuse",
  harassment_stalking: "Online harassment",
  account_hacking: "Account hacking",
  attack_on_organisation: "Attack on organisation",
  data_breach: "Data breach",
  online_gambling: "Online gambling",
  speech_offence: "Online speech case",
  other_cyber: "Other cyber",
};

export const CYBER_TYPE_HELP: Record<CyberType, string> = {
  mfs_fraud: "Fake agent or customer-care calls, wrong-send tricks, OTP/PIN theft on bKash, Nagad, Rocket.",
  ecommerce_fraud: "Paid goods never delivered, fake shops or Facebook pages, Ponzi-style e-commerce.",
  other_online_fraud: "Fake jobs, visas, loans, lottery, investment or crypto schemes, romance scams.",
  sextortion_image_abuse: "Threats to share, or sharing of, intimate images; morphed or deepfake content.",
  harassment_stalking: "Online harassment, threats, stalking or impersonation.",
  account_hacking: "Takeover of a person's social-media, email or phone account.",
  attack_on_organisation: "Hacking, ransomware, defacement or fraudulent transfers against an organisation.",
  data_breach: "Leak or exposure of personal data held by an organisation.",
  online_gambling: "Online gambling or betting operations.",
  speech_offence: "Arrests or cases over online posts under the DSA/CSA or similar.",
  other_cyber: "Cybercrime that fits none of the above.",
};

// First match wins, so the order matters: the specific harms come before the
// broad fraud buckets they would otherwise be swallowed by.
const RULES: ReadonlyArray<readonly [CyberType, RegExp]> = [
  ["sextortion_image_abuse", /sextort|intimate (?:image|photo|video)|obscene (?:image|photo|video)|objectionable (?:image|photo|video)|private (?:photo|video)|deepfake|morphed|nude|revenge porn/i],
  ["online_gambling", /gambl|betting|casino/i],
  ["speech_offence", /digital security act|cyber security act|cyber security ordinance|hurting religious|defamatory post|rumou?r|propaganda|facebook post|for (?:a |his |her )?post/i],
  ["data_breach", /data (?:leak|breach)|leaked data|personal data|nid (?:data|information)|database (?:leak|exposed)/i],
  ["attack_on_organisation", /ransomware|defac|ddos|server|bank'?s? (?:system|account)|swift|website (?:hack|was hacked)|cyber ?attack/i],
  ["mfs_fraud", /bkash|nagad|rocket|upay|mobile (?:financial|banking)|\bmfs\b|\botp\b|\bpin\b|agent/i],
  ["ecommerce_fraud", /e-?commerce|f-?commerce|online shop|facebook page|delivery|evaly|e-orange|pre-?order/i],
  ["account_hacking", /hack(?:ed|ing)? (?:into |the )?(?:facebook|account|id|email|phone)|account (?:was )?hacked|took over|account takeover/i],
  ["harassment_stalking", /harass|stalk|threat|impersonat|fake (?:id|account|profile)|blackmail|bully/i],
  ["other_online_fraud", /fraud|scam|swindl|cheat|duped|fake (?:job|visa|loan)|lottery|investment|crypto|ponzi/i],
];

/** Words that make a Fraud record an online one rather than an offline con. */
const ONLINE_CHANNEL =
  /online|internet|facebook|messenger|whatsapp|imo|telegram|tiktok|youtube|website|app\b|e-?commerce|bkash|nagad|rocket|mobile (?:financial|banking)|\botp\b|crypto|email|sms|digital/i;

export function isOnline(incident: CrimeIncident): boolean {
  if (incident.crime_category === "Cybercrime") return true;
  return ONLINE_CHANNEL.test(`${incident.title} ${incident.narrative}`);
}

export function cyberTypeOf(incident: CrimeIncident): CyberType {
  const text = `${incident.title} ${incident.narrative}`;
  for (const [type, pattern] of RULES) {
    if (pattern.test(text)) return type;
  }
  return "other_cyber";
}

export type CyberPlatform =
  | "Facebook"
  | "WhatsApp / IMO / Telegram"
  | "Other social"
  | "Mobile money"
  | "Bank / card"
  | "E-commerce site"
  | "Phone / SMS / email"
  | "Unknown";

const PLATFORM_RULES: ReadonlyArray<readonly [CyberPlatform, RegExp]> = [
  ["Mobile money", /bkash|nagad|rocket|upay|mobile (?:financial|banking)|\bmfs\b/i],
  ["Facebook", /facebook|messenger/i],
  ["WhatsApp / IMO / Telegram", /whatsapp|\bimo\b|telegram|viber/i],
  ["Other social", /tiktok|youtube|instagram|\btwitter\b|\bx\.com\b/i],
  ["Bank / card", /bank|card|atm|swift/i],
  ["E-commerce site", /e-?commerce|online shop|website/i],
  ["Phone / SMS / email", /phone call|\bcall(?:ed|s)?\b|sms|text message|email/i],
];

export function platformOf(incident: CrimeIncident): CyberPlatform {
  const text = `${incident.title} ${incident.narrative}`;
  for (const [platform, pattern] of PLATFORM_RULES) {
    if (pattern.test(text)) return platform;
  }
  return "Unknown";
}

export function isOfficialAdvisory(incident: CrimeIncident): boolean {
  return (incident.source_handle ?? "").toUpperCase().includes("CIRT");
}

export function tally<K extends string>(keys: K[]): Array<{ key: K; count: number }> {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return Array.from(counts, ([key, count]) => ({ key, count })).sort(
    (a, b) => b.count - a.count
  );
}
