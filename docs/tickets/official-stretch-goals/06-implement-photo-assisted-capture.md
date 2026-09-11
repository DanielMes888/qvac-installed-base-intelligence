# 06: Implement photo-assisted capture

Type: Official Stretch Goal

Status: done

Completed 2026-09-11 with the approved local Tesseract.js route, editable review, explicit handoff to the unchanged observation/QVAC flow, `photo-assisted` provenance, temporary-media cleanup, and a real-OCR controlled smoke. No real QVAC inference was rerun because its integration boundary and prompt v9 were unchanged.

Opened 2026-09-11 after Ticket 05 passed via `tesseract.js@7.0.0`/`tesseract.js-core@7.0.0`. The approved route is local Tesseract.js with explicitly fixed worker, WASM, and `eng`/`spa` model assets; the QVAC OCR attempt remains failed and its evidence is unchanged. The deliberately difficult synthetic OCR fixture remains a 60% limitation. This ticket does not authorize cloud OCR, remote fallback, or changes to QVAC v9.

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Add a bounded photo-assisted capture flow that performs approved OCR locally, lets the user review/edit the text, discards the original image, and persists only explicitly submitted text as a new Observation with `photo-assisted` provenance.

## User-Observable Result

A user can select a permitted synthetic image, inspect and edit local OCR text, cancel without persistence, or submit the reviewed text into the existing observation/review flow while seeing provenance and limitations.

## Scope

- Implement only the exact local OCR route approved by Ticket 05's `viable` result.
- Show temporary image/OCR state, review/edit controls, explicit submit, cancel, error, and cleanup status.
- Discard the original image after submit or cancel; do not store it in application persistence, evidence, logs, or results.
- Persist only reviewed and submitted text as a distinct Observation with `photo-assisted` provenance.
- Feed submitted text through the existing QVAC v9 extraction, Draft Claim review, and conservative reconciliation path without changing those contracts.
- Make uncertainty and the lack of authenticity/identity guarantees visible.

## Dependencies

Blocked by: `docs/tickets/official-stretch-goals/05-prove-local-ocr-feasibility.md` finishing with an owner-approved `viable` result. Resolved 2026-09-11 by the recorded outcome `OCR feasibility passed via Tesseract.js`.

If Ticket 05 is `not viable`, do not implement. Preserve the feasibility evidence and obtain an explicit owner decision before closing this ticket as `done` with `Resolution: not-planned`; do not mislabel it as implemented.

## Acceptance Criteria

- [x] All OCR processing uses the approved same-computer local/offline route with no cloud or delegated fallback.
- [x] The original image remains temporary and is discarded after submit, cancel, and handled failure paths.
- [x] Cancel creates no Observation, Evidence Entry, Draft Claim, or installed-equipment change.
- [x] Submit persists only the user-reviewed text as one original Observation with `photo-assisted` provenance before QVAC inference.
- [x] QVAC v9 extracts from the persisted text and the user explicitly reviews Draft Claims before reconciliation.
- [x] No UI claims photo authenticity, verified label content, unique identity, or official Philips capability.
- [x] Unsupported/empty OCR and local-engine failures are recoverable and do not produce records.
- [x] Existing text capture behavior and conservative duplicate handling remain unchanged.

## Automated Tests

- End-to-end state tests for select, OCR, edit, submit, cancel, failure, retry, and cleanup.
- Persistence tests proving images never persist and only reviewed/submitted text creates an Observation with correct provenance before inference.
- Tests proving cancelled or failed flows create no evidence, claims, equipment, or aggregates.
- Integration tests through QVAC v9 review/reconciliation using controlled adapter fixtures; no prompt changes.
- Regression tests for synthetic text capture, provenance rendering, duplicate prevention, and installed-base aggregates.

## Required Smoke

With the approved OCR route cached and networking unavailable, submit one permitted synthetic label image and cancel another. Verify OCR review/edit, image disposal, Observation-before-inference ordering, `photo-assisted` provenance, explicit Draft Claim review, conservative reconciliation, and unchanged data after cancel.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Use only synthetic permitted images and fictitious customers; prohibit patient, customer, employee, and real serial-number content.
- Treat OCR text as untrusted until human review and preserve its distinct `photo-assisted` origin.
- Perform OCR and evaluated QVAC inference on the same computer. Cloud, remote OCR, delegated inference, and hidden network fallback are prohibited.
- Do not exaggerate photo capture as authentication, verification, unique identification, production privacy, or a Philips rule.

## Stop Conditions

- Stop if Ticket 05 lacks an owner-approved viable result.
- Stop if any image persists beyond the temporary lifecycle or reaches telemetry/logging.
- Stop if the flow can create data without explicit review and submit.
- Stop rather than add cloud fallback, change QVAC v9, or weaken conservative reconciliation.

## Expected Evidence Artifacts

- Automated lifecycle, persistence, integration, and regression test output.
- Machine-readable offline smoke record containing synthetic case IDs, lifecycle events, provenance, QVAC/review outcome, latency, and cleanup assertions without embedding original images.
- Human-readable limitations and approved-local-route note.

## Explicit Non-Goals

- Retaining original images, processing real-world sensitive content, authenticating labels, or confirming identity.
- Replacing explicit Draft Claim review or conservative reconciliation.
- Modifying QVAC v9, model selection, adapter semantics, seeded data, E4/E4-v2, or original tickets.
- Production mobile capture, cloud OCR, synchronization, or Philips-certified behavior.
