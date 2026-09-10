import { randomUUID } from 'node:crypto'

export class WorkspaceService {
  constructor(state, persist) {
    this.state = structuredClone(state)
    this.state.evidenceEntries ??= []
    for (const observation of this.state.observations) {
      observation.revision ??= 0
      observation.evidenceEntryIds ??= []
      if (observation.clarification && !observation.clarification.status) {
        observation.clarification = { ...observation.clarification, status: 'pending', questionCount: 1, nextQuestion: observation.clarification.question, selectedAt: observation.recordedAt, resolvedAt: null, answerEvidenceEntryId: null }
      }
    }
    this.persist = persist
  }

  snapshot() {
    return structuredClone(this.state)
  }

  async capture(customerId, originalText, extractor) {
    if (!this.state.customers.some((customer) => customer.id === customerId)) throw new Error('Cliente desconocido')
    if (!originalText?.trim()) throw new Error('El texto de la observación es obligatorio')
    const observation = {
      id: randomUUID(),
      customerId,
      originalText: originalText.trim(),
      recordedAt: new Date().toISOString(),
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
      const startedAt = new Date().toISOString()
      const extraction = await extractor(observation.originalText, { allowClarification: true, phase: 'initial' })
      observation.status = extraction.status
      this.appendExtractionAttempts(observation, extraction, 'initial', startedAt)
      observation.model = extraction.model
      observation.load = extraction.load ?? null
      if (extraction.status === 'succeeded' && extraction.draft) {
        observation.subjects = extraction.draft.subjects
        observation.draftClaims = extraction.draft.claims.map((claim) => ({ ...claim, decision: 'pending' }))
        const clarification = selectMaterialClarification(extraction.draft)
        observation.clarification = clarification ? {
          ...clarification,
          status: 'pending',
          questionCount: 1,
          nextQuestion: clarification.question,
          selectedAt: new Date().toISOString(),
          resolvedAt: null,
          answerEvidenceEntryId: null
        } : null
      }
    } catch (error) {
      observation.status = 'failed'
      observation.attempts.push({ status: 'failed', failureCategory: 'host', errors: [error instanceof Error ? error.message : String(error)] })
    }
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
      observation.clarification.resolvedAt = new Date().toISOString()
      await this.persist(this.state)
      return this.observation(observationId)
    }

    const text = answer?.trim()
    if (!text) throw new Error('Escriba una respuesta antes de continuar')
    if (observation.attempts.length >= 2) throw new Error('Esta observación ya alcanzó el máximo de dos inferencias')

    const evidenceEntry = {
      id: randomUUID(),
      observationId,
      type: 'clarificationAnswer',
      text,
      author: 'Usuario local de demostración',
      recordedAt: new Date().toISOString(),
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
    const startedAt = new Date().toISOString()
    try {
      const extraction = await extractor(combinedEvidence, { allowClarification: false, phase: 'clarification' })
      this.appendExtractionAttempts(observation, extraction, 'clarification', startedAt)
      observation.status = extraction.status
      observation.model = extraction.model ?? observation.model
      observation.load = extraction.load ?? observation.load
      if (extraction.status === 'succeeded' && extraction.draft) {
        observation.subjects = extraction.draft.subjects
        observation.draftClaims = extraction.draft.claims.map((claim) => ({ ...claim, decision: 'pending' }))
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
        completedAt: new Date().toISOString(),
        status: 'failed',
        failureCategory: 'host',
        errors: [error instanceof Error ? error.message : String(error)],
        draftStatus: 'invalid'
      })
    }
    observation.clarification.resolvedAt = new Date().toISOString()
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
    }
    observation.reviewedAt = new Date().toISOString()
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
    observation.reconciliation = { recordId, reason: reason || 'El usuario vinculó la evidencia repetida', actor: 'Usuario local de demostración', decidedAt: new Date().toISOString() }
    if (!record.evidenceObservationIds.includes(observation.id)) record.evidenceObservationIds.push(observation.id)
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
      equipmentRecords: structuredClone(this.state.equipmentRecords.filter((record) => record.customerId === customerId)),
      observations: structuredClone(observations),
      acceptedClaimCount: acceptedClaims.length,
      unlinkedClaims: unlinkedSubjects.size,
      reportedTotals: acceptedClaims.filter((claim) => claim.type === 'quantity' && claim.quantityScope === 'reportedTotal'),
      verificationItems: structuredClone(this.state.verificationItems
        .filter((item) => item.customerId === customerId && item.status === 'open')
        .sort((left, right) => left.priority - right.priority)
        .slice(0, 3))
    }
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

  requireObservation(id) {
    const observation = this.state.observations.find((item) => item.id === id)
    if (!observation) throw new Error('Observación desconocida')
    return observation
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
      completedAt: new Date().toISOString(),
      draftStatus: attempt.status === 'succeeded' ? 'active' : 'invalid'
    }))
    observation.attempts.push(...added)
  }
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
