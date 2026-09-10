# 01: Prove real local QVAC feasibility

Type: E4 Feasibility Gate

Status: ready

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Determine whether a pinned real `@qvac/sdk` configuration can perform the required structured extraction reliably on the inspected Windows laptop, and gather only the bounded evidence needed for the later topology decision.

## Scope

- Resolve the documented Node, package-manager, native runtime, and execution-backend prerequisites.
- Pin the SDK, model, revision, checksum, license, quantization, prompt, schema, parameters, and actual backend.
- Freeze the 20-note E4 feasibility set before inference and prohibit case-specific prompt tuning.
- Run all 20 notes, with at most one controlled retry per note, and repeat the required path without internet after dependencies and model artifacts are present.
- Record every case ID, original synthetic input, attempt outcome, validity result, and timing.
- Compare Electron main-process/IPC and browser plus loopback native-host feasibility through documentation and small connectivity probes only.
- Stop after three hours of active implementation effort or a concluded gate failure. Track download time separately and report total elapsed time.

## Dependencies

Blocked by: None. This is the first executable ticket.

## Implementation Boundaries Affected

- QVAC Adapter
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] No crash occurs during the recorded 20-note run.
- [ ] Every stable case ID retains its original synthetic input and has a terminal Succeeded or Failed attempt record.
- [ ] All 20 cases produce schema-valid output after at most one controlled retry.
- [ ] First-attempt and post-retry validity are reported separately.
- [ ] Warm end-to-end extraction, including retry, is at most 15 seconds for at least 19 of 20 notes.
- [ ] Cold loading, typical latency, unsupported values, memory, and actual backend are reported separately.
- [ ] Invalid output is excluded from any working dataset.
- [ ] The required inference path is run after internet disconnection.
- [ ] The topology comparison covers process compatibility, IPC or loopback boundary, startup/shutdown ownership, packaging prerequisites, and expected setup friction without building either interface.
- [ ] A failed gate produces the concrete blocker and smallest proposed model, runtime, or platform change without relaxing thresholds.

## Required Tests or Evidence

- Frozen E4 manifest and SHA-256 checksum.
- Versioned machine-readable case and timing results.
- Human-readable feasibility summary with first-attempt, retry, latency, semantic-inspection, hardware, runtime, and offline findings.
- Exact reproduction commands and active/download/elapsed timing.
- Bounded topology comparison for ADR input.

## Explicit Non-Goals

- Selecting Electron or browser plus native host.
- Building a user interface, production persistence layer, or complete application workflow.
- Delegated or cloud inference.
- Per-case prompt tuning or indefinite model experimentation.
- Claiming final extraction accuracy from the feasibility set.

## Completion Artifacts

- Frozen feasibility-set manifest and checksum.
- Pinned runtime/model/prompt/schema configuration record.
- Machine-readable E4 results and Markdown summary.
- Offline-run evidence and topology-comparison note.
- Gate decision: pass, or bounded failure report.
