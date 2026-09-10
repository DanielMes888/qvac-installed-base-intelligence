# QVAC platform evidence

Researched 2026-09-10. This is fact-finding for product grilling, not a platform decision, technical specification, or completed feasibility experiment. No SDK, model, application, or benchmark was installed or run. Official web pages are mutable; pin and recheck an exact release before a future spike.

Subsequent decision: grilling round 4 selects this Windows laptop for the assigned E4 spike, excludes delegated inference and SDK downgrades to restore it, and defers the choice of Electron versus same-computer browser/native host until validation. Mobile is future work. The earlier candidate comparisons and experiment outline below are research history; the current assignment, gates, and scope are in [GRILLING_RECORD.md](../GRILLING_RECORD.md) and [ADR 0003](../adr/0003-run-qvac-on-the-workspace-computer.md). No spike has run.

## Findings that affect the next decision

**Windows with a native QVAC host is documented and this computer is a plausible candidate, but runnable compatibility remains unverified. Pure browser-local execution is not established. P2P delegation is version-sensitive: the current v0.19.0 release notes explicitly remove it.**

| Route | Source-backed capability | Remaining feasibility question |
| --- | --- | --- |
| Windows desktop | Windows 10+ x64 is listed. The Electron tutorial calls `@qvac/sdk` from its main process and connects the renderer through IPC. | Native worker startup, packaging, GPU selection, model fit and end-to-end quality on this computer. [Requirements](https://docs.qvac.tether.io/system-requirements/), [Electron tutorial](https://docs.qvac.tether.io/tutorials/electron/) |
| Local web UI plus native host | QVAC documents an HTTP server wrapping SDK calls, defaulting to `127.0.0.1:11434`, with explicit trusted CORS origins. A browser can be the interface while inference runs in a native process on the same computer. | Packaging/startup, browser-to-local-host access and verification that the chosen request path invokes QVAC locally. This is a candidate composition, not a built application. [HTTP server](https://docs.qvac.tether.io/cli/http-server/) |
| Browser-local inference | Documented JS runtimes are Node.js, Bare and Expo; underlying inference runs in a Bare worker. No standalone browser/WebGPU/WASM execution path for `@qvac/sdk` was established in the inspected docs. | Do not assume a static website can run this SDK directly. This is a documentation gap, not proof of impossibility. [JS/TS SDK](https://docs.qvac.tether.io/js-ts-sdk/), [How it works](https://docs.qvac.tether.io/about/how-it-works/) |
| Mobile | Android 12+ arm64 and iOS 17+ arm64 are documented through Expo; physical devices are required, with emulators unsupported. | No phone hardware selected or inspected; native build/deployment, memory, latency and app lifecycle remain untested. [Requirements](https://docs.qvac.tether.io/system-requirements/), [Expo setup](https://docs.qvac.tether.io/js-ts-sdk/#expo) |
| Peer inference | Older official documentation describes delegating inference to another device. Current v0.19.0 release notes remove provider mode, DHT delegation and related options. | Select an exact supported release and establish event eligibility before treating this as available. A network-connected inference peer is distinct from a local browser UI. [Older official explanation](https://qvac.tether.io/blog/one-sdk-for-all-of-your-ai/), [v0.19.0 changes](https://docs.qvac.tether.io/reference/release-notes/#delegated-inference-removed) |

The JS/TS page requires Node >=22.17, npm >=10.9, Bare >=1.24 when targeted, and Expo >=54 for mobile. It specifies native Expo prebuild and BareKit/plugin setup. The lower Node >=18 requirement on the system page concerns the CLI; it should not override the SDK requirement. [JS/TS requirements](https://docs.qvac.tether.io/js-ts-sdk/#requirements), [System requirements](https://docs.qvac.tether.io/system-requirements/)

## Hardware evidence from this computer

Read-only inspection used PowerShell `Get-CimInstance` with only selected OS/hardware/storage fields, executable version metadata, `nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader`, and filtered `vulkaninfo --summary`. CIM access was initially denied in the sandbox and succeeded after escalation. No usernames, device serials, UUIDs or network credentials were collected in this record. Free capacity is a transient snapshot, not a reservation.

| Item | Observed |
| --- | --- |
| OS | Windows 11 Home, 10.0.26200/build 26200, x64 |
| CPU | AMD Ryzen 5 8645HS with Radeon 760M Graphics; 6 cores, 12 logical processors |
| Physical RAM | 15.27 GiB OS-reported usable total; 3.46 GiB free at capture |
| Discrete GPU | NVIDIA GeForce RTX 4050 Laptop GPU; 6141 MiB total VRAM, 5158 MiB free; driver 592.82 |
| Integrated GPU | AMD Radeon(TM) Graphics; Windows driver 32.0.11020.6003 |
| Vulkan | Loader 1.4.321; NVIDIA API 1.4.325; AMD API 1.3.280 |
| Workspace drive | C: 475.65 GiB total, 102.64 GiB free |
| Existing Node | Executable file version 22.15.0, below documented SDK >=22.17; no runtime invocation or upgrade performed |
| Other tools | npm command present but version unverified; `adb` not found on PATH; no claim about installations elsewhere |

`vulkaninfo` exited 0 but emitted an error for a missing third-party Vulkan layer manifest and a warning that the AMD switchable-graphics layer exposes API 1.3 to a 1.4 application. These observations require a future runtime check; they do not establish a QVAC failure. CIM's `AdapterRAM` value was not used as authoritative NVIDIA capacity; the vendor query above supplied VRAM.

QVAC requires Vulkan >=1.4 on Windows even for CPU-only inference. The discrete adapter meets the advertised API version; the integrated adapter does not. This comparison supports trying the discrete GPU, not predicting model capacity or speed. [Windows requirements](https://docs.qvac.tether.io/system-requirements/#windows)

## Version and source limitations

- The inspected docs label v0.19.0 latest and expressly remove delegated inference. Older official blog material still describes it. The fetched GitHub `main` package manifest and npm page showed 0.18.2, illustrating that search/source snapshots and current documentation can diverge. Do not mix snippets across releases or claim that a package version has been locally verified. [Release notes](https://docs.qvac.tether.io/reference/release-notes/), [SDK package manifest](https://github.com/tetherto/qvac/blob/main/packages/sdk/package.json), [npm package](https://www.npmjs.com/package/%40qvac/sdk)
- P2P model distribution and blind relays remain documented separately from inference delegation. Downloading weights from peers does not mean prompts are processed by peers. [Introduction](https://docs.qvac.tether.io/introduction/#p2p-capabilities), [Blind relays](https://docs.qvac.tether.io/p2p-capabilities/blind-relays/)
- No authoritative hackathon-specific P2P eligibility rules or identifiable event were established. The supplied challenge brief contains no QVAC rules. User-stated constraints guide this project, but competition compliance requires the applicable organizer source; do not infer event identity from unrelated QVAC hackathons.

## Offline and privacy boundaries to settle

For same-device execution, model acquisition/setup can be separate from the disconnected core workflow: the SDK supports loading from a local model path. A later test must restart and infer with networking unavailable and artifacts already present. Download success is not offline-inference proof. [Model loading API](https://docs.qvac.tether.io/reference/api/#loadmodel)

A browser UI and native host on one computer can use loopback without public internet; this is an architectural inference from the documented HTTP server. A phone browser accessing another computer is cross-device inference even if the connection is LAN-only. P2P without cloud still needs a reachable peer and sends inference input beyond the capture device. Therefore “no cloud,” “no public internet,” and “no data leaves this device” must be tested and described separately. LAN-only peer discovery and cold-start behavior are unverified. [HTTP server](https://docs.qvac.tether.io/cli/http-server/), [Older delegation explanation](https://qvac.tether.io/blog/one-sdk-for-all-of-your-ai/)

## Smallest future validation outline

Proposed experiments only; owner, deadline, numerical gates and failure response still require interview decisions.

1. Name the actual execution computer/phone and exact SDK version; resolve the Node mismatch and, if relevant, permitted peer topology before building UI.
2. After implementation authorization, use a minimal `@qvac/sdk` harness to load one pinned small model, record the actual backend/device, run a few representative evidence-extraction cases, unload and restart. Capture startup failures, load time, RAM/VRAM and inference timing; the SDK exposes profiling facilities. [Profiler](https://docs.qvac.tether.io/runtime/profiler/)
3. Repeat after disconnecting the intended network boundary, using pre-existing local weights. Check both cold start and repeated inference. Expand to the planned 20 representative observations only after the basic path works; schema validity and supported evidence are separate from model loading.
4. Validate the selected UI's connection to that same host and packaged restart. If pursuing peers, first establish version support and organizer permission, then use two named devices to test connection, actual execution location, peer loss and permitted fallback. Do not label a peer-dependent path fully offline.

These checks can support a later platform decision. No platform, model, architecture, or passing performance result is selected by this note.
