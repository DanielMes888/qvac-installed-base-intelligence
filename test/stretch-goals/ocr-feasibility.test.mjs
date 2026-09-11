import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  OCR_FEASIBILITY_POLICY,
  evaluateOcrFeasibility,
  exerciseTemporaryImageDecision,
  runBoundedOcrCall,
  scoreOcrFixture,
  withTemporaryImage
} from '../../scripts/feasibility/ocr/ocr-feasibility-lib.mjs'

test('fixture scoring is deterministic and tolerant only of formatting differences', () => {
  const fixture = { id: 'clear', requiredTokens: ['NOVAMED', 'AX-700', 'SYN-2026-001'] }
  const first = scoreOcrFixture(fixture, 'novamed\nAX 700\nSYN 2026 001')
  const second = scoreOcrFixture(fixture, 'novamed\nAX 700\nSYN 2026 001')
  assert.deepEqual(first, second)
  assert.equal(first.tokenRecall, 1)
  assert.equal(first.passed, true)
  assert.deepEqual(first.missingTokens, [])
})

test('gate passes only when every required case and all safety checks pass', () => {
  const passingCases = OCR_FEASIBILITY_POLICY.requiredCaseIds.map((id) => ({ id, passed: true }))
  assert.equal(evaluateOcrFeasibility({
    cases: [...passingCases, { id: 'deliberately-difficult', passed: false }],
    localExecution: true,
    offlineExecution: true,
    licenseAccepted: true,
    compatibleResources: true,
    noExternalRequests: true,
    temporaryFilesRemoved: true,
    workspaceUnchanged: true,
    latencyWithinBudget: true
  }).outcome, 'OCR feasibility passed')

  for (const failedField of ['offlineExecution', 'licenseAccepted', 'temporaryFilesRemoved', 'workspaceUnchanged']) {
    const input = {
      cases: passingCases,
      localExecution: true,
      offlineExecution: true,
      licenseAccepted: true,
      compatibleResources: true,
      noExternalRequests: true,
      temporaryFilesRemoved: true,
      workspaceUnchanged: true,
      latencyWithinBudget: true,
      [failedField]: false
    }
    assert.equal(evaluateOcrFeasibility(input).outcome, 'OCR feasibility failed')
  }
})

test('a required fixture failure cannot be hidden by the difficult diagnostic fixture', () => {
  const cases = OCR_FEASIBILITY_POLICY.requiredCaseIds.map((id) => ({ id, passed: id !== 'small-text' }))
  cases.push({ id: 'deliberately-difficult', passed: true })
  const result = evaluateOcrFeasibility({
    cases,
    localExecution: true,
    offlineExecution: true,
    licenseAccepted: true,
    compatibleResources: true,
    noExternalRequests: true,
    temporaryFilesRemoved: true,
    workspaceUnchanged: true,
    latencyWithinBudget: true
  })
  assert.equal(result.outcome, 'OCR feasibility failed')
  assert.match(result.failures.join(' '), /small-text/)
})

test('temporary image lifecycle removes the task directory on success and failure', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qvac-ocr-lifecycle-test-'))
  const source = path.join(root, 'source.bmp')
  await writeFile(source, 'synthetic fixture', 'utf8')
  const observed = []

  const success = await withTemporaryImage(source, async (temporaryPath, taskDirectory) => {
    observed.push({ temporaryPath, taskDirectory, contents: await readFile(temporaryPath, 'utf8') })
    return 'ok'
  })
  assert.equal(success.result, 'ok')
  assert.equal(success.cleaned, true)
  await assert.rejects(access(observed[0].taskDirectory))

  let failedDirectory
  await assert.rejects(
    withTemporaryImage(source, async (_temporaryPath, taskDirectory) => {
      failedDirectory = taskDirectory
      throw new Error('synthetic OCR failure')
    }),
    /synthetic OCR failure/
  )
  await assert.rejects(access(failedDirectory))
  await rm(root, { recursive: true, force: true })
})

test('temporary image lifecycle normalizes string rejections and still reports cleanup', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qvac-ocr-string-error-test-'))
  const source = path.join(root, 'source.png')
  await writeFile(source, 'synthetic fixture', 'utf8')
  await assert.rejects(
    withTemporaryImage(source, async () => { throw 'synthetic string rejection' }),
    (error) => error instanceof Error && /synthetic string rejection/.test(error.message) && error.temporaryFilesRemoved === true
  )
  await rm(root, { recursive: true, force: true })
})

test('review and cancel decisions both discard their temporary synthetic image without persistence', async () => {
  const source = fileURLToPath(new URL('../fixtures/ocr/clear-image.png', import.meta.url))
  for (const decision of ['reviewed', 'cancelled']) {
    const result = await exerciseTemporaryImageDecision(source, decision)
    assert.deepEqual(result, {
      decision,
      temporaryImageExistedDuringDecision: true,
      imageOrTextPersisted: false,
      temporaryFilesRemoved: true
    })
  }
  await assert.rejects(exerciseTemporaryImageDecision(source, 'submitted'), /Unsupported synthetic lifecycle decision/)
})

test('policy remains bounded, offline and independent from photo capture', () => {
  assert.deepEqual(OCR_FEASIBILITY_POLICY.requiredCaseIds, [
    'clear-image',
    'small-text',
    'low-contrast',
    'slight-rotation',
    'multiple-lines',
    'alphanumeric'
  ])
  assert.equal(OCR_FEASIBILITY_POLICY.minimumTokenRecall, 0.8)
  assert.equal(OCR_FEASIBILITY_POLICY.maxWarmExtractionMs, 5000)
  assert.equal(OCR_FEASIBILITY_POLICY.minimumSystemFreeBytes, 536870912)
  assert.equal(OCR_FEASIBILITY_POLICY.persistsImages, false)
  assert.equal(OCR_FEASIBILITY_POLICY.mutatesWorkspace, false)
})

test('bounded OCR call rejects unsupported, empty, cancelled, timed-out and failed engine paths', async () => {
  const valid = { imagePath: 'synthetic.png' }
  await assert.rejects(runBoundedOcrCall({ imagePath: 'synthetic.gif', engine: async () => [] }), /Unsupported OCR feasibility image format/)
  await assert.rejects(runBoundedOcrCall({ ...valid, engine: async () => [] }), /no reviewable text/)
  await assert.rejects(runBoundedOcrCall({ ...valid, engine: async () => { throw new Error('local engine failed') } }), /local engine failed/)
  await assert.rejects(runBoundedOcrCall({ ...valid, engine: async () => new Promise(() => {}), timeoutMs: 5 }), /timeout after 5 ms/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(runBoundedOcrCall({ ...valid, engine: async () => [{ text: 'not reached' }], signal: controller.signal }), { name: 'AbortError' })
  assert.deepEqual(await runBoundedOcrCall({ ...valid, engine: async () => [{ text: 'RECOVERED' }] }), [{ text: 'RECOVERED' }])
})

test('frozen fixtures are synthetic, complete and checksum-verified', async () => {
  const directory = new URL('../fixtures/ocr/', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'))
  assert.equal(manifest.synthetic, true)
  assert.deepEqual(manifest.cases.filter(({ required }) => required).map(({ id }) => id), OCR_FEASIBILITY_POLICY.requiredCaseIds)
  assert.deepEqual(manifest.cases.filter(({ required }) => !required).map(({ id }) => id), OCR_FEASIBILITY_POLICY.diagnosticCaseIds)
  for (const fixture of manifest.cases) {
    const bytes = await readFile(new URL(fixture.file, directory))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256)
    assert.equal(fixture.requiredTokens.length >= 5, true)
  }
  const spanish = manifest.cases.find(({ id }) => id === 'multiple-lines').requiredTokens
  assert.deepEqual(spanish.filter((token) => /[^\x00-\x7F]/.test(token)), ['AÑO', 'REVISIÓN', 'PANAMÁ'])
})

test('offline harness uses SDK with local paths, denies fetch and has no Workspace mutation seam', async () => {
  const source = await readFile(new URL('../../scripts/feasibility/ocr/run-local-ocr-feasibility.mjs', import.meta.url), 'utf8')
  assert.match(source, /from '@qvac\/sdk'/)
  assert.match(source, /modelSrc: recognizerPath/)
  assert.match(source, /detectorModelSrc: detectorPath/)
  assert.match(source, /globalThis\.fetch = async/)
  assert.doesNotMatch(source, /import[^\n]*(?:OCR_LATIN|OCR_CRAFT)|WorkspaceService|createPrototypeServer/)
})

test('acquisition and offline execution share one frozen model manifest', async () => {
  const acquisition = await readFile(new URL('../../scripts/feasibility/ocr/acquire-qvac-ocr-models.mjs', import.meta.url), 'utf8')
  const offline = await readFile(new URL('../../scripts/feasibility/ocr/run-local-ocr-feasibility.mjs', import.meta.url), 'utf8')
  assert.match(acquisition, /OCR_MODEL_MANIFEST/)
  assert.match(offline, /OCR_MODEL_MANIFEST/)
  assert.doesNotMatch(offline, /83133856|15396512|74501993caf|dd1c7a436e/)
})

test('preserved machine-readable evidence reports the failed latency gate without hiding quality results', async () => {
  const evidence = JSON.parse(await readFile(new URL('../../results/feasibility/ocr-local-feasibility.json', import.meta.url), 'utf8'))
  assert.equal(evidence.outcome, 'OCR feasibility failed')
  assert.equal(evidence.gate.checks.latencyWithinBudget, false)
  assert.equal(evidence.cases.filter(({ required }) => required).every(({ passed, tokenRecall }) => passed && tokenRecall === 1), true)
  assert.equal(evidence.networkBoundary.externalRequestCountAtInstrumentedFetchBoundary, 0)
  assert.equal(evidence.networkBoundary.packetLevelOrNativeWorkerAuditPerformed, false)
  assert.equal(evidence.cleanup.allTaskDirectoriesRemoved, true)
  assert.equal(evidence.workspace.unchanged, true)
  assert.equal(evidence.errorRecovery.corruptImageRejected, true)
  assert.equal(evidence.errorRecovery.subsequentValidImagePassed, true)
})
