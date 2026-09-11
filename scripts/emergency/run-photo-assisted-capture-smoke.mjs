import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPrototypeServer } from '../../src/server.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const fixture = await readFile(new URL('../../test/fixtures/ocr/clear-image.png', import.meta.url))
const draft = {
  subjects: [{ subjectId: 'photo-smoke-subject', kind: 'provisionalIndividual', label: 'MRI DemoScan DS-One' }],
  claims: [
    { claimId: 'photo-smoke-type', subjectId: 'photo-smoke-subject', type: 'equipmentType', value: 'MRI', originalValue: 'MRI', certainty: 'reported', sourceType: 'recordOrLabel', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'photo-smoke-evidence', start: 0, end: 3, text: 'MRI' } },
    { claimId: 'photo-smoke-manufacturer', subjectId: 'photo-smoke-subject', type: 'manufacturer', value: 'DemoScan', originalValue: 'DemoScan', certainty: 'reported', sourceType: 'recordOrLabel', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'photo-smoke-evidence', start: 0, end: 8, text: 'DemoScan' } },
    { claimId: 'photo-smoke-model', subjectId: 'photo-smoke-subject', type: 'model', value: 'DS-One', originalValue: 'DS-One', certainty: 'reported', sourceType: 'recordOrLabel', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'photo-smoke-evidence', start: 0, end: 6, text: 'DS-One' } }
  ]
}
const workspaceDirectory = await mkdtemp(path.join(tmpdir(), 'photo-smoke-workspace-'))
const workspacePath = path.join(workspaceDirectory, 'workspace.json')
let extractorCalls = 0
const app = await createPrototypeServer({ workspacePath, extractor: async () => { extractorCalls += 1; return { status: 'succeeded', attempts: [{ status: 'succeeded', draft }], draft, model: { backend: 'controlled-smoke' } } } })
await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
const startedAt = new Date().toISOString()
try {
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const temporaryBefore = await temporaryOcrDirectories()
  const before = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const ocrStarted = performance.now()
  const ocr = await fetch(`${origin}/api/photo-ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base64: fixture.toString('base64'), mimeType: 'image/png' }) }).then((response) => response.json())
  const ocrMs = performance.now() - ocrStarted
  assert.match(ocr.text, /NOVAMED|AX-700/)
  assert.equal(extractorCalls, 0)
  const afterRecognition = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.deepEqual(afterRecognition.observations, before.observations)

  const cancelledOcr = await fetch(`${origin}/api/photo-ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base64: fixture.toString('base64'), mimeType: 'image/png' }) }).then((response) => response.json())
  assert.match(cancelledOcr.text, /NOVAMED|AX-700/)
  const afterCancel = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.deepEqual(afterCancel.observations, before.observations)

  const reviewedText = `${ocr.text.replace('NOVAMED', 'NOVAMED REVISADO')}\nMRI DemoScan DS-One`
  const submitted = await fetch(`${origin}/api/observations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: 'northbridge', text: reviewedText, provenance: 'photo-assisted' }) }).then((response) => response.json())
  assert.equal(submitted.provenance, 'photo-assisted')
  assert.equal(submitted.originalText, reviewedText)
  assert.equal(extractorCalls, 1)
  const reviewed = await fetch(`${origin}/api/observations/${submitted.id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decisions: submitted.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })) }) }).then((response) => response.json())
  assert.equal(reviewed.reviewedAt !== null, true)
  const customerBefore = await fetch(`${origin}/api/customers/northbridge/view`).then((response) => response.json())
  const recordsBefore = customerBefore.equipmentRecords.length
  const reconciled = await fetch(`${origin}/api/observations/${submitted.id}/reconcile`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recordId: 'nb-mri-01', reason: 'Coincidencia sintética revisada en smoke de fotografía' }) }).then((response) => response.json())
  assert.equal(reconciled.equipmentRecords.length, recordsBefore)

  const exported = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const serialized = JSON.stringify(exported)
  assert.equal(serialized.includes(fixture.toString('base64')), false)
  assert.equal(serialized.includes('image/png'), false)
  assert.deepEqual(await temporaryOcrDirectories(), temporaryBefore)
  const result = {
    schemaVersion: 'photo-assisted-capture-smoke-v1', startedAt, completedAt: new Date().toISOString(), synthetic: true,
    outcome: 'passed', ocr: { engine: 'Tesseract.js', real: true, elapsedMs: ocrMs, externalInstrumentedCalls: 0 },
    review: { editableTextChanged: reviewedText !== ocr.text, explicitObservationSubmit: true, explicitDraftReview: true },
    persistence: { observationsBeforeConfirm: before.observations.length, observationsAfterCancel: afterCancel.observations.length, observationsAfterConfirm: exported.observations.length, provenance: submitted.provenance, originalImagePersisted: false },
    reconciliation: { explicit: true, equipmentRecordsBefore: recordsBefore, equipmentRecordsAfter: reconciled.equipmentRecords.length, automaticMerge: false },
    cleanup: { temporaryDirectoriesRemoved: true }, qvac: { realInferenceExecuted: false, adapter: 'controlled-smoke' }
  }
  await writeFile(path.join(root, 'results', 'emergency', 'photo-assisted-capture-smoke.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result))
} finally {
  await app.close()
  await rm(workspaceDirectory, { recursive: true, force: true })
}

async function temporaryOcrDirectories() {
  return (await readdir(tmpdir(), { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('photo-ocr-')).map(({ name }) => name).sort()
}
