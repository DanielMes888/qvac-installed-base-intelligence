import test from 'node:test'
import assert from 'node:assert/strict'

import { validateDraftClaimSet } from '../../scripts/e4/draft-claim-set.mjs'

const note = 'I saw one DemoScan MRI in Room 2.'

const validDraft = {
  subjects: [{ subjectId: 's1', kind: 'individual_candidate', label: 'DemoScan MRI in Room 2' }],
  claims: [
    {
      claimType: 'quantity',
      subjectId: 's1',
      value: null,
      quantityValue: 1,
      quantityScope: 'observed',
      locationScope: 'Room 2',
      sourceType: 'direct_observation',
      attribution: null,
      certainty: 'reported',
      evidenceExcerpt: 'one DemoScan MRI',
      negated: false
    }
  ],
  ambiguities: [],
  clarificationQuestion: null
}

test('admissible draft claims reference a subject and exact evidence in the saved note', async () => {
  const result = await validateDraftClaimSet(validDraft, note)
  assert.deepEqual(result, { valid: true, errors: [] })
})

test('a schema-valid claim with an unsupported excerpt is rejected deterministically', async () => {
  const draft = structuredClone(validDraft)
  draft.claims[0].evidenceExcerpt = 'two DemoScan MRI scanners'

  const result = await validateDraftClaimSet(draft, note)
  assert.equal(result.valid, false)
  assert.match(result.errors.join('\n'), /exact substring/)
})

test('a claim cannot refer to a subject absent from its draft set', async () => {
  const draft = structuredClone(validDraft)
  draft.claims[0].subjectId = 's2'

  const result = await validateDraftClaimSet(draft, note)
  assert.equal(result.valid, false)
  assert.match(result.errors.join('\n'), /unknown subject/)
})
