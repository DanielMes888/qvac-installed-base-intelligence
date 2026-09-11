# 08: Integrate Stretch Goals and improve UI/UX

Type: Integration and Demonstration

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Integrate every applicable completed Stretch Goal into one coherent prototype experience and improve navigation, hierarchy, states, accessibility, and demo clarity without hiding uncertainty, provenance, or limitations.

## User-Observable Result

A user can move through capture, review, installed-base intelligence, analytics, and signals with consistent language and visible status. Implemented media flows appear only when their feasibility branch passed; unavailable capabilities are not simulated.

## Scope

- Integrate Confidence scoring, Opportunity identification, and Natural-language analytics after their functional tickets pass.
- Integrate Photo-assisted and Voice capture only when their feasibility and implementation tickets end as implemented.
- Treat each media implementation ticket closed `Resolution: not-planned` after failed feasibility and explicit owner decision as an intentionally unavailable branch, not as an implemented feature.
- Improve information architecture, navigation, visual hierarchy, responsive states, keyboard/focus behavior, labels, empty/loading/error states, and demo discoverability.
- Show provenance, evidence, uncertainty, freshness, confidence explanations, configurable-rule labels, and known limitations at decision points.
- Keep the existing core workflow, QVAC v9, conservative reconciliation, synthetic data, and non-production positioning intact.

## Dependencies

Blocked by:

- `docs/tickets/official-stretch-goals/02-implement-conservative-opportunity-identification.md`
- `docs/tickets/official-stretch-goals/03-implement-local-read-only-natural-language-analytics.md`
- Resolution of `docs/tickets/official-stretch-goals/05-implement-photo-assisted-capture.md` as implemented or explicitly `Resolution: not-planned`
- Resolution of `docs/tickets/official-stretch-goals/07-implement-voice-capture.md` as implemented or explicitly `Resolution: not-planned`

Do not start general UI/UX work before all applicable functional branches have a recorded resolution.

## Acceptance Criteria

- [ ] All implemented capabilities are reachable through consistent navigation and return users to a coherent customer/evidence context.
- [ ] Loading, empty, success, error, blocked, unavailable, and offline states are visible and actionable.
- [ ] Keyboard navigation, focus order/visibility, labels, headings, contrast, and status announcements pass the selected automated and manual accessibility checks.
- [ ] Provenance, uncertainty, evidence, freshness, confidence breakdowns, and configurable-rule disclaimers remain visible.
- [ ] Failed/not-planned media branches are not presented as available or successful.
- [ ] The core explicit and ambiguity-clarification flows remain usable and conservatively reconciled.
- [ ] No UI copy implies official Philips scoring/opportunity rules, cloud capability, verified identity, production readiness, or passed E4/E4-v2 gates.
- [ ] The application remains usable locally/offline with only approved cached runtimes.

## Automated Tests

- Navigation and state-transition tests for every implemented or unavailable feature branch.
- Accessibility checks plus focused keyboard/focus tests for primary demo paths.
- Rendering tests for provenance, uncertainty, confidence explanations, opportunity disclaimers, offline/error states, and feasibility-unavailable states.
- Integration/regression tests for core capture, clarification, review, reconciliation, aggregates, analytics, photo when applicable, and voice when applicable.
- Tests proving hidden/unavailable controls cannot invoke unimplemented services.

## Required Smoke

Run one local/offline integrated demonstration over synthetic data: core explicit flow, ambiguity clarification, Confidence scoring, Opportunity signals, Natural-language analytics, and each applicable media flow. For a failed media branch, verify the capability is absent or honestly unavailable rather than simulated. Record navigation, accessibility checks, state messages, latency, and data outcomes.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Use only fictitious customers, synthetic observations, and permitted synthetic media.
- Preserve source/evidence links and human review; never conceal inferred, reported, estimated, unknown, stale, or unresolved states.
- All evaluated inference, OCR, and transcription must remain on the same computer through approved local paths; cloud and delegated processing are prohibited.
- Label prototype rules and limitations explicitly; do not exaggerate brief requirements, Philips endorsement, or production controls.

## Stop Conditions

- Stop if any functional branch lacks a passing implementation or explicit owner-approved not-planned resolution.
- Stop if visual simplification would hide provenance, uncertainty, limitations, or review gates.
- Stop if integration requires changing QVAC v9, weakening reconciliation, or adding cloud/delegated behavior.
- Stop and record regressions rather than correcting them by altering seeded evidence or prior results.

## Expected Evidence Artifacts

- Automated integration, accessibility, and regression test output.
- Machine-readable integrated smoke record listing branch resolutions, steps, visible states, latencies, and data assertions.
- Screenshots or equivalent local visual evidence using only synthetic data and documenting unavailable branches honestly.
- Updated demo instructions and limitations for the integrated prototype.

## Explicit Non-Goals

- Redesigning core domain semantics, extraction v9, model/adapter, reconciliation, or seeded facts.
- Treating a feasibility failure as an implementation success.
- Cross-device synchronization, cloud services, production deployment, or enterprise access control.
- Claiming official Philips rules, E4/E4-v2 success, formal ticket completion, submission readiness, or production readiness.
