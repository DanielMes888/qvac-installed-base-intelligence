import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEvidenceSegments, validateSimpleDraft } from '../../src/qvac/simple-json-contract.mjs'

test('simple JSON rows expand source IDs into offsets and atomic draft claims', () => {
  const note = 'I saw two Northstar ultrasound units. One LumaCare MRI is in Room 5.'
  const segments = buildEvidenceSegments(note)
  const result = validateSimpleDraft({
    i: [
      { e: 'ultrasound', m: 'Northstar', d: '', q: 2, qs: 'o', l: '', ls: 'unknown', src: 'd', c: 'r', n: false, r: 'e0' },
      { e: 'MRI', m: 'LumaCare', d: '', q: 1, qs: 'o', l: 'Room 5', ls: 'room', src: 'd', c: 'r', n: false, r: 'e1' }
    ],
    x: null
  }, segments, 'stop')

  assert.equal(result.valid, true)
  assert.equal(result.draft.subjects.length, 2)
  assert.equal(result.draft.claims.find((claim) => claim.type === 'quantity').value, 2)
  assert.equal(result.draft.claims.at(-1).evidence.text, 'One LumaCare MRI is in Room 5.')
  assert.equal(result.draft.claims.at(-1).evidence.start, 38)
})

test('simple JSON rejects length stops and unknown evidence references', () => {
  const segments = buildEvidenceSegments('I saw one MRI.')
  const input = { i: [{ e: 'MRI', m: '', d: '', q: 1, qs: 'o', l: '', ls: 'unknown', src: 'd', c: 'r', n: false, r: 'e9' }], x: null }
  assert.match(validateSimpleDraft(input, segments, 'length').errors.join(' '), /length/)
  assert.match(validateSimpleDraft(input, segments, 'stop').errors.join(' '), /unknown evidence/)
})

test('model output cannot assign confirmed certainty', () => {
  const segments = buildEvidenceSegments('I saw one MRI scanner.')
  const result = validateSimpleDraft({
    i: [{ e: 'MRI', q: 1, qs: 'o', src: 'd', c: 'c', r: 'e0' }],
    x: null
  }, segments, null)

  assert.equal(result.valid, false)
})
