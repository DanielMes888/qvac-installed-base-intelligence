import test from 'node:test'
import assert from 'node:assert/strict'

import { WorkspaceService } from '../../src/core/workspace-service.mjs'

const originalNote = 'Observé tres equipos MRI DemoScan en Radiología.'

function seed() {
  return {
    synthetic: true,
    customers: [{ id: 'c1', name: 'Hospital Ficticio' }],
    equipmentRecords: [],
    observations: [],
    evidenceEntries: [],
    verificationItems: []
  }
}

function draft({ quantityScope = 'unknown', clarification = true, value = 3, evidenceText = originalNote } = {}) {
  return {
    version: 1,
    subjects: [{ subjectId: 's1', kind: 'observedGroup', label: 'DemoScan MRI' }],
    claims: [
      { claimId: 'c1', subjectId: 's1', type: 'equipmentType', value: 'MRI', sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: evidenceText.length, text: evidenceText } },
      { claimId: 'c2', subjectId: 's1', type: 'quantity', value, quantityScope, sourceType: 'directObservation', certainty: 'reported', locationScope: 'dept', negated: false, evidence: { id: 'e0', start: 0, end: evidenceText.length, text: evidenceText } }
    ],
    clarification: clarification ? { kind: 'qty', subjectId: 's1', question: '¿Los tres equipos representan el total de esta sede?', evidence: { id: 'e0', start: 0, end: originalNote.length, text: originalNote } } : null
  }
}

function succeededDraft(value, options = {}) {
  return {
    status: 'succeeded',
    attempts: [{ attemptNumber: 1, status: 'succeeded', rawOutput: `result-${value}`, metrics: { totalMs: value } }],
    draft: draft(options),
    model: { modelExport: 'QWEN3_1_7B_INST_Q4' },
    load: { loadMs: 1 }
  }
}

async function captureWithQuestion(service, extractor = async () => succeededDraft(1)) {
  return service.capture('c1', originalNote, extractor)
}

test('answered clarification saves dated evidence and runs exactly one additional extraction', async () => {
  const calls = []
  const service = new WorkspaceService(seed(), async () => {})
  const extractor = async (input, options) => {
    calls.push({ input, options })
    if (calls.length === 2) {
      const saved = service.snapshot()
      assert.equal(saved.evidenceEntries[0].text, 'Sí, son todos los equipos MRI de esta sede.')
      assert.equal(saved.observations[0].status, 'processing')
      assert.equal(saved.observations[0].draftClaims.length, 0)
    }
    return calls.length === 1
      ? succeededDraft(1)
      : succeededDraft(2, { quantityScope: 'reportedTotal', clarification: true, evidenceText: input })
  }

  const captured = await captureWithQuestion(service, extractor)
  assert.equal(captured.clarification.question, '¿Los tres equipos representan el total de esta sede?')
  const clarified = await service.clarify(captured.id, { outcome: 'answered', answer: 'Sí, son todos los equipos MRI de esta sede.' }, extractor)

  assert.equal(calls.length, 2)
  assert.equal(calls[1].options.allowClarification, false)
  assert.match(calls[1].input, new RegExp(originalNote))
  assert.match(calls[1].input, /Sí, son todos los equipos MRI de esta sede\./)
  assert.equal(clarified.evidenceEntries.length, 1)
  assert.equal(clarified.evidenceEntries[0].text, 'Sí, son todos los equipos MRI de esta sede.')
  assert.equal(clarified.evidenceEntries[0].type, 'clarificationAnswer')
  assert.equal(clarified.evidenceEntries[0].author, 'Usuario local de demostración')
  assert.ok(Date.parse(clarified.evidenceEntries[0].recordedAt))
  assert.equal(clarified.clarification.status, 'answered')
  assert.equal(clarified.clarification.questionCount, 1)
})

test('skipped clarification continues to final review without another extraction', async () => {
  let calls = 0
  const extractor = async () => { calls += 1; return succeededDraft(1) }
  const service = new WorkspaceService(seed(), async () => {})
  const captured = await captureWithQuestion(service, extractor)
  const skipped = await service.clarify(captured.id, { outcome: 'skipped' }, extractor)

  assert.equal(calls, 1)
  assert.equal(skipped.clarification.status, 'skipped')
  assert.equal(skipped.evidenceEntries.length, 0)
  assert.equal(skipped.draftClaims.length, 2)
  await service.review(skipped.id, skipped.draftClaims.map(({ claimId }) => ({ claimId, decision: 'rejected' })))
})

test('No lo sé continues to final review without storing an asserted answer or running inference', async () => {
  let calls = 0
  const extractor = async () => { calls += 1; return succeededDraft(1) }
  const service = new WorkspaceService(seed(), async () => {})
  const captured = await captureWithQuestion(service, extractor)
  const unknown = await service.clarify(captured.id, { outcome: 'unknown' }, extractor)

  assert.equal(calls, 1)
  assert.equal(unknown.clarification.status, 'unknown')
  assert.equal(unknown.evidenceEntries.length, 0)
  assert.equal(unknown.attempts.length, 1)
})

test('one observation can present at most one clarification question', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const extractor = async () => succeededDraft(1)
  const captured = await captureWithQuestion(service, extractor)
  await service.clarify(captured.id, { outcome: 'skipped' }, extractor)

  await assert.rejects(() => service.clarify(captured.id, { outcome: 'answered', answer: 'Sí.' }, extractor), /ya fue resuelta/)
})

test('a non-Spanish or non-material model question is not presented as a clarification', async () => {
  const service = new WorkspaceService(seed(), async () => {})
  const extractor = async () => {
    const result = succeededDraft(1)
    result.draft.clarification = { ...result.draft.clarification, question: 'Is this the total?', kind: 'detail' }
    return result
  }

  const captured = await captureWithQuestion(service, extractor)
  assert.equal(captured.clarification, null)
  const reviewed = await service.review(captured.id, captured.draftClaims.map(({ claimId }) => ({ claimId, decision: 'rejected' })))
  assert.ok(reviewed.reviewedAt)
})

test('a failed second inference retains note and answer but exposes no outdated draft claims', async () => {
  let calls = 0
  const extractor = async () => {
    calls += 1
    return calls === 1 ? succeededDraft(1) : {
      status: 'failed',
      attempts: [{ attemptNumber: 1, status: 'failed', failureCategory: 'validation', errors: ['malformed'], rawOutput: '{bad' }],
      draft: null,
      model: { modelExport: 'QWEN3_1_7B_INST_Q4' }
    }
  }
  const service = new WorkspaceService(seed(), async () => {})
  const captured = await captureWithQuestion(service, extractor)
  const failed = await service.clarify(captured.id, { outcome: 'answered', answer: 'Sí, es el total.' }, extractor)

  assert.equal(failed.status, 'failed')
  assert.equal(failed.originalText, originalNote)
  assert.equal(failed.evidenceEntries[0].text, 'Sí, es el total.')
  assert.equal(failed.draftClaims.length, 0)
  assert.equal(failed.clarification.status, 'failed')
  assert.equal(failed.attempts.length, 2)
  await assert.rejects(() => service.review(failed.id, []), /extracción final/)
})

test('successful clarification replaces active drafts and preserves both inference metadata records', async () => {
  let calls = 0
  const extractor = async (input) => {
    calls += 1
    return calls === 1
      ? succeededDraft(11, { value: 3 })
      : succeededDraft(22, { value: 4, quantityScope: 'reportedTotal', clarification: true, evidenceText: input })
  }
  const service = new WorkspaceService(seed(), async () => {})
  const captured = await captureWithQuestion(service, extractor)
  const firstAttemptId = captured.attempts[0].attemptId
  const clarified = await service.clarify(captured.id, { outcome: 'answered', answer: 'El total correcto es cuatro.' }, extractor)

  assert.deepEqual(clarified.draftClaims.filter(({ type }) => type === 'quantity').map(({ value }) => value), [4])
  assert.equal(clarified.draftClaims.every(({ decision }) => decision === 'pending'), true)
  assert.equal(clarified.attempts.length, 2)
  assert.equal(clarified.attempts[0].attemptId, firstAttemptId)
  assert.equal(clarified.attempts[0].phase, 'initial')
  assert.equal(clarified.attempts[0].draftStatus, 'superseded')
  assert.equal(clarified.attempts[0].rawOutput, 'result-11')
  assert.equal(clarified.attempts[1].phase, 'clarification')
  assert.equal(clarified.attempts[1].draftStatus, 'active')
  assert.equal(clarified.attempts[1].rawOutput, 'result-22')
  assert.notEqual(clarified.attempts[0].attemptId, clarified.attempts[1].attemptId)
  assert.equal(clarified.clarification.questionCount, 1)
  assert.equal(clarified.clarification.nextQuestion, null)
})

test('human review is blocked while clarification is pending and applies only to final drafts', async () => {
  let calls = 0
  const extractor = async (input) => {
    calls += 1
    return calls === 1 ? succeededDraft(1) : succeededDraft(2, { quantityScope: 'reportedTotal', clarification: false, evidenceText: input })
  }
  const service = new WorkspaceService(seed(), async () => {})
  const captured = await captureWithQuestion(service, extractor)
  await assert.rejects(() => service.review(captured.id, captured.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' }))), /aclaración/)

  const clarified = await service.clarify(captured.id, { outcome: 'answered', answer: 'Sí, es el total de la sede.' }, extractor)
  assert.equal(service.customerView('c1').acceptedClaimCount, 0)
  const reviewed = await service.review(clarified.id, clarified.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })))
  assert.ok(reviewed.reviewedAt)
  assert.equal(service.customerView('c1').acceptedClaimCount, clarified.draftClaims.length)
})
