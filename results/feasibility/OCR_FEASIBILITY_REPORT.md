# Local OCR Feasibility Report

Date: 2026-09-11

Ticket: `docs/tickets/official-stretch-goals/05-prove-local-ocr-feasibility.md`

Final outcome: `OCR feasibility passed via Tesseract.js`

## Decision history

1. QVAC OCR was evaluated first and remains `OCR feasibility failed`. It achieved 100% token recall on every required and diagnostic fixture, but failed the unchanged gate because warm extraction took approximately 12 seconds against the 5-second maximum, model redistribution rights were not established, and native-network auditing was incomplete.
2. The owner authorized Tesseract.js as the second and final candidate without changing fixtures or thresholds. `tesseract.js@7.0.0`, its resolved `tesseract.js-core@7.0.0`, and `eng` plus `spa` from an immutable `tessdata_fast` revision passed the license, local-resource, quality, latency, cleanup, memory, and observed-network gates.
3. The hard diagnostic image remains a visible limitation: Tesseract.js recognized 60% of its tokens. It was already marked diagnostic rather than required in the frozen manifest and was not reclassified to obtain a pass.

The exact pre-Tesseract QVAC report is preserved as `OCR_FEASIBILITY_REPORT_V1_QVAC_FAILED.md`. Machine-readable QVAC evidence remains in `ocr-local-feasibility.json` and `ocr-local-feasibility-v1-pre-review-failed.json`. Tesseract history is also additive: `ocr-tesseractjs-feasibility-v2-harness-error.json` preserves the first bookkeeping failure before image recognition; `ocr-tesseractjs-feasibility-v2-pre-review-pass.json` and `ocr-tesseractjs-feasibility-v2-post-review-error-wrapping.json` preserve the initial valid and post-review runs; `ocr-tesseractjs-feasibility-v2-pre-installed-tree-hash-gate.json` preserves the run before complete installed-tree hash enforcement; `ocr-tesseractjs-feasibility-v2-tree-gate-setup-error.json` preserves a subsequent setup-scope error before OCR; and `ocr-tesseractjs-feasibility-v2-pre-atomic-network-install.json` preserves the pass before atomic installation rollback was added to the network deny. None replaced the final `ocr-tesseractjs-feasibility-v2.json`.

Ticket 06 remains blocked pending owner review. This passed feasibility gate does not itself authorize or implement Photo-assisted capture.

## Candidate comparison

| Measure | QVAC OCR | Tesseract.js |
| --- | --- | --- |
| Runtime | `@qvac/sdk@0.19.0` + `@qvac/ocr-ggml@0.21.0` | `tesseract.js@7.0.0` + `tesseract.js-core@7.0.0` |
| Engine/code license | Apache-2.0 package notices | Apache-2.0 for package and core |
| Model license | Redistribution not established by the spike | `tessdata_fast` explicitly licenses its data Apache-2.0 |
| Required fixture recall | 100% for all six | 100% for all six |
| Diagnostic recall | 100% | 60% |
| Initialization | 1,982.180 ms | 205.665 ms total worker/languages/API |
| First extraction | 11,827.110 ms | 141.721 ms |
| Required warm range | 11,915.146-12,219.674 ms | 72.111-87.172 ms |
| Required warm median | 11,993.769 ms | 83.695 ms |
| Minimum free system RAM | 939,319,296 bytes in corrected run; earlier run sampled 1,896,448 bytes | 3,665,596,416 bytes |
| Observed process RSS delta | Parent-only 105,099,264 bytes; excludes Bare worker | 122,744,832 bytes including the Node worker thread at process level |
| Observed network boundary | Zero parent `fetch`; no worker/native-socket instrumentation | Zero attempts across parent and worker fetch, HTTP(S), net, TLS, and DNS instrumentation |
| Final candidate result | Failed | Passed |

Memory figures are samples of a shared Windows machine, not process-isolated hardware guarantees.

## Tesseract.js artifacts and local execution

- npm package: 1,411,341 installed/unpacked bytes; registry SHA-512 integrity `sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA==`.
- npm core: 45,262,431 installed/unpacked bytes; registry SHA-512 integrity `sha512-WnNH518NzmbSq9zgTPeoF8c+xmilS8rFIl1YKbk/ptuuc7p6cLNELNuPAzcmsYw450ca6bLa8j3t0VAtq435Vw==`.
- Installed package-tree SHA-256: `8bc813c179d0b986123ae47f90fac442763dc54c90f37cce37d99798df0a11d9`; installed core-tree SHA-256: `d908999751e0ca0c59ea342c4982fdf3b277ada2502e601399bc7544d42e259b`.
- Local offline-worker wrapper: 231 bytes; SHA-256 `070081510e806489937368545a6eb1f62d2fd886175490353fccf67aa09918cf`.
- Shared local network-boundary module: 1,783 bytes; SHA-256 `49a6a4970af9eca122202d36c84b37536da3ba8b7ace29c1758b74bd802e5853`.
- Selected relaxed-SIMD LSTM wrapper: 89,360 bytes; SHA-256 `a37ac78b707e8d5d3d2e532cc3c4e69b04d127ea44a608f1e7de17640402aa5c`.
- Selected relaxed-SIMD LSTM WASM: 2,862,266 bytes; SHA-256 `7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545`.
- `eng.traineddata`: 4,113,088 bytes; SHA-256 `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2`.
- `spa.traineddata`: 2,294,433 bytes; SHA-256 `6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464`.

The evaluated runtime used absolute local paths for the worker, core package, and both uncompressed language files; `gzip:false` and `cacheMethod:'none'` prevented CDN fallback and runtime language-cache writes. One worker was reused for the first extraction, all warm fixtures, corrupt-image recovery, and the subsequent valid image, then terminated explicitly.

In Node v7 the public `corePath` option is passed but the upstream Node loader selects `tesseract.js-core` through CommonJS resolution. The harness therefore additionally resolves, fingerprints, and verifies the selected local package and relaxed-SIMD artifacts rather than claiming that the option alone proves locality.

## Tesseract.js results by fixture

The unchanged contract requires at least 80% of each required fixture's predeclared tokens. Normalization is NFKD, removal of combining marks, uppercase, and removal of non-alphanumeric characters for comparison only. No image-specific preprocessing was applied.

| Fixture | Gate role | Token recall | Wall time (ms) | Result |
| --- | --- | ---: | ---: | --- |
| Clear image | Required | 100% | 86.461 | PASS |
| Small text | Required | 100% | 72.111 | PASS |
| Low contrast | Required | 100% | 87.172 | PASS |
| Slight rotation | Required | 100% | 81.421 | PASS |
| Multiple lines and Spanish tokens | Required | 100% | 85.256 | PASS |
| Alphanumeric | Required | 100% | 82.134 | PASS |
| Deliberately difficult | Diagnostic | 60% | 79.284 | DIAGNOSTIC FAIL |

Worker/core selection took 2.449 ms, WASM initialization 16.722 ms, language loading 2.299 ms, and API initialization 135.741 ms within the 205.665 ms total create-worker interval. The separate first extraction took 141.721 ms. Exact recognized text, missing diagnostic tokens, hashes, and timings are in `ocr-tesseractjs-feasibility-v2.json`.

## Offline, privacy, cleanup, and mutation evidence

- All images are the original frozen synthetic PNG fixtures. No real hospital, equipment, address, customer, patient, employee, or serial-number data was introduced.
- Worker and parent contexts denied and counted `fetch`, HTTP(S), `net.connect/createConnection`, TLS, and DNS lookup/resolve boundaries. Observed attempts: zero.
- No packet capture was performed. Zero instrumented attempts is not an exhaustive proof about every uninstrumented operating-system activity; Tesseract.js ran from local JavaScript/WebAssembly and local data during the restricted-network command.
- Every runtime image copy was held under an exact task-scoped temporary directory and removed. Review and cancel lifecycle probes both removed the image without persisting image bytes or OCR text.
- The worker terminated explicitly and the harness audit/cache temporary directory was removed.
- SHA-256 and sizes of `data/prototype/seed.json` and `.local/workspace.json` matched before and after. Zero Observations, Equipment Records, or exports were created.
- A corrupt image was rejected; the same worker subsequently processed a valid image successfully.

## Reproduction

1. Generate or verify the frozen fixtures with `npm.cmd run feasibility:ocr:fixtures`.
2. Review `docs/OCR_ACQUISITION_AND_LICENSE.md`.
3. Acquire or verify the exact language artifacts with `npm.cmd run feasibility:ocr:tesseract:acquire` while connected acquisition is explicitly authorized.
4. Run `npm.cmd run feasibility:ocr:tesseract` after network access is unavailable. The evaluated path rejects remote runtime resources.
5. Run `npm.cmd test -- test/stretch-goals/ocr-feasibility.test.mjs test/stretch-goals/tesseract-ocr-feasibility.test.mjs`, then `npm.cmd test`.

## Limitations

- The pass applies only to synthetic, printed Latin text in the frozen PNG set. It does not establish quality on real labels, glare, handwriting, damage, arbitrary camera images, mobile capture, or confidential environments.
- The difficult synthetic diagnostic lost `Z-13` and `MRI`; implementation must not treat OCR text as verified equipment identity.
- Tesseract removed accents in the multiple-line output (`ANO`, `REVISION`, `PANAMA`). The frozen comparison intentionally normalizes diacritics, but UI review must preserve the raw text and require human confirmation.
- The network evidence is broader than the QVAC run but remains instrumentation rather than packet capture.
- Apache-2.0 redistribution requires license/notice compliance and the normal third-party inventory; this feasibility result is not legal advice or production approval.
- npm installation emitted a project-engine warning because the invoking system npm process reported Node 22.15.0 while the pinned harness and tests ran with repository Node 22.17.0. Runtime compatibility was demonstrated on 22.17.0; clean installation reproduction still requires later verification.
- No browser picker, preview, review/edit/cancel UI, capture integration, QVAC extraction handoff, or production persistence was implemented.

Final gate decision: `OCR feasibility passed via Tesseract.js`. Ticket 06 may be considered for a separate owner-authorized transition, but remains blocked in this working tree.
