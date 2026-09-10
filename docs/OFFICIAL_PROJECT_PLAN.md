# Official Project Plan

## Philips Customer Installed Base Intelligence with QVAC

**Status:** Product concept and scope agreed; technical validation on the physical device is pending.  
**Purpose:** Define what we will build, why it creates value, how it will work, how it will be evaluated, and what the demo will show.

---

## 1. Executive Summary

We will build a private, offline-capable mobile application that allows field employees to record what they observed during a hospital visit using natural language.

QVAC will run inference directly on the phone and transform the report into structured claims about medical equipment. The application will preserve the source, date, supporting text, and uncertainty of every claim. It will compare new claims with the existing installed-base data before updating the consolidated view.

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

A field employee who has completed a hospital visit and needs to record observations quickly.

### Information Consumers

- Account and sales teams.
- Service teams.
- Installed-base and commercial planning teams.

### Decisions Supported

- What information should be confirmed during the next customer visit.
- Which customers have old, incomplete, or contradictory records.
- Which equipment and modalities were recently observed.
- Which records may refer to the same asset and require review.

The prototype will not claim that old equipment automatically represents a sales opportunity. It will identify **verification opportunities** supported by field evidence.

---

## 4. Value Proposition

The solution aims to:

1. Reduce the time and effort required to document a visit.
2. Recover useful information that currently remains scattered.
3. Preserve uncertainty and data provenance.
4. Prevent false inventory growth caused by repeated observations.
5. Work inside hospitals without connectivity or remote inference.
6. Transform observations into an actionable list of information to verify.

### Product Promise

> Turn a short visit report into structured and traceable evidence that improves the installed-base view, even without connectivity.

---

## 5. Core Experience

### User Flow

1. The employee opens the application and selects the hospital.
2. They enter a natural-language description of what they observed.
3. QVAC processes the report locally.
4. The application displays editable equipment cards with the extracted values and their certainty states.
5. If an important ambiguity exists, the application asks one prioritized follow-up question with an **I don't know** option.
6. The application compares the extracted claims with existing assets and observations.
7. It suggests possible matches and never merges an ambiguous case automatically.
8. The employee reviews and saves the observation.
9. The history, customer view, and aggregate dashboard are updated.

### Example

Input:

> “I saw three Siemens MRI scanners. One appears to be eight years old and was located in radiology.”

Expected output:

| Field | Value | Status |
|---|---|---|
| Modality | MRI | Reported |
| Manufacturer | Siemens | Reported |
| Observed quantity | 3 | Reported |
| Total quantity at hospital | Unknown | Unknown |
| Approximate age | 8 years | Estimated |
| Location | Radiology | Reported |

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
- Update the current installed-base view without adding repeated reports together.

### Key Demonstration Case

The initial database contains three MRI scanners. A new employee reports:

> “I saw all three MRI scanners; one appears to be eight years old.”

The system must:

- Keep the total at three MRI scanners rather than changing it to six.
- Add the age as an estimate.
- Preserve the new observation and its provenance.
- Show any unresolved match for review.

---

## 7. Functional Scope

### Required MVP

- Mobile application installed on a physical device.
- Selection of a fictional hospital.
- Natural-language text capture.
- Local inference through `@qvac/sdk`.
- Structured extraction of customer, location, modality, quantity, manufacturer, model, and age when available.
- Identification of reported, estimated, and unknown values.
- Review and correction through editable cards.
- One prioritized follow-up question.
- Local SQLite storage.
- Separation of observations, claims, and assets.
- Comparison with existing records.
- Human-reviewed match suggestions.
- Customer-level installed-base view.
- Basic aggregation across customers.
- Observation history and provenance.
- Complete core workflow without internet access.

### Priority Differentiators

- Quantity scope: `observed`, `reported_total`, or `unknown`.
- Supporting text attached to every claim.
- Reconciliation that prevents duplicate assets.
- Contradictions and unresolved information requiring verification.
- Structured export for future CRM or field-service integration.

### Stretch Features

1. Local voice transcription.
2. Photo and OCR capture of equipment labels.
3. Stale-information alerts.
4. Natural-language queries over the local dataset.
5. Synchronization between devices.

Stretch features will only be added after the core workflow is complete and measured.

---

## 8. Reliability Rules

### Status Definitions

| Status | Operational Definition |
|---|---|
| Confirmed | Supported by an equipment label, serial number, authorized system, or sufficient corroboration defined by explicit rules. |
| Reported | Explicitly stated by the employee without independent verification. |
| Estimated | Expressed as an approximation using phrases such as “appears to be” or “approximately.” |
| Unknown | Not mentioned or impossible to determine from the available information. |

Approving an extracted card only confirms that the application interpreted the employee's statement correctly. It does not convert a reported or estimated value into a confirmed fact.

### Reconciliation Rules

- A new observation will never increase inventory automatically merely because it mentions similar equipment.
- Without sufficient identity information, the application will create a pending possible match.
- Identity may be supported by serial number, model, room, description, or additional evidence.
- “I saw two scanners” will be stored as an observed quantity.
- “The hospital has two scanners in total” may be stored as a reported total.
- Unknown values will remain unknown; QVAC must not infer unsupported values.
- Contradictions will retain both sources and timestamps.
- Dashboard calculations will use deterministic logic over stored data.

---

## 9. Conceptual Data Model

| Entity | Purpose |
|---|---|
| `customers` | Fictional hospitals, cities, and countries. |
| `visits` | Visit, employee, and date. |
| `observations` | Original report and capture metadata. |
| `claims` | Extracted claims, status, quantity scope, and supporting text. |
| `assets` | Current best view of identified equipment or known groups. |
| `asset_links` | Suggested, confirmed, or rejected links between claims and assets. |
| `conflicts` | Contradictory data requiring review. |

Main relationship:

`Visit → Observation → Claims → Possible Assets → Consolidated View`

---

## 10. Proposed Architecture

### Application

- React Native with Expo and TypeScript.
- SQLite for local persistence.
- `@qvac/sdk` for all core AI inference.
- Closed output schema with deterministic validation.
- No cloud inference API.

### QVAC Responsibilities

- Interpret the visit report.
- Extract structured claims.
- Recognize expressions of uncertainty.
- Distinguish observed quantity from reported total quantity when the language supports that distinction.
- Propose one follow-up question for the highest-value missing detail.

### Application-Code Responsibilities

- Validate structured output and data types.
- Reject values without support in the source text.
- Apply reconciliation rules.
- Calculate indicators and aggregations.
- Store, query, and export data.
- Preserve audit history and provenance.

### Initial Technical Decision

Before developing the complete user interface, we will run a technical spike on the physical phone to validate model download, loading, inference, structured output, and performance.

If the mobile route encounters a blocking issue that cannot be resolved within the hackathon schedule, the contingency will be a local Electron desktop application preserving the same workflow and local-inference requirements.

The final model, quantization, and parameters will be selected through measurements on the declared hardware and documented accurately.

---

## 11. Synthetic Prototype Database

The application will include a fully fictional seeded database:

- 6 hospitals across different cities or countries.
- 25–30 equipment assets or groups.
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

The database will have a restorable seed so the demo remains reproducible.

---

## 12. Validation and Metrics

The following values are initial targets. They will only be reported as achieved results after measurement.

| Dimension | Metric | Initial Target |
|---|---|---:|
| Extraction | Accuracy/F1 by field | ≥ 90% for essential fields |
| Factual safety | Unsupported fields generated | Close to 0% |
| Uncertainty | Correct status classification | ≥ 90% |
| Quantity scope | Observed vs. total vs. unknown | ≥ 90% |
| Structure | Processable outputs after validation/retry | 100% |
| Reconciliation | Ambiguous automatic merges | 0 |
| Experience | Median capture and review time | < 60 seconds |
| Simulated usability | Corrections required per typical capture | Maximum of 2 |
| Privacy | Remote inference during core workflow | 0 |
| Performance | Model load, TTFT, token count, and throughput | Measured and published |

### Evaluation Dataset

We will prepare 30–50 synthetic observations that are not individually tuned into the prompt. They will include:

- Multiple pieces of equipment in one report.
- Missing data.
- Approximate language.
- Ambiguous quantities.
- Contradictions.
- Repeated observations.
- Unmentioned manufacturers and models to test hallucinations.

### Experience Comparison

The same cases will be completed through:

1. An equivalent manual form.
2. The prototype's conversational capture.

We will compare total time, corrections, and completeness. Any test conducted with teammates will be presented as a prototype evaluation rather than representative validation with Philips employees.

---

## 13. Adversarial Validation Incorporated

| Objection | Design Response |
|---|---|
| “This is a form with AI.” | The differentiator is evidence provenance, uncertainty preservation, and reconciliation. |
| “Asset and field-service systems already exist.” | The product acts as a mobile capture layer that can later feed existing systems through structured export. |
| “An observation is not the real inventory.” | Observed quantity, reported total, and consolidated view are stored separately. |
| “Deduplication without a serial number is impossible.” | Ambiguous cases are suggested for review and never merged automatically. |
| “Employees will not accept additional work.” | The target is capture under one minute, one follow-up question, and deferred review for complex conflicts. |
| “Cloud AI could perform the same extraction.” | The experience works inside the hospital without connectivity or transmission of sensitive observations. |
| “QVAC only changes the architecture.” | Local execution enables immediate capture and complete offline usefulness; this will be demonstrated in airplane mode. |
| “Old equipment represents a sale.” | The application identifies information to verify and does not infer purchase intent. |
| “Local automatically means secure.” | The prototype will avoid sensitive content in logs and document storage/export behavior; local inference addresses only part of the security risk. |
| “Isolated data does not create corporate visibility.” | Structured export will be included, with future synchronization documented separately from inference. |

---

## 14. Implementation Plan

### Phase 1: QVAC Technical Spike

- Run basic inference on the physical phone.
- Process 20 representative observations.
- Validate structured output, latency, and stability.
- Select the model, quantization, and parameters.

**Exit criterion:** The local workflow produces processable data with sufficient performance for the demo.

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
- SQLite persistence.

**Exit criterion:** A complete visit can be recorded without connectivity.

### Phase 4: Reconciliation

- Find existing candidate assets.
- Present matches and contradictions.
- Confirm, reject, or leave a link unresolved.
- Update the consolidated view without duplicating assets.

**Exit criterion:** The three-MRI demonstration case still contains three assets after the new observation.

### Phase 5: Views and Business Value

- Customer-level installed-base view.
- Observation history and supporting evidence.
- Aggregate dashboard.
- List of stale, unknown, or contradictory data to verify.
- Structured export.

**Exit criterion:** The application turns a captured observation into a concrete follow-up action.

### Phase 6: Evaluation and Delivery

- Run the evaluation dataset.
- Measure accuracy, errors, latency, and user effort.
- Document hardware, model, quantization, parameters, and limitations.
- Prepare the repository and reproducible setup instructions.
- Record the five-minute demo.

**Exit criterion:** Another evaluator can reproduce the workflow and understand its limitations.

---

## 15. Proposed Five-Minute Demo

| Time | Content |
|---|---|
| 0:00–0:30 | Current problem and business consequence for Philips. |
| 0:30–0:50 | Physical device, model, and airplane mode. |
| 0:50–1:35 | Capture an ambiguous observation. |
| 1:35–2:20 | Show extraction, supporting evidence, statuses, and prioritized question. |
| 2:20–3:15 | Reconcile against existing inventory without duplicating equipment. |
| 3:15–4:00 | Show the hospital view and information requiring verification. |
| 4:00–4:30 | Show aggregate information across hospitals. |
| 4:30–5:00 | Present metrics, privacy evidence, reproducibility, and value proposition. |

---

## 16. Deliverables

- Public repository under an approved permissive license.
- Prototype source code.
- Reproducible synthetic dataset.
- Installation and execution instructions.
- Declared hardware, operating system, model, and quantization.
- Prompts used by the application.
- Structured performance log with model load, prompts, token counts, TTFT, and throughput where applicable.
- Functional evaluation results.
- Known limitations.
- Demonstration video of no more than five minutes.
- Disclosure of external components and any remote API unrelated to inference.

---

## 17. Risks and Pending Decisions

| Risk or Decision | Action |
|---|---|
| Target phone and available memory | Confirm before the technical spike. |
| Model and quantization | Select using measured accuracy and performance. |
| Invalid structured output | Use schema validation, controlled retry, and manual correction. |
| Unsupported values generated by the model | Require supporting text and measure unsupported fields. |
| Insufficient mobile performance | Reduce context/model size or activate the Electron contingency. |
| Philips' actual internal validation rules are unknown | Document prototype rules as configurable assumptions. |
| Corporate synchronization is outside MVP scope | Implement export and document a future integration path. |
| Limited schedule | Prioritize the core workflow and reconciliation before voice, vision, or conversational analytics. |

---

## 18. Definition of Done

The prototype is complete when it:

- Runs all core inference locally through QVAC.
- Completes the core workflow in airplane mode.
- Extracts all required fields and allows corrections.
- Preserves unknown and estimated values.
- Retains the original text, author, and date.
- Distinguishes observed quantity from reported total quantity.
- Processes a repeated observation without duplicating inventory.
- Shows the installed base by hospital and basic aggregation across customers.
- Produces an explainable list of information to verify.
- Includes measured results, known limitations, a repository, and reproducible setup instructions.
- Can be demonstrated clearly within five minutes.

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

The first implementation ticket will be the QVAC spike on the physical device because it determines the remaining architecture and demo feasibility.

Reference: [Matt Pocock's AI Hero skills workflow](https://www.aihero.dev/skills-grill-with-docs)
