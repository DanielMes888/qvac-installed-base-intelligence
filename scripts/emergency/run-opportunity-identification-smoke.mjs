import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'emergency', 'opportunity-identification-smoke.json')
const evaluatedAt = '2026-09-10T12:00:00.000Z'
const state = {
  synthetic: true, label: 'Datos sintéticos', customers: [{ id: 'c1', name: 'Hospital Sintético' }], reconciliationLinks: [],
  equipmentRecords: [
    { id: 'old', customerId: 'c1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'One', location: 'Radiología', evidenceObservationIds: ['o-age'], evidenceEntryIds: ['e-age'] },
    { id: 'incomplete', customerId: 'c1', status: 'provisional', modality: 'CT', manufacturer: '', model: '', location: 'Imágenes', evidenceObservationIds: [], evidenceEntryIds: ['e-incomplete'] },
    { id: 'control', customerId: 'c1', status: 'verified', modality: 'Ultrasound', manufacturer: 'Demo', model: 'New', location: 'Sala 2', evidenceObservationIds: [], evidenceEntryIds: ['e-control'] }
  ],
  observations: [{ id: 'o-age', customerId: 'c1', originalText: 'Equipo de 8 años.', observationDate: '2026-09-09', recordedAt: '2026-09-09T12:00:00.000Z', draftClaims: [{ claimId: 'age', subjectId: 'subject-old', type: 'age', value: 8, decision: 'accepted', locationScope: 'dept', negated: false, acceptedEvidenceEntryId: 'e-age' }] }],
  evidenceEntries: [
    { id: 'e-age', observationId: 'o-age', equipmentRecordId: 'old', customerId: 'c1', type: 'acceptedClaim', text: '8', author: 'Fuente A', observationDate: '2026-09-09', recordedAt: '2026-09-09T12:00:00.000Z' },
    { id: 'e-incomplete', equipmentRecordId: 'incomplete', customerId: 'c1', type: 'seedReference', text: 'CT sintético sin fabricante ni modelo.', author: 'Fuente B', observationDate: '2026-01-01', recordedAt: '2026-01-01T12:00:00.000Z' },
    { id: 'e-control', equipmentRecordId: 'control', customerId: 'c1', type: 'seedReference', text: 'Equipo reciente completo.', author: 'Fuente C', observationDate: '2026-09-09', recordedAt: '2026-09-09T12:00:00.000Z' }
  ], verificationItems: [{ id: 'verify-incomplete', customerId: 'c1', equipmentRecordId: 'incomplete', reasonCodes: ['unknownIdentity'], supportingEvidenceEntryIds: ['e-incomplete'], status: 'open', createdAt: '2026-09-01T12:00:00.000Z' }]
}
const result = { schemaVersion: 'opportunity-identification-smoke-v1', synthetic: true, evaluatedAt, execution: 'local deterministic rules; no QVAC inference', signals: [], assertions: null, failure: null }

try {
  const service = new WorkspaceService(state, async () => {}, { now: () => new Date(evaluatedAt) })
  const before = service.snapshot()
  result.signals = service.opportunitySignals({ customerId: 'c1' })
  const repeated = service.opportunitySignals({ customerId: 'c1' })
  const typesByRecord = Object.fromEntries(['old', 'incomplete', 'control'].map((id) => [id, result.signals.filter((signal) => signal.context.equipmentRecordId === id).map(({ type }) => type)]))
  assert(typesByRecord.old.includes('reportedAgeReview'), 'No se emitió la revisión por antigüedad reportada')
  assert(typesByRecord.incomplete.includes('incompleteInformationReview') && typesByRecord.incomplete.includes('staleEvidenceReview') && typesByRecord.incomplete.includes('materialVerificationReview'), 'No se emitieron las señales esperadas para información incompleta, antigua y con verificación material')
  assert(typesByRecord.control.length === 0, 'El control reciente y completo generó una señal indebida')
  assert(result.signals.every((signal) => signal.evidenceIds.length && signal.reason && signal.rule.version), 'Hay una señal sin explicación, regla o evidencia')
  const text = JSON.stringify(result.signals).toLocaleLowerCase('es')
  for (const phrase of ['intención de compra', 'necesidad clínica', 'obsolescencia', 'oportunidad de venta confirmada']) assert(!text.includes(phrase), `Afirmación prohibida: ${phrase}`)
  assert(JSON.stringify(repeated) === JSON.stringify(result.signals), 'El resultado repetido no fue estable')
  assert(JSON.stringify(service.snapshot()) === JSON.stringify(before), 'El cálculo modificó el Workspace')
  result.assertions = { exactScenarioSignals: true, inspectableEvidence: true, deterministicFiltering: service.opportunitySignals({ type: 'reportedAgeReview' }).length === 1, stableRerun: true, inputMutation: false, equipmentRecordGrowth: 0, verificationItemsResolved: 0, claimsAcceptedOrChanged: 0, reconciliationChanges: 0, confidenceChanges: 0, qvacCalls: 0 }
} catch (error) {
  result.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}
console.log(JSON.stringify(result, null, 2))
function assert(condition, message) { if (!condition) throw new Error(message) }
