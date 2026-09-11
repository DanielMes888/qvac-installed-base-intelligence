# Official Stretch Goals Implementation Plan

Status: accepted by the project owner on 2026-09-11. This document defines future implementation units; it does not itself authorize implementation, publish tickets, or change any existing ticket status.

Names introduced only in this plan, including `Evidence Confidence Score` and `Potential Engagement Signal`, are provisional planning labels rather than approved glossary terms. Settle their final names and entity boundaries before publishing the extension specification or tickets; this plan does not amend `CONTEXT.md`.

## Decision and authority

The stored Philips challenge brief separates its Minimum Viable Prototype from eight optional Stretch Goals. The project owner has decided to attempt the five goals that are not complete in the bounded emergency prototype, as recorded in [ADR 0007](adr/0007-attempt-five-remaining-official-stretch-goals.md). This is a voluntary demonstration extension, not a new minimum requirement.

The existing emergency core remains the baseline. E4 and E4-v2 remain failed. ADR 0006 remains the authority for the provisional browser and loopback Node topology. The twelve formal tickets retain their current states and blocking edges. The owner approved this plan on 2026-09-11; implementation still requires separately published extension tickets in a later session.

## Verified classification of the eight official goals

| Official Stretch Goal | Classification on 2026-09-11 | Evidence boundary |
| --- | --- | --- |
| Voice capture | Pending | No voice capture or local transcription path exists. |
| Photo-assisted capture | Pending | No image intake or OCR path exists. Existing supporting-label terminology is not photo capture. |
| Duplicate detection | Implemented in the bounded prototype | Candidate matching plus explicit conservative reconciliation can link repeated evidence without equipment-record growth. It is not automatic identity resolution or generalized deduplication. |
| Confidence scoring | Partially covered | Certainty states, verification priority, freshness, and candidate-match scores exist, but there is no user-facing explainable score based on completeness, recency, and independent corroboration. |
| Data freshness | Implemented in the bounded prototype | Observation and recorded dates, latest evidence, a configurable 90-day rule, and explained verification priority are visible. This is not a Philips policy or proof that old information is false. |
| AI follow-up questions | Implemented in the bounded prototype | One useful Spanish clarification may be asked, with one optional final inference and explicit safety limits. The recorded v9 second inference retained unknown quantity scope, so semantic incorporation is not guaranteed. |
| Natural-language analytics | Pending | The application exposes fixed customer and aggregate views only; it has no natural-language query path. |
| Opportunity identification | Pending | Verification Items identify evidence gaps, not refresh, upgrade, engagement, revenue, purchase intent, or sales opportunities. |

## Requirements that remain distinct

- **Minimum challenge requirements:** natural-language capture, AI extraction, structured storage, a customer-level view, basic multi-customer aggregation or visualization, and synthetic-data guardrails.
- **Official Stretch Goals:** the eight optional capabilities listed above.
- **Voluntary owner decision:** attempt the five unfinished goals after preserving the emergency core.
- **Prototype limits:** single-user and single-computer; synthetic data only; not an audited inventory, validated Philips workflow, production security boundary, or production product.
- **Final delivery readiness:** still requires approved extension tickets, feature evidence, integration, UI/UX work, regression, clean reproduction, compliance-source completion, and final rehearsal.

Cross-device synchronization is not one of the official Stretch Goals. It remains deferred with shared accounts, backend synchronization, CRM ingestion, cloud inference, and delegated inference.

## Global implementation guardrails

1. Preserve prompt v9, the selected QVAC model and adapter, conservative reconciliation, and every E4/E4-v2 result.
2. Run all evaluated AI, transcription, OCR, and language interpretation on the same computer as the Workspace. Do not add cloud services, remote inference, telemetry, automatic upload, or a hidden network fallback.
3. Use only fictional customers, equipment, labels, images, recordings, questions, and results. Keep the synthetic-data warning visible on every new surface and artifact.
4. Preserve original evidence, source, date, scope, uncertainty, review state, and supporting links. New derived outputs remain proposals until their applicable review gate passes.
5. Never use a confidence score, OCR string, transcript, analytics answer, or opportunity signal to verify identity, upgrade certainty, merge records, or create equipment automatically.
6. Review dependency/model size, source, exact version, license, redistribution terms, expected memory, hardware acceleration, offline behavior, and compatibility before any download or installation.
7. Every feature requires automated tests and a specific smoke. A smoke result is bounded evidence for that feature, not proof of general accuracy.
8. Stop on a failed safety boundary, unexplained provenance loss, unsupported output admission, non-local processing, incompatible dependency, or unbounded resource requirement. Preserve the failure and ask the owner before changing scope.

## Implementation order and rationale

1. **Confidence scoring.** It uses data already present and establishes an explainable evidence-quality input needed by opportunity signals and analytics.
2. **Opportunity identification.** It consumes the score and current evidence/freshness state while keeping commercial conclusions bounded and reviewable.
3. **Natural-language analytics.** It queries the now-stable score and opportunity schemas through a strict read-only plan rather than inventing unsupported answers.
4. **Photo-assisted capture with fully local OCR.** It adds a new input modality only after the downstream evidence and query semantics are stable.
5. **Voice capture with fully local transcription.** It follows the same principle and is last among features because runtime, model size, browser capture, and offline-device behavior are the least certain.
6. **Integration and general UI/UX improvement.** Consolidate the five features into the existing focused workspaces without changing the approved core semantics.
7. **Regression, clean reproduction, and final rehearsal.** Run only after integration; preserve per-feature smokes during implementation and then validate the complete release candidate.

The order is recommended rather than an authorization to begin. A blocked feasibility stage may be deferred without skipping its stop/owner-decision gate or silently moving large dependencies into the project.

## Feature 1 Explainable Confidence Scoring

### Problem and demonstrable value

Categorical Certainty Status describes what a claim asserts, while verification priority describes what deserves attention. Neither answers the brief's separate question: how complete, recent, and independently corroborated is the available evidence? An explainable score helps the user compare evidence quality without pretending to calculate factual probability.

### Minimum verifiable scope

- Calculate a deterministic `Evidence Confidence Score` from three visible components: completeness, freshness, and corroboration.
- Use an initial 0-100 prototype rule: completeness up to 40 points, freshness up to 30, and corroboration up to 30.
- Publish the exact inputs, component points, total, calculation version, and configurable thresholds.
- Score a claim group or equipment record only when its supporting evidence and scope are explicit. Otherwise show unavailable or insufficient evidence rather than inventing a number.

### Visible user behavior

The customer and equipment views show the total, component breakdown, evidence links, calculation date, and a disclaimer that the score is a configurable prototype indicator, not truth, verification, risk, sales probability, or Philips policy.

### Data and entities affected

Derived read-model fields for equipment records and compatible claim groups; existing Observations, Evidence Entries, Accepted Claims, dates, scopes, authors/sources, and calculation-version metadata. The score does not rewrite source entities.

### Safety and provenance rules

- Completeness counts only declared required fields for the scored subject and scope.
- Freshness uses the latest applicable observation date and exposes unknown dates; recorded time cannot substitute silently.
- Corroboration requires compatible evidence with distinct provenance. Repetition by the same source or duplicated text does not count as independent support.
- One Observation earns no independent-corroboration points even when QVAC produces multiple Draft Claims from it.
- Human review or acceptance of a claim does not by itself create independent corroboration.
- The score cannot change Certainty Status, identity status, reconciliation, Verification Items, or equipment counts.
- The score remains separate from Certainty Status, Verification Item priority, human review/acceptance, and verified identity.

### Observable acceptance criteria

- The same frozen Workspace produces the same component and total scores.
- Removing a required field affects only completeness; aging the applicable observation affects only freshness; adding compatible independent evidence affects only corroboration.
- Unknown dates and incompatible scopes are visible and cannot increase the score.
- Every displayed point can be traced to an input and rule version.
- The 40/30/30 weighting is labeled as a configurable prototype rule, not an official Philips metric or statistical probability.
- Deterministic subthresholds for each component are defined and tested in the future implementation ticket before the score is exposed.

### Required automated tests

Component-boundary tests; missing/unknown-date cases; independent-versus-duplicate provenance; incompatible scope; deterministic recalculation; no mutation of certainty, reconciliation, counts, or source evidence; export inclusion only after its schema is approved.

### Required smoke

`confidence-scoring` smoke over a frozen synthetic Workspace showing one complete/recent/corroborated record, one incomplete or stale record, the breakdowns, provenance links, deterministic rerun, and zero installed-base mutation.

### Dependencies

Existing evidence, freshness, source, scope, and record relationships. No new AI model or inference is required.

### Risks

False precision, double-counted corroboration, arbitrary weights, score confusion with certainty, and incentives to optimize the number rather than evidence quality.

### Stop conditions

Stop if the calculation cannot explain every point, treats repeated evidence as independent, hides unknown scope/date, changes a source state, or requires unapproved policy assumptions.

### Explicitly out of scope

Calibrated factual probability, clinical risk, production data-quality SLA, Philips policy, automatic acceptance, identity verification, automatic reconciliation, and sales scoring.

## Feature 2 Bounded Opportunity Identification

### Problem and demonstrable value

The current Verification Items show what evidence needs checking but do not surface the official brief's potential refresh, upgrade, or engagement use case. A bounded signal can demonstrate how evidence might focus a future conversation while avoiding a claim that a sale exists.

### Minimum verifiable scope

- Produce deterministic `Potential Engagement Signals` for fictional sites from reviewed evidence only.
- Support a small allowlist of reasons derived from visible evidence: dated age evidence, incomplete information, reported technology, or a material need for verification.
- Keep each signal separate from Verification Items, equipment records, and accepted facts.
- Allow the user to inspect, dismiss, or leave a signal unreviewed; no automated action follows.

### Visible user behavior

A dedicated view lists the fictional customer, cautious signal label, reason, supporting evidence, relevant dates/scopes, confidence breakdown, limitations, and suggested human verification step. Every result is labeled as a configurable prototype rule. It never displays revenue, probability, value, urgency, purchase intent, clinical need, obsolescence, or a commercial recommendation.

### Data and entities affected

Derived signal records referencing customers, equipment records or claim groups, Evidence Entries, dates/scopes, Confidence Score version, creation time, and review/dismissal state. Source evidence remains unchanged.

### Safety and provenance rules

- Generate signals only from Accepted Claims, Human-Authored Claims, or Trusted Fictional References; never from pending/rejected drafts.
- Unknown or incompatible scope blocks specific refresh/upgrade wording and may yield only an information-verification signal.
- Approximate age remains estimated and dated. Recency alone does not establish current installation.
- Opportunity review never changes claims, equipment, confidence, reconciliation, or Verification Items.
- Exact deterministic thresholds are defined and tested in the future implementation ticket before signals are exposed.

### Observable acceptance criteria

- A frozen qualifying synthetic case yields the expected cautious signal and evidence chain.
- Rejected or draft-only evidence yields no signal.
- Incompatible scope or insufficient confidence yields no specific technology signal.
- Dismissal preserves history and has no downstream side effect.

### Required automated tests

Allowlisted reasons; accepted-versus-draft evidence; age/date handling; incompatible scope; confidence dependency; deterministic generation; dismissal history; no commercial metric or equipment mutation.

### Required smoke

`opportunity-identification` smoke showing one evidence-backed potential engagement signal and one suppressed unsafe case, with all links and zero changes to the installed-base record count.

### Dependencies

Approved Confidence Scoring schema and existing evidence/freshness/reconciliation views.

### Risks

Overstating purchase intent, encoding unvalidated sales policy, stale evidence creating false urgency, and confusing verification work with a commercial opportunity.

### Stop conditions

Stop if a signal cannot cite reviewed evidence, requires market/revenue assumptions, uses incompatible scope, or is presented as a fact or recommendation rather than a hypothesis for human review.

### Explicitly out of scope

Lead scoring, revenue/value estimates, market share, sales probability, automated outreach, CRM actions, recommendation ranking across real customers, clinical-need or obsolescence claims, commercial recommendations, and proof that technology should be replaced.

## Feature 3 Evidence Backed Natural Language Analytics

### Problem and demonstrable value

Fixed filters and aggregates require the user to know the interface structure. The official goal asks for natural-language questions over the installed-base landscape. The prototype should answer only what its local evidence can support and make the query interpretation inspectable.

### Minimum verifiable scope

- Accept Spanish natural-language questions over a strict allowlist of read-only fields, filters, comparisons, and aggregates already supported by the Workspace.
- Use a contract and prompt independent from `prototype-equipment-extraction-v9`. Local QVAC may interpret intent only by producing a validated query plan; deterministic code executes that plan against local structured data.
- Cover customer, fictional geography, modality, approximate age with evidence date, confidence components, freshness, verification state, and Potential Engagement Signals.
- Reject unsupported, unsafe, or write-like requests with a clear Spanish explanation; an ambiguous but potentially supported request may instead ask the user to reformulate it.

### Visible user behavior

The user enters a question and sees the interpreted filters, result rows or allowed aggregate, supporting evidence and dates, uncertainty/scope warnings, and a no-result or cannot-answer state. No answer is presented without the executed plan and traceable records.

### Data and entities affected

Ephemeral query text, validated query-plan metadata, result references, timing, and non-content failure metadata. The operation is read-only and does not create claims, evidence, signals, or records.

### Safety and provenance rules

- All semantic interpretation uses the existing local QVAC boundary; no cloud or delegated inference.
- The plan schema contains allowlisted operations only and cannot execute arbitrary code or SQL.
- Deterministic execution, not model prose, computes counts and filters.
- Answers preserve verified/provisional/unlinked distinctions and never combine incompatible scopes or reported totals.

### Observable acceptance criteria

- Frozen supported questions produce the expected validated plans and record sets.
- The displayed answer cites every contributing local record/evidence group.
- Unsupported commercial or write requests are rejected without mutation.
- The same plan produces the same result on the same Workspace snapshot.

### Required automated tests

Plan-schema validation; allowlist enforcement; injection/write attempts; scope compatibility; empty/ambiguous questions; provenance completeness; deterministic aggregation; no state mutation; controlled-adapter and real-adapter separation.

### Required smoke

`natural-language-analytics` smoke using real local QVAC for one frozen Spanish question, followed by deterministic execution and evidence-backed results; include a rejected unsafe question and verify no Workspace mutation.

### Dependencies

Stable Confidence Scoring and Opportunity Signal schemas, the existing aggregate whitelist, and a separately versioned analytics contract and prompt. `prototype-equipment-extraction-v9` remains unchanged; no prompt v10 or extraction-prompt change is authorized by this plan.

### Risks

Hallucinated narrative answers, prompt injection, unsupported aggregation, leakage of hidden data, query ambiguity, and pressure to broaden into arbitrary analytics.

### Stop conditions

Stop if a validated read-only plan cannot bound the model, if provenance cannot be shown, if the feature needs extraction prompt v9 changes, or if real local inference cannot meet a separately approved latency ceiling.

### Explicitly out of scope

Arbitrary SQL/code execution, writes through chat, external knowledge, cloud search, free-form business recommendations, market share, revenue, cross-customer reported-total summation, and general-purpose chat.

## Feature 4 Photo Assisted Capture With Fully Local OCR

### Problem and demonstrable value

Permitted equipment labels or other visual information may reduce retyping and add inspectable support, but OCR errors and identifiers can create false identity confidence. The feature must demonstrate local assistance, not automatic verification.

### Bounded feasibility stage

Before implementation, evaluate a small set of candidate local OCR paths on the declared laptop. Record exact package/model/version, source, license and redistribution terms, download size, disk and memory use, supported image formats, Spanish/alphanumeric label behavior, offline operation, latency, and Node/browser integration. Use only frozen synthetic images. Do not download or install a large dependency or model until the owner reviews this evidence.

### Minimum verifiable scope

- Accept one user-selected synthetic image of a permitted fictional equipment label.
- Run OCR entirely on the same computer and show the transcript before any downstream use.
- Keep the original image temporary and discard it after the user reviews, submits, or cancels the OCR text.
- Only explicitly reviewed and submitted OCR text may be saved as Observation text and passed to the unchanged local-QVAC capture flow, with provenance `photo-assisted`.

### Visible user behavior

The user selects an image, sees local-processing status, OCR text, engine identity, warnings, and an edit/submit/cancel step. Cancelled text produces no Observation or claim and the temporary image is discarded. Submitted text remains visibly photo-assisted and does not silently merge with typed observation text.

### Data and entities affected

Temporary image state, OCR attempt metadata, reviewed transcript, submit/cancel decision, and Observation capture provenance `photo-assisted`. The original image is not retained or exported after review, submission, or cancellation; only the reviewed and submitted text may enter the persisted Workspace.

### Safety and provenance rules

- Synthetic images only; no patients, real customer labels, real competitors, or hidden uploads.
- OCR output is untrusted draft text. A serial-like string does not verify physical identity.
- Ordinary logs exclude image and transcript content.
- Authenticity of a label and unambiguous equipment identity are never inferred from OCR or user submission.
- Cancellation and failure discard temporary media and text; ordinary Observation deletion governs submitted text and its dependent records.

### Observable acceptance criteria

- A frozen synthetic label is processed offline and the submitted transcript preserves `photo-assisted` provenance without retaining the original image.
- An induced OCR error is visible and correctable before downstream extraction.
- Cancelling OCR creates no Observation, Accepted Claim, retained image, or equipment mutation.
- Network observation shows no non-loopback processing call.

### Required automated tests

File type/size validation; malformed/corrupt image; local-only adapter contract; transcript review; submit/cancel ordering; temporary-image disposal after review, submission, cancellation, and failure; `photo-assisted` provenance; export exclusion of original media; identifiers remain unverified; deterministic controlled OCR fixtures.

### Required smoke

`photo-ocr` smoke over a frozen synthetic image, recording OCR latency, reviewed transcript, local backend, provenance, one controlled error correction, and zero automatic reconciliation.

### Dependencies

Approved feasibility result, dependency/license review, verified temporary-file disposal boundary, and sufficient local memory alongside the existing QVAC model.

### Risks

Large model/dependency size, license ambiguity, memory contention, poor label accuracy, accidental real-data capture, metadata leakage, and false identifier verification.

### Stop conditions

Stop and document a blocker if no candidate works offline on the same computer within reviewed size/memory/license bounds, requires cloud/browser remote APIs, cannot preserve provenance, or destabilizes the existing QVAC path. Request an owner decision before any alternative.

### Explicitly out of scope

General computer vision, patient/document OCR, automatic asset verification, batch image ingestion, camera-device packaging, real manufacturer imagery, remote OCR, and production media governance.

## Feature 5 Voice Capture With Fully Local Transcription

### Problem and demonstrable value

Dictation may make post-visit capture faster, but browser speech APIs cannot be assumed to work offline and transcription mistakes can alter equipment facts. The feature must prove a local, reviewable input path before it is described as available.

### Bounded feasibility stage

Evaluate local transcription candidates and the browser/host audio-capture path on the declared laptop. Record exact engine/model/version, source, license and redistribution, download size, disk/RAM/VRAM use, Spanish support, microphone permissions, offline behavior, latency, transcript quality on frozen synthetic audio, and coexistence with QVAC. Do not download or install a large dependency/model before owner review.

### Minimum verifiable scope

- Capture or select one short synthetic Spanish equipment observation.
- Transcribe entirely on the same computer without browser cloud speech services.
- Keep the original audio temporary and discard it after the user reviews, submits, or cancels the transcript.
- Only explicitly reviewed and submitted transcript text may be saved as Observation text and passed to the unchanged local-QVAC capture flow, with provenance `voice`.

### Visible user behavior

The user starts/stops recording, sees local-processing status and duration, reviews the transcript, corrects it, and submits or cancels before the unchanged observation/QVAC workflow. Cancellation or failure leaves no retained audio, Observation, fabricated transcript, or claim.

### Data and entities affected

Temporary audio state, transcription-attempt metadata, reviewed transcript, submit/cancel decision, and Observation capture provenance `voice`. The original audio is not retained or exported after review, submission, or cancellation; only the reviewed and submitted text may enter the persisted Workspace.

### Safety and provenance rules

- Synthetic speech only; visible warning before microphone use.
- No Web Speech or other browser API may be treated as offline without observed proof; no cloud fallback is allowed.
- Transcript text is user-reviewed input, not verified fact. Corrections preserve transcription provenance.
- Ordinary logs exclude audio and transcript content.
- Cancellation and failure discard temporary audio and text; ordinary Observation deletion governs submitted text and its dependent records.

### Observable acceptance criteria

- Frozen synthetic Spanish audio produces a local transcript and visible timing/backend evidence.
- The user can correct, submit, or cancel before Observation persistence or QVAC inference.
- Microphone denial, cancellation, and transcription failure produce clear states with no retained audio, Observation, or claims.
- Network observation shows no non-loopback transcription call.

### Required automated tests

Audio format/duration validation; permission/failure states; local-only adapter contract; transcript correction and submit/cancel ordering; temporary-audio disposal after review, submission, cancellation, and failure; `voice` provenance; export exclusion of original media; save-before-QVAC ordering; no fallback; controlled audio fixtures.

### Required smoke

`voice-transcription` smoke using frozen synthetic Spanish audio, recording transcription latency, backend, reviewed transcript, handoff to the unchanged capture seam, and absence of non-local requests.

### Dependencies

Approved feasibility and license review, verified temporary-audio disposal boundary, OS microphone access, and a resource budget compatible with the existing QVAC runtime.

### Risks

Cloud-backed browser behavior, model size, memory contention, weak Spanish accuracy, microphone permission variance, audio privacy, latency, and transcript errors becoming equipment claims.

### Stop conditions

Stop and document a blocker if no candidate works offline on the same computer within reviewed size/memory/license bounds, if browser capture cannot be made reliable, if a cloud fallback is unavoidable, or if coexistence destabilizes QVAC. Request an owner decision before any alternative.

### Explicitly out of scope

Continuous listening, speaker identification, call/meeting transcription, multilingual production support, remote transcription, voice biometrics, mobile packaging, and production audio retention governance.

## Integration and UI UX unit

After all non-deferred feature units pass their own automated tests and smokes, integrate them into the existing focused navigation. Preserve the prohibited-data warning, local-QVAC status, synthetic label, capture/review/reconcile boundaries, accessibility, responsive behavior, error recovery, and plain-language uncertainty. Do not redesign domain semantics during visual integration. Full manual tests and the owner rehearsal occur after this unit, as decided on 2026-09-11.

Acceptance requires that each feature is discoverable without crowding the core path; incomplete or blocked features are labeled honestly; loading/failure/review states are visible; and no screen implies production readiness, audited inventory, automatic verification, or guaranteed commercial opportunity.

## Regression clean reproduction and final rehearsal unit

Run the full automated suite, every feature-specific smoke, unchanged primary and clarification smokes, protected-file/hash checks for E4/E4-v2 evidence, offline/network-boundary checks, dependency/license inventory, and a clean-directory reproduction. Then perform the complete project-owner manual test and final rehearsal. Record failures without correcting them during the rehearsal itself.

This unit may conclude only with a traceable release-candidate result and explicit remaining limitations. Passing it does not by itself establish competition compliance; the compliance matrix and authoritative submission sources remain separate gates.

## Future implementation units and publication gate

The future units are: confidence scoring; opportunity identification; natural-language analytics; photo/OCR feasibility; photo-assisted capture; voice feasibility; voice capture; integration/UI/UX; and regression/reproduction/rehearsal. These are planning units, not tickets. They must not be placed into the existing twelve-ticket dependency chain or used to change any existing ticket status.

The owner approved this plan on 2026-09-11. In a later session, decide the structure and publish a separate specification amendment and separate ticket set for this extension. Ticket publication must preserve the local status vocabulary and blocking edges, with feasibility decisions ahead of photo or voice implementation.
