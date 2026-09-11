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
    label: 'Datos sintéticos',
    customers: [{ id: 'c1', name: 'Cliente ficticio' }],
    equipmentRecords: [{ id: 'r1', customerId: 'c1', status: 'verified', modality: 'MRI', manufacturer: '', model: '', location: 'Radiología', evidenceObservationIds: [], evidenceEntryIds: ['e1'] }],
    observations: [], reconciliationLinks: [],
    evidenceEntries: [{ id: 'e1', customerId: 'c1', equipmentRecordId: 'r1', type: 'seedReference', text: 'Referencia sintética.', author: 'Fuente sintética', observationDate: '2026-01-01', recordedAt: '2026-01-01T12:00:00.000Z' }],
    verificationItems: []
  }
}

test('customer view exposes deterministic signals and filters without changing operational state', () => {
  const workspace = new WorkspaceService(state(), async () => {}, { now: fixedNow })
  const before = workspace.snapshot()
  const first = workspace.customerView('c1').opportunitySignals
  const second = workspace.opportunitySignals({ customerId: 'c1', type: 'incompleteInformationReview', status: 'unreviewed' })
  assert.equal(first.length, 2)
  assert.deepEqual(second.map(({ type }) => type), ['incompleteInformationReview'])
  assert.deepEqual(workspace.customerView('c1').opportunitySignals, first)
  assert.deepEqual(workspace.opportunitySignalAggregate(), {
    total: 2, unreviewed: 2, dismissed: 0,
    byType: [{ type: 'incompleteInformationReview', count: 1 }, { type: 'staleEvidenceReview', count: 1 }]
  })
  assert.deepEqual(workspace.snapshot(), before)
})

test('dismissal persists only explicit local review history', async () => {
  let persisted
  const workspace = new WorkspaceService(state(), async (next) => { persisted = structuredClone(next) }, { now: fixedNow })
  const before = workspace.snapshot()
  const signal = workspace.opportunitySignals({ type: 'incompleteInformationReview' })[0]
  const dismissed = await workspace.dismissOpportunitySignal(signal.id, 'No aplica tras revisión local')
  assert.equal(dismissed.review.status, 'dismissed')
  assert.equal(dismissed.review.reason, 'No aplica tras revisión local')
  assert.equal(persisted.opportunitySignalReviews.length, 1)
  for (const collection of ['equipmentRecords', 'observations', 'evidenceEntries', 'verificationItems', 'reconciliationLinks']) assert.deepEqual(workspace.snapshot()[collection], before[collection])
})

test('changed activating evidence receives a new identity and never inherits an old dismissal', async () => {
  const initial = state()
  const firstService = new WorkspaceService(initial, async () => {}, { now: fixedNow })
  const first = firstService.opportunitySignals({ type: 'incompleteInformationReview' })[0]
  initial.opportunitySignalReviews = [{ signalId: first.id, status: 'dismissed', reason: 'Estado anterior', actor: 'Usuario', reviewedAt: '2026-09-10T12:00:00.000Z' }]
  initial.evidenceEntries[0].text = 'Referencia sintética actualizada.'
  const changed = new WorkspaceService(initial, async () => {}, { now: fixedNow }).opportunitySignals({ type: 'incompleteInformationReview' })[0]
  assert.notEqual(changed.id, first.id)
  assert.equal(changed.review.status, 'unreviewed')
})

test('dismissal validates the signal and reason', async () => {
  const workspace = new WorkspaceService(state(), async () => {}, { now: fixedNow })
  await assert.rejects(workspace.dismissOpportunitySignal('missing', 'motivo'), /desconocida/i)
  const signal = workspace.opportunitySignals()[0]
  await assert.rejects(workspace.dismissOpportunitySignal(signal.id, ''), /obligatorio/i)
})

test('local HTTP and UI expose inspectable signals without invoking extraction', async (t) => {
  let extractionCalls = 0
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-opportunities-'))
  const app = await createPrototypeServer({ workspacePath: path.join(directory, 'workspace.json'), extractor: async () => { extractionCalls += 1; throw new Error('No debe ejecutarse') } })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })

  const page = await fetch(origin).then((response) => response.text())
  assert.match(page, /Posibles oportunidades para revisar/)
  assert.match(page, /opportunity-type/)
  const bootstrap = await fetch(`${origin}/api/bootstrap`).then((response) => response.json())
  assert.equal(bootstrap.opportunityAggregate.total > 0, true)
  const signals = await fetch(`${origin}/api/opportunities?status=unreviewed`).then((response) => response.json())
  assert.ok(signals.length > 0)
  assert.ok(signals.every((signal) => signal.reason && signal.evidence.length && signal.rule.version === 'opportunity-signals-v1'))
  const response = await fetch(`${origin}/api/opportunities/${encodeURIComponent(signals[0].id)}/dismiss`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'Revisión local' }) })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).review.status, 'dismissed')
  assert.equal(extractionCalls, 0)
})
