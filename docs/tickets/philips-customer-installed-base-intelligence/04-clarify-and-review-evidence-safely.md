# 04: Clarify and review evidence safely

Type: Product Implementation

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Emergency prototype note (2026-09-10): ADR 0006 implements only explicit Accept/Reject review for produced Draft Claims, as mapped in `docs/EMERGENCY_DEMO_STATUS.md`. Clarification and the rest of this ticket remain deferred; the ticket remains blocked and incomplete.

## Objective

Extend the capture slice through the bounded clarification lifecycle and explicit human review, producing Accepted or Human-Authored Claims without permitting inference loops or semantic approval to imply factual confirmation.

## Scope

- Apply deterministic priority rules to select zero or one material Clarification Target.
- Ask QVAC to phrase only the selected question, with a predefined fallback if phrasing fails.
- Support substantive answer, skip, and "I don't know" outcomes.
- Store a substantive answer as a separate attributed and dated Evidence Entry.
- Run one additional real-QVAC extraction over original plus clarification evidence, with further questions disabled.
- Supersede the initial Draft Claim set after successful second extraction while preserving Extraction Attempt metadata.
- On second-extraction failure, retain note/evidence, record non-content failure metadata, and offer manual structured entry without invoking QVAC again in that capture.
- Require explicit accept, correct, reject, or unresolved review of the final drafts.
- Distinguish Extraction Corrections, Revised Assertions, and Human-Authored Claims and activate reviewed claims transactionally.
- Provide ordinary retry/manual recovery without implementing restart or stale-result scenarios reserved for Ticket 07.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/03-capture-observation-and-produce-qvac-drafts.md`.

## Implementation Boundaries Affected

- Workspace Core
- QVAC Adapter
- Platform Shell

## Acceptance Criteria

- [ ] No more than one Clarification Target and one question are produced per capture.
- [ ] A substantive answer is a linked, attributed, dated Evidence Entry and causes exactly one second extraction with question generation disabled.
- [ ] Skip and "I don't know" cause no second extraction and preserve unresolved information.
- [ ] A successful second extraction supersedes the active first draft set without duplicating active claims or deleting attempt metadata.
- [ ] A failed or invalid second extraction admits neither invalid nor outdated drafts as final evidence and offers manual recovery.
- [ ] Every final draft supports accept, correct, reject, and unresolved disposition.
- [ ] Only Accepted and Human-Authored Claims affect the working view, in one transaction.
- [ ] Review changes neither Certainty Status nor verified identity without supporting evidence.

## Required Tests or Evidence

- Controlled-adapter workflow tests for no ambiguity, answer, skip, "I don't know," phrasing failure, second-extraction failure, and invalid second output.
- Tests proving the one-question and one-additional-extraction limits.
- Tests distinguishing Extraction Correction from Revised Assertion provenance.
- Real-QVAC integration evidence for one synthetic clarification path.

## Explicit Non-Goals

- Candidate asset matching or Provisional Match Decisions.
- Restart, process interruption, or late-result concurrency tests.
- Treating manual recovery as QVAC success.
- Inferring verification or confidence from user acceptance.

## Completion Artifacts

- Reviewable capture-through-final-review product slice.
- Clarification and review workflow tests.
- Real-QVAC clarification evidence.
- Documented manual-recovery and second-extraction failure behavior.
