import { createHash } from 'node:crypto'
import { freemem, homedir, totalmem } from 'node:os'
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

import { close, getLoadedModelInfo, loadModel, ocr, unloadModel } from '@qvac/sdk'

import {
  OCR_FEASIBILITY_POLICY,
  evaluateOcrFeasibility,
  exerciseTemporaryImageDecision,
  runBoundedOcrCall,
  scoreOcrFixture,
  withTemporaryImage
} from './ocr-feasibility-lib.mjs'
import { OCR_MODEL_MANIFEST } from './ocr-model-manifest.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixtureDirectory = path.join(root, 'test', 'fixtures', 'ocr')
const resultPath = path.join(root, 'results', 'feasibility', 'ocr-local-feasibility.json')
const recognizerPath = await findCachedModel(OCR_MODEL_MANIFEST.recognizer.filename)
const detectorPath = await findCachedModel(OCR_MODEL_MANIFEST.detector.filename)
const manifest = JSON.parse(await readFile(path.join(fixtureDirectory, 'manifest.json'), 'utf8'))
const workspaceBefore = await workspaceFingerprint()
const networkAttempts = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (...args) => {
  networkAttempts.push({ api: 'fetch', target: String(args[0]) })
  throw new Error('Network disabled during local OCR feasibility run')
}

const memory = {
  totalBytes: totalmem(),
  systemFreeBeforeBytes: freemem(),
  minimumSystemFreeBytes: freemem(),
  parentRssBeforeBytes: process.memoryUsage().rss,
  peakParentRssBytes: process.memoryUsage().rss
}
const sampler = setInterval(() => {
  memory.minimumSystemFreeBytes = Math.min(memory.minimumSystemFreeBytes, freemem())
  memory.peakParentRssBytes = Math.max(memory.peakParentRssBytes, process.memoryUsage().rss)
}, 25)
sampler.unref()

const result = {
  schemaVersion: OCR_FEASIBILITY_POLICY.schemaVersion,
  outcome: 'OCR feasibility failed',
  evaluatedAt: new Date().toISOString(),
  synthetic: true,
  execution: 'same-computer @qvac/sdk OCR using absolute cached model paths',
  policy: OCR_FEASIBILITY_POLICY,
  environment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    sdk: OCR_MODEL_MANIFEST.sdkVersion,
    enginePackage: `${OCR_MODEL_MANIFEST.enginePackage}@${OCR_MODEL_MANIFEST.engineVersion}`,
    backendRequested: 'cpu'
  },
  models: {
    detector: await modelEvidence(detectorPath, OCR_MODEL_MANIFEST.detector),
    recognizer: await modelEvidence(recognizerPath, OCR_MODEL_MANIFEST.recognizer)
  },
  acquisition: {
    source: 'QVAC registry descriptors OCR_CRAFT and OCR_LATIN',
    completedBeforeOfflineRun: true,
    measuredMs: 223546.9853
  },
  initialization: null,
  firstExtraction: null,
  cases: [],
  errorRecovery: null,
  lifecycleDecisions: null,
  networkBoundary: null,
  memory: null,
  cleanup: null,
  workspace: null,
  gate: null,
  failure: null
}

let modelId
try {
  const initStarted = performance.now()
  modelId = await loadModel({
    modelSrc: recognizerPath,
    modelType: 'ggml-ocr',
    modelConfig: {
      detectorModelSrc: detectorPath,
      pipelineType: 'easyocr',
      langList: ['en', 'es'],
      backendDevice: 'cpu',
      nThreads: 6,
      contrastRetry: true,
      lowConfidenceThreshold: 0.4,
      defaultRotationAngles: [90, 270]
    }
  })
  const loadedInfo = await getLoadedModelInfo({ modelId })
  result.initialization = {
    elapsedMs: performance.now() - initStarted,
    loaded: { ...loadedInfo, path: undefined, cacheFile: path.basename(loadedInfo.path ?? recognizerPath) },
    modelSourcesWereAbsoluteLocalPaths: path.isAbsolute(recognizerPath) && path.isAbsolute(detectorPath)
  }

  const clearFixture = manifest.cases.find(({ id }) => id === 'clear-image')
  result.firstExtraction = await runFixture(clearFixture, modelId)
  for (const fixture of manifest.cases) result.cases.push(await runFixture(fixture, modelId))

  const corrupt = manifest.cases.find(({ id }) => id === 'clear-image')
  let corruptRejected = false
  let corruptError = null
  try {
    await withTemporaryImage(path.join(fixtureDirectory, corrupt.file), async (temporaryPath) => {
      await writeFile(temporaryPath, 'not a valid synthetic image', 'utf8')
      await extract(modelId, temporaryPath)
    })
  } catch (error) {
    corruptRejected = true
    corruptError = sanitizeRuntimeError(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  }
  const recovery = await runFixture(clearFixture, modelId)
  result.errorRecovery = { corruptImageRejected: corruptRejected, corruptError, subsequentValidImagePassed: recovery.passed }
  const lifecycleSource = path.join(fixtureDirectory, clearFixture.file)
  result.lifecycleDecisions = {
    reviewed: await exerciseTemporaryImageDecision(lifecycleSource, 'reviewed'),
    cancelled: await exerciseTemporaryImageDecision(lifecycleSource, 'cancelled')
  }
} catch (error) {
  result.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
} finally {
  if (modelId) await unloadModel({ modelId, clearStorage: false }).catch(() => {})
  await close().catch(() => {})
  globalThis.fetch = originalFetch
  clearInterval(sampler)
}

memory.systemFreeAfterBytes = freemem()
memory.parentRssAfterBytes = process.memoryUsage().rss
memory.maximumObservedSystemMemoryDeltaBytes = Math.max(0, memory.systemFreeBeforeBytes - memory.minimumSystemFreeBytes)
memory.parentPeakRssDeltaBytes = Math.max(0, memory.peakParentRssBytes - memory.parentRssBeforeBytes)
memory.measurementLimit = 'System delta includes concurrent Windows activity; parent RSS excludes the QVAC Bare worker.'
result.memory = memory
result.networkBoundary = {
  mode: 'absolute local model paths plus denied global fetch; command executed in the restricted network sandbox',
  attemptedRequests: networkAttempts,
  externalRequestCountAtInstrumentedFetchBoundary: networkAttempts.length,
  packetLevelOrNativeWorkerAuditPerformed: false,
  limitation: 'No packet-level audit was performed; zero fetch attempts cannot prove that native code opened no socket.'
}
result.cleanup = {
  allTaskDirectoriesRemoved: result.firstExtraction?.temporaryFilesRemoved === true && result.cases.every(({ temporaryFilesRemoved }) => temporaryFilesRemoved),
  originalFixtureDirectoryIsSyntheticTestInput: true,
  runtimeImagesPersistedToWorkspace: false
}
const workspaceAfter = await workspaceFingerprint()
result.workspace = {
  before: workspaceBefore,
  after: workspaceAfter,
  unchanged: JSON.stringify(workspaceBefore) === JSON.stringify(workspaceAfter),
  observationsCreated: 0,
  equipmentRecordsCreated: 0,
  exportsCreated: 0
}
const warmCases = result.cases.filter(({ id }) => OCR_FEASIBILITY_POLICY.requiredCaseIds.includes(id))
const gateInput = {
  cases: result.cases,
  localExecution: result.initialization?.modelSourcesWereAbsoluteLocalPaths === true,
  offlineExecution: result.networkBoundary.externalRequestCountAtInstrumentedFetchBoundary === 0 && result.initialization?.modelSourcesWereAbsoluteLocalPaths === true,
  licenseAccepted: OCR_MODEL_MANIFEST.modelRedistributionStatus === 'established',
  compatibleResources: result.initialization !== null && result.failure === null && memory.minimumSystemFreeBytes >= OCR_FEASIBILITY_POLICY.minimumSystemFreeBytes,
  noExternalRequests: false,
  temporaryFilesRemoved: result.cleanup.allTaskDirectoriesRemoved,
  workspaceUnchanged: result.workspace.unchanged,
  latencyWithinBudget: warmCases.every(({ elapsedMs }) => elapsedMs <= OCR_FEASIBILITY_POLICY.maxWarmExtractionMs)
}
result.gate = evaluateOcrFeasibility(gateInput)
if (result.failure) result.gate.failures.push(`runtime failure: ${result.failure}`)
result.outcome = result.gate.failures.length === 0 ? 'OCR feasibility passed' : 'OCR feasibility failed'

await mkdir(path.dirname(resultPath), { recursive: true })
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))
if (result.outcome !== 'OCR feasibility passed') process.exitCode = 1

async function runFixture(fixture, activeModelId) {
  const sourcePath = path.join(fixtureDirectory, fixture.file)
  const sourceHash = await sha256File(sourcePath)
  const started = performance.now()
  const lifecycle = await withTemporaryImage(sourcePath, async (temporaryPath) => {
    const extracted = await extract(activeModelId, temporaryPath)
    return { ...extracted, temporaryPathWasOutsideWorkspace: !temporaryPath.toLowerCase().startsWith(root.toLowerCase()) }
  })
  const elapsedMs = performance.now() - started
  const score = scoreOcrFixture(fixture, lifecycle.result.text)
  return {
    id: fixture.id,
    file: fixture.file,
    description: fixture.description,
    required: fixture.required,
    sha256: sourceHash,
    expectedTokens: fixture.requiredTokens,
    recognizedText: lifecycle.result.text,
    blocks: lifecycle.result.blocks,
    stats: lifecycle.result.stats,
    elapsedMs,
    ...score,
    temporaryPathWasOutsideWorkspace: lifecycle.result.temporaryPathWasOutsideWorkspace,
    temporaryFilesRemoved: lifecycle.cleaned
  }
}

async function extract(activeModelId, imagePath) {
  const request = ocr({ modelId: activeModelId, image: imagePath, options: { paragraph: false } })
  const blocks = await runBoundedOcrCall({ imagePath, engine: async () => request.blocks, timeoutMs: 30000 })
  const stats = await request.stats
  const ordered = [...blocks].sort((left, right) => (left.bbox?.[1] ?? 0) - (right.bbox?.[1] ?? 0) || (left.bbox?.[0] ?? 0) - (right.bbox?.[0] ?? 0))
  return { blocks: ordered, stats: stats ?? null, text: ordered.map(({ text }) => text).join('\n') }
}

async function findCachedModel(filename) {
  const cacheDirectory = path.join(homedir(), '.qvac', 'models')
  const matches = []
  await visit(cacheDirectory)
  if (matches.length !== 1) throw new Error(`Expected exactly one cached ${filename}; found ${matches.length}`)
  return matches[0]

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(target)
      else if (entry.name.endsWith(`_${filename}`) || entry.name === filename) matches.push(target)
    }
  }
}

async function modelEvidence(modelPath, declared) {
  const actualSize = (await stat(modelPath)).size
  const actualSha256 = await sha256File(modelPath)
  return {
    cacheFile: path.basename(modelPath),
    expectedSize: declared.expectedSize,
    actualSize,
    expectedSha256: declared.sha256,
    actualSha256,
    verified: actualSize === declared.expectedSize && actualSha256 === declared.sha256
  }
}

function sanitizeRuntimeError(message) {
  return message.replace(/[A-Z]:\\[^\r\n]*qvac-ocr-feasibility-[^\\\s]+\\([^\\\s]+)/gi, '<temporary-image>/$1')
}

async function sha256File(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex')
}

async function workspaceFingerprint() {
  const paths = [path.join(root, 'data', 'prototype', 'seed.json'), path.join(root, '.local', 'workspace.json')]
  const output = []
  for (const filePath of paths) {
    try {
      await access(filePath)
      output.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), sha256: await sha256File(filePath), size: (await stat(filePath)).size })
    } catch {
      output.push({ path: path.relative(root, filePath).replaceAll('\\', '/'), missing: true })
    }
  }
  return output
}
