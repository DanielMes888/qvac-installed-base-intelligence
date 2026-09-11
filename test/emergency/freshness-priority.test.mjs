import test from 'node:test'
import assert from 'node:assert/strict'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const now = new Date('2026-09-10T12:00:00.000Z')
const note = 'Observé un equipo MRI DemoScan modelo DS-One, cantidad 1.'

function baseSeed(overrides = {}) {
  return {
    customers: [
      { id: 'c1', name: 'Hospital Norte', site: 'Central' },
      { id: 'c2', name: 'Hospital Sur', site: 'Oeste' }
    ],
    equipmentRecords: [
      { id: 'a1', customerId: 'c1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiology', evidenceObservationIds: [], evidenceEntryIds: [] },
      { id: 'a2', customerId: 'c2', status: 'provisional', modality: 'CT', manufacturer: 'Aster', model: 'AX-4', location: 'Emergency', evidenceObservationIds: [], evidenceEntryIds: [] }
    ],
    observations: [],
    evidenceEntries: [],
    verificationItems: [],
    ...overrides
  }
}

function service(state = baseSeed()) {
  return new WorkspaceService(state, async () => {}, { now: () => new Date(now) })
}

function sourceClaim(claimId, type, value, extra = {}) {
  return {
    claimId,
    subjectId: 's1',
    type,
    value,
    sourceType: 'directObservation',
    certainty: 'reported',
    locationScope: 'dept',
    negated: false,
    evidence: { id: 'e0', start: 0, end: note.length, text: note },
    ...extra
  }
}

function extraction(claims, subject = { subjectId: 's1', kind: 'provisionalIndividual', label: 'Equipo MRI' }) {
  return async () => ({
    status: 'succeeded',
    attempts: [{ status: 'succeeded' }],
    draft: { version: 1, subjects: [subject], claims, clarification: null },
    model: { sdk: 'controlled-test-adapter' }
  })
}

async function accept(serviceUnderTest, claims, options = {}) {
  const observation = await serviceUnderTest.capture('c1', note, extraction(claims, options.subject), { observationDate: options.observationDate })
  return serviceUnderTest.review(observation.id, claims.map(({ claimId }) => ({ claimId, decision: 'accepted' })))
}

test('freshness preserves observation date, recorded date, and latest equipment evidence separately', async () => {
  const workspace = service()
  const reviewed = await accept(workspace, [sourceClaim('type', 'equipmentType', 'MRI')], { observationDate: '2026-09-08' })
  await workspace.reconcile(reviewed.id, 'a1', 'Coincidencia revisada')
  const view = workspace.customerView('c1')
  const observation = view.observations.find(({ id }) => id === reviewed.id)
  const record = view.equipmentRecords.find(({ id }) => id === 'a1')

  assert.equal(observation.observationDate, '2026-09-08')
  assert.ok(Date.parse(observation.recordedAt))
  assert.equal(record.latestObservationDate, '2026-09-08')
  assert.equal(record.latestEvidenceAt, observation.recordedAt)
  assert.equal(view.freshnessPolicy.materiallyOldDays, 90)
  assert.match(view.freshnessPolicy.disclaimer, /no es una política oficial de Philips/i)
  assert.equal('expirationDate' in record, false)
})

test('deterministic reason rules assign Alta, Media, and Baja', async () => {
  const seed = baseSeed({
    evidenceEntries: [
      { id: 'e1', customerId: 'c1', equipmentRecordId: 'a1', type: 'seedReference', text: 'Referencia', author: 'Semilla', observationDate: '2026-09-01', recordedAt: '2026-09-02T12:00:00.000Z' }
    ],
    verificationItems: [
      { id: 'conflict', customerId: 'c1', equipmentRecordId: 'a1', reasonCodes: ['conflictingEvidence'], supportingEvidenceEntryIds: ['e1'], status: 'open', createdAt: '2026-09-02T12:00:00.000Z' },
      { id: 'complete', customerId: 'c1', equipmentRecordId: 'a1', reasonCodes: ['reportedNeedsConfirmation'], supportingEvidenceEntryIds: ['e1'], status: 'open', createdAt: '2026-09-02T12:00:00.000Z' }
    ]
  })
  const workspace = service(seed)
  const initial = workspace.verificationItems({ customerId: 'c1' })
  assert.equal(initial.find(({ id }) => id === 'conflict').priority, 'high')
  assert.deepEqual(initial.find(({ id }) => id === 'conflict').reasons, ['Evidencia en conflicto'])
  assert.equal(initial.find(({ id }) => id === 'complete').priority, 'low')

  const unknownQuantity = await accept(workspace, [sourceClaim('q1', 'quantity', 1, { quantityScope: 'unknown' })])
  assert.equal(workspace.verificationItems({ observationId: unknownQuantity.id })[0].priority, 'high')
  assert.ok(workspace.verificationItems({ observationId: unknownQuantity.id })[0].reasons.includes('Cantidad con alcance desconocido'))

  const estimatedWorkspace = service()
  const estimated = await accept(estimatedWorkspace, [sourceClaim('age', 'age', 8, { certainty: 'estimated' })])
  const estimatedItem = estimatedWorkspace.verificationItems({ observationId: estimated.id })[0]
  assert.equal(estimatedItem.priority, 'medium')
  assert.ok(estimatedItem.reasons.includes('Información estimada'))

  const correctionWorkspace = service()
  const captured = await correctionWorkspace.capture('c1', note, extraction([sourceClaim('model', 'model', 'DS-Zero')]))
  await correctionWorkspace.correctClaim(captured.id, 'model', { field: 'model', correctedValue: 'LX-Nuevo' })
  await correctionWorkspace.review(captured.id, [{ claimId: 'model', decision: 'accepted' }])
  const correctionItem = correctionWorkspace.verificationItems({ observationId: captured.id })[0]
  assert.equal(correctionItem.priority, 'medium')
  assert.ok(correctionItem.reasons.includes('Corrección proporcionada por el revisor'))
})

test('unknown observation date and then older evidence sort first within equal priority', () => {
  const seed = baseSeed({
    evidenceEntries: [
      { id: 'unknown-date', customerId: 'c1', type: 'seedReference', text: 'Sin fecha de observación', author: 'Semilla', observationDate: null, recordedAt: '2026-09-09T12:00:00.000Z' },
      { id: 'old', customerId: 'c1', type: 'seedReference', text: 'Antigua', author: 'Semilla', observationDate: '2026-05-01', recordedAt: '2026-05-02T12:00:00.000Z' },
      { id: 'new', customerId: 'c1', type: 'seedReference', text: 'Nueva', author: 'Semilla', observationDate: '2026-09-01', recordedAt: '2026-09-02T12:00:00.000Z' }
    ],
    verificationItems: [
      { id: 'new', customerId: 'c1', reasonCodes: ['reportedNeedsConfirmation'], supportingEvidenceEntryIds: ['new'], status: 'open' },
      { id: 'unknown', customerId: 'c1', reasonCodes: ['reportedNeedsConfirmation'], supportingEvidenceEntryIds: ['unknown-date'], status: 'open' },
      { id: 'old', customerId: 'c1', reasonCodes: ['reportedNeedsConfirmation'], supportingEvidenceEntryIds: ['old'], status: 'open' }
    ]
  })
  assert.deepEqual(service(seed).verificationItems({ customerId: 'c1' }).map(({ id }) => id), ['unknown', 'old', 'new'])
})

test('priority recalculation is deterministic, filterable, and never resolves items or grows equipment records', async () => {
  const workspace = service(baseSeed({
    evidenceEntries: [{ id: 'e1', customerId: 'c2', equipmentRecordId: 'a2', type: 'seedReference', text: 'Referencia CT', author: 'Semilla', observationDate: null, recordedAt: '2026-09-01T12:00:00.000Z' }],
    verificationItems: [{ id: 'seed-item', customerId: 'c2', equipmentRecordId: 'a2', reasonCodes: ['missingModel'], supportingEvidenceEntryIds: ['e1'], status: 'open' }]
  }))
  const countBefore = workspace.snapshot().equipmentRecords.length
  const first = workspace.verificationItems()
  const second = workspace.verificationItems()
  assert.deepEqual(second, first)

  const reviewed = await accept(workspace, [
    sourceClaim('type', 'equipmentType', 'MRI'),
    sourceClaim('q1', 'quantity', 1, { quantityScope: 'unknown' })
  ])
  const generated = workspace.verificationItems({ observationId: reviewed.id })[0]
  assert.equal(generated.status, 'open')
  assert.equal(workspace.verificationItems({ priority: 'high', customerId: 'c1' }).some(({ id }) => id === generated.id), true)
  assert.equal(workspace.verificationItems({ customerId: 'c2', equipmentRecordId: 'a2', reasonCode: 'missingModel' }).map(({ id }) => id).includes('seed-item'), true)
  assert.equal(workspace.verificationItems({ priority: 'low', observationId: reviewed.id }).length, 0)
  assert.equal(workspace.snapshot().equipmentRecords.length, countBefore)

  await workspace.reconcile(reviewed.id, 'a1', 'Coincidencia por modalidad')
  const afterReconciliation = workspace.verificationItems({ observationId: reviewed.id }).find(({ id }) => id === generated.id)
  assert.equal(afterReconciliation.status, 'open')
  assert.equal(afterReconciliation.equipmentRecordId, 'a1')
  assert.equal(workspace.snapshot().equipmentRecords.length, countBefore)
})
