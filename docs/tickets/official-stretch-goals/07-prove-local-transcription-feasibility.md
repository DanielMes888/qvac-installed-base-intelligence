# 07: Prove local transcription feasibility

Type: Official Stretch Goal Feasibility Gate

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Determine, through a bounded experiment, whether synthetic spoken observations can be transcribed entirely locally and offline within the laptop's license, package-size, memory, and compatibility constraints.

## User-Observable Result

A small feasibility surface demonstrates local audio capture/import, temporary playback/transcription, review or cancel, and clear limitations, or the ticket ends with preserved evidence that no acceptable local route is viable.

## Scope

- Inventory local transcription candidates before download or installation, including license, artifact/dependency size, memory/CPU/GPU needs, Windows/browser/native compatibility, supported languages, and offline behavior.
- Do not presume Web Speech API is offline; exclude it unless the exact evaluated implementation proves same-computer offline processing.
- Obtain owner review before any large model or dependency download; this ticket does not authorize installation by itself.
- Test only approved synthetic audio containing fictitious installed-base observations in Spanish.
- Keep source audio temporary and verify discard after review, submit simulation, or cancel.
- Measure transcript quality, latency, resource use, startup, and cached offline execution; return an explicit `viable` or `not viable` gate result.

## Dependencies

Blocked by: `docs/tickets/official-stretch-goals/03-implement-local-read-only-natural-language-analytics.md`.

This gate is independent of Tickets 05 and 06. OCR failure must not prevent voice feasibility from running.

## Acceptance Criteria

- [ ] Candidate review records license, download/install size, runtime memory, compatibility, language support, offline guarantees, and required hardware before acquisition.
- [ ] No cloud transcription, remote API, delegated inference, or network-dependent evaluated processing is used.
- [ ] The approved candidate, if any, processes the bounded synthetic set locally after network access is unavailable.
- [ ] The experiment records transcript, correctness checklist, latency, resource usage, failures, and limitations for every case.
- [ ] Audio is temporary by default and demonstrably discarded after review, submit simulation, cancel, and handled failures.
- [ ] Transcript text remains a draft; feasibility does not mutate installed-base data.
- [ ] The final gate says `viable` only when all license, size, memory, compatibility, privacy, offline, and bounded-quality conditions pass.
- [ ] A failed gate preserves evidence and does not simulate Voice capture.

## Automated Tests

- Lifecycle tests for temporary audio, discard paths, cancellation, and absence from application persistence.
- Adapter tests for permission denial, unsupported/corrupt audio, silence, empty transcript, timeout, and engine failure.
- Network-boundary tests proving no cloud or delegated transcription endpoint is invoked.
- Deterministic validation tests for the case checklist and gate calculation.

## Required Smoke

Run the approved candidate, if acquisition is authorized, against bounded synthetic Spanish audio with networking unavailable. Exercise review, submit simulation, cancel, permission/error handling, cleanup, and cold/warm latency/resource recording.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Audio contains only fictitious customers and observations; do not record real customer, patient, employee, or facility information.
- Transcription is untrusted draft text and must show `voice` as the prospective provenance.
- All evaluated processing remains on the same computer; Web Speech API is not accepted merely because it is exposed by the browser.
- Do not claim speaker identity, consent verification, transcription certainty, or official Philips behavior.

## Stop Conditions

- Stop before download when size, license, memory, hardware, compatibility, or offline behavior is unknown or unacceptable.
- Stop if the only workable path is cloud, delegated, or silently network-dependent.
- Stop if source audio cannot be reliably temporary and discarded.
- Stop with a bounded failure report if no candidate passes; request owner direction and do not start Voice implementation.

## Expected Evidence Artifacts

- Candidate inventory and pre-acquisition review.
- Synthetic audio manifest with checksums, scripts/source text, and expected-transcript checklists.
- Machine-readable per-case feasibility, latency, resource, cleanup, and offline results without embedding source audio.
- Human-readable gate report with `viable` or `not viable` and the smallest owner decision needed.

## Explicit Non-Goals

- Implementing production Voice capture or persisting transcripts as Observations.
- Speaker recognition, consent management, real sensitive recordings, or Web Speech API assumptions.
- Installing a large dependency without prior owner review.
- Changing QVAC v9, extraction/reconciliation, E4/E4-v2, or the original tickets.
