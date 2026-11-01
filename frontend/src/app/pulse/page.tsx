"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Flame, MessagesSquare, TrendingDown, TrendingUp, Video } from "lucide-react";

import {
  EMOTION_LABEL,
  EMPTY_PULSE_SUMMARY,
  FLAG_HELP,
  FLAG_LABEL,
  STANCE_LABEL,
  TOPIC_TYPE_LABEL,
  fetchPulseSummary,
  fetchPulseTopics,
  thumbnailOf,
  type PulseFlag,
  type PulseSort,
  type PulseStance,
  type PulseSummary,
  type PulseTopic,
  type PulseTopicType,
} from "@/lib/pulse";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

const WINDOWS = [
  { days: 1, label: "24H" },
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
] as const;

const SORTS: Array<{ key: PulseSort; label: string }> = [
  { key: "views", label: "Most viewed" },
  { key: "negative", label: "Most negative" },
  { key: "recent", label: "Latest" },
];

const STANCE_TONE: Record<PulseStance, string> = {
  critical: "border-rose-500/40 text-rose-300",
  supportive: "border-emerald-500/40 text-emerald-300",
  mixed: "border-amber-500/40 text-amber-300",
  not_discussed: "border-surface-border text-zinc-500",
};

function MoodBar({ positive, neutral, negative, thin }: { positive: number; neutral: number; negative: number; thin?: boolean }) {
  return (
    <div
      className={cn("flex w-full overflow-hidden rounded bg-surface-overlay", thin ? "h-1.5" : "h-3")}
      role="img"
      aria-label={`${positive.toFixed(0)}% positive, ${neutral.toFixed(0)}% neutral, ${negative.toFixed(0)}% negative`}
    >
      <span className="bg-emerald-500/80" style={{ width: `${positive}%` }} />
      <span className="bg-zinc-500/60" style={{ width: `${neutral}%` }} />
      <span className="bg-rose-500/85" style={{ width: `${negative}%` }} />
    </div>
  );
}

function Bars({ rows, tone = "bg-accent/70" }: { rows: Array<{ label: string; value: number; display: string; title?: string }>; tone?: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-xs text-zinc-500">Nothing yet.</p>;
  const peak = Math.max(...rows.map((row) => row.value), 0.0001);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} title={row.title} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2 text-xs">
          <span className="truncate text-zinc-300">{row.label}</span>
          <span className="h-2 rounded bg-surface-overlay">
            <span className={cn("block h-2 rounded", tone)} style={{ width: `${(row.value / peak) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-zinc-400">{row.display}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ topic }: { topic: PulseTopic }) {
  const previous = topic.history[topic.history.length - 1];
  if (!previous) return null;
  const delta = topic.negative_pct - previous.negative_pct;
  if (Math.abs(delta) < 5) return null;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn("flex items-center gap-1 text-[11px]", delta > 0 ? "text-rose-300" : "text-emerald-300")}
      title={`Negative share was ${previous.negative_pct.toFixed(0)}% at the previous reading`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta.toFixed(0)} pts negative
    </span>
  );
}

function TopicCard({ topic }: { topic: PulseTopic }) {
  const emotions = Object.entries(topic.emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <article className="panel flex flex-col gap-3 p-3 sm:flex-row">
      <a href={topic.url} target="_blank" rel="noreferrer" className="relative block shrink-0 sm:w-48">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no optimisation needed */}
        <img
          src={thumbnailOf(topic)}
          alt=""
          loading="lazy"
          className="aspect-video w-full rounded border border-surface-border/60 object-cover"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
          {formatNumber(topic.view_count ?? 0)} views
        </span>
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded border border-accent/40 px-1.5 py-0.5 font-medium uppercase tracking-wide text-accent-soft">
            {TOPIC_TYPE_LABEL[topic.topic_type]}
            {topic.crime_category ? ` · ${topic.crime_category}` : ""}
          </span>
          <span className={cn("rounded border px-1.5 py-0.5", STANCE_TONE[topic.stance_authorities])}>
            {STANCE_LABEL[topic.stance_authorities]}
          </span>
          <Trend topic={topic} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{topic.topic}</h3>
          <a
            href={topic.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 flex items-start gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <span className="line-clamp-1">{topic.title}</span>
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          </a>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {topic.channel ?? "YouTube"} · {formatNumber(topic.comments_analysed)} comments read · analysed{" "}
            {relativeTime(topic.analysed_at)}
          </p>
        </div>

        <div>
          <MoodBar positive={topic.positive_pct} neutral={topic.neutral_pct} negative={topic.negative_pct} />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums">
            <span className="text-emerald-300">{topic.positive_pct.toFixed(0)}% positive</span>
            <span className="text-zinc-500">{topic.neutral_pct.toFixed(0)}% neutral</span>
            <span className="text-rose-300">{topic.negative_pct.toFixed(0)}% negative</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-zinc-300">{topic.summary}</p>

        {topic.key_views.length > 0 && (
          <ul className="flex flex-col gap-1">
            {topic.key_views.map((view) => (
              <li key={view.view} className="grid grid-cols-[2.5rem_1fr] gap-2 text-xs">
                <span className="text-right tabular-nums text-zinc-500">{Math.round(view.share * 100)}%</span>
                <span className="text-zinc-400">{view.view}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5">
          {topic.flags.map((flag) => (
            <span
              key={flag}
              title={FLAG_HELP[flag]}
              className="flex items-center gap-1 rounded border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-200"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {FLAG_LABEL[flag]}
            </span>
          ))}
          {emotions.map(([name, share]) => (
            <span key={name} className="rounded bg-surface-overlay px-1.5 py-0.5 text-[11px] text-zinc-300">
              {EMOTION_LABEL[name] ?? name} {Math.round(share * 100)}%
            </span>
          ))}
          {topic.themes.map((theme) => (
            <span key={theme} className="rounded border border-surface-border/70 px-1.5 py-0.5 text-[11px] text-zinc-500">
              {theme}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function PulsePage() {
  const [days, setDays] = useState<number>(7);
  const [sort, setSort] = useState<PulseSort>("views");
  const [typeFilter, setTypeFilter] = useState<PulseTopicType | null>(null);
  const [summary, setSummary] = useState<PulseSummary>(EMPTY_PULSE_SUMMARY(7));
  const [topics, setTopics] = useState<PulseTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [nextSummary, nextTopics] = await Promise.all([
        fetchPulseSummary(days),
        fetchPulseTopics(days, sort, typeFilter),
      ]);
      if (cancelled) return;
      setSummary(nextSummary);
      setTopics(nextTopics.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days, sort, typeFilter]);

  const flagTotal = useMemo(
    () => Object.values(summary.flags).reduce((sum, n) => sum + (n ?? 0), 0),
    [summary.flags]
  );
  const typeChips = useMemo(
    () => Object.entries(summary.topic_types) as Array<[PulseTopicType, number]>,
    [summary.topic_types]
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Public Pulse</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            How Bangladesh is reacting to what goes viral. The comment sections of the most-watched
            Bangladeshi YouTube videos and TV newsroom uploads are read and summarised: mood, emotions,
            attitude to the authorities, and warning signs such as calls for mob justice. Only the
            crowd is described. No commenter names, handles or quotes are stored.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((window) => (
            <button
              key={window.days}
              type="button"
              onClick={() => setDays(window.days)}
              className={cn("btn px-3 py-1 text-xs", days === window.days && "btn-accent")}
            >
              {window.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
        {[
          { icon: Video, label: "Viral topics", value: formatNumber(summary.topics) },
          { icon: MessagesSquare, label: "Comments read", value: formatNumber(summary.comments_analysed) },
          {
            icon: Flame,
            label: "Negative mood",
            value: `${summary.negative_pct.toFixed(0)}%`,
            note: "share of comments, news and public-affairs topics only",
          },
          { icon: AlertTriangle, label: "Warning signals", value: formatNumber(flagTotal) },
        ].map((card) => (
          <div key={card.label} className="panel p-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <card.icon className="h-4 w-4" aria-hidden />
              <span className="label-mono">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">{loading ? "…" : card.value}</p>
            {card.note && <p className="mt-1 text-[11px] text-zinc-600">{card.note}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel" aria-label="Overall mood and emotions">
          <header className="panel-header">
            <span className="label-mono">Crowd mood</span>
          </header>
          <div className="flex flex-col gap-4 p-4">
            <div>
              <MoodBar positive={summary.positive_pct} neutral={summary.neutral_pct} negative={summary.negative_pct} />
              <div className="mt-1 flex justify-between text-[11px] tabular-nums">
                <span className="text-emerald-300">{summary.positive_pct.toFixed(0)}% positive</span>
                <span className="text-zinc-500">{summary.neutral_pct.toFixed(0)}% neutral</span>
                <span className="text-rose-300">{summary.negative_pct.toFixed(0)}% negative</span>
              </div>
            </div>
            <Bars
              rows={Object.entries(summary.emotions).map(([name, share]) => ({
                label: EMOTION_LABEL[name] ?? name,
                value: share,
                display: `${Math.round(share * 100)}%`,
              }))}
            />
          </div>
        </section>

        <section className="panel" aria-label="Attitude to authorities">
          <header className="panel-header">
            <span className="label-mono">Attitude to authorities</span>
          </header>
          <div className="p-4">
            <Bars
              tone="bg-amber-500/70"
              rows={(Object.entries(summary.stances) as Array<[PulseStance, number]>)
                .filter(([stance]) => stance !== "not_discussed")
                .map(([stance, n]) => ({ label: STANCE_LABEL[stance], value: n, display: String(n) }))}
            />
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
              Topics where commenters discuss the police, government, courts or officials, by the
              crowd&apos;s overall attitude.
            </p>
          </div>
        </section>

        <section className="panel" aria-label="Warning signals">
          <header className="panel-header">
            <span className="label-mono">Warning signals</span>
          </header>
          <div className="p-4">
            <Bars
              tone="bg-rose-500/80"
              rows={(Object.entries(summary.flags) as Array<[PulseFlag, number]>).map(([flag, n]) => ({
                label: FLAG_LABEL[flag],
                value: n,
                display: String(n),
                title: FLAG_HELP[flag],
              }))}
            />
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
              Topics whose comments show the signal in several places. A flag describes the comment
              section, not the video or its publisher.
            </p>
          </div>
        </section>
      </div>

      {summary.top_themes.length > 0 && (
        <section className="panel p-4" aria-label="What people are talking about">
          <p className="label-mono mb-2">What people are talking about</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.top_themes.map((row) => (
              <span key={row.theme} className="rounded border border-surface-border/70 px-2 py-0.5 text-xs text-zinc-300">
                {row.theme}
                <span className="ml-1 text-zinc-600">{row.topics}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-label="Viral topics">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono mr-1">Topics</span>
          <button
            type="button"
            onClick={() => setTypeFilter(null)}
            className={cn("btn px-2 py-0.5 text-[11px]", typeFilter === null && "btn-accent")}
          >
            All
          </button>
          {typeChips.map(([type, n]) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={cn("btn px-2 py-0.5 text-[11px]", typeFilter === type && "btn-accent")}
            >
              {TOPIC_TYPE_LABEL[type]} · {n}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PulseSort)}
              className="field w-auto px-2 py-1 text-xs"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="skeleton h-48 w-full rounded" />
        ) : topics.length === 0 ? (
          <div className="panel p-10 text-center text-sm text-zinc-500">
            No viral topics analysed in this window yet. The collector reads new videos every six hours.
          </div>
        ) : (
          topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-zinc-600">
        Method: videos come from YouTube&apos;s trending chart for Bangladesh and the uploads of major TV
        newsrooms, ranked by views and comments per hour. Up to 200 top comments per video are read
        by an AI model, which reports shares and paraphrases only. Comment sections are not a
        representative sample of the public: they over-represent people who are online, young and
        angry enough to write. Treat this as a signal of what is being said, not of what the country
        thinks.
      </p>
    </div>
  );
}
