# 03: Capture a saved Observation and produce real-QVAC Draft Claims

Type: Product Implementation

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Emergency prototype note (2026-09-10): ADR 0006 implements only the capture/save/real-QVAC/validated-draft subset mapped in `docs/EMERGENCY_DEMO_STATUS.md`. This ticket remains blocked and its complete acceptance criteria are not claimed finished.

## Objective

Deliver the first user-visible vertical slice: select a fictional customer, save an Equipment Observation Note before inference, invoke real local QVAC, and inspect structurally valid Draft Claims without changing the Installed-Base Working View.

## Scope

- Establish the selected Platform Shell and smallest local Workspace Core persistence needed by this slice, following the accepted post-E4 ADR.
- Load the minimum fictional customer and Trusted Fictional Reference data needed for the canonical scenario.
- Keep the synthetic-data label visible and show the full prohibited-input warning before capture.
- Capture customer context and a multi-equipment narrative.
- Persist the original Observation, current revision, author, and Recorded Time before inference.
- Invoke the real QVAC Adapter using the pinned E4-compatible configuration.
- Validate schema, enums, types, ranges, references, excerpts, subjects, scopes, source, certainty, and relationships.
- Display valid Atomic Scoped Draft Claims together with their review evidence. Keep every draft outside the working view.
- Preserve the saved Observation and show a non-content error if initial extraction fails.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/02-select-and-approve-post-e4-topology.md`.

## Implementation Boundaries Affected

- Workspace Core
- QVAC Adapter
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] No platform behavior contradicts the accepted post-E4 ADR.
- [ ] The customer, original note, stable Observation ID, revision, author, and Recorded Time exist before adapter invocation.
- [ ] The capture surface contains the equipment-only prompt, full prohibited-input warning, and visible synthetic-data label.
- [ ] Real QVAC can return multiple candidate Atomic Scoped Draft Claims for the canonical multi-equipment narrative.
- [ ] Each displayed draft includes its exact excerpt, subject/group, Quantity Scope, Location Scope, Information Source, Certainty Status, and proposed relationship.
- [ ] Structurally invalid output never affects the working view or record counts.
- [ ] An initial extraction failure retains the original Observation and exposes a truthful failure state.

## Required Tests or Evidence

- Workspace-seam tests using controlled valid, invalid, and failed adapter outcomes.
- A real-adapter integration check using synthetic text and the pinned configuration.
- Evidence that persistence precedes adapter invocation.
- A demonstration capture showing the working view unchanged before review.

## Explicit Non-Goals

- Clarification processing or final claim acceptance.
- Reconciliation, Verification Items, customer dashboards, aggregates, deletion, or export.
- Broad application navigation or visual polish.
- Alternative extraction logic using regexes, keyword maps, or hard-coded demo output.

## Completion Artifacts

- Reviewable capture-to-drafts product slice.
- Controlled workflow tests and real-adapter integration evidence.
- Synthetic seed subset and declared configuration needed by the slice.
- Updated user-facing setup instructions for the selected topology.
