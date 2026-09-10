# E4-v2 real local QVAC feasibility result

Status: **FAIL — stopped at Stage 0**

Ticket: [01b-prove-real-local-qvac-feasibility-v2.md](../../docs/tickets/philips-customer-installed-base-intelligence/01b-prove-real-local-qvac-feasibility-v2.md)

The mandatory pre-download `assessModelFit()` gate rejected the only approved stronger candidate. In accordance with the ticket, no new model was downloaded or loaded, no inference was run, and Stages 1-3 were not started. This result does not authorize Ticket 02 or a platform decision.

## Stage 0 result

| Item | Recorded value |
| --- | --- |
| SDK | `@qvac/sdk` 0.19.0 |
| Candidate | SDK export `QWEN3_4B_INST_Q4_K_M` |
| Registry artifact | `Qwen3-4B-Q4_K_M.gguf` |
| Quantization | Q4_K_M |
| Expected artifact size | 2,497,280,256 bytes |
| Expected checksum | `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5` |
| Workload | LLM, 4096 context tokens |
| Fit policy | `interactive-v1`, sequential |
| Candidate verdict | **`likely-too-large`** |
| Budget basis | `device-budget` |
| Estimated memory | 3,049,241,072-3,517,776,461 bytes |
| Windows GPU process budget | 5,402,263,552 bytes total; 4,321,810,842 after reserve |
| System memory sample | 16,390,729,728 bytes total; 12,663,332,864 used |
| Assessment elapsed | 1,707.870 ms |
| Downloaded or loaded | No |

The complete SDK response, hardware sample, model descriptor, assumptions, and reasons are preserved in [e4-v2-model-fit.json](e4-v2-model-fit.json). The SDK states that a GPU load is also paid for in system RAM and that each verdict uses the more pessimistic GPU or system budget. The recorded GPU budget alone exceeds the model's reported upper estimate, while the system had about 3.73 GB free before any policy reserve. This suggests system-memory headroom influenced the negative verdict; it is an inference from the SDK evidence, not a replacement verdict.

## Acquisition and loading

The candidate model was neither downloaded nor loaded. No model acquisition, cold-load, backend-load, or inference measurement exists for E4-v2. The existing 1.7B E4-v1 cache and evidence were not used as an E4-v2 candidate and were not changed.

## Staged results

| Stage | Result | Consequence |
| --- | --- | --- |
| 0 — pre-download fit | **FAIL**: `likely-too-large` | Required immediate no-download stop |
| 1 — three-case contract probe | Not run | Blocked by Stage 0 |
| 2 — five-case model probe | Not run | Blocked by Stage 0 |
| 3 — frozen 20-note held-out run | Not run | Blocked by Stage 0 |

No E4-v2 held-out partition was created or exposed because the staged process stopped before Stage 3.

## Gate results

| Gate | Required | Result | Status |
| --- | --- | --- | --- |
| Pre-download fit | `likely-fits` with sufficient Windows budget | `likely-too-large` | **FAIL** |
| Candidate acquisition/load | Only after fit pass | Correctly not attempted | Controlled stop |
| No crashes/lost notes | 20/20 held-out cases | No held-out run | Not evaluated |
| Schema-valid after retry | 20/20 | No held-out run | Not evaluated |
| Warm latency | At least 19/20 at or below 15 seconds | No inference | Not evaluated |
| Critical semantic checklist | At least 18/20 | No held-out run | Not evaluated |
| Unsupported identities/quantities admitted | Zero | No Draft Claims produced | Not evaluated |
| Invalid-output exclusion | Exclude structural and semantic failures | No inference output | Not evaluated |
| Offline cached execution | Complete 20/20 | No acquired model | Not evaluated |
| Same-computer real QVAC inference | Required | No inference permitted after failed fit | Not evaluated |

All original numeric thresholds and the E4-v2 semantic gate remain unchanged. An unexecuted gate is not counted as a pass. Overall E4-v2 therefore fails.

## Semantic and performance results

No extraction outputs exist, so there are no semantic errors, schema results, retries, stop reasons, prompt/input tokens, output tokens, TTFT, throughput, model-load time, or inference latency to report. No E4-v2 extraction prompt or schema was frozen, no tool-call or raw-JSON contract path was selected, no reasoning-control mechanism or generated-token limit was applied, and no runtime/backend load or offline inference was attempted because Stage 0 prohibited Stages 1-3. These metrics and decisions are **not evaluated**, rather than zero. The only measured duration is the 1,707.870 ms fit assessment.

## Timebox

| Measure | Recorded value |
| --- | --- |
| Active-development start | 2026-09-10 15:27:07.510 -05:00 |
| Stage 0 failure decision | 2026-09-10 15:28:12.471 -05:00 |
| Active-development end after validation and review | 2026-09-10 15:31:49.181 -05:00 |
| Active and total elapsed | 4 minutes 41.670 seconds |
| Dependency time | 0 seconds; existing pinned dependencies used |
| Model download time | 0 seconds; prohibited by failed gate |

The bounded experiment stopped well inside the two-hour active-development limit.

## Recommendation

Keep Ticket 02 blocked. The smallest next project-owner decision is whether to authorize one fit-only reassessment of the same 4B candidate after reducing system-memory use on the laptop. Such authorization should preserve the 4096-token workload and every threshold, record a fresh resource sample, and still prohibit download unless the SDK returns `likely-fits`. If the owner does not approve that reassessment, retire this candidate and revisit the model/contract plan explicitly; do not silently select another model, reduce context, or proceed to platform selection.

## Commands

```powershell
npm.cmd run e4:v2:fit
```
