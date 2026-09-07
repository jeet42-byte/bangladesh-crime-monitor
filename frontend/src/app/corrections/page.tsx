import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Github, ScrollText, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Corrections & Removal",
  description:
    "How to report an inaccurate record on Bangladesh Crime Monitor, or request removal of one that identifies you. No account required.",
};

const REPO_ISSUES =
  "https://github.com/jeet42-byte/bangladesh-crime-monitor/issues/new";

/**
 * Deliberately outside the account gate.
 *
 * The rest of the portal asks visitors to sign in, but someone who finds a
 * record about themselves must be able to get it removed without first
 * handing over an email address. Putting the corrections route behind a
 * signup would make the removal promise conditional on registering, which is
 * exactly backwards.
 */
export default function CorrectionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="label-mono">Open to everyone — no account needed</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Corrections &amp; Removal
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Every record here is generated automatically from public reporting,
          and some of them will be wrong. If you have found a mistake, or a
          record that identifies you, this page explains how to have it fixed
          or removed.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-severity-critical/40 bg-severity-critical/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ShieldAlert className="h-4 w-4 text-severity-critical" aria-hidden />
          Records are allegations, not findings
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
          Nothing in this archive is a finding of guilt. Entries report what was
          published at a moment in time; charges are frequently amended,
          withdrawn or dismissed, and this archive does not track those
          outcomes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-zinc-100">
          Requesting removal
        </h2>
        <div className="panel space-y-3 p-5 text-sm leading-relaxed text-zinc-400">
          <p>
            <strong className="text-zinc-200">
              Records that identify an individual are removed on request,
              without argument.
            </strong>{" "}
            The pipeline is instructed to strip names, addresses and contact
            details, and a separate pass removes phone numbers and ID numbers —
            but neither can guarantee that a personal name never survives.
          </p>
          <p>
            You do not need to explain yourself, prove your identity, or create
            an account. Quote the record and it will be taken down.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-zinc-100">
          How to report
        </h2>
        <div className="panel p-5">
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">
            Open an issue on the project repository. Include whatever you have —
            the record ID from the archive is ideal, but the headline and date
            are enough to find it.
          </p>
          <a
            href={REPO_ISSUES}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-accent"
          >
            <Github className="h-4 w-4" aria-hidden />
            Open an issue
          </a>
          <p className="mt-4 text-xs leading-relaxed text-zinc-600">
            Issues are public. If the request itself would expose something you
            would rather not publish, say only that a record needs removing and
            give the record ID — no detail about why is required.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
          Reporting an inaccuracy
        </h2>
        <div className="panel space-y-3 p-5 text-sm leading-relaxed text-zinc-400">
          <p>
            Known failure modes are documented on the{" "}
            <Link
              href="/methodology"
              className="text-accent-soft hover:text-accent"
            >
              methodology page
            </Link>{" "}
            — miscategorised offences, district-level locations that sit
            kilometres from the scene, cold cases dated to the announcement
            rather than the offence, and duplicate records where outlets used
            different headlines.
          </p>
          <p className="flex items-start gap-2">
            <ScrollText
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
              aria-hidden
            />
            <span>
              Before reporting, it is worth checking the linked original source
              on the record: where the pipeline and the source disagree, the
              source is authoritative and the record is the error.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
