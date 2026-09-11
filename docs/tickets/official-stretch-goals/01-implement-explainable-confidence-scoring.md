# 01: Implement explainable confidence scoring

Type: Official Stretch Goal

Status: done

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Add a visible, deterministic confidence score for installed-base information, with an explanation of completeness, freshness, and independent corroboration, without changing the extraction contract or presenting the score as certainty.

## User-Observable Result

The customer and equipment views show a score and its three component contributions. A user can inspect which evidence affected the score and can distinguish it from certainty status, verification priority, human acceptance, and confirmed identity.

## Scope

- Implement the configurable prototype rule: completeness 40 points, freshness 30 points, and independent corroboration 30 points.
- Define deterministic, tested subthresholds for each component and expose the active rule/version.
- Award no corroboration points when all supporting Draft Claims derive from one Observation, even if that Observation produced multiple claims.
- Do not count human review of a claim, by itself, as independent corroboration.
- Recompute the score from persisted evidence and dates without QVAC inference.
- Preserve `prototype-equipment-extraction-v9`, the selected local model, the QVAC adapter, and conservative reconciliation behavior.

## Dependencies

Blocked by: None. This is the first executable ticket in the official Stretch Goals extension.

## Acceptance Criteria

- [ ] The maximum score is 100, partitioned exactly as 40/30/30, and the rule is identified as configurable prototype logic.
- [ ] Every displayed score explains completeness, freshness, and corroboration contributions using visible supporting data.
- [ ] One Observation cannot earn independent-corroboration points through multiple Draft Claims.
- [ ] Human review alone does not create independent corroboration.
- [ ] Score, certainty, verification priority, review state, and identity state remain separate fields and labels.
- [ ] Missing or contradictory evidence cannot silently increase a score.
- [ ] Existing extraction and reconciliation regression tests remain green.
- [ ] No UI copy calls the score a Philips metric, statistical probability, verified fact, or production-grade measure.

## Automated Tests

- Unit tests for all component boundaries, missing dates, stale dates, incomplete fields, multiple sources, and the 0/100 limits.
- Tests proving that multiple claims from one Observation yield zero independent corroboration and that genuinely separate Evidence Entries can contribute.
- Tests proving review acceptance does not alter corroboration by itself.
- Contract/regression tests proving certainty, priority, acceptance, and identity are unchanged by scoring.
- Deterministic aggregate/view tests proving the same stored evidence always yields the same explanation and score.

## Required Smoke

Run a synthetic customer scenario containing one incomplete old Observation and two independently sourced recent Evidence Entries. Verify the displayed component math, total, source links, and recomputation after an allowed evidence change.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Derive every component only from persisted synthetic records, dates, provenance, and evidence relationships.
- Run scoring locally and deterministically; cloud services, delegated inference, and hidden network calls are prohibited.
- Preserve uncertainty and display the evidence behind the result.
- Use only the repository's synthetic demo/test identities and observations.
- Do not claim that the formula or its thresholds are official Philips rules.

## Stop Conditions

- Stop if a proposed formula requires inferred facts not present in evidence.
- Stop if implementation would collapse score into certainty, review, priority, or identity.
- Stop and request owner review before changing the approved 40/30/30 weights.
- Preserve failing evidence and stop before weakening a test to obtain a pass.

## Expected Evidence Artifacts

- Automated test output covering the deterministic subthreshold matrix.
- A machine-readable confidence-scoring smoke result with rule version, component values, total, and evidence identifiers.
- A short human-readable note documenting the chosen subthresholds and why each is inspectable.

## Explicit Non-Goals

- Calibrating a probability or training a predictive model.
- Changing QVAC v9, the extraction adapter, reconciliation, seeded data, or formal E4/E4-v2 results.
- Automatically confirming equipment identity or accepting Draft Claims.
- Claiming production readiness or Philips endorsement of the rule.
