import Link from "next/link";
import { AlertTriangle, ExternalLink, Phone, ShieldAlert } from "lucide-react";


const EMERGENCY_CONTACTS = [
  { label: "National Emergency", number: "999" },
  { label: "DMP Control Room", number: "01320-037777" },
  { label: "Women & Children Helpline", number: "109" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-surface-border/70 bg-surface-raised/40">
      {/* Public-safety notice */}
      <div className="border-b border-surface-border/50 bg-accent/5">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2.5 text-sm text-zinc-300">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft"
              aria-hidden
            />
            <span>
              <strong className="font-semibold text-zinc-100">
                In an emergency, do not use this site.
              </strong>{" "}
              Call the police directly. This portal is a research archive and is
              not monitored.
            </span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {EMERGENCY_CONTACTS.map((contact) => (
              <li key={contact.number}>
                <a
                  href={`tel:${contact.number.replace(/[^0-9+]/g, "")}`}
                  className="chip border-surface-border bg-surface-overlay/60 text-zinc-300 hover:text-zinc-100"
                >
                  <Phone className="h-3 w-3" aria-hidden />
                  {contact.label} · {contact.number}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {/* Transparency */}
        <div className="lg:col-span-2">
          <h2 className="label-mono mb-3">Transparency Statement</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Every record on this site is derived from material that was already
            public: news reporting by Bangladeshi outlets and posts published
            openly by official police channels. Nothing is collected from
            private accounts, closed groups, or leaked material.
          </p>
          <p className="mt-3 flex max-w-2xl items-start gap-2 text-sm leading-relaxed text-zinc-400">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden
            />
            <span>
              Records describe <strong className="text-zinc-300">allegations
              as reported</strong>, not proven facts. An entry here is not a
              finding of guilt against anyone. Categories and locations are
              assigned by an automated pipeline and can be wrong; always check
              the linked original source before relying on a record.
            </span>
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="label-mono mb-3">Portal</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="text-zinc-400 hover:text-zinc-200">
                Command Center
              </Link>
            </li>
            <li>
              <Link
                href="/analytics"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Analytics
              </Link>
            </li>
            <li>
              <Link
                href="/database"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Record Archive
              </Link>
            </li>
            <li>
              <Link
                href="/methodology"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Methodology &amp; Limitations
              </Link>
            </li>
            <li>
              <Link
                href="/corrections"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Corrections &amp; Removal
              </Link>
            </li>
          </ul>
        </div>

        {/* Access */}
        <div>
          <h2 className="label-mono mb-3">Access</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/login" className="text-zinc-400 hover:text-zinc-200">
                Sign in or create an account
              </Link>
            </li>
            <li>
              <Link
                href="/corrections"
                className="text-zinc-400 hover:text-zinc-200"
              >
                Corrections &amp; removal
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            The data behind this site is not offered as a public API or bulk
            download. Every record links to its original source, which remains
            freely readable.
          </p>
        </div>
      </div>

      {/* Ownership. Stated exactly as provided by the operator; nothing here
          is inferred or embellished. */}
      <div className="border-t border-surface-border/50 bg-surface-raised/30">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <h2 className="label-mono mb-3">Compiled and maintained by</h2>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <p className="text-sm font-semibold text-zinc-100">Ahnaf Akif</p>
            <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
              <li>Former Major, Bangladesh Army</li>
              <li>
                Researcher and student, Criminology and Criminal Justice,
                University of Dhaka
              </li>
              <li>Cybersecurity, United International University</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border/50">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} Bangladesh Crime Monitor · Data compiled from public
            sources · Times shown in BST (UTC+6)
          </p>
          <p className="font-mono">
            <Link
              href="/corrections"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              Corrections &amp; removal requests
            </Link>{" "}
            — no account needed.
          </p>
        </div>
      </div>
    </footer>
  );
}
