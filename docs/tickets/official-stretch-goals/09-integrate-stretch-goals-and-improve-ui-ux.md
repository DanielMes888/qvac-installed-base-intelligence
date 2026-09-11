# 09: Integrate Stretch Goals and improve UI/UX

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
- Integrate the Geographic Installed-Base Map after its functional ticket passes, including its accessible hierarchy and Customer 360 transition.
- Integrate Photo-assisted and Voice capture only when their feasibility and implementation tickets end as implemented.
- Treat each media implementation ticket closed `Resolution: not-planned` after failed feasibility and explicit owner decision as an intentionally unavailable branch, not as an implemented feature.
- Improve information architecture, navigation, visual hierarchy, responsive states, keyboard/focus behavior, labels, empty/loading/error states, and demo discoverability.
- Show provenance, evidence, uncertainty, freshness, confidence explanations, configurable-rule labels, and known limitations at decision points.
- Keep the existing core workflow, QVAC v9, conservative reconciliation, synthetic data, and non-production positioning intact.

## Dependencies

Blocked by:

- `docs/tickets/official-stretch-goals/02-implement-conservative-opportunity-identification.md`
- `docs/tickets/official-stretch-goals/03-implement-local-read-only-natural-language-analytics.md`
- `docs/tickets/official-stretch-goals/04-implement-geographic-installed-base-map.md`
- Resolution of `docs/tickets/official-stretch-goals/06-implement-photo-assisted-capture.md` as implemented or explicitly `Resolution: not-planned`
- Resolution of `docs/tickets/official-stretch-goals/08-implement-voice-capture.md` as implemented or explicitly `Resolution: not-planned`

Do not start general UI/UX work before all applicable functional branches have a recorded resolution.

## Acceptance Criteria

- [ ] La arquitectura de información distingue claramente secciones, pestañas o pasos y comunica el recorrido `captura → aclaración/revisión → base instalada → insights`.
- [ ] La vista explica qué representan los Equipment Records y cómo Confidence scoring encaja en el flujo general, sin hacer que sus tarjetas parezcan elementos aislados sin contexto.
- [ ] `Ver desglose y evidencia` resulta reconocible como una acción expandible y accesible.
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

## Owner validation note, 2026-09-11

The owner functionally approved Ticket 01 after visual validation. The owner did not immediately understand what the Equipment Records section represents or how Confidence scoring fits the application journey. This is non-blocking for Ticket 01 and is deliberately deferred to this ticket; no general redesign is authorized before its dependencies resolve.

The owner also approved Ticket 02 visually and functionally. Future integration must explain the purpose of **Posibles oportunidades para revisar**, distinguish data follow-up from a commercial opportunity, and make the relationship among Confidence scoring, Verification Items, and opportunity signals evident. This is non-blocking for Ticket 02 and no redesign is authorized as part of its closure.

The owner approved Ticket 03 visually and functionally on 2026-09-11. Future integration must label the three quick analytics actions as **Preguntas sugeridas** or **Ejemplos de consulta**, explain that the field accepts other questions within the permitted vocabulary, and communicate more clearly that QVAC interprets a bounded query plan while the deterministic local Workspace produces the answer. This is non-blocking for Ticket 03 and no general redesign is authorized as part of its closure.

The owner approved Ticket 04 functionally on 2026-09-11 and confirmed that its filters and Customer 360 navigation work. Future integration must improve orientation without changing the approved geographic semantics:

- Replace or improve the city cards with a more recognizable local SVG representation of Panama and Latin America while retaining the hierarchical list as the equivalent accessible alternative.
- Separate visually joined copy such as dates and provenance, and explain clearly that every location is approximate and synthetic.
- Replace **Abrir Customer 360** with a clearer action such as **Ver ficha del cliente**.
- Show navigation context when arriving from the map and provide **Volver al mapa**.
- Add a visible customer selector to Installed Base so users can change customers without returning to Capture or the map.
- Synchronize the active customer across the map, Installed Base, Customer 360, Verification Items, opportunities, and analytics when applicable; preserve that selection across sections.
- Changing customer or section must not mutate records or discard in-progress work.

These are non-blocking Ticket 09 acceptance criteria. No general redesign is authorized as part of Ticket 04 closure.
