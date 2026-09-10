import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  QWEN3_4B_INST_Q4_K_M,
  assessModelFit,
  close,
  getSystemResources
} from '@qvac/sdk'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'feasibility', 'e4-v2-model-fit.json')
const nextPath = `${resultPath}.next`
const workload = { kind: 'llm', contextTokens: 4096 }
const startedAt = new Date().toISOString()
const started = performance.now()

await mkdir(path.dirname(resultPath), { recursive: true })

let record
try {
  const resources = await getSystemResources({ sample: true })
  const assessment = await assessModelFit({
    models: [{ model: QWEN3_4B_INST_Q4_K_M, workload }],
    execution: 'sequential',
    policy: 'interactive-v1'
  })
  const candidate = assessment.models[0]
  const budgetCoversUpperBound = assessment.budget !== null
    && candidate.estimate !== null
    && assessment.budget.availableAfterReserveBytes >= candidate.estimate.upperBoundBytes

  record = {
    schemaVersion: 'e4-v2-model-fit-v1',
    ticket: '01b-prove-real-local-qvac-feasibility-v2',
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedMs: performance.now() - started,
    sdkVersion: '0.19.0',
    candidateExport: 'QWEN3_4B_INST_Q4_K_M',
    candidateDescriptor: QWEN3_4B_INST_Q4_K_M,
    request: { workload, execution: 'sequential', policy: 'interactive-v1' },
    resources,
    assessment,
    gate: {
      candidateVerdict: candidate.verdict,
      budgetCoversUpperBound,
      pass: candidate.verdict === 'likely-fits' && budgetCoversUpperBound
    },
    modelDownloadedOrLoaded: false
  }
} catch (error) {
  record = {
    schemaVersion: 'e4-v2-model-fit-v1',
    ticket: '01b-prove-real-local-qvac-feasibility-v2',
    startedAt,
    endedAt: new Date().toISOString(),
    elapsedMs: performance.now() - started,
    sdkVersion: '0.19.0',
    candidateExport: 'QWEN3_4B_INST_Q4_K_M',
    request: { workload, execution: 'sequential', policy: 'interactive-v1' },
    failure: error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: 'UnknownError', message: String(error) },
    gate: { candidateVerdict: null, budgetCoversUpperBound: false, pass: false },
    modelDownloadedOrLoaded: false
  }
} finally {
  await close().catch(() => {})
}

await rm(nextPath, { force: true })
await writeFile(nextPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
await rm(resultPath, { force: true })
await rename(nextPath, resultPath)

console.log(JSON.stringify(record, null, 2))
if (!record.gate.pass) process.exitCode = 1
