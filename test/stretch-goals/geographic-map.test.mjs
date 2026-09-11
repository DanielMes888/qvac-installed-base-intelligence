import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { buildGeographicInstalledBase, GEOGRAPHIC_MAP_POLICY } from '../../src/core/geographic-installed-base.mjs'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { FileStore } from '../../src/core/file-store.mjs'
import { createPrototypeServer } from '../../src/server.mjs'

const customers = [
  { id: 'panama-capital', name: 'Hospital Brisa Central', site: 'Campus Brisa', region: 'Latin America', country: 'Panama', city: 'Panama City' },
  { id: 'panama-west', name: 'Centro Valle Claro', site: 'Campus Valle', region: 'Latin America', country: 'Panama', city: 'David' },
  { id: 'brazil', name: 'Clínica Horizonte Sul', site: 'Campus Horizonte', region: 'Latin America', country: 'Brazil', city: 'Curitiba' },
  { id: 'unknown', name: 'Centro Sin Coordenadas', site: 'Campus Local' }
]
const equipmentRecords = [
  { id: 'p1-mri', customerId: 'panama-capital', modality: 'MRI', status: 'verified', evidenceEntryIds: [] },
  { id: 'p1-ct', customerId: 'panama-capital', modality: 'CT', status: 'provisional', evidenceEntryIds: [] },
  { id: 'p2-us', customerId: 'panama-west', modality: 'Ultrasound', status: 'verified', evidenceEntryIds: [] },
  { id: 'br-mri', customerId: 'brazil', modality: 'MRI', status: 'verified', evidenceEntryIds: [] },
  { id: 'u-mon', customerId: 'unknown', modality: 'Patient monitoring', status: 'provisional', evidenceEntryIds: [] }
]

test('Panama is the initial focus with multiple cities and an international secondary country', () => {
  const view = buildGeographicInstalledBase({ customers, equipmentRecords })
  assert.equal(view.initialFocus.country, 'Panama')
  assert.equal(view.initialFocus.reason, 'preferred-country-with-applicable-data')
  assert.deepEqual(view.availableFilters.countries, ['Panama', 'Brazil', GEOGRAPHIC_MAP_POLICY.unknownLabel])
  const panama = view.hierarchy[0].countries[0]
  assert.equal(panama.name, 'Panama')
  assert.deepEqual(panama.cities.map(({ name }) => name), ['David', 'Panama City'])
  assert.equal(view.hierarchy[0].countries.some(({ name }) => name === 'Brazil'), true)
  assert.equal(view.cityNodes.flatMap(({ customers }) => customers).every(({ id, customer360Target }) => id === customer360Target), true)
})

test('hierarchy preserves region, country, city, customer, equipment and exact aggregates', () => {
  const view = buildGeographicInstalledBase({ customers, equipmentRecords })
  assert.equal(view.totals.customers, 4)
  assert.equal(view.totals.equipment, 5)
  assert.deepEqual(view.byModality, [{ modality: 'CT', count: 1 }, { modality: 'MRI', count: 2 }, { modality: 'Patient monitoring', count: 1 }, { modality: 'Ultrasound', count: 1 }])
  const capital = view.hierarchy.flatMap(({ countries }) => countries).flatMap(({ cities }) => cities).flatMap(({ customers }) => customers).find(({ id }) => id === 'panama-capital')
  assert.equal(capital.equipmentCount, 2)
  assert.deepEqual(capital.equipment.map(({ id }) => id), ['p1-ct', 'p1-mri'])
  assert.deepEqual(capital.equipment[0].evidenceObservationIds, [])
  assert.equal(capital.customer360Target, 'panama-capital')
})

test('geographic and modality filters are deterministic and never mutate inputs', () => {
  const source = { customers: structuredClone(customers), equipmentRecords: structuredClone(equipmentRecords) }
  const before = structuredClone(source)
  const first = buildGeographicInstalledBase(source, { country: 'Panama', city: 'Panama City', modality: 'MRI' })
  const second = buildGeographicInstalledBase(source, { country: 'Panama', city: 'Panama City', modality: 'MRI' })
  assert.deepEqual(first, second)
  assert.equal(first.totals.customers, 1)
  assert.equal(first.totals.equipment, 1)
  assert.deepEqual(first.filters, { region: null, country: 'Panama', city: 'Panama City', modality: 'MRI' })
  assert.equal(buildGeographicInstalledBase(source, { modality: 'Patient monitoring' }).initialFocus.country, GEOGRAPHIC_MAP_POLICY.unknownLabel)
  assert.deepEqual(source, before)
})

test('missing geography is explicit and distinct from equipment location scope', () => {
  const view = buildGeographicInstalledBase({ customers, equipmentRecords })
  const unknownRegion = view.hierarchy.find(({ name }) => name === GEOGRAPHIC_MAP_POLICY.unknownLabel)
  const customer = unknownRegion.countries[0].cities[0].customers[0]
  assert.equal(customer.geographicPrecision, 'unknown')
  assert.equal(customer.country, GEOGRAPHIC_MAP_POLICY.unknownLabel)
  assert.equal('quantityScope' in customer, false)
  assert.equal('locationScope' in customer, false)
})

test('seed adds synthetic geography without changing customer ids or equipment counts', async () => {
  const state = JSON.parse(await readFile(new URL('../../data/prototype/seed.json', import.meta.url), 'utf8'))
  assert.deepEqual(state.customers.map(({ id }) => id), ['northbridge', 'meadow', 'harbor'])
  assert.deepEqual(Object.fromEntries(state.customers.map(({ id }) => [id, state.equipmentRecords.filter(({ customerId }) => customerId === id).length])), { northbridge: 2, meadow: 2, harbor: 1 })
  assert.equal(state.customers.filter(({ country }) => country === 'Panama').length, 2)
  assert.equal(state.customers.filter(({ country }) => country === 'Brazil').length, 1)
  assert.equal(new Set(state.customers.filter(({ country }) => country === 'Panama').map(({ city }) => city)).size, 2)
})

test('an existing synthetic Workspace receives only missing geography defaults at load time', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-map-migration-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const currentSeed = JSON.parse(await readFile(new URL('../../data/prototype/seed.json', import.meta.url), 'utf8'))
  const legacyWorkspace = structuredClone(currentSeed)
  legacyWorkspace.customers = legacyWorkspace.customers.map(({ region, country, city, ...customer }) => customer)
  legacyWorkspace.reconciliationLinks = [{ id: 'preserved-link', equipmentRecordId: 'nb-mri-01' }]
  const seedPath = path.join(directory, 'seed.json')
  const workspacePath = path.join(directory, 'workspace.json')
  await writeFile(seedPath, JSON.stringify(currentSeed), 'utf8')
  await writeFile(workspacePath, JSON.stringify(legacyWorkspace), 'utf8')

  const loaded = await new FileStore({ seedPath, workspacePath }).load()
  assert.deepEqual(loaded.customers.map(({ country }) => country), ['Panama', 'Panama', 'Brazil'])
  assert.deepEqual(loaded.equipmentRecords, legacyWorkspace.equipmentRecords)
  assert.deepEqual(loaded.reconciliationLinks, legacyWorkspace.reconciliationLinks)
  assert.equal('country' in (JSON.parse(await readFile(workspacePath, 'utf8'))).customers[0], false)

  const explicitUnknowns = structuredClone(legacyWorkspace)
  explicitUnknowns.customers[0] = { ...explicitUnknowns.customers[0], region: 'Región sintética propia', country: null, city: '' }
  const explicitWorkspacePath = path.join(directory, 'explicit-workspace.json')
  await writeFile(explicitWorkspacePath, JSON.stringify(explicitUnknowns), 'utf8')
  const explicitLoaded = await new FileStore({ seedPath, workspacePath: explicitWorkspacePath }).load()
  assert.deepEqual(
    { region: explicitLoaded.customers[0].region, country: explicitLoaded.customers[0].country, city: explicitLoaded.customers[0].city },
    { region: 'Región sintética propia', country: null, city: '' }
  )
})

test('Workspace geographic view is read-only and preserves reconciliation state', () => {
  const state = {
    label: 'Datos sintéticos',
    customers,
    equipmentRecords,
    observations: [],
    evidenceEntries: [],
    verificationItems: [],
    reconciliationLinks: [{ id: 'link-1', equipmentRecordId: 'p1-mri', observationId: 'observation-1' }]
  }
  const workspace = new WorkspaceService(state, async () => {}, { now: () => new Date('2026-09-11T12:00:00.000Z') })
  const before = workspace.snapshot()
  const view = workspace.geographicInstalledBase({ country: 'Panama' })
  const records = view.hierarchy.flatMap(({ countries }) => countries).flatMap(({ cities }) => cities).flatMap(({ customers }) => customers).flatMap(({ equipment }) => equipment)
  assert.equal(records.every(({ confidenceBand, latestObservationDate }) => confidenceBand && latestObservationDate === null), true)
  assert.deepEqual(workspace.snapshot(), before)
})

test('HTTP and UI expose local filters, schematic nodes, accessible tree and Customer 360 navigation without external assets', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qvac-map-'))
  const app = await createPrototypeServer({ workspacePath: path.join(directory, 'workspace.json'), extractor: async () => { throw new Error('QVAC no debe ejecutarse') }, analyticsInterpreter: async () => { throw new Error('Analítica no debe ejecutarse') } })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })
  const response = await fetch(`${origin}/api/geography?country=Panama&modality=MRI`).then((result) => result.json())
  assert.equal(response.filters.country, 'Panama')
  assert.equal(response.filters.modality, 'MRI')
  const page = await fetch(origin).then((result) => result.text())
  const script = await fetch(`${origin}/app.js`).then((result) => result.text())
  for (const copy of ['Mapa de base instalada', 'Mapa esquemático', 'Vista jerárquica accesible', 'Ubicación aproximada', 'Abrir Customer 360', 'Procedencia:', 'La certeza de claims no se resume']) assert.match(page + script, new RegExp(copy))
  assert.match(page, /id="workspace-geographic"[^>]*tabindex="-1"/)
  assert.match(page, /id="geographic-tree"[^>]*aria-label=/)
  assert.doesNotMatch(page + script, /role="tree(item)?"/)
  assert.match(script, /data-customer/)
  assert.match(script, /map-customer-link/)
  assert.match(script, /button\.dataset\.country/)
  assert.match(script, /\$\('#customer'\)\.value = customerId/)
  assert.match(script, /activateWorkspace\('installed'\)/)
  assert.match(script, /\$\('#installed-title'\)\.focus/)
  assert.doesNotMatch(page + script, /googleapis|google\.com\/maps|mapbox|openstreetmap|https?:\/\/[^'"` ]+/i)
})
