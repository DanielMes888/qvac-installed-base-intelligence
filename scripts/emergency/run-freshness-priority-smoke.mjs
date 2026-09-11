import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const workspacePath = path.join(root, '.local', 'freshness-priority-smoke-workspace.json')
const resultPath = path.join(root, 'results', 'emergency', 'freshness-priority-smoke.json')
const note = 'Observé un equipo MRI DemoScan y no sé si la cantidad 1 es observada o total.'
const result = {
  schemaVersion: 'freshness-priority-smoke-v1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  adapter: 'controlled-test-adapter',
  purpose: 'Deterministic freshness, prioritization, filtering, and no-auto-resolution evidence; not QVAC quality evidence.',
  freshness: null,
  priorities: null,
  filters: null,
  recalculation: null,
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
      draft: {
        version: 1,
        subjects: [{ subjectId: 's1', kind: 'provisionalIndividual', label: 'DemoScan MRI' }],
        claims: [
          claim('type', 'equipmentType', 'MRI'),
          claim('manufacturer', 'manufacturer', 'DemoScan'),
          claim('quantity', 'quantity', 1, { quantityScope: 'unknown' })
        ],
        clarification: null
      },
      model: { sdk: 'controlled-test-adapter' }
    })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const before = await request(origin, '/api/customers/northbridge/view')
  const initialItems = await request(origin, '/api/verifications')
  const highNorthbridge = await request(origin, '/api/verifications?priority=high&customerId=northbridge')
  const lowMeadow = await request(origin, '/api/verifications?priority=low&customerId=meadow&reasonCode=reportedNeedsConfirmation')
  assert(highNorthbridge.length === 3, 'Los tres elementos prioritarios de Northbridge no quedaron en Alta')
  assert(lowMeadow.length === 1, 'El filtro de información reportada Baja no produjo el elemento esperado')
  assert(initialItems.every((item) => item.priorityLabel && item.reasons.length && item.status === 'open'), 'Algún elemento carece de prioridad explicada o fue resuelto')
  assert(initialItems.every((item) => item.supportingEvidenceEntries.length > 0), 'Algún elemento perdió su relación con evidencia')
  result.freshness = {
    policy: before.freshnessPolicy,
    records: before.equipmentRecords.map(({ id, latestObservationDate, latestEvidenceAt }) => ({ id, latestObservationDate, latestEvidenceAt }))
  }
  result.priorities = initialItems.map(({ id, priority, priorityLabel, reasons, latestObservationDate, latestEvidenceAt }) => ({ id, priority, priorityLabel, reasons, latestObservationDate, latestEvidenceAt }))
  result.filters = { highNorthbridge: highNorthbridge.map(({ id }) => id), lowMeadow: lowMeadow.map(({ id }) => id) }

  const captured = await request(origin, '/api/observations', { method: 'POST', body: { customerId: 'northbridge', text: note, observationDate: null } })
  const reviewed = await request(origin, `/api/observations/${captured.id}/review`, {
    method: 'POST',
    body: { decisions: captured.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })) }
  })
  const generatedBeforeLink = (await request(origin, '/api/verifications?priority=high&customerId=northbridge')).find(({ observationId }) => observationId === captured.id)
  assert(generatedBeforeLink?.reasons.includes('Cantidad con alcance desconocido'), 'La cantidad desconocida no generó una explicación Alta')
  const countBefore = before.equipmentRecords.length
  await request(origin, `/api/observations/${captured.id}/reconcile`, { method: 'POST', body: { recordId: reviewed.candidates[0].id, reason: 'Coincidencia controlada por modalidad' } })
  const generatedAfterLink = (await request(origin, '/api/verifications?priority=high&customerId=northbridge')).find(({ id }) => id === generatedBeforeLink.id)
  const after = await request(origin, '/api/customers/northbridge/view')
  assert(generatedAfterLink?.status === 'open', 'La reconciliación resolvió automáticamente una verificación')
  assert(generatedAfterLink.equipmentRecordId === 'nb-mri-01', 'La verificación perdió la relación con el equipo reconciliado')
  assert(after.equipmentRecords.length === countBefore, 'La evidencia creó un equipo adicional')
  result.recalculation = {
    itemId: generatedAfterLink.id,
    priorityBefore: generatedBeforeLink.priority,
    priorityAfter: generatedAfterLink.priority,
    statusAfter: generatedAfterLink.status,
    equipmentRecordId: generatedAfterLink.equipmentRecordId,
    equipmentRecordCountBefore: countBefore,
    equipmentRecordCountAfter: after.equipmentRecords.length
  }
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
  priorities: result.priorities,
  filters: result.filters,
  recalculation: result.recalculation,
  failure: result.failure
}, null, 2))

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
