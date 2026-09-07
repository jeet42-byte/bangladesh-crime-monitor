import type { Metadata } from "next";
import {
  AlertTriangle,
  Bot,
  Database,
  GitBranch,
  Rss,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { API_BASE_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Bangladesh Crime Monitor collects, verifies, scores and publishes incident records — and the limits of what those records can support.",
};

const PIPELINE_STAGES = [
  {
    icon: Rss,
    title: "1 · Collection",
    body: "A scheduled job runs every six hours and reads the public RSS feeds of major Bangladeshi dailies, plus posts published openly by official police channels. A keyword gate discards anything with no crime signal before it costs a model call.",
  },
  {
    icon: Bot,
    title: "2 · Extraction",
    body: "Surviving text goes to Gemini Flash under a fixed JSON schema. The model reads English, Bengali and Banglish, and returns a neutral English title and summary, a category, a date, a thana, and any statute the source actually cites.",
  },
  {
    icon: Database,
    title: "3 · Normalisation",
    body: "The model is never trusted for geography. It names a place; a gazetteer resolves that name — through aliases, Bengali spellings and fuzzy matching — to one of the 50 Dhaka Metropolitan thanas, or failing that to one of the country's 64 districts. A place that resolves to neither is discarded, because a guessed location is worse than a missing record.",
  },
  {
    icon: GitBranch,
    title: "4 · Deduplication",
    body: "Each record is keyed by SHA-256 over (incident date, thana, title). Re-running the same window inserts nothing new, and outlets whose headlines normalise alike collapse to one row. Headlines that differ — a Bengali one and an English one, say — do not collapse, so a heavily covered incident can appear more than once.",
  },
  {
    icon: Sparkles,
    title: "5 · Publication",
    body: "Records land in PostgreSQL and are served through a public read-only API. Nothing is hand-edited between extraction and publication; corrections are made by changing the pipeline or removing the record.",
  },
] as const;

const CONFIDENCE_TIERS = [
  {
    dot: "🟢",
    label: "Official",
    score: 95,
    source: "Public posts from police or government channels",
    note: "The originating authority is speaking directly. Still a claim about an allegation, not a court finding.",
  },
  {
    dot: "🟡",
    label: "Verified News",
    score: 80,
    source: "Established Bangladeshi news outlets with a named masthead",
    note: "Reported by journalists working to an editorial standard, usually citing police sources.",
  },
  {
    dot: "🟠",
    label: "Public Social",
    score: 55,
    source: "Publicly visible social-media posts",
    note: "Fastest signal, weakest verification. Treat as a lead to check, not as an established fact.",
  },
] as const;

const LIMITATIONS = [
  "This is a record of what was reported, not of what happened. Offences that never reach a newsroom or an official feed do not appear here, and under-reporting is not evenly distributed across offence types or neighbourhoods.",
  "Coverage intensity is not crime intensity. A thana that receives more press attention will show more incidents than a comparable thana that receives less, independent of actual crime rates.",
  "Locations are centroids, not scenes. Inside the Dhaka Metropolitan Police area a marker sits at the centre of the responsible thana; elsewhere in the country only district-level precision is available, so the marker sits at the district centre and may be many kilometres from the actual location. Never read a pin as a street address.",
  "An incident whose location cannot be resolved to a known thana or district is discarded rather than placed. Records are therefore missing, not misplaced — but reporting that names no recoverable location will not appear here at all.",
  "Categories are assigned by a language model. It is accurate on clear-cut reporting and less so on ambiguous or partial reports; a small share of records will be miscategorised.",
  "Dates default to the publication date when the source does not state when the incident occurred, and to midnight BST when it gives a date but no time.",
  "The archive begins when this system started collecting. It is not a historical series and cannot support year-over-year comparison across that boundary.",
  "Deduplication is keyed on the headline, so a widely covered incident reported under different headlines — particularly across Bengali and English outlets — can appear as more than one record and inflate counts for that incident.",
] as const;

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10">
        <p className="label-mono">Public documentation</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Methodology &amp; Limitations
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This page documents exactly how a record gets from a published news
          story to a marker on the map, what the confidence score means, and
          what conclusions this dataset can and cannot support. It is written to
          be checkable: every claim below corresponds to code in the public
          repository.
        </p>
      </header>

      {/* Primary disclaimer */}
      <section className="mb-10 rounded-xl border border-severity-critical/40 bg-severity-critical/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ShieldAlert
            className="h-4 w-4 text-severity-critical"
            aria-hidden
          />
          Read this first
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
          <li>
            Every record describes an{" "}
            <strong className="text-zinc-100">allegation as reported</strong>.
            Nothing here is a finding of guilt, and an entry must not be treated
            as evidence that any person committed an offence.
          </li>
          <li>
            Records are de-identified in two passes. The extraction prompt
            instructs the model to omit victim and accused identities, minors
            and exact addresses; a separate deterministic pass then strips
            phone numbers, email addresses and ID numbers from every record
            regardless of how it was produced.{" "}
            <strong className="text-zinc-100">
              Neither pass can guarantee removal of personal names
            </strong>{" "}
            — the first is an instruction to a model, and no pattern match
            reliably identifies names in Bengali and English prose. If you find
            identifying information in a record, report it and it will be
            removed.
          </li>
          <li>
            This site is not a reporting channel and is not monitored. In an
            emergency call <strong className="text-zinc-100">999</strong>.
          </li>
        </ul>
      </section>

      {/* Pipeline */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          The ingestion pipeline
        </h2>
        <ol className="space-y-3">
          {PIPELINE_STAGES.map((stage) => (
            <li key={stage.title} className="panel flex gap-4 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-overlay">
                <stage.icon className="h-4 w-4 text-accent-soft" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {stage.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {stage.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Confidence scoring */}
      <section className="mb-10">
        <h2 className="mb-2 text-base font-semibold text-zinc-100">
          Confidence scoring
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          Confidence is a property of the <em>source</em>, not of the model's
          certainty. It is fixed by policy at ingestion time and is never
          adjusted per record — so a score tells you where a record came from,
          and nothing more.
        </p>

        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead className="border-b border-surface-border/70 bg-surface-overlay/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Tier
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Score
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Source class
                </th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  What it means
                </th>
              </tr>
            </thead>
            <tbody>
              {CONFIDENCE_TIERS.map((tier) => (
                <tr
                  key={tier.label}
                  className="border-b border-surface-border/40 align-top last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-200">
                    <span aria-hidden>{tier.dot}</span> {tier.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {tier.score}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {tier.source}
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-zinc-400">
                    {tier.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          The &ldquo;verified source ratio&rdquo; on the dashboard is the share
          of records scoring 80 or above — that is, everything except public
          social media.
        </p>
      </section>

      {/* Limitations */}
      <section className="mb-10">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
          What this dataset cannot tell you
        </h2>
        <ul className="space-y-2.5">
          {LIMITATIONS.map((limitation) => (
            <li
              key={limitation}
              className="panel p-3.5 text-sm leading-relaxed text-zinc-400"
            >
              {limitation}
            </li>
          ))}
        </ul>
      </section>

      {/* Legal */}
      <section className="mb-10">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-zinc-100">
          <Scale className="h-4 w-4 text-zinc-400" aria-hidden />
          Legal and ethical position
        </h2>
        <div className="panel space-y-3 p-5 text-sm leading-relaxed text-zinc-400">
          <p>
            <strong className="text-zinc-200">Sources.</strong> Only material
            already published for the general public is collected: RSS feeds
            offered by outlets for syndication, and posts published openly by
            official accounts. No private group, closed account, authenticated
            surface, or leaked material is read, and no login or cookie is
            replayed to obtain content.
          </p>
          <p>
            <strong className="text-zinc-200">Attribution.</strong> Every record
            links to the original report. Summaries are short, factual
            restatements written to be checked against the source, not
            substitutes for reading it. Full article text is not republished.
          </p>
          <p>
            <strong className="text-zinc-200">Privacy.</strong> Contact details
            and identifiers — phone numbers, email addresses, national ID and
            passport numbers — are stripped from every record by a
            deterministic pass that does not depend on the model. Names,
            addresses and details about minors are excluded by instruction to
            the extraction model, which is weaker: an instruction can be missed.
            Where the model is unavailable and the pipeline falls back to
            keyword classification, no article-derived summary is published at
            all, precisely because there is then nothing enforcing redaction.
          </p>
          <p>
            <strong className="text-zinc-200">Presumption of innocence.</strong>{" "}
            Bangladeshi law presumes innocence until conviction. Records here
            report accusations at a moment in time; charges are frequently
            amended, withdrawn, or dismissed, and this archive does not track
            those outcomes.
          </p>
          <p>
            <strong className="text-zinc-200">
              Corrections and removal.
            </strong>{" "}
            To report an inaccurate record, or to request removal of one that
            names or identifies a person, open an issue on the project
            repository with the record ID shown in the archive. Records that
            identify an individual are removed on request without argument.
          </p>
          <p>
            <strong className="text-zinc-200">Not professional advice.</strong>{" "}
            This portal is a research and transparency tool. It is not a
            security assessment, and it must not be used to make decisions about
            an individual — in hiring, tenancy, lending, or anything else.
          </p>
        </div>
      </section>

      {/* API */}
      <section>
        <h2 className="mb-2 text-base font-semibold text-zinc-100">
          Open API
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          The read endpoints are public and unauthenticated, so the same data
          behind this dashboard can be checked or reused directly.
        </p>
        <div className="panel divide-y divide-surface-border/50 font-mono text-xs">
          {[
            ["GET", "/api/v1/crimes/feed", "Paginated incident feed"],
            ["GET", "/api/v1/crimes/geojson", "Map layer (FeatureCollection)"],
            ["GET", "/api/v1/analytics/summary", "Headline aggregates"],
            ["GET", "/api/v1/analytics/trends", "Daily counts"],
            ["GET", "/api/v1/analytics/categories", "Category breakdown"],
          ].map(([method, path, description]) => (
            <div key={path} className="flex flex-wrap items-center gap-3 p-3">
              <span className="chip border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
                {method}
              </span>
              <a
                href={`${API_BASE_URL}${path}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-soft hover:text-accent"
              >
                {path}
              </a>
              <span className="ml-auto text-zinc-500">{description}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Full interactive documentation is at{" "}
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-soft hover:text-accent"
          >
            {API_BASE_URL}/docs
          </a>
          .
        </p>
      </section>
    </div>
  );
}
