# Philips Customer Installed Base Intelligence with QVAC

**Current status: The technical specification was accepted and 12 local delivery tickets were published on 2026-09-10. Ticket 01, E4, is the only ready executable gate; platform-dependent implementation remains blocked until the post-E4 ADR. Competition compliance and submission readiness remain unverified.**

## Problem

Hospital equipment observations remain scattered across field employees' notes and memory. Incomplete, estimated, repeated, or contradictory reports can produce unreliable installed-base records without clear supporting evidence.

## Proposed solution

A private, offline-capable application will turn equipment observation notes into structured claims, preserve uncertainty and provenance, and suggest matches for human review without automatically merging ambiguous records. The hypothetical primary user is a field Account Manager / Sales Representative working in a single-user local workspace.

The first spike targets the inspected Windows 11 laptop with Ryzen 5 8645HS, approximately 16 GB RAM, and RTX 4050 Laptop GPU with 6 GB VRAM. A minimal local QVAC harness must verify prerequisites, actual backend, and offline feasibility before choosing Electron or a browser UI connected to a same-computer native QVAC host. Prefer the least setup and packaging friction compatible with reliable offline capture. Mobile is future work; no UI stack or working GPU acceleration is yet established.

Verified asset records, provisional records, and reported totals are displayed separately. Verification uses explicitly trusted fictional seed references and does not prove real-world identity or current installation. The MVP supports local history, the same user's next visit, and structured export; it does not replace complete visit notes or provide cross-device synchronization or CRM ingestion.

## Mandatory local inference

All evaluated AI inference must use a pinned, tested `@qvac/sdk` version on the same physical computer that holds the workspace. Cloud and delegated inference are excluded. The core workflow must work without internet access after dependencies and models are installed.

A web interface must identify where QVAC executes: both browser and native QVAC host run on the workspace computer. This is not browser-local inference. Peer model downloads are distinct from peer inference.

Initial [platform research](docs/references/QVAC_PLATFORM_RESEARCH.md) found that official [QVAC v0.19.0 release notes](https://docs.qvac.tether.io/reference/release-notes/#delegated-inference-removed) remove delegated inference. The MVP excludes delegation and will not downgrade the SDK to restore it; the exact tested release will be recorded during the approved spike.

The spike is limited to three hours of active implementation effort, with downloads and total elapsed time separately recorded. Its twenty predefined offline notes must meet the gates in the official plan, including 20/20 schema-valid outputs after at most one controlled retry and extraction within 15 seconds including retries for at least 19/20 notes. Factual quality is inspected separately. Codex implements and records results; the project owner handles device interaction and reviews findings. Execution waits for the later approved spike ticket.

Original notes are saved before inference. Failed extraction preserves the note and offers retry or human-authored manual recovery, which is not counted as AI success. A capture asks at most one materially useful follow-up, selected by application rules and phrased by QVAC, with skip and I don't know options.

QVAC-generated claims remain drafts until explicit review and never affect customer views or aggregates beforehand. The prototype accepts fictional demonstration data only, includes no application telemetry or automatic upload, and relies on the operating-system account for access. It does not claim enterprise authentication, encrypted storage, or production security.

An explicit action creates a versioned JSON workspace export locally while offline; the app does not transmit or import it or claim CRM compatibility. Explicit observation deletion removes exclusively dependent application-managed content and recalculates views, but cannot remove previous exports, external copies, operating-system backups, or forensic remnants.

## Authoritative plan

Read the [Official Project Plan](docs/OFFICIAL_PROJECT_PLAN.md) before planning or implementation. This repository currently contains planning and development-workflow setup only; application scaffolding and implementation have not started.

The [grilling record](docs/GRILLING_RECORD.md) tracks decisions, assumptions, and validation work. [CONTEXT.md](CONTEXT.md) records domain terminology. The [original challenge reference](docs/references/PHILIPS_CHALLENGE_BRIEF.docx) is preserved unchanged, with its source boundaries documented in [reference notes](docs/references/README.md).

The [compliance matrix](docs/COMPLIANCE_MATRIX.md) separates the stored Philips brief, user-provided Track 01 text, and unverified general submission commitments. The first executable implementation work remains E4 after a specification and first ticket exist; platform-dependent work waits for the measured post-E4 ADR.
