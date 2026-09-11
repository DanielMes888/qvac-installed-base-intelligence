# 10: Run regression, clean reproduction, and final rehearsal

Type: Release-Candidate Verification

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Verify the extended prototype from a clean reproducible state, run complete automated and targeted smoke coverage, conduct the owner's final manual rehearsal, and update delivery documentation without overstating readiness or changing failed gates.

## User-Observable Result

The owner has a reproducible, evidence-backed demonstration record that clearly distinguishes what was implemented, what failed feasibility, what was not tested, and what was discarded by explicit decision.

## Scope

- Verify the resolved status and evidence of extension Tickets 01-09 before declaring a release candidate.
- Run the repository's complete documented automated verification and each feature-specific smoke.
- Reproduce setup and execution from a clean checkout/state using pinned, reviewed local dependencies and cached local models where required.
- Rehearse the core explicit flow, ambiguity clarification, and every implemented Stretch Goal using only synthetic data.
- Record cold/warm startup and feature latencies, messages, unexpected behavior, owner-dependent steps, reproducibility gaps, and limitations.
- Update delivery/demo/status/compliance documentation while preserving dated history, E4/E4-v2 failures, and original formal-ticket states.

## Dependencies

Blocked by:

- `docs/tickets/official-stretch-goals/09-integrate-stretch-goals-and-improve-ui-ux.md`
- Recorded resolution of `docs/tickets/official-stretch-goals/05-prove-local-ocr-feasibility.md`
- Recorded resolution of `docs/tickets/official-stretch-goals/06-implement-photo-assisted-capture.md`
- Recorded resolution of `docs/tickets/official-stretch-goals/07-prove-local-transcription-feasibility.md`
- Recorded resolution of `docs/tickets/official-stretch-goals/08-implement-voice-capture.md`

## Required Outcome Classification

For each Stretch Goal branch, the final report must use exactly one evidence-backed state:

- `implemented`
- `feasibility failed and documented`
- `test not run`
- `discarded by explicit owner decision`

A failed feasibility gate is not an implemented feature. `Test not run` cannot be converted to pass. An owner-discarded feature requires a recorded explicit decision.

## Acceptance Criteria

- [ ] The full documented automated suite passes from the release-candidate revision, or failures are preserved and the rehearsal is declared failed/incomplete.
- [ ] Every applicable feature-specific offline smoke passes and links to machine-readable evidence.
- [ ] Clean reproduction records exact revision, runtime/dependency/model metadata, commands, environment, and network assumptions.
- [ ] The owner completes the core explicit and ambiguity flows and every implemented Stretch Goal, one observed step at a time.
- [ ] Final evidence classifies every media branch using one allowed state and never treats failure, non-execution, or discard as implementation.
- [ ] Latencies, messages, owner actions, unexpected behavior, limitations, and unverified steps are recorded.
- [ ] E4 and E4-v2 remain failed, Ticket 02 and Tickets 03-12 retain their formal states, and no report claims those gates passed.
- [ ] Submission readiness is stated only if every documented delivery gate actually passes; otherwise the exact blocker remains visible.

## Automated Tests

- Run the complete repository lint, type-check, unit, integration, and build commands documented for the release candidate.
- Run regression suites for core capture, persisted Observation-before-inference, clarification bounds, Draft Claim review, conservative reconciliation, duplicate prevention, evidence, operational views, and aggregates.
- Run the automated suites specified in Tickets 01-09 for every implemented/applicable branch.
- Verify Markdown links/paths, clean-install or clean-checkout instructions, evidence schemas, and absence of unintended real/sensitive data.
- Verify tracked E4/E4-v2 evidence and the original 12 ticket files have not been rewritten to imply success.

## Required Smoke

From the clean reproduced environment and with networking unavailable where specified, execute the documented core smoke and every applicable ticket smoke. Then conduct the final owner rehearsal, recording direct observations only. Stop before manual rehearsal if automated verification fails.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Use only synthetic customers, observations, images, and audio; scan evidence for prohibited real identifiers or sensitive content.
- Verify all evaluated AI inference uses local `@qvac/sdk` on the same computer and all applicable OCR/transcription uses only approved local routes.
- Prohibit cloud, delegated inference, remote enrichment, and simulated capabilities.
- Preserve evidence, uncertainty, review history, failure results, and configurable-prototype labels in the final documentation.
- Do not present any behavior or threshold as an official Philips rule unless the brief explicitly states it.

## Stop Conditions

- Stop before manual rehearsal on any failed automated prerequisite.
- Stop and declare `rehearsal incomplete` when a required owner action or environment dependency cannot be observed.
- Stop and declare the applicable failure when clean reproduction, offline execution, evidence integrity, or a required smoke fails.
- Do not repair failures inside the rehearsal; preserve them and propose the smallest follow-up.
- Do not claim submission readiness while any required delivery gate is unexecuted or failing.

## Expected Evidence Artifacts

- Full automated verification log and per-feature machine-readable smoke results.
- Clean-reproduction record with revision, checksums/versions, commands, timing, environment, and offline evidence.
- Final owner-rehearsal report with check tables, branch classifications, latencies, issues, limitations, owner actions, and final evaluation.
- Updated demo, emergency-status, compliance, and delivery documentation preserving dated history.
- Repository status/diff evidence showing the exact release-candidate contents.

## Explicit Non-Goals

- Implementing or fixing features during verification/rehearsal.
- Reopening QVAC v9, changing the model/adapter/reconciliation, or altering E4/E4-v2 evidence.
- Changing the states of the original blocked formal tickets without their own approved process.
- Cross-device synchronization, cloud inference/services, production hardening, or enterprise deployment.
- Declaring Philips certification, production readiness, or submission readiness without passing the documented gates.
