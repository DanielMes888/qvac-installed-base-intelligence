# Local OCR Candidate and Acquisition Review

Date: 2026-09-11

Scope: Ticket 05 feasibility only. This review does not authorize or implement Photo-assisted capture.

## Declared environment

- Windows 11 Home `10.0.26200`, x64.
- AMD Ryzen 5 8645HS, 12 logical processors.
- 16,390,729,728 bytes physical memory (15.27 GiB); approximately 2.4 GiB was free during the pre-acquisition inspection.
- Project runtime Node.js `22.17.0`; npm `10.9.2`.
- No Tesseract CLI, ImageMagick, or current OCR application dependency was installed. `@qvac/ocr-ggml@0.21.0` was already present transitively through the pinned `@qvac/sdk@0.19.0` lockfile.

## Candidate inventory before acquisition

| Candidate | Exact reviewed version | Official source and license | Package/model size | Windows and Node path | Offline and memory assessment | Native/runtime and redistribution risk | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QVAC GGML OCR through `@qvac/sdk` | SDK `0.19.0`; `@qvac/ocr-ggml` `0.21.0`; `OCR_CRAFT` + `OCR_LATIN` registry snapshots dated 2026-05-14 | [QVAC repository](https://github.com/tetherto/qvac); package `LICENSE` and `NOTICE`: Apache-2.0, with EasyOCR Apache-2.0, GGML MIT, and OpenCV Apache-2.0 notices | Installed package: 524,306,060 bytes across all platform prebuilds; Windows x64 addon: 95,968,256 bytes. Weights: 83,133,856 + 15,396,512 = 98,530,368 bytes | Shipped Windows x64 Bare prebuild; public SDK `loadModel`/`ocr` contract; PNG, JPEG, and BMP | Absolute cached weight paths permit local execution after acquisition. CPU mode was selected. Memory had to be measured because the package documents no laptop-specific ceiling. | Native Bare addon. Exact notices must accompany redistribution; model redistribution rights are not separately asserted by this spike, so weights remain external cache artifacts and are not committed. | Selected: already locked, no new package, smallest path that preserves the repository's QVAC-SDK inference rule. |
| Tesseract.js | `tesseract.js@7.0.0`, `tesseract.js-core@7.0.0` | [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0 | npm metadata: API package 1,411,341 unpacked bytes; core 45,262,431 unpacked bytes; language data additional and not acquired in the first review | Node worker thread/WebAssembly; no native executable | Can run offline only when worker, WASM core, and language data are all supplied locally; defaults may fetch language data. Runtime memory was not measured in the first review. | Adds nine package dependencies and a second inference stack outside the existing QVAC adapter. Local asset packaging and language-data licensing/notices required separate work. | Initially rejected; subsequently authorized by the owner as the second and final Ticket 05 candidate. |
| Native Tesseract | `5.5.1` reviewed; not installed | [Tesseract](https://github.com/tesseract-ocr/tesseract), Apache-2.0; Windows installation guidance points to third-party UB Mannheim builds | Installer, language-pack size, and runtime memory remained unknown before acquisition | Native CLI/C++ and language packs; Node requires subprocess or binding | Local after installation, but reproducible Windows distribution is not first-party in the upstream installation guide. | Native binary and Leptonica; third-party Windows binary provenance and packaging must be reviewed. | Rejected before acquisition because the required Windows binary/size/provenance was not sufficiently bounded. |
| PaddleOCR | `paddleocr@3.0.3` documentation reviewed; not installed | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), Apache-2.0 | Official PP-OCRv6 tiny detector/recognizer figures: 1.9 MB + 4.4 MB; Python/Paddle runtime and total install size not bounded here | Python/Paddle rather than the project's Node/QVAC path; Windows issues are documented upstream | Local model directories can support isolated operation; runtime memory not measured | Python runtime, Paddle native wheels, model acquisition, and redistribution add an unreviewed second ML stack. | Rejected before acquisition because total package/native footprint and Node integration were not bounded. |
| EasyOCR Python | `easyocr@1.7.2`; not installed | [EasyOCR](https://github.com/JaidedAI/EasyOCR), Apache-2.0 | Upstream users report multi-GB packaged PyTorch footprints; exact install/model footprint on this laptop was not acquired | Python/PyTorch; Windows possible but no Node integration in the repository | Can cache models locally; memory not measured | PyTorch/native packaging and model downloads are substantially larger than the already-installed QVAC path. | Rejected before acquisition on footprint and integration risk. |

Unknown sizes or memory figures are deliberately recorded as unknown; they were not guessed or downloaded merely to make the comparison look complete.

## Selected acquisition

The owner-requested session authorized acquisition only after comparison. The selected pair was fixed before download:

| Registry descriptor | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `OCR_CRAFT` | `craft_mlt_25k.gguf` | 83,133,856 | `74501993caf4581ce09b280f49a1b3d249c0f5a78496e047718b398457a875aa` |
| `OCR_LATIN` | `latin_g2.gguf` | 15,396,512 | `dd1c7a436e9175904e63683e939635892f45c8c6377d5e14e87cf8b175e10768` |

- Download source: QVAC registry via the public `@qvac/sdk` model descriptors.
- Measured acquisition plus model-load time: 223,546.9853 ms.
- Cache: the normal user-local `.qvac/models` cache; weights are excluded by `.gitignore` and are not redistributed by this repository.
- Both cached files matched the registry sizes and SHA-256 values before evaluated OCR.
- No dependency was added to `package.json` or `package-lock.json`.

## Safety conclusion

The selected engine has a clear code license, a supported Windows x64 binary, verified model bytes, and a reproducible SDK interface. This is sufficient to run the experiment, not to claim model redistribution rights or production suitability. The measured outcome and the separate latency/resource gate are recorded in `results/feasibility/OCR_FEASIBILITY_REPORT.md`.

## Tesseract.js v2 pre-acquisition review (2026-09-11)

This is the separately authorized second and final candidate review for Ticket 05. It does not replace the QVAC review or its failed result, change the frozen fixtures or thresholds, authorize a third OCR technology, or authorize Photo-assisted capture. No package, worker, core, or traineddata artifact was installed or downloaded while preparing this section.

### Exact versions and official sources

The proposed package pins are `tesseract.js@7.0.0` and `tesseract.js-core@7.0.0`. The Tesseract.js release is the current v7 release and records its relaxed-SIMD speed work and removal of Node 14 support; its own README states that v7 requires Node 16 or newer. [Tesseract.js v7.0.0 release](https://github.com/naptha/tesseract.js/releases/tag/v7.0.0) [Tesseract.js v7 README](https://github.com/naptha/tesseract.js/blob/v7.0.0/README.md) [npm registry metadata for `tesseract.js@7.0.0`](https://registry.npmjs.org/tesseract.js/7.0.0)

`tesseract.js@7.0.0` declares `tesseract.js-core` with the range `^7.0.0`; the controlled install must nevertheless add both packages at exact `7.0.0` and verify the resolved lockfile version rather than relying on that range. [Pinned Tesseract.js package manifest](https://github.com/naptha/tesseract.js/blob/v7.0.0/package.json) [npm registry metadata for `tesseract.js-core@7.0.0`](https://registry.npmjs.org/tesseract.js-core/7.0.0)

The language-data source is the official signed `tesseract-ocr/tessdata_fast` tag `4.1.0`, commit shown by the release as `6572757`. The release states that these files work with Tesseract 4.0 and newer. A release tag is used instead of mutable `main`. [tessdata_fast 4.1.0 release](https://github.com/tesseract-ocr/tessdata_fast/releases/tag/4.1.0)

### License review and redistribution boundary

| Component | License established from its own official source | Redistribution conclusion for this experiment |
| --- | --- | --- |
| `tesseract.js@7.0.0` | Apache-2.0 in both the pinned package manifest and repository license. [Manifest](https://github.com/naptha/tesseract.js/blob/v7.0.0/package.json) [License](https://github.com/naptha/tesseract.js/blob/v7.0.0/LICENSE.md) | Compatible at the package level, subject to Apache-2.0 conditions and the ordinary inventory of its npm dependencies. |
| `tesseract.js-core@7.0.0` | Apache-2.0 in both the pinned core manifest and repository license. The core repository says its dependencies, including Tesseract, are under `third_party` and that the distributed core is a WebAssembly compilation. [Core manifest](https://github.com/naptha/tesseract.js-core/blob/v7.0.0/package.json) [Core license](https://github.com/naptha/tesseract.js-core/blob/v7.0.0/LICENSE) [Core repository structure](https://github.com/naptha/tesseract.js-core/tree/v7.0.0) | Compatible at the npm-package declaration level. Preserve its license and complete the normal transitive/compiled-component notice inventory before a product release; this bounded review is not a legal opinion or a chain-of-title audit. |
| `eng.traineddata` and `spa.traineddata` from `tessdata_fast@4.1.0` | Apache-2.0 established independently of the engine: the repository README explicitly says all data in the repository are Apache-2.0, the tag contains its own Apache-2.0 license, and both files are repository-root data artifacts. [Tagged README](https://github.com/tesseract-ocr/tessdata_fast/blob/4.1.0/README.md) [Tagged license](https://github.com/tesseract-ocr/tessdata_fast/blob/4.1.0/LICENSE) [`eng.traineddata`](https://github.com/tesseract-ocr/tessdata_fast/blob/4.1.0/eng.traineddata) [`spa.traineddata`](https://github.com/tesseract-ocr/tessdata_fast/blob/4.1.0/spa.traineddata) | The upstream license permits redistribution subject to Apache-2.0 section 4, including providing the license, marking modified files, retaining applicable notices, and carrying a NOTICE if the work includes one. The models will still remain ignored acquisition artifacts for this spike rather than being committed. |

The traineddata conclusion does **not** assume that a model inherits the engine license. It rests on the model repository's own global declaration. There is no per-file license sidecar or granular upstream inventory of the copyright, training datasets, or fonts for `eng` or `spa`; therefore the review establishes the repository's explicit Apache-2.0 grant, not a more detailed provenance chain.

**License gate: pass for controlled acquisition.** The model license can be established from the official model repository and is compatible with the repository's Apache-2.0 licensing. This permits the experiment to proceed; it is not an instruction to publish or commit model bytes.

### Published sizes and pre-acquisition identifiers

The npm values below came from exact-version registry metadata queried with `npm.cmd view`; the package tarballs were not fetched. npm publishes both a SHA-1 `dist.shasum` and a SHA-512 Subresource Integrity value. The unpacked size is a registry declaration and must be compared with the installed file tree after acquisition. [Tesseract.js npm page](https://www.npmjs.com/package/tesseract.js/v/7.0.0) [Tesseract.js core npm page](https://www.npmjs.com/package/tesseract.js-core/v/7.0.0)

| npm artifact | Registry unpacked bytes | Files | Registry SHA-1 | Registry SHA-512 integrity |
| --- | ---: | ---: | --- | --- |
| `tesseract.js-7.0.0.tgz` | 1,411,341 | 79 | `4106fb6245efab40c57b94bc1798368807526be8` | `sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA==` |
| `tesseract.js-core-7.0.0.tgz` | 45,262,431 | 22 | `596aa1ab5c130adab12f21059e6aa1a1cecc0bab` | `sha512-WnNH518NzmbSq9zgTPeoF8c+xmilS8rFIl1YKbk/ptuuc7p6cLNELNuPAzcmsYw450ca6bLa8j3t0VAtq435Vw==` |

For Node, the default worker entry is the local package file `src/worker-script/node/index.js`; the pinned source reports 771 bytes. That is only the entry file, not the complete worker dependency footprint. The Node adapter launches it with `node:worker_threads`. [Node worker default](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker/node/defaultOptions.js) [Node worker entry](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/node/index.js) [Worker spawn implementation](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker/node/spawnWorker.js)

For the required LSTM-only mode, `tesseract.js-core@7.0.0` includes scalar, SIMD, and relaxed-SIMD WebAssembly variants and Tesseract.js selects among them after feature detection. The table records official tag metadata for the raw `.wasm` and Node-loadable `.wasm.js` payloads; only one LSTM variant should be loaded in a given worker. [Pinned core package contents](https://github.com/naptha/tesseract.js-core/blob/v7.0.0/package.json) [Node core selection](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/node/getCore.js) [Official GitHub contents metadata](https://api.github.com/repos/naptha/tesseract.js-core/contents?ref=v7.0.0)

| LSTM core variant | Raw `.wasm` bytes | `.wasm.js` bytes |
| --- | ---: | ---: |
| Scalar | 2,855,361 | 3,896,484 |
| SIMD | 2,857,601 | 3,899,472 |
| Relaxed SIMD | 2,862,266 | 3,905,767 |

Only `eng` and `spa` are justified for the frozen fixture set. Most required tokens are English/technical Latin text, while `multiple-lines` expressly requires the Spanish forms `AÑO`, `REVISIÓN`, and `PANAMÁ`; using both is the smallest conservative combination and does not add `osd` or another language. The exact tag sizes and Git blob identifiers come from the official GitHub contents API. A Git blob identifier is not a SHA-256 checksum of the raw file and must not be reported as one. [Official tagged model metadata](https://api.github.com/repos/tesseract-ocr/tessdata_fast/contents?ref=4.1.0)

| Model artifact | Tagged bytes | Git blob identifier | Acquisition URL |
| --- | ---: | --- | --- |
| `eng.traineddata` | 4,113,088 | `bbef4675053b5b468cdb477053e28b1c698ba08e` | [`tessdata_fast/4.1.0/eng.traineddata`](https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/eng.traineddata) |
| `spa.traineddata` | 2,294,433 | `72e901f13ca52cfe34cf239a368b9ed3c0ddaf26` | [`tessdata_fast/4.1.0/spa.traineddata`](https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/spa.traineddata) |
| **Total** | **6,407,521** | n/a | n/a |

Because acquisition has not occurred during this review, compressed npm byte counts, installed worker/core byte counts, and individual SHA-256 values are deliberately pending. The acquisition step must record the source URL, received bytes, elapsed download time, and SHA-256 for each npm tarball or installed package evidence, worker entry, actually loaded core payload, and traineddata file; then compare npm integrity and tagged sizes before the offline run. No Git blob identifier above substitutes for that acquired-byte SHA-256 evidence.

### Node 22 and Windows x64 assessment

Node `22.17.0` satisfies Tesseract.js v7's documented Node 16-or-newer floor. Tesseract.js describes itself as running on Node and wrapping Tesseract as WebAssembly; its Node implementation uses the built-in `worker_threads` API, and the core package lists WebAssembly payloads rather than a Windows-native addon. [Tesseract.js v7 README](https://github.com/naptha/tesseract.js/blob/v7.0.0/README.md) [Node worker implementation](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/node/index.js) [Core package files](https://github.com/naptha/tesseract.js-core/blob/v7.0.0/package.json)

The resulting pre-acquisition assessment is **compatible in principle with Node 22 and Windows x64, pending execution on the declared laptop**. This is an inference from the documented Node floor and architecture-neutral JavaScript/WebAssembly path, not an upstream Windows-x64 certification claim. Exact relaxed-SIMD availability, runtime memory, worker startup, and OCR behavior remain measurements for the v2 harness.

### Controlled fully local installation and offline strategy

1. Install exact package versions through the lockfile-producing command `npm.cmd install --save-exact tesseract.js@7.0.0 tesseract.js-core@7.0.0`; reject any resolved version other than `7.0.0` and record npm integrity, installed sizes, and SHA-256 evidence.
2. Acquire only `eng.traineddata` and `spa.traineddata` from the immutable reviewed commit into the ignored, task-specific directory `.local/feasibility/ocr/tesseract-v2/tessdata_fast-<revision>/`. Verify exact byte counts and acquired SHA-256 before use. Do not use a mutable branch URL, the Project Naptha language CDN, or jsDelivr.
3. Resolve and record absolute local paths at runtime: `workerPath` to the repository-owned `scripts/feasibility/ocr/tesseract-offline-worker.cjs` wrapper, which installs the shared network deny before loading the upstream `node_modules/tesseract.js/src/worker-script/node/index.js`; `corePath` to `node_modules/tesseract.js-core`; and `langPath` to the task-specific model directory. Set `gzip: false` because the official tag artifacts are uncompressed `.traineddata`, and set a non-writing cache policy (`cacheMethod: 'none'`) unless the harness supplies a task-scoped cache that it inventories and removes. The API documents these path/cache/gzip controls and warns that omitting `langPath` downloads language data from a CDN. [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/api.md) [Local installation guidance](https://github.com/naptha/tesseract.js/blob/v7.0.0/docs/local-installation.md)
4. Treat `corePath` carefully on Node v7: the public option is present, but the pinned Node `getCore` implementation selects `tesseract.js-core/...` through local CommonJS resolution and does not consume its `corePath` argument. Therefore the harness must both pass the explicit absolute local option required by this ticket **and** assert with `require.resolve` that the actually selected core module and payload remain inside the pinned local `node_modules/tesseract.js-core` directory. [Node core loader](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/node/getCore.js)
5. Create exactly one worker, recognize every frozen fixture through that worker, and terminate it once in a `finally` path. Upstream explicitly recommends one worker for multiple images followed by one termination. [Worker lifecycle guidance](https://github.com/naptha/tesseract.js/blob/v7.0.0/README.md)
6. Tesseract.js v7 performs core load, language load, and initialization inside asynchronous `createWorker` before it resolves. Separate timings therefore must be derived from timestamped worker progress/status transitions and the outer `createWorker` interval, without pretending that deprecated `loadLanguage` or `initialize` calls still define the current API. [Worker creation sequence](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/createWorker.js)
7. Before the offline phase, deny and record `globalThis.fetch` and the worker's fetch boundary, reject any `http:` or `https:` resource string, and fail if worker, core, or traineddata resolution escapes the declared local roots. Tesseract.js' Node worker uses built-in `fetch` when available, otherwise `node-fetch`, so instrumentation must cover the worker context rather than only the parent global. [Node worker fetch selection](https://github.com/naptha/tesseract.js/blob/v7.0.0/src/worker-script/node/index.js)
8. Place image copies and any optional Tesseract cache only under freshly created OS-temporary directories with the bounded `qvac-ocr-feasibility-` or `tesseract-ocr-v2-` prefixes. Resolve and validate the exact directory before recursive cleanup, close the worker first, remove the harness directory in `finally`, and verify absence afterward. The persistent acquired models remain only in the ignored `.local/feasibility/ocr/tesseract-v2/` directory.

This strategy establishes a local-resource design and an instrumentable no-CDN boundary. Observing zero fetch attempts will mean only that no calls were seen at the instrumented JavaScript boundaries; it will not be described as a complete socket or packet-level audit unless a separate OS-level socket audit is actually performed.

## Tesseract.js v2 acquisition and measured runtime (2026-09-11)

The license gate above passed before acquisition. The exact installed package is `tesseract.js@7.0.0`; `package-lock.json` resolves its `tesseract.js-core` dependency to exactly `7.0.0`. npm recorded the same SHA-512 integrities and unpacked sizes reviewed above. Thirteen packages were added and two existing package installations changed by npm's local install operation; no cloud OCR service or runtime endpoint was introduced.

The acquired language bytes use the immutable `tessdata_fast` commit `87416418657359cb625c412a48b6e1d6d41c29bd`. The `eng` and `spa` Git blobs and raw bytes match those documented for tag `4.1.0`; using the full commit makes the evaluated URL immutable. The exact commit also contains the repository-wide Apache-2.0 `LICENSE`. The models remain under ignored `.local/feasibility/ocr/tesseract-v2/` storage and are not committed.

| Acquired artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `eng.traineddata` | 4,113,088 | `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2` |
| `spa.traineddata` | 2,294,433 | `6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464` |
| Local offline-worker wrapper | 231 | `070081510e806489937368545a6eb1f62d2fd886175490353fccf67aa09918cf` |
| Local network-boundary module | 1,783 | `49a6a4970af9eca122202d36c84b37536da3ba8b7ace29c1758b74bd802e5853` |
| Upstream Node worker entry | 771 | `a973c23ce067bc752c0bf602297eac843098e531ac03f3ea34cdf694326a6d02` |
| Selected relaxed-SIMD LSTM wrapper | 89,360 | `a37ac78b707e8d5d3d2e532cc3c4e69b04d127ea44a608f1e7de17640402aa5c` |
| Selected relaxed-SIMD LSTM WASM | 2,862,266 | `7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545` |

`eng` is retained for the predominantly English/technical identifiers in the frozen fixtures; `spa` covers the explicitly Spanish tokens. No other language or orientation model was acquired. The harness passes absolute local worker/core/language paths, `gzip:false`, and `cacheMethod:'none'`; it additionally verifies the Node-resolved core artifacts because upstream Node v7 ignores `corePath` when selecting its CommonJS core module.

The valid offline run used Node `22.17.0` on Windows x64, selected the relaxed-SIMD LSTM core, reused one worker, and observed zero calls at the instrumented parent and worker fetch, HTTP(S), net, TLS, and DNS boundaries. It did not perform packet capture. Full measured results and the QVAC comparison are in `results/feasibility/OCR_FEASIBILITY_REPORT.md` and `results/feasibility/ocr-tesseractjs-feasibility-v2.json`.

The installed API-package tree was fingerprinted as SHA-256 `8bc813c179d0b986123ae47f90fac442763dc54c90f37cce37d99798df0a11d9`; the installed core-package tree was `d908999751e0ca0c59ea342c4982fdf3b277ada2502e601399bc7544d42e259b`. The acquisition-time record, including source URLs, timestamps, received sizes, and checksums, is preserved separately as `results/feasibility/tesseract-acquisition-v2-initial.json`; later cache verifications do not overwrite it.
