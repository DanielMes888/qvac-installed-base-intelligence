# 05: Prove local OCR feasibility

Type: Official Stretch Goal Feasibility Gate

Status: ready

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Determine, through a bounded experiment, whether permitted synthetic equipment images can be converted to reviewable text entirely locally and offline within the laptop's license, package-size, memory, and compatibility constraints.

## User-Observable Result

A small feasibility surface demonstrates local image selection, temporary preview/OCR text, review or cancel, and clear limitations, or the ticket ends with preserved evidence that no acceptable local route is currently viable.

## Scope

- Inventory candidate local OCR runtimes before download or installation, including license, artifact and dependency size, memory/CPU/GPU requirements, Windows/browser/native compatibility, and offline behavior.
- Obtain owner review before any large model or dependency download; this ticket does not itself authorize installation.
- Test only approved, fully synthetic, permitted images representing plausible labels and field photos.
- Keep original images temporary and verify discard on review completion or cancellation.
- Measure OCR output quality, latency, resource use, startup, and cached offline execution.
- Produce an explicit `viable` or `not viable` gate result without simulating missing capability.

## Dependencies

Blocked by: None. Ticket 03 is `done`.

This gate does not block `docs/tickets/official-stretch-goals/07-prove-local-transcription-feasibility.md`; OCR and voice feasibility are independent after Ticket 03.

## Acceptance Criteria

- [ ] Candidate review records license, download/install size, runtime memory, compatibility, offline guarantees, and required hardware before acquisition.
- [ ] No cloud OCR, remote API, delegated inference, or network-dependent evaluated processing is used.
- [ ] The approved candidate, if any, processes the bounded synthetic set locally after network access is unavailable.
- [ ] The experiment records exact text, correctness checklist, latency, resource usage, failures, and limitations for every case.
- [ ] Original images are temporary by default and demonstrably discarded after review or cancel.
- [ ] OCR text remains a draft until explicit human review and submission; feasibility does not mutate installed-base data.
- [ ] The final gate says `viable` only when all documented license, size, memory, compatibility, privacy, and offline conditions pass.
- [ ] A failed gate preserves evidence and does not fabricate a photo feature.

## Automated Tests

- Lifecycle tests for temporary image handling, discard after review/cancel, and no persistence into observation storage.
- Adapter tests for unsupported formats, corrupt images, empty OCR, cancellation, timeout, and local-engine failure.
- Network-boundary tests showing evaluated OCR invokes no cloud or delegated endpoint.
- Deterministic validation tests for the recorded case checklist and gate calculation.

## Required Smoke

Run the approved local candidate, if acquisition is authorized, against the bounded synthetic image set with network access unavailable. Exercise review and cancel paths, inspect temporary-file cleanup, and record cold/warm latency and peak resource use.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Images are synthetic permitted content; do not use real customer, patient, employee, serial-number, or facility data.
- OCR output is untrusted draft text and must show `photo-assisted` as the prospective provenance.
- Do not claim label authenticity, unique equipment identity, data verification, or official Philips OCR behavior.
- All evaluated processing remains on the same computer.

## Stop Conditions

- Stop before download when size, license, memory, hardware, or compatibility is unknown or unacceptable.
- Stop if the only workable path uses cloud or delegated processing.
- Stop if original images cannot be reliably treated as temporary and discarded.
- Stop with a bounded failure report if no candidate satisfies the gate; request an owner decision and do not start photo implementation.

## Expected Evidence Artifacts

- Candidate inventory and pre-acquisition review.
- Synthetic image manifest with checksums and expected-text checklists.
- Machine-readable per-case feasibility, latency, resource, cleanup, and offline results.
- Human-readable gate report with `viable` or `not viable` and the smallest owner decision needed.

## Explicit Non-Goals

- Implementing production Photo-assisted capture or persisting OCR text as an Observation.
- Authenticating labels, identifying equipment uniquely, or extracting real customer data.
- Installing a large dependency without prior owner review.
- Changing QVAC v9, the local extraction adapter, reconciliation, E4/E4-v2, or formal ticket states.
