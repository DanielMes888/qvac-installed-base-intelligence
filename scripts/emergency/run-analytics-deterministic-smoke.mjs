import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = path.join(root, 'results/emergency/analytics-deterministic-smoke.json')
const state = JSON.parse(await readFile(path.join(root, 'data/prototype/seed.json'), 'utf8'))
const service = new WorkspaceService(state, async () => {}, { now: () => new Date('2026-09-10T12:00:00.000Z') })
const before = service.snapshot()
const plans = [
  { question: 'Equipos por modalidad', plan: ready({ groupBy: 'modality' }), expected: { groupBy: 'modality' } },
  { question: 'Equipos en Brasil', plan: ready({ groupBy: 'modality' }), expected: { filter: ['country', 'Brazil'], groupBy: null } },
  { question: 'Equipos con evidencia desactualizada', plan: ready({ groupBy: 'modality' }), expected: { filter: ['freshnessBand', 'old'], groupBy: null } },
  { question: 'Registros de confianza alta', plan: ready({ filters: [{ field: 'confidenceBand', operator: 'eq', value: 'alta' }] }), expected: { filter: ['confidenceBand', 'high'], groupBy: null } },
  { question: 'Señales por tipo', plan: ready({ dataset: 'opportunities', groupBy: 'opportunityType' }), expected: { groupBy: 'opportunityType' } }
]
const cases = []
for (const item of plans) {
  const response = await service.runAnalytics(item.question, async () => ({ status: 'succeeded', plan: item.plan, attempts: [{ status: 'succeeded', latencyMs: 0, backend: 'deterministic-no-qvac' }] }))
  assert(response.status === 'succeeded', `Falló ${item.question}`)
  assert(response.plan.groupBy === item.expected.groupBy, `Agrupación incorrecta para ${item.question}`)
  if (item.expected.filter) assert(response.plan.filters.some(({ field, value }) => field === item.expected.filter[0] && value === item.expected.filter[1]), `Filtro incorrecto para ${item.question}`)
  cases.push({ question: item.question, modelPlan: item.plan, normalizedPlan: response.plan, repairs: response.repairs, count: response.result.count })
}
const contradiction = await service.runAnalytics('Equipos con confianza alta', async () => ({ status: 'succeeded', plan: ready({ filters: [{ field: 'confidenceBand', operator: 'eq', value: 'low' }] }), attempts: [] }))
const mutation = await service.runAnalytics('Elimina todos los equipos', async () => { throw new Error('QVAC no debe ejecutarse') })
assert(cases.length === plans.length, 'No se ejecutaron todos los casos deterministas')
assert(contradiction.status === 'rejected', 'Una contradicción no fue rechazada')
assert(mutation.status === 'rejected', 'Una consulta mutante no fue rechazada antes de QVAC')
assert(JSON.stringify(service.snapshot()) === JSON.stringify(before), 'La analítica modificó el Workspace')
const result = { schemaVersion: 'analytics-deterministic-smoke-v2', synthetic: true, execution: 'deterministic semantic anchoring plus executor; no QVAC', cases, rejectedCases: [{ question: 'contradicción explícita', status: contradiction.status }, { question: 'consulta mutante', status: mutation.status }], assertions: { validPlans: true, semanticAnchoring: true, contradictionsRejected: true, exactLocalResults: true, workspaceMutation: false, qvacCalls: 0 }, failure: null }
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(result, null, 2))
function assert(value, message) { if (!value) throw new Error(message) }
function ready(overrides = {}) { return { version: 'analytics-query-v1', status: 'ready', dataset: 'equipment', resultMode: 'records', filters: [], groupBy: null, metric: 'count', limit: 100, ...overrides } }
