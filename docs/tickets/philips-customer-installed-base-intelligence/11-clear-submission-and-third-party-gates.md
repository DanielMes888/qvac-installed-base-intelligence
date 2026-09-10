# 11: Clear submission-authority and third-party gates

Type: E8 and E10 Release and Compliance Gate

Status: blocked

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

## Objective

Separate authoritative organizer requirements from project commitments and ensure every required or distributed third-party component has a documented, reviewable licensing and notice status before release.

## Scope

- Project owner supplies the E8 event identity, organizer URL or official email, Track 01 source, general rules, deadline/timezone, portal, repository access, video format/duration, license, QVAC/runtime, metrics/disclosures, and rubric.
- Preserve exact source files or stable URLs with access dates.
- Map each mandatory rule to its source, exact section, project evidence, and verification status.
- Keep the five-minute video, public repository, license, metrics, disclosure, deadline, SDK-interface, and rubric statements self-imposed or unverified until authoritative evidence supports them.
- Inventory the exact QVAC SDK/runtime, model/weights, npm dependencies, fonts, icons, images/assets, dataset sources, and relevant build/packaging tools selected by the completed product/evaluation work.
- Record version/revision, source, license/SPDX when available, use, redistribution, required notice, and review status.
- Verify the selected model license separately and avoid committing or redistributing weights without clear permission and necessity.
- Replace, remove, or acquisition-exclude unclear or incompatible components.

## Dependencies

Blocked by:

- `docs/tickets/philips-customer-installed-base-intelligence/07-protect-work-across-interruption-and-deletion.md`
- `docs/tickets/philips-customer-installed-base-intelligence/08-export-locally-and-verify-privacy.md`
- `docs/tickets/philips-customer-installed-base-intelligence/09-freeze-and-score-synthetic-evaluation.md`
- `docs/tickets/philips-customer-installed-base-intelligence/10-run-workflow-effort-and-incentive-experiments.md`
- Project-owner delivery of authoritative E8 sources

E8 source gathering may occur earlier, but this gate cannot complete until the dependency and model inventory is stable.

## Implementation Boundaries Affected

- QVAC Adapter
- Platform Shell
- Synthetic Data and Evaluation Tools

## Acceptance Criteria

- [ ] Every claimed mandatory competition rule has an authoritative source, exact section, matching project evidence, and status, or remains explicitly unverified.
- [ ] No Philips process, deadline, portal, format, license, SDK, metric, disclosure, or rubric rule is invented.
- [ ] Every required/distributed component has complete version, source, license, use, redistribution, notice, and review fields.
- [ ] The selected model has exact revision, checksum, size, license, acquisition command, quantization, and runtime configuration.
- [ ] Model weights are not committed or redistributed without documented permission and need.
- [ ] Every unclear or incompatible component is replaced, removed, or excluded with acquisition instructions.
- [ ] Apache-2.0 remains the repository license unless an authoritative rule requires a compatible recorded change.
- [ ] Project-owner review is recorded without presenting the inventory as legal advice.

## Required Tests or Evidence

- Source-to-requirement compliance-matrix review.
- Dependency and asset inventory generated from the release candidate and checked against lock/configuration records.
- License/notice presence checks for redistributed artifacts.
- Model checksum and acquisition-instruction verification.

## Explicit Non-Goals

- Legal advice or a guarantee of license compliance.
- Inventing missing organizer requirements.
- Adding integrations, analytics, or UI to satisfy unsupported rubric assumptions.
- Committing model weights, credentials, caches, or real data.

## Completion Artifacts

- Updated compliance matrix with authoritative source status.
- Third-party inventory and required notice files.
- Selected-model license and acquisition record.
- List of replacements, removals, exclusions, and remaining blockers.
