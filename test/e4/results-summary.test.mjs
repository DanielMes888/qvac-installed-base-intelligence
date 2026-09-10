import test from 'node:test'
import assert from 'node:assert/strict'

import { buildGates, summarizeCases } from '../../scripts/e4/results-summary.mjs'

test('gate summary separates first-attempt success, retry success, and unresolved failure', () => {
  const cases = [
    { terminalStatus: 'succeeded', attempts: [{ status: 'succeeded', metrics: { totalMs: 1000 } }] },
    { terminalStatus: 'succeeded', attempts: [{ status: 'failed', metrics: { totalMs: 900 } }, { status: 'succeeded', metrics: { totalMs: 1100 } }] },
    { terminalStatus: 'failed', attempts: [{ status: 'failed', failureCategory: 'json-parse', metrics: { totalMs: 800 } }, { status: 'failed', failureCategory: 'json-parse', metrics: { totalMs: 1200 } }] }
  ]

  const summary = summarizeCases(cases)
  assert.equal(summary.firstAttemptSucceeded, 1)
  assert.equal(summary.succeededAfterRetry, 1)
  assert.equal(summary.unresolvedFailures, 1)
  assert.equal(summary.jsonSchemaValidAfterRetry, 2)
  assert.equal(summary.admissibleAfterDeterministicChecks, 2)
  assert.deepEqual(summary.endToEndLatencyMs, [1000, 2000, 2000])
})

test('no-lost-notes gate requires every saved note to reach a terminal status', () => {
  const result = {
    fatalFailure: null,
    summary: {
      jsonSchemaValidAfterRetry: 2,
      warmCasesWithin15Seconds: 2
    },
    cases: [
      { originalText: 'Saved and complete.', terminalStatus: 'succeeded', attempts: [{ status: 'succeeded' }], admissibleDraft: {} },
      { originalText: 'Saved but interrupted.', terminalStatus: 'processing', attempts: [{ status: 'processing' }], admissibleDraft: null }
    ]
  }

  assert.equal(buildGates(result, 2).noLostNotes, false)
})
