# Writing BrowseComp-style benchmark questions (Bangladesh)

Working method for authoring browsing-agent benchmark questions in the style of
[BrowseComp](https://arxiv.org/abs/2504.12516) (Wei et al., OpenAI, 2025). Derived
empirically: every rule below was validated by pasting candidate questions into
Google and recording whether the AI Overview solved them.

## The design principle

A good question is **hard to answer, trivial to verify**. Build it backwards:
start from an answer you have confirmed yourself, then describe it only through
constraints that never name it.

Verification must stay cheap — the answer is a short string (a name, a number,
a percentage), never an essay.

## What does not work

Eleven questions were tested. Ten were solved instantly by Google's AI Overview.
The failure modes, in the order they were discovered:

1. **Notable entity described obliquely.** If the answer has a Wikipedia
   biography, every clue lives in one paragraph of one page. Semantic retrieval
   matches the description to the page directly. This is a riddle, not a
   multi-hop question.
2. **Superlatives and firsts.** "First hat-trick", "only recipient", "first film
   at Cannes". A first is a headline, and headlines are indexed.
3. **Commemorative topics.** The Liberation War, the 1997 ICC Trophy, the
   Grameen origin story, Oscar submissions. Anniversary journalism has already
   written up every "obscure" detail in these. The leg bye off the last ball of
   the 1997 final has its own retrospective article.
4. **Facts recalled from a language model's memory.** Structural, not fixable:
   a fact only survives into model weights if it was well documented and
   repeated many times. Model recall *is* a popularity filter, so it returns
   precisely the set of facts search engines index well. Questions must come
   from primary documents, not from recall.
5. **Bot-imported statistics.** Census figures have been scraped out of the BBS
   PDFs into two places, and both must be checked. Wikidata holds population
   for every upazila. Separately, Bangladeshi upazila **Wikipedia articles** run
   a standard demographics template carrying population, households, **literacy
   rate split by sex**, religion breakdown, area and administration. A question
   asking for the largest male-female literacy gap in Pabna was answered from
   the Bera Upazila article — the column was never in the PDF only.

   The check is: open the entity's Wikipedia article and read the infobox and
   demographics section. Checking Wikidata alone is not sufficient.

## What works

Validated: a question naming the BBS 2022 community report for Jhalokati and
asking for the upazila with the lowest share of households having grid
electricity produced **no answer**. Google stated the figures required
consulting the district volume directly and asked the user to supply the table.

Identical question shape, identical source document, one variable swapped.
Population was scraped; electricity access was not.

> **The bots took the headline number off the top of each table and left the
> rest of the columns behind. Those columns are the benchmark material.**

This was then confirmed as a controlled comparison. Questions #3 and #4 in the
log share a district, a hop, a census and a phrasing, and differ in one
variable:

| Column requested | Result |
|---|---|
| literacy rate by sex | confident AI Overview with figures, cited to Wikipedia |
| household electricity access | no AI Overview at all |

Note that #4 passed for the right reason. An earlier draft using a wordplay
clue also produced no overview, but that was ambiguity rather than difficulty
(see checklist point 4). Question #4 is well-formed, unambiguous and
single-answer, and still returns nothing.

## Checklist

Every question must satisfy all five:

1. **Un-scraped column.** Not population, and not literacy by sex — both are
   already mirrored (see failure mode 5). Safe so far: electricity access,
   sanitation, household size, disability prevalence, floating population, bed
   counts, rejected ballots, branch counts. **Verify by opening the entity's
   Wikipedia article and reading the demographics section**, not by checking
   Wikidata alone.
2. **Source hidden**, reached through a factual hop rather than named outright
   — unless deliberately benchmarking extraction rather than browsing.
3. **Every clue resolves to exactly one entity.** Write out the candidate list
   and confirm the count is 1. ("A southern district sharing its first letter
   with its divisional headquarters" matches Barguna, Barishal *and* Bhola —
   under-specified, discard.)
4. **Zero wordplay.** No letter patterns, anagrams or name games. BrowseComp
   questions are hard because facts are scattered, never because phrasing is
   cryptic. A riddle blocks a competent human researcher for no useful reason
   and tests nothing about browsing.
5. **Answer key — derived on request, not by default.** Keys are no longer a
   precondition for logging or testing a question. Write the question, run it
   up the agent ladder, and record the outcome; the key is derived later, when
   the user asks for it.

   Two things still hold. A key is required before an item is used to **score
   correctness** — without one, "the agent was wrong" is unsupported. And a
   question whose underlying column turns out not to exist at the level asked
   is still discarded, whenever that surfaces.

   Capability-limit items (see below) are the reason for the change: when an
   agent works hard and returns a partial answer, the defeat is the finding,
   and it stands whether or not the full key exists yet.

## Worked example

> Consider the Bangladeshi district that contains the country's second-largest
> seaport. In the most recent national population and housing census, identify
> the upazila of that district in which the smallest share of households
> reported access to grid electricity, and state that share.

- Hop 1: second-largest seaport → Mongla → Bagerhat. Unambiguous, one match.
- Hop 2: locate the Bagerhat 2022 community report PDF.
- Hop 3: find the electricity table, rank the upazilas.

No wordplay, one correct answer, final step inside an un-scraped column.

## Scope of the rule

The rule is about un-scraped columns, not about any single publisher. Question
#5 moved to a different publisher, document format and domain — Election
Commission constituency results, rejected ballot counts — and behaved the same
way as the census questions: no AI Overview, organic results not merely weak
but off-topic.

Two source families now confirmed. Treat the recipe as portable to any official
Bangladeshi publication with tabular data, subject to the same checklist.

## Stale mirrors, and why they matter more than clean ones

A third mirror family exists alongside Wikidata and the Wikipedia demographics
template: **Banglapedia**, whose upazila entries carry a standard profile
including literacy, sanitation, main occupations and — critically —
**household electricity access**, the column this method treated as un-scraped.

The figures there are census-era but old. Banglapedia gives Bagerhat Sadar
40.8% household electricity access. Bangladesh's national rate was **99.40% in
2022**, and universal coverage was declared in March 2022. So Banglapedia's
electricity figures are roughly two censuses out of date.

This changes the framing. The column is not un-scraped; the **current value**
is un-scraped while a **stale value** sits indexed under near-identical
wording. That is worse than a clean mirror in one sense and far better in
another:

- Worse: the question is not protected by absence of data.
- Better: an agent retrieves the stale figure and presents it as current,
  because nothing in the mirror says which census it came from.

This is exactly what happened in question #6, and the official report settles
it numerically. The BBS *District Report: Bagerhat* (page xviii) gives main
source of electricity for general households across four censuses:

| Census | National Grid | No electricity |
|---|---|---|
| 2022 | **97.85%** | 1.03% |
| 2011 | 40.82% | 59.18% |
| 2001 | 22.95% | 77.05% |
| 1991 | 7.92% | 92.08% |

Perplexity reported **23.5%** for Sarankhola as the most recent census value.
The district's **2001** figure is 22.95%. Banglapedia's 40.8% for Bagerhat
Sadar matches the **2011** district figure of 40.82%. Both mirrors are exactly
one or two censuses stale, and the agent presented a 2001-era number as
current — wrong by roughly 74 percentage points.

A **time-shifted mirror reliably manufactures confident wrong answers**, which
is the most valuable failure a benchmark question can provoke.

Check all three mirrors before trusting a column: Wikidata, the Wikipedia
upazila demographics section, and Banglapedia.

### Watch for compressed columns

A second consequence, now confirmed rather than predicted. Bagerhat's
district-wide grid access is 97.85% in 2022, so every upazila sits in the
mid-to-high nineties and "lowest" becomes a distinction of two or three points,
sensitive to rounding and possibly tied. A column without spread cannot carry a
question, however well it defeats a search engine.

Prefer 2022 columns that still vary widely across upazilas: sanitation type,
household size, disability prevalence, and the census's ICT indicators
(mobile phone ownership, internet use). Internet use has the added advantage
of postdating Banglapedia's profiles entirely, so no stale mirror exists.

## Testing against agents, not search boxes

Google's AI Overview is a retrieve-and-summarize layer, not a browsing agent.
Surviving it proves the answer is not in an indexed page or a scraped infobox.
It does not prove an agent that downloads and parses a PDF would fail. The
paper's own filter was against browsing agents (GPT-4o with browsing, o1, an
early Deep Research), which is a materially stronger bar.

Run candidates up a ladder, killing them as cheaply as possible:

1. Google AI Overview — free, instant, removes most candidates
2. Google AI Mode — multi-step search, one click from the results page
3. Perplexity, or Gemini Deep Research — iterative browsing, opens documents
4. ChatGPT Deep Research or agent mode — closest to the paper's filter

A confident answer at any rung is not automatically a solve. Question #6 was
answered by Perplexity in 18 seconds from 58 sources, with a precise figure and
a correct geographic chain — and the figure was near-certainly the 2011 value,
because Bangladesh reached effectively universal household electricity access
before the 2022 census. Check the *plausibility of the number* against what is
known about the domain, not just whether a number appeared.

Three tells that an answer was generated rather than retrieved:

- **Hedged sourcing** — "census-era data", "available figures", "approximately"
  where the table would give an exact value
- **Citation to a mirror rather than the source document** — Wikipedia where
  the BBS community report was required
- **A self-flagged difficulty warning followed by a confident answer**

An agent that answers confidently and wrongly makes a question *more* valuable,
not less. That is the calibration failure the paper measured, and a question
that reliably provokes it is a better benchmark item than one that merely
provokes a refusal.

## Discrimination beats universal failure

A question every agent fails cannot rank anything. The paper's value came from
spread: Deep Research scored 51.5% where browsing GPT-4o scored 1.9%. The gap
is the measurement, not the refusals.

Question #7 produced three distinct outcomes on one prompt: Google returned no
overview, Perplexity failed at the geography hop and answered for the wrong
district entirely, and ChatGPT returned the verified answer to the decimal in
27 seconds. That is a scoring question. Keep items that separate agents;
discard items that merely stump all of them equally.

### The current difficulty ceiling

ChatGPT solved one hop plus one table extraction, locating the BBS PDF on an
Oracle Cloud object store mirroring government files. Treat that shape as
**within reach of a frontier search agent**, and reserve it for the lower end
of a benchmark.

Entanglement across publishers does **not** clear the ceiling either. Question
#8 chained a computed result from a BBS census table into an Election
Commission result sheet — two tables, two publishers, a join no document
performs — and ChatGPT solved it in 42 seconds over 23 sites, correctly
distinguishing the official rejected-ballot figure from one inferred off
candidate totals.

So both mechanisms this method was built on are beaten: depth of burial, and
the cross-publisher join. What remains untested is the shape the paper actually
used — **breadth**. A BrowseComp question stacks four or five broad constraints
that each return thousands of candidates, where only the intersection is
unique. The difficulty is reconciling threads, not retrieving a buried number.

Two other reservoirs remain genuinely out of reach: **Bangla-only sources**,
where the search index is far thinner, and **non-digitized records**, which no
agent can reach at all.

A useful side finding: ChatGPT located constituency-level rejected ballots on
file-khulna.portal.gov.bd, confirming that the Election Commission data behind
question #5 is published per constituency and that question is answerable.

### Hop failures are a distinct failure mode

Perplexity did not misread a table; it decided Chattogram was the second-largest
seaport when Chattogram is the largest and Mongla is second. Everything
downstream was correct reasoning applied to the wrong district. Log hop
failures separately from extraction failures and from stale-mirror failures:
they say different things about an agent, and a question that trips the hop
is not testing what a question that trips the table is testing.

## Testing hygiene

Two ways a test result can look like a solve without being one.

**Context contamination.** Question #9 scaled question #7 from one district to
a whole division and was run in the same chat thread, which already contained
the answer "Rampal, 33.96/13.54, 20.42" from two earlier turns. ChatGPT
returned exactly that. The scaled question was never independently attempted.
**Always test a scaled or varied question in a fresh conversation**; an answer
already in context is the cheapest thing a model can reach for.

**Narrated rigour.** Agents describe the method they ought to follow and then
do not follow it. ChatGPT stated "I'm checking every Khulna-division district
so the comparison is genuinely across all upazilas" while making roughly five
site visits in 1m50s — not ten district reports and 59 rows. Perplexity did the
same with "census-era data" before returning a 2001 figure. Read the tool-call
trace and the elapsed time, never the narration.

The counting test settles it: ask the agent to produce the per-unit breakdown
its answer implies — one row per district, one figure per upazila. An agent
that cannot produce the intermediate rows never computed over them.

## Scale is the lever that works

Depth of burial and cross-publisher joins are both within reach of a frontier
agent. **Search-space size is not.**

Question #7 asked for the maximum across one district's nine upazilas and
ChatGPT solved it in 27 seconds. Question #9 asked the same thing across a
division's ten districts and roughly 59 upazilas. ChatGPT worked 14 minutes 13
seconds, searched the BBS index, cloned GitHub repositories looking for a
machine-readable mirror, correctly distinguished the 5+ fields from the 15+
aggregate, and explicitly declined to substitute district-level aggregates for
the upazila rows the question required. It returned five districts of ten and
left the rest blank:

| District | Upazila | Male | Female | Gap |
|---|---|---|---|---|
| Bagerhat | Rampal | 33.96 | 13.54 | 20.42 |
| Meherpur | Meherpur Sadar | 46.76 | 26.97 | 19.79 |
| Khulna | Paikgachha | 30.52 | 10.89 | 19.63 |
| Jashore | Sharsha | 36.19 | 16.63 | 19.56 |
| Kushtia | Kumarkhali | 30.99 | 14.16 | 16.83 |
| Chuadanga, Jhenaidah, Magura, Narail, Satkhira | not reported | | | |

Only the Bagerhat row is verified here against the actual table; the other four
are agent-derived and unchecked. The question remains unresolved: any of the
five missing districts could exceed 20.42.

### Two kinds of defeat, both worth collecting

- **Calibration failure** (question #6): the agent answers confidently and
  wrongly. Catches an agent that does not know what it does not know.
- **Capability limit** (question #9): the agent works hard, reports partial
  results, and declines to invent the rest. Catches the edge of what an
  interactive agent can afford.

ChatGPT's behaviour here was good — no fabrication, no narrated rigour over an
empty trace. A question can defeat an agent without the agent behaving badly,
and that is the cleaner kind of benchmark item.

### Why scale is durable

The asymmetry is in effort, not knowledge. Extraction across sixty documents is
scriptable offline; an interactive agent must do it inside a session budget,
holding hundreds of rows it has no memory for. That asymmetry does not close
with a better model in the way a single buried table does.

Escalation ladder for any solved question: one district, then one division,
then the country. Add negation ("which upazila recorded **no** households
using solar as their main source") where exhaustive checking is the only path
to an answer.

## Source material

Primary documents where un-scraped columns are plentiful:

| Source | Un-scraped columns worth mining |
|---|---|
| BBS Population & Housing Census community reports | electricity access (**proven**, questions #1 and #4), sanitation, household size, disability, floating population (**not** population or literacy-by-sex — both mirrored on Wikipedia) |
| Bangladesh Election Commission constituency results | rejected/invalid ballots (**proven**, question #5), polling centre counts, runner-up margins |
| DGHS *Health Bulletin* | sanctioned bed counts, facility counts by upazila |
| Bangladesh Police annual crime statistics | offence counts by unit and division |
| Bangladesh Bank branch statistics | rural/urban branch ratios by district |
| BRTA registration statistics | vehicle registrations by type and district |
| Bangla-language gazette notifications | award recipients by category |

Two structural advantages worth exploiting:

- **Bangla-language sources.** Google's Bangla index is far thinner than its
  English one. This is the single largest lever available.
- **This repository's own incident data.** An aggregated, queryable crime
  dataset exists nowhere else in that form. Comparisons across its rows have
  never been performed by anyone, which is exactly the property a benchmark
  question needs.

## Authoring loop

1. Pick a primary-source PDF. Never a news article, never Wikipedia.
2. Identify something to compute across rows that nobody has published. The
   computation itself can wait; the question does not depend on it.
3. Paste the question into Google. Solved → discard and rebuild. Refused,
   hedged, or wrong → live question.
4. Derive the key when the user asks for it. It is trusted because it was
   derived rather than recalled. Until then the log carries the outcome and
   marks the key pending.

Step 3 distinguishes two outcomes that look alike: a model producing a
confident answer is not the same as a model producing a correct one. The
BrowseComp paper measured exactly this gap — verbalized confidence runs well
above actual accuracy. Always check the claimed answer against the document.

## Verified data: Bagerhat, Census 2022

Extracted from the BBS *District Report: Bagerhat*, Tables 3.2.13 (printed p93)
and 3.1.26 (printed p71). These are derived answer keys, not recalled values.

### Main source of electricity, national grid (%), ascending

| Upazila | National grid | Any electricity |
|---|---|---|
| Mongla | **93.85** | 98.46 |
| Rampal | 96.60 | 98.27 |
| Sharankhola | 97.34 | 99.10 |
| Morelganj | 97.62 | 98.80 |
| Kachua | 98.64 | 98.81 |
| Fakirhat | 98.95 | 99.06 |
| Bagerhat Sadar | 98.99 | 99.18 |
| Chitalmari | 99.18 | 99.53 |
| Mollahat | 99.55 | 99.72 |

Spread 5.70 points, with Mongla a clean outlier rather than a rounding tie.
Note the two columns disagree on the minimum: lowest **national grid** is
Mongla, lowest **any electricity** is Rampal at 98.27%. A question must say
which it means.

The report's prose never states this ranking. It says only that coverage "in
all upazilas of the district is almost the same" and that solar is "a bit high
in Mongla upazila, 4.27%". The ordering exists only in the table.

### Internet use, gap between male and female rates (5 years and above, points)

| Upazila | Male | Female | Gap |
|---|---|---|---|
| Rampal | 33.96 | 13.54 | **20.42** |
| Mongla | 36.65 | 18.10 | 18.55 |
| Chitalmari | 34.04 | 17.58 | 16.46 |
| Fakirhat | 32.83 | 16.90 | 15.93 |
| Mollahat | 30.67 | 15.01 | 15.66 |
| Bagerhat Sadar | 33.64 | 19.14 | 14.50 |
| Kachua | 26.81 | 13.27 | 13.54 |
| Morelganj | 26.72 | 14.38 | 12.34 |
| Sharankhola | 29.61 | 18.68 | 10.93 |

Spread 9.49 points, nearly double the electricity column. The gap is a
subtraction across two printed columns that no source performs, and
Banglapedia's profiles predate internet indicators entirely, so no stale
mirror exists for it. Prefer this column.

The report's prose does state the internet *rate* extremes (highest Mongla
27.49%, lowest Kachua 19.86%), so a question must ask for the **gap**, not the
rate.

### Scoring question #6

| | Perplexity | Verified |
|---|---|---|
| Upazila | Sharankhola | **Mongla** |
| Value | 23.5% | **93.85%** |

Wrong upazila and wrong figure, off by 73.84 points, with its named upazila
placing third rather than first. The stale mirror supplied a 2001-era value
and the agent attached it to the wrong entity.

## Question log

| # | Question | Source | Column | Google result | Answer key | Status |
|---|---|---|---|---|---|---|
| 1 | Jhalokati upazila, lowest household grid electricity share | BBS 2022 community report | electricity access | refused, asked for the table | pending | live, key needed |
| 2 | Bagerhat upazila, lowest household grid electricity share (source hidden) | BBS 2022 community report | electricity access | untested | pending | draft |
| 3 | Pabna upazila, largest male-female literacy gap (source hidden) | BBS 2022 community report | literacy by sex | answered: Bera, 68.83/64.94, gap 3.89pp, cited to the Bera Upazila Wikipedia article | not derived | column mirrored on Wikipedia; ranking unverified, falsification tests pending |
| 4 | Pabna upazila, lowest household grid electricity share (source hidden) | BBS 2022 community report | electricity access | no AI Overview; organic results were Rooppur background (ResearchGate, IAEA, Facebook) | pending | **live**, key needed |
| 7 | Bagerhat upazila with the largest male-female internet use gap, 5 years and above (source hidden) | BBS 2022 district report, Table 3.1.26 | internet use by sex | Google: no overview. Perplexity: wrong district (Chattogram), answered Rangunia 43.93/25.49. ChatGPT: **correct**, Rampal 33.96/13.54/20.42 in 27s, citing Table 3.1.26 from an Oracle Cloud mirror | **Rampal, 20.42 points** (33.96 male, 13.54 female) | **solved at top rung; discriminates 1 of 3 agents** — key independently confirmed by ChatGPT |
| 8 | Layered: Bagerhat's largest internet-gender-gap upazila, then its 2018 constituency and rejected ballot count | BBS Table 3.1.26 + EC 2018 result sheet | internet use by sex + rejected ballots | ChatGPT: **solved**, Rampal to Bagerhat-3 (Rampal-Mongla) to 1,110 rejected ballots, 42s over 23 sites, cited a result sheet on file-khulna.portal.gov.bd | first half **verified** (Rampal); ballot count **unverified** | cross-publisher join beaten; 1,110 needs checking against the source |
| 9 | Same gap question scaled to ALL upazilas of Khulna Division (10 districts, ~59 upazilas) | BBS 2022 district reports x10 | internet use by sex | Counting test: ChatGPT worked **14m13s**, cloned repositories, hunted machine-readable mirrors, and returned **5 of 10 districts**, leaving five blank rather than inventing them | partial; Bagerhat verified by us, four rows agent-derived, five districts unknown | **NOT SOLVED — first question to defeat ChatGPT.** Scale is the working lever |
| 5 | Khulna Division constituency with the most rejected ballots, 2018 (source hidden) | Election Commission 2018 results | rejected/invalid ballots | no AI Overview; organic results off-topic entirely (India GCC report, a PDF on Russian politics, an unrelated election video) | pending | **live**, key needed |
| 6 | Layered: Bagerhat's lowest-electricity upazila, then its 2018 constituency and rejected ballot count | BBS 2022 community report + EC 2018 results | electricity access + rejected ballots | Perplexity (free, 18s, 58 sources) answered: Sarankhola, 23.5%, Bagerhat-4, 1,415 rejected. Hedged as "census-era data", cited Wikipedia not BBS, and the UI itself warned the question looked difficult | **Mongla, 93.85%** (Table 3.2.13) | **VERIFIED — question live, agent wrong.** Perplexity answered Sharankhola 23.5%; truth is Mongla 93.85%, Sharankhola 97.34%. Wrong entity and wrong value, off by 73.84 points |
