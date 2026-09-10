import test from 'node:test'
import assert from 'node:assert/strict'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const reviewer = 'Usuario local de demostración'
const note = 'Observé un equipo MRI DemoScan, modelo DS-One, cantidad 1.'

function seed() {
  return {
    customers: [{ id: 'c1', name: 'Hospital ficticio' }],
    equipmentRecords: [
      { id: 'a1', customerId: 'c1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiology', evidenceObservationIds: [] }
    ],
    observations: [],
    evidenceEntries: [],
    verificationItems: []
  }
}

function claim(claimId, type, value, extra = {}) {
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

function draft(claims = [
  claim('type', 'equipmentType', 'CT'),
  claim('manufacturer', 'manufacturer', 'DemoScan'),
  claim('model', 'model', 'DS-Zero'),
  claim('quantity', 'quantity', 2, { quantityScope: 'unknown' })
]) {
  return {
    version: 1,
    subjects: [{ subjectId: 's1', kind: 'provisionalIndividual', label: 'Equipo observado' }],
    claims,
    clarification: null
  }
}

async function capturedService(claims) {
  const service = new WorkspaceService(seed(), async () => {})
  const observation = await service.capture('c1', note, async () => ({
    status: 'succeeded',
    attempts: [{ status: 'succeeded' }],
    draft: draft(claims),
    model: { sdk: 'controlled-test-adapter' }
  }))
  return { service, observation }
}

test('each supported field can be corrected before review and retains its original QVAC value', async () => {
  const cases = [
    ['type', 'equipmentType', 'MRI'],
    ['manufacturer', 'manufacturer', 'DemoScan Technologies'],
    ['model', 'model', 'DS-One'],
    ['quantity', 'quantity', 1],
    ['quantity', 'quantityScope', 'observed'],
    ['type', 'certainty', 'estimated']
  ]

  for (const [claimId, field, correctedValue] of cases) {
    const { service, observation } = await capturedService()
    const before = observation.draftClaims.find((item) => item.claimId === claimId)
    const updated = await service.correctClaim(observation.id, claimId, { field, correctedValue, reason: 'Corrección de prueba' })
    const after = updated.draftClaims.find((item) => item.claimId === claimId)

    assert.deepEqual(after.originalValue, before.originalValue)
    assert.equal(after.originalCertainty, 'reported')
    assert.equal(after.reviewStatus, 'pending')
    assert.equal(after.decision, 'pending')
    if (field === 'certainty') assert.equal(after.reviewedCertainty, correctedValue)
    else if (field === 'quantityScope') assert.equal(after.reviewedQuantityScope, correctedValue)
    else assert.equal(after.reviewedValue, correctedValue)
    assert.equal(after.corrections.length, 1)
  }
})

test('correction audit records reviewer, time, field, values and optional reason', async () => {
  const { service, observation } = await capturedService()
  const updated = await service.correctClaim(observation.id, 'model', {
    field: 'model',
    correctedValue: 'DS-One',
    reason: 'La observación indica el modelo correcto.'
  })
  const correction = updated.draftClaims.find(({ claimId }) => claimId === 'model').corrections[0]

  assert.equal(correction.reviewer, reviewer)
  assert.ok(Date.parse(correction.correctedAt))
  assert.equal(correction.field, 'model')
  assert.equal(correction.previousValue, 'DS-Zero')
  assert.equal(correction.correctedValue, 'DS-One')
  assert.equal(correction.reason, 'La observación indica el modelo correcto.')
  assert.equal(correction.origin, 'originalObservation')
  assert.equal(correction.evidenceEntryId, null)

  const reloaded = new WorkspaceService(service.snapshot(), async () => {}).observation(observation.id)
  const reloadedClaim = reloaded.draftClaims.find(({ claimId }) => claimId === 'model')
  assert.equal(reloadedClaim.originalValue, 'DS-Zero')
  assert.equal(reloadedClaim.reviewedValue, 'DS-One')
  assert.deepEqual(reloadedClaim.corrections, correctedClaim(updated).corrections)
})

test('a correction unsupported by the original note becomes separate reviewer evidence', async () => {
  const { service, observation } = await capturedService()
  const updated = await service.correctClaim(observation.id, 'manufacturer', {
    field: 'manufacturer',
    correctedValue: 'LumaCare',
    reason: 'Dato aportado por el revisor.'
  })
  const corrected = updated.draftClaims.find(({ claimId }) => claimId === 'manufacturer')
  const correction = corrected.corrections[0]
  const evidence = updated.evidenceEntries.find(({ id }) => id === correction.evidenceEntryId)

  assert.equal(corrected.evidence.text, note)
  assert.equal(correction.origin, 'reviewerProvided')
  assert.equal(evidence.type, 'reviewerCorrection')
  assert.equal(evidence.author, reviewer)
  assert.equal(evidence.text, 'LumaCare')
  assert.equal(evidence.field, 'manufacturer')
  assert.equal(evidence.claimId, 'manufacturer')
  assert.notEqual(evidence.author, 'QVAC')
})

test('malformed quantities and invalid enum values are rejected', async () => {
  const invalidQuantities = ['', 0, -1, 1.5, 'abc']
  for (const correctedValue of invalidQuantities) {
    const { service, observation } = await capturedService()
    await assert.rejects(
      () => service.correctClaim(observation.id, 'quantity', { field: 'quantity', correctedValue }),
      /cantidad/i
    )
  }

  const { service, observation } = await capturedService()
  await assert.rejects(
    () => service.correctClaim(observation.id, 'quantity', { field: 'quantityScope', correctedValue: 'global' }),
    /alcance/i
  )
  await assert.rejects(
    () => service.correctClaim(observation.id, 'type', { field: 'certainty', correctedValue: 'certain' }),
    /certeza/i
  )
  await assert.rejects(
    () => service.correctClaim(observation.id, 'type', { field: 'equipmentType', correctedValue: '   ' }),
    /obligatorio/i
  )
})

test('a corrected claim still requires explicit review and may be rejected', async () => {
  const { service, observation } = await capturedService([claim('model', 'model', 'DS-Zero')])
  const corrected = await service.correctClaim(observation.id, 'model', { field: 'model', correctedValue: 'DS-One' })
  assert.equal(corrected.reviewedAt, null)
  assert.equal(corrected.draftClaims[0].decision, 'pending')

  const reviewed = await service.review(observation.id, [{ claimId: 'model', decision: 'rejected' }])
  assert.equal(reviewed.draftClaims[0].reviewedValue, 'DS-One')
  assert.equal(reviewed.draftClaims[0].decision, 'rejected')
  assert.equal(service.customerView('c1').acceptedClaimCount, 0)
  await assert.rejects(
    () => service.correctClaim(observation.id, 'model', { field: 'model', correctedValue: 'DS-Two' }),
    /revisión.*completada/i
  )
})

test('accepted final corrected values drive candidate matching without automatic installed-base changes', async () => {
  const claims = [
    claim('type', 'equipmentType', 'MRI'),
    claim('manufacturer', 'manufacturer', 'DemoScan'),
    claim('model', 'model', 'DS-Zero')
  ]
  const { service, observation } = await capturedService(claims)
  const recordsBeforeCorrection = service.customerView('c1').equipmentRecords
  await service.correctClaim(observation.id, 'model', { field: 'model', correctedValue: 'DS-One' })
  assert.deepEqual(service.customerView('c1').equipmentRecords, recordsBeforeCorrection)

  const reviewed = await service.review(observation.id, claims.map(({ claimId }) => ({ claimId, decision: 'accepted' })))
  assert.equal(reviewed.candidates[0].id, 'a1')
  assert.equal(reviewed.draftClaims.find(({ claimId }) => claimId === 'model').value, 'DS-One')
  assert.deepEqual(service.customerView('c1').equipmentRecords, recordsBeforeCorrection)

  const countBeforeReconciliation = service.customerView('c1').equipmentRecords.length
  await service.reconcile(observation.id, 'a1', 'Coincidencia revisada')
  assert.equal(service.customerView('c1').equipmentRecords.length, countBeforeReconciliation)
})

function correctedClaim(observation) {
  return observation.draftClaims.find(({ claimId }) => claimId === 'model')
}
