import { createHash } from 'node:crypto'

export const OPPORTUNITY_SIGNAL_POLICY = deepFreeze({
  version: 'opportunity-signals-v1',
  rules: {
    reportedAge: {
      id: 'reported-age-review',
      minimumYears: 7
    },
    incompleteInformation: {
      id: 'incomplete-information-review',
      minimumMissingFields: 2,
      fields: ['manufacturer', 'model', 'location']
    },
    staleEvidence: {
      id: 'stale-evidence-review',
      minimumAgeDays: 90
    },
    unknownObservationDate: {
      id: 'unknown-observation-date-review'
    },
    invalidObservationDate: {
      id: 'invalid-observation-date-review'
    },
    materialVerification: {
      id: 'material-verification-review',
      reasonCodes: ['conflictingEvidence', 'conflictingReportedAge', 'conflictingQuantity', 'ambiguousQuantity', 'unknownQuantity', 'unknownIdentity', 'unresolvedReconciliationConflict']
    }
  },
  disclaimer: 'Regla configurable del prototipo sobre datos sintéticos. Es una señal para revisión, no una conclusión comercial ni una regla oficial de Philips.'
})

export function identifyOpportunitySignals({
  record,
  observations = [],
  evidenceEntries = [],
  verificationItems = [],
  evaluatedAt,
  policy = OPPORTUNITY_SIGNAL_POLICY
}) {
  validatePolicy(policy)
  const evaluation = requireDate(evaluatedAt)
  const evidenceById = new Map(evidenceEntries.map((entry) => [entry.id, entry]))
  const relatedEvidence = evidenceEntries
    .filter((entry) => record.evidenceEntryIds?.includes(entry.id) || entry.equipmentRecordId === record.id || record.evidenceObservationIds?.includes(entry.observationId))
    .filter((entry) => entry.type === 'seedReference' || entry.type === 'acceptedClaim' || entry.type === 'reviewerCorrection')
    .filter(visibleEvidence)
    .sort((left, right) => left.id.localeCompare(right.id))
  const hasComparableConflict = verificationItems.some((item) => item.status === 'open' && item.equipmentRecordId === record.id && (item.reasonCodes ?? []).some((code) => ['conflictingEvidence', 'conflictingQuantity', 'unresolvedReconciliationConflict'].includes(code)))
  const signals = []
  const ageRule = policy.rules.reportedAge
  const reviewedAgeClaims = observations
    .filter(({ id }) => record.evidenceObservationIds?.includes(id))
    .flatMap((observation) => (observation.draftClaims ?? []).map((claim) => ({ observation, claim })))
    .filter(({ claim }) => claim.type === 'age' && claim.decision === 'accepted' && !claim.negated && knownLocationScope(claim.locationScope))
    .filter(({ observation, claim }) => claim.subjectId && new Set(observation.draftClaims.filter((candidate) => candidate.decision === 'accepted' && !candidate.negated).map(({ subjectId }) => subjectId).filter(Boolean)).size === 1)
    .filter(({ claim }) => Number.isFinite(Number(claim.reviewedValue ?? claim.value)))
    .filter(({ claim }) => claim.acceptedEvidenceEntryId && visibleEvidence(evidenceById.get(claim.acceptedEvidenceEntryId)))
    .filter(({ observation }) => validObservationDate(observation.observationDate) && new Date(`${observation.observationDate}T00:00:00.000Z`) <= evaluation)
    .filter(({ claim }) => validObservationDate(evidenceById.get(claim.acceptedEvidenceEntryId).observationDate) && new Date(`${evidenceById.get(claim.acceptedEvidenceEntryId).observationDate}T00:00:00.000Z`) <= evaluation)
  const comparableAgeGroups = Map.groupBy(reviewedAgeClaims, ({ observation, claim }) => `${observation.observationDate}:${claim.locationScope}`)
  const conflictingAgeClaims = [...comparableAgeGroups.values()].filter((claims) => new Set(claims.map(({ claim }) => Number(claim.reviewedValue ?? claim.value))).size > 1).flat()
  const hasReportedAgeConflict = conflictingAgeClaims.length > 0
  const ageClaims = reviewedAgeClaims.filter(({ claim }) => Number(claim.reviewedValue ?? claim.value) >= ageRule.minimumYears)

  if (!hasComparableConflict && !hasReportedAgeConflict && ageClaims.length) {
    const selected = ageClaims.sort((left, right) => left.claim.acceptedEvidenceEntryId.localeCompare(right.claim.acceptedEvidenceEntryId))[0]
    const age = Number(selected.claim.reviewedValue ?? selected.claim.value)
    const evidence = [{ ...evidenceById.get(selected.claim.acceptedEvidenceEntryId), locationScope: selected.claim.locationScope }]
    signals.push(createSignal({
      record, evaluation, verificationItems, policy, rule: ageRule, type: 'reportedAgeReview',
      label: 'Posible oportunidad para revisar antigüedad reportada',
      reason: `La evidencia revisada conserva una antigüedad reportada de ${age} años, igual o superior al umbral configurable de ${ageRule.minimumYears} años.`,
      suggestedVerification: 'Confirmar la antigüedad reportada, su fecha y que continúa aplicando al mismo equipo.',
      facts: [
        { key: 'reportedAgeYears', label: 'Antigüedad reportada', value: age },
        { key: 'observationDate', label: 'Fecha de observación', value: selected.observation.observationDate },
        { key: 'locationScope', label: 'Alcance', value: selected.claim.locationScope }
      ],
      evidence,
      thresholds: { minimumYears: ageRule.minimumYears }
    }))
  }

  const incompleteRule = policy.rules.incompleteInformation
  const missingFields = incompleteRule.fields.filter((field) => !knownValue(record[field]))
  if (missingFields.length >= incompleteRule.minimumMissingFields && relatedEvidence.length) {
    signals.push(createSignal({
      record, evaluation, verificationItems, policy, rule: incompleteRule, type: 'incompleteInformationReview',
      label: 'Posible oportunidad para completar información',
      reason: `El registro conserva ${missingFields.length} campos básicos sin información: ${missingFields.map((field) => FIELD_LABELS[field]).join(', ')}.`,
      suggestedVerification: 'Revisar estos campos con la evidencia disponible o confirmarlos en una futura conversación.',
      facts: [{ key: 'missingFields', label: 'Campos sin información', value: missingFields }],
      evidence: relatedEvidence,
      thresholds: { minimumMissingFields: incompleteRule.minimumMissingFields, fields: incompleteRule.fields }
    }))
  }

  const knownDatedEvidence = relatedEvidence.filter(({ observationDate }) => validObservationDate(observationDate))
  const datedEvidence = knownDatedEvidence.filter(({ observationDate }) => new Date(`${observationDate}T00:00:00.000Z`) <= evaluation)
  const staleRule = policy.rules.staleEvidence
  if (datedEvidence.length) {
    const latest = datedEvidence.reduce((selected, entry) => new Date(entry.observationDate) > new Date(selected.observationDate) ? entry : selected)
    const ageDays = daysBetween(latest.observationDate, evaluation)
    if (ageDays >= staleRule.minimumAgeDays) {
      signals.push(createSignal({
        record, evaluation, verificationItems, policy, rule: staleRule, type: 'staleEvidenceReview',
        label: 'Posible oportunidad para revisar vigencia',
        reason: `La evidencia revisada más reciente tiene ${ageDays} días, igual o superior al umbral configurable de ${staleRule.minimumAgeDays} días.`,
        suggestedVerification: 'Confirmar si la información sigue vigente antes de usarla en una conversación.',
        facts: [{ key: 'latestObservationDate', label: 'Fecha de observación más reciente', value: latest.observationDate }, { key: 'evidenceAgeDays', label: 'Antigüedad de la evidencia', value: ageDays }],
        evidence: relatedEvidence,
        thresholds: { minimumAgeDays: staleRule.minimumAgeDays }
      }))
    }
  }
  const unknownDateEvidence = relatedEvidence.filter(({ observationDate }) => observationDate === null || observationDate === undefined || observationDate === '')
  if (unknownDateEvidence.length) {
    const unknownRule = policy.rules.unknownObservationDate
    signals.push(createSignal({
      record, evaluation, verificationItems, policy, rule: unknownRule, type: 'unknownObservationDateReview',
      label: 'Posible oportunidad para confirmar la fecha',
      reason: 'La evidencia revisada relacionada no conserva una fecha de observación conocida.',
      suggestedVerification: 'Confirmar cuándo se observó la información; la fecha permanece desconocida hasta entonces.',
      facts: [{ key: 'observationDate', label: 'Fecha de observación', value: null }],
      evidence: unknownDateEvidence,
      thresholds: {}
    }))
  }
  const invalidDateEvidence = relatedEvidence.filter(({ observationDate }) => observationDate && (!validObservationDate(observationDate) || new Date(`${observationDate}T00:00:00.000Z`) > evaluation))
  if (invalidDateEvidence.length) {
    const invalidRule = policy.rules.invalidObservationDate
    signals.push(createSignal({
      record, evaluation, verificationItems, policy, rule: invalidRule, type: 'invalidObservationDateReview',
      label: 'Posible oportunidad para revisar una fecha no aplicable',
      reason: 'Hay evidencia relacionada con una fecha inválida o posterior a la fecha de evaluación; no se trató como evidencia vigente.',
      suggestedVerification: 'Confirmar la fecha de observación sin sustituirla ni estimarla automáticamente.',
      facts: [{ key: 'excludedObservationDates', label: 'Fechas que requieren revisión', value: invalidDateEvidence.map(({ observationDate }) => observationDate) }],
      evidence: invalidDateEvidence,
      thresholds: { latestAllowedDate: evaluation.toISOString().slice(0, 10) }
    }))
  }

  const verificationRule = policy.rules.materialVerification
  const materialItems = verificationItems
    .filter((item) => item.status === 'open' && item.equipmentRecordId === record.id)
    .filter((item) => (item.reasonCodes ?? []).some((code) => verificationRule.reasonCodes.includes(code)))
    .sort((left, right) => left.id.localeCompare(right.id))
  const verificationEvidence = materialItems
    .flatMap((item) => item.supportingEvidenceEntryIds ?? [])
    .map((id) => evidenceById.get(id))
    .filter(visibleEvidence)
  const conflictingAgeEvidence = conflictingAgeClaims.map(({ claim }) => ({ ...evidenceById.get(claim.acceptedEvidenceEntryId), locationScope: claim.locationScope })).filter(visibleEvidence)
  const materialEvidence = [...new Map([...verificationEvidence, ...conflictingAgeEvidence].map((entry) => [entry.id, entry])).values()].sort((left, right) => left.id.localeCompare(right.id))
  if ((materialItems.length || hasReportedAgeConflict) && materialEvidence.length) {
    const reasons = [...new Set([...materialItems.flatMap(({ reasonCodes = [] }) => reasonCodes), ...(hasReportedAgeConflict ? ['conflictingReportedAge'] : [])].filter((code) => verificationRule.reasonCodes.includes(code)))].sort()
    signals.push(createSignal({
      record, evaluation, verificationItems, policy, rule: verificationRule, type: 'materialVerificationReview',
      label: 'Posible oportunidad para resolver información material',
      reason: 'Existe una necesidad de verificación material abierta y respaldada por evidencia visible; no se elige una versión como verdadera.',
      suggestedVerification: 'Revisar la evidencia relacionada y confirmar o conservar explícitamente la incertidumbre.',
      facts: [{ key: 'reasonCodes', label: 'Motivos de verificación', value: reasons }],
      evidence: materialEvidence,
      thresholds: { allowedReasonCodes: verificationRule.reasonCodes }
    }))
  }

  return deduplicateSignals(signals)
}

function createSignal({ record, evaluation, verificationItems, policy, rule, type, label, reason, suggestedVerification, facts, evidence: rawEvidence, thresholds }) {
  const evidence = evidencePresentation(rawEvidence)
  const evidenceIds = evidence.map(({ id }) => id)
  const triggerFingerprint = createHash('sha256').update(JSON.stringify({ type, facts, evidence, thresholds })).digest('hex').slice(0, 12)
  return {
    id: `${record.id}:${rule.id}:${triggerFingerprint}`,
    type,
    label,
    reason,
    suggestedVerification,
    facts: facts.map((fact) => ({ ...structuredClone(fact), evidenceIds })),
    evidenceIds,
    evidence,
    rule: { id: rule.id, version: policy.version, thresholds: structuredClone(thresholds) },
    context: {
      customerId: record.customerId,
      equipmentRecordId: record.id,
      confidence: confidenceContext(record.confidenceScore),
      freshness: { latestObservationDate: record.latestObservationDate ?? null, evaluatedOn: evaluation.toISOString().slice(0, 10) },
      verificationItemIds: verificationItems.filter(({ equipmentRecordId }) => equipmentRecordId === record.id).map(({ id }) => id).sort()
    },
    review: { status: 'unreviewed' },
    synthetic: true,
    disclaimer: policy.disclaimer
  }
}

function deduplicateSignals(signals) {
  return [...new Map(signals.map((signal) => [signal.id, signal])).values()].sort((left, right) => left.id.localeCompare(right.id))
}

function evidencePresentation(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    text: entry.text,
    author: entry.author ?? 'Fuente no identificada',
    observationDate: entry.observationDate ?? null,
    locationScope: entry.locationScope ?? 'unknown'
  }))
}

function confidenceContext(score) {
  if (!score) return { available: false, total: null, band: null, version: null, components: null }
  return { available: score.available, total: score.total, band: structuredClone(score.band), version: score.version, components: structuredClone(score.components) }
}

function visibleEvidence(entry) {
  return Boolean(entry && typeof entry.text === 'string' && entry.text.trim())
}

function validatePolicy(policy) {
  const { reportedAge, incompleteInformation, staleEvidence, unknownObservationDate, invalidObservationDate, materialVerification } = policy?.rules ?? {}
  if (!policy?.version || !policy?.disclaimer || !reportedAge?.id || !Number.isFinite(reportedAge.minimumYears) || reportedAge.minimumYears < 0) throw new Error('La política de antigüedad no es válida')
  if (!incompleteInformation?.id || !Array.isArray(incompleteInformation.fields) || !incompleteInformation.fields.length || !Number.isInteger(incompleteInformation.minimumMissingFields) || incompleteInformation.minimumMissingFields < 1 || incompleteInformation.minimumMissingFields > incompleteInformation.fields.length) throw new Error('La política de completitud no es válida')
  if (!staleEvidence?.id || !Number.isInteger(staleEvidence.minimumAgeDays) || staleEvidence.minimumAgeDays < 1) throw new Error('La política de vigencia no es válida')
  if (!unknownObservationDate?.id || !invalidObservationDate?.id || !materialVerification?.id || !Array.isArray(materialVerification.reasonCodes) || !materialVerification.reasonCodes.length) throw new Error('La política de verificación no es válida')
}

function validObservationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function daysBetween(value, evaluation) {
  return Math.max(0, Math.floor((evaluation.getTime() - new Date(`${value}T00:00:00.000Z`).getTime()) / 86_400_000))
}

function knownLocationScope(value) {
  return ['room', 'dept', 'site', 'customer'].includes(value)
}

function knownValue(value) {
  if (value === null || value === undefined) return false
  return !['', 'unknown', 'desconocido', 'sin definir', 'n/a'].includes(String(value).trim().toLocaleLowerCase('es'))
}

function requireDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('La fecha de evaluación no es válida')
  return date
}

function deepFreeze(value) {
  for (const nested of Object.values(value)) if (nested && typeof nested === 'object') deepFreeze(nested)
  return Object.freeze(value)
}

const FIELD_LABELS = { manufacturer: 'fabricante', model: 'modelo', location: 'ubicación' }
