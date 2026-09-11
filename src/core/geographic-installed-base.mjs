export const GEOGRAPHIC_MAP_POLICY = deepFreeze({
  version: 'geographic-installed-base-v1',
  preferredCountry: 'Panama',
  unknownLabel: 'Ubicación no especificada',
  disclaimer: 'Visualización esquemática y aproximada basada exclusivamente en datos sintéticos del Workspace local. No representa ubicaciones reales ni precisión geográfica.'
})

export function buildGeographicInstalledBase(source, requestedFilters = {}, policy = GEOGRAPHIC_MAP_POLICY) {
  const customers = structuredClone(source.customers ?? [])
  const equipmentRecords = structuredClone(source.equipmentRecords ?? [])
  const filters = normalizeFilters(requestedFilters)
  const rows = customers.map((customer) => customerRow(customer, equipmentRecords, policy))
  const filteredRows = rows
    .filter((row) => !filters.region || row.region === filters.region)
    .filter((row) => !filters.country || row.country === filters.country)
    .filter((row) => !filters.city || row.city === filters.city)
    .map((row) => ({ ...row, equipment: filters.modality ? row.equipment.filter(({ modality }) => modality === filters.modality) : row.equipment }))
    .filter((row) => !filters.modality || row.equipment.length)

  const hierarchy = buildHierarchy(filteredRows, policy)
  const selectedEquipment = filteredRows.flatMap(({ equipment }) => equipment)
  return {
    version: policy.version,
    kind: 'syntheticSchematicGeographicReadModel',
    filters,
    initialFocus: initialFocus(filteredRows, filters, policy),
    availableFilters: {
      regions: sortGeography(unique(rows.map(({ region }) => region)), null, policy.unknownLabel),
      countries: sortGeography(unique(rows.map(({ country }) => country)), policy.preferredCountry, policy.unknownLabel),
      cities: sortGeography(unique(rows.map(({ city }) => city)), null, policy.unknownLabel),
      modalities: unique(equipmentRecords.map(({ modality }) => modality).filter(Boolean)).sort(localeCompare)
    },
    totals: { customers: filteredRows.length, equipment: selectedEquipment.length },
    byModality: aggregateModalities(selectedEquipment),
    hierarchy,
    cityNodes: hierarchy.flatMap(({ countries }) => countries).flatMap(({ name: country, cities }) => cities.map((city) => ({
      region: city.region,
      country,
      city: city.name,
      customerCount: city.customers.length,
      equipmentCount: city.equipmentCount,
      modalities: city.byModality,
      customers: city.customers.map(({ id, name, equipmentCount, customer360Target }) => ({ id, name, equipmentCount, customer360Target }))
    }))),
    synthetic: true,
    readOnly: true,
    externalRequests: 0,
    qvacCalls: 0,
    disclaimer: policy.disclaimer
  }
}

function customerRow(customer, equipmentRecords, policy) {
  const region = known(customer.region) ? customer.region : policy.unknownLabel
  const country = known(customer.country) ? customer.country : policy.unknownLabel
  const city = known(customer.city) ? customer.city : policy.unknownLabel
  const equipment = equipmentRecords
    .filter(({ customerId }) => customerId === customer.id)
    .map((record) => ({
      id: record.id,
      modality: record.modality,
      status: record.status,
      confidenceBand: record.confidenceScore?.band?.key ?? 'unavailable',
      latestObservationDate: record.latestObservationDate ?? null,
      latestEvidenceAt: record.latestEvidenceAt ?? null,
      evidenceObservationIds: structuredClone(record.evidenceObservationIds ?? []),
      evidenceEntryIds: structuredClone(record.evidenceEntryIds ?? [])
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
  return {
    id: customer.id,
    name: customer.name,
    site: customer.site ?? null,
    region,
    country,
    city,
    geographicPrecision: city !== policy.unknownLabel ? 'city' : country !== policy.unknownLabel ? 'country' : region !== policy.unknownLabel ? 'region' : 'unknown',
    equipment,
    equipmentCount: equipment.length,
    byModality: aggregateModalities(equipment),
    customer360Target: customer.id
  }
}

function buildHierarchy(rows, policy) {
  const regions = new Map()
  for (const row of rows) {
    if (!regions.has(row.region)) regions.set(row.region, new Map())
    const countries = regions.get(row.region)
    if (!countries.has(row.country)) countries.set(row.country, new Map())
    const cities = countries.get(row.country)
    if (!cities.has(row.city)) cities.set(row.city, [])
    cities.get(row.city).push(row)
  }
  return sortGeography([...regions.keys()], null, policy.unknownLabel).map((region) => {
    const countries = regions.get(region)
    return {
      level: 'region', name: region,
      countries: sortGeography([...countries.keys()], policy.preferredCountry, policy.unknownLabel).map((country) => {
        const cities = countries.get(country)
        return {
          level: 'country', name: country, region,
          cities: sortGeography([...cities.keys()], null, policy.unknownLabel).map((city) => {
            const cityCustomers = cities.get(city).sort((left, right) => left.name.localeCompare(right.name, 'es'))
            const equipment = cityCustomers.flatMap(({ equipment }) => equipment)
            return { level: 'city', name: city, region, country, customers: cityCustomers, equipmentCount: equipment.length, byModality: aggregateModalities(equipment) }
          })
        }
      })
    }
  })
}

function initialFocus(rows, filters, policy) {
  if (filters.country && rows.some(({ country }) => country === filters.country)) return { country: filters.country, reason: 'selected-country-filter' }
  if (rows.some(({ country }) => country === policy.preferredCountry)) return { country: policy.preferredCountry, reason: 'preferred-country-with-applicable-data' }
  const country = sortGeography(unique(rows.map(({ country }) => country)), null, policy.unknownLabel)[0] ?? policy.unknownLabel
  return { country, reason: country === policy.unknownLabel ? 'geography-not-specified' : 'first-applicable-country' }
}

function aggregateModalities(equipment) {
  const counts = new Map()
  for (const { modality } of equipment) counts.set(modality, (counts.get(modality) ?? 0) + 1)
  return [...counts.entries()].sort(([left], [right]) => localeCompare(left, right)).map(([modality, count]) => ({ modality, count }))
}

function normalizeFilters(filters) {
  return Object.fromEntries(['region', 'country', 'city', 'modality'].map((key) => [key, known(filters[key]) ? String(filters[key]).trim() : null]))
}

function sortGeography(values, preferred, unknown) {
  return [...values].sort((left, right) => {
    if (left === preferred) return -1
    if (right === preferred) return 1
    if (left === unknown) return 1
    if (right === unknown) return -1
    return localeCompare(left, right)
  })
}

function unique(values) { return [...new Set(values)] }
function known(value) { return value !== null && value !== undefined && String(value).trim() !== '' }
function localeCompare(left, right) { return String(left).localeCompare(String(right), 'es') }
function deepFreeze(value) { for (const nested of Object.values(value)) if (nested && typeof nested === 'object') deepFreeze(nested); return Object.freeze(value) }
