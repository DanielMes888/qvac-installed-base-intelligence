# 09: Freeze and score the synthetic evaluation

Type: E7 Experiment and Evaluation Delivery

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Freeze the complete synthetic evaluation contract, run the real-QVAC Held-Out Evaluation Set once, and publish claim-level quality with honest limitations and reproducible numerators and denominators.

## Scope

- Complete the fictional universe and four strict partitions: application seed, development, E4 feasibility, and held-out evaluation.
- Target 6 fictional hospitals, 25-30 verified/provisional/grouped seed records, and 40 historical seed observations; reduce historical observations first if schedule requires and record the final count.
- Maintain 15 development notes, the already frozen 20-note E4 set, and 30 held-out notes.
- Give records stable IDs, explicit partition, dataset-generation version, manifests, and SHA-256 checksums.
- Check for exact and close-paraphrase leakage across development, E4, and held-out partitions.
- Freeze the annotation guide, Gold Annotations, prompt, model configuration, and checksums before the held-out run.
- Score Atomic Scoped Claims before user correction and simulate the declared review safeguard separately.
- Preserve and publish the first result; disclose defect-driven reruns or use a new untouched version.
- Publish held-out inputs and Gold Annotations after evaluation.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/06-show-working-view-verification-and-aggregates.md`.

## Implementation Boundaries Affected

- QVAC Adapter
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] All four partitions, stable IDs, versions, manifests, and checksums are published with no application-seed scoring.
- [ ] No known exact case or close paraphrase crosses development, E4, and held-out partitions.
- [ ] The project owner approves the frozen guide, gold, ambiguities, and disputes before inference results are inspected.
- [ ] The first 30-note held-out result is preserved without post-output gold editing.
- [ ] Atomic precision, recall, F1, essential-field, attachment, Quantity Scope, certainty, unsupported-draft, omission, schema-valid, correction, and residual-reviewed-error metrics include numerator and denominator.
- [ ] Targets are evaluated without alteration: F1 minimum 85%, target 90%; required field/attachment/scope/certainty accuracies at least 90%; unsupported drafts at most 5%; zero unsupported claims admitted by controlled review.
- [ ] Results below target remain published with their practical consequence.
- [ ] The single-reviewer disclosure is included unless independent review and adjudication occurred.

## Required Tests or Evidence

- Dataset schema, partition, manifest, checksum, and leakage checks.
- Frozen prompt/model/annotation configuration record.
- Reproducible scoring-command checks against known scorer fixtures.
- Machine-readable predictions, gold, matched claims, metrics, and rerun metadata.
- Human-readable E7 report with unsupported-value analysis and limitations.

## Explicit Non-Goals

- Tuning against held-out failures and calling the rerun held-out.
- Claiming real Philips accuracy or hiding model error behind user review.
- Using application seed or E4 notes for final scoring.
- Reducing the 30-note held-out set before reducing historical seed volume.

## Completion Artifacts

- Versioned datasets, manifests, checksums, guide, and Gold Annotations.
- Evaluation and scoring tools with frozen configuration.
- First-run E7 results, summaries, limitations, and disclosed reruns.
- Published numerator/denominator table and single-reviewer disclosure when applicable.
