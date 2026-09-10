import test from 'node:test'
import assert from 'node:assert/strict'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

function seed() {
  return {
    customers: [{ id: 'c1', name: 'Northbridge General' }],
    equipmentRecords: [
      { id: 'a1', customerId: 'c1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiology', evidenceObservationIds: [] },
      { id: 'a2', customerId: 'c1', status: 'provisional', modality: 'CT', manufacturer: 'Aster', model: 'AX-4', location: 'Emergency', evidenceObservationIds: [] }
    ],
    observations: [],
    verificationItems: [{ id: 'v1', customerId: 'c1', priority: 1, reason: 'Confirm current room', status: 'open' }]
  }
}

const draft = {
  version: 1,
  subjects: [{ subjectId: 's1', kind: 'provisionalIndividual', label: 'DemoScan MRI' }],
  claims: [
    { claimId: 'c1', subjectId: 's1', type: 'equipmentType', value: 'MRI', sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: 18, text: 'I saw one MRI unit.' } }
  ],
  clarification: null
}

test('capture persists the original note before invoking extraction', async () => {
  const snapshots = []
  const service = new WorkspaceService(seed(), async (state) => snapshots.push(structuredClone(state)))

  const observation = await service.capture('c1', 'I saw one MRI unit.', async () => {
    assert.equal(snapshots.at(-1).observations[0].status, 'processing')
    assert.equal(snapshots.at(-1).observations[0].originalText, 'I saw one MRI unit.')
    return { status: 'succeeded', attempts: [{ status: 'succeeded' }], draft, model: { modelExport: 'QWEN3_1_7B_INST_Q4' } }
  })

  assert.equal(observation.status, 'succeeded')
  assert.equal(observation.draftClaims.length, 1)
})

test('review and explicit reconciliation add evidence without duplicate equipment growth', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const observation = await service.capture('c1', 'I saw one MRI unit.', async () => ({ status: 'succeeded', attempts: [], draft, model: {} }))
  await service.review(observation.id, [{ claimId: 'c1', decision: 'accepted' }])
  const before = service.customerView('c1').equipmentRecords.length
  await service.reconcile(observation.id, 'a1', 'Matches modality and room')
  const view = service.customerView('c1')

  assert.equal(view.equipmentRecords.length, before)
  assert.deepEqual(view.equipmentRecords[0].evidenceObservationIds, [observation.id])
  assert.equal(view.unlinkedClaims, 0)
})

test('rejected and unreviewed claims never affect the working view', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const observation = await service.capture('c1', 'I saw one MRI unit.', async () => ({ status: 'succeeded', attempts: [], draft, model: {} }))
  await service.review(observation.id, [{ claimId: 'c1', decision: 'rejected' }])
  assert.equal(service.customerView('c1').acceptedClaimCount, 0)
})

test('reconciliation refuses a record that is not an evidence-based candidate', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const observation = await service.capture('c1', 'I saw one MRI unit.', async () => ({ status: 'succeeded', attempts: [], draft, model: {} }))
  await service.review(observation.id, [{ claimId: 'c1', decision: 'accepted' }])
  await assert.rejects(() => service.reconcile(observation.id, 'a2', 'Not actually a match'), /candidate/)
})

test('review remains incomplete until every draft claim has an explicit decision', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const observation = await service.capture('c1', 'I saw one MRI unit.', async () => ({ status: 'succeeded', attempts: [], draft, model: {} }))
  await assert.rejects(() => service.review(observation.id, []), /every draft claim/)
  assert.equal(service.observation(observation.id).reviewedAt, null)
})
