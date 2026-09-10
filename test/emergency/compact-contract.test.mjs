import test from 'node:test'
import assert from 'node:assert/strict'

import { parseCompactJson, validateCompactDraft } from '../../src/qvac/compact-contract.mjs'

const note = 'I saw two Asteron MRI scanners in Radiology.'

test('compact draft expands valid source offsets without model-repeated evidence', () => {
  const result = validateCompactDraft({
    v: 1,
    s: [{ i: 's1', k: 'g' }],
    c: [
      { i: 'c1', s: 's1', t: 'eq', v: 'MRI', l: 'dept', src: 'd', c: 'r', n: false, a: 18, b: 21 },
      { i: 'c2', s: 's1', t: 'qt', v: 2, q: 'o', l: 'dept', src: 'd', c: 'r', n: false, a: 6, b: 9 }
    ],
    x: null
  }, note, 'stop')

  assert.equal(result.valid, true)
  assert.equal(result.expanded.c[0].evidence, 'MRI')
  assert.equal(result.expanded.c[1].evidence, 'two')
})

test('raw JSON parser discards a model thinking envelope without changing its object', () => {
  const result = parseCompactJson('<think>\nprivate scratch\n</think>\n{"i":[],"x":null}')
  assert.deepEqual(result.value, { i: [], x: null })
})

test('length-stopped and invalid source references are rejected', () => {
  const draft = {
    v: 1,
    s: [{ i: 's1', k: 'g' }],
    c: [{ i: 'c1', s: 's1', t: 'qt', v: 2, q: 'o', l: 'dept', src: 'd', c: 'r', n: false, a: 500, b: 503 }],
    x: null
  }

  assert.match(validateCompactDraft(draft, note, 'length').errors.join(' '), /length/)
  assert.match(validateCompactDraft(draft, note, 'stop').errors.join(' '), /source offsets/)
})

test('compact model output cannot assign confirmed certainty', () => {
  const result = validateCompactDraft({
    v: 1,
    s: [{ i: 's1', k: 'g' }],
    c: [{ i: 'c1', s: 's1', t: 'eq', v: 'MRI', l: 'dept', src: 'd', c: 'c', n: false, a: 18, b: 21 }],
    x: null
  }, note, 'stop')

  assert.equal(result.valid, false)
})
