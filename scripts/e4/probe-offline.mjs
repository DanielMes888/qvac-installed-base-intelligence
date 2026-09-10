import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { close } from '@qvac/sdk'

import { verifyFrozenArtifacts } from './artifacts.mjs'
import { extractDraftClaims, loadExtractionModel, unloadExtractionModel } from './qvac-extraction.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'feasibility', 'e4-offline-network-probe.json')
await mkdir(path.dirname(resultPath), { recursive: true })

const startedAt = new Date().toISOString()
let externalFetchSucceeded = false
let error = null
let modelLoadMs = null
let extraction = null
try {
  const response = await fetch('https://registry.npmjs.org/@qvac/sdk', {
    signal: AbortSignal.timeout(3000)
  })
  externalFetchSucceeded = response.ok
} catch (caught) {
  error = caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught)
}

if (!externalFetchSucceeded) {
  const frozen = await verifyFrozenArtifacts(root)
  if (!frozen.valid) throw new Error(`Frozen artifacts invalid: ${frozen.errors.join('; ')}`)
  const prompt = await readFile(path.join(root, 'prompts/e4-equipment-extraction-v1.txt'), 'utf8')
  const schema = JSON.parse(await readFile(path.join(root, 'schemas/e4-draft-claim-set.schema.json'), 'utf8'))
  let modelId = null
  try {
    const loaded = await loadExtractionModel()
    modelId = loaded.modelId
    modelLoadMs = loaded.loadMs
    const note = frozen.dataset.notes.find((item) => item.id === 'E4-004')
    extraction = await extractDraftClaims({
      modelId,
      note: note.text,
      noteId: note.id,
      prompt,
      schema,
      attemptNumber: 1
    })
  } finally {
    if (modelId) await unloadExtractionModel(modelId)
    await close().catch(() => {})
  }
}

const result = {
  schemaVersion: 'e4-offline-network-probe-v1',
  startedAt,
  endedAt: new Date().toISOString(),
  target: 'https://registry.npmjs.org/@qvac/sdk',
  payloadContainedObservationData: false,
  externalFetchSucceeded,
  blockedOrTimedOut: !externalFetchSucceeded,
  error,
  cachedModelLoadMs: modelLoadMs,
  extraction,
  realLocalInferenceCompletedWhileBlocked: !externalFetchSucceeded && extraction?.status === 'succeeded',
  relationToInferenceRun: 'The external-network check and cached real-QVAC extraction ran sequentially in this process under the same default restricted-network permission profile used for e4-run-v1.json.'
}
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  resultPath,
  blockedOrTimedOut: result.blockedOrTimedOut,
  realLocalInferenceCompletedWhileBlocked: result.realLocalInferenceCompletedWhileBlocked,
  error
}, null, 2))
if (!result.blockedOrTimedOut || !result.realLocalInferenceCompletedWhileBlocked) process.exitCode = 1
