# Philips Customer Installed Base Intelligence with QVAC

**Current status: Both E4 feasibility attempts failed. Under the project owner's deadline exception, a provisional same-computer browser/Node prototype now demonstrates one narrow real-QVAC workflow. This does not mark E4 as passed, unblock Ticket 02, or establish submission readiness.**

## Run the emergency prototype

Prerequisites are the pinned Node/npm versions, installed dependencies, and the cached model documented in the E4 evidence.

```powershell
npm.cmd run reset
npm.cmd start
```

Open `http://127.0.0.1:4173` on the same laptop. Use the prefilled synthetic observation for the rehearsed path, review each Draft Claim, then explicitly link the repeated evidence to the suggested seeded record. The interface shows the customer equipment records, three verification items, and the limited aggregate dashboard.

```powershell
npm.cmd test
npm.cmd run smoke:demo
```

The smoke command invokes the real cached QVAC model and writes reviewable evidence to [demo-smoke.json](results/emergency/demo-smoke.json). See the [prototype report](results/emergency/PROTOTYPE_REPORT.md) and [deadline ADR](docs/adr/0006-use-time-constrained-browser-prototype.md) for the bounded result and limitations.

## Problem

Hospital equipment observations remain scattered across field employees' notes and memory. Incomplete, estimated, repeated, or contradictory reports can produce unreliable installed-base records without clear supporting evidence.

## Proposed solution

A private, offline-capable application will turn equipment observation notes into structured claims, preserve uncertainty and provenance, and suggest matches for human review without automatically merging ambiguous records. The hypothetical primary user is a field Account Manager / Sales Representative working in a single-user local workspace.

The prototype runs on the inspected Windows 11 laptop with Ryzen 5 8645HS, approximately 16 GB RAM, and RTX 4050 Laptop GPU with 6 GB VRAM. The deadline exception provisionally uses a responsive browser UI connected to a loopback-only Node host on that laptop. Mobile remains future work.

Verified asset records, provisional records, and reported totals are displayed separately. Verification uses explicitly trusted fictional seed references and does not prove real-world identity or current installation. The MVP supports local history, the same user's next visit, and structured export; it does not replace complete visit notes or provide cross-device synchronization or CRM ingestion.

## Mandatory local inference

All evaluated AI inference must use a pinned, tested `@qvac/sdk` version on the same physical computer that holds the workspace. Cloud and delegated inference are excluded. The core workflow must work without internet access after dependencies and models are installed.

A web interface must identify where QVAC executes: both browser and native QVAC host run on the workspace computer. This is not browser-local inference. Peer model downloads are distinct from peer inference.

Initial [platform research](docs/references/QVAC_PLATFORM_RESEARCH.md) found that official [QVAC v0.19.0 release notes](https://docs.qvac.tether.io/reference/release-notes/#delegated-inference-removed) remove delegated inference. The MVP excludes delegation and will not downgrade the SDK to restore it; the exact tested release will be recorded during the approved spike.

The original E4 spike failed its structured-output and latency gates, and E4-v2 stopped at its mandatory model-fit gate. Those results remain authoritative. The emergency prototype evidence is a one-case demonstration smoke test, not a replacement feasibility evaluation.

Original notes are saved before inference. The emergency slice preserves a note when extraction fails; retry, human-authored manual recovery, and clarification-answer processing remain deferred.

QVAC-generated claims remain drafts until explicit review and never affect customer views or aggregates beforehand. The prototype accepts fictional demonstration data only, includes no application telemetry or automatic upload, and relies on the operating-system account for access. It does not claim enterprise authentication, encrypted storage, or production security.

The accepted specification defines offline JSON export and observation deletion, but the emergency slice defers both workflows.

## Authoritative plan

Read the [Official Project Plan](docs/OFFICIAL_PROJECT_PLAN.md) before planning or implementation. The accepted specification and tickets remain the delivery baseline, subject to the recorded emergency owner exception.

The [grilling record](docs/GRILLING_RECORD.md) tracks decisions, assumptions, and validation work. [CONTEXT.md](CONTEXT.md) records domain terminology. The [original challenge reference](docs/references/PHILIPS_CHALLENGE_BRIEF.docx) is preserved unchanged, with its source boundaries documented in [reference notes](docs/references/README.md).

The [compliance matrix](docs/COMPLIANCE_MATRIX.md) separates the stored Philips brief, user-provided Track 01 text, and unverified general submission commitments. The first executable implementation work remains E4 after a specification and first ticket exist; platform-dependent work waits for the measured post-E4 ADR.
