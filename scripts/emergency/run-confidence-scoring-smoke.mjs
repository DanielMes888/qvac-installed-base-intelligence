import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'emergency', 'confidence-scoring-smoke.json')
const evaluatedAt = '2026-09-10T12:00:00.000Z'
const baseState = {
  synthetic: true,
  label: 'Datos completamente sintéticos para demostración.',
  customers: [{ id: 'synthetic-customer', name: 'Hospital Sintético', site: 'Campus de prueba' }],
  equipmentRecords: [
    {
      id: 'synthetic-complete', customerId: 'synthetic-customer', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiología',
      evidenceObservationIds: [], evidenceEntryIds: ['recent-a', 'recent-b']
    },
    {
      id: 'synthetic-incomplete', customerId: 'synthetic-customer', status: 'provisional', modality: 'CT', manufacturer: '', model: null, location: 'Desconocido',
      evidenceObservationIds: ['old-observation'], evidenceEntryIds: []
    }
  ],
  observations: [{
    id: 'old-observation', customerId: 'synthetic-customer', originalText: 'Observé un CT sin fabricante, modelo ni ubicación confirmados.', observationDate: '2025-12-01', recordedAt: '2025-12-02T14:00:00.000Z',
    draftClaims: [{ type: 'equipmentType', value: 'CT', reviewedValue: 'CT', decision: 'accepted', locationScope: 'dept', negated: false }]
  }],
  evidenceEntries: [
    { id: 'recent-a', equipmentRecordId: 'synthetic-complete', customerId: 'synthetic-customer', type: 'seedReference', text: 'Fuente sintética A confirma el MRI DemoScan.', author: 'Fuente sintética A', origin: 'manual', observationDate: '2026-09-09', recordedAt: '2026-09-09T14:00:00.000Z' },
    { id: 'recent-b', equipmentRecordId: 'synthetic-complete', customerId: 'synthetic-customer', type: 'seedReference', text: 'Fuente sintética B reporta el mismo MRI.', author: 'Fuente sintética B', origin: 'manual', observationDate: '2026-09-08', recordedAt: '2026-09-08T14:00:00.000Z' }
  ],
  verificationItems: []
}
const stateAfterAllowedEvidence = structuredClone(baseState)
stateAfterAllowedEvidence.equipmentRecords[0].evidenceEntryIds.push('recent-c')
stateAfterAllowedEvidence.evidenceEntries.push({
  id: 'recent-c', equipmentRecordId: 'synthetic-complete', customerId: 'synthetic-customer', type: 'seedReference', text: 'Fuente sintética C corrobora ubicación y modelo.', author: 'Fuente sintética C', origin: 'manual', observationDate: '2026-09-10', recordedAt: '2026-09-10T10:00:00.000Z'
})
const result = {
  schemaVersion: 'confidence-scoring-smoke-v1',
  synthetic: true,
  evaluatedAt,
  execution: 'local deterministic customer read-model; no QVAC inference',
  scenario: 'one incomplete old Observation and two independently sourced recent Evidence Entries',
  beforeAllowedEvidenceChange: null,
  afterAllowedEvidenceChange: null,
  incompleteOldObservation: null,
  assertions: null,
  failure: null
}

try {
  const now = () => new Date(evaluatedAt)
  const beforeService = new WorkspaceService(baseState, async () => {}, { now })
  const afterService = new WorkspaceService(stateAfterAllowedEvidence, async () => {}, { now })
  const beforeSnapshot = beforeService.snapshot()
  const afterSnapshot = afterService.snapshot()
  const beforeView = beforeService.customerView('synthetic-customer')
  const repeatedView = beforeService.customerView('synthetic-customer')
  const afterView = afterService.customerView('synthetic-customer')
  const clientScript = await readFile(path.join(root, 'public', 'app.js'), 'utf8')

  result.beforeAllowedEvidenceChange = beforeView.equipmentRecords.find(({ id }) => id === 'synthetic-complete').confidenceScore
  result.afterAllowedEvidenceChange = afterView.equipmentRecords.find(({ id }) => id === 'synthetic-complete').confidenceScore
  result.incompleteOldObservation = beforeView.equipmentRecords.find(({ id }) => id === 'synthetic-incomplete').confidenceScore

  assert(result.beforeAllowedEvidenceChange.total === 90, 'Dos fuentes recientes independientes no produjeron 40 + 30 + 20 = 90')
  assert(result.beforeAllowedEvidenceChange.components.corroboration.distinctSourceCount === 2, 'No se conservaron exactamente dos procedencias independientes')
  assert(result.beforeAllowedEvidenceChange.evidence.every(({ excerpt, scope }) => excerpt && scope === 'explicitRecordScope'), 'La evidencia visible no conserva texto y alcance')
  assert(result.afterAllowedEvidenceChange.total === 100, 'La tercera fuente independiente no recalculó 40 + 30 + 30 = 100')
  assert(result.incompleteOldObservation.total === 10, 'La Observation antigua e incompleta no produjo 10 + 0 + 0 = 10')
  assert(result.incompleteOldObservation.components.freshness.points === 0, 'La Observation antigua aumentó vigencia')
  assert(JSON.stringify(repeatedView) === JSON.stringify(beforeView), 'La repetición del read-model no fue estable')
  assert(JSON.stringify(beforeService.snapshot()) === JSON.stringify(beforeSnapshot), 'El cálculo modificó el Workspace inicial')
  assert(JSON.stringify(afterService.snapshot()) === JSON.stringify(afterSnapshot), 'La recalculación modificó el Workspace actualizado')
  assert(/href="#\$\{confidenceEvidenceAnchor\(id\)\}"/.test(clientScript), 'La UI no enlaza las procedencias mostradas')
  assert(/item\.excerpt/.test(clientScript), 'La UI no muestra el contenido de la evidencia')
  assert(/component\.points/.test(clientScript) && /score\.total/.test(clientScript), 'La UI no muestra matemática de componentes y total')

  result.assertions = {
    displayedComponentMathAndTotal: true,
    inspectableEvidenceLinks: true,
    stableRerun: true,
    recomputedAfterAllowedEvidenceChange: true,
    inputMutation: false,
    equipmentRecordGrowth: 0,
    verificationItemsResolved: 0,
    claimsAcceptedOrChanged: 0,
    reconciliationChanges: 0,
    qvacCalls: 0
  }
} catch (error) {
  result.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify(result, null, 2))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
