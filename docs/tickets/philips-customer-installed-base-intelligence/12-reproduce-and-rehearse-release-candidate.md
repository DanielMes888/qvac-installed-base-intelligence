# 12: Reproduce and rehearse the release candidate

Type: E9 Release and Submission-Readiness Gate

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Prove that tracked repository content and documented prerequisites can reproduce the release candidate in a clean task-specific directory and support the complete offline workflow and approximately 4:30 primary demonstration.

## Scope

- Clone or copy only tracked repository content into a new task-specific directory.
- Verify declared Node and package-manager versions and install dependencies from the lockfile.
- Acquire the exact documented model and verify its checksum.
- Restore the exact synthetic seed and verify its manifest.
- Start the selected application topology using documented commands.
- Perform a prepared connected run only if acquisition requires it, then disconnect internet.
- Complete one real-QVAC offline capture through the winning-demo seam.
- Run deterministic tests and the published evaluation command.
- Generate and structurally validate the JSON Workspace Export.
- Reset the seed and rehearse the continuous 4:30 demonstration.
- Use a fresh task-specific cache when supported; otherwise record existing-cache reuse without altering unrelated global caches.
- Record every failure and in-scope fix rather than hiding unsuccessful steps.

## Dependencies

Blocked by:

- `docs/tickets/philips-customer-installed-base-intelligence/07-protect-work-across-interruption-and-deletion.md`
- `docs/tickets/philips-customer-installed-base-intelligence/08-export-locally-and-verify-privacy.md`
- `docs/tickets/philips-customer-installed-base-intelligence/09-freeze-and-score-synthetic-evaluation.md`
- `docs/tickets/philips-customer-installed-base-intelligence/10-run-workflow-effort-and-incentive-experiments.md`
- `docs/tickets/philips-customer-installed-base-intelligence/11-clear-submission-and-third-party-gates.md`

## Implementation Boundaries Affected

- Workspace Core
- QVAC Adapter
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] Every documented setup, model, seed, startup, test, evaluation, export, reset, and demonstration command succeeds from the clean directory or produces a preserved blocking result.
- [ ] The model and seed match their published checksums/manifests.
- [ ] A real-QVAC capture completes while internet is disconnected.
- [ ] Deterministic tests and the published evaluation command reproduce their declared results within documented limits.
- [ ] The versioned JSON export is generated and schema-valid.
- [ ] Seed reset restores the declared demonstration state.
- [ ] The primary walkthrough completes in approximately 4:30 with previously unseen text, real QVAC, three-record reconciliation, customer view, top Verification Items, and limited aggregate dashboard.
- [ ] Manual recovery or controlled output does not substitute for the primary QVAC extraction.
- [ ] Setup, active installation, model download, total elapsed time, cache reuse, hardware/OS, failures, fixes, and final result are published.
- [ ] Same-laptop-only reproduction uses the exact portability limitation statement.

## Required Tests or Evidence

- Machine-readable reproduction record and command transcript without sensitive content.
- Checksums, environment versions, timing breakdown, cache declaration, and failure/fix log.
- Deterministic test and evaluation summaries.
- Valid synthetic Workspace Export.
- Final demonstration script and timed rehearsal record.

## Explicit Non-Goals

- Modifying unrelated global caches or machine configuration.
- Claiming portability to another machine when only the development laptop was tested.
- Claiming competition compliance if E8 remains incomplete.
- Introducing new features, retuning held-out failures, or relaxing acceptance thresholds during reproduction.
- Publishing real customer data, secrets, runtime databases, model weights, or temporary logs.

## Completion Artifacts

- Versioned E9 reproduction result and human-readable summary.
- Final validated setup, acquisition, evaluation, export, reset, and demo commands.
- Timed 4:30 demo script and rehearsal evidence.
- Final readiness statement listing every passed and unresolved submission gate.
