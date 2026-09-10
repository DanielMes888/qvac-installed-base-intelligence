# 05: Reconcile repeated evidence without duplicate growth

Type: Product Implementation

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Emergency prototype note (2026-09-10): ADR 0006 implements only an evidence-based candidate and explicit repeated-evidence link without record growth, as mapped in `docs/EMERGENCY_DEMO_STATUS.md`. This ticket remains blocked and its broader reconciliation criteria are incomplete.

## Objective

Turn reviewed claims into a conservative evidence view that distinguishes identity states, quantity meanings, and candidate relationships while demonstrating that repeated observations do not create duplicate equipment records.

## Scope

- Represent Verified Individual Assets, Provisional Individual Assets, Unlinked Equipment Claims, Observed Groups, and Unidentified Member Claims using the accepted meanings.
- Treat only a Trusted Fictional Reference match as verified identity.
- Keep newly entered identifiers Reported even after syntax and uniqueness checks.
- Suggest candidate relationships without automatic merge or automatic provisional-record creation.
- Separate extraction acceptance from Provisional Match Decisions.
- Offer provisional link, separate provisional record, rejection, and deferral with actor, date, reason selector, and optional explanation.
- Apply observed, reported-total, and unknown Quantity Scope rules independently from Location Scope.
- Preserve Recorded Time, explicit Effective Time, Potential Conflicts, Possible Changes, and Reported Changes or Corrections.
- Complete the canonical three-scanner reconciliation while retaining one member-specific age estimate without arbitrary attachment.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/04-clarify-and-review-evidence-safely.md`.

## Implementation Boundaries Affected

- Workspace Core
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] Syntax, uniqueness, review, and repetition do not create verified identity.
- [ ] Unresolved evidence creates neither a verified nor provisional record.
- [ ] Candidate relationships never merge automatically.
- [ ] Every reconciliation option records its distinct decision and required attribution.
- [ ] Observed Quantity is never treated as a Reported Total without explicit completeness evidence.
- [ ] Count Discrepancies are calculated only for comparable customer, location/organization, modality, time, and meaning.
- [ ] Incompatible scopes remain visible without subtraction or a missing-asset claim.
- [ ] Recency alone resolves no conflict, change, lifecycle state, or current installation status.
- [ ] The canonical repeated three-scanner case ends with three verified records and one correctly scoped unresolved member estimate.

## Required Tests or Evidence

- Workspace-seam scenarios for verified, provisional, unlinked, group, and unidentified-member evidence.
- Repeated-observation tests proving no automatic count growth.
- Comparable and incompatible count-scope tests.
- Conflict, change, correction, and approximate-age time tests.
- Reviewable canonical scenario result with provenance.

## Explicit Non-Goals

- Automatic asset lifecycle management.
- A general knowledge graph, event-sourcing framework, or probabilistic automatic matcher.
- Claims about current installation, audited inventory, missing equipment, or commercial opportunity.
- Customer dashboard and aggregate presentation, which belong to Ticket 06.

## Completion Artifacts

- Reviewable reconciliation flow through the selected shell.
- Deterministic reconciliation and quantity/time behavior tests.
- Canonical three-scanner result fixture and evidence record.
- Documented Provisional Match Decision reasons and states.
