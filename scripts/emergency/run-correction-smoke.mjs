import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const workspacePath = path.join(root, '.local', 'correction-smoke-workspace.json')
const resultPath = path.join(root, 'results', 'emergency', 'correction-smoke.json')
const note = 'Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.'
const draft = {
  version: 1,
  subjects: [{ subjectId: 's1', kind: 'provisionalIndividual', label: 'DemoScan MRI' }],
  claims: [
    claim('c1', 'equipmentType', 'MRI'),
    claim('c2', 'manufacturer', 'DemoScan'),
    claim('c3', 'model', 'DS-Zero')
  ],
  clarification: null
}
const result = {
  schemaVersion: 'reviewer-correction-smoke-v1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  adapter: 'controlled-test-adapter',
  purpose: 'Deterministic public-seam smoke of reviewer correction; this is not real-QVAC quality evidence.',
  observationId: null,
  correction: null,
  review: null,
  reconciliation: null,
  failure: null
}
let app

try {
  await rm(workspacePath, { force: true })
  app = await createPrototypeServer({
    workspacePath,
    extractor: async () => ({
      status: 'succeeded',
      attempts: [{ status: 'succeeded', metrics: { totalMs: 1 } }],
      draft,
      model: { sdk: 'controlled-test-adapter' }
    })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const before = await request(origin, '/api/customers/northbridge/view')
  const captured = await request(origin, '/api/observations', {
    method: 'POST',
    body: { customerId: 'northbridge', text: note }
  })
  result.observationId = captured.id
  const corrected = await request(origin, `/api/observations/${captured.id}/claims/c3/correction`, {
    method: 'POST',
    body: { field: 'model', correctedValue: 'DS-One', reason: 'El modelo aparece en la observación original.' }
  })
  const correctedClaim = corrected.draftClaims.find(({ claimId }) => claimId === 'c3')
  assert(correctedClaim.originalValue === 'DS-Zero', 'No se conservó el valor original de QVAC')
  assert(correctedClaim.reviewedValue === 'DS-One', 'No se guardó el valor revisado')
  assert(correctedClaim.decision === 'pending' && corrected.reviewedAt === null, 'La corrección omitió la revisión explícita')
  assert(correctedClaim.corrections.length === 1, 'No se registró exactamente una corrección')
  assert(corrected.evidenceEntries.length === 0, 'Un valor presente en la observación no debe crear evidencia externa')
  const afterCorrection = await request(origin, '/api/customers/northbridge/view')
  assert(JSON.stringify(afterCorrection.equipmentRecords) === JSON.stringify(before.equipmentRecords), 'La corrección modificó automáticamente la base instalada')
  result.correction = {
    originalQvacValue: correctedClaim.originalValue,
    reviewedValue: correctedClaim.reviewedValue,
    evidenceReferencePreserved: correctedClaim.evidence,
    audit: correctedClaim.corrections[0],
    installedBaseChanged: false
  }

  const reviewed = await request(origin, `/api/observations/${captured.id}/review`, {
    method: 'POST',
    body: { decisions: corrected.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })) }
  })
  assert(reviewed.candidates.some(({ id }) => id === 'nb-mri-01'), 'El valor corregido aceptado no produjo el candidato esperado')
  result.review = {
    explicit: true,
    acceptedClaimCount: reviewed.draftClaims.filter(({ decision }) => decision === 'accepted').length,
    candidateIds: reviewed.candidates.map(({ id }) => id)
  }

  const reconciled = await request(origin, `/api/observations/${captured.id}/reconcile`, {
    method: 'POST',
    body: { recordId: 'nb-mri-01', reason: 'Valores finales revisados coinciden con el registro semilla.' }
  })
  result.reconciliation = {
    recordId: 'nb-mri-01',
    equipmentRecordCountBefore: before.equipmentRecords.length,
    equipmentRecordCountAfter: reconciled.equipmentRecords.length,
    duplicateGrowthPrevented: before.equipmentRecords.length === reconciled.equipmentRecords.length
  }
  assert(result.reconciliation.duplicateGrowthPrevented, 'La reconciliación creó un registro duplicado')
} catch (error) {
  result.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  result.completedAt = new Date().toISOString()
  if (app) await app.close()
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({
  correction: result.correction,
  review: result.review,
  reconciliation: result.reconciliation,
  failure: result.failure
}, null, 2))

function claim(claimId, type, value) {
  return {
    claimId,
    subjectId: 's1',
    type,
    value,
    sourceType: 'directObservation',
    certainty: 'reported',
    locationScope: 'dept',
    negated: false,
    evidence: { id: 'e0', start: 0, end: note.length, text: note }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(origin, pathname, { method = 'GET', body } = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const value = await response.json()
  if (!response.ok) throw new Error(value.error ?? `HTTP ${response.status}`)
  return value
}
