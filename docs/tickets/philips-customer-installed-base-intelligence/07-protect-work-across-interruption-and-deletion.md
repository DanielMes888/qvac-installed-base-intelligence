# 07: Protect work across interruption and deletion

Type: Supporting Product Implementation and E5 Experiment

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Protect saved observations and manual work across interruption, retry, and late inference, and provide bounded application-managed deletion with correct view recalculation.

## Scope

- Persist Extraction Attempt identity, Observation Revision, configuration identity, time, and status.
- Change Processing attempts left by a restart to Interrupted.
- Reuse one Observation across retry attempts and prevent duplicate active Draft Claims.
- Increment the current Observation Revision after manual correction and reject results for older revisions.
- Ensure Stale Extraction Results cannot modify claims, records, conflicts, Verification Items, views, or aggregates.
- Execute the three required E5 scenarios.
- Delete an Observation only through an explicit user action.
- Remove every application-managed record that depends exclusively on the deleted Observation and recalculate affected views from remaining evidence.
- Preserve independently supported records and retain at most the allowed content-free Deletion Marker.
- State deletion limits for exports, external copies, operating-system backups, and forensic recovery.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/06-show-working-view-verification-and-aggregates.md`.

## Implementation Boundaries Affected

- Workspace Core
- Platform Shell

## Acceptance Criteria

- [ ] Restart marks abandoned Processing attempts Interrupted without deleting the original note.
- [ ] Retry creates a new attempt for exactly one Observation and does not duplicate active claims.
- [ ] Manual changes remain intact when an older attempt later completes or times out.
- [ ] All three E5 scenarios preserve exactly one Observation and produce no stale effect on views or aggregates.
- [ ] Explicit deletion removes original note, exclusively dependent evidence/answers/claims/links/conflicts, and recalculates affected views.
- [ ] Independently supported shared records survive deletion with recalculated state.
- [ ] Any Deletion Marker contains only random Observation ID, deletion timestamp, and deletion action, with no text, excerpt, value, or content hash.
- [ ] User-facing deletion text does not promise removal from prior exports, external copies, backups, or forensic remnants.

## Required Tests or Evidence

- Controlled delayed-adapter and restart tests for all E5 scenarios.
- Transaction and duplicate-prevention checks through the Workspace Core seam.
- Deletion dependency scenarios for exclusive and shared support.
- Machine-readable E5 result and concise Markdown summary.

## Explicit Non-Goals

- Production backup deletion, secure erasure, retention compliance, or forensic guarantees.
- Multi-user concurrency, synchronization, or server recovery.
- Counting manual recovery as QVAC success.
- Showing interruption or deletion in the primary 4:30 demo.

## Completion Artifacts

- Restart, retry, stale-result, and deletion behavior.
- Passing recovery/deletion tests or a bounded failure report.
- Versioned E5 results and known limitations.
- User-visible deletion warning and result state.
