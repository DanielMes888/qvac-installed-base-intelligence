import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const workspacePath = path.join(root, '.local', 'offline-smoke-workspace.json')
const resultPath = path.join(root, 'results', 'emergency', 'demo-smoke.json')
const note = 'Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.'
const expectedValues = new Map([
  ['equipmentType', 'MRI'],
  ['manufacturer', 'DemoScan'],
  ['model', 'DS-One'],
  ['quantity', 1],
  ['location', 'Radiology']
])

const record = {
  schemaVersion: 'emergency-demo-smoke-v1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  note,
  environment: {
    sameComputer: true,
    cloudInference: false,
    delegatedInference: false,
    networkProbe: await networkProbe()
  },
  extraction: null,
  review: null,
  reconciliation: null,
  views: null
}
let app

try {
  await rm(workspacePath, { force: true })
  app = await createPrototypeServer({ workspacePath })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const { port } = app.server.address()
  const origin = `http://127.0.0.1:${port}`
  record.environment.loopbackOrigin = origin

  const before = await request(origin, '/api/customers/northbridge/view')
  const observation = await request(origin, '/api/observations', {
    method: 'POST',
    body: { customerId: 'northbridge', text: note }
  })
  record.extraction = observation

  if (observation.status !== 'succeeded') throw new Error('La extracción real de QVAC no produjo un borrador estructuralmente válido')
  const decisions = observation.draftClaims.map((claim) => ({
    claimId: claim.claimId,
    decision: isSupported(claim) ? 'accepted' : 'rejected'
  }))
  const reviewed = await request(origin, `/api/observations/${observation.id}/review`, {
    method: 'POST',
    body: { decisions }
  })
  record.review = {
    kind: 'deterministic smoke-test simulation of explicit human review',
    decisions,
    accepted: reviewed.draftClaims.filter(({ decision }) => decision === 'accepted').length,
    rejected: reviewed.draftClaims.filter(({ decision }) => decision === 'rejected').length,
    candidates: reviewed.candidates.map(({ id, score }) => ({ id, score }))
  }

  const candidate = reviewed.candidates.find(({ id }) => id === 'nb-mri-01')
  if (!candidate) throw new Error('No se produjo el candidato de reconciliación esperado del conjunto semilla')
  const after = await request(origin, `/api/observations/${observation.id}/reconcile`, {
    method: 'POST',
    body: { recordId: candidate.id, reason: 'La revisión del smoke test confirmó la modalidad y los datos de identificación respaldados' }
  })
  record.reconciliation = {
    recordId: candidate.id,
    equipmentRecordCountBefore: before.equipmentRecords.length,
    equipmentRecordCountAfter: after.equipmentRecords.length,
    duplicateGrowthPrevented: before.equipmentRecords.length === after.equipmentRecords.length
  }
  record.views = {
    customer: after,
    aggregate: (await request(origin, '/api/bootstrap')).aggregate
  }
} catch (error) {
  record.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  record.completedAt = new Date().toISOString()
  if (app) await app.close()
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({
  networkProbe: record.environment.networkProbe,
  extractionStatus: record.extraction?.status ?? 'failed',
  attempts: record.extraction?.attempts.map(({ status, stopReason, errors, metrics }) => ({ status, stopReason, errors, metrics })) ?? [],
  review: record.review,
  reconciliation: record.reconciliation,
  failure: record.failure ?? null
}, null, 2))

function isSupported(claim) {
  if (
    claim.negated ||
    claim.sourceType !== 'directObservation' ||
    claim.certainty !== 'reported' ||
    claim.locationScope !== 'dept' ||
    claim.evidence?.start !== 0 ||
    claim.evidence?.end !== note.length ||
    claim.evidence?.text !== note
  ) return false
  if (!expectedValues.has(claim.type)) return false
  if (claim.type === 'quantity' && claim.quantityScope !== 'observed') return false
  return expectedValues.get(claim.type) === claim.value
}

async function networkProbe() {
  try {
    const response = await fetch('https://registry.npmjs.org/-/ping', { signal: AbortSignal.timeout(2500) })
    return { reachable: response.ok, status: response.status }
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.name : String(error) }
  }
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
