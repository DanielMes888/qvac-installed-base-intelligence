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
| Generation | temperature 0, top-p 1, seed 20260910, maximum 250 generated tokens, at most one retry |
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
- `clarification-smoke.json`: dedicated real-QVAC clarification attempt; initial extraction succeeded but produced no question, so the bounded workflow stopped before a second inference.
- `correction-smoke.json`: deterministic public-seam correction workflow using a controlled Draft Claim; it is provenance and workflow evidence rather than model-quality evidence.

The smoke note was: `Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.` The real local run produced one compact item and five supported atomic claims. Its single attempt recorded:

| Metric | Result |
| --- | ---: |
| Cached model load | 6,178.20 ms |
| End-to-end extraction | 28,099.20 ms |
| Prompt tokens | 247 |
| Generated/emitted tokens | 60 / 60 |
| TTFT | 26,055.11 ms |
| Throughput | 63.69 tokens/s |
| Backend | GPU |
| Retry | None |

The scripted smoke used the actual loopback HTTP endpoints with the production real-QVAC adapter. Its reviewer accepted only exact supported values, found seeded record `nb-mri-01` with a match score of 3, and explicitly reconciled it. Northbridge remained at two equipment records before and after reconciliation. This scripted reviewer is test evidence for the seam; the browser requires a person to make the decisions.

The Spanish product-clarity pass keeps this adapter, compact raw-JSON contract, canonical values, and reconciliation behavior unchanged. It translates the browser presentation and rehearsed observation, adds the problem/solution/value framing, and exposes the same workflow as six narrated steps. The same real adapter returned all five supported claims for the Spanish note in one attempt.

The subsequent operational UI pass moves the pitch into the README and demo guide. The application now separates capture, review and reconciliation, installed-base records, and prioritized verification into focused workspaces. The normal workflow hides tokens, source offsets, internal IDs, and raw model output. Each extracted datum begins without a selected decision, and the completion action remains disabled until a person explicitly accepts or rejects every datum. This changes presentation and interaction only; the QVAC adapter, prompt, compact contract, persistence, and reconciliation rules remain unchanged.

## Bounded clarification result

The clarification lifecycle stores one substantive answer as a dated Evidence Entry before one final local extraction. Skip and unknown outcomes make the initial drafts final without another inference. A successful final extraction replaces active drafts while both attempt records remain available; a failed final extraction exposes no active drafts. Review is blocked while clarification is pending and is always required after it finishes. No clarification action updates the installed-base working view.

`npm.cmd run smoke:clarification` exercised the unchanged real adapter with a synthetic quantity-scope ambiguity. The initial GPU extraction succeeded structurally in 19,663.81 ms with 272 prompt tokens, 64 generated tokens, 16,476.83 ms TTFT, and 74.24 tokens/s. It returned `x: null`, so deterministic logic presented no question and the smoke stopped before a second inference. This is a preserved failed real-model result, not a clarification pass. The controlled public-seam tests establish workflow behavior; they do not prove that the current model will emit a useful clarification in practice.

## Reviewer-correction result

Each active Draft Claim preserves its original QVAC value, current reviewed value, evidence reference, original and reviewed certainty, review status, and correction history. Corrections are limited to equipment type, manufacturer, model, quantity, quantity scope, and certainty before review completion. Quantity and enums are validated; malformed input is rejected. A correction still requires explicit acceptance or rejection.

Every correction records a timestamp, the local demonstration reviewer, field, previous and corrected values, and an optional reason. When the corrected value is absent from the original observation, the workspace creates a separate `reviewerCorrection` Evidence Entry and labels the reviewer as its source. It does not rewrite the original QVAC evidence or attribute the new value to the model.

`npm.cmd run smoke:correction` used the controlled Draft Claim `DS-Zero`, corrected it to the source-supported `DS-One`, retained both values and the original source offsets, required explicit acceptance, matched `nb-mri-01`, and reconciled without increasing Northbridge's two equipment records. The controlled adapter makes this a deterministic workflow check; the real-QVAC behavior remains evidenced by `demo-smoke.json`.

## Offline result

The smoke run first attempted a short external npm-registry request, which failed, and then completed cached model loading, real QVAC inference, review, reconciliation, customer-view generation, and aggregate generation in the same process. The application has no cloud inference, delegated inference, telemetry, upload, or non-loopback server binding. This demonstrates the bounded workflow under the command environment's restricted network access; it is not a general operating-system security audit.

## Essential demo-readiness pass

On 2026-09-10, the application was reset and started at `127.0.0.1:4173`. The page, synthetic notice, capture/review controls, customer view, verification panel, and aggregate panel loaded. The complete test suite now passes 37/37, including focused clarification and reviewer-correction coverage.

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
```

## Known limitations

- E4 remains failed: the 1.7B model did not meet the frozen 20-note structural, semantic, or latency requirements. The compact three-note diagnostic probe still showed omission, negation, attachment, and quantity-scope errors.
- The successful smoke uses one deliberately simple synthetic sentence and cannot support an accuracy claim.
- Deterministic validation establishes structure and evidence bounds, not semantic truth. Human review is the semantic gate, and no choice is preselected.
- The raw fallback applies one source type, certainty, location scope, and evidence reference to all atomic claims derived from an equipment row. It is suitable for the rehearsed uniform sentence but can flatten mixed-certainty statements; those outputs require rejection in this prototype.
- The accepted second-inference clarification lifecycle is implemented, but its dedicated real-model smoke did not receive a clarification candidate from the current 1.7B model.
- Reviewer correction supports only the six approved fields and a single local reviewer attribution. It does not provide general record editing, identity verification, or multi-user authorization.
- Local persistence is a single JSON file written through a completed temporary file followed by replacement. It has no migrations, encryption, authentication, synchronization, import/export, deletion workflow, or production recovery guarantees.
- The prototype has no packaging, phone access, full E7 evaluation, user experiment, or comprehensive compliance/reproduction result.
- Browser visual automation was unavailable in the execution environment. The HTTP page and full API seam were exercised automatically; final display rehearsal still needs a project-owner browser check on the laptop.
