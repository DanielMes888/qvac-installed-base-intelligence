# Permanent project rules

- Read docs/OFFICIAL_PROJECT_PLAN.md before planning or implementation.
- All evaluated AI inference must run locally through @qvac/sdk.
- Never introduce cloud inference.
- Preserve uncertainty, provenance, and supporting evidence.
- Never automatically merge ambiguous equipment records.
- Implement only approved specification or ticket requirements.
- Do not add stretch features before the MVP is complete.

## Agent skills

### Issue tracker

Specifications and tickets are committed local Markdown files under `docs/specs/` and `docs/tickets/`; no external issue tracker is required. See `docs/agents/issue-tracker.md`.

### Triage labels

Local work uses the statuses `proposed`, `ready`, `blocked`, `in-progress`, and `done`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using the root `CONTEXT.md` glossary and system-wide decisions under `docs/adr/`. See `docs/agents/domain.md`.
