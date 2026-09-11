import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateEquipmentConfidence, CONFIDENCE_SCORE_POLICY } from '../../src/core/confidence-score.mjs'

const evaluatedAt = '2026-09-10T12:00:00.000Z'

function completeRecord(overrides = {}) {
  return {
    id: 'equipment-1',
    customerId: 'customer-1',
    status: 'verified',
    modality: 'MRI',
    manufacturer: 'DemoScan',
    model: 'DS-One',
    location: 'Radiología',
    evidenceObservationIds: ['observation-1', 'observation-2'],
    evidenceEntryIds: ['reference-1'],
    ...overrides
  }
}

function evidenceState() {
  return {
    observations: [
      { id: 'observation-1', author: 'Fuente A', locationScope: 'dept', originalText: 'Observé el MRI durante la visita.', observationDate: '2026-09-09', recordedAt: '2026-09-09T15:00:00.000Z' },
      { id: 'observation-2', author: 'Fuente B', locationScope: 'dept', originalText: 'El equipo seguía en Radiología.', observationDate: '2026-09-08', recordedAt: '2026-09-08T15:00:00.000Z' }
    ],
    evidenceEntries: [
      { id: 'reference-1', equipmentRecordId: 'equipment-1', type: 'seedReference', text: 'Referencia sintética independiente.', observationDate: '2026-09-10', recordedAt: '2026-09-10T10:00:00.000Z' }
    ]
  }
}

test('a complete, recent, independently corroborated record explains a 100-point prototype indicator', () => {
  const result = calculateEquipmentConfidence({ record: completeRecord(), ...evidenceState(), evaluatedAt })

  assert.equal(result.version, 'equipment-confidence-v1')
  assert.equal(result.total, 100)
  assert.deepEqual(result.band, { key: 'high', label: 'Alta' })
  assert.equal(result.components.completeness.points, 40)
  assert.equal(result.components.freshness.points, 30)
  assert.equal(result.components.corroboration.points, 30)
  assert.equal(result.components.corroboration.distinctSourceCount, 3)
  assert.equal(result.evaluatedOn, '2026-09-10')
  assert.match(result.components.completeness.reason, /4 de 4 campos/i)
  assert.match(result.components.freshness.reason, /reciente/i)
  assert.match(result.components.corroboration.reason, /3 procedencias independientes/i)
  assert.match(result.disclaimer, /indicador configurable del prototipo/i)
  assert.match(result.disclaimer, /no es una probabilidad estadística/i)
  assert.match(result.disclaimer, /no es una regla oficial de Philips/i)
})

test('an incomplete record receives only declared completeness points and a low band', () => {
  const record = completeRecord({ manufacturer: '', model: null, location: 'Desconocido', evidenceObservationIds: [], evidenceEntryIds: ['old'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [{ id: 'old', equipmentRecordId: record.id, type: 'seedReference', text: 'Fuente antigua incompleta.', author: 'Fuente A', observationDate: '2025-01-01' }],
    evaluatedAt
  })

  assert.equal(result.components.completeness.points, 10)
  assert.deepEqual(result.components.completeness.availableFields, ['modality'])
  assert.deepEqual(result.components.completeness.missingFields, ['manufacturer', 'model', 'location'])
  assert.equal(result.total, 10)
  assert.deepEqual(result.band, { key: 'low', label: 'Baja' })
  assert.match(result.components.completeness.reason, /fabricante, modelo, ubicación/i)
})

test('a record supported only by unknown claim scope is unavailable instead of receiving an invented score', () => {
  const observation = {
    id: 'unknown-scope',
    originalText: 'Se reportó un MRI.',
    observationDate: '2026-09-09',
    draftClaims: [{ type: 'equipmentType', value: 'MRI', decision: 'accepted', locationScope: 'unknown', negated: false }]
  }
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: [observation.id], evidenceEntryIds: [] }),
    observations: [observation],
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.available, false)
  assert.equal(result.total, null)
  assert.deepEqual(result.band, { key: 'unavailable', label: 'No disponible' })
  assert.match(result.availabilityReason, /alcance explícito/i)
  assert.deepEqual(result.evidence[0].exclusionCodes, ['unknownScope'])
})

test('an Observation without accepted scoped claims is unavailable', () => {
  const observation = { id: 'unreviewed', originalText: 'Se reportó un MRI.', observationDate: '2026-09-09', draftClaims: [] }
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: [observation.id], evidenceEntryIds: [] }),
    observations: [observation],
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.available, false)
  assert.equal(result.total, null)
  assert.deepEqual(result.evidence[0].exclusionCodes, ['unreviewedScope'])
})

test('an unknown observation date remains explicit and never borrows recorded time', () => {
  const record = completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['undated'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [{ id: 'undated', type: 'seedReference', text: 'Referencia sin fecha efectiva.', observationDate: null, recordedAt: '2026-09-10T11:59:00.000Z' }],
    evaluatedAt
  })

  assert.equal(result.components.freshness.points, 0)
  assert.equal(result.components.freshness.latestObservationDate, null)
  assert.equal(result.components.freshness.ageDays, null)
  assert.match(result.components.freshness.reason, /fecha de observación desconocida/i)
  assert.match(result.components.freshness.reason, /fecha de registro no la sustituye/i)
})

test('partial unknown dates stay visible while a valid recent source determines freshness', () => {
  const record = completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['recent', 'undated'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [
      { id: 'recent', equipmentRecordId: record.id, type: 'seedReference', text: 'Fuente reciente.', author: 'Fuente A', observationDate: '2026-09-09' },
      { id: 'undated', equipmentRecordId: record.id, type: 'seedReference', text: 'Fuente sin fecha.', author: 'Fuente B', observationDate: null }
    ],
    evaluatedAt
  })

  assert.equal(result.components.freshness.points, 30)
  assert.equal(result.components.freshness.unknownDateSourceCount, 1)
  assert.match(result.components.freshness.reason, /fecha de observación desconocida/i)
})

test('future dates are exposed and excluded rather than receiving recent-evidence points', () => {
  const record = completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['future'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [{ id: 'future', equipmentRecordId: record.id, type: 'seedReference', text: 'Fuente futura.', author: 'Fuente A', observationDate: '2026-09-11' }],
    evaluatedAt
  })

  assert.equal(result.components.freshness.points, 0)
  assert.equal(result.components.freshness.latestObservationDate, null)
  assert.equal(result.components.freshness.futureDateSourceCount, 1)
  assert.match(result.components.freshness.reason, /fecha futura excluida/i)
})

test('freshness thresholds are deterministic at every documented boundary', () => {
  const cases = [
    ['2026-08-11', 30, 30],
    ['2026-08-10', 31, 20],
    ['2026-06-12', 90, 20],
    ['2026-06-11', 91, 10],
    ['2026-03-14', 180, 10],
    ['2026-03-13', 181, 0]
  ]
  for (const [observationDate, ageDays, points] of cases) {
    const result = calculateEquipmentConfidence({
      record: completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['dated'] }),
      observations: [],
      evidenceEntries: [{ id: 'dated', type: 'seedReference', text: observationDate, observationDate }],
      evaluatedAt
    })
    assert.equal(result.components.freshness.ageDays, ageDays)
    assert.equal(result.components.freshness.points, points)
  }
})

test('multiple accepted claims and a human correction from one Observation are one provenance, not corroboration', () => {
  const observation = { id: 'observation-1', author: 'Fuente A', locationScope: 'dept', originalText: 'Una observación con varios datos.', observationDate: '2026-09-09' }
  const evidenceEntries = ['type', 'manufacturer', 'model'].map((claimId) => ({
    id: `accepted-${claimId}`,
    observationId: observation.id,
    claimId,
    type: 'acceptedClaim',
    text: claimId,
    observationDate: '2026-09-09'
  }))
  evidenceEntries.push({
    id: 'reviewer-correction',
    observationId: observation.id,
    type: 'reviewerCorrection',
    text: 'DS-One',
    observationDate: '2026-09-09'
  })
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: ['observation-1'], evidenceEntryIds: evidenceEntries.map(({ id }) => id) }),
    observations: [observation],
    evidenceEntries,
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 1)
  assert.equal(result.components.corroboration.points, 0)
  assert.match(result.components.corroboration.reason, /no existe corroboración independiente/i)
})

test('two genuinely distinct observations add bounded independent corroboration', () => {
  const observations = [
    { id: 'observation-1', author: 'Fuente A', locationScope: 'dept', originalText: 'Observé un MRI DemoScan.', observationDate: '2026-09-09' },
    { id: 'observation-2', author: 'Fuente B', locationScope: 'dept', originalText: 'El MRI sigue en Radiología.', observationDate: '2026-09-08' }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 2)
  assert.equal(result.components.corroboration.points, 20)
  assert.equal(result.total, 90)
})

test('two differently worded Observations from the same reporter are one source', () => {
  const claims = [{ type: 'equipmentType', value: 'MRI', decision: 'accepted', locationScope: 'dept', negated: false }]
  const observations = [
    { id: 'one', author: 'Misma persona', originalText: 'Primer reporte del MRI.', observationDate: '2026-09-09', draftClaims: claims },
    { id: 'two', author: 'Misma persona', originalText: 'Otra redacción sobre el mismo MRI.', observationDate: '2026-09-08', draftClaims: claims }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 1)
  assert.equal(result.components.corroboration.points, 0)
})

test('duplicated observation text does not masquerade as independent corroboration', () => {
  const observations = [
    { id: 'observation-1', author: 'Fuente A', locationScope: 'dept', originalText: 'Misma evidencia.', observationDate: '2026-09-09' },
    { id: 'observation-2', author: 'Fuente B', locationScope: 'dept', originalText: '  misma   evidencia. ', observationDate: '2026-09-08' }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 1)
  assert.equal(result.components.corroboration.points, 0)
})

test('separate entries attributed to the same source do not masquerade as independent corroboration', () => {
  const record = completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['entry-1', 'entry-2'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [
      { id: 'entry-1', equipmentRecordId: record.id, type: 'seedReference', text: 'Primer reporte.', author: 'Misma fuente', origin: 'manual', observationDate: '2026-09-09' },
      { id: 'entry-2', equipmentRecordId: record.id, type: 'seedReference', text: 'Segundo reporte distinto.', author: 'Misma fuente', origin: 'importedReference', observationDate: '2026-09-08' }
    ],
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 1)
  assert.equal(result.components.corroboration.points, 0)
  assert.equal(result.evidence.filter(({ countedForCorroboration }) => countedForCorroboration).length, 1)
})

test('an ordinary standalone Evidence Entry without structured compatibility cannot raise the score', () => {
  const record = completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['manual-entry'] })
  const result = calculateEquipmentConfidence({
    record,
    observations: [],
    evidenceEntries: [{ id: 'manual-entry', equipmentRecordId: record.id, type: 'manualNote', text: 'Texto libre potencialmente contradictorio.', author: 'Fuente A', observationDate: '2026-09-09' }],
    evaluatedAt
  })

  assert.equal(result.available, false)
  assert.equal(result.total, null)
  assert.equal(result.components.freshness.points, 0)
  assert.equal(result.components.corroboration.points, 0)
  assert.deepEqual(result.evidence[0].exclusionCodes, ['compatibilityUnestablished'])
})

test('contradictory accepted evidence is excluded instead of increasing corroboration', () => {
  const observations = [
    {
      id: 'matching', originalText: 'El modelo es DS-One.', observationDate: '2026-09-09',
      draftClaims: [{ type: 'model', value: 'DS-One', reviewedValue: 'DS-One', decision: 'accepted', locationScope: 'dept', negated: false }]
    },
    {
      id: 'conflicting', originalText: 'El modelo es DS-Otro.', observationDate: '2026-09-08',
      draftClaims: [{ type: 'model', value: 'DS-Otro', reviewedValue: 'DS-Otro', decision: 'accepted', locationScope: 'dept', negated: false }]
    }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.components.corroboration.distinctSourceCount, 1)
  assert.equal(result.components.corroboration.points, 0)
  assert.deepEqual(result.components.corroboration.excludedSourceIds, ['observation:conflicting'])
  assert.match(result.components.corroboration.reason, /1 procedencia incompatible excluida/i)
  assert.equal(result.evidence.find(({ id }) => id === 'observation:conflicting').countedForFreshness, false)
})

test('sources that contradict each other on a missing record field cannot corroborate', () => {
  const observations = [
    {
      id: 'model-one', author: 'Fuente A', originalText: 'El modelo es M1.', observationDate: '2026-09-09',
      draftClaims: [{ type: 'model', value: 'M1', decision: 'accepted', locationScope: 'dept', negated: false }]
    },
    {
      id: 'model-two', author: 'Fuente B', originalText: 'El modelo es M2.', observationDate: '2026-09-09',
      draftClaims: [{ type: 'model', value: 'M2', decision: 'accepted', locationScope: 'dept', negated: false }]
    }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ model: null, evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.available, false)
  assert.equal(result.total, null)
  assert.equal(result.components.corroboration.points, 0)
  assert.deepEqual(result.components.corroboration.incompatibleSourceIds, ['observation:model-one', 'observation:model-two'])
})

test('different values on different dates remain visible as a possible change without corroborating each other', () => {
  const observations = [
    {
      id: 'older-model', author: 'Fuente A', originalText: 'El modelo reportado era M1.', observationDate: '2026-08-01',
      draftClaims: [{ type: 'model', value: 'M1', decision: 'accepted', locationScope: 'dept', negated: false }]
    },
    {
      id: 'newer-model', author: 'Fuente B', originalText: 'El modelo reportado ahora es M2.', observationDate: '2026-09-09',
      draftClaims: [{ type: 'model', value: 'M2', decision: 'accepted', locationScope: 'dept', negated: false }]
    }
  ]
  const result = calculateEquipmentConfidence({
    record: completeRecord({ model: null, evidenceObservationIds: observations.map(({ id }) => id), evidenceEntryIds: [] }),
    observations,
    evidenceEntries: [],
    evaluatedAt
  })

  assert.equal(result.available, true)
  assert.equal(result.components.freshness.points, 30)
  assert.equal(result.components.corroboration.points, 0)
  assert.deepEqual(result.components.corroboration.incompatibleSourceIds, [])
  assert.deepEqual(result.components.corroboration.possibleChangeSourceIds, ['observation:newer-model', 'observation:older-model'])
  assert.ok(result.evidence.every(({ exclusionCodes }) => exclusionCodes.includes('possibleChangeForCorroboration')))
})

test('the same state and evaluation date produce a stable bounded result without mutating inputs', () => {
  const record = completeRecord()
  const state = evidenceState()
  const before = structuredClone({ record, ...state })
  const first = calculateEquipmentConfidence({ record, ...state, evaluatedAt })
  const second = calculateEquipmentConfidence({ record, ...state, evaluatedAt })

  assert.deepEqual(second, first)
  assert.deepEqual({ record, ...state }, before)
  assert.ok(first.total >= 0 && first.total <= 100)
  for (const component of Object.values(first.components)) assert.ok(component.points >= 0 && component.points <= component.maximum)
})

test('zero, Media, and Alta boundaries remain within 0-100', () => {
  const oldEntry = [{ id: 'old', type: 'seedReference', text: 'Fuente antigua.', observationDate: '2025-01-01' }]
  const zero = calculateEquipmentConfidence({
    record: completeRecord({ modality: null, manufacturer: null, model: null, location: null, evidenceObservationIds: [], evidenceEntryIds: ['old'] }),
    observations: [], evidenceEntries: oldEntry, evaluatedAt
  })
  const medium = calculateEquipmentConfidence({
    record: completeRecord({ model: null, location: null, evidenceObservationIds: [], evidenceEntryIds: ['recent'] }),
    observations: [], evidenceEntries: [{ id: 'recent', type: 'seedReference', text: 'Fuente reciente.', observationDate: '2026-09-10' }], evaluatedAt
  })
  const high = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: ['one', 'two'], evidenceEntryIds: [] }),
    observations: [
      { id: 'one', author: 'Fuente A', locationScope: 'dept', originalText: 'Primera fuente.', observationDate: '2026-08-01' },
      { id: 'two', author: 'Fuente B', locationScope: 'dept', originalText: 'Segunda fuente.', observationDate: '2026-07-31' }
    ],
    evidenceEntries: [], evaluatedAt
  })

  assert.deepEqual([zero.total, zero.band.label], [0, 'Baja'])
  assert.deepEqual([medium.total, medium.band.label], [50, 'Media'])
  assert.deepEqual([high.total, high.band.label], [80, 'Alta'])
})

test('subthresholds are injectable while the approved 40/30/30 weights remain mandatory', () => {
  const policy = structuredClone(CONFIDENCE_SCORE_POLICY)
  policy.version = 'equipment-confidence-test-policy'
  policy.freshness.thresholds[0].maximumAgeDays = 5
  const result = calculateEquipmentConfidence({
    record: completeRecord({ evidenceObservationIds: [], evidenceEntryIds: ['recent'] }),
    observations: [],
    evidenceEntries: [{ id: 'recent', type: 'seedReference', text: 'Fuente de prueba.', observationDate: '2026-09-01' }],
    evaluatedAt,
    policy
  })
  assert.equal(result.version, 'equipment-confidence-test-policy')
  assert.equal(result.components.freshness.points, 20)

  const invalidWeights = structuredClone(CONFIDENCE_SCORE_POLICY)
  invalidWeights.weights.completeness = 50
  assert.throws(() => calculateEquipmentConfidence({ record: completeRecord(), ...evidenceState(), evaluatedAt, policy: invalidWeights }), /40\/30\/30/)

  const excessiveFreshness = structuredClone(CONFIDENCE_SCORE_POLICY)
  excessiveFreshness.freshness.thresholds[0].points = 100
  assert.throws(() => calculateEquipmentConfidence({ record: completeRecord(), ...evidenceState(), evaluatedAt, policy: excessiveFreshness }), /umbrales de vigencia/i)

  const unorderedCorroboration = structuredClone(CONFIDENCE_SCORE_POLICY)
  unorderedCorroboration.corroboration.thresholds.reverse()
  assert.throws(() => calculateEquipmentConfidence({ record: completeRecord(), ...evidenceState(), evaluatedAt, policy: unorderedCorroboration }), /umbrales de corroboración/i)

  const rewardedUnknownDate = structuredClone(CONFIDENCE_SCORE_POLICY)
  rewardedUnknownDate.freshness.unknownDatePoints = 10
  assert.throws(() => calculateEquipmentConfidence({ record: completeRecord(), ...evidenceState(), evaluatedAt, policy: rewardedUnknownDate }), /fecha desconocida/i)
})
