# 01b: Prove real local QVAC feasibility v2

Type: E4 Feasibility Gate

Status: done

Outcome: E4-v2 failed at the Stage 0 pre-download fit gate. `assessModelFit()` returned `likely-too-large`; no new model was downloaded or loaded, Stages 1-3 were not run, and Ticket 02 remains blocked.

Owner decision: One bounded E4-v2 experiment is approved. E4-v1 remains the immutable baseline, and Ticket 02 remains blocked unless E4-v2 passes every original gate.

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Baseline: `docs/tickets/philips-customer-installed-base-intelligence/01-prove-real-local-qvac-feasibility.md` and commit `cbccff2c5b13d5af4687288b988568de9ef22339`

## Objective

Determine whether one stronger model and a compact extraction contract can satisfy the original E4 reliability and latency gates through real `@qvac/sdk` 0.19.0 inference on the same Windows laptop. Stop with a preserved E4-v2 pass or a bounded failure report; do not select a platform or start Ticket 02.

## Pre-execution State

- Exact proposed model: SDK export `QWEN3_4B_INST_Q4_K_M` (`Qwen3-4B`, Q4_K_M).
- `assessModelFit()` result: `likely-too-large` for the declared 4096-token workload under `interactive-v1`; recorded in `results/feasibility/e4-v2-model-fit.json`.
- New model acquisition: not started. The failed fit gate prohibited downloading or loading the candidate.

## Scope

- Enforce a maximum of two hours of active development. Record dependency/model-download time separately and report total elapsed time.
- Continue using `@qvac/sdk` 0.19.0, the existing project-local Node runtime, same-computer execution, and local GPU inference. Do not use cloud or delegated inference.
- Treat the E4-v1 configuration and its 20 notes only as a documented baseline and diagnostic/development set. Do not edit, overwrite, delete, relabel, or exclude any E4-v1 input, attempt, failure, metric, or report.
- Use the SDK's `assessModelFit()` before downloading another model. Record its complete result, fresh system/device-memory sample, workload, policy, budget basis, assumptions, estimate range, verdict, and command.
- Propose exactly one stronger candidate: SDK export `QWEN3_4B_INST_Q4_K_M` (`Qwen3-4B`, Q4_K_M), which is present in the installed QVAC 0.19.0 catalog. Use a 4096-token LLM workload for fit assessment unless the compact contract proves a smaller declared context is sufficient before assessment.
- Download or load that candidate only when `assessModelFit()` returns `likely-fits` and the recorded Windows device budget safely covers the model's reported upper-bound estimate. Treat `unknown` as unknown, not as approval. A non-passing assessment ends in a no-download bounded failure report.
- Do not attempt an 8B model. It is outside the planned single-candidate comparison and could be considered only through a later owner decision after its own `assessModelFit()` result is `likely-fits` and sufficient Windows device budget remains.
- Keep `QWEN3_1_7B_INST_Q4` as the documented E4-v1 baseline only; do not rerun it as a competing E4-v2 candidate.
- Probe native QVAC tool-call output first with exactly one extraction tool and a compact JSON Schema. If native tool-call parsing fails the contract-probe criterion below, document the failure and switch once to compact raw JSON using the same data contract. Do not maintain or blend two successful production paths.
- Where the selected model template or SDK exposes a documented reasoning-control mechanism, disable or suppress reasoning in returned output and record the exact mechanism. Do not invent an unsupported SDK option. Reasoning, explanations, and chain-of-thought text are never part of the accepted contract.
- Target 300-400 generated tokens and record the exact limit. Treat `stopReason: "length"` as invalid without parsing or admitting the partial output.
- Permit at most one deterministic retry per case. The retry may receive only the recorded validation/failure category and must not receive a case-specific rewritten prompt.
- Preserve every first attempt, retry, raw output, parsed tool call or JSON result, stop reason, validation error, latency measurement, and failure in versioned E4-v2 evidence. Invalid content remains evaluation evidence only and must not enter ordinary diagnostics or a working dataset.

## Compact Output Contract

The model returns one versioned extraction object through a single tool call, or through the documented raw-JSON fallback. The schema uses compact field names or identifiers for:

- Subjects or equipment groups with stable within-response IDs and an enum kind.
- Atomic claims with claim-type enums, subject IDs, compact values, quantities, Quantity Scope, Location Scope, Information Source, Certainty Status, and source references.
- Source references expressed as validated offsets or compact IDs into the supplied original note or clarification evidence. The model does not repeat evidence text.
- Zero or one clarification candidate containing only its ambiguity kind, subject reference, source reference, and concise question text. The question may phrase the selected ambiguity; it must not include an explanation.

Deterministic code expands source references to inspectable excerpts, checks bounds and exact source identity, expands compact enums for reporting, validates relationships and quantities, and rejects unknown references. It must not infer missing semantic claims, repair truncated content, or become a parallel regex/keyword extraction system.

## Staged Execution

### Stage 0: Pre-download fit gate

1. Run `assessModelFit()` for `QWEN3_4B_INST_Q4_K_M` with the declared workload before any new model download.
2. Record the advisory result and fresh Windows GPU/device-budget evidence.
3. Continue only when the candidate verdict is `likely-fits` and the available-after-reserve device budget covers the reported upper-bound estimate. Otherwise stop without downloading weights.

### Stage 1: Three-case contract probe

1. Use three E4-v1 notes as diagnostic/development cases covering multiple equipment, negation, and ambiguous attachment or quantity scope.
2. Try the one-tool contract first with at most one deterministic retry per case.
3. The tool path is reliable only if all three cases yield exactly one complete, schema-valid extraction call after at most one retry and none ends with `stopReason: "length"`.
4. If the tool path misses that criterion, preserve its results and test compact raw JSON once on the same three cases. Continue only if all three raw-JSON cases meet the same validity criterion. If neither path does, stop as fundamentally broken.

### Stage 2: Five-case model probe

1. Use five additional E4-v1 diagnostic/development notes without changing the frozen contract for individual cases.
2. Continue only if all five are schema-valid after at most one retry, none ends for length, at least four of five satisfy their complete diagnostic semantic checklist, and no repeated critical error misstates negation, subject attachment, Quantity Scope, Information Source, or Certainty Status.
3. Preserve a stopped result if these criteria do not justify exposing the new held-out set.

### Stage 3: Frozen 20-note E4-v2 held-out run

1. Create a new 20-note fully synthetic partition with stable IDs, annotations/checklists, dataset-generation version, manifest, and SHA-256 checksums. Exclude exact examples and close paraphrases from E4-v1 and other evaluation partitions.
2. Obtain project-owner approval of the annotation/checklist and freeze the notes, annotations, compact schema, prompt, model/runtime configuration, and hashes before the first held-out inference.
3. Do not inspect E4-v2 held-out inputs for prompt tuning or use held-out failures to change and rerun the frozen configuration while calling the result held-out.
4. Run all 20 only after Stages 0-2 pass. Use at most one deterministic retry per note and preserve every attempt.
5. Score each terminal output against a frozen critical semantic checklist. A note passes only when every applicable critical field is correct: equipment type; manufacturer and model when supported by the evidence; quantity and Quantity Scope; evidence and Information Source linkage; and uncertainty or ambiguity state.
6. Require at least 18/20 held-out notes to pass the complete critical semantic checklist. Require zero unsupported equipment identities or quantities to be admitted as valid Draft Claims.
7. Exclude a semantically incorrect output from the valid Draft Claim set even when it is schema-valid. Preserve it in evaluation evidence and count it in both the semantic and schema-valid reporting as applicable.
8. Report structural/schema validity separately from semantic correctness. Publish semantic checklist totals and unsupported, omitted, wrong-attachment, wrong-scope, wrong-source, wrong-certainty, and negation errors with numerators and denominators. This is only an E4 feasibility screen; do not replace, claim, or execute the full E7 evaluation.

## Dependencies

Blocked by: None. Ticket 01 is complete and supplies the preserved failed baseline. This ticket is the only ready executable frontier.

Ticket 02 requires this ticket to finish with `Outcome: E4-v2 passed`; a completed E4-v2 failure does not unblock Ticket 02.

## Implementation Boundaries Affected

- QVAC Adapter
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [x] Active development stops by two hours; active, dependency/download, and total elapsed times are reported separately.
- [x] E4-v1 remains byte-for-byte unchanged and is used only as baseline and diagnostic/development evidence.
- [x] `assessModelFit()` runs and is recorded before any new model download; only a `likely-fits` 4B result with sufficient recorded Windows device budget permits acquisition.
- [ ] Exactly one stronger model, `QWEN3_4B_INST_Q4_K_M`, is evaluated; the 1.7B model remains baseline only and no 8B model is attempted.
- [ ] The compact contract uses one extraction tool first, records its parser reliability, and uses compact raw JSON only as the documented fallback when the three-case tool probe fails.
- [ ] Returned output repeats no evidence text or explanations, contains at most one clarification candidate, targets no more than 400 generated tokens, and treats every length stop as invalid.
- [ ] Deterministic expansion and validation never add semantic claims or repair truncated output.
- [ ] The three-case and five-case probes follow their explicit stop/continue criteria and preserve stopped results.
- [ ] A new 20-note E4-v2 held-out partition is approved and frozen before use and remains untouched by case-specific tuning.
- [ ] No crash occurs during the recorded 20-note run.
- [ ] All 20 stable case IDs retain their complete original synthetic inputs and end with a terminal Succeeded or Failed attempt record.
- [ ] All 20 cases produce schema-valid output after at most one deterministic retry.
- [ ] First-attempt and post-retry validity are reported separately, with every attempt, stop reason, and failure preserved.
- [ ] Warm end-to-end extraction, including retry, is at most 15 seconds for at least 19 of 20 notes.
- [ ] Model loading, prompt/input tokens, output tokens, TTFT, throughput, total latency, retries, failures, memory, and actual backend are reported.
- [ ] Schema validity and semantic correctness are reported separately with numerators and denominators.
- [ ] At least 18/20 held-out notes pass every applicable critical semantic check for equipment type, supported manufacturer/model, quantity and Quantity Scope, evidence and Information Source linkage, and uncertainty or ambiguity state.
- [ ] Zero unsupported equipment identities or quantities are admitted as valid Draft Claims.
- [ ] Every semantically incorrect output is excluded from the valid Draft Claim set even when schema-valid, while remaining preserved as evaluation evidence.
- [ ] Invalid or length-stopped output is excluded from every working dataset.
- [ ] The cached selected path completes all 20 cases under restricted/offline execution after model acquisition.
- [ ] Every evaluated inference is real `@qvac/sdk` 0.19.0 on the same computer and records GPU backend; no cloud, delegation, or hidden deterministic extraction fallback is used.
- [x] The final report declares E4-v2 PASS only if every original E4 gate passes without threshold relaxation; otherwise it declares a bounded failure and recommends the smallest next owner decision.

## Unchanged Success Thresholds

The acceptance checklist above is authoritative. Its original numeric thresholds remain 20/20 schema-valid terminal outputs after at most one retry and warm end-to-end extraction at or below 15 seconds for at least 19/20 notes. It also retains the original mandatory conditions for no crashes or lost notes, separate first/retry reporting, invalid-output exclusion, a complete cached offline run, and measured same-computer local QVAC execution. E4-v2 adds the semantic feasibility gate of at least 18/20 complete critical-checklist passes and zero admitted unsupported equipment identities or quantities. Schema validity cannot hide semantic failure, and human correction cannot turn a failed extraction into a passing result. These gates are not weakened, averaged, or replaced by the probe criteria.

## Required Tests or Evidence

- Pre-download `assessModelFit()` result and fresh device-budget snapshot.
- Frozen E4-v2 dataset, annotation/checklist, manifest, and checksums.
- Versioned compact prompt, one-tool schema, raw-JSON fallback schema if used, and deterministic reference-expansion/validation tests.
- Machine-readable Stage 1, Stage 2, and, if reached, Stage 3 results containing every attempt.
- Tests proving length-stopped output is rejected without parsing, no more than one retry occurs, evidence references expand exactly, invalid references fail, and invalid output cannot enter working data.
- Tests proving semantic-checklist failure excludes a schema-valid output from the valid Draft Claim set and that any unsupported equipment identity or quantity fails the admission gate.
- Human-readable report covering model metadata, acquisition, configuration, reasoning control, contract-path decision, structural and semantic results, performance, offline execution, timebox, and final gate decision.
- Before/after verification that the tracked E4-v1 evidence matches commit `cbccff2c5b13d5af4687288b988568de9ef22339`.

## Explicit Non-Goals

- Editing or rerunning E4-v1 as a scored candidate.
- Evaluating multiple stronger models, attempting an 8B model by default, or indefinite model/prompt tuning.
- Weakening the original E4 gates or using probe performance as the final result.
- Building application UI, persistence, reconciliation, dashboards, export, or any Ticket 02 behavior.
- Selecting Electron or browser plus native host or writing the post-E4 ADR.
- Cloud or delegated inference.
- Claiming formal E7 accuracy, Philips workflow validity, production readiness, or submission readiness.

## Completion Artifacts

- Ticket status and explicit `Outcome: E4-v2 passed` or `Outcome: E4-v2 failed`.
- Pre-download model-fit record.
- Frozen compact contract and E4-v2 held-out manifest.
- Preserved staged-probe and 20-note results, when Stage 3 is reached.
- Bounded pass/failure report with exact commands and time accounting.
- Recommendation to proceed to Ticket 02 only on an owner-accepted E4-v2 pass.

Published artifacts:

- `results/feasibility/e4-v2-model-fit.json`
- `results/feasibility/E4_V2_FAILURE_REPORT.md`

## Estimated Execution Time

- Active development and review: 90-120 minutes, with a hard stop at 120 minutes.
- Model acquisition: approximately 10-30 additional elapsed minutes, recorded separately and dependent on connection/cache state.
- Expected total elapsed: approximately 100-150 minutes if all stages run; an early fit or probe failure should stop sooner.
