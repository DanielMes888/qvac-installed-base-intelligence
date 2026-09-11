export const CONFIDENCE_SCORE_POLICY = deepFreeze({
  version: 'equipment-confidence-v1',
  weights: { completeness: 40, freshness: 30, corroboration: 30 },
  completeness: {
    fields: [
      { key: 'modality', label: 'modalidad', points: 10 },
      { key: 'manufacturer', label: 'fabricante', points: 10 },
      { key: 'model', label: 'modelo', points: 10 },
      { key: 'location', label: 'ubicación', points: 10 }
    ]
  },
  freshness: {
    thresholds: [
      { maximumAgeDays: 30, points: 30, label: 'reciente' },
      { maximumAgeDays: 90, points: 20, label: 'vigencia intermedia' },
      { maximumAgeDays: 180, points: 10, label: 'antigua' },
      { maximumAgeDays: null, points: 0, label: 'muy antigua' }
    ],
    unknownDatePoints: 0
  },
  corroboration: {
    thresholds: [
      { minimumDistinctSources: 3, points: 30 },
      { minimumDistinctSources: 2, points: 20 },
      { minimumDistinctSources: 0, points: 0 }
    ]
  },
  bands: [
    { minimum: 80, key: 'high', label: 'Alta' },
    { minimum: 50, key: 'medium', label: 'Media' },
    { minimum: 0, key: 'low', label: 'Baja' }
  ],
  disclaimer: 'Indicador configurable del prototipo. No es una probabilidad estadística. No es una regla oficial de Philips, un estado de certeza, una prioridad de verificación, una revisión humana ni una confirmación de identidad.'
})

export function calculateEquipmentConfidence({
  record,
  observations = [],
  evidenceEntries = [],
  evaluatedAt,
  policy = CONFIDENCE_SCORE_POLICY
}) {
  const evaluation = requireDate(evaluatedAt, 'La fecha de evaluación')
  validatePolicy(policy)

  const related = relatedEvidence(record, observations, evidenceEntries)
  const sources = provenanceSources(record, related)
  const eligibleSources = sources.filter(({ compatible, scopeExplicit }) => compatible && scopeExplicit)
  const completeness = completenessComponent(record, policy)
  const freshness = freshnessComponent(sources, evaluation, policy)
  const corroboration = corroborationComponent(sources, policy)
  const evidence = evidencePresentation(sources, freshness, corroboration)
  if (!eligibleSources.length) {
    return {
      version: policy.version,
      kind: 'configurablePrototypeIndicator',
      available: false,
      total: null,
      band: { key: 'unavailable', label: 'No disponible' },
      evaluatedOn: evaluation.toISOString().slice(0, 10),
      availabilityReason: 'Evidencia insuficiente: ninguna procedencia compatible tiene alcance explícito para este registro.',
      components: { completeness, freshness, corroboration },
      evidence,
      disclaimer: policy.disclaimer
    }
  }
  const total = completeness.points + freshness.points + corroboration.points
  const band = policy.bands.find(({ minimum }) => total >= minimum)

  return {
    version: policy.version,
    kind: 'configurablePrototypeIndicator',
    available: true,
    total,
    band: { key: band.key, label: band.label },
    evaluatedOn: evaluation.toISOString().slice(0, 10),
    availabilityReason: null,
    components: { completeness, freshness, corroboration },
    evidence,
    disclaimer: policy.disclaimer
  }
}

function completenessComponent(record, policy) {
  const available = policy.completeness.fields.filter(({ key }) => hasKnownValue(record?.[key]))
  const missing = policy.completeness.fields.filter(({ key }) => !hasKnownValue(record?.[key]))
  const points = available.reduce((sum, field) => sum + field.points, 0)
  return {
    points,
    maximum: policy.weights.completeness,
    availableFields: available.map(({ key }) => key),
    missingFields: missing.map(({ key }) => key),
    reason: missing.length
      ? `${available.length} de ${policy.completeness.fields.length} campos completos; faltan ${missing.map(({ label }) => label).join(', ')}.`
      : `${available.length} de ${policy.completeness.fields.length} campos completos.`
  }
}

function freshnessComponent(sources, evaluation, policy) {
  const compatibleSources = sources.filter(({ compatible, scopeExplicit }) => compatible && scopeExplicit)
  const unknownDateSourceCount = compatibleSources.filter(({ observationDate }) => !validDateValue(observationDate)).length
  const futureDateSourceCount = compatibleSources.filter(({ observationDate }) => isFutureDate(observationDate, evaluation)).length
  const dates = compatibleSources
    .map(({ observationDate }) => validDateValue(observationDate))
    .filter((value) => value && !isFutureDate(value, evaluation))
  const dateLimitations = []
  if (unknownDateSourceCount) dateLimitations.push(`${unknownDateSourceCount} procedencia${unknownDateSourceCount === 1 ? '' : 's'} con fecha de observación desconocida`)
  if (futureDateSourceCount) dateLimitations.push(`${futureDateSourceCount} procedencia${futureDateSourceCount === 1 ? '' : 's'} con fecha futura excluida`)
  if (!dates.length) {
    return {
      points: policy.freshness.unknownDatePoints,
      maximum: policy.weights.freshness,
      latestObservationDate: null,
      ageDays: null,
      unknownDateSourceCount,
      futureDateSourceCount,
      reason: `No hay una fecha de observación aplicable válida; la fecha de registro no la sustituye.${dateLimitations.length ? ` ${dateLimitations.join('; ')}.` : ''}`
    }
  }
  const latestObservationDate = dates.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest)
  const ageDays = ageInDays(latestObservationDate, evaluation)
  const threshold = policy.freshness.thresholds.find(({ maximumAgeDays }) => maximumAgeDays === null || ageDays <= maximumAgeDays)
  return {
    points: threshold.points,
    maximum: policy.weights.freshness,
    latestObservationDate,
    ageDays,
    unknownDateSourceCount,
    futureDateSourceCount,
    reason: `Evidencia ${threshold.label}: la observación aplicable más reciente tiene ${ageDays} día${ageDays === 1 ? '' : 's'} de antigüedad.${dateLimitations.length ? ` También hay ${dateLimitations.join('; ')}.` : ''}`
  }
}

function corroborationComponent(provenance, policy) {
  const sources = new Map()
  const fingerprints = new Set()
  const excludedSourceIds = []
  const incompatibleSourceIds = []
  const unestablishedCompatibilitySourceIds = []
  const unknownScopeSourceIds = []
  const duplicateSourceIds = []
  const possibleChangeSourceIds = []
  for (const source of provenance) {
    if (!source.compatibilityKnown) {
      excludedSourceIds.push(source.id)
      unestablishedCompatibilitySourceIds.push(source.id)
      continue
    }
    if (!source.compatible) {
      excludedSourceIds.push(source.id)
      incompatibleSourceIds.push(source.id)
      continue
    }
    if (!source.scopeExplicit) {
      excludedSourceIds.push(source.id)
      unknownScopeSourceIds.push(source.id)
      continue
    }
    if (source.corroborationEligible === false) {
      excludedSourceIds.push(source.id)
      possibleChangeSourceIds.push(source.id)
      continue
    }
    if (sources.has(source.provenanceKey) || fingerprints.has(source.fingerprint)) {
      duplicateSourceIds.push(source.id)
      continue
    }
    sources.set(source.provenanceKey, source.id)
    fingerprints.add(source.fingerprint)
  }
  const sourceIds = [...sources.values()].sort()
  excludedSourceIds.sort()
  incompatibleSourceIds.sort()
  unestablishedCompatibilitySourceIds.sort()
  unknownScopeSourceIds.sort()
  duplicateSourceIds.sort()
  possibleChangeSourceIds.sort()
  const threshold = policy.corroboration.thresholds.find(({ minimumDistinctSources }) => sourceIds.length >= minimumDistinctSources)
  let reason = sourceIds.length >= 2
    ? `${sourceIds.length} procedencias independientes respaldan el registro.`
    : sourceIds.length === 1
      ? 'Una sola procedencia respalda el registro; no existe corroboración independiente.'
      : 'No hay procedencia vinculada suficiente para corroborar el registro.'
  if (incompatibleSourceIds.length) reason += ` ${incompatibleSourceIds.length} procedencia${incompatibleSourceIds.length === 1 ? '' : 's'} incompatible${incompatibleSourceIds.length === 1 ? '' : 's'} excluida${incompatibleSourceIds.length === 1 ? '' : 's'}.`
  if (unestablishedCompatibilitySourceIds.length) reason += ` ${unestablishedCompatibilitySourceIds.length} procedencia${unestablishedCompatibilitySourceIds.length === 1 ? '' : 's'} sin compatibilidad estructurada excluida${unestablishedCompatibilitySourceIds.length === 1 ? '' : 's'}.`
  if (unknownScopeSourceIds.length) reason += ` ${unknownScopeSourceIds.length} procedencia${unknownScopeSourceIds.length === 1 ? '' : 's'} con alcance desconocido excluida${unknownScopeSourceIds.length === 1 ? '' : 's'}.`
  if (possibleChangeSourceIds.length) reason += ` ${possibleChangeSourceIds.length} procedencia${possibleChangeSourceIds.length === 1 ? '' : 's'} con posible cambio temporal excluida${possibleChangeSourceIds.length === 1 ? '' : 's'} de corroboración.`
  return {
    points: threshold.points,
    maximum: policy.weights.corroboration,
    distinctSourceCount: sourceIds.length,
    sourceIds,
    excludedSourceIds,
    incompatibleSourceIds,
    unestablishedCompatibilitySourceIds,
    unknownScopeSourceIds,
    duplicateSourceIds,
    possibleChangeSourceIds,
    reason
  }
}

function provenanceSources(record, { observations, entries }) {
  const sources = []
  const observationIds = new Set(observations.map(({ id }) => id))
  for (const observation of observations) {
    const acceptedClaims = (observation.draftClaims ?? []).filter(({ decision }) => decision === 'accepted')
    const scopeExplicit = acceptedClaims.length
      ? acceptedClaims.every(hasExplicitClaimScope)
      : knownLocationScope(observation.locationScope)
    const author = observation.author ?? 'Usuario local de demostración'
    sources.push({
      id: `observation:${observation.id}`,
      kind: 'observation',
      label: `Observación ${observation.id}`,
      excerpt: observation.originalText ?? '',
      author,
      fingerprint: fingerprintText(observation.originalText) || `observation-id:${observation.id}`,
      provenanceKey: `observation-source:${normalizedValue(author)}`,
      observationDate: observation.observationDate ?? null,
      compatible: !hasAcceptedConflict(observation, record),
      compatibilityKnown: true,
      scopeExplicit,
      unreviewedScope: acceptedClaims.length === 0 && !scopeExplicit,
      claims: acceptedClaims
    })
  }
  const orphanObservationSources = new Set()
  for (const entry of entries) {
    if (entry.observationId && observationIds.has(entry.observationId)) continue
    const id = entry.observationId ? `observation:${entry.observationId}` : `evidence:${entry.id}`
    if (orphanObservationSources.has(id)) continue
    orphanObservationSources.add(id)
    const compatibility = evidenceEntryCompatibility(entry)
    sources.push({
      id,
      kind: entry.observationId ? 'observation' : 'evidenceEntry',
      label: entry.observationId ? `Observación ${entry.observationId}` : `Evidencia ${entry.id}`,
      excerpt: entry.text ?? '',
      author: entry.author ?? 'Fuente no identificada',
      fingerprint: fingerprintText(entry.text) || `evidence-id:${entry.id}`,
      provenanceKey: entry.observationId
        ? `observation:${entry.observationId}`
        : evidenceProvenanceKey(entry),
      observationDate: entry.observationDate ?? null,
      compatible: compatibility === 'compatible',
      compatibilityKnown: compatibility !== 'unknown',
      scopeExplicit: entry.equipmentRecordId === record?.id || (record?.evidenceEntryIds ?? []).includes(entry.id)
    })
  }
  return excludeCrossSourceConflicts(sources, record)
}

function evidencePresentation(sources, freshness, corroboration) {
  const corroborationIds = new Set(corroboration.sourceIds)
  const duplicateIds = new Set(corroboration.duplicateSourceIds)
  const possibleChangeIds = new Set(corroboration.possibleChangeSourceIds)
  const latestDate = freshness.latestObservationDate
  return sources.map((source) => {
    const exclusionCodes = []
    if (!source.compatibilityKnown) exclusionCodes.push('compatibilityUnestablished')
    else if (!source.compatible) exclusionCodes.push('incompatibleEvidence')
    if (source.unreviewedScope) exclusionCodes.push('unreviewedScope')
    else if (!source.scopeExplicit) exclusionCodes.push('unknownScope')
    if (duplicateIds.has(source.id)) exclusionCodes.push('duplicateProvenance')
    if (possibleChangeIds.has(source.id)) exclusionCodes.push('possibleChangeForCorroboration')
    return {
      id: source.id,
      kind: source.kind,
      label: source.label,
      excerpt: source.excerpt,
      author: source.author,
      observationDate: source.observationDate,
      scope: source.scopeExplicit ? 'explicitRecordScope' : 'unknown',
      compatible: source.compatible,
      exclusionCodes,
      countedForFreshness: source.compatible && source.scopeExplicit && Boolean(validDateValue(source.observationDate)) && source.observationDate === latestDate,
      countedForCorroboration: corroborationIds.has(source.id)
    }
  })
}

function hasAcceptedConflict(observation, record) {
  const comparableFields = { equipmentType: 'modality', manufacturer: 'manufacturer', model: 'model', location: 'location' }
  return (observation.draftClaims ?? [])
    .filter(({ decision }) => decision === 'accepted')
    .some((claim) => {
      const recordField = comparableFields[claim.type]
      if (!recordField) return false
      if (claim.negated) return true
      if (!hasKnownValue(record?.[recordField])) return false
      const claimValue = claim.reviewedValue ?? claim.value
      return hasKnownValue(claimValue) && normalizedValue(claimValue) !== normalizedValue(record[recordField])
    })
}

function excludeCrossSourceConflicts(sources, record) {
  const valuesByClaim = new Map()
  for (const source of sources.filter(({ compatible, scopeExplicit }) => compatible && scopeExplicit)) {
    for (const claim of source.claims ?? []) {
      const comparison = comparableClaimWithoutRecordValue(claim, record, source.observationDate)
      if (!comparison) continue
      if (!valuesByClaim.has(comparison.key)) valuesByClaim.set(comparison.key, [])
      valuesByClaim.get(comparison.key).push({ ...comparison, source })
    }
  }
  for (const claims of valuesByClaim.values()) {
    if (new Set(claims.map(({ value }) => value)).size < 2) continue
    const claimsByPeriod = new Map()
    for (const claim of claims) {
      if (!claimsByPeriod.has(claim.period)) claimsByPeriod.set(claim.period, [])
      claimsByPeriod.get(claim.period).push(claim)
    }
    const incompatibleSources = new Set()
    for (const periodClaims of claimsByPeriod.values()) {
      if (new Set(periodClaims.map(({ value }) => value)).size < 2) continue
      for (const { source } of periodClaims) incompatibleSources.add(source)
    }
    for (const { source } of claims) {
      if (incompatibleSources.has(source)) source.compatible = false
      else {
        source.corroborationEligible = false
        source.possibleChange = true
      }
    }
  }
  return sources
}

function comparableClaimWithoutRecordValue(claim, record, observationDate) {
  const recordFields = { equipmentType: 'modality', manufacturer: 'manufacturer', model: 'model', location: 'location' }
  const recordField = recordFields[claim.type]
  if (recordField) {
    if (hasKnownValue(record?.[recordField]) || claim.negated) return null
    const value = claim.reviewedValue ?? claim.value
    return hasKnownValue(value) ? { key: claim.type, period: observationDate ?? 'unknown-date', value: normalizedValue(value) } : null
  }
  if (claim.type !== 'quantity' || !hasKnownValue(observationDate)) return null
  const value = claim.reviewedValue ?? claim.value
  if (!hasKnownValue(value)) return null
  return { key: `quantity:${claim.quantityScope}:${claim.locationScope}`, period: observationDate, value: normalizedValue(value) }
}

function hasExplicitClaimScope(claim) {
  if (!knownLocationScope(claim.locationScope)) return false
  if (claim.type === 'quantity') return ['observed', 'reportedTotal'].includes(claim.reviewedQuantityScope ?? claim.quantityScope)
  return true
}

function knownLocationScope(value) {
  return ['room', 'dept', 'site', 'customer'].includes(value)
}

function evidenceProvenanceKey(entry) {
  const author = normalizedValue(entry.author ?? '')
  return author ? `evidence-source:${author}` : 'evidence-source:unknown'
}

function evidenceEntryCompatibility(entry) {
  if (entry.compatibility === 'incompatible') return 'incompatible'
  if (entry.compatibility === 'compatible' || entry.type === 'seedReference') return 'compatible'
  return 'unknown'
}

function relatedEvidence(record, observations, evidenceEntries) {
  const observationIds = new Set(record?.evidenceObservationIds ?? [])
  const entryIds = new Set(record?.evidenceEntryIds ?? [])
  const entries = evidenceEntries.filter((entry) => entryIds.has(entry.id) || entry.equipmentRecordId === record?.id || observationIds.has(entry.observationId))
  for (const entry of entries) if (entry.observationId) observationIds.add(entry.observationId)
  return {
    observations: observations.filter(({ id }) => observationIds.has(id)),
    entries
  }
}

function validatePolicy(policy) {
  const { completeness, freshness, corroboration } = policy.weights
  if (completeness !== 40 || freshness !== 30 || corroboration !== 30 || completeness + freshness + corroboration !== 100) {
    throw new Error('La política de confianza debe conservar la ponderación aprobada 40/30/30')
  }
  const completenessTotal = policy.completeness.fields.reduce((sum, field) => sum + field.points, 0)
  if (completenessTotal !== completeness) throw new Error('Los subumbrales de completitud no suman 40 puntos')
  validateThresholdPoints(policy.completeness.fields, completeness, 'completitud')
  validateThresholdPoints(policy.freshness.thresholds, freshness, 'vigencia')
  validateThresholdPoints(policy.corroboration.thresholds, corroboration, 'corroboración')
  if (policy.freshness.unknownDatePoints !== 0) throw new Error('La fecha desconocida debe conservar exactamente 0 puntos de vigencia')
  if (Math.max(...policy.freshness.thresholds.map(({ points }) => points)) !== freshness || policy.freshness.thresholds.at(-1)?.points !== 0 || !strictlyOrdered(policy.freshness.thresholds.slice(0, -1).map(({ maximumAgeDays }) => maximumAgeDays), 'ascending') || policy.freshness.thresholds.at(-1)?.maximumAgeDays !== null) {
    throw new Error('Los umbrales de vigencia deben ser ascendentes y terminar en un caso abierto')
  }
  if (Math.max(...policy.corroboration.thresholds.map(({ points }) => points)) !== corroboration || policy.corroboration.thresholds.at(-1)?.minimumDistinctSources !== 0 || policy.corroboration.thresholds.at(-1)?.points !== 0 || !strictlyOrdered(policy.corroboration.thresholds.map(({ minimumDistinctSources }) => minimumDistinctSources), 'descending')) {
    throw new Error('Los umbrales de corroboración deben estar en orden descendente')
  }
  validateBands(policy.bands)
}

function validateThresholdPoints(thresholds, maximum, label) {
  if (!Array.isArray(thresholds) || !thresholds.length || thresholds.some(({ points }) => !Number.isFinite(points) || points < 0 || points > maximum)) {
    throw new Error(`Los umbrales de ${label} deben usar puntos entre 0 y ${maximum}`)
  }
}

function strictlyOrdered(values, direction) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) return false
  return values.every((value, index) => index === 0 || (direction === 'ascending' ? value > values[index - 1] : value < values[index - 1]))
}

function validateBands(bands) {
  if (!Array.isArray(bands) || !bands.length || bands.at(-1)?.minimum !== 0 || !strictlyOrdered(bands.map(({ minimum }) => minimum), 'descending') || bands.some(({ minimum, key, label }) => !Number.isFinite(minimum) || minimum < 0 || minimum > 100 || !key || !label)) {
    throw new Error('Las bandas deben cubrir 0-100 en orden descendente')
  }
}

function hasKnownValue(value) {
  if (value === null || value === undefined) return false
  const normalized = String(value).trim().toLocaleLowerCase('es')
  return normalized !== '' && !['unknown', 'desconocido', 'sin definir', 'n/a'].includes(normalized)
}

function validDateValue(value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return value
}

function isFutureDate(value, evaluation) {
  const valid = validDateValue(value)
  return valid ? Date.parse(valid) > evaluation.getTime() : false
}

function requireDate(value, label) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} no es válida`)
  return date
}

function ageInDays(value, evaluation) {
  return Math.max(0, Math.floor((evaluation.getTime() - Date.parse(value)) / 86_400_000))
}

function fingerprintText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es') : ''
}

function normalizedValue(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
}

function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') deepFreeze(nested)
  }
  return Object.freeze(value)
}
