# 08: Implement voice capture

Type: Official Stretch Goal

Status: in-progress

Owner validation: awaiting physical-microphone confirmation in Chrome or Edge

Opened 2026-09-11 after Ticket 07 passed with the local `@qvac/sdk 0.19.0` `WHISPER_TINY_Q8_0` route. The measured transcript was understandable but imperfect, so editable review remains mandatory and no alternative engine is authorized.

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Add a bounded voice-capture flow that transcribes locally, lets the user review/edit the transcript, discards source audio, and persists only explicitly submitted text as a new Observation with `voice` provenance.

## User-Observable Result

A user can record or select permitted synthetic audio, inspect and edit a local transcript, cancel without persistence, or submit reviewed text into the existing observation/review flow while seeing provenance and limitations.

## Scope

- Implement only the exact local transcription route approved by Ticket 07's `viable` result.
- Show permission/capture, temporary playback/transcription, review/edit, submit, cancel, error, and cleanup states.
- Discard source audio after submit or cancel; do not store it in application persistence, evidence, logs, or results.
- Persist only reviewed and submitted transcript text as a distinct Observation with `voice` provenance.
- Feed submitted text through existing QVAC v9 extraction, Draft Claim review, and conservative reconciliation without changing those contracts.
- Make uncertainty and lack of speaker/accuracy guarantees visible.

## Dependencies

Blocked by: `docs/tickets/official-stretch-goals/07-prove-local-transcription-feasibility.md` finishing with an owner-approved `viable` result.

If Ticket 07 is `not viable`, do not implement. Preserve feasibility evidence and obtain an explicit owner decision before closing this ticket as `done` with `Resolution: not-planned`; do not mislabel it as implemented.

## Acceptance Criteria

- [x] All transcription uses the approved same-computer local/offline route with no cloud, delegated, Web Speech, or hidden network fallback.
- [x] Source audio remains temporary and is discarded after submit, cancel, permission/error, and handled failure paths.
- [x] Cancel creates no Observation, Evidence Entry, Draft Claim, installed equipment, or aggregate change.
- [x] Submit persists only user-reviewed text as one original Observation with `voice` provenance before QVAC inference.
- [x] QVAC v9 extracts from persisted text and the user explicitly reviews Draft Claims before reconciliation.
- [x] No UI claims speaker identity, verified transcription, certainty, or official Philips capability.
- [x] Permission denial, silence, unsupported audio, and local-engine failure are recoverable and create no records.
- [x] Existing text/photo-applicable capture and conservative duplicate behavior remain unchanged.

## Automated Tests

- End-to-end state tests for permission, capture/import, transcription, edit, submit, cancel, failure, retry, and cleanup.
- Persistence tests proving audio never persists and only reviewed/submitted text creates an Observation with correct provenance before inference.
- Tests proving cancelled or failed flows create no evidence, claims, equipment, or aggregates.
- Integration tests through QVAC v9 review/reconciliation using controlled adapter fixtures; no extraction prompt changes.
- Regression tests for synthetic text capture, provenance rendering, duplicate prevention, and installed-base aggregates.

## Required Smoke

With the approved transcription route cached and networking unavailable, submit one synthetic Spanish recording and cancel another. Verify review/edit, audio disposal, Observation-before-inference ordering, `voice` provenance, explicit Draft Claim review, conservative reconciliation, errors, and unchanged data after cancel.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Use only synthetic audio with fictitious customers; prohibit patient, customer, employee, and real facility content.
- Treat transcript text as untrusted until human review and preserve its distinct `voice` origin.
- Perform transcription and evaluated QVAC inference on the same computer. Cloud, delegated inference, Web Speech dependency, telemetry-dependent output, and hidden network fallback are prohibited.
- Do not exaggerate voice capture as speaker verification, guaranteed accuracy, production privacy, or a Philips rule.

## Stop Conditions

- Stop if Ticket 07 lacks an owner-approved viable result.
- Stop if any audio persists beyond the temporary lifecycle or reaches telemetry/logging.
- Stop if the flow creates data without explicit review and submit.
- Stop rather than add cloud fallback, change QVAC v9, or weaken conservative reconciliation.

## Expected Evidence Artifacts

- Automated lifecycle, persistence, integration, and regression test output.
- Machine-readable offline smoke record containing synthetic case IDs, lifecycle events, provenance, QVAC/review outcome, latency, and cleanup assertions without embedding source audio.
- Human-readable limitations and approved-local-route note.

## Explicit Non-Goals

- Retaining source audio, processing real sensitive recordings, speaker identification, or consent management.
- Replacing explicit Draft Claim review or conservative reconciliation.
- Modifying QVAC v9, model selection, adapter semantics, seeded data, E4/E4-v2, or original tickets.
- Production mobile capture, cloud transcription, cross-device synchronization, or Philips-certified behavior.

## Completion note, 2026-09-11

Implemented with the cached `@qvac/sdk 0.19.0` `WHISPER_TINY_Q8_0` model, browser microphone capture and local mono PCM/WAV conversion. The real synthetic-audio smoke passed with model reuse, zero observed non-loopback transcription calls at the instrumented Node boundaries, no Workspace mutation before explicit submission, `voice` provenance afterward, and no retained audio. Focused voice/photo/capture/export/reconciliation checks and the 149-test full suite passed. Browser automation was unavailable for device-level microphone validation; permission, unsupported-browser, lifecycle, cancellation, and cleanup behavior is covered by the implemented UI states and public-seam tests, while microphone variability remains documented as a limitation.

## Reopened correction, 2026-09-11

Owner manual testing found that physical-microphone recording did not produce a usable transcription and that voice capture appeared outside the existing observation capture area. Ticket 08 is reopened for a focused correction of the browser MediaRecorder-to-WAV boundary and the three-mode observation capture UI. Ticket 09 remains blocked while this work is active.

Automated completion is not sufficient to return this ticket to `done`. After the correction is committed and pushed, the ticket remains `in-progress` and awaiting owner validation in Chrome or Edge with a physical microphone. The owner must confirm usable microphone transcription and the in-card `Escribir` / `Imagen` / `Voz` flow before closure.
