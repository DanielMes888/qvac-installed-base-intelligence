import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const workspacePath = path.join(root, '.local', 'clarification-smoke-workspace.json')
const resultPath = path.join(root, 'results', 'emergency', 'clarification-smoke.json')
const note = 'La directora de radiología dijo que hay tres escáneres MRI DemoScan. No quedó claro si eran los observados o el total de la sede.'
const answer = 'La directora confirmó que son todos los equipos MRI de esta sede.'

const record = {
  schemaVersion: 'emergency-clarification-smoke-v1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  note,
  answer,
  sameComputer: true,
  cloudInference: false,
  delegatedInference: false,
  initial: null,
  clarified: null,
  review: null,
  safety: null
}
let app

try {
  await rm(workspacePath, { force: true })
  app = await createPrototypeServer({ workspacePath })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const { port } = app.server.address()
  const origin = `http://127.0.0.1:${port}`
  record.loopbackOrigin = origin

  const before = await request(origin, '/api/customers/northbridge/view')
  const initial = await request(origin, '/api/observations', {
    method: 'POST',
    body: { customerId: 'northbridge', text: note }
  })
  record.initial = initial
  if (initial.status !== 'succeeded') throw new Error('La extracción inicial no produjo borradores válidos')
  if (initial.clarification?.status !== 'pending') throw new Error('QVAC no produjo una aclaración material válida en español')

  const clarified = await request(origin, `/api/observations/${initial.id}/clarification`, {
    method: 'POST',
    body: { outcome: 'answered', answer }
  })
  record.clarified = clarified
  if (clarified.status !== 'succeeded') throw new Error('La segunda extracción no produjo borradores finales válidos')
  if (clarified.attempts.length !== 2) throw new Error(`Se esperaban dos inferencias y se registraron ${clarified.attempts.length}`)
  if (clarified.evidenceEntries.length !== 1 || clarified.evidenceEntries[0].text !== answer) throw new Error('La respuesta no quedó preservada como evidencia separada')
  if (clarified.clarification.nextQuestion !== null) throw new Error('La segunda extracción intentó abrir otra aclaración')

  const decisions = clarified.draftClaims.map(({ claimId }) => ({ claimId, decision: 'rejected' }))
  const reviewed = await request(origin, `/api/observations/${initial.id}/review`, {
    method: 'POST',
    body: { decisions }
  })
  record.review = {
    kind: 'revisión humana simulada conservadora',
    decisions,
    reviewedAt: reviewed.reviewedAt,
    accepted: reviewed.draftClaims.filter(({ decision }) => decision === 'accepted').length,
    rejected: reviewed.draftClaims.filter(({ decision }) => decision === 'rejected').length
  }

  const after = await request(origin, '/api/customers/northbridge/view')
  record.safety = {
    questionCount: clarified.clarification.questionCount,
    inferenceCount: clarified.attempts.length,
    activeDraftCount: clarified.draftClaims.length,
    acceptedClaimCountBefore: before.acceptedClaimCount,
    acceptedClaimCountAfter: after.acceptedClaimCount,
    equipmentRecordCountBefore: before.equipmentRecords.length,
    equipmentRecordCountAfter: after.equipmentRecords.length,
    installedBaseUnchanged: before.acceptedClaimCount === after.acceptedClaimCount && before.equipmentRecords.length === after.equipmentRecords.length
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
  question: record.initial?.clarification?.question ?? null,
  initial: attemptSummary(record.initial?.attempts?.[0]),
  clarification: attemptSummary(record.clarified?.attempts?.[1]),
  evidenceEntries: record.clarified?.evidenceEntries?.length ?? 0,
  review: record.review,
  safety: record.safety,
  failure: record.failure ?? null
}, null, 2))

function attemptSummary(attempt) {
  if (!attempt) return null
  return { status: attempt.status, stopReason: attempt.stopReason, errors: attempt.errors, metrics: attempt.metrics }
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
