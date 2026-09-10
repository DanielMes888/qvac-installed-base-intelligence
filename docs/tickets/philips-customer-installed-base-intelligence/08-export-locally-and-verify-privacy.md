# 08: Export locally and verify the privacy boundary

Type: Supporting Product Implementation and E6 Experiment

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Create the authoritative offline JSON Workspace Export and validate the exact same-computer, no-cloud, no-telemetry privacy claim on the selected topology.

## Scope

- Generate a versioned JSON Workspace Export through one explicit action while offline.
- Preserve stable references across customers/sites, visits/observations, original synthetic notes, Evidence Entries and answers, claims/scopes/statuses, asset records, relationships, conflicts, and reconciliation history.
- Validate the export against its versioned schema.
- Warn before export that later local deletion cannot alter existing export files.
- Ensure the application does not upload or transmit exports and implements no import or CRM compatibility.
- Complete the installed workflow without internet after dependencies and model artifacts are available.
- Inspect application network behavior for cloud inference, telemetry, automatic upload, hidden fallback, and non-loopback exposure.
- If the browser topology is selected, verify loopback-only binding, approved origins, and intended native-host shutdown behavior.
- Publish only the bounded privacy claim and the observed validation limits.

## Dependencies

Blocked by: `docs/tickets/philips-customer-installed-base-intelligence/06-show-working-view-verification-and-aggregates.md`.

## Implementation Boundaries Affected

- Workspace Core
- QVAC Adapter
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] Export succeeds through one explicit action with internet disconnected.
- [ ] Export JSON is schema-valid, versioned, and preserves every required stable relationship.
- [ ] Export performs no upload or transmission and provides no import path.
- [ ] The export warning accurately describes deletion limits.
- [ ] Real QVAC and workspace storage remain on the same computer throughout the tested workflow.
- [ ] Observed application traffic contains no cloud inference, telemetry, automatic upload, or hidden fallback.
- [ ] Any selected HTTP host binds only to loopback, rejects unapproved origins, and is not exposed on the LAN.
- [ ] Ordinary application logs contain no note or claim content.
- [ ] E6 reports the observation method and limits without claiming complete operating-system security.

## Required Tests or Evidence

- Export schema tests, referential-integrity checks, and synthetic example export.
- Disconnected real-QVAC workflow result.
- Network-observation record and selected-topology configuration evidence.
- Loopback/origin tests when applicable.
- Versioned E6 machine-readable result and Markdown privacy summary.

## Explicit Non-Goals

- Export import, synchronization, CRM ingestion, automatic upload, or external recipient workflow.
- Enterprise security, application authentication, encrypted database claims, or unlocked-device protection.
- Demonstrating export in the primary 4:30 walkthrough.
- General network or operating-system security certification.

## Completion Artifacts

- Versioned export schema and synthetic example export.
- Offline export behavior and validation tests.
- E6 results and bounded privacy documentation.
- Conditional native-host network configuration evidence.
