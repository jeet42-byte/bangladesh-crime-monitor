# Bangladesh Crime Monitor

Scheduled OSINT crime-tracking pipeline, read-only public API, and dashboard.
See `README.md` for architecture, data flow and free-tier constraints.

## Benchmark question authoring

When asked to write, review or repair BrowseComp-style benchmark questions for
browsing agents, follow `docs/browsecomp-methodology.md` rather than improvising.

Two rules from that document are load-bearing and easy to violate by accident:

- **Never source a question from recall.** Anything a model remembers is, by
  construction, well documented on the web and therefore searchable. Questions
  come from primary documents — PDFs, gazettes, statistical tables.
- **Never build on a bot-imported statistic.** Census population figures are
  already in Wikidata for every upazila. Use the columns beside them, which are
  not.

Before proposing any question, run it against the five-point checklist in that
document, and state honestly which points are unverified when there is no way
to check them from the current environment.
