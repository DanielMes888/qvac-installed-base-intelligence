# 02: Implement conservative opportunity identification

Type: Official Stretch Goal

Status: done

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Produce visible, explainable signals for possible follow-up opportunities using only installed-base evidence, without asserting purchase intent, clinical need, obsolescence, or a commercial recommendation.

## User-Observable Result

Users can see and filter conservative opportunity signals, inspect the rule and evidence that triggered each signal, and recognize that every result is a prototype prompt for review rather than a sales conclusion.

## Scope

- Define deterministic, configurable prototype rules using visible facts such as reported age, incomplete information, reported technology, and verification need.
- Define and test exact thresholds during implementation; do not encode them as official Philips policy.
- Link every signal to evidence, provenance, freshness, and the relevant customer/equipment context.
- Permit a user to distinguish a possible signal from an accepted claim or verified equipment identity.
- Preserve conservative reconciliation and the confidence score's independent meaning.
- Preserve `prototype-equipment-extraction-v9`; this feature uses stored structured data and does not retune extraction.

## Dependencies

Blocked by: None. Ticket 01 is `done`.

## Acceptance Criteria

- [ ] Each emitted signal names its configurable rule, threshold, contributing fields, evidence identifiers, and current freshness/confidence context.
- [ ] No signal text asserts intent to buy, clinical need, obsolescence, or a recommended commercial action.
- [ ] Missing evidence remains visible and never becomes an invented fact.
- [ ] Removing or changing the triggering synthetic evidence deterministically removes or changes the signal.
- [ ] Signals remain separate from Draft Claims, installed equipment records, certainty, and human review state.
- [ ] Customer and aggregate views can expose signals without hiding provenance or limitations.
- [ ] No copy presents thresholds as official Philips rules or the output as production advice.

## Automated Tests

- Rule-table unit tests at, below, and above every approved threshold.
- Negative tests for unsupported age, conflicting evidence, missing dates, and prohibited commercial/clinical conclusions.
- Provenance tests requiring every signal to resolve to visible Evidence Entries.
- Regression tests proving signals do not mutate observations, claims, equipment, or confidence components.
- Deterministic filtering and aggregation tests over synthetic customers.

## Required Smoke

Use synthetic customers representing an old reported installation, incomplete information, a verification need, and a non-triggering control. Confirm exact signals, explanations, filters, evidence links, and absence of prohibited assertions.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Compute rules locally from stored evidence; cloud services, delegated inference, and external enrichment are prohibited.
- Treat signals as review prompts and preserve uncertainty, source, observation dates, and configurable rule versions.
- Run all tests and demonstrations with synthetic customers and observations only.
- Do not claim the feature diagnoses clinical need, equipment condition, legal status, or commercial intent.

## Stop Conditions

- Stop if a signal cannot cite visible stored evidence.
- Stop if proposed wording implies purchase intent, clinical need, obsolescence, or a recommendation.
- Stop and request owner review before adding inferred external market, product-life, or customer data.
- Preserve failures rather than loosening deterministic assertions.

## Expected Evidence Artifacts

- Automated rule-matrix results including prohibited-output tests.
- A machine-readable opportunity smoke result listing rules, inputs, evidence identifiers, and emitted/non-emitted signals.
- A human-readable threshold and wording review note.

## Explicit Non-Goals

- Lead scoring, sales prioritization, recommendation engines, or CRM integration.
- Predicting purchase behavior, clinical requirements, obsolescence, or equipment safety.
- Changing QVAC v9, confidence semantics, reconciliation, seeded data, E4/E4-v2, or formal ticket states.
- Claiming submission or production readiness.
