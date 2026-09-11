import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { OCR_FEASIBILITY_POLICY } from '../../scripts/feasibility/ocr/ocr-feasibility-lib.mjs'
import {
  TESSERACT_FEASIBILITY_MANIFEST,
  assertLocalTesseractRuntime,
  captureOcrFixtureOutcome,
  median
} from '../../scripts/feasibility/ocr/tesseract-feasibility-lib.mjs'

test('Tesseract.js v2 preserves the frozen Ticket 05 thresholds and fixtures', () => {
  assert.equal(OCR_FEASIBILITY_POLICY.minimumTokenRecall, 0.8)
  assert.equal(OCR_FEASIBILITY_POLICY.maxWarmExtractionMs, 5000)
  assert.deepEqual(TESSERACT_FEASIBILITY_MANIFEST.requiredCaseIds, OCR_FEASIBILITY_POLICY.requiredCaseIds)
  assert.deepEqual(TESSERACT_FEASIBILITY_MANIFEST.diagnosticCaseIds, OCR_FEASIBILITY_POLICY.diagnosticCaseIds)
})

test('Tesseract.js and both language artifacts are exact, separately licensed and immutable', () => {
  assert.equal(TESSERACT_FEASIBILITY_MANIFEST.package.version, '7.0.0')
  assert.equal(TESSERACT_FEASIBILITY_MANIFEST.package.license, 'Apache-2.0')
  assert.match(TESSERACT_FEASIBILITY_MANIFEST.package.installedTreeSha256, /^[a-f0-9]{64}$/)
  assert.equal(TESSERACT_FEASIBILITY_MANIFEST.core.version, '7.0.0')
  assert.equal(TESSERACT_FEASIBILITY_MANIFEST.core.license, 'Apache-2.0')
  assert.match(TESSERACT_FEASIBILITY_MANIFEST.core.installedTreeSha256, /^[a-f0-9]{64}$/)
  assert.match(TESSERACT_FEASIBILITY_MANIFEST.tessdata.revision, /^[a-f0-9]{40}$/)
  assert.equal(TESSERACT_FEASIBILITY_MANIFEST.tessdata.license, 'Apache-2.0')
  assert.deepEqual(Object.keys(TESSERACT_FEASIBILITY_MANIFEST.tessdata.languages), ['eng', 'spa'])
  for (const artifact of Object.values(TESSERACT_FEASIBILITY_MANIFEST.tessdata.languages)) {
    assert.match(artifact.source, new RegExp(`/tessdata_fast/${TESSERACT_FEASIBILITY_MANIFEST.tessdata.revision}/`))
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/)
    assert.ok(artifact.bytes > 0)
  }
  for (const artifact of Object.values(TESSERACT_FEASIBILITY_MANIFEST.runtimeFiles)) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/)
    assert.ok(artifact.bytes > 0)
  }
})

test('local runtime validation rejects URLs and resources outside the declared local roots', () => {
  const local = {
    workerPath: 'C:\\repo\\scripts\\feasibility\\ocr\\tesseract-offline-worker.cjs',
    corePath: 'C:\\repo\\node_modules\\tesseract.js-core',
    langPath: 'C:\\repo\\.local\\feasibility\\ocr\\tesseract-v2\\models'
  }
  assert.deepEqual(assertLocalTesseractRuntime(local, ['C:\\repo', 'C:\\repo\\.local']), local)
  assert.throws(() => assertLocalTesseractRuntime({ ...local, langPath: 'https://example.test/models' }, ['C:\\repo']), /local/i)
  assert.throws(() => assertLocalTesseractRuntime({ ...local, corePath: 'D:\\outside' }, ['C:\\repo']), /approved root/i)
})

test('median is deterministic for odd and even warm samples', () => {
  assert.equal(median([4, 1, 3]), 3)
  assert.equal(median([8, 2, 4, 6]), 5)
  assert.throws(() => median([]), /sample/i)
})

test('a fixture engine failure becomes a timed case row instead of aborting later cases', async () => {
  const ticks = [10, 25]
  const result = await captureOcrFixtureOutcome({ id: 'synthetic-failure' }, async () => {
    const error = new Error('synthetic engine failure')
    error.temporaryFilesRemoved = true
    throw error
  }, () => ticks.shift())
  assert.equal(result.recognizedText, '')
  assert.equal(result.elapsedMs, 15)
  assert.match(result.error, /synthetic engine failure/)
  assert.equal(result.temporaryFilesRemoved, true)
})

test('offline worker blocks fetch plus HTTP, socket, TLS and DNS boundaries before loading Tesseract', async () => {
  const source = await readFile(new URL('../../scripts/feasibility/ocr/network-boundaries.cjs', import.meta.url), 'utf8')
  for (const boundary of ["['globalThis', 'fetch']", "[http, 'request']", "[https, 'request']", "[net, 'connect']", "[tls, 'connect']", "[dns, 'lookup']"]) {
    assert.ok(source.includes(boundary), `missing network boundary ${boundary}`)
  }
  assert.match(source, /catch \(error\) \{\s*restoreNetworkBoundaries\(originals\)/)
  const worker = await readFile(new URL('../../scripts/feasibility/ocr/tesseract-offline-worker.cjs', import.meta.url), 'utf8')
  assert.match(worker, /network-boundaries\.cjs/)
  assert.match(worker, /worker-script[\\/]node[\\/]index\.js/)
})

test('v2 harness records the frozen token contract without requiring unfrozen fixture text', async () => {
  const source = await readFile(new URL('../../scripts/feasibility/ocr/run-tesseract-ocr-feasibility.mjs', import.meta.url), 'utf8')
  assert.match(source, /expectedTextContract: fixture\.requiredTokens\.join/)
  assert.doesNotMatch(source, /fixture\.textLines/)
  assert.match(source, /errorHandler:/)
  assert.match(source, /installedTreeSha256 === declared\.installedTreeSha256/)
  assert.match(source, /Tesseract setup and bounded cleanup both failed/)
})

test('machine-readable history preserves QVAC failure and records the final Tesseract.js pass', async () => {
  const qvac = JSON.parse(await readFile(new URL('../../results/feasibility/ocr-local-feasibility.json', import.meta.url), 'utf8'))
  const harnessError = JSON.parse(await readFile(new URL('../../results/feasibility/ocr-tesseractjs-feasibility-v2-harness-error.json', import.meta.url), 'utf8'))
  const tesseract = JSON.parse(await readFile(new URL('../../results/feasibility/ocr-tesseractjs-feasibility-v2.json', import.meta.url), 'utf8'))
  assert.equal(qvac.outcome, 'OCR feasibility failed')
  assert.match(harnessError.failure, /reading 'join'/)
  assert.equal(tesseract.outcome, 'OCR feasibility passed via Tesseract.js')
  assert.deepEqual(tesseract.gate.failures, [])
  assert.equal(tesseract.cases.filter(({ required }) => required).length, OCR_FEASIBILITY_POLICY.requiredCaseIds.length)
  assert.ok(tesseract.cases.filter(({ required }) => required).every(({ tokenRecall, elapsedMs }) => tokenRecall >= 0.8 && elapsedMs <= 5000))
  assert.equal(tesseract.cases.find(({ id }) => id === 'deliberately-difficult').tokenRecall, 0.6)
  assert.equal(tesseract.networkBoundary.observedAttemptCount, 0)
  assert.equal(tesseract.cleanup.workerTerminated, true)
  assert.equal(tesseract.cleanup.harnessTaskDirectoryRemoved, true)
  assert.equal(tesseract.workspace.unchanged, true)
})
