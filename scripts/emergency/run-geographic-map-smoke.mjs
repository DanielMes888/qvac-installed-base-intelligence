import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = path.join(root, 'results/emergency/geographic-map-smoke.json')
const state = JSON.parse(await readFile(path.join(root, 'data/prototype/seed.json'), 'utf8'))
const pageSource = await readFile(path.join(root, 'public/index.html'), 'utf8')
const appSource = await readFile(path.join(root, 'public/app.js'), 'utf8')
const service = new WorkspaceService(state, async () => {}, { now: () => new Date('2026-09-11T12:00:00.000Z') })
const before = service.snapshot()
const full = service.geographicInstalledBase()
const panamaMri = service.geographicInstalledBase({ country: 'Panama', modality: 'MRI' })
const missingState = structuredClone(state)
missingState.customers.push({ id: 'unknown-geography-smoke', name: 'Centro Sintético Sin Ubicación', site: 'Campus Sintético' })
const missing = new WorkspaceService(missingState, async () => {}, { now: () => new Date('2026-09-11T12:00:00.000Z') }).geographicInstalledBase()
const visualTarget = full.cityNodes[0].customers[0].customer360Target
const hierarchyTarget = full.hierarchy[0].countries[0].cities[0].customers[0].customer360Target
const openedCustomer = service.customerView(visualTarget)

assert(full.initialFocus.country === 'Panama', 'Panamá no quedó como enfoque inicial')
assert(full.totals.customers === 3 && full.totals.equipment === 5, 'Los conteos base cambiaron')
assert(full.hierarchy[0].countries[0].name === 'Panama', 'Panamá no quedó primero en la jerarquía')
assert(full.hierarchy[0].countries.some(({ name }) => name === 'Brazil'), 'Falta el caso internacional sintético')
assert(panamaMri.totals.customers === 1 && panamaMri.totals.equipment === 1, 'Los filtros Panamá + MRI no produjeron el conteo exacto')
assert(full.hierarchy.flatMap(({ countries }) => countries).flatMap(({ cities }) => cities).flatMap(({ customers }) => customers).every(({ id, customer360Target }) => id === customer360Target), 'Un enlace no apunta al Customer 360 correspondiente')
assert(visualTarget === hierarchyTarget && openedCustomer.customer.id === visualTarget, 'Las rutas visual y jerárquica no abren el Customer 360 correspondiente')
assert(appSource.includes('.map-customer-link') && appSource.includes("activateWorkspace('installed')") && appSource.includes("$('#installed-title').focus"), 'El cableado accesible hacia Customer 360 no está presente')
assert(!/https?:\/\//i.test(pageSource + appSource), 'La vista contiene una solicitud o recurso externo')
assert(missing.hierarchy.some(({ name }) => name === 'Ubicación no especificada'), 'La geografía ausente no quedó explícita')
assert(JSON.stringify(service.snapshot()) === JSON.stringify(before), 'El mapa modificó el Workspace')

const result = {
  schemaVersion: 'geographic-installed-base-smoke-v1',
  synthetic: true,
  execution: 'deterministic local read model; no QVAC and no network',
  initialFocus: full.initialFocus,
  totals: full.totals,
  byModality: full.byModality,
  hierarchy: full.hierarchy.map(({ name: region, countries }) => ({ region, countries: countries.map(({ name: country, cities }) => ({ country, cities: cities.map(({ name: city, equipmentCount, customers }) => ({ city, equipmentCount, customers: customers.map(({ id, name, equipmentCount: count, customer360Target }) => ({ id, name, equipmentCount: count, customer360Target })) })) })) })),
  filteredCase: { filters: panamaMri.filters, totals: panamaMri.totals, byModality: panamaMri.byModality },
  navigation: { visualTarget, hierarchyTarget, openedCustomerId: openedCustomer.customer.id, customerContextPreserved: true },
  missingGeographyLabel: 'Ubicación no especificada',
  assertions: { hierarchy: true, aggregations: true, filters: true, visualAndHierarchyCustomer360Navigation: true, keyboardAccessibleActions: true, panamaInitialFocus: true, missingGeography: true, externalRequests: 0, qvacCalls: 0, workspaceMutation: false },
  failure: null
}
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))

function assert(value, message) { if (!value) throw new Error(message) }
