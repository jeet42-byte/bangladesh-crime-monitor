---
name: browsecomp
description: Author, test or repair BrowseComp-style benchmark questions for browsing agents, sourced from Bangladeshi primary documents. Use when writing benchmark questions, checking whether a candidate question survives a search engine, turning a PDF table into a verified answer key, or diagnosing why a question was solved too easily. Triggers on "benchmark question", "BrowseComp", "unsearchable question", "question for the benchmark", or a pasted table plus a request to build a question around it.
---

# BrowseComp question authoring

Read `docs/browsecomp-methodology.md` in this repo first. It holds the design
principle, the five failure modes found by testing, the five-point checklist,
a worked example, the source table and the question log. Follow it rather than
improvising; this file only says how to run the loop.

## Modes

Pick the one matching what was asked.

### Authoring from a pasted table

The usual case. A table from a primary-source PDF arrives in chat.

1. Do the cross-row computation — rank, difference, ratio, ordinal. This is
   the answer key, and it is trustworthy because it was derived, not recalled.
2. Run the five-point checklist against the question being built.
3. Write the question with the source hidden behind a factual hop, unless
   extraction rather than browsing is being benchmarked.
4. Append a row to the question log in the methodology doc.

### Reviewing a candidate

Run the checklist point by point and say which points fail and why. Check
points 3 and 4 hardest — ambiguity and wordplay are the easiest to introduce
by accident. For point 3, enumerate the candidate entities and state the count.

### Diagnosing a solved question

Read the citations in the search result before concluding anything. A
Wikipedia or Wikidata citation means the clues were co-located or the
statistic was bot-imported — name which of the five failure modes applies,
then repair by swapping the variable rather than rewriting the phrasing.

### Testing

A search result cannot be produced from this environment; arxiv.org, openai.com
and most direct fetches are blocked by the egress proxy, and search snippets
are not a substitute for seeing an AI Overview. Testing is the user's step.

Distinguish two outcomes that look alike:

- **Solved** — the correct answer, from the actual document. Discard the
  question and rebuild.
- **Answered but unverified** — a confident paragraph citing something other
  than the source. Not a fail. Check the claim against the document; a wrong
  confident answer is the most valuable kind of benchmark item.

Two falsification tests for a suspected fake answer: ask for second place (a
system that cannot rank second never ranked at all), and ask the same question
for a different district or division (a confident winner every time means
pattern-matching, not computing).

## Standing constraints

- Never source a question from recall. Model memory is a popularity filter and
  returns exactly the facts search engines index well.
- Never build on a bot-imported statistic. Census population is in Wikidata for
  every upazila; the columns beside it are not.
- Never claim a question is unsearchable without a test. State plainly which
  checklist points are unverified.
- An answer key is derived from the document by hand, or it does not exist.
