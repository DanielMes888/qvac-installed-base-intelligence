import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { closeQvac, extractEquipmentDraft } from '../../src/qvac/adapter.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dataset = JSON.parse(await readFile(path.join(root, 'data/feasibility/e4-notes-v1.json'), 'utf8'))
const ids = ['E4-007', 'E4-006', 'E4-003']
const notes = ids.map((id) => dataset.notes.find((note) => note.id === id))
const resultPath = path.join(root, 'results', 'emergency', 'compact-contract-probe.json')
const nextPath = `${resultPath}.next`
const record = {
  schemaVersion: 'emergency-compact-contract-probe-v1',
  startedAt: new Date().toISOString(),
  endedAt: null,
  model: '@qvac/sdk 0.19.0 / QWEN3_1_7B_INST_Q4 / Q4_0',
  sameComputer: true,
  cloudInference: false,
  delegatedInference: false,
  toolCases: [],
  fallbackCases: [],
  selectedMode: null
}

await mkdir(path.dirname(resultPath), { recursive: true })
try {
  for (const note of notes) {
    const output = await extractEquipmentDraft(note.text, { mode: 'tool', maxAttempts: 2 })
    record.toolCases.push({ id: note.id, note: note.text, manualChecks: note.manualChecks, ...output })
    await persist()
  }
  const toolPass = record.toolCases.every((item) => item.status === 'succeeded')
  if (toolPass) {
    record.selectedMode = 'tool'
  } else {
    for (const note of notes) {
      const output = await extractEquipmentDraft(note.text, { mode: 'json', maxAttempts: 2 })
      record.fallbackCases.push({ id: note.id, note: note.text, manualChecks: note.manualChecks, ...output })
      await persist()
    }
    record.selectedMode = record.fallbackCases.every((item) => item.status === 'succeeded') ? 'json' : null
  }
} finally {
  record.endedAt = new Date().toISOString()
  await persist()
  await closeQvac()
}

console.log(JSON.stringify({ resultPath, selectedMode: record.selectedMode, tool: record.toolCases.map(summarize), fallback: record.fallbackCases.map(summarize) }, null, 2))
if (!record.selectedMode) process.exitCode = 1

function summarize(item) {
  return { id: item.id, status: item.status, attempts: item.attempts.map((attempt) => ({ status: attempt.status, failureCategory: attempt.failureCategory, stopReason: attempt.stopReason, metrics: attempt.metrics })) }
}

async function persist() {
  await rm(nextPath, { force: true })
  await writeFile(nextPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  await rm(resultPath, { force: true })
  await rename(nextPath, resultPath)
}
