# 06: Show the customer view, Verification Items, and aggregate dashboard

Type: Product Implementation - Minimum Winning Demo Completion

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Emergency prototype note (2026-09-10): ADR 0006 implements only the limited seeded customer, verification-item, and aggregate views mapped in `docs/EMERGENCY_DEMO_STATUS.md`. This ticket remains blocked and its complete acceptance criteria are not claimed finished.

## Objective

Complete the minimum winning-demo seam by presenting the reconciled evidence as a bounded customer working view, a focused Verification Item list, and one limited cross-customer aggregate dashboard.

## Scope

- Show customer history and supporting evidence from Accepted and Human-Authored Claims.
- Label verified records, provisional records, Unlinked Equipment Claims, and Reported Totals separately.
- Display Reported Totals with declared scope, source, date, and certainty without combining them with asset-record counts or across customers.
- Create Verification Items only for issues that materially affect the working view, duplicate prevention, or future identification.
- Apply the deterministic priority order and show the three highest-priority Open items for the selected customer.
- Expose a simple complete backlog and Open, Resolved, and Dismissed history outside the primary walkthrough.
- Require linked evidence or an explicit reconciliation decision for resolution and actor/date/reason for dismissal.
- Present one fixed aggregate dashboard containing only allowed evidence, status, recency, conflict, and verification measures.
- Assemble the continuous winning-demo path from capture through the dashboard.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/05-reconcile-without-duplicate-growth.md`.

## Implementation Boundaries Affected

- Workspace Core
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] The customer working view never presents a single authoritative installed-equipment count.
- [ ] Verified, provisional, unlinked, and reported-total categories are visually and semantically separate.
- [ ] Incompatible totals are marked unresolved and not subtracted.
- [ ] Only material issues create Verification Items.
- [ ] The selected customer shows exactly the three highest-priority Open items by the settled deterministic order when at least three exist.
- [ ] Resolution and dismissal retain the required evidence or decision history.
- [ ] The aggregate dashboard contains no market share, replacement, revenue, value, missing-asset, sales-probability, or unified-inventory metric.
- [ ] The canonical capture can run continuously through real QVAC, final review, reconciliation, customer view, top items, and aggregate dashboard.
- [ ] "Synthetic demonstration data." remains visible throughout the winning path.

## Required Tests or Evidence

- Working-view tests for record categories, Reported Totals, incompatible scope, and accepted-only inputs.
- Deterministic Verification Item creation, priority, resolution, and dismissal tests.
- Aggregate whitelist tests and explicit rejection of forbidden calculations.
- One selected-platform smoke path covering the winning-demo seam.
- Timed rehearsal trace identifying any workflow break, without yet claiming final usability results.

## Explicit Non-Goals

- Configurable analytics, free-form querying, commercial scoring, or production business intelligence.
- Export, deletion, interruption proof, or full evaluation detail in the primary walkthrough.
- Claims of faster capture or user adoption before E1-E3.

## Completion Artifacts

- Complete minimum winning-demo workflow.
- Customer-view, Verification Item, and aggregate behavior tests.
- One fixed synthetic dashboard and canonical demo state.
- Initial rehearsal notes for later demo packaging.
