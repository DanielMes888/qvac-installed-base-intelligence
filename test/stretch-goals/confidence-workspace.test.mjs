import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { createPrototypeServer } from '../../src/server.mjs'

const fixedNow = () => new Date('2026-09-10T12:00:00.000Z')

function state() {
  return {
    synthetic: true,
    label: 'Datos completamente sintéticos para demostración.',
    customers: [{ id: 'customer-1', name: 'Hospital Ficticio', site: 'Campus Central' }],
    equipmentRecords: [{
      id: 'equipment-1',
      customerId: 'customer-1',
      status: 'verified',
      modality: 'MRI',
      manufacturer: 'DemoScan',
      model: 'DS-One',
      location: 'Radiología',
      evidenceObservationIds: ['observation-1'],
      evidenceEntryIds: ['accepted-1']
    }],
    observations: [{
      id: 'observation-1',
      customerId: 'customer-1',
      originalText: 'Observé un MRI DemoScan DS-One en Radiología.',
      observationDate: '2026-09-09',
      recordedAt: '2026-09-09T15:00:00.000Z',
      revision: 0,
      status: 'succeeded',
      evidenceEntryIds: ['accepted-1'],
      subjects: [],
      draftClaims: [{
        claimId: 'claim-1', subjectId: 'subject-1', type: 'equipmentType', value: 'MRI', certainty: 'estimated',
        sourceType: 'directObservation', locationScope: 'dept', negated: false, evidence: { id: 'source-1', text: 'MRI' },
        decision: 'accepted', reviewStatus: 'accepted', corrections: [], acceptedEvidenceEntryId: 'accepted-1'
      }],
      clarification: null,
      reviewedAt: '2026-09-09T15:05:00.000Z',
      reconciliation: { recordId: 'equipment-1', reason: 'Revisión explícita', actor: 'Usuario local', decidedAt: '2026-09-09T15:06:00.000Z' }
    }],
    evidenceEntries: [{
      id: 'accepted-1', observationId: 'observation-1', claimId: 'claim-1', customerId: 'customer-1', equipmentRecordId: 'equipment-1',
      type: 'acceptedClaim', text: 'MRI', author: 'Usuario local', origin: 'qvacDraftReviewed', observationDate: '2026-09-09', recordedAt: '2026-09-09T15:00:00.000Z'
    }],
    verificationItems: [{
      id: 'verification-1', customerId: 'customer-1', observationId: 'observation-1', equipmentRecordId: 'equipment-1',
      reasonCodes: ['estimatedInformation'], supportingEvidenceEntryIds: ['accepted-1'], status: 'open', createdAt: '2026-09-09T15:05:00.000Z'
    }]
  }
}

test('customer view serializes confidence without changing certainty, priority, review, identity, or persisted state', () => {
  const workspace = new WorkspaceService(state(), async () => {}, { now: fixedNow })
  const before = workspace.snapshot()

  const first = workspace.customerView('customer-1')
  const second = workspace.customerView('customer-1')
  const record = first.equipmentRecords[0]

  assert.equal(record.confidenceScore.total, 70)
  assert.equal(record.confidenceScore.available, true)
  assert.equal(record.confidenceScore.band.label, 'Media')
  assert.equal(record.confidenceScore.components.corroboration.points, 0)
  assert.equal(record.status, 'verified')
  assert.equal(first.observations[0].draftClaims[0].certainty, 'estimated')
  assert.equal(first.observations[0].draftClaims[0].decision, 'accepted')
  assert.equal(first.verificationItems[0].priority, 'medium')
  assert.deepEqual(second.equipmentRecords[0].confidenceScore, record.confidenceScore)
  assert.deepEqual(workspace.snapshot(), before)
})

test('customer view exposes unavailable when accepted support has unknown scope', () => {
  const workspaceState = state()
  workspaceState.observations[0].draftClaims[0].locationScope = 'unknown'
  const workspace = new WorkspaceService(workspaceState, async () => {}, { now: fixedNow })

  const score = workspace.customerView('customer-1').equipmentRecords[0].confidenceScore

  assert.equal(score.available, false)
  assert.equal(score.total, null)
  assert.equal(score.band.label, 'No disponible')
  assert.match(score.availabilityReason, /alcance explícito/i)
  assert.equal(score.evidence[0].scope, 'unknown')
})

test('workspace export remains on its approved v1 contract and does not persist the derived score', () => {
  const workspace = new WorkspaceService(state(), async () => {}, { now: fixedNow })
  const payload = workspace.exportWorkspace()

  assert.equal(payload.schemaVersion, 'workspace-export-v1')
  assert.equal('confidenceScore' in payload.equipmentRecords[0], false)
})

test('HTTP customer view and installed-base UI expose the Spanish score summary and optional breakdown', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-confidence-http-'))
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => { throw new Error('El score no debe ejecutar QVAC') }
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  t.after(async () => {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  })

  const view = await fetch(`${origin}/api/customers/northbridge/view`).then((response) => response.json())
  const score = view.equipmentRecords[0].confidenceScore
  assert.ok(score.total >= 0 && score.total <= 100)
  assert.ok(['Alta', 'Media', 'Baja'].includes(score.band.label))
  assert.deepEqual(Object.keys(score.components), ['completeness', 'freshness', 'corroboration'])
  assert.match(score.disclaimer, /Indicador configurable del prototipo/)

  const clientScript = await fetch(`${origin}/app.js`).then((response) => response.text())
  assert.match(clientScript, /Confianza de evidencia/)
  assert.match(clientScript, /score\.disclaimer/)
  assert.match(clientScript, /Completitud/)
  assert.match(clientScript, /Vigencia/)
  assert.match(clientScript, /Corroboración/)
  assert.match(clientScript, /Fecha de evaluación/)
  assert.match(clientScript, /Ver desglose y evidencia/)
  assert.match(clientScript, /Procedencias consideradas/)
  assert.match(clientScript, /confidenceEvidenceAnchor/)
  assert.match(clientScript, /item\.excerpt/)
  assert.match(clientScript, /alcance desconocido/)
  assert.match(clientScript, /No cambia la certeza, la prioridad, la revisión ni la identidad/)
})
