# Local OCR Feasibility Report

Date: 2026-09-11

Ticket: `docs/tickets/official-stretch-goals/05-prove-local-ocr-feasibility.md`

Outcome: OCR feasibility failed

## Decision

The selected local QVAC OCR route correctly recognized every required token, including the declared Spanish characters, in all six required synthetic cases and also in the deliberately difficult diagnostic case. It ran from verified local cached weights, recorded zero requests at the instrumented JavaScript `fetch` boundary, removed every task-scoped temporary image directory, and left the seed and active Workspace byte-for-byte unchanged.

The gate nevertheless fails for three independent reasons. The predeclared maximum warm extraction time was 5,000 ms; measured warm wall-clock times were 11,915-12,220 ms. Model redistribution rights were not established by this spike. The harness did not perform packet-level or native-socket auditing, so zero instrumented `fetch` attempts is not enough to claim absence of every possible external request. Neither thresholds nor evidence requirements were relaxed.

The corrected run retained at least 939,319,296 bytes of free whole-system memory and therefore passed the predeclared 512 MiB resource floor. The preserved earlier run sampled only 1,896,448 free bytes at its minimum. These are whole-system observations influenced by concurrent Windows activity, not process-isolated peaks; the variation remains a material demo risk.

Ticket 06 therefore remains blocked. No Photo-assisted capture UI, image intake, Observation handoff, QVAC extraction, or persistence was implemented.

## Engine and execution boundary

- `@qvac/sdk@0.19.0` public `loadModel` and `ocr` APIs.
- Transitively installed `@qvac/ocr-ggml@0.21.0`, Apache-2.0.
- EasyOCR-compatible GGML pipeline: CRAFT detector plus Latin CRNN recognizer.
- CPU backend requested, six threads.
- Evaluated run used absolute paths to the already-cached GGUF files. Registry descriptors were not used during the offline run.
- Global `fetch` was denied and counted; the run executed in the tool's restricted-network sandbox. Observed request count at that instrumented boundary: 0.
- Packet-level and native-socket auditing were not performed. The `noExternalRequests` gate therefore remains false; the evidence establishes a cached local execution path, not exhaustive network absence.

## Results by fixture

The deterministic threshold was at least 80% of the fixture's predeclared required tokens. Formatting-only punctuation differences are normalized; words and digits are not corrected or inferred.

| Fixture | Required | Token recall | Wall time (ms) | Engine total (s) | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Clear image | Yes | 100% | 11,988.575 | 11.977 | PASS |
| Small text | Yes | 100% | 11,947.947 | 11.936 | PASS |
| Low contrast | Yes | 100% | 12,031.245 | 12.019 | PASS |
| Slight rotation | Yes | 100% | 11,915.146 | 11.903 | PASS |
| Multiple lines (Spanish) | Yes | 100% | 12,219.674 | 12.208 | PASS |
| Alphanumeric | Yes | 100% | 11,998.963 | 11.987 | PASS |
| Deliberately difficult | Diagnostic | 100% | 12,504.697 | 12.493 | PASS |

Initialization was 1,982.180 ms. The first extraction was 11,827.110 ms and had 100% token recall. Deterministic adapter tests cover unsupported formats, empty OCR output, cancellation, timeout, engine failure, and recovery without requiring another real model run.

Exact OCR text, blocks, confidence values, bounding boxes, checksums, and per-case timing are preserved in `ocr-local-feasibility.json` in this directory. The earlier unfavorable run remains separately preserved as `ocr-local-feasibility-v1-pre-review-failed.json`.

## Privacy, temporary files, and mutations

- All seven PNGs are generated synthetic labels with fictitious manufacturers, models, serials, modalities, and years.
- Each evaluated image was copied into a dedicated `qvac-ocr-feasibility-*` directory under the Windows temporary directory.
- Cleanup code verifies the resolved directory is under the OS temporary root and has the task prefix before recursive removal.
- All temporary task directories were absent after each success or error path.
- Runtime images were not stored in the Workspace or export.
- Explicit simulated `reviewed` and `cancelled` decisions both removed their temporary image before return; neither path persisted image bytes or OCR text.
- SHA-256 of `data/prototype/seed.json` and `.local/workspace.json` matched before and after; zero Observations, Equipment Records, and exports were created.
- OCR text remains untrusted draft content. This experiment does not establish label authenticity, physical identity, certainty, or Philips policy.

## Resource observations

| Measure | Observed bytes |
| --- | ---: |
| Physical memory | 16,390,729,728 |
| Free before | 4,876,132,352 |
| Minimum free sampled | 939,319,296 |
| Free after | 4,929,241,088 |
| Parent Node RSS before | 75,485,184 |
| Parent Node peak RSS | 180,584,448 |
| Parent Node peak delta | 105,099,264 |

The Bare worker is not included in parent RSS. The whole-system delta is therefore retained as an approximate upper observation, not attributed entirely to OCR.

## Reproduction

1. Generate the frozen synthetic fixtures with `npm.cmd run feasibility:ocr:fixtures`.
2. Review `docs/OCR_ACQUISITION_AND_LICENSE.md` and acquire the exact cached models with `npm.cmd run feasibility:ocr:acquire` only when network acquisition is authorized.
3. Disconnect or block network access and run `npm.cmd run feasibility:ocr`. The evaluated path resolves only absolute local model files.
4. Run `npm.cmd test -- test/stretch-goals/ocr-feasibility.test.mjs` and then `npm.cmd test`.

## Limitations and smallest owner decision

- The fixture set is synthetic, printed Latin text in PNG files; it does not establish performance on real labels, glare, handwriting, damaged tags, mobile camera capture, or confidential environments.
- Offline evidence confirms cached local model resolution under restricted network and zero instrumented `fetch` attempts; it does not include packet or native-socket capture.
- Memory sampling is whole-system and affected by other Windows processes. The preserved earlier run demonstrates substantial variability.
- Model redistribution was not authorized or established; weights remain an external verified cache.
- No browser file-picker, preview, review/edit/cancel UI, or downstream capture seam exists.

Smallest next decision: keep Ticket 06 blocked, or explicitly authorize a separate bounded investigation of performance, native-network auditing, model-license provenance, and/or an alternative local candidate. Do not implement Photo-assisted capture from this failed gate.
