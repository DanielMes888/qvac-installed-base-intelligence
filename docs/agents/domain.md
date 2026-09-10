# Domain documentation

This is a single-context repository.

## Required reading

Before planning, specification, ticketing, or implementation:

1. Read `docs/OFFICIAL_PROJECT_PLAN.md`.
2. Read the root `CONTEXT.md` glossary and use its defined terms.
3. Read the decisions under `docs/adr/` that affect the work.
4. Read the applicable specification under `docs/specs/` and tickets under `docs/tickets/`, when they exist.

## Layout

- `CONTEXT.md`: domain glossary and terms to avoid.
- `docs/adr/`: qualifying system-wide architecture decisions.
- `docs/specs/`: approved product and technical specifications.
- `docs/tickets/`: local tracer-bullet implementation tickets and their blocking edges.

Do not create a `CONTEXT-MAP.md` or per-package context structure unless the repository later becomes a genuine multi-context codebase and that change is explicitly approved.

## Vocabulary and decisions

Use glossary terms in specifications, ticket titles, acceptance criteria, tests, and implementation. If a required concept is absent, record the gap instead of inventing competing terminology.

Never silently contradict an ADR. Surface the conflict and obtain an explicit replacement or superseding decision before publishing dependent work.

Preserve settled product decisions. Workflow configuration changes where artifacts live and how their status is represented; it does not change product scope or behavior.
