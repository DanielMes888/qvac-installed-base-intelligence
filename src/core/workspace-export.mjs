export const WORKSPACE_EXPORT_SCHEMA_VERSION = 'workspace-export-v1'
export const WORKSPACE_ID = 'local-prototype-workspace'
export const DELETE_CONFIRMATION = 'ELIMINAR'

export function createWorkspaceExport(state, aggregate, exportedAt) {
  const payload = {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    exportTimestamp: exportedAt,
    workspace: {
      id: WORKSPACE_ID,
      synthetic: state.synthetic === true,
      label: state.label ?? 'Datos completamente sintéticos para demostración.'
    },
    customers: sortedClones(state.customers),
    observations: sortedClones(state.observations).map(sanitizeObservation),
    evidenceEntries: sortedClones(state.evidenceEntries),
    equipmentRecords: sortedClones(state.equipmentRecords),
    reconciliationLinks: sortedClones(state.observations
      .filter(({ reconciliation }) => reconciliation)
      .map(({ id, customerId, reconciliation }) => ({ observationId: id, customerId, ...reconciliation })), 'observationId'),
    verificationItems: sortedClones(state.verificationItems),
    aggregate: structuredClone(aggregate)
  }
  validateWorkspaceExport(payload)
  return payload
}

export function validateWorkspaceExport(payload) {
  if (!payload || payload.schemaVersion !== WORKSPACE_EXPORT_SCHEMA_VERSION) throw new Error('Versión de exportación no válida')
  if (!isIsoTimestamp(payload.exportTimestamp)) throw new Error('La exportación requiere una fecha válida')
  if (payload.workspace?.id !== WORKSPACE_ID || payload.workspace.synthetic !== true) throw new Error('El Workspace de exportación no es válido')
  for (const key of ['customers', 'observations', 'evidenceEntries', 'equipmentRecords', 'reconciliationLinks', 'verificationItems']) {
    if (!Array.isArray(payload[key])) throw new Error(`La colección ${key} no es válida`)
  }
  const customerIds = uniqueIds(payload.customers, 'customers')
  const observationIds = uniqueIds(payload.observations, 'observations')
  const evidenceIds = uniqueIds(payload.evidenceEntries, 'evidenceEntries')
  const equipmentIds = uniqueIds(payload.equipmentRecords, 'equipmentRecords')
  uniqueIds(payload.verificationItems, 'verificationItems')

  for (const observation of payload.observations) {
    requireReference(customerIds, observation.customerId, `cliente de observación ${observation.id}`)
    for (const id of observation.evidenceEntryIds ?? []) requireReference(evidenceIds, id, `evidencia de observación ${observation.id}`)
    for (const claim of observation.draftClaims ?? []) {
      if (!claim.claimId || !claim.subjectId || !claim.evidence) throw new Error(`Draft Claim inválido en ${observation.id}`)
      if (claim.acceptedEvidenceEntryId) requireReference(evidenceIds, claim.acceptedEvidenceEntryId, `evidencia aceptada de ${claim.claimId}`)
      for (const correction of claim.corrections ?? []) {
        if (!correction.id || !correction.correctedAt) throw new Error(`Corrección inválida en ${claim.claimId}`)
        if (correction.evidenceEntryId) requireReference(evidenceIds, correction.evidenceEntryId, `evidencia de corrección ${correction.id}`)
      }
    }
    for (const attempt of observation.inferenceAttempts ?? []) {
      if (!attempt.attemptId || !attempt.status || !attempt.phase) throw new Error(`Metadatos de inferencia inválidos en ${observation.id}`)
      if ('rawOutput' in attempt || 'validatedDraft' in attempt) throw new Error('La exportación contiene salida interna del modelo')
    }
  }
  for (const evidence of payload.evidenceEntries) {
    if (evidence.customerId) requireReference(customerIds, evidence.customerId, `cliente de evidencia ${evidence.id}`)
    if (evidence.observationId) requireReference(observationIds, evidence.observationId, `observación de evidencia ${evidence.id}`)
    if (evidence.equipmentRecordId) requireReference(equipmentIds, evidence.equipmentRecordId, `equipo de evidencia ${evidence.id}`)
  }
  for (const record of payload.equipmentRecords) {
    requireReference(customerIds, record.customerId, `cliente de equipo ${record.id}`)
    for (const id of record.evidenceObservationIds ?? []) requireReference(observationIds, id, `observación de equipo ${record.id}`)
    for (const id of record.evidenceEntryIds ?? []) requireReference(evidenceIds, id, `evidencia de equipo ${record.id}`)
  }
  for (const link of payload.reconciliationLinks) {
    requireReference(observationIds, link.observationId, 'observación reconciliada')
    requireReference(customerIds, link.customerId, 'cliente reconciliado')
    requireReference(equipmentIds, link.recordId, 'equipo reconciliado')
  }
  for (const item of payload.verificationItems) {
    requireReference(customerIds, item.customerId, `cliente de verificación ${item.id}`)
    if (item.observationId) requireReference(observationIds, item.observationId, `observación de verificación ${item.id}`)
    if (item.equipmentRecordId) requireReference(equipmentIds, item.equipmentRecordId, `equipo de verificación ${item.id}`)
    for (const id of item.supportingEvidenceEntryIds ?? []) requireReference(evidenceIds, id, `evidencia de verificación ${item.id}`)
  }
  if (!payload.aggregate || typeof payload.aggregate !== 'object') throw new Error('La exportación requiere resultados agregados')
  return true
}

export function exportFilename(exportTimestamp) {
  if (!isIsoTimestamp(exportTimestamp)) throw new Error('La fecha del archivo de exportación no es válida')
  return `workspace-local-${exportTimestamp.slice(0, 10)}.json`
}

export function emptyWorkspaceState(previous = {}) {
  return {
    synthetic: true,
    label: previous.label ?? 'Datos completamente sintéticos para demostración.',
    customers: [],
    equipmentRecords: [],
    observations: [],
    evidenceEntries: [],
    verificationItems: []
  }
}

function sanitizeObservation(observation) {
  const clone = structuredClone(observation)
  clone.inferenceAttempts = (clone.attempts ?? []).map((attempt, index) => ({
    attemptId: attempt.attemptId ?? `${clone.id}:attempt:${index + 1}`,
    attemptNumber: attempt.attemptNumber ?? index + 1,
    phase: attempt.phase ?? (index === 0 ? 'initial' : 'clarification'),
    observationRevision: attempt.observationRevision ?? clone.revision ?? 0,
    startedAt: attempt.startedAt ?? clone.recordedAt,
    completedAt: attempt.completedAt ?? null,
    status: attempt.status,
    stopReason: attempt.stopReason ?? null,
    failureCategory: attempt.failureCategory ?? null,
    errorCount: Array.isArray(attempt.errors) ? attempt.errors.length : 0,
    metrics: attempt.metrics ? structuredClone(attempt.metrics) : null,
    draftStatus: attempt.draftStatus ?? (attempt.status === 'succeeded' ? 'active' : 'invalid')
  }))
  delete clone.attempts
  return clone
}

function sortedClones(values = [], key = 'id') {
  return structuredClone(values).sort((left, right) => String(left[key] ?? '').localeCompare(String(right[key] ?? '')))
}

function uniqueIds(values, name) {
  const ids = new Set()
  for (const value of values) {
    if (!value?.id || ids.has(value.id)) throw new Error(`Identificador inválido o duplicado en ${name}`)
    ids.add(value.id)
  }
  return ids
}

function requireReference(ids, id, label) {
  if (!ids.has(id)) throw new Error(`Referencia inexistente: ${label}`)
}

function isIsoTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value
}
