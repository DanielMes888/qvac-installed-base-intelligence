# E4 real local QVAC feasibility result

Status: **FAIL**

Ticket: [01-prove-real-local-qvac-feasibility.md](../../docs/tickets/philips-customer-installed-base-intelligence/01-prove-real-local-qvac-feasibility.md)

The declared Windows laptop can load and run real `@qvac/sdk` inference locally on its RTX 4050. The frozen E4 configuration fails the mandatory structured-output gate and narrowly fails the latency gate, so it does not authorize a platform ADR, Ticket 02, or platform-dependent implementation.

## Pinned configuration

| Item | Recorded value |
| --- | --- |
| SDK | `@qvac/sdk` 0.19.0, npm integrity pinned in `package-lock.json` |
| Inference package | `@qvac/inference` 0.19.0 |
| LLM addon | `@qvac/llm-llamacpp` 0.49.1 |
| Bare runtime | 1.32.0 |
| Node | 22.17.0, project-local; global 22.15.0 was rejected as below the documented 22.17 floor |
| Model export | `QWEN3_1_7B_INST_Q4` |
| Model source | `unsloth/Qwen3-1.7B-GGUF`, revision `d7f544eead698dbd1f15126ef60b45a1e1933222` |
| Model file | `Qwen3-1.7B-Q4_0.gguf`, 1,056,782,912 bytes |
| Quantization | Q4_0 |
| Model checksum | `c876f159707a4e4f70e045106c69db15bfc935a4981706fd4f65c6e7ea1e81c5`; locally verified |
| Model license | Apache-2.0, as declared by the [model repository](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF) |
| Backend request | GPU, 99 GPU layers, context 4096 |
| Generation | temperature 0, top-p 1, seed 20260910, maximum 700 generated tokens |
| Retry | At most one; generic error-category feedback; seed increments by one |
| Prompt | [e4-equipment-extraction-v1.txt](../../prompts/e4-equipment-extraction-v1.txt) |
| Schema | [e4-draft-claim-set.schema.json](../../schemas/e4-draft-claim-set.schema.json) |
| Frozen input | [e4-manifest-v1.json](../../data/feasibility/e4-manifest-v1.json), 20 synthetic notes |

The SDK version was taken from the live npm registry on 2026-09-10 and matches QVAC's [v0.19 API reference](https://docs.qvac.tether.io/reference/api/). `qvac.config.json` registers only the llama.cpp completion plugin. No delegate option, cloud endpoint, telemetry, or application UI exists in the harness.

## Hardware and runtime evidence

- Windows 11 Home 10.0.26200, x64.
- AMD Ryzen 5 8645HS, 6 physical and 12 logical cores.
- 16,390,729,728 bytes total system memory; 4,308,598,784 bytes free in the later environment snapshot.
- NVIDIA GeForce RTX 4050 Laptop GPU, 6,141 MiB physical VRAM, driver 592.82.
- QVAC reported CUDA and Vulkan support, loaded the model through `llamacpp-completion`, and reported `backendDevice: gpu` for all 36 attempts.
- QVAC measured about 1.62 GB GPU memory in use after model load and exposed a 5.40 GB process budget at that sample.

## Execution controls

The connected acquisition probe downloaded only the pinned model. It took 355.247 seconds. The complete 20-note run then used the cache under the default restricted-network permission profile. As a supplemental control, [e4-offline-network-probe.json](e4-offline-network-probe.json) performs a blocked external-registry check and a successful cached real-QVAC extraction sequentially in one process under that same profile; the network check sent no observation data. All inference and observation content remained on the same computer.

The original note is written to the harness result before inference starts. A deliberately terminated child process recovered its full saved note in [e4-interruption-probe.json](e4-interruption-probe.json). The initial Windows-sandbox `fsync` failure is retained in [e4-harness-failure-01.json](e4-harness-failure-01.json); the bounded fix uses a completed temporary-file write followed by atomic replacement. No application working dataset was created, and invalid model outputs appear only in the synthetic evaluation evidence.

## Gate results

| Gate | Required | Result | Status |
| --- | --- | --- | --- |
| Crash/lost-note safety | No crashes or lost notes | Full run completed; 20/20 original notes persisted; interruption recovery passed | PASS |
| JSON-schema-valid after retry | 20/20 after at most one retry | 11/20 (55%) | **FAIL** |
| First-attempt validity | Report separately | 8/20 JSON-schema-valid; 4/20 also passed deterministic evidence checks | Measured |
| Retry recovery | Report separately | 3 of 12 initial JSON failures became schema-valid; 4 of 16 total retries became admissible | Measured |
| Admissible after deterministic checks | Report separately | 8/20 (40%) | Measured |
| Warm end-to-end latency | At least 19/20 at or below 15 seconds, including retry | 18/20 | **FAIL** |
| Invalid output exclusion | Invalid output does not enter working data | 12 invalid terminal outputs excluded; 8 drafts were only deterministically admissible and no working dataset was created | PASS |
| Offline cached execution | Complete the run without external access | 20/20 cases ran with cached model under restricted-network execution | PASS |
| Real local QVAC | Real SDK, same computer, no delegated/cloud inference | All 36 attempts reported GPU backend | PASS |

## Performance

The cached cold load was 3.069 seconds. The complete run took about 244.6 seconds from start through unload and result publication.

| Metric | Min | Median | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Case latency including retry (ms) | 3,204 | 12,518 | 15,325 | 30,114 |
| Observed TTFT per attempt (ms) | 106 | 116 | 129 | 15,880 |
| QVAC engine TTFT per attempt | 75.9 | 81.2 | 91.5 | 15,835.6 |
| Prompt tokens | 417 | 437 | 479 | 482 |
| Generated tokens | 236 | 700 | 700 | 700 |
| Output throughput (tokens/s) | 119.49 | 124.55 | 127.17 | 127.30 |

The maximum TTFT occurred on the first inference after model load. Twenty-one of 36 attempts stopped at the 700-token limit and produced incomplete JSON. The schema asks every atomic claim to repeat eleven fields; the selected 1.7B model also duplicated subjects and evidence text. This combination dominated failures despite strong GPU decode throughput.

## Manual quality inspection

[e4-manual-review-v1.json](e4-manual-review-v1.json) records every case. This is an informal E4 inspection, not the owner-approved held-out E7 evaluation.

- 8 terminal outputs were deterministically admissible after schema and excerpt checks; none was accepted by a user.
- 0/8 fully satisfied their frozen manual checks.
- 8/8 contained at least one unsupported or incorrect interpretation and omitted at least one supported fact.
- Severe examples included converting possible presence to confirmed absence, converting approximate age to a zero quantity, treating a room as equipment, duplicating one group into several subjects, and repeatedly changing observed quantities to reported totals.
- No precision, recall, F1, or formal unsupported-claim rate is reported because E4 does not have the owner-approved gold annotations required for E7.

## Failure diagnosis and next decision

This E4 configuration is not feasible for the approved product seam. The runtime and GPU are viable; the blocker is reliable compact structured extraction with this model/schema/prompt combination. Increasing the token ceiling would worsen the latency gate and would not correct the observed semantic errors.

The smallest responsible next step is a separately approved, bounded E4-v2 experiment. Keep the same SDK, hardware, local-only execution, and candidate topologies. Refactor the output contract so shared provenance and evidence are represented once and atomic claims reference them, then freeze a new prompt/schema version. Compare the current 1.7B model with one stronger model that still fits the 6 GB GPU budget, using a small development-only probe before a new untouched 20-case feasibility partition. Preserve this failed result and label any new run as E4-v2.

Do not start Ticket 02 until an E4 version passes and the project owner accepts the resulting platform ADR.

## Commands executed

```powershell
npm.cmd install --save-exact @qvac/sdk@0.19.0
npm.cmd install --save-dev --save-exact node@22.17.0
npm.cmd install --save-dev --save-exact ajv@8.20.0
npm.cmd run e4:verify
npm.cmd run e4:probe
npm.cmd run e4:run
npm.cmd run e4:offline
npm.cmd run e4:interruption
npm.cmd run e4:topologies
npm.cmd test
npm.cmd run e4:finalize
```

`e4:finalize` recalculates only derived gate labels and summary counts from preserved attempts; it does not invoke QVAC or alter an attempt.

## Timebox accounting

| Measure | Recorded value |
| --- | --- |
| Active-development start | 2026-09-10 13:48:00.798 -05:00 |
| Bounded failure decision | 2026-09-10 14:49:44.362 -05:00 |
| Total elapsed to decision | 1 hour 1 minute 43.564 seconds |
| Dependency-install command time | Approximately 9 minutes 21 seconds (`@qvac/sdk`: npm-reported 9 minutes; local Node: 18 seconds; AJV: 3 seconds) |
| Model acquisition time | 5 minutes 55.247 seconds, measured by the harness |
| Active implementation and review time | Approximately 46 minutes 27 seconds after excluding the recorded dependency-install and model-acquisition waits |
| Frozen 20-note run | 4 minutes 4.596 seconds, included in total elapsed and active review time |

The failure decision was reached well inside the three-hour active-development timebox. The approximate active figure is conservative at the precision available from npm's rounded install duration; total elapsed and model acquisition use recorded timestamps and harness measurements.
