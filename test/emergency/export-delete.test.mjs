import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { FileStore } from '../../src/core/file-store.mjs'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { DELETE_CONFIRMATION, validateWorkspaceExport } from '../../src/core/workspace-export.mjs'
import { createPrototypeServer } from '../../src/server.mjs'

const fixedNow = () => new Date('2026-09-10T20:00:00.000Z')

function state() {
  return {
    synthetic: true,
    label: 'Datos completamente sintéticos para demostración.',
    customers: [{ id: 'customer-1', name: 'Hospital Ficticio Uno', site: 'Campus Central' }],
    equipmentRecords: [{
      id: 'equipment-1', customerId: 'customer-1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiología',
      evidenceObservationIds: ['observation-1'], evidenceEntryIds: ['evidence-1']
    }],
    observations: [{
      id: 'observation-1', customerId: 'customer-1', originalText: 'Observé un MRI DemoScan.', observationDate: '2026-09-09', recordedAt: '2026-09-10T19:00:00.000Z',
      revision: 0, status: 'succeeded', evidenceEntryIds: ['evidence-1'], subjects: [{ subjectId: 'subject-1', kind: 'provisionalIndividual', label: 'MRI' }],
      attempts: [{ attemptId: 'attempt-1', attemptNumber: 1, phase: 'initial', observationRevision: 0, startedAt: '2026-09-10T19:00:00.000Z', completedAt: '2026-09-10T19:00:01.000Z', status: 'succeeded', stopReason: 'stop', rawOutput: '{"secret-invalid-output":true}', validatedDraft: { unsafe: true }, metrics: { totalMs: 1000 }, draftStatus: 'active' }],
      draftClaims: [{ claimId: 'claim-1', subjectId: 'subject-1', type: 'equipmentType', value: 'MRI', originalValue: 'MRI', reviewedValue: 'MRI', certainty: 'reported', originalCertainty: 'reported', reviewedCertainty: 'reported', sourceType: 'directObservation', locationScope: 'dept', evidence: { id: 'source-1', start: 11, end: 14, text: 'MRI' }, decision: 'accepted', reviewStatus: 'accepted', corrections: [{ id: 'correction-1', correctedAt: '2026-09-10T19:01:00.000Z', reviewer: 'Usuario local de demostración', field: 'certainty', previousValue: 'estimated', correctedValue: 'reported', origin: 'reviewerProvided', evidenceEntryId: 'evidence-1' }], acceptedEvidenceEntryId: 'evidence-1' }],
      clarification: null, reviewedAt: '2026-09-10T19:02:00.000Z', reconciliation: { recordId: 'equipment-1', reason: 'Coincidencia revisada', actor: 'Usuario local de demostración', decidedAt: '2026-09-10T19:03:00.000Z' }, model: { modelExport: 'QWEN3_1_7B_INST_Q4' }, load: { loadMs: 5000 }
    }],
    evidenceEntries: [{ id: 'evidence-1', observationId: 'observation-1', claimId: 'claim-1', customerId: 'customer-1', equipmentRecordId: 'equipment-1', type: 'reviewerCorrection', text: 'MRI', author: 'Usuario local de demostración', observationDate: '2026-09-09', recordedAt: '2026-09-10T19:01:00.000Z' }],
    verificationItems: [{ id: 'verification-1', customerId: 'customer-1', observationId: 'observation-1', subjectId: 'subject-1', equipmentRecordId: 'equipment-1', baseReasonCodes: ['reviewerCorrection'], reasonCodes: ['reviewerCorrection'], supportingEvidenceEntryIds: ['evidence-1'], status: 'open', createdAt: '2026-09-10T19:02:00.000Z', updatedAt: '2026-09-10T19:03:00.000Z' }]
  }
}

test('complete export is valid, deterministic in structure, and preserves provenance without invalid model content', () => {
  const service = new WorkspaceService(state(), async () => {}, { now: fixedNow })
  const payload = service.exportWorkspace()
  assert.equal(validateWorkspaceExport(payload), true)
  assert.equal(payload.schemaVersion, 'workspace-export-v1')
  assert.equal(payload.exportTimestamp, '2026-09-10T20:00:00.000Z')
  assert.equal(payload.observations[0].inferenceAttempts[0].attemptId, 'attempt-1')
  assert.equal(payload.observations[0].draftClaims[0].corrections[0].id, 'correction-1')
  assert.equal(payload.reconciliationLinks[0].recordId, 'equipment-1')
  assert.equal(payload.verificationItems[0].supportingEvidenceEntryIds[0], 'evidence-1')
  assert.equal(payload.aggregate.verifiedRecords, 1)
  assert.doesNotMatch(JSON.stringify(payload), /secret-invalid-output|validatedDraft|rawOutput/)
})

test('deletion requires exact confirmation and cancelled deletion leaves state untouched', async () => {
  let persists = 0
  const service = new WorkspaceService(state(), async () => { persists += 1 }, { now: fixedNow })
  await assert.rejects(service.deleteWorkspace('cancelar'), /ELIMINAR/)
  assert.equal(persists, 0)
  assert.equal(service.snapshot().observations.length, 1)
})

test('deletion empties only runtime collections and produces a valid empty export', async () => {
  let persisted
  const service = new WorkspaceService(state(), async (next) => { persisted = structuredClone(next) }, { now: fixedNow })
  const deleted = await service.deleteWorkspace(DELETE_CONFIRMATION)
  for (const key of ['customers', 'observations', 'evidenceEntries', 'equipmentRecords', 'verificationItems']) {
    assert.deepEqual(deleted[key], [])
    assert.deepEqual(persisted[key], [])
  }
  const payload = service.exportWorkspace()
  assert.equal(validateWorkspaceExport(payload), true)
  assert.deepEqual(payload.reconciliationLinks, [])
  assert.deepEqual(payload.aggregate, { customers: 0, observations: 0, verifiedRecords: 0, provisionalRecords: 0, openVerificationItems: 0, byModality: [] })
})

test('FileStore persists deletion after restart, reset stays separate, and protected files remain untouched', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-export-delete-'))
  const seedPath = path.join(directory, 'frozen-seed.json')
  const workspacePath = path.join(directory, 'runtime', 'workspace.json')
  const protectedPath = path.join(directory, 'protected-test-evidence.json')
  await writeFile(seedPath, JSON.stringify(state()), 'utf8')
  await writeFile(protectedPath, 'PROTECTED', 'utf8')
  t.after(() => rm(directory, { recursive: true, force: true }))

  const store = new FileStore({ seedPath, workspacePath })
  const service = new WorkspaceService(await store.load(), (next) => store.save(next), { now: fixedNow })
  await service.deleteWorkspace(DELETE_CONFIRMATION)
  const restarted = new WorkspaceService(await new FileStore({ seedPath, workspacePath }).load(), async () => {}, { now: fixedNow })
  assert.equal(restarted.snapshot().customers.length, 0)
  assert.equal(restarted.snapshot().observations.length, 0)
  assert.equal(await readFile(protectedPath, 'utf8'), 'PROTECTED')
  assert.equal((JSON.parse(await readFile(seedPath, 'utf8'))).customers.length, 1)

  const restored = await store.reset()
  assert.equal(restored.customers.length, 1)
  assert.equal((await store.load()).equipmentRecords.length, 1)
})

test('FileStore rejects unsafe or protected storage targets', () => {
  const base = path.join(tmpdir(), 'qvac-path-safety')
  const seedPath = path.join(base, 'seed.json')
  assert.throws(() => new FileStore({ seedPath, workspacePath: seedPath }), /fixture sintético/)
  assert.throws(() => new FileStore({ seedPath, workspacePath: path.join(base, '*.json') }), /no permitidos/)
  assert.throws(() => new FileStore({ seedPath, workspacePath: path.join(base, 'workspace') }), /archivo JSON/)
  assert.throws(() => new FileStore({ seedPath, workspacePath: path.join(base, 'package.json') }), /archivo de Workspace/)
})

test('HTTP export can precede confirmed deletion and reset explicitly recreates synthetic data', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-export-delete-http-'))
  const workspacePath = path.join(directory, 'workspace.json')
  const app = await createPrototypeServer({ workspacePath, extractor: async () => { throw new Error('No debe inferir') } })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })

  const exportedResponse = await fetch(`${origin}/api/workspace/export`)
  assert.equal(exportedResponse.status, 200)
  assert.match(exportedResponse.headers.get('content-disposition'), /workspace-local-\d{4}-\d{2}-\d{2}\.json/)
  assert.equal(validateWorkspaceExport(await exportedResponse.json()), true)

  const refused = await fetch(`${origin}/api/workspace`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'NO' }) })
  assert.equal(refused.status, 400)
  assert.equal((await fetch(`${origin}/api/bootstrap`).then((response) => response.json())).customers.length, 3)

  const deleted = await fetch(`${origin}/api/workspace`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }) }).then((response) => response.json())
  assert.equal(deleted.deleted, true)
  assert.equal(deleted.state.customers.length, 0)
  assert.equal((await fetch(`${origin}/api/bootstrap`).then((response) => response.json())).customers.length, 0)

  await app.close()
  const restarted = await createPrototypeServer({ workspacePath, extractor: async () => { throw new Error('No debe inferir') } })
  t.after(async () => { try { await restarted.close() } catch {} })
  await new Promise((resolve) => restarted.server.listen(0, '127.0.0.1', resolve))
  const restartedOrigin = `http://127.0.0.1:${restarted.server.address().port}`
  assert.equal((await fetch(`${restartedOrigin}/api/bootstrap`).then((response) => response.json())).customers.length, 0)
  await fetch(`${restartedOrigin}/api/reset`, { method: 'POST' })
  assert.equal((await fetch(`${restartedOrigin}/api/bootstrap`).then((response) => response.json())).customers.length, 3)
})
