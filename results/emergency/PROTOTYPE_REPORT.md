# Emergency prototype result

Status: **WORKING BOUNDED PROTOTYPE; E4 REMAINS FAILED**

The project owner authorized a deadline exception on 2026-09-10. [ADR 0006](../../docs/adr/0006-use-time-constrained-browser-prototype.md) records the provisional topology and does not change either E4 result. The original [E4](../feasibility/E4_FAILURE_REPORT.md) and [E4-v2](../feasibility/E4_V2_FAILURE_REPORT.md) failure reports remain unchanged.

## Working flow

1. The user selects one of three fictional customers.
2. The loopback-only Node host saves the original synthetic observation to `.local/workspace.json` before inference.
3. The host invokes real `@qvac/sdk` 0.19.0 with cached `QWEN3_1_7B_INST_Q4` on the same laptop GPU.
4. The raw compact JSON result uses short fields and a source ID. Deterministic code validates its schema, rejects length-stopped output, and expands the source ID into exact note offsets and evidence text. Final Draft Claims therefore include offsets; the fallback model response itself uses the shorter source reference rather than numeric offsets.
5. Every atomic claim remains a Draft Claim with no preselected decision. Before review completion, the user may correct six approved fields while preserving the original QVAC value and then explicitly accepts or rejects each final value.
6. Accepted identifying evidence produces ranked candidate records. The user explicitly links the observation to an existing record; no record is created automatically.
7. The customer view refreshes without duplicate equipment growth and shows verified/provisional records, unlinked evidence, captured notes, and the top three verification items.
8. The limited aggregate dashboard shows verified and provisional record counts separately and groups seeded records by modality.

## Configuration

| Item | Value |
| --- | --- |
| SDK | `@qvac/sdk` 0.19.0 |
| Model export | `QWEN3_1_7B_INST_Q4` |
| Artifact | `Qwen3-1.7B-Q4_0.gguf`, revision `d7f544eead698dbd1f15126ef60b45a1e1933222` |
| Quantization | Q4_0 |
| Model checksum | `c876f159707a4e4f70e045106c69db15bfc935a4981706fd4f65c6e7ea1e81c5` |
| Runtime | Node 22.17.0; GPU request with 99 GPU layers; 4096-token context |
| Prompt | `prototype-equipment-extraction-v9` |
| Generation | temperature 0, top-p 1, seed 20260910, maximum 250 generated tokens, `reasoning_budget: 0`, at most one retry |
| Output path | `json_object` first attempt; compact raw JSON for the single allowed retry |
| Lifecycle | One model load is reused; startup performs one local warmup before capture |
| Hardware | Windows 11 Home 10.0.26200; Ryzen 5 8645HS; about 16 GB RAM; RTX 4050 Laptop GPU with 6,141 MiB VRAM |
| Topology | Responsive browser UI; loopback-only Node host; local JSON workspace; same computer |

The prompt is versioned in [adapter.mjs](../../src/qvac/adapter.mjs). The model identity and checksum were established and locally verified by E4-v1; weights remain outside the repository.

## Contract decision and evidence

The preferred one-tool contract failed in the bounded probe: none of three diagnostic notes produced the required single `record_equipment` call. A JSON-schema grammar also failed in the SDK. Per the owner instruction, the prototype uses compact raw JSON and performs deterministic validation and source expansion. All attempts and failures are retained under this directory:

- `compact-contract-probe.json`: tool-call and initial fallback attempts.
- `simple-json-grammar-probe.json`: failed grammar probe.
- `simple-json-no-grammar-probe.json` and `simple-json-strict-probe.json`: preserved fallback iterations.
- `simple-json-probe.json`: final three-note diagnostic probe; 3/3 structurally valid, with serious semantic errors on two complex cases.
- `demo-smoke.json`: final real-QVAC vertical-slice evidence.
- `clarification-smoke.json`: successful bounded real-QVAC v9 clarification workflow with one question, two inferences, separate answer evidence, conservative review, and unchanged installed base; answer incorporation remains limited.
- `performance-baseline.json`: preserved five-case baseline.
- `performance-prompt-v9-warm.json`: selected five-case v9 benchmark result.
- `correction-smoke.json`: deterministic public-seam correction workflow using a controlled Draft Claim; it is provenance and workflow evidence rather than model-quality evidence.
- `freshness-priority-smoke.json`: deterministic evidence-freshness, prioritization, filtering, recalculation, and relationship workflow using a controlled adapter.

The smoke note was: `Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.` The selected v9 real local run produced one compact item and five supported atomic claims with department scope. Its single attempt recorded:

| Metric | Result |
| --- | ---: |
| Cached model load | 5,591.96 ms |
| Startup warmup | Completed before capture |
| End-to-end extraction | 558.78 ms |
| Prompt tokens | 639 |
| Generated/emitted tokens | 56 / 56 |
| TTFT | 105.04 ms |
| Throughput | 132.98 tokens/s |
| Backend | GPU |
| Retry | None |

The scripted smoke used the actual loopback HTTP endpoints with the production real-QVAC adapter. Its reviewer accepted only exact supported values, found seeded record `nb-mri-01` with a match score of 3, and explicitly reconciled it. Northbridge remained at two equipment records before and after reconciliation. This scripted reviewer is test evidence for the seam; the browser requires a person to make the decisions.

The Spanish product-clarity pass keeps this adapter, compact raw-JSON contract, canonical values, and reconciliation behavior unchanged. It translates the browser presentation and rehearsed observation, adds the problem/solution/value framing, and exposes the same workflow as six narrated steps. The same real adapter returned all five supported claims for the Spanish note in one attempt.

The subsequent operational UI pass moves the pitch into the README and demo guide. The application now separates capture, review and reconciliation, installed-base records, and prioritized verification into focused workspaces. The normal workflow hides tokens, source offsets, internal IDs, and raw model output. Each extracted datum begins without a selected decision, and the completion action remains disabled until a person explicitly accepts or rejects every datum. This changes presentation and interaction only; the QVAC adapter, prompt, compact contract, persistence, and reconciliation rules remain unchanged.

## Bounded QVAC v9 optimization result

The optimization used the five fixed synthetic cases in `performance-benchmark-v1.json`; it does not replace E4 or constitute a held-out accuracy evaluation. The selected candidate retains startup warmup, loaded-model reuse, `reasoning_budget: 0`, `json_object` output, and one compact raw-JSON retry only after an invalid first attempt.

| Measure | Preserved baseline | Selected v9 |
| --- | ---: | ---: |
| Schema-valid cases | 5/5 | 5/5 |
| Semantic-checklist passes | 2/5 | 5/5 |
| Unsupported identities or quantities | Present | 0 |
| Explicit cases without a question | 4/4 | 4/4 |
| Useful ambiguity question | 0/1 | 1/1 |
| Location-scope inspection | Not a selection gate | Four department cases `dept`; ambiguous site case `site` |
| First measured extraction | 20,662.13 ms | Startup warmup separated from capture |
| Five warm extraction range | 480.58–20,662.13 ms | 578.72–855.50 ms |
| Warm median | 555.60 ms | 600.34 ms |

Prompt/configuration iterations remain preserved rather than overwritten. v2–v6 failed one or more structural, semantic, unsupported-value, clarification, or latency checks. v7 with `json_object` was the previous best at 5/5 structural and semantic checklist passes with five sub-second warm runs, but the primary smoke exposed `site` where Radiología required `dept`. v8 corrected the department scopes but lost the ambiguity question. v9 retained the v8 scope correction and restored the single useful clarification, so v9 is selected. The failed v7 primary smoke remains in `demo-smoke-prompt-v7-failed.json`; E4 and E4-v2 remain failed and unchanged.

## Bounded clarification result

The clarification lifecycle stores one substantive answer as a dated Evidence Entry before one final local extraction. Skip and unknown outcomes make the initial drafts final without another inference. A successful final extraction replaces active drafts while both attempt records remain available; a failed final extraction exposes no active drafts. Review is blocked while clarification is pending and is always required after it finishes. No clarification action updates the installed-base working view.

`npm.cmd run smoke:clarification` exercised v9 with a synthetic quantity-scope ambiguity. The initial GPU extraction succeeded in 768.09 ms, returned one concise Spanish question, and identified unknown quantity scope. The answer was stored as a dated Evidence Entry before a second and final 760.54 ms inference. The application exposed no second question, retained both attempt records, conservatively rejected the three final claims, and kept accepted-claim and equipment-record counts unchanged. The second output repeated the initial unknown quantity scope instead of applying the answer as an explicit site total; therefore the real smoke validates question generation, lifecycle bounds, provenance, and safety, but not complete semantic incorporation of the answer.

## Reviewer-correction result

Each active Draft Claim preserves its original QVAC value, current reviewed value, evidence reference, original and reviewed certainty, review status, and correction history. Corrections are limited to equipment type, manufacturer, model, quantity, quantity scope, and certainty before review completion. Quantity and enums are validated; malformed input is rejected. A correction still requires explicit acceptance or rejection.

Every correction records a timestamp, the local demonstration reviewer, field, previous and corrected values, and an optional reason. When the corrected value is absent from the original observation, the workspace creates a separate `reviewerCorrection` Evidence Entry and labels the reviewer as its source. It does not rewrite the original QVAC evidence or attribute the new value to the model.

`npm.cmd run smoke:correction` used the controlled Draft Claim `DS-Zero`, corrected it to the source-supported `DS-One`, retained both values and the original source offsets, required explicit acceptance, matched `nb-mri-01`, and reconciled without increasing Northbridge's two equipment records. The controlled adapter makes this a deterministic workflow check; the real-QVAC behavior remains evidenced by `demo-smoke.json`.

## Evidence freshness and verification priority

Observations now preserve an optional observation date separately from their evidence-recorded timestamp. Equipment records derive their latest evidence timestamp and latest known observation date from linked Observations and Evidence Entries. The UI renders **Registrada hoy**, **Hace X días**, or **Fecha de observación desconocida** and never derives an equipment expiration date or labels old evidence as incorrect.

Open Verification Items receive deterministic `high`, `medium`, or `low` states rendered as **Alta**, **Media**, and **Baja**. High reasons cover conflicting evidence, unknown identity, ambiguous/conflicting/unknown-scope quantity, and unresolved reconciliation conflicts. Medium reasons cover estimated information, unsupported reviewer corrections, missing manufacturer/model, and materially old or undated evidence. Consistent reported information awaiting confirmation is Low. Unknown observation dates sort first within equal priority, followed by the oldest evidence. The list exposes filters for priority, customer, equipment, and reason, and each item retains links to its supporting Evidence Entries and equipment record.

The 90-day materially-old threshold is a configurable prototype rule. It is not official Philips policy, does not expire a record, and does not imply that older information is wrong. Recalculation never marks an item Resolved or creates an equipment record.

## Offline result

The smoke run first attempted a short external npm-registry request, which failed, and then completed cached model loading, real QVAC inference, review, reconciliation, customer-view generation, and aggregate generation in the same process. The application has no cloud inference, delegated inference, telemetry, upload, or non-loopback server binding. This demonstrates the bounded workflow under the command environment's restricted network access; it is not a general operating-system security audit.

## Local Workspace data control

The supporting prototype now exposes a compact **Datos y privacidad** workspace. `workspace-export-v1` produces a validated local JSON snapshot with fictional customers, Observations, Evidence Entries, sanitized inference-attempt metadata, Draft Claims and review decisions, correction history, equipment records, reconciliation links, Verification Items, and the permitted aggregate. Stable local identifiers retain provenance. Internal `rawOutput`, `validatedDraft`, and invalid model content are not exported.

Whole-Workspace deletion requires the exact confirmation `ELIMINAR`, offers export first, and replaces only the configured runtime JSON state with empty collections. The empty state survives restart. The distinct **Restablecer demostración** action recreates the frozen synthetic fixture. The deterministic smoke uses an isolated temporary directory, records and denies non-loopback request attempts, verifies protected-file hashes, and reports no model-cache or recursive-deletion operation. See `results/emergency/export-delete-smoke.json`. This is bounded privacy evidence, not a security audit.

## Essential demo-readiness pass

The application was reset and started at `127.0.0.1:4173`. The page, synthetic notice, capture/review controls, customer view, verification panel, aggregate panel, and data-control workspace loaded. The complete suite now passes 50/50, including the v9 configuration, recorded semantic/clarification/location-scope gates, focused clarification, reviewer correction, freshness, priority, export, confirmed deletion, restart persistence, path safety, filtering, and no-side-effect coverage.

The running application then processed the rehearsed note through its production loopback API and real QVAC adapter. It saved the note, produced five Draft Claims, required review of all five, suggested `nb-mri-01`, and linked the repeated evidence. Northbridge had two equipment records before and after the link, the selected MRI gained one evidence reference, three verification items were returned, and the aggregate reported three verified and two provisional records. Reset restored zero observations and zero new evidence links.

A controlled invalid-output test confirms that terminally invalid QVAC output leaves the original note visible with Failed status, creates no Draft Claims, and changes neither accepted evidence nor equipment-record count. The browser now refreshes the saved-note count before showing success or failure. A discovered port-conflict startup crash was replaced with an actionable message explaining how to close the prior server or choose another loopback port.

Automated browser surfaces were unavailable, so visual layout, click behavior, and disconnected presentation remain the project owner's manual checks in [DEMO_GUIDE.md](../../docs/DEMO_GUIDE.md).

## Timebox record

The emergency work began at 15:38:36 -05:00. Phases overlapped where one tracer slice supplied the next phase, and all remained below their ceilings.

| Phase | Recorded active interval | Result |
| --- | --- | --- |
| Compact contract probe | Start through final fallback probe: at most 12 minutes 39 seconds | Within 30 minutes |
| Application skeleton | Final contract decision through working loopback server: at most 6 minutes 22 seconds | Within 30 minutes |
| Core workflow and views | Built in the same tracer interval; boundary hardening continued through 16:11:23 | Within 2.5 hours and 1 hour respectively |
| Tests, real smoke, report, and review | 15:57:37 through final validation | Within 1 hour |

The total active emergency implementation and validation interval remained under 33 minutes at the last recorded validation checkpoint. Model invocations are included; no new model was downloaded.

## Commands

```powershell
npm.cmd run reset
npm.cmd start
```

Then open `http://127.0.0.1:4173` on the laptop.

```powershell
npm.cmd test
npm.cmd run smoke:demo
npm.cmd run smoke:correction
npm.cmd run smoke:freshness
npm.cmd run smoke:export-delete
```

## Known limitations

- E4 remains failed: the 1.7B model did not meet the frozen 20-note structural, semantic, or latency requirements. The compact three-note diagnostic probe still showed omission, negation, attachment, and quantity-scope errors.
- The successful smoke uses one deliberately simple synthetic sentence and cannot support an accuracy claim.
- Deterministic validation establishes structure and evidence bounds, not semantic truth. Human review is the semantic gate, and no choice is preselected.
- The raw fallback applies one source type, certainty, location scope, and evidence reference to all atomic claims derived from an equipment row. It is suitable for the rehearsed uniform sentence but can flatten mixed-certainty statements; those outputs require rejection in this prototype.
- The dedicated v9 real-model clarification smoke produced one useful question and completed the bounded two-inference lifecycle, but its second output did not incorporate the answer as an explicit total; human review remains necessary.
- Reviewer correction supports only the six approved fields and a single local reviewer attribution. It does not provide general record editing, identity verification, or multi-user authorization.
- Freshness has one configurable 90-day prototype band and date-based tie-breaking. No real Philips freshness policy or operational threshold has been validated.
- Local persistence is a single JSON file written through a completed temporary file followed by replacement. The prototype now supports validated local JSON export and explicit whole-Workspace deletion; it still has no migrations, encryption, authentication, synchronization, import, observation-level deletion, or production recovery guarantees.
- The prototype has no packaging, phone access, full E7 evaluation, user experiment, or comprehensive compliance/reproduction result.
- Browser visual automation was unavailable in the execution environment. The HTTP page and full API seam were exercised automatically; final display rehearsal still needs a project-owner browser check on the laptop.
