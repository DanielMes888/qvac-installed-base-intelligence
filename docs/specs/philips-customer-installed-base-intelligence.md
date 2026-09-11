# Philips Customer Installed Base Intelligence Prototype

Status: ready

Review state: Explicitly accepted by the project owner on 2026-09-10. Acceptance authorizes ticket publication but does not by itself authorize execution of a ticket.

## Authority Labels

This specification uses five authority labels:

- **Verified requirement**: supported by the stored Philips challenge brief.
- **User-provided organizer text**: supplied by the project owner as Track 01 text but not yet backed by an exact organizer source in the repository.
- **Project decision**: a deliberate MVP commitment settled during grilling, in an ADR, or in the project-owner pre-ticket review.
- **Assumption**: plausible but unvalidated in Philips' operational environment.
- **Experiment**: a question that must be resolved empirically under a named E1-E10 contract.

Requirement classifications are separate from authority. They are **E4 Gate**, **Winning-demo MVP**, **Supporting MVP**, **Submission/Reproducibility**, **Experiment**, and **Deferred**.

## Problem Statement

**Verified requirement:** Customer-facing employees collect knowledge about medical equipment during hospital visits, but useful information can remain in notes, conversations, or memory. The stored challenge brief calls for conversational capture, structured extraction and storage, incomplete-information handling, a customer-level installed-base view, basic cross-customer aggregation, and synthetic demonstration data that excludes confidential customer and real competitive information.

**Assumption:** The MVP's primary user is a hypothetical Field Account Manager / Sales Representative who creates an Equipment Observation Note after a visit. No Philips employee or healthcare sales representative has validated the capture timing, existing CRM process, reporting obligations, governance owner, or willingness to create a separate equipment note.

The narrative may describe multiple equipment groups and mix direct observations, attributed or unattributed statements, approximations, reported totals, historical facts, and incomplete identity information. The user may lack serial numbers, complete inventory coverage, exact dates, and evidence that repeated descriptions concern the same physical unit.

Treating every equipment mention as a new asset creates false precision and duplicate growth. Treating the newest statement as truth can conceal conflict or real change. Treating a reviewed extraction as factual confirmation confuses semantic review with verification. Sending the note to cloud inference would violate the repository rules and the user-provided Track 01 text.

The prototype must convert narrative into useful structured evidence while preserving what the evidence does and does not establish. Its Installed-Base Working View is a local evidence-backed view. It is not Philips' official inventory, an audited statement of currently installed equipment, or a production system of record.

## Solution

**Project decision:** Build a single-user, single-device local workspace using fully fictional demonstration data. The user selects a fictional hospital and enters an Equipment Observation Note. The application persists the original Observation before invoking a real `@qvac/sdk` adapter on the same computer.

QVAC performs the semantic transformation from narrative into candidate Atomic Scoped Claims, including subjects, groups, values, Quantity Scope, Location Scope, Information Source, Certainty Status, supporting excerpts, attachments, and ambiguity candidates. Deterministic application logic validates structures, chooses at most one material ambiguity, manages state, and prevents unchecked Draft Claims from affecting the Installed-Base Working View.

When clarification is warranted, QVAC phrases one question. A substantive answer becomes a separate attributed and dated Evidence Entry and triggers one additional real-QVAC extraction using the original note plus that clarification evidence. Further questions are disabled during this second extraction. Its Draft Claim set supersedes the initial set without deleting Extraction Attempt metadata. A skipped or "I don't know" answer ends clarification without another inference call. The user explicitly reviews the final Draft Claims before reconciliation.

Reconciliation can provisionally link evidence, create a separate Provisional Individual Asset, reject a proposed relationship, or leave it unresolved. Ambiguous records are never merged automatically. The workspace then presents customer history, separately labeled asset/evidence categories, Reported Totals, conflicts, the three highest-priority Open Verification Items, and a limited aggregate dashboard.

The pre-measurement product claim is:

> The prototype is designed to reduce the effort required to convert equipment observations into structured evidence while preserving uncertainty and preventing automatic double-counting.

The pre-measurement differentiation claim is:

> The prototype combines local QVAC extraction with claim-level provenance, explicit uncertainty and scope, and conservative human-reviewed reconciliation.

## Scope Classification

| Major behavior | Classification | Delivery boundary |
| --- | --- | --- |
| Resolve runtime prerequisites; run real QVAC over 20 frozen notes; measure stability, validity, latency, offline behavior, and backend; compare candidate topology constraints | E4 Gate | First executable gate |
| Choose Electron or browser plus same-computer native host | E4 Gate | Post-E4 ADR; no topology is selected in this specification |
| Select a fictional customer, save an Observation, and perform initial real-QVAC extraction | Winning-demo MVP | Winning-demo seam |
| Display Atomic Scoped Draft Claims and one material clarification | Winning-demo MVP | Winning-demo seam |
| Save clarification evidence, optionally run the one permitted second extraction, and review final drafts | Winning-demo MVP | Winning-demo seam |
| Reconcile against existing evidence without automatic merge or duplicate growth | Winning-demo MVP | Winning-demo seam |
| Show the customer working view, top Verification Items, and limited aggregate dashboard | Winning-demo MVP | Winning-demo seam endpoint |
| Retry, manual recovery, restart, interruption, and stale-result protection | Supporting MVP | Complete supporting product seam; E5 validates it |
| Full Verification Item backlog and Open/Resolved/Dismissed lifecycle | Supporting MVP | Outside primary demo |
| Explicit Observation deletion and dependency-aware recalculation | Supporting MVP | Outside primary demo |
| Offline versioned JSON Workspace Export | Supporting MVP | Outside primary demo |
| Same-computer/offline/network-boundary validation | Experiment | E4 and E6 provide evidence; the demo shows the accepted result |
| Development, feasibility, and held-out extraction datasets and scoring | Experiment | E4 and E7 |
| Workflow fit, capture effort, and separate-note value | Experiment | E1-E3 |
| Organizer-rule verification, clean reproduction, and third-party review | Submission/Reproducibility | E8-E10 release gates |
| Mobile, synchronization, CRM integration, cloud/delegated inference, voice, OCR, and commercial analytics | Deferred | Explicit non-goals |

## Workflow Seams

### Winning-demo seam

The minimum winning flow is:

`save synthetic Observation -> initial real local QVAC extraction -> display Atomic Scoped Draft Claims -> select at most one ambiguity -> QVAC phrases one clarification -> save substantive answer as Evidence Entry -> optionally run one final real-QVAC extraction -> review final Draft Claims -> reconcile against existing evidence -> avoid duplicate record growth -> query customer working view -> show top Verification Items -> show limited aggregate dashboard`

The initial Draft Claims remain visible for inspection before clarification. Final accept, correct, reject, or unresolved decisions occur after clarification completes. If the user skips or selects "I don't know," the initial set becomes the final review set and no second extraction runs.

The winning-demo seam ends after the limited aggregate dashboard. Deletion and Workspace Export are not required in the primary 4:30 demonstration.

### Complete supporting product seam

The complete product seam includes the winning-demo seam and adds:

`retry/manual recovery -> interruption and stale-result protection -> full Verification Item lifecycle -> explicit Observation deletion -> offline versioned JSON Workspace Export`

These behaviors are implemented and validated after the winning slice. They must not delay the first coherent demonstration path unless they expose data loss or correctness defects in that path.

## User Stories

1. As a Field Account Manager / Sales Representative, I want to select a fictional hospital before capture, so that the Observation has explicit customer context.
2. As a Field Account Manager / Sales Representative, I want the capture prompt limited to medical equipment and accompanied by the prohibited-input warning, so that I do not mistake the prototype for a complete visit-note or real-data workflow.
3. As a Field Account Manager / Sales Representative, I want to describe multiple equipment groups in one short narrative, so that I avoid manually structuring every field before capture.
4. As a Field Account Manager / Sales Representative, I want my original Equipment Observation Note saved before inference starts, so that inference failure cannot lose my account of the visit.
5. As a Field Account Manager / Sales Representative, I want visible extraction status, so that I can distinguish work that has not started, is processing, succeeded, or failed.
6. As a Field Account Manager / Sales Representative, I want retry and manual structured entry after failure, so that a saved Observation remains usable.
7. As a Field Account Manager / Sales Representative, I want retries to reuse the same Observation, so that recovery cannot create duplicate observations.
8. As a Field Account Manager / Sales Representative, I want late results ignored after newer manual work or accepted evidence, so that a Stale Extraction Result cannot overwrite my changes.
9. As a Field Account Manager / Sales Representative, I want QVAC to convert a multi-equipment narrative into candidate Atomic Scoped Claims, so that fields remain attached to the correct subject or Observed Group.
10. As a Field Account Manager / Sales Representative, I want each Draft Claim displayed with its supporting excerpt, subject, scopes, Information Source, Certainty Status, and proposed relationship, so that I can inspect the interpretation.
11. As a Field Account Manager / Sales Representative, I want deterministic rules to select no more than one material ambiguity, so that clarification remains focused and bounded.
12. As a Field Account Manager / Sales Representative, I want QVAC to phrase the selected clarification, so that the question is natural without giving the model control of priority.
13. As a Field Account Manager / Sales Representative, I want to answer, skip, or select "I don't know," so that uncertainty does not block capture.
14. As a Field Account Manager / Sales Representative, I want a substantive answer saved as attributed and dated evidence and considered with the original note, so that the final interpretation has explicit provenance.
15. As a Field Account Manager / Sales Representative, I want clarification to allow at most one additional extraction with further questions disabled, so that the workflow cannot enter an inference loop.
16. As a Field Account Manager / Sales Representative, I want to accept, correct, reject, or leave each final Draft Claim unresolved, so that only reviewed evidence can affect the working view.
17. As a Field Account Manager / Sales Representative, I want Extraction Corrections and Revised Assertions preserved as distinct evidence, so that editing an interpretation is not confused with supplying a new fact.
18. As a Field Account Manager / Sales Representative, I want review to preserve the claim's Certainty Status, so that acceptance does not imply factual confirmation.
19. As a Field Account Manager / Sales Representative, I want manual structured entry recorded as Human-Authored Claims, so that recovery is not reported as QVAC success.
20. As a Field Account Manager / Sales Representative, I want trusted fictional reference matches labeled as Verified Individual Assets, so that the demonstration has an explicit bounded identity mechanism.
21. As a Field Account Manager / Sales Representative, I want distinguishable units without trusted identifiers labeled as Provisional Individual Assets, so that useful identity evidence is retained without overstating verification.
22. As a Field Account Manager / Sales Representative, I want insufficiently identifying evidence retained as an Unlinked Equipment Claim, so that the system does not manufacture a physical unit.
23. As a Field Account Manager / Sales Representative, I want facts about one unidentified member to stay attached to that member, so that age or location is not copied to an entire Observed Group.
24. As a Field Account Manager / Sales Representative, I want candidate record matches suggested without automatic merging, so that repeated observations do not inflate or corrupt the equipment view.
25. As a Field Account Manager / Sales Representative, I want extraction acceptance and Provisional Match Decisions to remain separate, so that semantic review does not establish physical identity.
26. As a Field Account Manager / Sales Representative, I want to provisionally link, create a separate provisional record, reject, or defer with an attributed reason, so that reconciliation remains explicit.
27. As a Field Account Manager / Sales Representative, I want unresolved observations excluded from record counts, so that evidence capture alone cannot create inventory growth.
28. As a Field Account Manager / Sales Representative, I want Observed Quantity, Reported Total, and unknown Quantity Scope treated separately, so that a partial walkthrough is not presented as complete inventory.
29. As a Field Account Manager / Sales Representative, I want a Reported Total created only from explicit completeness language or a clarification answer for a declared Location Scope, so that customer selection does not imply coverage.
30. As a Field Account Manager / Sales Representative, I want Count Discrepancies calculated only across comparable scope, modality, time, and count meaning, so that subtraction remains meaningful.
31. As a Field Account Manager / Sales Representative, I want conflicting and changing claims to retain their sources and dates, so that recency does not silently choose truth or retire equipment.
32. As a Field Account Manager / Sales Representative, I want prior customer evidence available before a future visit, so that I can prepare useful verification questions.
33. As a Field Account Manager / Sales Representative, I want verified records, provisional records, Unlinked Equipment Claims, and Reported Totals shown separately, so that the working view cannot be read as one audited inventory count.
34. As a Field Account Manager / Sales Representative, I want Reported Totals displayed with scope, source, date, and certainty, so that their evidential limits remain visible.
35. As a Field Account Manager / Sales Representative, I want the three highest-priority Open Verification Items shown first, so that I can focus on material issues.
36. As a Field Account Manager / Sales Representative, I want the full Verification Item backlog and its resolution or dismissal history available outside the primary demo, so that lower-priority work remains traceable.
37. As a Field Account Manager / Sales Representative, I want aggregates limited to evidence status, recency, conflicts, and verification work, so that the prototype does not invent commercial conclusions.
38. As an evaluator, I want the repeated three-scanner scenario to retain three verified records and one unresolved member-specific estimate, so that conservative reconciliation is directly visible.
39. As a project owner, I want real QVAC inference and workspace storage on the same computer and the installed workflow to operate without internet, so that the bounded local-execution claim can be demonstrated.
40. As a project owner, I want no cloud inference, telemetry, automatic upload, or note/claim content in ordinary logs, so that application behavior matches the privacy boundary.
41. As a project owner, I want a selected native HTTP host restricted to loopback and approved origins, so that the browser candidate does not expose the workspace on the LAN.
42. As a Field Account Manager / Sales Representative, I want one explicit offline action to create a versioned JSON Workspace Export with stable references and an export warning, so that evidence can be inspected without implying upload, import, or CRM compatibility.
43. As a Field Account Manager / Sales Representative, I want explicit Observation deletion to remove exclusively dependent application-managed content and recalculate views, so that accidentally sensitive input can be removed within the stated limits.
44. As an evaluator, I want every product and evidence artifact labeled "Synthetic demonstration data.", so that fictional records cannot be mistaken for real customer information.

## Implementation Decisions

### 1. E4 and platform authorization

- **Project decision:** E4 is the first executable gate. No application shell or other platform-dependent implementation is authorized before E4 completes and its ADR is explicitly accepted by the project owner.
- E4 targets the inspected Windows 11 laptop with Ryzen 5 8645HS, approximately 16 GB RAM, and RTX 4050 Laptop GPU with 6 GB VRAM. It records actual available memory and the backend used; NVIDIA hardware does not prove GPU acceleration.
- Resolve documented Node, package-manager, runtime, and backend prerequisites. The inspected Node file version was 22.15.0 while the researched SDK documentation required at least 22.17; the runnable version remains unverified.
- Pin the tested SDK, model name/revision/checksum/license, quantization, prompt, schema, parameters, and backend.
- Freeze 20 representative E4 notes before the run. Do not tune the prompt per example.
- Run after dependencies and model artifacts are installed, then disconnect internet and repeat the required inference path.
- Record first-attempt and post-retry schema validity separately. Permit at most one controlled retry per note.
- Required gates are: no crashes; 20/20 terminal case records with schema-valid output after at most one retry; and warm end-to-end extraction, including retry, at most 15 seconds for at least 19/20 notes. Record cold load, typical latency, unsupported values, actual memory, and backend separately.
- For the E4 harness, **no lost notes** means every one of the 20 stable case IDs has its original synthetic input preserved in the versioned feasibility result and has a terminal Succeeded or Failed attempt record, even if model loading, inference, validation, or retry fails. This does not require the production workspace persistence layer during the spike.
- The bounded topology comparison evaluates only the evidence needed for the ADR: whether the tested native QVAC process can support an Electron main-process/IPC route and a loopback native-host route; expected startup and shutdown ownership; origin or IPC boundary; packaging prerequisites; and likely setup friction. Small connectivity probes and documentation checks are allowed. Full interface implementations are prohibited in E4.
- Timebox active implementation effort to three hours. Track dependency/model downloads separately and report total elapsed time. On a failed gate, stop and report the blocker and smallest proposed model, runtime, or platform change. Do not silently relax thresholds or tune indefinitely.
- The post-E4 ADR selects Electron or browser plus same-computer native host, the viable model/runtime approach, and the measured rationale. If evidence is insufficient, it records no selection and proposes only a separately approved bounded follow-up.

### 2. Four implementation boundaries

These boundaries describe ownership of behavior. They do not require separate packages, processes, repositories, services, or dependency-injection infrastructure.

1. **Workspace Core** owns Observation and Evidence Entry persistence, Extraction Attempt and Observation Revision state, validation, clarification priority, review decisions, reconciliation, Installed-Base Working View calculations, Verification Items, deletion, and Workspace Export. Its internal responsibilities should remain cohesive implementation details unless a concrete need justifies a seam.
2. **QVAC Adapter** is the single semantic-extraction boundary. The real adapter calls pinned `@qvac/sdk` on the workspace computer. A controlled adapter supplies deterministic workflow outcomes in tests. Both use the same request/result contract.
3. **Platform Shell** presents capture, review, reconciliation, customer views, aggregates, and supporting actions through the Workspace Core. Its technology, startup, packaging, and local communication details remain blocked until the post-E4 ADR.
4. **Synthetic Data and Evaluation Tools** create or load the fictional universe, freeze dataset manifests/checksums, run scoring, and publish experiment results. They do not provide hidden application output or a substitute extraction path.

### 3. Real and controlled QVAC behavior

- All evaluated AI inference uses the real QVAC Adapter and a pinned `@qvac/sdk` on the same computer as the workspace.
- QVAC owns semantic extraction of subjects, Observed Groups, modality, manufacturer, model, quantity value and scope, Location Scope, Information Source, Certainty Status, supporting excerpts, attachment, and ambiguity candidates. It also phrases the one deterministic-rule-selected clarification.
- Deterministic code validates schemas, enums, types, ranges, existing references, excerpt presence, scope requirements, and record relationships. It cannot prove semantic support and must not contain regex, keyword, or hard-coded demonstration extraction that competes with QVAC.
- The controlled adapter may return predetermined valid, invalid, delayed, failed, interrupted, or stale outcomes for tests. Controlled output cannot count toward E4, E6, E7, offline-QVAC proof, reported model metrics, or the primary demonstration.
- Ordinary Extraction Attempt diagnostics retain status, timing, retry count, model/configuration identity, and non-content error metadata. They do not retain invalid model content. Full inputs and outputs may be published only as explicitly labeled synthetic evaluation artifacts.
- Manual structured entry creates Human-Authored Claims and is reported separately from first-attempt and post-retry QVAC success.

### 4. Observation, clarification, and review lifecycle

- Persist a stable Observation ID, current Observation Revision, immutable original note, selected customer, author, and Recorded Time before initial inference. "Immutable" means edits create new evidence or revisions; explicit deletion remains governed by the deletion contract.
- Each Extraction Attempt has a stable attempt ID, Observation ID, Observation Revision, start time, configuration identity, and Processing, Succeeded, Failed, Interrupted, or Stale status.
- Initial real-QVAC extraction produces a Draft Claim set and ambiguity candidates.
- Deterministic logic selects zero or one material Clarification Target in this order: materially misleading quantity completeness, Location Scope, or claim attachment; identity information that distinguishes actual candidates; then explicitly useful optional manufacturer, model, or age information.
- QVAC phrases the selected question. If phrasing fails, use a short predefined question for the selected target or finish without a question.
- A substantive answer is a new attributed and dated Evidence Entry linked to the relevant claim context. Run at most one additional real-QVAC extraction over the original note plus clarification evidence with question generation disabled.
- The second successful extraction supersedes the first Draft Claim set for review. Earlier drafts cannot affect the working view or be appended as active duplicates. Preserve both Extraction Attempt metadata records.
- If the permitted second extraction fails or returns invalid output, preserve the original note and clarification Evidence Entry, record non-content failure metadata, and offer manual structured entry. Do not invoke QVAC again within that capture or admit the initial or invalid result as final reviewed evidence.
- Skip and "I don't know" end clarification without a second extraction. The initial Draft Claim set becomes the final review set with unresolved fields intact.
- The user explicitly accepts, corrects, rejects, or leaves each final Draft Claim unresolved. Only Accepted Claims and Human-Authored Claims affect the working view.
- An Extraction Correction points to the original excerpt and retains correction history. A Revised Assertion points to its new Evidence Entry. Changing a value does not alter Certainty Status without supporting evidence.
- Human review confirms interpretation only. It does not verify physical identity, upgrade certainty, or prove current installation.
- On startup, Processing attempts become Interrupted. A retry reuses the Observation and creates a new attempt. Apply a result only when it is the active attempt, matches the current Observation Revision, and has not been superseded by later manual or accepted work.
- Manual correction increments the current Observation Revision. Late results become Stale and cannot change claims, records, conflicts, Verification Items, views, or aggregates.
- Activate Accepted Claims and recalculate affected views in one transaction.

### 5. Claim, evidence, identity, and reconciliation contracts

An Atomic Scoped Claim preserves the applicable claim type, typed value, subject or group attachment, Quantity Scope, Location Scope, Information Source, Certainty Status, supporting Evidence Entry and excerpt, Recorded Time, explicit Effective Time when stated, and correction/supersession relationships.

Information Source values are direct observation, attributed staff statement, unattributed statement, existing authorized record, and supporting document or equipment label when available. Certainty Status values are Reported, Estimated, Confirmed, and Unknown. Source and certainty remain independent.

- A Verified Individual Asset is a unit whose identity matches a Trusted Fictional Reference in the seed. This verifies only the identity supported by that reference.
- Identifier syntax checks validate format and uniqueness checks detect local collisions. Neither proves physical identity. A newly entered identifier remains Reported and may support only a proposed relationship.
- A Provisional Individual Asset is distinguishable through contextual evidence but lacks trusted durable identity.
- An Unlinked Equipment Claim records equipment evidence without creating an individual unit.
- An Unidentified Member Claim can hold facts about one group member without copying them to the full Observed Group or arbitrarily attaching them to an asset.
- Candidate matching suggests relationships but never merges automatically. Default to unresolved when evidence is insufficient.
- Extraction acceptance and Provisional Match Decisions are separate actions. Provisional link, separate provisional record, rejection, and deferral record actor, date, reason selector, and optional explanation. None verifies identity.
- Unresolved observations do not increase verified or provisional record counts.

### 6. Quantity, time, conflicts, working views, and verification

- Quantity Scope is observed, reported total, or unknown. A Reported Total requires explicit completeness language or a clarification answer. Customer selection supplies context, not completeness.
- Location Scope is independent. Preserve customer, site/campus, department, room, or unresolved scope only as supported.
- Calculate a Count Discrepancy only when customer, site/campus, applicable organization/department, modality, relevant time basis, and count meaning are comparable. A discrepancy does not prove a missing asset.
- Display incompatible values separately with scope unresolved. Never subtract them.
- Preserve Recorded Time and explicit Effective Time. Do not invent an effective date.
- Use Potential Conflict for incompatible claims over a comparable scope/period, Possible Change for differing values across time without sufficient explanation, and Reported Change or Correction when the source explains the transition or correction.
- Recency alone cannot choose truth, dismiss a conflict, retire equipment, or prove current installation. Preserve history when an explicit correction or change supersedes the current working state.
- Display approximate age with its evidence date; ordinary aging alone is not a conflict.
- Display verified asset-record counts, provisional-record counts, Unlinked Equipment Claim counts, and Reported Totals separately.
- Display Reported Totals by customer and declared scope with source, date, and certainty. Do not sum them across customers or combine them with asset-record counts.
- Allowed aggregates are verified and provisional record counts shown separately, Unlinked Equipment Claim and Observation counts, Verification Item and conflict counts, Certainty Status distribution, and observation recency.
- Do not calculate market share, replacement opportunity, revenue, equipment value, missing-asset totals, sales probability, or a unified inventory total.
- Create Verification Items only when resolution could materially change the view, prevent duplicate provisional records, or improve identification. Priority is conflicts/comparable discrepancies; duplicate-risk matches; unknown scope or attachment; distinguishing identity; then explicitly useful optional information.
- Show the selected customer's three highest-priority Open items in the winning demo. The supporting seam exposes the full backlog.
- Resolved requires linked evidence or an explicit reconciliation decision. Dismissed records actor, date, and reason without implying verification or deleting history. New evidence may reopen or create a related item.

### 7. Privacy, deletion, and export

The exact bounded privacy claim is:

> All application AI inference and workspace storage remain on the same computer. The application sends no observations to cloud inference services and includes no application telemetry.

- Rely on the operating-system user account for MVP access control. Do not claim enterprise authentication, multi-user authorization, database encryption, unlocked-device protection, production security, backup erasure, or forensic deletion.
- Make no cloud inference calls, telemetry calls, automatic uploads, or hidden network fallback. Ordinary logs exclude note and claim content.
- If the browser topology is selected, bind the native host to loopback only, never `0.0.0.0` or a LAN interface; restrict accepted origins to the local application and shut down the host with the application where feasible.
- Before capture display: "Use fictional demonstration data only. Do not enter patient information, confidential customer data, or real competitive information." The application does not claim automatic sensitive-data detection.
- Explicit Observation deletion removes the original note and every application-managed Evidence Entry, follow-up answer, Draft or Accepted Claim, reconciliation link, and conflict that depends exclusively on it, then recalculates affected views. Preserve independently supported shared records.
- A content-free Deletion Marker may retain only random Observation ID, deletion timestamp, and deletion action. It contains no original text, excerpt, value, or content hash.
- Deletion does not claim removal from previous exports, external copies, operating-system backups, or forensic remnants.
- One explicit action creates a versioned JSON Workspace Export locally while offline. It includes schema version, export ID/time, customers/sites, visits/observations, original synthetic notes, Evidence Entries and answers, claims/statuses/scopes, asset records, proposed and accepted relationships, conflicts, and reconciliation history with stable references.
- Warn that later local deletion cannot alter existing exports. The MVP provides no upload, transmission, import, synchronization, or CRM-compatibility claim.

### 8. Synthetic universe and evaluation data

- Use fictional hospitals, healthcare organizations, manufacturers, models, identifiers, staff, countries, cities, campuses, departments, rooms, observations, and histories. Generic modalities such as MRI, CT, ultrasound, and patient monitoring may be real terms.
- Use DemoScan Technologies or another clearly fictional manufacturer in canonical examples. Do not use real logos or manufacturer product images.
- Display "Synthetic demonstration data." on every application screen, export, screenshot, evaluation result, and demonstration.
- Application seed target: 6 fictional hospitals, 25-30 verified/provisional/grouped equipment records, and 40 historical observations. The seed demonstrates views and reconciliation and is excluded from extraction scoring. Under schedule pressure, reduce historical observations before reducing the 30-note Held-Out Evaluation Set; record the final seed count.
- Development set: 15 labeled notes available for schema, prompt, and parser iteration.
- E4 set: 20 labeled notes frozen before the feasibility run. It is not the final accuracy evaluation.
- Held-Out Evaluation Set: 30 labeled notes frozen before final prompt tuning and not inspected until the final run.
- Every record has a stable ID, explicit partition, and dataset-generation version. Evaluation partitions have manifests and SHA-256 checksums.
- Prevent exact cases and close paraphrases across development, E4, and held-out partitions.
- Publish held-out inputs and Gold Annotations after evaluation. Preserve the first run. Disclose any defect-driven rerun or use a new untouched version; never tune on failures and label the rerun held-out.

### 9. Demonstration contract

Target approximately 4 minutes 30 seconds:

| Time | Demonstration content |
| --- | --- |
| 0:00-0:25 | Challenge and bounded product claim |
| 0:25-0:40 | Visible synthetic-data label, disconnected internet, and declared laptop/model/runtime |
| 0:40-1:20 | Enter one previously unseen DemoScan narrative describing three scanners and one unidentified member |
| 1:20-2:05 | Show real-QVAC Draft Claims, excerpts, attachment, certainty, and one quantity-scope clarification |
| 2:05-2:55 | Review final drafts and reconcile without turning three verified records into six |
| 2:55-3:35 | Show the customer working view and three highest-priority Open Verification Items |
| 3:35-3:55 | Show the limited aggregate dashboard |
| 3:55-4:30 | Show measured extraction, latency, offline evidence, and repository reproduction path |

The primary capture uses real QVAC on previously unseen text. It produces multiple Atomic Scoped Draft Claims and requires less manual field entry than the equivalent form. Controlled or precomputed output and manual recovery cannot substitute for successful QVAC inference. Keep the synthetic-data label visible. Validate export, deletion, interruption, manual recovery, and full evaluation outside the primary walkthrough.

### 10. Repository and licensing evidence

- Commit source, lockfile, runtime declaration, secret-free configuration, prompts/version, schemas and validation rules, database schema/migrations, synthetic seed or generator/reset, dataset manifests/checksums, annotation guide, scoring tools, frozen held-out inputs/gold after evaluation, versioned results/summaries, synthetic export/schema, exact commands, environment/model metadata, known limits, rerun history, and third-party notices.
- Do not commit model weights, runtime databases, temporary logs, caches, build output, credentials, secrets, private data, or real customer/competitive information.
- For the selected model, record exact name, revision, source, checksum, download size, license, acquisition command, quantization, and runtime configuration.
- Preserve Apache-2.0 as the repository license unless an authoritative rule requires a compatible recorded change.
- E10 is a component review, not a legal conclusion. Replace, remove, or acquisition-exclude unclear or incompatible components.
- If E9 runs only on the development laptop, publish exactly: "Reproduction was validated from a clean repository directory on the development laptop. Portability to another machine remains unverified."

## Testing Decisions

### Testing seam

Test external behavior through the Workspace Core workflow seam. Assertions cover saved evidence, visible draft/review state, clarification transitions, reconciliation outcomes, working views, deletion results, and export output rather than private methods or database queries.

Use the same QVAC Adapter contract for controlled and real execution. Controlled outcomes make schema failure, latency, interruption, stale completion, and deterministic claim scenarios reproducible. Real-adapter runs alone establish SDK operation, local inference, offline behavior, latency, and extraction quality.

After E4 and the accepted ADR, add at most one high-value Platform Shell smoke path covering the winning-demo workflow. This test is conditional on the selected topology and should not grow into broad UI automation during the hackathon.

The repository has no implementation test suite, so no code-level prior art exists. The grilling scenarios, ADRs, frozen dataset contracts, and demonstration sequence are the behavioral prior art.

### Experiment contracts

| ID | Owner | Timing | Inputs and method | Outputs and metrics | Failure consequence |
| --- | --- | --- | --- | --- | --- |
| **E1 - Workflow fit** | Project owner recruits, schedules, and approves the protocol; Codex prepares the synthetic protocol/template and analyzes. | After capture/review stabilizes and before final result freeze. | Map the stable prototype against one accessible field-sales or field-service professional's most recent visit. If unavailable, use at least three disclosed proxy users. Use synthetic cases only. | Capture moment, existing obligations, workflow mismatches, role, and practitioner/proxy status. One practitioner supports workflow feedback only. | Proxy-only results describe mechanics and hypotheses. Material mismatch narrows workflow claims. |
| **E2 - Capture effort** | Same division as E1. | Same session as E1. | Participants complete equivalent frozen synthetic cases through conversational and manual-form workflows with equal case count/difficulty, alternated order where possible, and separately timed inference. | Every raw time; median capture-through-review time; correction distribution/range/cases over two; completeness; abandoned/failed cases. Target median under 60 seconds and faster than the form. | If conversation is not faster, withdraw the faster-capture claim. Preserve unfavorable outcomes. |
| **E3 - Separate-note value** | Same division as E1. | During E1/E2. | Ask whether the equipment-only note adds work and whether the customer snapshot and Verification Items are useful. | Responses linked to role and practitioner/proxy status; useful-but-costly tradeoff recorded. | If participants would not create it, adoption remains an unvalidated hypothesis. Do not generalize small samples. |
| **E4 - Real-QVAC feasibility** | Codex implements the approved spike and records results; project owner performs local-device interaction and reviews. | First executable gate; three active implementation hours, download time separate, total elapsed reported. | Minimal pinned `@qvac/sdk` harness, 20 frozen notes, at most one retry, disconnected run after setup, and bounded candidate-topology assessment. | No lost notes as defined above; no crashes; 20/20 terminal cases with schema-valid output after at most one retry; first/post-retry rates; warm extraction including retry at most 15 seconds for at least 19/20; cold load, backend, memory, latency distribution, and unsupported values. | Stop and report the concrete blocker and smallest change. No threshold relaxation, indefinite tuning, platform selection without evidence, or unapproved alternative spike. |
| **E5 - Interruption and stale-result safety** | Codex executes/records; project owner reviews. | After Workspace Core persistence and lifecycle exist. | Close during inference and reopen/retry; close/reopen and add manual claims before the old result finishes; retry twice after interruption. | Original text retained; exactly one Observation; manual edits intact; no duplicate claims; no stale result affects views or aggregates. | Failure blocks the recovery claim and requires the smallest revision/attempt correction. |
| **E6 - Offline/privacy boundary** | Codex records technical evidence; project owner performs and reviews rehearsal. | After topology selection and before final evidence freeze. | Disconnect after installation, complete the workflow, inspect application network activity, and inspect loopback/origins if the browser route is selected. | No observation sent to cloud inference; no telemetry/automatic upload; no non-loopback service exposure; method, limits, hardware, and configuration recorded. | Failure blocks or narrows the privacy/offline claim until fixed and rerun. Never claim complete operating-system security. |
| **E7 - Held-out extraction quality** | Project owner approves guide, Gold Annotations, ambiguities, and disputes; Codex prepares candidates, validates, scores, and reports without changing frozen gold. | After prompt/model configuration freeze. | Freeze guide, 30-note held-out set, gold, prompt/model/checksums; run once before inspecting failures. Include negation, wrong attachment, quotations/attribution, multiple groups, conditional/uncertain language, and wrong excerpts. | Atomic precision/recall/F1; essential-field, attachment, Quantity Scope, and certainty accuracy; unsupported-draft, omission, schema-valid, correction, and residual-reviewed-error rates with numerators/denominators. Gates: F1 minimum 85%, target 90%; listed accuracies at least 90%; unsupported drafts at most 5%; zero unsupported claims admitted after controlled review. | Publish failure without changing targets/gold. Gold changes invalidate affected results and require a labeled rerun. Do not generalize beyond the synthetic set. |
| **E8 - Submission-rule verification** | Project owner obtains authoritative sources; Codex updates and validates the matrix after receipt. | As soon as sources are available and before compliance/submission-ready claims. | Obtain event identity, organizer/Track/general rules, deadline/timezone, portal, repo/video/license/QVAC/metrics/disclosure requirements, and rubric with exact sources/access dates. | Every mandatory rule mapped to authoritative source, exact section, project evidence, and status. | Missing or contradictory authority keeps competition compliance and submission readiness unverified. Do not invent rules. |
| **E9 - Clean reproduction** | Codex executes commands, records/fixes in-scope defects, and produces machine-readable results; project owner handles OS/network steps and confirms. | On the release candidate. | Fresh task-specific checkout using tracked files/prerequisites; verify runtimes, lockfile install, model/seed checksums, startup, connected acquisition if needed, disconnected real-QVAC capture, deterministic tests, evaluation, export, reset, and demo rehearsal. Isolate or disclose caches. | Setup/install/download time, cache reuse, failures/fixes, final result, hardware/OS, and every documented command/check result. | Failure blocks reproducibility and final submission readiness. Same-laptop-only validation uses the exact limitation statement. |
| **E10 - Third-party/model licensing** | Codex inventories and flags uncertainty; project owner reviews. No legal conclusion is claimed. | As components are selected and before release. | Review QVAC SDK/runtime, model/weights, npm dependencies, fonts, icons, images/assets, dataset sources, and relevant build/packaging tools. | Exact version/revision, source, license/SPDX, use, redistribution, notice, and review status for every component; full selected-model metadata. | Replace, remove, or acquisition-exclude unclear/incompatible components. Unresolved affected components block release and submission readiness. |

### Extraction scoring contract

- Score QVAC predictions before user correction as Atomic Scoped Claims.
- A claim is correct only when every applicable claim type, value, subject/group attachment, Quantity Scope, Location Scope, Information Source, Certainty Status, and supporting evidence reference matches gold.
- Essential fields are modality, stated quantity, Quantity Scope, subject/group attachment, Information Source, and Certainty Status.
- Conditionally score manufacturer, model, location, age, serial, and asset identifier.
- Exclude user-selected customer identity from extraction accuracy.
- Report atomic precision, recall, F1, unsupported-draft rate, omitted-supported rate, and required field accuracies with numerator and denominator.
- Zero unsupported admission measures the review safeguard and cannot conceal QVAC's unsupported-draft rate.
- If no second reviewer participates, publish: "This evaluation uses synthetic ground truth approved by a single project reviewer. It measures performance on the published synthetic test set and does not establish accuracy in Philips' real operational environment."

## Product Acceptance Criteria

### Capture, extraction, clarification, and review

1. The selected fictional customer, original note, stable Observation ID, current Observation Revision, author, and Recorded Time are persisted before either QVAC Adapter is invoked.
2. Capture displays the equipment-only prompt and full prohibited-input warning.
3. Extraction status and non-content errors are visible without exposing note or claim content in ordinary diagnostics.
4. Retry reuses one Observation, creates a new Extraction Attempt, and prevents duplicate active Draft Claims.
5. Real QVAC returns schema-valid candidate subjects, Atomic Scoped Draft Claims, excerpts, attachments, scopes, source, certainty, and ambiguity candidates or a handled failure; controlled output is never represented as real-QVAC evidence.
6. Each review presentation shows claim, excerpt, subject/group, Quantity Scope, Location Scope, Information Source, Certainty Status, and proposed asset relationship together.
7. Deterministic logic selects zero or one material Clarification Target, and QVAC phrases only that target.
8. A substantive answer becomes a dated and attributed Evidence Entry and triggers at most one additional real-QVAC extraction using original plus clarification evidence with further questions disabled.
9. Skip or "I don't know" ends clarification without another inference call and preserves unresolved state.
10. A successful second extraction supersedes the initial Draft Claim set for final review while retaining both attempt metadata records and admitting neither set to the working view before review.
11. The user can accept, correct, reject, or leave every final Draft Claim unresolved; only Accepted and Human-Authored Claims affect the working view.
12. Extraction Corrections retain original support, Revised Assertions reference new evidence, and human review changes neither identity verification nor certainty without evidence.
13. Accepted claims and affected working views activate transactionally.

### Identity, reconciliation, quantity, and time

14. Only a Trusted Fictional Reference match creates verified identity; syntax, uniqueness, review, and repetition do not.
15. Provisional Individual Assets, Unlinked Equipment Claims, and Unidentified Member Claims retain their distinct meanings and do not imply verified units.
16. Candidate reconciliation never merges automatically and offers provisional link, separate provisional record, rejection, and deferral with actor/date/reason.
17. Extraction acceptance and Provisional Match Decisions are recorded separately, and unresolved evidence increases no asset-record count.
18. An Unidentified Member Claim remains attached to one unresolved member and is not copied to an Observed Group or arbitrary asset.
19. Observed Quantity, Reported Total, and unknown Quantity Scope remain distinct; a Reported Total requires explicit completeness and supported Location Scope.
20. Count Discrepancies are produced only for comparable customer, location/organization, modality, time, and meaning; incompatible scopes are displayed without subtraction.
21. Potential Conflict, Possible Change, and Reported Change or Correction preserve supporting evidence and time; recency alone changes no truth, lifecycle, or current-presence status.

### Working views and winning demonstration

22. The customer view labels verified records, provisional records, Unlinked Equipment Claims, and Reported Totals separately and never presents one authoritative installed count.
23. Reported Totals display scope, source, date, and certainty and are not combined across customers or with record counts.
24. Verification Items are created only for material issues and ordered by the settled deterministic priority.
25. The selected customer view shows the three highest-priority Open Verification Items; the supporting seam exposes the complete backlog and lifecycle history.
26. Verification resolution requires evidence or reconciliation; dismissal retains actor/date/reason and does not imply verification.
27. The aggregate dashboard contains only allowed evidence/status/recency/conflict/verification metrics and no commercial or unified-inventory metric.
28. In the canonical three-scanner case, verified record count remains three, the new Observation remains available, and the approximate age remains attached to one unidentified member.
29. The primary demonstration follows the winning-demo seam with previously unseen text and real same-computer QVAC and ends after the limited aggregate dashboard.

### Supporting product behavior and data boundaries

30. Restart changes abandoned Processing attempts to Interrupted; old Observation Revision results become Stale and cannot affect any claim, record, conflict, Verification Item, view, or aggregate.
31. After dependencies/model installation, the accepted topology completes the workflow without internet, cloud inference, telemetry, automatic upload, or hidden fallback; ordinary logs exclude note and claim content.
32. If selected, the native HTTP host binds only to loopback, restricts origins, and is not exposed on the LAN.
33. Every application screen, export, screenshot, evaluation result, and demonstration displays "Synthetic demonstration data.", and all named entities remain within the fictional universe.
34. One explicit offline action creates schema-valid versioned JSON with stable references for every required Workspace Export record family and warns about later deletion.
35. Explicit deletion removes exclusively dependent application-managed content, recalculates affected views, preserves independently supported records, and retains at most the permitted content-free Deletion Marker.
36. Deletion and export messages accurately state limits for previous exports, external copies, operating-system backups, and forensic recovery.

## Experiment and Readiness Gates

These gates validate claims and release states. They are not additional product behaviors and must not be expanded into application features.

- **Specification gate:** Passed on 2026-09-10 through explicit project-owner acceptance. The accepted specification is `ready` for local ticket publication.
- **E4 implementation gate:** E4 is the first executable gate. Platform Shell implementation and every platform-dependent ticket remain blocked until an accepted post-E4 ADR exists.
- **Winning-demo gate:** Product Acceptance Criteria 1-2 and 5-29 pass on the selected platform. Retry-specific criteria 3-4 belong to the supporting product seam. The primary capture uses real QVAC; manual recovery and controlled output cannot substitute.
- **Recovery-claim gate:** E5 must pass before claiming interruption/retry/stale-result resilience.
- **Privacy-claim gate:** E6 must pass before publishing the exact offline/privacy claim as observed behavior.
- **Extraction-quality gate:** E7 publishes measured outcomes even when targets fail. Failure narrows the claim; it does not permit hidden retuning or result removal.
- **Workflow/adoption-claim gate:** E1-E3 determine whether timing, usefulness, and adoption language can move beyond hypotheses.
- **Competition-compliance gate:** E8 must map authoritative organizer sources before any requirement is described as verified competition compliance.
- **Release gate:** E10 must clear required/distributed components, and E9 must pass from a clean directory before reproducibility or final submission readiness is claimed.

## Dated amendment for the official Stretch Goals

**Amendment recorded 2026-09-11:** the accepted base specification and its twelve published tickets remain historically valid. Their statuses and blocking edges do not change. E4 and E4-v2 remain failed, and the emergency implementation does not complete Tickets 03-06.

The stored Philips challenge brief identifies eight optional Stretch Goals. Repository evidence classifies conservative Duplicate detection, Data freshness, and the bounded AI follow-up question as implemented only within the emergency-prototype boundary. Confidence scoring is partial because the product has no explainable completeness, freshness, and independent-corroboration score. Voice capture, Photo-assisted capture, Natural-language analytics, and Opportunity identification are pending.

ADR 0007 records the owner's voluntary decision to attempt the five unfinished goals without making them Minimum Viable Prototype requirements. `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md` defines future implementation units, observable acceptance boundaries, feature-specific tests and smokes, feasibility stages for fully local OCR and transcription, and stop conditions. The owner approved that plan on 2026-09-11; this amendment still does not authorize implementation or ticket publication, and separate extension tickets are required.

For this extension, the earlier deferred classification is narrowed only for those five goals. Cross-device synchronization remains deferred. Prompt v9, the selected model and adapter, conservative reconciliation, same-computer processing, synthetic-only data, no cloud/delegated inference, no telemetry/automatic upload, and non-production limitations remain unchanged. Opportunity identification is limited to evidence-backed potential engagement signals and does not authorize market share, revenue, sales probability, purchase-intent, or replacement-as-fact claims.

Full manual regression and final rehearsal are deferred until the extension and UI/UX integration are complete. Every feature implementation still requires automated tests and a dedicated smoke. Clean reproduction, compliance authority, third-party review, and final-delivery readiness remain separate gates.

**Owner closure note, 2026-09-11:** the initial Confidence scoring weights are completeness 40, freshness 30, and independent corroboration 30, with deterministic subthresholds deferred to implementation. Multiple Draft Claims or human review from one Observation do not establish independent corroboration, and the score stays separate from certainty, verification priority, acceptance, and identity. Opportunity signals cannot assert purchase intent, clinical need, obsolescence, or recommendations. Analytics is read-only and uses a separate contract/prompt. Photo and voice media are temporary; only reviewed submitted text persists as an Observation with `photo-assisted` or `voice` provenance.

**Expected-output amendment, 2026-09-11:** Geographic Installed-Base Map is separately authorized as an optional experience listed under Expected Output, not as a ninth Stretch Goal or MVP requirement. The bounded implementation uses only synthetic region/country/city/customer data, local/offline assets, deterministic allowlisted aggregates, an accessible hierarchy equivalent to the schematic view, and navigation to Customer 360. It must expose unknown geographic granularity, preserve provenance/certainty/freshness, execute no QVAC inference, mutate no Equipment Record, and use no remote tiles, geocoding, external services, real Philips location, or invented precision.

## Out of Scope

- A validated Philips role, CRM process, service workflow, reporting obligation, installed-base owner, or data-steward handoff.
- Production deployment, enterprise authentication, multi-user authorization, encrypted workspace storage, device-management policy, backup erasure, forensic deletion, or a production-security claim.
- Shared accounts, cross-device synchronization, backend storage, automatic corporate visibility, CRM ingestion, or import.
- Cloud inference, delegated inference, LAN-hosted inference, SDK downgrade to restore delegation, or describing peer model download as peer inference.
- Mobile implementation in the MVP and browser-local inference claims.
- Automatic ambiguous merge, automatic provisional-record creation from unresolved evidence, or automatic asset lifecycle management.
- Treating extraction review, repeated agreement, identifier syntax, or local uniqueness as factual confirmation.
- Complete visit notes, commercial commitments, meeting summaries, service actions, patient information, or general customer discussions.
- Voice capture, transcription, photos, OCR, label scanning, natural-language analytics, or stale-data alerts before MVP completion.
- A general-purpose knowledge graph, full event-sourcing framework, service mesh, plugin architecture, or a module/package for every internal responsibility.
- CSV as the authoritative export, Workspace Export import, automatic upload, or claimed CRM compatibility.
- Market share, replacement opportunity, revenue, equipment value, missing-asset totals, sales probability, purchase intent, or a unified audited inventory count.
- Real hospital, employee, manufacturer, product, identifier, geography, installed-base, confidential, or competitive data and real company logos/product images.
- Claims of achieved speed, adoption, improved Philips accuracy/visibility, production readiness, or generalized real-world quality before supporting evidence.
- Invented competition requirements, deadlines, license rules, portals, formats, or judging criteria.

## Requirement Traceability Appendix

Every product story and Product Acceptance Criteria group maps through this table to a stored challenge requirement, settled decision, ADR, or named experiment.

| ID | Classification | Requirement group | Product stories | Product ACs | Authority and source |
| --- | --- | --- | --- | --- | --- |
| R-01 | Winning-demo MVP | Customer context, equipment-only narrative, and save-before-inference | 1-4 | 1-2 | Challenge brief: Conversational Data Capture and Minimum Viable Prototype; D1, D10, D19 |
| R-02 | Supporting MVP | Extraction status, retry, manual recovery, revisions, interruption, and stale results | 5-8 | 3-4, 30 | D19, D25, D26; E5 |
| R-03 | Winning-demo MVP | QVAC semantic extraction and inspectable Atomic Scoped Draft Claims | 9-10 | 5-6, 13 | Challenge brief: AI extraction and incomplete information; D9, D24, D32; ADR 0005; E7 |
| R-04 | Winning-demo MVP | One clarification, clarification evidence, and bounded second extraction | 11-15 | 7-10 | D20; project-owner pre-ticket revision decision 4 |
| R-05 | Winning-demo MVP | Final human review, correction provenance, certainty, and manual-entry distinction | 16-19 | 11-13 | D9, D15, D19, D24, D25, D32; ADR 0005 |
| R-06 | Winning-demo MVP | Verified, provisional, unlinked, and unidentified-member identity states | 20-23 | 14-15, 18 | D5, D7, D11; ADR 0001 |
| R-07 | Winning-demo MVP | Conservative candidate matching and explicit Provisional Match Decisions | 24-27 | 16-17 | D7, D12; ADR 0001 |
| R-08 | Winning-demo MVP | Quantity scope, comparable discrepancies, time, conflicts, and changes | 28-31 | 19-21 | D8, D13, D14; ADR 0001 |
| R-09 | Winning-demo MVP | Customer working view, Verification Items, limited aggregates, and canonical scenario | 32-38 | 22-29 | Challenge brief: Customer-Level View and Aggregation; D3, D4, D30, D31, D34, D35 |
| R-10 | Winning-demo MVP | Same-computer real QVAC and offline demonstration | 39 | 29, 31 | User-provided Track 01 text; D17, D18, D35; ADR 0003; E4, E6 |
| R-11 | Supporting MVP | No cloud/telemetry/content logs and conditional loopback boundary | 40-41 | 31-32 | D22; ADR 0003; E6 |
| R-12 | Supporting MVP | Offline versioned JSON Workspace Export and warning | 42 | 34, 36 | D23 |
| R-13 | Supporting MVP | Explicit deletion and bounded application-managed removal | 43 | 35-36 | D21; ADR 0004 |
| R-14 | Winning-demo MVP | Fully fictional universe and visible synthetic labeling | 2, 44 | 2, 33 | Challenge brief: synthetic-data requirement; D21, D26, D27 |
| R-15 | E4 Gate | Hardware/runtime feasibility and post-E4 topology decision | None | None | D16, D17, D18, D19, D41; ADR 0003; E4; project-owner pre-ticket decisions 3, 7, and 8 |
| R-16 | Experiment | Workflow, effort, recovery, privacy, and extraction validation | None | None | D35-D36; E1-E7 |
| R-17 | Submission/Reproducibility | Organizer authority, clean reproduction, and component licensing | None | None | D37-D40; E8-E10; compliance matrix |
| R-18 | Deferred | Excluded integrations, platforms, production controls, and stretch capabilities | None | None | D6, D10, D17, D18, D30, D39-D41; ADR 0002 and ADR 0003 |

## Preliminary Delivery Structure

This is an accepted planning structure, not a set of published tickets. Final ticket generation may adjust wording and acceptance details without changing the dependencies or settled scope unless the project owner approves a specification change.

1. **E4: Prove real local QVAC feasibility**
   - **Blocked by:** None.
   - **Delivers:** The frozen 20-note harness, exact measurements, stop decision, and bounded candidate-topology evidence.

2. **Select and approve the post-E4 topology**
   - **Blocked by:** 01.
   - **Delivers:** The ADR, topology-dependent specification update, and explicit project-owner decision.

3. **Capture a saved Observation and produce real-QVAC Draft Claims**
   - **Blocked by:** 02.
   - **Delivers:** Customer selection, persistent note capture, real extraction, structural validation, and inspectable Draft Claims through the selected shell.

4. **Clarify and review evidence safely**
   - **Blocked by:** 03.
   - **Delivers:** The bounded clarification lifecycle, final review, corrections, transactional activation, retry, and manual fallback.

5. **Reconcile repeated evidence without duplicate growth**
   - **Blocked by:** 04.
   - **Delivers:** The canonical three-scanner case, candidate relationships, explicit decisions, and unresolved member attachment.

6. **Show the customer view, Verification Items, and aggregate dashboard**
   - **Blocked by:** 05.
   - **Delivers:** The complete minimum winning-demo seam.

7. **Protect work across interruption and deletion**
   - **Blocked by:** 06.
   - **Delivers:** Revision/attempt recovery, stale-result exclusion, deletion recalculation, and E5 evidence.

8. **Export locally and verify the privacy boundary**
   - **Blocked by:** 06.
   - **Delivers:** Offline JSON export, warnings, conditional loopback safeguards, and E6 evidence.

9. **Freeze and score the synthetic evaluation**
   - **Blocked by:** 06.
   - **Delivers:** Final dataset partitions, manifests, Gold Annotations, scoring, E7 results, and limitations.

10. **Run workflow, effort, and incentive experiments**
    - **Blocked by:** 06.
    - **Delivers:** E1-E3 protocols, raw observations, measurements, and bounded claim updates.

11. **Clear submission-authority and third-party gates**
    - **Blocked by:** 07, 08, 09, and 10; also requires project-owner E8 sources.
    - **Delivers:** The completed compliance matrix and E10 component inventory without inventing organizer requirements.

12. **Reproduce and rehearse the release candidate**
    - **Blocked by:** 07, 08, 09, 10, and 11.
    - **Delivers:** E9, final repository evidence, and the rehearsed 4:30 demonstration.

## Further Notes

### Requirement authority

| Area | Classification | Current source and limit |
| --- | --- | --- |
| Installed-base problem, conversational capture, structured extraction/storage, incomplete information, customer view, and basic aggregation | Verified requirement | Stored Philips challenge brief; it does not validate the selected persona or workflow |
| Synthetic data and exclusion of confidential customer and real competitive information | Verified requirement | Stored Philips challenge brief; the project adopts a stricter fully fictional universe |
| QVAC on-device or permitted peer execution, cloud disqualification, and interface flexibility | User-provided organizer text | Exact organizer source remains absent; the project selects same-computer/no-delegation/no-cloud behavior |
| Mandatory `@qvac/sdk` and same-computer execution | Project decision | Repository rules and ADR 0003; runnable compatibility awaits E4 |
| Video, public repository, permissive license, structured results, disclosures, deadline/portal, SDK-interface rule, and rubric | Assumption or self-imposed commitment | E8 must verify them before they are called competition rules |

### Evidence publication layout

- Feasibility results: `results/feasibility/`.
- Extraction results: `results/evaluation/`.
- Workflow and effort results: `results/usability/`.
- Clean-reproduction results: `results/reproduction/`.
- Human-readable evidence: `docs/EVALUATION.md`, `docs/REPRODUCIBILITY.md`, `docs/PRIVACY_AND_QVAC.md`, `docs/THIRD_PARTY_INVENTORY.md`, `docs/DEMO_SCRIPT.md`, and `docs/COMPLIANCE_MATRIX.md` when evidence exists.
- Published evidence is version-controlled JSON or CSV with Markdown summaries where appropriate. Ignored runtime logs are not publication evidence.

### Remaining assumptions and unresolved decisions

- The hypothetical field persona and post-visit timing fit a real workflow; E1 tests this.
- The local history, customer snapshot, Verification Items, and export justify a separate Equipment Observation Note; E2-E3 test this.
- Philips' installed-base governance owner and production integration process remain unknown and outside MVP scope.
- The inspected laptop can support a suitable real-QVAC configuration; E4 decides this.
- Electron versus browser plus same-computer native host, exact SDK/model/runtime/backend, persistence implementation, startup, packaging, and conditional UI smoke details remain unresolved until the post-E4 ADR.
- The selected platform satisfies the bounded offline/privacy claim; E6 tests this.
- Synthetic Gold Annotations approved by one owner are adequate for the bounded evaluation but do not establish real Philips accuracy; E7 measures only the published synthetic set.
- Exact organizer rules, submission deadline/portal, video/repository/license requirements, metrics, disclosures, and rubric remain unverified until E8.

### Readiness

- Project-owner acceptance: **recorded on 2026-09-10**.
- `$to-tickets` publication: **completed locally on 2026-09-10**.
- Ready to execute E4: **Ticket 01 is ready but has not been started; ticket publication does not start execution**.
- Ready for Platform Shell or other platform-dependent implementation: **no, until E4 and the accepted post-E4 ADR**.
- Ready for full implementation: **no, until the ADR and affected specification/tickets are accepted**.
- Ready for competition compliance or submission: **no, until E8-E10 and required implementation/evaluation evidence pass**.
