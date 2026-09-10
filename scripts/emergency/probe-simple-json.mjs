import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { closeQvac, extractEquipmentDraft } from '../../src/qvac/adapter.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dataset = JSON.parse(await readFile(path.join(root, 'data/feasibility/e4-notes-v1.json'), 'utf8'))
const notes = ['E4-007', 'E4-006', 'E4-003'].map((id) => dataset.notes.find((note) => note.id === id))
const resultPath = path.join(root, 'results', 'emergency', 'simple-json-probe.json')
const nextPath = `${resultPath}.next`
const record = {
  schemaVersion: 'emergency-simple-json-probe-v1',
  startedAt: new Date().toISOString(),
  endedAt: null,
  model: '@qvac/sdk 0.19.0 / QWEN3_1_7B_INST_Q4 / Q4_0',
  sameComputer: true,
  cloudInference: false,
  delegatedInference: false,
  cases: []
}

await mkdir(path.dirname(resultPath), { recursive: true })
try {
  for (const note of notes) {
    const output = await extractEquipmentDraft(note.text, { mode: 'simple-json', maxAttempts: 2 })
    record.cases.push({ id: note.id, note: note.text, manualChecks: note.manualChecks, ...output })
    await persist()
  }
} finally {
  record.endedAt = new Date().toISOString()
  await persist()
  await closeQvac()
}

console.log(JSON.stringify(record.cases.map((item) => ({
  id: item.id,
  status: item.status,
  draft: item.draft,
  attempts: item.attempts.map(({ status, failureCategory, errors, stopReason, metrics }) => ({ status, failureCategory, errors, stopReason, metrics }))
})), null, 2))
if (!record.cases.every((item) => item.status === 'succeeded')) process.exitCode = 1

async function persist() {
  await rm(nextPath, { force: true })
  await writeFile(nextPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  await rm(resultPath, { force: true })
  await rename(nextPath, resultPath)
}
