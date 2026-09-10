import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'

const note = 'I saw one DemoScan MRI scanner, model DS-One, in Radiology.'
const draft = {
  version: 1,
  subjects: [{ subjectId: 's1', kind: 'provisionalIndividual', label: 'DemoScan MRI' }],
  claims: [
    { claimId: 'c1', subjectId: 's1', type: 'equipmentType', value: 'MRI', sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: note.length, text: note } },
    { claimId: 'c2', subjectId: 's1', type: 'manufacturer', value: 'DemoScan', sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: note.length, text: note } },
    { claimId: 'c3', subjectId: 's1', type: 'model', value: 'DS-One', sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: note.length, text: note } }
  ],
  clarification: null
}

test('HTTP seam captures, reviews, and links repeated evidence without record growth', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-prototype-'))
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => ({
      status: 'succeeded',
      attempts: [{ status: 'succeeded', metrics: { totalMs: 1, generatedTokens: 20 } }],
      draft,
      model: { sdk: 'controlled-test-adapter' }
    })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const { port } = app.server.address()
  const origin = `http://127.0.0.1:${port}`
  t.after(async () => {
    await app.close()
    await rm(directory, { recursive: true, force: true })
  })

  const page = await fetch(origin).then((response) => response.text())
  assert.match(page, /Synthetic demonstration data/)
  const rejectedOrigin = await fetch(`${origin}/api/bootstrap`, { headers: { origin: 'http://example.invalid' } })
  assert.equal(rejectedOrigin.status, 403)
  const rejectedHostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, path: '/api/bootstrap', headers: { host: 'example.invalid' } }, (response) => {
      response.resume()
      response.on('end', () => resolve(response.statusCode))
    })
    request.on('error', reject)
    request.end()
  })
  assert.equal(rejectedHostStatus, 403)

  const before = await fetch(`${origin}/api/customers/northbridge/view`).then((response) => response.json())
  const observation = await fetch(`${origin}/api/observations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId: 'northbridge', text: note })
  }).then((response) => response.json())
  assert.equal(observation.status, 'succeeded')

  const reviewed = await fetch(`${origin}/api/observations/${observation.id}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decisions: observation.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })) })
  }).then((response) => response.json())
  assert.equal(reviewed.candidates[0].id, 'nb-mri-01')

  const reconciled = await fetch(`${origin}/api/observations/${observation.id}/reconcile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recordId: 'nb-mri-01', reason: 'Controlled test match' })
  }).then((response) => response.json())

  assert.equal(reconciled.equipmentRecords.length, before.equipmentRecords.length)
  assert.equal(reconciled.unlinkedClaims, 0)
  assert.deepEqual(reconciled.equipmentRecords.find(({ id }) => id === 'nb-mri-01').evidenceObservationIds, [observation.id])
})
