# 10: Run workflow, effort, and incentive experiments

Type: E1-E3 Experiments

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Test whether the stable capture-and-review workflow resembles a real visit, reduces effort relative to an equivalent form, and provides enough personal value to justify a separate Equipment Observation Note.

## Scope

- Project owner attempts to recruit at least one accessible field-sales or field-service professional.
- If no practitioner is available, recruit at least three proxy users and disclose the limitation.
- Codex prepares frozen synthetic scenarios, an equivalent manual form, timing/correction instructions, and a results template.
- Each participant completes the same number and difficulty of scenarios through both workflows.
- Alternate workflow order where possible and measure inference time separately from complete capture-through-review time.
- Ask participants to map the workflow against a recent visit and report actual capture timing, obligations, and mismatches.
- Ask whether the equipment-only note adds work and whether the resulting customer snapshot and Verification Items are useful.
- Preserve every raw result, failure, abandonment, and unfavorable outcome.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/06-show-working-view-verification-and-aggregates.md`.

## Implementation Boundaries Affected

- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] Testing uses only frozen synthetic cases and the stable winning-demo workflow.
- [ ] Participant role and practitioner/proxy status are recorded.
- [ ] Every raw completion time and separately measured inference time is retained.
- [ ] Median time by workflow, completeness, correction distribution/range/cases above two, abandoned cases, and failed cases are reported.
- [ ] The under-60-second complete capture-and-review target and comparison with the manual form are evaluated without excluding unfavorable cases.
- [ ] Workflow mismatches, additional-note burden, customer-view usefulness, and Verification Item usefulness are recorded.
- [ ] Proxy-only findings and a single-practitioner finding are described with their stated limits.
- [ ] Business/adoption language is narrowed according to E1-E3 outcomes.

## Required Tests or Evidence

- Approved participant protocol and frozen scenarios.
- Equivalent manual form and order-allocation record.
- Participant-level raw result table.
- E1 workflow-fit, E2 effort, and E3 value summaries.
- Exact resulting changes to measured product-claim language, including withdrawn claims.

## Explicit Non-Goals

- Generalizing results to Philips' workforce.
- Collecting real customer, competitive, patient, or confidential information.
- Treating proxy users as evidence of Philips adoption.
- Rewriting or excluding slow, failed, abandoned, or unfavorable outcomes.
- Implementing product changes during the experiment without a new approved ticket.

## Completion Artifacts

- Frozen protocol, scenarios, form, and instructions.
- Raw participant data and calculated distributions/medians.
- E1-E3 report with participant limitations.
- Updated bounded business-claim wording or documented withdrawal.
