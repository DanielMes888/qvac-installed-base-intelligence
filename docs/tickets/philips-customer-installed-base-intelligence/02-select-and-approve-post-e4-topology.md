# 02: Select and approve the post-E4 topology

Type: Architecture Decision Gate

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Use E4 evidence to select Electron or a browser interface plus same-computer native QVAC host, or explicitly record that neither candidate has enough support, before any platform-dependent implementation begins.

## Scope

- Review all E4 gates, limitations, actual backend behavior, offline evidence, and topology-comparison findings.
- Record the selected topology, exact SDK/model/runtime approach, local communication boundary, startup/shutdown ownership, persistence implications, packaging implications, and measured rationale in an ADR.
- If E4 failed or evidence is insufficient, record no selection and describe only the smallest separately bounded follow-up proposal.
- Update topology-dependent portions of the accepted specification and preliminary delivery dependencies without changing settled domain behavior.
- Obtain explicit project-owner acceptance of the ADR and any affected specification updates.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/01-prove-real-local-qvac-feasibility.md`.

## Implementation Boundaries Affected

- Workspace Core
- QVAC Adapter
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] The ADR cites the exact E4 configuration and measured evidence.
- [ ] The ADR selects one candidate topology or explicitly records that no candidate can yet be selected.
- [ ] No claim of browser-local, cloud, delegated, or cross-device inference is introduced.
- [ ] Startup, shutdown, local communication, persistence, packaging, and conditional smoke-test consequences are recorded.
- [ ] The project owner explicitly accepts the ADR before Ticket 03 can become ready.
- [ ] A failed E4 does not silently create an alternative platform path or relaxed gate.

## Required Tests or Evidence

- Read-only review of E4 machine-readable results and summary.
- Trace from every ADR conclusion to measured E4 evidence or an explicit unresolved item.
- Project-owner acceptance record.

## Explicit Non-Goals

- Implementing the selected Platform Shell.
- Running another model or platform spike without separate approval.
- Changing evidence, uncertainty, reconciliation, privacy, or evaluation decisions.

## Completion Artifacts

- Accepted post-E4 ADR or explicit no-selection ADR.
- Updated accepted specification where topology affects behavior.
- Updated ticket dependencies/statuses for newly unblocked work.
