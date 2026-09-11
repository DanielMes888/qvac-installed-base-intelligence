# Official Project Plan

## Philips Customer Installed Base Intelligence with QVAC

**Status:** The technical specification was explicitly accepted and 12 local delivery tickets were published on 2026-09-10. E4 and E4-v2 both failed. The project owner subsequently authorized the bounded browser/Node emergency prototype in ADR 0006 for the deadline; it does not pass E4, complete Tickets 03–06, or authorize their full scope. Competition compliance and final submission readiness remain unverified.

**Purpose:** Define what we will build, why it creates value, how it will work, how it will be evaluated, and what the demo will show.

This product plan incorporates the settled decisions from eight grilling rounds and the platform clarifications. Assigned experiments may remain unexecuted when their outcomes are recorded as conditional gates rather than silently assumed results. The [original challenge brief](references/PHILIPS_CHALLENGE_BRIEF.docx) supports the product mission, while [reference notes](references/README.md) distinguish its requirements from additional project commitments.

---

## 1. Executive Summary

We will build a private, offline-capable application that lets a hypothetical field Account Manager / Sales Representative capture an equipment observation note immediately after a hospital visit. It is a single-user local workspace on the inspected Windows laptop; choose between a same-computer browser UI/native QVAC host and Electron after the spike. Mobile remains a future option.

All evaluated AI inference will use `@qvac/sdk` on the same physical computer that holds the local workspace. Cloud and delegated inference are excluded. The application will preserve the source, dates, supporting text, and uncertainty of every claim and compare new evidence with existing records before updating the local working view. For a web interface, both browser and native QVAC host run on this computer; do not describe this as browser-local inference.

Our main differentiator is **accumulating field evidence without turning partial, estimated, or repeated observations into a false inventory**.

> An observation provides evidence. It does not necessarily represent a new asset or a confirmed fact.

---

## 2. Problem

Service engineers, sales representatives, and specialists visit hospitals and observe equipment such as MRI scanners, CT scanners, and ultrasound systems. Some of this information remains in personal notes, conversations, or memory because manual capture requires time and effort.

When observations are recorded, they may contain:

- Incomplete or approximate information.
- Inconsistent descriptions.
- Repeated observations from different employees.
- Confusion between equipment observed and the hospital's complete inventory.
- Contradictions between visits.
- Limited traceability of who reported each fact and when.
- Sensitive customer information that should not be sent to an external inference service.
- Unreliable connectivity inside or around hospitals.

This limits Philips' visibility into customer technology environments and makes it difficult to determine which information is current, incomplete, contradictory, or worth verifying during a future visit.

---

## 3. Users and Decisions

### Primary User

A hypothetical field Account Manager / Sales Representative who has completed a hospital visit and records a short equipment observation note. Information may come from a walkthrough or hospital staff; serial numbers, complete inventory, and exact installation dates may be unavailable. No Philips employee workflow or reporting obligation has been empirically validated.

### Information Consumers

The MVP consumer is the same account manager reviewing local customer history and verification items before their own next visit. Fictional employee histories in the seed demonstrate prior evidence, not working collaboration. Account, service, and planning teams are possible future consumers through an approved integration; their processes and ownership are unknown.

Synchronization, shared accounts, backend storage, CRM ingestion, and a dedicated data-steward role are outside the MVP.

### Decisions Supported

- What information should be confirmed during the next customer visit.
- Which customers have old, incomplete, or contradictory records.
- Which equipment and modalities were recently observed.
- Which records may refer to the same asset and require review.

The prototype will not claim that old equipment automatically represents a sales opportunity. It will identify **verification opportunities** supported by field evidence.

Create a verification item only when resolution could materially change the working view, prevent duplication, or improve future identification; do not turn every optional missing field into work. Each item retains a reason code, customer/location scope, affected claims/records/discrepancy, supporting evidence, why clarification matters, one suggested future-visit question, priority, Open/Resolved/Dismissed status, and creation/update dates.

Prioritize potential conflicts/comparable count discrepancies; then ambiguous matches that could duplicate provisional records; unknown quantity scope or claim attachment; distinguishing identity information; and explicitly useful optional description. Show the three highest-priority Open items for the selected customer by default and keep the full backlog accessible.

Resolution requires linked new evidence or an explicit reconciliation decision. Dismissal records actor, date, and reason, removes the item from the active list without deleting history or implying verification, and may be reopened or followed by a related item when new evidence arrives. Recency alone cannot resolve or dismiss an item. Deterministic rules choose priority; QVAC may phrase its suggested question.

---

## 4. Value Proposition

Before measurement, use this exact business claim:

> The prototype is designed to reduce the effort required to convert equipment observations into structured evidence while preserving uncertainty and preventing automatic double-counting.

The solution aims to:

1. Reduce the effort required to turn an equipment observation into structured installed-base evidence.
2. Recover useful information that currently remains scattered.
3. Preserve uncertainty and data provenance.
4. Prevent false inventory growth caused by repeated observations.
5. Support the core workflow without internet access or cloud inference on the validated execution setup.
6. Transform observations into an actionable list of information to verify.

### Product Promise

> Turn a short equipment observation note into structured and traceable evidence that improves a local installed-base working view without cloud inference.

The note covers equipment observations, not a complete sales visit, CRM activity, or service report. Its personal value through history and verification reminders, and the additional work of a separate note, require practitioner or explicitly labeled proxy validation. The prototype demonstrates an exportable record for future corporate integration; it does not provide immediate corporate visibility.

The supported outputs are structured equipment evidence, claim-level provenance, explicit uncertainty/scope, conservative human-reviewed reconciliation, a focused verification backlog, and local operation without cloud inference. The differentiation claim is: "The prototype combines local QVAC extraction with claim-level provenance, explicit uncertainty and scope, and conservative human-reviewed reconciliation."

Before measurement, do not claim achieved speed/adoption, improved Philips inventory accuracy or corporate visibility, increased sales/revenue, market-share intelligence, or production readiness. After evaluation, replace "designed to" only with exact measured findings and sample sizes; never generalize synthetic or small-participant results to Philips' production environment.

---

## 5. Core Experience

### User Flow

Before capture, the application states: "Use fictional demonstration data only. Do not enter patient information, confidential customer data, or real competitive information." It does not claim to detect sensitive information automatically.

1. The employee opens the application and selects the fictional hospital.
2. They respond to: "Describe the medical equipment you observed or were told about."
3. The application persists the original note locally before QVAC inference starts on the same computer.
4. The application displays draft equipment cards with each generated claim, supporting excerpt, subject or group, quantity scope, source type, certainty, and proposed asset relationship together.
5. If a clarification would materially improve the record, deterministic rules select one target and QVAC phrases a question. The user may answer, choose **I don't know**, or skip and save; complete notes need no question.
6. The application compares the extracted claims with existing assets and observations.
7. It suggests possible matches and never merges an ambiguous case automatically. Reconciliation may be deferred without blocking capture.
8. The employee accepts, corrects, rejects, or leaves each draft unresolved. Only accepted or manually authored claims enter the working view; the original note was saved independently.
9. The history, customer view, and aggregate dashboard are updated.

### Saved Notes and Extraction Recovery

Note storage and extraction are separate. Extraction states are Not started, Processing, Succeeded, and Failed. If model loading, inference, or output processing fails, keep the saved original note and explain that extraction failed; offer retry or manual structured entry. Invalid machine output must not enter customer views or aggregates.

Manual entry produces human-authored claims with provenance and appropriate certainty. It is not successful AI extraction. Evaluation distinguishes first-attempt AI success, post-retry success, manual recovery, and unresolved failures. During a demonstration, manual recovery shows resilience but cannot substitute for a successful QVAC extraction demonstration.

Each extraction attempt has an attempt ID, observation ID, observation revision, start time, and status: Processing, Succeeded, Failed, Interrupted, or Stale. On startup, an attempt left Processing becomes Interrupted. A retry reuses the observation, creates a new attempt, and replaces or invalidates earlier draft claims instead of appending duplicates.

Apply an inference result only when its attempt remains active, its observation revision is current, and no later manual correction or accepted result supersedes it. Manual correction increments the revision and invalidates older in-flight results. Stale results cannot overwrite manual work, create claims, or affect views. Activate accepted claims and update the working view in one transaction.

### Clarification Policy

Application rules choose a target in this order: quantity completeness, location scope, or claim attachment that could materially misrepresent the observation; an identity detail that distinguishes actual candidates; then optional model, manufacturer, or age information. QVAC identifies potential ambiguities and phrases a question only about the selected target. Preserve an answer as additional evidence linked to the relevant claims; unknown or ambiguous fields remain explicit if unanswered.

Ask at most one follow-up question per capture, including after processing its answer. If question generation fails, use a short predefined question for the selected target or finish without it. This limit concerns the user's questions, not an unstated inference-call or latency allowance; the complete capture timing still needs evaluation.

### Draft Review Boundary

QVAC-generated claims remain drafts until explicit user review and do not affect counts, discrepancies, customer views, or aggregates. Before review, validate schemas/enums, types/ranges, existence of the cited excerpt/evidence, referenced observation and subject, quantity/location-scope requirements, and record relationships. Reject outputs that fail these checks.

These checks do not prove semantic support. A real excerpt can still be misread through negation or attached to the wrong subject. User acceptance means the structured claim represents the available statement; it does not independently verify the statement. Do not call a claim grounded merely because it cites an excerpt, and do not claim zero residual semantic error.

### Example

Input:

> “I saw three DemoScan Technologies MRI scanners. One appears to be eight years old and was located in radiology.”

Expected output:

| Subject | Field | Value | Status |
|---|---|---|---|
| Observed group | Modality | MRI | Reported |
| Observed group | Manufacturer | DemoScan Technologies | Reported |
| Observed group | Observed quantity | 3 | Reported |
| Hospital inventory | Total quantity | Unknown | Unknown |
| One unidentified member of the group | Approximate age | 8 years | Estimated |
| The same unidentified member | Location | Radiology | Reported |

The member's age and location remain unattached to an individual asset until reconciliation; they must not be copied to all three scanners.

Possible prioritized question:

> “Were the three MRI scanners you saw the hospital's complete MRI inventory?”

---

## 6. Differentiation

Conversational capture, editable cards, and dashboards are expected features. Our differentiation lies in responsible evidence management:

- Separate observations from consolidated assets.
- Distinguish observed quantity from reported total quantity.
- Preserve the exact text that supports each claim.
- Maintain a certainty status for each field.
- Detect contradictions without arbitrarily choosing which report is correct.
- Suggest possible matches without merging ambiguous assets.
- Update the local installed-base working view without adding repeated reports together.

### Key Demonstration Case

The initial local database contains three MRI asset records supported by trusted fictional seed references. A new observation states:

> “I saw all three MRI scanners; one appears to be eight years old.”

The system must:

- Keep the verified record count at three rather than changing it to six; this is not an audited count of currently installed equipment.
- Retain the age estimate about one unidentified member without assigning it arbitrarily.
- Preserve the new observation and its provenance.
- Show any unresolved match for review.

---

## 7. Functional Scope

### Required MVP

- A working laptop application using either Electron or a same-computer browser UI/native QVAC host, selected after validation.
- Selection of a fictional hospital.
- Natural-language text capture.
- Inference through a pinned, tested `@qvac/sdk` version on the same physical computer as the workspace; no cloud or delegated inference.
- Structured extraction of customer, location, modality, quantity, manufacturer, model, and age when available.
- Identification of reported, estimated, and unknown values.
- Review and correction through editable cards.
- At most one prioritized follow-up question when materially useful, with skip and I don't know options and no repeat-question loop.
- Save original notes before inference and retain them through extraction failure; provide retry or manual recovery.
- Local persistence; SQLite is the current proposal, subject to execution-platform validation.
- Separation of original observations, later evidence entries, claims, observed groups, verified individual assets, provisional individual records, and unlinked claims.
- Comparison with existing records.
- Human-reviewed match suggestions.
- Customer-level local working view with separate verified records, provisional records, and reported totals.
- Basic aggregation across customers.
- Observation history and provenance.
- Versioned JSON export created locally and offline through explicit user action, preserving stable references and provenance without upload, import, or CRM-compatibility claims.
- Explicit observation deletion with dependent-content removal and affected-view recalculation.
- Complete core workflow without internet access.

Every application screen, export, screenshot, evaluation result, and demonstration displays: "Synthetic demonstration data."

### Priority Differentiators

- Quantity scope: `observed`, `reported_total`, or `unknown`.
- Supporting text attached to every claim.
- Reconciliation that prevents duplicate assets.
- Contradictions and unresolved information requiring verification.
- Structured export for future CRM or field-service integration.

### Stretch Features

The original internal priority list named local voice transcription, photo/OCR, stale-information alerts, natural-language queries, and cross-device synchronization. The following dated amendment preserves that history while aligning future work with the stored official challenge brief.

**Project-owner amendment, 2026-09-11:** the brief lists eight optional Stretch Goals, separately from the Minimum Viable Prototype. Duplicate detection, Data freshness, and AI follow-up questions are implemented only within the bounded emergency-prototype evidence described below. Confidence scoring is partial. Voice capture, Photo-assisted capture, Natural-language analytics, and Opportunity identification are pending.

| Official Stretch Goal | Current classification | Boundary |
| --- | --- | --- |
| Voice capture | Pending | Requires a bounded fully local transcription feasibility stage. |
| Photo-assisted capture | Pending | Requires a bounded fully local OCR feasibility stage. |
| Duplicate detection | Implemented in the bounded prototype | Conservative candidate matching and explicit reconciliation prevent duplicate record growth; this is not generalized automatic identity resolution. |
| Confidence scoring | Partial | Certainty, candidate score, freshness, and priority exist; an explainable completeness/freshness/corroboration score does not. |
| Data freshness | Implemented in the bounded prototype | Dates, evidence age, a configurable threshold, and verification priority are visible; this is not Philips policy. |
| AI follow-up questions | Implemented in the bounded prototype | One bounded Spanish clarification is supported; the v9 answer-incorporation limitation remains. |
| Natural-language analytics | Pending | No natural-language query path exists. |
| Opportunity identification | Pending | Verification Items are not commercial opportunities. |

The owner voluntarily authorizes planning an attempt to complete the five unfinished goals: Confidence scoring, Opportunity identification, Natural-language analytics, Photo-assisted capture, and Voice capture. [ADR 0007](adr/0007-attempt-five-remaining-official-stretch-goals.md) records the decision and [the implementation plan](STRETCH_GOALS_IMPLEMENTATION_PLAN.md) defines the future units and stop conditions. This extension is not a minimum challenge requirement, does not alter the failed E4/E4-v2 results, and does not complete or unblock the formal tickets.

**Planning closure note, 2026-09-11:** the owner approved the implementation plan and its conservative decisions. Confidence scoring begins with an explainable configurable 40/30/30 completeness/freshness/independent-corroboration rule; opportunity outputs remain evidence-backed possibility signals; natural-language analytics uses a separate read-only contract and prompt without modifying extraction prompt v9; original photo and audio media remain temporary while only reviewed submitted text is persisted with `photo-assisted` or `voice` provenance. Implementation still waits for separately published extension tickets.

Cross-device synchronization is not an official Stretch Goal in the stored brief and remains deferred under ADR 0002. Full manual testing and final rehearsal move after the five-feature extension and UI/UX integration; each feature still requires automated tests and a specific smoke during implementation.

**Expected-output amendment, 2026-09-11:** the owner additionally authorized a **Geographic Installed-Base Map** found under Expected Output in the stored brief. It is an optional demonstration experience, not a ninth Stretch Goal or a Minimum Viable Prototype requirement. It is limited to synthetic geography, local/offline assets, deterministic modality/geography aggregates, the hierarchy `Región → País → Ciudad → Cliente → Equipos instalados`, an accessible list/tree alternative, and navigation to Customer 360. Remote tiles, geocoding, external services, real Philips locations, invented precision, QVAC calls, and Equipment Record mutation are prohibited. Extension Tickets 01 and 02 are now owner-approved and implemented; the failed E4/E4-v2 gates and original formal-ticket states remain unchanged.

Automatic asset lifecycle management, complete visit-note capture, a general-purpose knowledge graph, and a full event-sourcing framework are outside the MVP. Supporting seeded labels or references does not add photo/document ingestion to the required scope.

Delegated inference and mobile deployment are outside the selected MVP route. Peer model distribution is not peer inference; do not downgrade the SDK to recover delegation.

Import, automatic upload, application-managed authentication, encrypted database storage, and automatic sensitive-data detection are outside the MVP.

---

## 8. Reliability Rules

### Status Definitions

| Status | Operational Definition |
|---|---|
| Confirmed | Supported by inspectable evidence under explicit verification rules. A typed serial, extraction approval, or repeated agreement is insufficient. Trusted fictional seed references demonstrate identity verification only, not real-world verification or confirmation of every field. |
| Reported | Explicitly stated by the employee without independent verification. |
| Estimated | Expressed as an approximation using phrases such as “appears to be” or “approximately.” |
| Unknown | Not mentioned or impossible to determine from the available information. |

Approving an extracted card only confirms that the application interpreted the employee's statement correctly. It does not convert a reported or estimated value into a confirmed fact.

Information source is separate from certainty: direct observation, attributed staff statement, unattributed statement, existing authorized record, or supporting document/equipment label. Preserve provided attribution. Identity verification does not prove age, location, condition, or current presence.

### Reconciliation Rules

- A new observation will never increase inventory automatically merely because it mentions similar equipment.
- Verified identity in this synthetic MVP requires a match against an explicitly trusted fictional reference record in the seed. Identifier syntax validation and database uniqueness checks do not prove physical identity; a newly reported serial remains reported.
- Context may support a provisional individual record or possible match. An unresolved observation does not automatically create or increase provisional records.
- Users may accept a provisional link, explicitly create a separate provisional record, or leave the claim unresolved. Record the decision, actor, date, and reason using a short reason selector with optional text. Accepting a provisional match is distinct from accepting extraction and does not verify identity.
- “I saw two scanners” will be stored as an observed quantity.
- “The hospital has two scanners in total” may be stored as a reported total.
- A reported total requires explicit completeness language or a clarifying answer. Location scope is separate; selecting the hospital supplies customer context, not completeness. Otherwise retain the quantity with scope unknown.
- Unknown values will remain unknown; QVAC must not infer unsupported values.
- Contradictions will retain both sources and timestamps.
- Dashboard calculations will use deterministic logic over stored data.

### Counts and Time

Display verified asset records, provisional records, and reported totals separately; do not add them into an authoritative inventory. Count discrepancies require comparable customer, site/campus, applicable organizational scope, modality, time basis, and count meaning. For incompatible scopes, retain both values with "Scope unresolved" and do not subtract them. A numerical discrepancy does not establish a missing asset.

Preserve capture time and the time a statement applies when explicitly supplied; do not invent an effective date. Use three review labels: potential conflict for incompatible claims about comparable scope/period, possible change for differing values at different times without an adequate explanation, and reported change/correction for an explicit transition or revision. An explicit correction may supersede an earlier claim in the working view and an explicit change may establish a newer reported state, while both remain in history. Recency alone neither resolves disagreement nor retires assets.

Display approximate age with its evidence date; ordinary aging is not a conflict solely because the numbers differ. Complex temporal reconciliation remains manual. Verified identity is historical evidence, not proof of current installation; show relevant dates and label counts as local workspace records.

### Corrections and Evidence

Preserve the original note unchanged. Each correction or follow-up answer is dated, attributed evidence related to the original observation. An extraction correction points to the original excerpt and retains correction history; a new or revised assertion points to the new evidence entry. Revising "approximately eight" to five keeps the claim Estimated unless evidence supports a changed status. Preserve prior claims and explicit supersession relationships where appropriate.

### Deletion

The user may explicitly delete an observation. Remove its original note, evidence entries, follow-up answers, draft and accepted claims, reconciliation links, and conflict records when they depend exclusively on it, then recalculate every affected view and aggregate. Shared records supported by other evidence must be recalculated rather than blindly removed; detailed dependency behavior belongs in the later specification.

A content-free deletion marker may retain only a random observation ID, deletion timestamp, and deletion action. It must not retain original text, excerpts, values, or a content hash. Deletion deliberately overrides provenance for that observation and does not promise removal from earlier exports, external copies, operating-system backups, or forensic recovery.

### Local Privacy Boundary

The exact prototype claim is: "All application AI inference and workspace storage remain on the same computer. The application sends no observations to cloud inference services and includes no application telemetry."

Rely on the operating-system user account for access control. Do not claim enterprise authentication, multi-user authorization, encrypted database storage, protection from access through an unlocked computer, or production readiness. Exclude note and claim content from ordinary application logs; publish prompts and outputs only for synthetic evaluation cases. Store data locally, make no automatic uploads, and make no cloud inference calls.

If using a local HTTP service, bind to loopback only, never `0.0.0.0` or a LAN interface; accept only the local application's intended origins and shut down the service with the application where possible. Validate the core workflow offline and inspect observed network activity during demo rehearsal, while stating that this does not prove complete operating-system security.

### Structured Export

One explicit user action creates a versioned JSON workspace export locally while offline. It contains schema version, export ID/date, customers/sites, visits/observations, original synthetic notes, evidence and follow-up entries, claims/certainty/scopes, asset records, proposed and accepted links, conflicts, and reconciliation history with stable references.

The application does not upload or transmit the file, implement import, claim CRM compatibility, or enable collaboration. Before export, warn that later local deletion cannot remove content from previous export files. JSON is the authoritative MVP export; CSV may be considered later for human inspection.

---

## 9. Conceptual Data Model

| Entity | Purpose |
|---|---|
| `customers` | Fictional hospitals, cities, and countries. |
| `visits` | Visit, employee, and date. |
| `observations` | Original equipment note and capture metadata. |
| Extraction attempts | Attempts tied to an observation revision, including active, interrupted, and stale states for safe recovery. |
| Evidence entries | Attributed and dated corrections or follow-up answers related to an observation. |
| `claims` | Claims with subject scope, certainty, source, quantity/location scope, dates, and supporting evidence references. |
| Observed groups and unidentified members | Group evidence and member-specific claims that need not establish individual identity. |
| `assets` | Verified individual asset records or provisional individual records; unlinked claims remain separate. |
| `asset_links` | Suggested, accepted provisionally, or rejected relationships and their explicit decision history; acceptance is not verification. |
| Review items | Potential conflicts, possible changes, reported changes/corrections, and unresolved information to verify. |
| Workspace exports | Versioned JSON snapshots with stable record references, created locally by explicit action. |
| Deletion markers | Optional content-free records of explicit observation deletion. |

Main relationship:

`Visit → Observation and Evidence Entries → Scoped Claims → Possible Asset Links → Local Working View`

These are conceptual responsibilities, not a settled database schema. A small evidence-entry model, claim references, and explicit reconciliation decisions are sufficient; no general-purpose knowledge graph or event-sourcing framework is planned.

---

## 10. Proposed Architecture

### Application

- First execution target: the inspected Windows 11 laptop with Ryzen 5 8645HS, approximately 16 GB RAM, and RTX 4050 Laptop GPU with 6 GB VRAM. Record actual available memory and the execution backend during the spike; do not assume GPU acceleration from hardware presence.
- After a minimal local QVAC harness passes feasibility review, choose Electron or a browser UI connected to a native QVAC host on the same computer. Prefer the least setup and packaging friction compatible with reliable offline capture. Mobile remains future work.
- SQLite is the current local-persistence proposal, pending compatibility with the selected execution setup.
- `@qvac/sdk` for all core AI inference.
- Closed output schema with deterministic validation.
- No cloud inference API.
- No delegated inference; pin the tested SDK version rather than downgrading to restore removed delegation features.
- No application telemetry or automatic upload; ordinary logs exclude note and claim content.
- If selected, the browser/native-host route binds its local service to loopback and restricts accepted origins.

### QVAC Responsibilities

- Convert one free-form, potentially multi-equipment narrative into candidate atomic scoped claims.
- Identify equipment groups/subjects, stated modality/manufacturer/model, quantity value and scope, location scope, source type, certainty, supporting excerpts, claim-to-subject attachment, and ambiguity candidates.
- Phrase one natural-language clarification about the target selected by deterministic application rules.

### Application-Code Responsibilities

- Validate structured output and data types.
- Validate structure and reject detected unsupported values. Schema validity and excerpt presence do not prove factual correctness; manually inspect extraction quality and report unsupported values separately.
- Keep generated claims draft-only until explicit user review; acceptance, correction, rejection, or unresolved status must not update the working view prematurely.
- Apply reconciliation rules.
- Choose a clarification target deterministically and enforce the one-question limit and failure fallback.
- Calculate indicators and aggregations.
- Store, query, and export data.
- Preserve audit history and provenance.
- Never implement a hidden parallel semantic extractor using regexes, keyword mappings, or hard-coded demonstration outputs. Rules may validate structure or flag risk patterns, but narrative-to-claim meaning belongs to QVAC.

### Initial Technical Decision

Before developing the complete user interface, run a minimal local QVAC harness on the selected Windows laptop. Resolve the documented Node requirement and verify runtime/backend compatibility, then validate model acquisition, loading, inference, structured output, offline behavior, and performance. A phone is not required.

Choose between Electron and a same-computer browser/native-host interface using measured feasibility, setup and packaging effort, offline usability, and demonstration reliability. Both the interface and QVAC execute on the workspace computer. Cloud and delegated inference are prohibited in the MVP.

Initial [platform research](references/QVAC_PLATFORM_RESEARCH.md) identifies this Windows computer as a plausible native execution candidate, not a validated runtime. Official [v0.19.0 release notes](https://docs.qvac.tether.io/reference/release-notes/#delegated-inference-removed) remove delegated inference, supporting the decision to exclude it rather than downgrade to older APIs. Exact SDK/model versions and the execution path must be pinned and tested; no release is yet recorded as tested.

**Status amendment, 2026-09-11:** the paragraph above preserves the pre-E4 planning state. E4 and E4-v2 subsequently failed and remain authoritative failures. ADR 0006 then authorized the bounded emergency exception, and the prototype evidence now records `@qvac/sdk` 0.19.0, cached `QWEN3_1_7B_INST_Q4`, prompt v9, GPU execution, and the loopback browser/Node path. This bounded validation does not retroactively pass E4, complete the formal tickets, or establish production or final-delivery readiness.

The pre-E4 plan expected final model, quantization, and parameter selection through measurements. For the emergency prototype, ADR 0006 and the recorded v9 evidence now freeze that choice; the Stretch Goal extension does not reopen it.

---

## 11. Synthetic Prototype Database

All organizations, hospitals, manufacturers, product models, asset identifiers, staff names, countries, cities, campuses, departments, rooms, observations, and histories are fictional and belong to one documented synthetic universe. Generic category names such as MRI, CT, ultrasound, and patient monitoring may remain. Do not mix real manufacturers with fictional installed-base records or include real customer/competitive information or claims about actual equipment presence.

Every record has a stable ID, explicit dataset partition, and dataset-generation version. Evaluation partitions have frozen manifests and SHA-256 checksums. Prevent exact examples and close paraphrases from crossing development, spike, and held-out partitions.

### Application Seed

The restorable application seed creates demonstration state and is excluded from extraction-quality scoring:

- 6 hospitals across different cities or countries.
- 25–30 verified, provisional, or grouped equipment records.
- 40 historical observations.
- Different modalities, manufacturers, models, and levels of detail.
- Incomplete, stale, repeated, and contradictory records.
- Similar equipment with and without identifiers.

### Included Scenarios

1. Clearly new equipment.
2. Repeated observation that adds new information.
3. Observed quantity that does not represent the hospital total.
4. Contradictory reports from two employees.
5. Missing values that must remain unknown.
6. Uncertain match without a serial number.
7. The same model located in different rooms.
8. Approximate equipment age.

If schedule pressure requires fewer records, reduce the historical application seed before reducing the held-out evaluation set.

### Extraction Collections

- **Development set:** 15 labeled notes available for schema, prompt, and parser iteration.
- **E4 feasibility-spike set:** 20 labeled notes frozen before the spike, used for runtime, stability, latency, structured output, and manual quality inspection. It is not the final accuracy result.
- **Held-out evaluation set:** 30 labeled notes frozen before final prompt tuning and withheld from inspection or case-specific adjustment until the final run. Publish its inputs and gold annotations after evaluation.

After opening the held-out set, do not tune against its failures and rerun while calling it held-out. If a critical implementation defect requires a rerun, preserve the first result and disclose the rerun or create a new untouched evaluation version.

---

## 12. Validation and Metrics

The following values are initial targets. They will only be reported as achieved results after measurement.

| Dimension | Metric | Initial Target |
|---|---|---:|
| Extraction | Atomic scoped-claim F1 before correction | Minimum 85%; target 90% |
| Essential fields | Accuracy within correctly matched claims | ≥ 90% |
| Subject attachment | Correct subject/group attachment | ≥ 90% |
| Factual safety | Unsupported draft-claim rate | ≤ 5%, reported before review |
| Uncertainty | Correct status classification | ≥ 90% |
| Quantity scope | Observed vs. total vs. unknown | ≥ 90% |
| Structure | Schema-valid outputs after at most one controlled retry | 100% in the 20-note feasibility set; first-attempt results reported separately, without equating schema validity with factual correctness |
| Reconciliation | Ambiguous automatic merges | 0 |
| Review safeguard | Unsupported claims admitted to the controlled working view | 0; must not hide the draft error rate |
| Experience | Median capture and review time | < 60 seconds and faster than equivalent form |
| Simulated usability | Corrections required per case | Report median, range, distribution, and cases above 2; no universal pass gate |
| Privacy | Cloud or delegated inference during core workflow | 0; inference stays on the workspace computer |
| Performance | Model load, TTFT, token count, and throughput | Measured and published |

The spike's warm extraction ceiling is 15 seconds, including any retry, for at least 19 of 20 predefined notes. Cold model loading is reported separately. This is a feasibility ceiling, not the final UX target; measure typical latency and later test complete capture and review against the under-60-second target. Manual recovery and unresolved failures remain separate from AI success rates.

Extraction evaluation separately reports schema-valid output, semantically correct draft claims, unsupported interpretations, review corrections, and residual reviewed errors. Include negation, wrong-subject attachment, quoted or attributed statements, multiple equipment groups, conditional or uncertain language, and wrong-excerpt references.

Score atomic scoped claims before user correction. Correctness requires claim type, value, applicable subject/group attachment, quantity scope, applicable location scope, source type, certainty, and supporting-evidence reference to match gold. Customer identity is selected rather than extracted and must not inflate accuracy.

Essential fields are modality, stated quantity value, quantity scope, subject/group attachment, source type, and certainty. Manufacturer, model, location, age, and identifier are scored when stated. Publish atomic-claim precision/recall/F1; essential-field, attachment, quantity-scope, and certainty accuracy; unsupported-draft and omitted-supported rates; schema validity; and residual error after simulated review. Publish every numerator and denominator.

Failure to meet a target does not permit changing the result. Report the limitation and practical consequence. A result below the 90% F1 target but at or above the 85% minimum is a measured shortfall; below 85% fails the agreed extraction acceptance bar unless the project owner later approves and documents a scope or claim change.

### Evaluation Dataset

The final evaluation uses the 30-note held-out partition and is not individually tuned into the prompt. It includes:

- Multiple pieces of equipment in one report.
- Missing data.
- Approximate language.
- Ambiguous quantities.
- Contradictions.
- Repeated observations.
- Unmentioned manufacturers and models to test hallucinations.

Before the final run, the project owner approves and freezes the annotation guide, every gold annotation, documented ambiguity, and dispute resolution, with checksums for the guide/gold, prompt, and model configuration. Codex may propose annotations, validate structure, execute scoring, and produce reports, but must not modify frozen gold after seeing output.

For disputes, record the original annotation, issue, reviewer decision, reason, and date. A gold change after evaluation invalidates the affected result and requires a clearly labeled rerun. If no independent second reviewer participates, disclose: "This evaluation uses synthetic ground truth approved by a single project reviewer. It measures performance on the published synthetic test set and does not establish accuracy in Philips' real operational environment."

### Aggregate Dashboard

Aggregate only meanings that remain valid when combined: verified individual asset-record count by fictional customer/modality; provisional-record count separately; unlinked-claim count; observation count by customer/modality; verification-item and conflict counts by customer/reason; certainty-status distribution; and observation-recency distribution.

Use the exact labels "verified asset records," "provisional records," and "unlinked claims," never a complete audited count of current physical equipment. Display reported totals only by customer and declared scope, with source, date, and certainty; do not sum them across customers or combine them with record counts. Unclear or incompatible scope remains unresolved.

Do not calculate market share, replacement opportunity, revenue, equipment value, missing-asset totals, sales probability, or a mixed single total. The dashboard shows what evidence exists, how reliable/current it is, and where verification work is required.

### Experience Comparison

The same cases will be completed through:

1. An equivalent manual form.
2. The prototype's conversational capture.

We will compare total time, corrections, and completeness. Any test conducted with teammates will be presented as a prototype evaluation rather than representative validation with Philips employees.

The initial experience target requires conversational capture to be faster than the equivalent form. The project owner attempts to recruit at least one accessible field-sales/service practitioner; if unavailable, recruit at least three proxy users and disclose the limitation. Codex prepares frozen synthetic scenarios, an equivalent form, timing/correction instructions, and results template, then calculates results without dropping unfavorable outcomes. Test after capture/review stabilizes and before final results freeze.

Participants complete both workflows on equally difficult synthetic cases, with order alternated where possible. Time the complete capture-through-review process and record inference separately. Publish every participant's raw time, medians, correction distributions/ranges and cases above two, completeness, abandonment/failures, added-work response, snapshot/list usefulness, role, and practitioner/proxy status.

If conversational capture is not faster, withdraw the faster-capture claim. If participants would not create a separate equipment note, describe adoption as unvalidated. If output is useful but capture adds effort, report both. One practitioner provides workflow feedback only; proxy mechanics and any small sample do not establish workforce adoption.

---

## 13. Adversarial Validation Incorporated

| Objection | Design Response |
|---|---|
| “This is a form with AI.” | The differentiator is evidence provenance, uncertainty preservation, and reconciliation. |
| “Asset and field-service systems already exist.” | The product demonstrates equipment-evidence capture and structured export for future integration; no existing-system ingestion is implemented. |
| “An observation is not the real inventory.” | Observed quantity, reported total, and consolidated view are stored separately. |
| “Deduplication without a serial number is impossible.” | Ambiguous cases are suggested for review and never merged automatically. |
| “Employees will not accept additional work.” | The target is capture under one minute, one follow-up question, and deferred review for complex conflicts. |
| “Cloud AI could perform the same extraction.” | QVAC inference stays on the workspace computer and the core workflow runs without internet access after setup. |
| “QVAC only changes the architecture.” | QVAC performs the core language interpretation. Execution location and offline behavior will be demonstrated on the validated setup; platform-specific proof remains to be defined. |
| “Old equipment represents a sale.” | The application identifies information to verify and does not infer purchase intent. |
| “Local automatically means secure.” | The bounded claim covers same-computer inference/storage, no cloud inference or telemetry, content-free ordinary logs, and loopback-only local service if used. It does not claim encryption, application authentication, unlocked-device protection, or production security. |
| “Isolated data does not create corporate visibility.” | The MVP provides a local view and exportable evidence, not immediate corporate visibility. Synchronization and CRM ingestion remain future work; inference delegation is excluded. |

---

## 14. Implementation Plan

### Phase 1: QVAC Technical Spike

- Use the inspected Windows laptop and a minimal local QVAC harness; resolve Node/runtime prerequisites and record the actual backend and available memory.
- Pin the tested SDK/model versions, quantization, and parameters. Do not assume NVIDIA presence proves working GPU acceleration.
- Run 20 predefined representative notes offline after dependencies and models are installed, without tailoring the prompt to individual examples.
- Require no crashes or lost notes, schema-valid output for all 20 after at most one controlled retry, and warm end-to-end extraction including retries within 15 seconds for at least 19 of 20 notes.
- Report first-attempt and post-retry validity, cold loading, typical latency, and manually inspected factual quality, including unsupported values. Invalid outputs must not enter the working dataset; schema validation does not detect every hallucination.
- Timebox active implementation effort to three hours, tracking dependency/model downloads separately and reporting total elapsed time as well.

**Owner:** Codex implements and records results through the later approved spike ticket; the project owner handles local device interaction and reviews the findings. This planning session does not execute the spike.

**Exit criterion:** Review the measured gates at the timebox. If a gate fails, stop and report the concrete blocker and smallest proposed model, runtime, or platform change. Do not silently relax thresholds or continue indefinite tuning. After feasibility, select Electron or a same-computer browser/native-host interface using setup/packaging friction and reliable offline capture.

### Phase 2: Domain Model and Synthetic Data

- Define the schema for observations, claims, assets, and matches.
- Create the synthetic seed.
- Implement status and quantity-scope rules.

**Exit criterion:** All eight seeded scenarios can be represented without losing provenance or uncertainty.

### Phase 3: Core Capture Flow

- Hospital selection.
- Text capture.
- Local extraction.
- Editable cards.
- Prioritized question.
- Local persistence using the validated approach.
- Draft review before claims enter the working view.
- Recovery from failed, interrupted, retried, and stale extraction without duplicate observations or claims.

**Exit criterion:** An equipment observation can complete the core workflow without internet access on the workspace computer, with saved-note recovery and the one-question limit. A browser/native-host route uses same-computer communication, not another inference device.

### Phase 4: Reconciliation

- Find existing candidate assets.
- Present matches and contradictions.
- Accept a provisional link, reject it, explicitly create a separate provisional record, or leave the observation unresolved, with a recorded reason.
- Update the consolidated view without duplicating assets.

**Exit criterion:** The three-MRI demonstration case retains three verified records and preserves the new evidence without automatic provisional-record growth or arbitrary assignment of the member's age.

### Phase 5: Views and Business Value

- Customer-level installed-base view.
- Observation history and supporting evidence.
- Aggregate dashboard.
- List of stale, unknown, or contradictory data to verify.
- Three highest-priority Open verification items on the selected customer, plus the complete backlog and Resolved/Dismissed history.
- Structured export.
- Explicit observation deletion and affected-view recalculation.

**Exit criterion:** The application turns a captured observation into a concrete follow-up action.

### Phase 6: Evaluation and Delivery

- Run the evaluation dataset.
- Measure accuracy, errors, latency, and user effort.
- Run interruption/stale-result tests and offline/network-observation validation.
- Validate a local versioned JSON export with stable references and deletion-warning behavior.
- Document hardware, model, quantization, parameters, and limitations.
- Prepare the repository and reproducible setup instructions.
- Record the five-minute demo.

**Exit criterion:** Another evaluator can reproduce the workflow and understand its limitations.

---

## 15. Proposed Five-Minute Demo

Target approximately 4 minutes 30 seconds to leave recording and narration margin.

| Time | Content |
|---|---|
| 0:00–0:25 | Challenge and bounded pre-measurement or measured product claim. |
| 0:25–0:40 | Visible synthetic-data label, disconnected internet, and declared laptop/model/runtime. |
| 0:40–1:20 | Enter one previously unseen DemoScan narrative with three scanners and one unidentified member. |
| 1:20–2:05 | Run real QVAC inference and show multiple drafts, excerpts, attachment, certainty, and one quantity-scope clarification. |
| 2:05–2:55 | Review and reconcile without turning three verified records into six. |
| 2:55–3:35 | Show the local customer working view and three highest-priority verification items. |
| 3:35–3:55 | Show the limited aggregate evidence dashboard. |
| 3:55–4:30 | Show measured extraction/latency/offline results and repository reproduction path. |

The primary capture must use real QVAC inference on previously unseen free text and cannot use precomputed output; it must produce multiple scoped drafts with excerpts/attachment and require less manual field entry than the equivalent form. Manual recovery cannot substitute for successful QVAC inference. Keep the synthetic label visible, distinguish verified/provisional/unlinked records, and show disconnected internet with the same-computer workflow operating.

Export, deletion, crash/manual recovery, and full evaluation detail remain outside the primary walkthrough; validate them separately and reference repository evidence.

---

## 16. Deliverables

### Requirement Authority

Use three authority levels:

1. The stored [Philips challenge brief](references/PHILIPS_CHALLENGE_BRIEF.docx) supports the problem, natural-language capture, structured extraction/storage, incomplete-information handling, customer/aggregate views, and synthetic-data guardrails.
2. [User-provided Track 01 text](references/TRACK_01_USER_PROVIDED_TEXT.md) states on-device or permitted peer QVAC inference, disqualifying cloud inference, and flexible interface forms. Until the official publication is stored, this is user-provided organizer text rather than independently verified repository evidence. Our implementation is narrower: same-computer QVAC, no delegation, no cloud.
3. Video duration, public repository, permissive license, performance results, component disclosure, deadline/portal, mandatory `@qvac/sdk`, and the general judging rubric are self-imposed or unknown until authoritative sources are stored.

The [compliance matrix](COMPLIANCE_MATRIX.md) maps current sources, required evidence, and verification status. Competition compliance and final submission readiness remain unverified until every mandatory rule has an authoritative source and matching project evidence.

### Project Deliverables

The following remain project commitments even where organizer authority is unverified:

- Public repository under an approved permissive license.
- Prototype source code.
- Reproducible synthetic dataset.
- Installation and execution instructions.
- Declared hardware, operating system, model, and quantization.
- Prompts used by the application.
- Versioned machine-readable performance results with model load, prompt/configuration identity, token counts, TTFT, and throughput where applicable, plus a Markdown summary. Do not rely on ignored `*.log` files as published evidence.
- Functional evaluation results.
- Versioned JSON export schema and a synthetic example export.
- Known limitations.
- Demonstration video of no more than five minutes.
- Disclosure of external components and any remote API unrelated to inference.

### Version-Controlled Reproducibility Policy

Commit application/supporting source, lockfile, runtime declaration, secret-free configuration examples, prompt templates/version, schemas/rules, database schema/migrations, synthetic seed or deterministic generator/reset command, dataset manifests/partitions/checksums, annotation guide, scoring scripts, frozen held-out inputs/gold after evaluation, versioned results and summaries, synthetic export/schema, exact setup/evaluation/reset/demo commands, hardware/runtime/model metadata, known limits, first-run/rerun results, and third-party inventory/notices.

Use `results/feasibility/`, `results/evaluation/`, `results/usability/`, and `results/reproduction/` for machine-readable evidence. Maintain `docs/EVALUATION.md`, `docs/REPRODUCIBILITY.md`, `docs/PRIVACY_AND_QVAC.md`, `docs/THIRD_PARTY_INVENTORY.md`, `docs/DEMO_SCRIPT.md`, and `docs/COMPLIANCE_MATRIX.md` as the corresponding human-readable records when content exists.

Do not commit model weights, runtime databases, temporary logs, caches/build output, credentials/secrets, or private/real customer data. For the chosen model record exact name/revision/source/checksum/download size/license/acquisition command and runtime configuration.

### Clean Reproduction Gate

Before claiming reproducibility, use only tracked content in a fresh task-specific directory; verify runtime/package-manager versions and lockfile installation; acquire/checksum the model; restore/checksum the seed; start the selected topology; perform any prepared connected acquisition run; disconnect internet; complete a real QVAC capture; run deterministic tests and the published evaluation command; create/validate the JSON export; reset the seed; and rehearse the primary demo. Use an isolated cache when supported and otherwise disclose cache reuse. Do not alter unrelated global caches.

Codex executes commands, records failures, fixes in-scope reproducibility defects, and writes a machine-readable result. The project owner performs required OS/network interactions and confirms the record. Publish total/setup/download times, cache reuse, failures/fixes, final result, and hardware/OS. Failure blocks the reproducibility claim and final submission readiness. If only the development laptop is available, disclose: "Reproduction was validated from a clean repository directory on the development laptop. Portability to another machine remains unverified."

### Third-Party Gate

Before release, inventory every distributed or required SDK/runtime, model/weights, npm dependency, font, icon, image/sample asset, dataset-generation source, and relevant build/packaging tool. Record name, exact version/revision, source, license/SPDX identifier where available, use, redistribution status, required notice, and review status. Verify the model separately; do not commit/redistribute weights unless clearly permitted and necessary. Prefer original or clearly permissive assets and exclude real logos/product images from the fictional demo.

Codex prepares the inventory and flags unclear terms; the project owner reviews them. This is a documentation review, not legal advice. Replace, remove, or exclude unclear/incompatible components with documented acquisition steps. Apache-2.0 remains the repository license unless authoritative rules require a compatible change, which must be recorded before release.

---

## 17. Risks and Pending Decisions

| Risk or Decision | Action |
|---|---|
| Interface platform | Validate QVAC on the inspected Windows laptop, then select Electron or a same-computer browser/native-host route using measured feasibility and setup/packaging effort. |
| Model and quantization | Select using measured accuracy and performance. |
| Invalid structured output | Use schema validation, controlled retry, and manual correction. |
| Unsupported or semantically wrong values generated by the model | Keep outputs as drafts, validate references/relationships, require explicit review, and measure wrong interpretation separately; excerpts alone do not prove support. |
| Accidentally sensitive input | Show a synthetic-only warning, provide explicit deletion of application-managed dependent content, and avoid claims about exports, backups, or forensic erasure. |
| Local HTTP exposure | If this route is selected, bind to loopback, restrict origins, avoid `0.0.0.0`/LAN binding, and inspect observed network activity. |
| Candidate runtime or performance is unsuitable | Compare viable platforms and model/context choices against measured go/no-go criteria; desktop/web are valid choices from the outset. |
| Delegated inference | Excluded from the MVP; no SDK downgrade to restore it. Distinguish peer model distribution from inference. |
| Philips' actual internal validation rules are unknown | Document prototype rules as configurable assumptions. |
| Corporate synchronization is outside MVP scope | Implement export and document a future integration path. |
| Limited schedule | Prioritize the core workflow and reconciliation before voice, vision, or conversational analytics. |
| Submission rules unavailable | Project owner obtains official event/Track 01/general rules, deadline/timezone, portal, formats, repository/license/QVAC/metric/disclosure requirements, and rubric; store sources under `docs/references/` and complete the compliance matrix. |
| Reproduction failure | Block the reproducibility and final-submission-ready claims; preserve failures and repair only within approved scope. |
| Unclear third-party terms | Replace, remove, or exclude the component from distribution with documented acquisition instructions. |

---

## 18. Definition of Done

The prototype is complete when it:

- Runs all evaluated AI inference through a pinned, tested `@qvac/sdk` on the same physical computer as the workspace, without cloud or delegated inference.
- Completes the core workflow without internet access after dependencies/models have been installed, including the browser/native-host connection if selected.
- Saves original notes before inference and distinguishes extraction success, retry, manual recovery, and failure without admitting invalid machine output to views or aggregates.
- Asks at most one materially useful follow-up question per capture and allows skip or I don't know without a repeat-question loop.
- Extracts all required fields and allows corrections.
- Preserves unknown and estimated values.
- Retains the original text, author, and date.
- Keeps generated claims out of the working view until explicit acceptance and safely ignores interrupted or stale results.
- Distinguishes observed quantity from reported total quantity.
- Processes a repeated observation without duplicating inventory.
- Shows the installed base by hospital and basic aggregation across customers.
- Produces an explainable list of information to verify.
- Creates a versioned JSON export locally while offline without uploading it.
- Deletes an observation and exclusively dependent application-managed content, recalculating affected views and retaining at most a content-free deletion marker.
- Meets the bounded privacy claim and reports offline/network observations without claiming production security.
- Includes measured results, known limitations, a repository, and reproducible setup instructions.
- Can be demonstrated clearly within five minutes.

Prototype completion does not imply competition compliance or final submission readiness. Those additionally require authoritative rules, a complete compliance matrix, the clean reproduction gate, third-party review, and all required submission artifacts.

---

## 19. Codex Development Workflow

Implementation will use **Matt Pocock's AI Hero skills workflow**. The complete skill set will be installed in the project environment with:

```bash
npx skills@latest add mattpocock/skills
```

Because this project will have a repository and planning documents, the main build chain will be:

`/grill-with-docs → /to-spec → /to-tickets → /implement → /code-review`

The stages will be used as follows:

1. **`/grill-with-docs`:** Codex reviews this plan and the repository, challenges unresolved decisions, and records agreed domain terms and important architectural decisions.
2. **`/to-spec`:** Codex converts the settled decisions into a technical specification with verifiable behavior, constraints, edge cases, and acceptance criteria.
3. **`/to-tickets`:** Codex divides the specification into small, ordered implementation tickets with dependencies and completion criteria.
4. **`/implement`:** Codex executes the tickets, validates each required behavior, and keeps the implementation aligned with the specification.
5. **`/code-review`:** Codex reviews the completed changes against the specification and identifies defects, missing requirements, or unnecessary scope.

`/grill-me` remains available for early product questions that do not require repository context. Once implementation begins, `/grill-with-docs` is preferred because it works against the codebase and preserves resolved terminology and architectural decisions in repository files.

The grilling and specification stages must remain in the same conversation so that resolved decisions are carried forward accurately. The generated specification must also be checked against this official plan before tickets are created.

The specification may define platform-independent behavior and both candidate topologies only enough to support E4; it must not select a topology in advance. The first executable implementation ticket is the timeboxed QVAC spike on the inspected Windows laptop. Platform-independent preparation may proceed only where it cannot bias E4, and platform-dependent tickets remain blocked.

After E4, record an ADR selecting Electron or a same-computer browser/native-host interface, the model/runtime approach, and measured basis. Update the specification where topology affects behavior, startup, persistence, packaging, or tests, then update/generate platform-dependent tickets and obtain acceptance before full implementation. A failed E4 follows its stop/report rule; any alternative spike must be separately bounded and justified.

Readiness states are distinct: ready for `/to-spec` after grilling closes; ready for E4 after the specification and first ticket exist; ready for full implementation only after the post-E4 ADR and updated tickets are accepted; ready for submission only after compliance and reproduction gates pass.

Reference: [Matt Pocock's AI Hero skills workflow](https://www.aihero.dev/skills-grill-with-docs)
