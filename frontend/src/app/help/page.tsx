"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Phone } from "lucide-react";

import { GUIDES, HELPLINES, loadLang, saveLang, type Lang } from "@/lib/guides";
import { cn } from "@/lib/utils";

const TEXT = {
  title: { en: "Get help", bn: "সহায়তা নিন" },
  intro: {
    en: "What to do after a crime in Bangladesh: who to call, how to file a GD or a case, and what to keep as evidence. Every number below is free and national.",
    bn: "বাংলাদেশে অপরাধের পর করণীয়: কাকে ফোন করবেন, কীভাবে জিডি বা মামলা করবেন, কী প্রমাণ রাখবেন। নিচের সব নম্বর বিনামূল্যে ও জাতীয়।",
  },
  helplines: { en: "Free helplines", bn: "বিনামূল্যে হেল্পলাইন" },
  when: { en: "When", bn: "কখন" },
  disclaimer: {
    en: "General information, not legal advice. Procedures can differ by case; when in doubt, call 16430 for free legal aid. This site is not monitored - in an emergency, call 999.",
    bn: "এটি সাধারণ তথ্য, আইনি পরামর্শ নয়। ঘটনাভেদে প্রক্রিয়া ভিন্ন হতে পারে; সন্দেহ থাকলে বিনামূল্যে আইনি সহায়তার জন্য ১৬৪৩০-এ কল করুন। এই সাইট সার্বক্ষণিক পর্যবেক্ষণ করা হয় না - জরুরি প্রয়োজনে ৯৯৯-এ কল করুন।",
  },
  myArea: { en: "See what has been reported near you", bn: "আপনার এলাকায় কী ঘটছে দেখুন" },
} satisfies Record<string, Record<Lang, string>>;

export default function HelpPage() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(loadLang());
    // Deep links (#cyber, #mob) from My Area land on the right guide.
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  const choose = (next: Lang) => {
    setLang(next);
    saveLang(next);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6" lang={lang}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-100">
            <LifeBuoy className="h-5 w-5 text-accent-soft" aria-hidden />
            {TEXT.title[lang]}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">{TEXT.intro[lang]}</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Language">
          <button type="button" onClick={() => choose("en")} className={cn("btn px-3 py-1 text-xs", lang === "en" && "btn-accent")}>
            English
          </button>
          <button type="button" onClick={() => choose("bn")} className={cn("btn px-3 py-1 text-xs", lang === "bn" && "btn-accent")}>
            বাংলা
          </button>
        </div>
      </header>

      <section className="panel p-4" aria-label={TEXT.helplines[lang]}>
        <p className={cn("mb-3", lang === "bn" ? "text-sm font-medium text-zinc-400" : "label-mono")}>{TEXT.helplines[lang]}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HELPLINES.map((line) => (
            <a
              key={line.number}
              href={`tel:${line.number}`}
              className="flex items-center gap-3 rounded-lg border border-surface-border/70 bg-surface-overlay/40 p-3 hover:border-accent/50"
            >
              <Phone className="h-4 w-4 shrink-0 text-accent-soft" aria-hidden />
              <span>
                <span className="block font-mono text-lg font-semibold text-zinc-100">{line.number}</span>
                <span className="block text-xs text-zinc-400">{line.label[lang]}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <nav className="flex flex-wrap gap-1.5" aria-label="Guides">
        {GUIDES.map((guide) => (
          <a key={guide.id} href={`#${guide.id}`} className="btn px-2 py-1 text-[11px]">
            {guide.title[lang]}
          </a>
        ))}
      </nav>

      {GUIDES.map((guide) => (
        <section key={guide.id} id={guide.id} className="panel scroll-mt-20 p-4">
          <h2 className="text-base font-semibold text-zinc-100">{guide.title[lang]}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">{TEXT.when[lang]}:</span> {guide.when[lang]}
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {guide.steps[lang].map((step, index) => (
              <li key={step} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm leading-relaxed text-zinc-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 font-mono text-xs text-accent-soft">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className="text-xs leading-relaxed text-zinc-500">{TEXT.disclaimer[lang]}</p>
      <Link href="/area" className="text-sm text-accent-soft hover:text-accent">
        {TEXT.myArea[lang]} →
      </Link>
    </div>
  );
}
