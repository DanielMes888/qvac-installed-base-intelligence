# E4 bounded topology comparison

Status: **no topology selected**

This comparison is limited to documentation and two small integration probes. It does not build an Electron application or a browser interface. The real inference measurements in [e4-run-v1.json](e4-run-v1.json) apply to the common same-computer Node/Bare QVAC host, so they do not establish a renderer choice.

## Evidence

- The installed `@qvac/sdk` 0.19.0 package exposes `@qvac/sdk/electron-forge`; the probe resolved it and recorded the `@electron-forge/plugin-base` peer range in [e4-topology-probe.json](e4-topology-probe.json).
- A native Node process bound a test service to `127.0.0.1`, accepted the configured local origin, rejected a foreign origin, and shut down cleanly in the same probe. The test service did not invoke QVAC or contain observation data.
- QVAC's [Electron tutorial](https://docs.qvac.tether.io/tutorials/electron/) places `@qvac/sdk` in the main process, uses a context-isolated preload IPC bridge, and documents the Forge packaging plugin and native-addon packaging constraints.
- QVAC's [JS/TS SDK guide](https://docs.qvac.tether.io/js-ts-sdk/) supports a Node host, and the official documentation exposes an HTTP-server topology. Project decision Q22 additionally requires loopback-only binding, restricted origins, and coordinated shutdown if that topology is selected.

## Comparison

| Criterion | Electron with QVAC in main process | Browser plus same-computer native host |
| --- | --- | --- |
| QVAC feasibility | Official documented integration path; SDK export for Forge packaging resolves. | The real E4 harness already proves the native Node/Bare host. Browser transport remains a separate loopback API. |
| Isolation boundary | Renderer has no direct Node access; a narrow preload IPC bridge exposes only required operations. | Browser is separated by HTTP; host must bind only to `127.0.0.1`, restrict origins, and validate every request. |
| Packaging effort | Requires Electron, Forge integration, native addon bundling, `asar` handling, and Windows verification. | Avoids bundling Chromium but must package/launch the native host, select a port, open the browser, and coordinate two lifecycles. |
| Startup and shutdown | One application lifecycle can load/unload QVAC and close the worker. | Host lifecycle is separate from browser tabs; stale processes and port conflicts need explicit handling. |
| Demo reliability | One window and one process tree are easier to narrate, but packaging has more native moving parts. | Development setup is light, but the demo depends on host readiness, origin/port agreement, and a browser tab. |
| Offline/privacy fit | Same-computer IPC can avoid a listening socket. | Meets the boundary only with loopback-only binding and no external fetches or telemetry. |
| Evidence still missing | Packaged Windows startup, shutdown, and QVAC inference smoke test. | Browser-to-host startup, shutdown, origin enforcement, and real QVAC request smoke test. |

## Decision consequence

E4 failed its structured-output and latency gates, so a post-E4 platform ADR cannot be accepted. Ticket 02 and every platform-dependent ticket remain blocked. If a follow-up feasibility run later passes, the ADR should choose using one packaged Electron main/preload smoke and one browser/loopback-host smoke; neither requires a full interface.
