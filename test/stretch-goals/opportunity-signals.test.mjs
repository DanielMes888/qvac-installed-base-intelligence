import test from 'node:test'
import assert from 'node:assert/strict'

import { identifyOpportunitySignals, OPPORTUNITY_SIGNAL_POLICY } from '../../src/core/opportunity-signals.mjs'

const evaluatedAt = '2026-09-10T12:00:00.000Z'

function record(overrides = {}) {
  return {
    id: 'equipment-1', customerId: 'customer-1', status: 'verified', modality: 'MRI', manufacturer: 'DemoScan', model: 'DS-One', location: 'Radiología',
    evidenceObservationIds: ['observation-age'], evidenceEntryIds: ['evidence-age'],
    latestObservationDate: '2026-09-09',
    confidenceScore: { available: true, total: 70, band: { key: 'medium', label: 'Media' }, version: 'equipment-confidence-v1', evidence: [] },
    ...overrides
  }
}

function reviewedAgeEvidence(age = 8, overrides = {}) {
  const observation = {
    id: 'observation-age', customerId: 'customer-1', author: 'Fuente sintética A', originalText: `El equipo tiene aproximadamente ${age} años.`, observationDate: '2026-09-09',
    draftClaims: [{ claimId: 'age-claim', subjectId: 'subject-1', type: 'age', value: age, reviewedValue: age, certainty: 'estimated', decision: 'accepted', locationScope: 'dept', acceptedEvidenceEntryId: 'evidence-age', negated: false }],
    ...overrides
  }
  return {
    observations: [observation],
    evidenceEntries: [{ id: 'evidence-age', observationId: observation.id, equipmentRecordId: 'equipment-1', customerId: 'customer-1', type: 'acceptedClaim', text: String(age), author: 'Fuente sintética A', observationDate: observation.observationDate }],
    verificationItems: []
  }
}

test('reviewed age at the configurable threshold emits one cautious evidence-backed review signal', () => {
  const signals = identifyOpportunitySignals({ record: record(), ...reviewedAgeEvidence(OPPORTUNITY_SIGNAL_POLICY.rules.reportedAge.minimumYears), evaluatedAt })

  assert.equal(signals.length, 1)
  assert.equal(signals[0].type, 'reportedAgeReview')
  assert.equal(signals[0].rule.id, 'reported-age-review')
  assert.equal(signals[0].rule.thresholds.minimumYears, 7)
  assert.match(signals[0].reason, /antigüedad reportada de 7 años/i)
  assert.deepEqual(signals[0].evidenceIds, ['evidence-age'])
  assert.equal(signals[0].facts.find(({ key }) => key === 'reportedAgeYears').value, 7)
  assert.equal(signals[0].context.confidence.total, 70)
  assert.equal(signals[0].synthetic, true)
  assert.match(signals[0].disclaimer, /regla configurable del prototipo/i)
  assert.match(signals[0].disclaimer, /señal para revisión/i)
})

test('reported-age threshold is deterministic below and above, and duplicate claims deduplicate', () => {
  assert.equal(identifyOpportunitySignals({ record: record(), ...reviewedAgeEvidence(6), evaluatedAt }).some(({ type }) => type === 'reportedAgeReview'), false)
  const evidence = reviewedAgeEvidence(8)
  evidence.observations[0].draftClaims.push({ ...evidence.observations[0].draftClaims[0], claimId: 'age-duplicate' })
  assert.equal(identifyOpportunitySignals({ record: record(), ...evidence, evaluatedAt }).filter(({ type }) => type === 'reportedAgeReview').length, 1)
})

test('reported age with an unknown, invalid, or future observation date does not activate the age rule', () => {
  for (const observationDate of [null, '2026-02-30', '2026-09-11']) {
    const evidence = reviewedAgeEvidence(8, { observationDate })
    evidence.evidenceEntries[0].observationDate = observationDate
    assert.equal(identifyOpportunitySignals({ record: record(), ...evidence, evaluatedAt }).some(({ type }) => type === 'reportedAgeReview'), false)
  }
})

test('a comparable conflict suppresses the specific age signal instead of choosing a truth', () => {
  const evidence = reviewedAgeEvidence(8)
  evidence.verificationItems = [{ id: 'conflict-1', equipmentRecordId: 'equipment-1', status: 'open', reasonCodes: ['conflictingEvidence'], supportingEvidenceEntryIds: ['evidence-age'] }]

  const signals = identifyOpportunitySignals({ record: record(), ...evidence, evaluatedAt })

  assert.equal(signals.some(({ type }) => type === 'reportedAgeReview'), false)
  assert.deepEqual(signals.map(({ type }) => type), ['materialVerificationReview'])
})

test('conflicting reviewed ages at the same date and scope expose both evidence sources without selecting one', () => {
  const evidence = reviewedAgeEvidence(8)
  evidence.observations.push({ ...structuredClone(evidence.observations[0]), id: 'observation-age-2', draftClaims: [{ ...evidence.observations[0].draftClaims[0], claimId: 'age-2', value: 12, reviewedValue: 12, acceptedEvidenceEntryId: 'evidence-age-2' }] })
  evidence.evidenceEntries.push({ ...evidence.evidenceEntries[0], id: 'evidence-age-2', observationId: 'observation-age-2', text: '12', author: 'Fuente sintética B' })
  const equipment = record({ evidenceObservationIds: ['observation-age', 'observation-age-2'], evidenceEntryIds: ['evidence-age', 'evidence-age-2'] })
  const signals = identifyOpportunitySignals({ record: equipment, ...evidence, evaluatedAt })
  assert.equal(signals.some(({ type }) => type === 'reportedAgeReview'), false)
  const conflict = signals.find(({ type }) => type === 'materialVerificationReview')
  assert.deepEqual(conflict.evidenceIds, ['evidence-age', 'evidence-age-2'])
  assert.deepEqual(conflict.facts[0].value, ['conflictingReportedAge'])
})

test('a multi-subject Observation cannot attach an age signal to the wrong equipment record', () => {
  const evidence = reviewedAgeEvidence(8)
  evidence.observations[0].draftClaims.push({ claimId: 'other-equipment', subjectId: 'subject-2', type: 'equipmentType', value: 'CT', decision: 'accepted', locationScope: 'dept', negated: false })
  assert.equal(identifyOpportunitySignals({ record: record(), ...evidence, evaluatedAt }).some(({ type }) => type === 'reportedAgeReview'), false)
})

test('two missing core fields with visible evidence emit one incomplete-information review signal', () => {
  const equipment = record({ manufacturer: '', model: null, evidenceObservationIds: [], evidenceEntryIds: ['seed-evidence'] })
  const signals = identifyOpportunitySignals({
    record: equipment,
    observations: [],
    evidenceEntries: [{ id: 'seed-evidence', equipmentRecordId: equipment.id, type: 'seedReference', text: 'Referencia sintética del MRI.', author: 'Conjunto sintético', observationDate: '2026-09-09' }],
    verificationItems: [],
    evaluatedAt
  })

  assert.equal(signals.length, 1)
  assert.equal(signals[0].type, 'incompleteInformationReview')
  assert.deepEqual(signals[0].facts.find(({ key }) => key === 'missingFields').value, ['manufacturer', 'model'])
  assert.deepEqual(signals[0].evidenceIds, ['seed-evidence'])
  assert.match(signals[0].reason, /2 campos básicos/i)
})

test('incomplete-information threshold is deterministic below and above', () => {
  const evidenceEntries = [{ id: 'seed-evidence', equipmentRecordId: 'equipment-1', type: 'seedReference', text: 'Referencia sintética.', observationDate: '2026-09-09' }]
  const oneMissing = record({ manufacturer: '', evidenceObservationIds: [], evidenceEntryIds: ['seed-evidence'] })
  const threeMissing = record({ manufacturer: '', model: '', location: '', evidenceObservationIds: [], evidenceEntryIds: ['seed-evidence'] })
  assert.equal(identifyOpportunitySignals({ record: oneMissing, evidenceEntries, evaluatedAt }).some(({ type }) => type === 'incompleteInformationReview'), false)
  assert.equal(identifyOpportunitySignals({ record: threeMissing, evidenceEntries, evaluatedAt }).some(({ type }) => type === 'incompleteInformationReview'), true)
})

test('freshness boundaries, unknown dates, and recent complete evidence remain conservative', () => {
  const equipment = record({ evidenceObservationIds: [], evidenceEntryIds: ['e1'] })
  const entry = (date) => [{ id: 'e1', equipmentRecordId: equipment.id, type: 'seedReference', text: 'Referencia sintética.', observationDate: date }]
  assert.equal(identifyOpportunitySignals({ record: equipment, evidenceEntries: entry('2026-06-12'), evaluatedAt, observations: [], verificationItems: [] }).some(({ type }) => type === 'staleEvidenceReview'), true)
  assert.equal(identifyOpportunitySignals({ record: equipment, evidenceEntries: entry('2026-06-11'), evaluatedAt, observations: [], verificationItems: [] }).some(({ type }) => type === 'staleEvidenceReview'), true)
  assert.equal(identifyOpportunitySignals({ record: equipment, evidenceEntries: entry('2026-06-13'), evaluatedAt, observations: [], verificationItems: [] }).some(({ type }) => type === 'staleEvidenceReview'), false)
  assert.equal(identifyOpportunitySignals({ record: equipment, evidenceEntries: entry(null), evaluatedAt, observations: [], verificationItems: [] })[0].type, 'unknownObservationDateReview')
  assert.deepEqual(identifyOpportunitySignals({ record: equipment, evidenceEntries: entry('2026-09-09'), evaluatedAt, observations: [], verificationItems: [] }), [])
})

test('future evidence cannot hide older dated evidence from the freshness rule', () => {
  const equipment = record({ evidenceObservationIds: [], evidenceEntryIds: ['old', 'future'] })
  const signals = identifyOpportunitySignals({ record: equipment, observations: [], verificationItems: [], evaluatedAt, evidenceEntries: [
    { id: 'old', equipmentRecordId: equipment.id, type: 'seedReference', text: 'Referencia antigua.', observationDate: '2026-01-01' },
    { id: 'future', equipmentRecordId: equipment.id, type: 'seedReference', text: 'Fecha futura visible.', observationDate: '2026-09-11' }
  ] })
  assert.equal(signals.some(({ type }) => type === 'staleEvidenceReview'), true)
})

test('a material conflict creates one review signal with visible evidence while suppressing the age conclusion', () => {
  const evidence = reviewedAgeEvidence(8)
  evidence.verificationItems = [{ id: 'conflict-1', equipmentRecordId: 'equipment-1', status: 'open', reasonCodes: ['conflictingEvidence'], supportingEvidenceEntryIds: ['evidence-age'] }]
  const signals = identifyOpportunitySignals({ record: record(), ...evidence, evaluatedAt })
  assert.equal(signals.some(({ type }) => type === 'reportedAgeReview'), false)
  assert.equal(signals.filter(({ type }) => type === 'materialVerificationReview').length, 1)
  assert.deepEqual(signals.find(({ type }) => type === 'materialVerificationReview').evidenceIds, ['evidence-age'])
})

test('insufficient evidence, provisional status, or confidence alone never creates a signal', () => {
  assert.deepEqual(identifyOpportunitySignals({ record: record({ status: 'provisional', evidenceObservationIds: [], evidenceEntryIds: [], latestObservationDate: null }), evaluatedAt }), [])
})

test('results are stable, bounded by distinct rule ids, and contain no prohibited commercial claims', () => {
  const input = { record: record(), ...reviewedAgeEvidence(9), evaluatedAt }
  const before = structuredClone(input)
  const first = identifyOpportunitySignals(input)
  const second = identifyOpportunitySignals(input)
  assert.deepEqual(first, second)
  assert.deepEqual(input, before)
  assert.equal(new Set(first.map(({ id }) => id)).size, first.length)
  const visible = JSON.stringify(first).toLocaleLowerCase('es')
  for (const prohibited of ['intención de compra', 'necesidad clínica', 'obsolescencia', 'reemplazo obligatorio', 'oportunidad de venta confirmada', 'recomendación médica']) assert.equal(visible.includes(prohibited), false)
})

test('configurable thresholds deterministically change outcomes and invalid policies stop', () => {
  const policy = structuredClone(OPPORTUNITY_SIGNAL_POLICY)
  policy.rules.reportedAge.minimumYears = 10
  assert.equal(identifyOpportunitySignals({ record: record(), ...reviewedAgeEvidence(9), evaluatedAt, policy }).some(({ type }) => type === 'reportedAgeReview'), false)
  policy.rules.incompleteInformation.minimumMissingFields = 4
  assert.throws(() => identifyOpportunitySignals({ record: record(), ...reviewedAgeEvidence(9), evaluatedAt, policy }), /completitud/i)
})
