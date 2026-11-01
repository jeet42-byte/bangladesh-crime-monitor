/**
 * Public Pulse: aggregated public reaction to viral Bangladeshi videos.
 *
 * Every number here describes a crowd - shares of a comment section - never
 * a person. The backend stores no commenter names, handles or quotes.
 */

import { request } from "@/lib/api";

export type PulseTopicType =
  | "crime_safety"
  | "politics"
  | "governance"
  | "society"
  | "religion"
  | "economy"
  | "disaster"
  | "entertainment"
  | "sports"
  | "other";

export type PulseStance = "critical" | "supportive" | "mixed" | "not_discussed";

export type PulseFlag =
  | "mob_justice"
  | "violent_threats"
  | "communal_hostility"
  | "hate_speech"
  | "misinformation"
  | "doxxing"
  | "coordinated_activity";

export interface PulseTopic {
  id: string;
  platform: string;
  video_id: string;
  url: string;
  title: string;
  channel: string | null;
  published_at: string | null;
  discovered_via: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  comments_analysed: number;
  topic: string;
  topic_type: PulseTopicType;
  crime_category: string | null;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  emotions: Record<string, number>;
  stance_authorities: PulseStance;
  themes: string[];
  flags: PulseFlag[];
  summary: string;
  key_views: Array<{ view: string; share: number }>;
  history: Array<{ at: string; negative_pct: number; positive_pct: number }>;
  first_seen_at: string;
  analysed_at: string;
}

export interface PulseSummary {
  window_days: number;
  topics: number;
  comments_analysed: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  emotions: Record<string, number>;
  topic_types: Partial<Record<PulseTopicType, number>>;
  stances: Partial<Record<PulseStance, number>>;
  flags: Partial<Record<PulseFlag, number>>;
  top_themes: Array<{ theme: string; topics: number }>;
  last_analysed_at: string | null;
}

export type PulseSort = "views" | "negative" | "recent" | "comments";

export const TOPIC_TYPE_LABEL: Record<PulseTopicType, string> = {
  crime_safety: "Crime & safety",
  politics: "Politics",
  governance: "Governance",
  society: "Society",
  religion: "Religion",
  economy: "Economy",
  disaster: "Disaster",
  entertainment: "Entertainment",
  sports: "Sports",
  other: "Other",
};

export const STANCE_LABEL: Record<PulseStance, string> = {
  critical: "Critical of authorities",
  supportive: "Supportive of authorities",
  mixed: "Mixed on authorities",
  not_discussed: "Authorities not discussed",
};

export const FLAG_LABEL: Record<PulseFlag, string> = {
  mob_justice: "Calls for mob justice",
  violent_threats: "Violent threats",
  communal_hostility: "Communal hostility",
  hate_speech: "Hate speech",
  misinformation: "Rumours as fact",
  doxxing: "Doxxing",
  coordinated_activity: "Coordinated commenting",
};

export const FLAG_HELP: Record<PulseFlag, string> = {
  mob_justice: "Several comments call for someone to be beaten, lynched or punished outside the law.",
  violent_threats: "Threats of violence against a person or group.",
  communal_hostility: "Hostility aimed at a religious or ethnic community.",
  hate_speech: "Dehumanising language about a protected group.",
  misinformation: "An unverified claim repeated widely as fact.",
  doxxing: "Comments share or demand someone's address, phone or family details.",
  coordinated_activity: "Many near-identical comments, suggesting an organised campaign.",
};

export const EMOTION_LABEL: Record<string, string> = {
  anger: "Anger",
  fear: "Fear",
  grief: "Grief",
  sarcasm: "Sarcasm",
  support: "Support",
  hope: "Hope",
  distrust: "Distrust",
  humour: "Humour",
};

export const EMPTY_PULSE_SUMMARY = (days: number): PulseSummary => ({
  window_days: days,
  topics: 0,
  comments_analysed: 0,
  positive_pct: 0,
  neutral_pct: 0,
  negative_pct: 0,
  emotions: {},
  topic_types: {},
  stances: {},
  flags: {},
  top_themes: [],
  last_analysed_at: null,
});

export async function fetchPulseTopics(
  days: number,
  sort: PulseSort,
  topicType: PulseTopicType | null
): Promise<{ items: PulseTopic[]; total: number }> {
  const data = await request<{ items: PulseTopic[]; total: number }>("/api/v1/pulse/topics", {
    days,
    sort,
    topic_type: topicType,
    limit: 100,
  });
  return data ?? { items: [], total: 0 };
}

export async function fetchPulseSummary(days: number): Promise<PulseSummary> {
  const data = await request<PulseSummary>("/api/v1/pulse/summary", { days });
  return data ?? EMPTY_PULSE_SUMMARY(days);
}

export function thumbnailOf(topic: PulseTopic): string {
  return `https://i.ytimg.com/vi/${topic.video_id}/mqdefault.jpg`;
}
