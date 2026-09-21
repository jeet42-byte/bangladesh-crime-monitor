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
5. **Answer key derived from the document**, by hand, once. A refusal from
   Google proves the question is hard; it does not prove it is answerable. If
   the table is not broken out as assumed, discard the question.

## Worked example

> Consider the Bangladeshi district that contains the country's second-largest
> seaport. In the most recent national population and housing census, identify
> the upazila of that district in which the smallest share of households
> reported access to grid electricity, and state that share.

- Hop 1: second-largest seaport → Mongla → Bagerhat. Unambiguous, one match.
- Hop 2: locate the Bagerhat 2022 community report PDF.
- Hop 3: find the electricity table, rank the upazilas.

No wordplay, one correct answer, final step inside an un-scraped column.

## Source material

Primary documents where un-scraped columns are plentiful:

| Source | Un-scraped columns worth mining |
|---|---|
| BBS Population & Housing Census community reports | electricity, sanitation, household size, disability, floating population (**not** population or literacy-by-sex — both mirrored on Wikipedia) |
| Bangladesh Election Commission constituency results | rejected/invalid ballots, polling centre counts, runner-up margins |
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
2. Compute something across rows that nobody has published.
3. Paste the question into Google. Solved → discard and rebuild. Refused,
   hedged, or wrong → live question.
4. The computation from step 2 is the answer key, and it is trusted because
   it was derived rather than recalled.

Step 3 distinguishes two outcomes that look alike: a model producing a
confident answer is not the same as a model producing a correct one. The
BrowseComp paper measured exactly this gap — verbalized confidence runs well
above actual accuracy. Always check the claimed answer against the document.

## Question log

| # | Question | Source | Column | Google result | Answer key | Status |
|---|---|---|---|---|---|---|
| 1 | Jhalokati upazila, lowest household grid electricity share | BBS 2022 community report | electricity access | refused, asked for the table | pending | live, key needed |
| 2 | Bagerhat upazila, lowest household grid electricity share (source hidden) | BBS 2022 community report | electricity access | untested | pending | draft |
| 3 | Pabna upazila, largest male-female literacy gap (source hidden) | BBS 2022 community report | literacy by sex | answered: Bera, 68.83/64.94, gap 3.89pp, cited to the Bera Upazila Wikipedia article | not derived | column mirrored on Wikipedia; ranking unverified, falsification tests pending |
| 4 | Pabna upazila, lowest household grid electricity share (source hidden) | BBS 2022 community report | electricity access | no AI Overview; organic results were Rooppur background (ResearchGate, IAEA, Facebook) | pending | **live**, key needed |
