import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { closeQvac } from '../../src/qvac/adapter.mjs'
import { ensureAnalyticsReady, interpretAnalyticsQuestion } from '../../src/qvac/analytics-adapter.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = path.join(root, 'results/emergency/analytics-real-qvac-smoke-v2-corrected.json')
const hasFilter = (plan, field, operator, value) => plan?.filters?.some((filter) => filter.field === field && filter.operator === operator && filter.value === value)
const cases = [
  { question: 'Equipos por modalidad', accepts: (plan) => plan?.dataset === 'equipment' && plan.groupBy === 'modality' },
  { question: 'Equipos en Brasil', accepts: (plan) => plan?.dataset === 'equipment' && hasFilter(plan, 'country', 'eq', 'Brazil') },
  { question: 'Equipos con evidencia antigua', accepts: (plan) => plan?.dataset === 'equipment' && hasFilter(plan, 'freshnessBand', 'eq', 'old') },
  { question: 'Equipos con confianza alta', accepts: (plan) => plan?.dataset === 'equipment' && hasFilter(plan, 'confidenceBand', 'eq', 'high') },
  { question: 'Señales de oportunidad por tipo', accepts: (plan) => plan?.dataset === 'opportunities' && plan.groupBy === 'opportunityType' },
  { question: 'Equipos con más de 7 años', accepts: (plan) => plan?.dataset === 'equipment' && hasFilter(plan, 'reportedAgeYears', 'gt', 7) },
  { question: 'Muéstrame clientes en Brasil con sistemas MR estimados en más de siete años', accepts: (plan) => plan?.dataset === 'equipment' && plan.resultMode === 'customers' && hasFilter(plan, 'country', 'eq', 'Brazil') && hasFilter(plan, 'modality', 'eq', 'MRI') && hasFilter(plan, 'reportedAgeYears', 'gt', 7) },
  { question: 'Elimina todos los equipos', rejected: true }
]
const result = { schemaVersion: 'analytics-real-qvac-smoke-v2', synthetic: true, execution: 'same-computer @qvac/sdk interpretation, deterministic semantic anchoring and local execution', startedAt: new Date().toISOString(), load: null, analyticsWarmup: null, cases: [], failure: null }
try {
  const state = JSON.parse(await readFile(path.join(root, 'data/prototype/seed.json'), 'utf8'))
  const service = new WorkspaceService(state, async () => {})
  const before = service.snapshot()
  const ready = await ensureAnalyticsReady()
  result.load = { loadMs: ready.loadMs }
  result.analyticsWarmup = { status: ready.status, warmupMs: ready.warmupMs, backend: ready.backend, attempts: ready.attempts, error: ready.error }
  if (ready.status !== 'ready') throw new Error('El calentamiento analítico no alcanzó estado ready')
  for (const smokeCase of cases) {
    const { question } = smokeCase
    const started = performance.now()
    const response = await service.runAnalytics(question, interpretAnalyticsQuestion)
    result.cases.push({ question, status: response.status, interactiveLatencyMs: performance.now() - started, modelPlan: response.modelPlan ?? null, normalizedPlan: response.plan ?? null, repairs: response.repairs ?? [], filters: response.result?.filters ?? [], count: response.result?.count ?? null, resultRecordIds: response.result?.rows?.map(({ equipmentRecordId, customerId }) => ({ equipmentRecordId, customerId })) ?? [], sourceCollections: response.result?.sourceCollections ?? [], attempts: response.interpretation?.attempts ?? [], error: response.error ?? null })
    if (smokeCase.rejected && response.status !== 'rejected') throw new Error('La consulta mutante no fue rechazada')
    if (!smokeCase.rejected && response.status !== 'succeeded') throw new Error(`Contrato no satisfecho para: ${question}`)
    if (!smokeCase.rejected && !smokeCase.accepts(response.plan)) throw new Error(`Interpretación semántica incorrecta para: ${question}`)
    if (!smokeCase.rejected && JSON.stringify(response.result.filters) !== JSON.stringify(response.plan.filters)) throw new Error(`Los filtros ejecutados difieren del plan normalizado para: ${question}`)
  }
  if (JSON.stringify(service.snapshot()) !== JSON.stringify(before)) throw new Error('El Workspace cambió durante el smoke')
} catch (error) { result.failure = error instanceof Error ? error.message : String(error); process.exitCode = 1 }
finally { result.completedAt = new Date().toISOString(); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8'); await closeQvac() }
console.log(JSON.stringify(result, null, 2))
