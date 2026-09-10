# Issue tracker: committed local Markdown

Specifications and implementation tickets for this repository are Markdown files committed with the source. Publishing does not require GitHub CLI, GitHub Issues, Linear, or another external service.

## Locations

- Specifications: `docs/specs/<feature-slug>.md`
- Tickets: `docs/tickets/<feature-slug>/<NN>-<ticket-slug>.md`
- Optional effort map: `docs/tickets/<feature-slug>/map.md`

Use lowercase kebab-case slugs. Number tickets from `01` in dependency order, with blockers before the tickets they block. Keep one specification or ticket per file.

## Status field

Every published specification and ticket has a `Status:` field near the top. Use only the values defined in `docs/agents/triage-labels.md`.

For newly published specifications, use `Status: ready` after the user has approved the testing seam and the specification content.

For newly published tickets:

- Use `Status: ready` when all blocking tickets are already `done` or the ticket has no blockers.
- Use `Status: blocked` while any declared blocker is not `done`.
- Record blocking edges in a `Blocked by:` field using repository-relative ticket paths.

When a blocker becomes `done`, update newly unblocked tickets from `blocked` to `ready` as a separate, reviewable change.

## When a skill says "publish to the issue tracker"

Write the artifact to the applicable path under `docs/specs/` or `docs/tickets/` and include it in version control. Do not call or require an external tracker.

### `/to-spec`

Publish the approved specification as `docs/specs/<feature-slug>.md`. Translate the skill's `ready-for-agent` role to local `Status: ready`.

### `/to-tickets`

Publish one ticket per file under `docs/tickets/<feature-slug>/`. Never publish a combined ticket list. Each ticket records:

- What the end-to-end slice delivers.
- Acceptance criteria stated as observable behavior.
- `Blocked by:` relationships.
- One local status.

The first executable ticket with no unfinished blockers is `ready`; later tickets are `blocked` until their blocking edges are satisfied.

## Reading and updating local work

- Fetch a specification or ticket by reading its repository-relative path.
- Treat the committed file as the authoritative body and status.
- Preserve material decisions and append dated notes when history is needed.
- Do not silently rewrite settled product decisions.
- Work the frontier: tickets whose blockers are all `done` and whose status is `ready`.

## Wayfinding operations

If `/wayfinder` is used, store its map at `docs/tickets/<feature-slug>/map.md` and its decision tickets alongside implementation tickets using the same numbering and status vocabulary. A claimed decision ticket becomes `in-progress`; a resolved decision ticket becomes `done`. Blocking and frontier rules are the same as for implementation tickets.
