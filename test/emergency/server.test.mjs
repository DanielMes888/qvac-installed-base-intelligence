import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createPrototypeServer, startupErrorMessage } from '../../src/server.mjs'

const note = 'Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.'
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

test('startup port conflicts produce an actionable local recovery message', () => {
  const error = Object.assign(new Error('busy'), { code: 'EADDRINUSE' })
  assert.match(startupErrorMessage(error, '127.0.0.1', 4173), /ya está en uso/i)
  assert.match(startupErrorMessage(error, '127.0.0.1', 4173), /PROTOTYPE_PORT/)
})

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
  for (const expectedCopy of [
    'Datos completamente sintéticos para demostración.',
    'Inferencia local con QVAC: los datos no se envían a la nube.',
    'Seleccionar cliente ficticio',
    'Registrar observación',
    'Extraer información localmente con QVAC',
    'Revisar y aprobar los datos',
    'Reconciliar con equipos existentes',
    'Consultar base instalada y verificaciones',
    'Datos extraídos pendientes de revisión.',
    'Información pendiente de verificar.',
    'Base instalada consolidada.'
  ]) assert.match(page, new RegExp(expectedCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
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
  const clientScript = await fetch(`${origin}/app.js`).then((response) => response.text())
  assert.match(clientScript, /Observación guardada localmente.*ningún dato extraído entró en la base instalada/)
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

test('invalid QVAC output leaves a visible failed observation and cannot affect the working view', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-prototype-invalid-'))
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => ({
      status: 'failed',
      attempts: [{ status: 'failed', failureCategory: 'validation', errors: ['invalid quantity scope'], rawOutput: '{"bad":true}' }],
      draft: null,
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

  const before = await fetch(`${origin}/api/customers/northbridge/view`).then((response) => response.json())
  const observation = await fetch(`${origin}/api/observations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId: 'northbridge', text: 'Nota sintética para probar una salida inválida.' })
  }).then((response) => response.json())
  const after = await fetch(`${origin}/api/customers/northbridge/view`).then((response) => response.json())

  assert.equal(observation.status, 'failed')
  assert.equal(observation.originalText, 'Nota sintética para probar una salida inválida.')
  assert.equal(observation.draftClaims.length, 0)
  assert.equal(after.observations.length, before.observations.length + 1)
  assert.equal(after.acceptedClaimCount, before.acceptedClaimCount)
  assert.equal(after.equipmentRecords.length, before.equipmentRecords.length)
})
