import { randomUUID } from 'node:crypto'

import { calculateEquipmentConfidence, CONFIDENCE_SCORE_POLICY } from './confidence-score.mjs'
import { identifyOpportunitySignals, OPPORTUNITY_SIGNAL_POLICY } from './opportunity-signals.mjs'
import { anchorAnalyticsPlan, analyticsAnswer, executeAnalyticsPlan, rejectUnsafeQuestion, validateAnalyticsPlan } from './analytics.mjs'
import { createWorkspaceExport, DELETE_CONFIRMATION, emptyWorkspaceState } from './workspace-export.mjs'

export class WorkspaceService {
  constructor(state, persist, { now = () => new Date(), confidencePolicy = CONFIDENCE_SCORE_POLICY, opportunityPolicy = OPPORTUNITY_SIGNAL_POLICY } = {}) {
    this.state = structuredClone(state)
    this.state.evidenceEntries ??= []
    this.state.verificationItems ??= []
    this.state.opportunitySignalReviews ??= []
    this.now = now
    this.confidencePolicy = confidencePolicy
    this.opportunityPolicy = opportunityPolicy
    for (const record of this.state.equipmentRecords) {
      record.evidenceObservationIds ??= []
      record.evidenceEntryIds ??= []
    }
    for (const entry of this.state.evidenceEntries) entry.observationDate ??= null
    for (const observation of this.state.observations) {
      observation.revision ??= 0
      observation.evidenceEntryIds ??= []
      observation.observationDate ??= null
      observation.draftClaims = (observation.draftClaims ?? []).map(prepareDraftClaim)
      if (observation.clarification && !observation.clarification.status) {
        observation.clarification = { ...observation.clarification, status: 'pending', questionCount: 1, nextQuestion: observation.clarification.question, selectedAt: observation.recordedAt, resolvedAt: null, answerEvidenceEntryId: null }
      }
    }
    for (const item of this.state.verificationItems) normalizeVerificationItem(item)
    this.recalculateVerificationItems()
    this.persist = persist
  }

  snapshot() {
    return structuredClone(this.state)
  }

  async capture(customerId, originalText, extractor, { observationDate } = {}) {
    if (!this.state.customers.some((customer) => customer.id === customerId)) throw new Error('Cliente desconocido')
    if (!originalText?.trim()) throw new Error('El texto de la observación es obligatorio')
    const observation = {
      id: randomUUID(),
      customerId,
      originalText: originalText.trim(),
      observationDate: normalizeObservationDate(observationDate),
      recordedAt: this.timestamp(),
      revision: 0,
      status: 'processing',
      attempts: [],
      evidenceEntryIds: [],
      subjects: [],
      draftClaims: [],
      clarification: null,
      reviewedAt: null,
      reconciliation: null,
      model: null,
      load: null
    }
    this.state.observations.push(observation)
    await this.persist(this.state)

    try {
      const startedAt = this.timestamp()
      const extraction = await extractor(observation.originalText, { allowClarification: true, phase: 'initial' })
      observation.status = extraction.status
      this.appendExtractionAttempts(observation, extraction, 'initial', startedAt)
      observation.model = extraction.model
      observation.load = extraction.load ?? null
      if (extraction.status === 'succeeded' && extraction.draft) {
        observation.subjects = extraction.draft.subjects
        observation.draftClaims = extraction.draft.claims.map(prepareDraftClaim)
        const clarification = selectMaterialClarification(extraction.draft)
        observation.clarification = clarification ? {
          ...clarification,
          status: 'pending',
          questionCount: 1,
          nextQuestion: clarification.question,
          selectedAt: this.timestamp(),
          resolvedAt: null,
          answerEvidenceEntryId: null
        } : null
      }
    } catch (error) {
      observation.status = 'failed'
      observation.attempts.push({ status: 'failed', failureCategory: 'host', errors: [error instanceof Error ? error.message : String(error)] })
    }
    this.recalculateVerificationItems()
    await this.persist(this.state)
    return this.observation(observation.id)
  }

  async clarify(observationId, { outcome, answer } = {}, extractor) {
    const observation = this.requireObservation(observationId)
    if (!observation.clarification || observation.clarification.status !== 'pending') throw new Error('La aclaración ya fue resuelta o no está disponible')
    if (!['answered', 'unknown', 'skipped'].includes(outcome)) throw new Error('Seleccione responder, No lo sé u omitir')

    if (outcome !== 'answered') {
      observation.clarification.status = outcome
      observation.clarification.nextQuestion = null
      observation.clarification.resolvedAt = this.timestamp()
      this.recalculateVerificationItems()
      await this.persist(this.state)
      return this.observation(observationId)
    }

    const text = answer?.trim()
    if (!text) throw new Error('Escriba una respuesta antes de continuar')
    if (observation.attempts.length >= 2) throw new Error('Esta observación ya alcanzó el máximo de dos inferencias')

    const evidenceEntry = {
      id: randomUUID(),
      observationId,
      customerId: observation.customerId,
      type: 'clarificationAnswer',
      text,
      author: 'Usuario local de demostración',
      observationDate: observation.observationDate,
      recordedAt: this.timestamp(),
      question: observation.clarification.question
    }
    this.state.evidenceEntries.push(evidenceEntry)
    observation.evidenceEntryIds.push(evidenceEntry.id)
    observation.revision += 1
    observation.clarification.status = 'processing'
    observation.clarification.nextQuestion = null
    observation.clarification.answerEvidenceEntryId = evidenceEntry.id
    observation.subjects = []
    observation.draftClaims = []
    observation.reviewedAt = null
    observation.status = 'processing'
    for (const attempt of observation.attempts) {
      if (attempt.draftStatus === 'active') attempt.draftStatus = 'superseded'
    }
    await this.persist(this.state)

    const combinedEvidence = `${observation.originalText}\nAclaración del usuario: ${text}`
    const startedAt = this.timestamp()
    try {
      const extraction = await extractor(combinedEvidence, { allowClarification: false, phase: 'clarification' })
      this.appendExtractionAttempts(observation, extraction, 'clarification', startedAt)
      observation.status = extraction.status
      observation.model = extraction.model ?? observation.model
      observation.load = extraction.load ?? observation.load
      if (extraction.status === 'succeeded' && extraction.draft) {
        observation.subjects = extraction.draft.subjects
        observation.draftClaims = extraction.draft.claims.map(prepareDraftClaim)
        observation.clarification.status = 'answered'
      } else {
        observation.clarification.status = 'failed'
      }
    } catch (error) {
      observation.status = 'failed'
      observation.clarification.status = 'failed'
      observation.attempts.push({
        attemptId: randomUUID(),
        attemptNumber: observation.attempts.length + 1,
        phase: 'clarification',
        observationRevision: observation.revision,
        startedAt,
        completedAt: this.timestamp(),
        status: 'failed',
        failureCategory: 'host',
        errors: [error instanceof Error ? error.message : String(error)],
        draftStatus: 'invalid'
      })
    }
    observation.clarification.resolvedAt = this.timestamp()
    this.recalculateVerificationItems()
    await this.persist(this.state)
    return this.observation(observationId)
  }

  async review(observationId, decisions) {
    const observation = this.requireObservation(observationId)
    if (observation.clarification?.status === 'pending' || observation.clarification?.status === 'processing') throw new Error('Resuelva la aclaración antes de revisar los datos finales')
    if (observation.status !== 'succeeded' || !observation.draftClaims.length) throw new Error('No existe una extracción final válida para revisar')
    if (!Array.isArray(decisions)) throw new Error('Se requieren las decisiones de revisión')
    const claimIds = new Set(observation.draftClaims.map(({ claimId }) => claimId))
    const decisionIds = new Set(decisions.map(({ claimId }) => claimId))
    if (decisions.length !== claimIds.size || decisionIds.size !== claimIds.size || [...decisionIds].some((id) => !claimIds.has(id))) {
      throw new Error('La revisión requiere una decisión explícita para cada dato extraído')
    }
    const byId = new Map(decisions.map((decision) => [decision.claimId, decision.decision]))
    for (const claim of observation.draftClaims) {
      const decision = byId.get(claim.claimId)
      if (!['accepted', 'rejected'].includes(decision)) throw new Error('Decisión de revisión inválida')
      claim.decision = decision
      claim.reviewStatus = decision
    }
    observation.reviewedAt = this.timestamp()
    this.ensureAcceptedEvidence(observation)
    this.ensureVerificationItemForAcceptedEvidence(observation)
    this.recalculateVerificationItems()
    await this.persist(this.state)
    return this.observation(observationId)
  }

  async correctClaim(observationId, claimId, { field, correctedValue, reason } = {}) {
    const observation = this.requireObservation(observationId)
    if (observation.reviewedAt) throw new Error('La revisión ya fue completada; no se permiten más correcciones')
    if (observation.clarification?.status === 'pending' || observation.clarification?.status === 'processing') {
      throw new Error('Resuelva la aclaración antes de corregir los datos finales')
    }
    if (observation.status !== 'succeeded' || !observation.draftClaims.length) {
      throw new Error('No existe una extracción final válida para corregir')
    }

    const claim = observation.draftClaims.find((item) => item.claimId === claimId)
    if (!claim) throw new Error('Dato extraído desconocido')
    validateCorrectionField(claim, field)
    const value = validateCorrectionValue(field, correctedValue)
    const shortReason = validateReason(reason)
    const previousValue = currentFieldValue(claim, field)
    if (sameValue(previousValue, value)) throw new Error('El valor corregido debe ser diferente del valor actual')

    const correctedAt = this.timestamp()
    const supported = isDirectlySupported(observation.originalText, field, value)
    let evidenceEntryId = null
    if (!supported) {
      const evidenceEntry = {
        id: randomUUID(),
        observationId,
        customerId: observation.customerId,
        claimId,
        type: 'reviewerCorrection',
        field,
        text: String(value),
        author: 'Usuario local de demostración',
        observationDate: observation.observationDate,
        recordedAt: correctedAt,
        reason: shortReason
      }
      this.state.evidenceEntries.push(evidenceEntry)
      observation.evidenceEntryIds.push(evidenceEntry.id)
      evidenceEntryId = evidenceEntry.id
    }

    setCurrentFieldValue(claim, field, value)
    claim.decision = 'pending'
    claim.reviewStatus = 'pending'
    claim.corrections.push({
      id: randomUUID(),
      correctedAt,
      reviewer: 'Usuario local de demostración',
      field,
      previousValue: structuredClone(previousValue),
      correctedValue: structuredClone(value),
      reason: shortReason,
      origin: supported ? 'originalObservation' : 'reviewerProvided',
      evidenceEntryId
    })
    this.recalculateVerificationItems()
    await this.persist(this.state)
    return this.observation(observationId)
  }

  candidates(observationId) {
    const observation = this.requireObservation(observationId)
    const accepted = observation.draftClaims.filter((claim) => claim.decision === 'accepted' && !claim.negated)
    const value = (type) => accepted.find((claim) => claim.type === type)?.value?.toString().toLowerCase()
    const modality = value('equipmentType')
    const manufacturer = value('manufacturer')
    const model = value('model')
    return this.state.equipmentRecords
      .filter((record) => record.customerId === observation.customerId)
      .map((record) => ({
        ...record,
        score: [modality && record.modality.toLowerCase() === modality, manufacturer && record.manufacturer.toLowerCase() === manufacturer, model && record.model.toLowerCase() === model].filter(Boolean).length
      }))
      .filter((record) => record.score > 0)
      .sort((left, right) => right.score - left.score)
  }

  async reconcile(observationId, recordId, reason) {
    const observation = this.requireObservation(observationId)
    if (!observation.reviewedAt) throw new Error('Revise los datos extraídos antes de reconciliar')
    const candidateIds = new Set(this.candidates(observationId).map(({ id }) => id))
    if (!candidateIds.has(recordId)) throw new Error('El registro no es un candidato respaldado por la evidencia')
    const record = this.state.equipmentRecords.find((item) => item.id === recordId)
    observation.reconciliation = { recordId, reason: reason || 'El usuario vinculó la evidencia repetida', actor: 'Usuario local de demostración', decidedAt: this.timestamp() }
    if (!record.evidenceObservationIds.includes(observation.id)) record.evidenceObservationIds.push(observation.id)
    for (const entry of this.state.evidenceEntries.filter((item) => item.observationId === observation.id)) {
      entry.equipmentRecordId = recordId
      if (!record.evidenceEntryIds.includes(entry.id)) record.evidenceEntryIds.push(entry.id)
    }
    for (const item of this.state.verificationItems.filter((candidate) => candidate.observationId === observation.id && candidate.status === 'open')) {
      item.equipmentRecordId = recordId
    }
    this.ensureVerificationItemForAcceptedEvidence(observation)
    this.recalculateVerificationItems()
    await this.persist(this.state)
    return this.customerView(observation.customerId)
  }

  observation(id) {
    const observation = this.requireObservation(id)
    return {
      ...structuredClone(observation),
      evidenceEntries: structuredClone(this.state.evidenceEntries.filter((entry) => observation.evidenceEntryIds.includes(entry.id))),
      candidates: observation.reviewedAt ? this.candidates(id) : []
    }
  }

  customerView(customerId) {
    const observations = this.state.observations.filter((item) => item.customerId === customerId)
    const acceptedClaims = observations.flatMap((item) => item.draftClaims.filter((claim) => claim.decision === 'accepted'))
    const unlinkedSubjects = new Set()
    for (const observation of observations.filter((item) => item.reviewedAt && !item.reconciliation)) {
      for (const claim of observation.draftClaims.filter((item) => item.decision === 'accepted' && item.type === 'equipmentType' && !item.negated)) {
        unlinkedSubjects.add(`${observation.id}:${claim.subjectId}`)
      }
    }
    return {
      customer: structuredClone(this.state.customers.find((customer) => customer.id === customerId)),
      equipmentRecords: this.state.equipmentRecords.filter((record) => record.customerId === customerId).map((record) => this.equipmentRecordWithFreshness(record)),
      observations: structuredClone(observations),
      acceptedClaimCount: acceptedClaims.length,
      unlinkedClaims: unlinkedSubjects.size,
      reportedTotals: acceptedClaims.filter((claim) => claim.type === 'quantity' && claim.quantityScope === 'reportedTotal'),
      verificationItems: this.verificationItems({ customerId }).slice(0, 3),
      opportunitySignals: this.opportunitySignals({ customerId }),
      freshnessPolicy: structuredClone(FRESHNESS_POLICY)
    }
  }

  opportunitySignals({ customerId, equipmentRecordId, type, status } = {}) {
    this.recalculateVerificationItems()
    return this.state.equipmentRecords
      .filter((record) => !customerId || record.customerId === customerId)
      .filter((record) => !equipmentRecordId || record.id === equipmentRecordId)
      .flatMap((record) => identifyOpportunitySignals({
        record: this.equipmentRecordWithFreshness(record),
        observations: this.state.observations,
        evidenceEntries: this.state.evidenceEntries,
        verificationItems: this.state.verificationItems,
        evaluatedAt: this.now(),
        policy: this.opportunityPolicy
      }))
      .map((signal) => ({ ...signal, review: structuredClone(this.state.opportunitySignalReviews.find(({ signalId }) => signalId === signal.id) ?? signal.review) }))
      .filter((signal) => !type || signal.type === type)
      .filter((signal) => !status || signal.review.status === status)
      .sort((left, right) => left.id.localeCompare(right.id))
  }

  opportunitySignalAggregate() {
    const signals = this.opportunitySignals()
    return {
      total: signals.length,
      unreviewed: signals.filter(({ review }) => review.status === 'unreviewed').length,
      dismissed: signals.filter(({ review }) => review.status === 'dismissed').length,
      byType: Object.entries(signals.reduce((counts, { type }) => ({ ...counts, [type]: (counts[type] ?? 0) + 1 }), {})).sort(([left], [right]) => left.localeCompare(right)).map(([type, count]) => ({ type, count }))
    }
  }

  analyticsSource() {
    return {
      customers: structuredClone(this.state.customers),
      equipmentRecords: this.state.equipmentRecords.map((record) => this.equipmentRecordWithFreshness(record)),
      opportunitySignals: this.opportunitySignals()
    }
  }

  async runAnalytics(question, interpreter) {
    const rejection = rejectUnsafeQuestion(question)
    if (rejection) return { status: 'rejected', error: rejection, synthetic: true }
    const before = this.snapshot()
    const interpretation = await interpreter(question.trim())
    if (interpretation.status !== 'succeeded') return { status: 'rejected', error: 'QVAC local no produjo un plan analítico válido después del único reintento permitido.', interpretation: safeInterpretation(interpretation), synthetic: true }
    const validation = validateAnalyticsPlan(interpretation.plan)
    if (!validation.valid) return { status: 'rejected', error: 'El plan fue rechazado por el contrato de solo lectura.', validationErrors: validation.errors, interpretation: safeInterpretation(interpretation), synthetic: true }
    if (validation.plan.status === 'rejected') return { status: 'rejected', error: validation.plan.reason, interpretation: safeInterpretation(interpretation), synthetic: true }
    const source = this.analyticsSource()
    const anchored = anchorAnalyticsPlan(question.trim(), validation.plan, source)
    if (!anchored.valid) return { status: 'rejected', error: 'No se pudo reconciliar el plan con las restricciones explícitas de la pregunta. Reformule la consulta.', semanticErrors: anchored.errors, modelPlan: anchored.modelPlan, interpretation: safeInterpretation(interpretation), synthetic: true }
    const result = executeAnalyticsPlan(anchored.plan, source)
    if (JSON.stringify(this.snapshot()) !== JSON.stringify(before)) throw new Error('La consulta analítica intentó modificar el Workspace')
    return { status: 'succeeded', modelPlan: anchored.modelPlan, plan: anchored.plan, repairs: anchored.repairs, result, answer: analyticsAnswer(result), interpretation: safeInterpretation(interpretation), synthetic: true, localWorkspace: true }
  }

  async dismissOpportunitySignal(signalId, reason) {
    if (!this.opportunitySignals().some(({ id }) => id === signalId)) throw new Error('Señal de oportunidad desconocida')
    const normalizedReason = reason?.trim()
    if (!normalizedReason) throw new Error('El motivo de descarte es obligatorio')
    if (normalizedReason.length > 200) throw new Error('El motivo de descarte no puede exceder 200 caracteres')
    const review = { signalId, status: 'dismissed', reason: normalizedReason, actor: 'Usuario local de demostración', reviewedAt: this.timestamp() }
    const index = this.state.opportunitySignalReviews.findIndex((item) => item.signalId === signalId)
    if (index === -1) this.state.opportunitySignalReviews.push(review)
    else this.state.opportunitySignalReviews[index] = review
    await this.persist(this.state)
    return this.opportunitySignals().find(({ id }) => id === signalId)
  }

  verificationItems({ priority, customerId, equipmentRecordId, reasonCode, observationId } = {}) {
    this.recalculateVerificationItems()
    return this.state.verificationItems
      .filter((item) => item.status === 'open')
      .map((item) => this.verificationItemWithEvidence(item))
      .filter((item) => !priority || item.priority === priority)
      .filter((item) => !customerId || item.customerId === customerId)
      .filter((item) => !equipmentRecordId || item.equipmentRecordId === equipmentRecordId)
      .filter((item) => !reasonCode || item.reasonCodes.includes(reasonCode))
      .filter((item) => !observationId || item.observationId === observationId)
      .sort(compareVerificationItems)
  }

  aggregate() {
    const records = this.state.equipmentRecords
    return {
      customers: this.state.customers.length,
      observations: this.state.observations.length,
      verifiedRecords: records.filter((item) => item.status === 'verified').length,
      provisionalRecords: records.filter((item) => item.status === 'provisional').length,
      openVerificationItems: this.state.verificationItems.filter((item) => item.status === 'open').length,
      byModality: Object.entries(records.reduce((counts, item) => ({ ...counts, [item.modality]: (counts[item.modality] ?? 0) + 1 }), {})).map(([modality, count]) => ({ modality, count }))
    }
  }

  exportWorkspace() {
    this.recalculateVerificationItems()
    return createWorkspaceExport(this.state, this.aggregate(), this.timestamp())
  }

  async deleteWorkspace(confirmation) {
    if (confirmation !== DELETE_CONFIRMATION) throw new Error(`Escriba ${DELETE_CONFIRMATION} para confirmar la eliminación`)
    const empty = emptyWorkspaceState(this.state)
    await this.persist(empty)
    this.state = empty
    return this.snapshot()
  }

  requireObservation(id) {
    const observation = this.state.observations.find((item) => item.id === id)
    if (!observation) throw new Error('Observación desconocida')
    return observation
  }

  timestamp() {
    return new Date(this.now()).toISOString()
  }

  ensureAcceptedEvidence(observation) {
    for (const claim of observation.draftClaims.filter((item) => item.decision === 'accepted')) {
      if (claim.acceptedEvidenceEntryId && this.state.evidenceEntries.some(({ id }) => id === claim.acceptedEvidenceEntryId)) continue
      const entry = {
        id: randomUUID(),
        observationId: observation.id,
        claimId: claim.claimId,
        customerId: observation.customerId,
        equipmentRecordId: observation.reconciliation?.recordId ?? null,
        type: 'acceptedClaim',
        text: claim.evidence.text,
        author: 'Usuario local de demostración',
        origin: 'qvacDraftReviewed',
        observationDate: observation.observationDate,
        recordedAt: observation.recordedAt
      }
      this.state.evidenceEntries.push(entry)
      observation.evidenceEntryIds.push(entry.id)
      claim.acceptedEvidenceEntryId = entry.id
    }
  }

  ensureVerificationItemForAcceptedEvidence(observation) {
    const accepted = observation.draftClaims.filter((claim) => claim.decision === 'accepted' && !claim.negated)
    for (const subjectId of new Set(accepted.map(({ subjectId }) => subjectId))) {
      const claims = accepted.filter((claim) => claim.subjectId === subjectId)
      const reasonCodes = verificationReasonsForClaims(claims, observation, this.state.equipmentRecords)
      const evidenceIds = claims.flatMap((claim) => [
        claim.acceptedEvidenceEntryId,
        ...claim.corrections.map(({ evidenceEntryId }) => evidenceEntryId)
      ]).filter(Boolean)
      const id = `accepted:${observation.id}:${subjectId}`
      const existing = this.state.verificationItems.find((item) => item.id === id)
      if (existing) {
        existing.baseReasonCodes = [...new Set([...existing.baseReasonCodes, ...reasonCodes])]
        existing.supportingEvidenceEntryIds = [...new Set([...existing.supportingEvidenceEntryIds, ...evidenceIds])]
        existing.equipmentRecordId = observation.reconciliation?.recordId ?? existing.equipmentRecordId ?? null
        existing.updatedAt = this.timestamp()
      } else {
        this.state.verificationItems.push({
          id,
          customerId: observation.customerId,
          observationId: observation.id,
          subjectId,
          equipmentRecordId: observation.reconciliation?.recordId ?? null,
          baseReasonCodes: reasonCodes,
          reasonCodes: [...reasonCodes],
          supportingEvidenceEntryIds: evidenceIds,
          status: 'open',
          createdAt: this.timestamp(),
          updatedAt: this.timestamp()
        })
      }
    }
  }

  recalculateVerificationItems() {
    for (const item of this.state.verificationItems) {
      normalizeVerificationItem(item)
      const evidence = item.supportingEvidenceEntryIds.map((id) => this.state.evidenceEntries.find((entry) => entry.id === id)).filter(Boolean)
      const reasonCodes = [...item.baseReasonCodes]
      const latestEvidenceAt = latestDate(evidence.map(({ recordedAt }) => recordedAt))
      const latestObservationDate = latestDate(evidence.map(({ observationDate }) => observationDate))
      if (!latestEvidenceAt) reasonCodes.push('undatedEvidence')
      if (!latestObservationDate) reasonCodes.push('undatedObservation')
      else if (ageInDays(latestObservationDate, this.now()) >= FRESHNESS_POLICY.materiallyOldDays) reasonCodes.push('staleEvidence')
      item.reasonCodes = [...new Set(reasonCodes)]
      item.priority = priorityForReasons(item.reasonCodes)
      item.latestEvidenceAt = latestEvidenceAt
      item.latestObservationDate = latestObservationDate
    }
  }

  verificationItemWithEvidence(item) {
    const equipment = item.equipmentRecordId ? this.state.equipmentRecords.find(({ id }) => id === item.equipmentRecordId) : null
    return {
      ...structuredClone(item),
      priorityLabel: PRIORITY_LABELS[item.priority],
      reasons: item.reasonCodes.map((code) => REASON_LABELS[code] ?? 'Información pendiente de confirmar'),
      customer: structuredClone(this.state.customers.find(({ id }) => id === item.customerId)),
      equipmentRecord: equipment ? this.equipmentRecordWithFreshness(equipment) : null,
      supportingEvidenceEntries: structuredClone(item.supportingEvidenceEntryIds.map((id) => this.state.evidenceEntries.find((entry) => entry.id === id)).filter(Boolean))
    }
  }

  equipmentRecordWithFreshness(record) {
    const observations = record.evidenceObservationIds.map((id) => this.state.observations.find((observation) => observation.id === id)).filter(Boolean)
    const evidenceIds = new Set(record.evidenceEntryIds)
    for (const entry of this.state.evidenceEntries.filter((item) => item.equipmentRecordId === record.id || record.evidenceObservationIds.includes(item.observationId))) evidenceIds.add(entry.id)
    const entries = [...evidenceIds].map((id) => this.state.evidenceEntries.find((entry) => entry.id === id)).filter(Boolean)
    const result = {
      ...structuredClone(record),
      evidenceEntryIds: [...evidenceIds],
      latestEvidenceAt: latestDate([...observations.map(({ recordedAt }) => recordedAt), ...entries.map(({ recordedAt }) => recordedAt)]),
      latestObservationDate: latestDate([...observations.map(({ observationDate }) => observationDate), ...entries.map(({ observationDate }) => observationDate)])
    }
    result.confidenceScore = calculateEquipmentConfidence({
      record: result,
      observations,
      evidenceEntries: entries,
      evaluatedAt: this.now(),
      policy: this.confidencePolicy
    })
    return result
  }

  appendExtractionAttempts(observation, extraction, phase, startedAt) {
    const received = extraction.attempts ?? []
    if (received.length > 1) throw new Error('Cada fase de aclaración admite una sola inferencia')
    const sourceAttempts = received.length ? received : [{ status: extraction.status, validatedDraft: extraction.draft ?? null }]
    const added = sourceAttempts.map((attempt) => ({
      ...attempt,
      attemptId: randomUUID(),
      attemptNumber: observation.attempts.length + 1,
      phase,
      observationRevision: observation.revision,
      startedAt,
      completedAt: this.timestamp(),
      draftStatus: attempt.status === 'succeeded' ? 'active' : 'invalid'
    }))
    observation.attempts.push(...added)
  }
}

export const FRESHNESS_POLICY = Object.freeze({
  materiallyOldDays: 90,
  disclaimer: 'Regla configurable del prototipo; no es una política oficial de Philips y no indica que la información antigua sea incorrecta.'
})

const HIGH_PRIORITY_REASONS = new Set(['conflictingEvidence', 'unknownIdentity', 'ambiguousQuantity', 'conflictingQuantity', 'unknownQuantity', 'unresolvedReconciliationConflict'])
const MEDIUM_PRIORITY_REASONS = new Set(['estimatedInformation', 'reviewerCorrection', 'missingManufacturer', 'missingModel', 'staleEvidence', 'undatedEvidence', 'undatedObservation'])
const PRIORITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' }
const REASON_LABELS = {
  conflictingEvidence: 'Evidencia en conflicto',
  unknownIdentity: 'Identidad del equipo desconocida',
  ambiguousQuantity: 'Cantidad en conflicto',
  conflictingQuantity: 'Cantidad en conflicto',
  unknownQuantity: 'Cantidad con alcance desconocido',
  unresolvedReconciliationConflict: 'Conflicto de reconciliación pendiente',
  estimatedInformation: 'Información estimada',
  reviewerCorrection: 'Corrección proporcionada por el revisor',
  missingManufacturer: 'Fabricante desconocido',
  missingModel: 'Modelo desconocido',
  staleEvidence: 'Evidencia antigua según la regla del prototipo',
  undatedEvidence: 'Evidencia sin fecha de registro',
  undatedObservation: 'Evidencia sin fecha',
  reportedNeedsConfirmation: 'Información reportada pendiente de confirmar',
  legacyNeedsConfirmation: 'Información pendiente de confirmar'
}

function normalizeObservationDate(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('La fecha de observación debe usar el formato AAAA-MM-DD')
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('La fecha de observación no es válida')
  return value
}

function normalizeVerificationItem(item) {
  item.supportingEvidenceEntryIds ??= []
  item.equipmentRecordId ??= null
  item.observationId ??= null
  item.baseReasonCodes ??= item.reasonCodes?.length
    ? [...item.reasonCodes]
    : [legacyReasonCode(item)]
  item.reasonCodes ??= [...item.baseReasonCodes]
  item.createdAt ??= null
  item.updatedAt ??= item.createdAt
}

function legacyReasonCode(item) {
  const reason = item.reason?.toLocaleLowerCase('es') ?? ''
  if (/contradict|conflict/.test(reason)) return 'conflictingEvidence'
  if (/cantidad|total/.test(reason)) return 'ambiguousQuantity'
  if (/serie|identidad/.test(reason)) return 'unknownIdentity'
  if (/modelo/.test(reason)) return 'missingModel'
  if (/fabricante/.test(reason)) return 'missingManufacturer'
  if (item.priority === 1) return 'unresolvedReconciliationConflict'
  if (item.priority === 2) return 'legacyNeedsConfirmation'
  return 'reportedNeedsConfirmation'
}

function verificationReasonsForClaims(claims, observation, records) {
  const reasons = []
  if (claims.some((claim) => claim.type === 'quantity' && claim.quantityScope === 'unknown')) reasons.push('unknownQuantity')
  if (claims.some((claim) => claim.certainty === 'estimated')) reasons.push('estimatedInformation')
  if (claims.some((claim) => claim.corrections.some(({ origin }) => origin === 'reviewerProvided'))) reasons.push('reviewerCorrection')
  if (claims.some((claim) => claim.type === 'equipmentType')) {
    if (!claims.some((claim) => claim.type === 'manufacturer')) reasons.push('missingManufacturer')
    if (!claims.some((claim) => claim.type === 'model')) reasons.push('missingModel')
  }
  const record = observation.reconciliation ? records.find(({ id }) => id === observation.reconciliation.recordId) : null
  if (record && claims.some((claim) => {
    const recordValue = { equipmentType: record.modality, manufacturer: record.manufacturer, model: record.model }[claim.type]
    return recordValue !== undefined && String(recordValue).toLocaleLowerCase('es') !== String(claim.value).toLocaleLowerCase('es')
  })) reasons.push('conflictingEvidence')
  return reasons.length ? [...new Set(reasons)] : ['reportedNeedsConfirmation']
}

function priorityForReasons(reasonCodes) {
  if (reasonCodes.some((code) => HIGH_PRIORITY_REASONS.has(code))) return 'high'
  if (reasonCodes.some((code) => MEDIUM_PRIORITY_REASONS.has(code))) return 'medium'
  return 'low'
}

function compareVerificationItems(left, right) {
  const rank = { high: 0, medium: 1, low: 2 }
  if (rank[left.priority] !== rank[right.priority]) return rank[left.priority] - rank[right.priority]
  const leftUnknown = left.latestObservationDate ? 1 : 0
  const rightUnknown = right.latestObservationDate ? 1 : 0
  if (leftUnknown !== rightUnknown) return leftUnknown - rightUnknown
  const leftEvidence = left.latestEvidenceAt ? Date.parse(left.latestEvidenceAt) : Number.NEGATIVE_INFINITY
  const rightEvidence = right.latestEvidenceAt ? Date.parse(right.latestEvidenceAt) : Number.NEGATIVE_INFINITY
  if (leftEvidence !== rightEvidence) return leftEvidence - rightEvidence
  return left.id.localeCompare(right.id)
}

function latestDate(values) {
  const valid = values.filter(Boolean).filter((value) => !Number.isNaN(Date.parse(value)))
  if (!valid.length) return null
  return valid.reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest)
}

function ageInDays(value, now) {
  const difference = new Date(now).getTime() - Date.parse(value)
  return Math.max(0, Math.floor(difference / 86_400_000))
}

const CORRECTABLE_VALUE_TYPES = new Set(['equipmentType', 'manufacturer', 'model', 'quantity'])
const QUANTITY_SCOPES = new Set(['observed', 'reportedTotal', 'unknown'])
const CERTAINTY_STATES = new Set(['reported', 'estimated', 'unknown'])

function prepareDraftClaim(claim) {
  const prepared = structuredClone(claim)
  prepared.originalValue = structuredClone(claim.originalValue ?? claim.value)
  prepared.reviewedValue = structuredClone(claim.reviewedValue ?? claim.value)
  prepared.originalCertainty = claim.originalCertainty ?? claim.certainty
  prepared.reviewedCertainty = claim.reviewedCertainty ?? claim.certainty
  prepared.originalQuantityScope = claim.originalQuantityScope ?? claim.quantityScope ?? null
  prepared.reviewedQuantityScope = claim.reviewedQuantityScope ?? claim.quantityScope ?? null
  prepared.decision ??= 'pending'
  prepared.reviewStatus ??= prepared.decision
  prepared.corrections = structuredClone(claim.corrections ?? [])
  return prepared
}

function validateCorrectionField(claim, field) {
  if (!['equipmentType', 'manufacturer', 'model', 'quantity', 'quantityScope', 'certainty'].includes(field)) {
    throw new Error('Campo de corrección no permitido')
  }
  if (field === 'certainty') return
  if (field === 'quantityScope' && claim.type === 'quantity') return
  if (CORRECTABLE_VALUE_TYPES.has(field) && claim.type === field) return
  throw new Error('El campo no corresponde a este dato extraído')
}

function validateCorrectionValue(field, correctedValue) {
  if (field === 'quantity') {
    if (correctedValue === '' || correctedValue === null || correctedValue === undefined) throw new Error('La cantidad es obligatoria')
    const quantity = Number(correctedValue)
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('La cantidad debe ser un número entero positivo válido')
    return quantity
  }
  if (field === 'quantityScope') {
    if (!QUANTITY_SCOPES.has(correctedValue)) throw new Error('El alcance de cantidad no es válido')
    return correctedValue
  }
  if (field === 'certainty') {
    if (!CERTAINTY_STATES.has(correctedValue)) throw new Error('El estado de certeza no es válido')
    return correctedValue
  }
  if (typeof correctedValue !== 'string' || !correctedValue.trim()) throw new Error('El valor corregido es obligatorio')
  const value = correctedValue.trim()
  if (value.length > 100) throw new Error('El valor corregido es demasiado largo')
  return value
}

function validateReason(reason) {
  if (reason === undefined || reason === null || reason === '') return null
  if (typeof reason !== 'string') throw new Error('El motivo debe ser texto')
  const value = reason.trim()
  if (value.length > 200) throw new Error('El motivo es demasiado largo')
  return value || null
}

function currentFieldValue(claim, field) {
  if (field === 'certainty') return claim.reviewedCertainty
  if (field === 'quantityScope') return claim.reviewedQuantityScope
  return claim.reviewedValue
}

function setCurrentFieldValue(claim, field, value) {
  if (field === 'certainty') {
    claim.reviewedCertainty = value
    claim.certainty = value
    return
  }
  if (field === 'quantityScope') {
    claim.reviewedQuantityScope = value
    claim.quantityScope = value
    return
  }
  claim.reviewedValue = value
  claim.value = value
}

function sameValue(left, right) {
  return typeof left === 'string' && typeof right === 'string'
    ? left.trim().toLocaleLowerCase('es') === right.trim().toLocaleLowerCase('es')
    : left === right
}

function isDirectlySupported(originalText, field, value) {
  if (['quantityScope', 'certainty'].includes(field)) return false
  const normalizedText = normalizeForSupport(originalText)
  const normalizedValue = normalizeForSupport(String(value))
  if (!normalizedValue) return false
  if (field === 'quantity') return new RegExp(`(^|\\D)${escapeRegExp(normalizedValue)}($|\\D)`).test(normalizedText)
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedValue)}($|[^a-z0-9])`).test(normalizedText)
}

function normalizeForSupport(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function selectMaterialClarification(draft) {
  const candidate = draft.clarification
  if (!candidate || !['qty', 'loc', 'attach', 'id'].includes(candidate.kind)) return null
  const question = candidate.question?.trim()
  if (!question || question.length > 140 || !looksSpanish(question)) return null
  if (!draft.subjects.some(({ subjectId }) => subjectId === candidate.subjectId)) return null
  return { ...structuredClone(candidate), question }
}

function looksSpanish(question) {
  return question.startsWith('¿') || /\b(qué|cuál|cuánt|dónde|son|es|representa|corresponde|total|sede|equipo)\b/i.test(question)
}

function safeInterpretation(interpretation) {
  return {
    status: interpretation.status,
    attempts: structuredClone(interpretation.attempts ?? []).map(({ rawOutput, ...attempt }) => attempt),
    load: structuredClone(interpretation.load ?? null),
    configuration: structuredClone(interpretation.configuration ?? null)
  }
}
