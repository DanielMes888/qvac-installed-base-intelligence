import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { freemem, tmpdir, totalmem } from 'node:os'
import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

import Tesseract from 'tesseract.js'

import {
  OCR_FEASIBILITY_POLICY,
  evaluateOcrFeasibility,
  exerciseTemporaryImageDecision,
  scoreOcrFixture,
  withTemporaryImage
} from './ocr-feasibility-lib.mjs'
import {
  TESSERACT_FEASIBILITY_MANIFEST,
  assertLocalTesseractRuntime,
  captureOcrFixtureOutcome,
  median
} from './tesseract-feasibility-lib.mjs'

const require = createRequire(import.meta.url)
const { installNetworkDeny } = require('./network-boundaries.cjs')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixtureDirectory = path.join(root, 'test', 'fixtures', 'ocr')
const resultPath = path.join(root, 'results', 'feasibility', 'ocr-tesseractjs-feasibility-v2.json')
const taskDirectory = await mkdtemp(path.join(tmpdir(), 'tesseract-ocr-v2-'))
const auditPath = path.join(taskDirectory, 'network-audit.jsonl')
const previousAuditPath = process.env.TESSERACT_OCR_NETWORK_AUDIT
process.env.TESSERACT_OCR_NETWORK_AUDIT = auditPath

let packageDirectory
let coreDirectory
let workerPath
let langPath
let runtime
let manifest
let workspaceBefore
const parentNetworkAttempts = []
let restoreParentNetwork = () => {}
try {
  const packagePath = require.resolve('tesseract.js/package.json')
  const corePackagePath = require.resolve('tesseract.js-core/package.json')
  packageDirectory = path.dirname(packagePath)
  coreDirectory = path.dirname(corePackagePath)
  workerPath = path.join(root, 'scripts', 'feasibility', 'ocr', 'tesseract-offline-worker.cjs')
  langPath = path.join(root, '.local', 'feasibility', 'ocr', 'tesseract-v2', `tessdata_fast-${TESSERACT_FEASIBILITY_MANIFEST.tessdata.revision}`)
  runtime = assertLocalTesseractRuntime({ workerPath, corePath: coreDirectory, langPath }, [root])
  manifest = JSON.parse(await readFile(path.join(fixtureDirectory, 'manifest.json'), 'utf8'))
  workspaceBefore = await workspaceFingerprint()
  restoreParentNetwork = installNetworkDeny({ attempts: parentNetworkAttempts })
} catch (setupError) {
  try {
    restoreParentNetwork()
    assertTaskDirectory(taskDirectory)
    await rm(taskDirectory, { recursive: true, force: true })
  } catch (cleanupError) {
    throw new AggregateError([setupError, cleanupError], 'Tesseract setup and bounded cleanup both failed')
  } finally {
    if (previousAuditPath === undefined) delete process.env.TESSERACT_OCR_NETWORK_AUDIT
    else process.env.TESSERACT_OCR_NETWORK_AUDIT = previousAuditPath
  }
  throw setupError
}
const phaseEvents = []

const memory = {
  totalBytes: totalmem(),
  systemFreeBeforeBytes: freemem(),
  minimumSystemFreeBytes: freemem(),
  processRssBeforeBytes: process.memoryUsage().rss,
  peakProcessRssBytes: process.memoryUsage().rss
}
const sampler = setInterval(() => {
  memory.minimumSystemFreeBytes = Math.min(memory.minimumSystemFreeBytes, freemem())
  memory.peakProcessRssBytes = Math.max(memory.peakProcessRssBytes, process.memoryUsage().rss)
}, 20)
sampler.unref()

const result = {
  schemaVersion: TESSERACT_FEASIBILITY_MANIFEST.schemaVersion,
  outcome: 'OCR feasibility failed after QVAC OCR and Tesseract.js',
  evaluatedAt: new Date().toISOString(),
  synthetic: true,
  candidate: 'Tesseract.js',
  policy: OCR_FEASIBILITY_POLICY,
  environment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    package: `${TESSERACT_FEASIBILITY_MANIFEST.package.name}@${TESSERACT_FEASIBILITY_MANIFEST.package.version}`,
    core: `${TESSERACT_FEASIBILITY_MANIFEST.core.name}@${TESSERACT_FEASIBILITY_MANIFEST.core.version}`,
    workerReuse: 'one worker for first extraction, all warm fixtures, error recovery, then explicit termination'
  },
  licenses: {
    package: TESSERACT_FEASIBILITY_MANIFEST.package.license,
    core: TESSERACT_FEASIBILITY_MANIFEST.core.license,
    traineddata: TESSERACT_FEASIBILITY_MANIFEST.tessdata.license,
    traineddataLicenseSource: TESSERACT_FEASIBILITY_MANIFEST.tessdata.licenseSource,
    compatibleForExperimentAndRedistributionWithApacheNotice: true
  },
  artifacts: null,
  runtimePaths: {
    worker: relativeOrBasename(runtime.workerPath),
    core: relativeOrBasename(runtime.corePath),
    languages: relativeOrBasename(runtime.langPath),
    allAbsoluteAndLocal: true,
    automaticDownloadsDisabled: true,
    gzip: false,
    cacheMethod: 'none'
  },
  initialization: null,
  firstExtraction: null,
  warm: null,
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

let worker
let workerTerminated = false
try {
  result.artifacts = await artifactEvidence(packageDirectory, coreDirectory, workerPath, langPath)
  const createStarted = performance.now()
  worker = await Tesseract.createWorker(['eng', 'spa'], Tesseract.OEM.LSTM_ONLY, {
    workerPath: runtime.workerPath,
    corePath: runtime.corePath,
    langPath: runtime.langPath,
    cachePath: taskDirectory,
    cacheMethod: 'none',
    gzip: false,
    logger: (event) => phaseEvents.push({ ...event, elapsedMs: performance.now() - createStarted }),
    errorHandler: (error) => phaseEvents.push({ status: 'worker error', error: sanitizeRuntimeError(String(error)), elapsedMs: performance.now() - createStarted })
  })
  result.initialization = {
    totalWorkerAndLanguageMs: performance.now() - createStarted,
    phases: summarizePhases(phaseEvents),
    languages: ['eng', 'spa'],
    generalPreprocessing: 'none; identical OCR settings for every frozen fixture'
  }

  const clearFixture = manifest.cases.find(({ id }) => id === 'clear-image')
  result.firstExtraction = await runFixture(clearFixture)
  for (const fixture of manifest.cases) result.cases.push(await runFixture(fixture))

  let corruptRejected = false
  let corruptError = null
  try {
    await withTemporaryImage(path.join(fixtureDirectory, clearFixture.file), async (temporaryPath) => {
      await writeFile(temporaryPath, 'not a valid synthetic image', 'utf8')
      await recognize(temporaryPath)
    })
  } catch (error) {
    corruptRejected = true
    corruptError = sanitizeRuntimeError(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
  }
  const recovery = await runFixture(clearFixture)
  result.errorRecovery = { corruptImageRejected: corruptRejected, corruptError, subsequentValidImagePassed: recovery.passed }
  result.lifecycleDecisions = {
    reviewed: await exerciseTemporaryImageDecision(path.join(fixtureDirectory, clearFixture.file), 'reviewed'),
    cancelled: await exerciseTemporaryImageDecision(path.join(fixtureDirectory, clearFixture.file), 'cancelled')
  }
} catch (error) {
  result.failure = sanitizeRuntimeError(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
} finally {
  if (worker) {
    await worker.terminate().then(() => { workerTerminated = true }).catch((error) => {
      result.failure ??= `Worker termination failed: ${String(error)}`
    })
  }
  restoreParentNetwork()
  clearInterval(sampler)
}

let warmRequired = []
try {
  const workerNetworkAttempts = await readAuditEvents(auditPath)
  memory.systemFreeAfterBytes = freemem()
  memory.processRssAfterBytes = process.memoryUsage().rss
  memory.maximumObservedSystemMemoryDeltaBytes = Math.max(0, memory.systemFreeBeforeBytes - memory.minimumSystemFreeBytes)
  memory.processPeakRssDeltaBytes = Math.max(0, memory.peakProcessRssBytes - memory.processRssBeforeBytes)
  memory.measurementLimit = 'System free memory includes concurrent Windows activity; process RSS covers the Node process and its worker thread but is not a WASM-only measurement.'
  result.memory = memory
  result.networkBoundary = {
    mode: 'absolute local worker/core/traineddata paths with fetch, HTTP(S), net, TLS and DNS denied in parent and OCR worker',
    parentAttempts: parentNetworkAttempts,
    workerAttempts: workerNetworkAttempts,
    observedAttemptCount: parentNetworkAttempts.length + workerNetworkAttempts.length,
    instrumentedBoundaries: ['fetch', 'http.request/get', 'https.request/get', 'net.connect/createConnection', 'tls.connect', 'dns.lookup/resolve/resolve4/resolve6'],
    packetLevelAuditPerformed: false,
    limitation: 'Zero instrumented attempts is not a packet capture or proof about uninstrumented native operating-system activity.'
  }
  warmRequired = result.cases.filter(({ id }) => OCR_FEASIBILITY_POLICY.requiredCaseIds.includes(id))
  const warmTimes = warmRequired.map(({ elapsedMs }) => elapsedMs)
  result.warm = warmTimes.length > 0 ? {
    requiredCaseCount: warmTimes.length,
    minimumMs: Math.min(...warmTimes),
    maximumMs: Math.max(...warmTimes),
    medianMs: median(warmTimes)
  } : null
  result.cleanup = {
    workerTerminated,
    allImageTaskDirectoriesRemoved: result.firstExtraction?.temporaryFilesRemoved === true && result.cases.every(({ temporaryFilesRemoved }) => temporaryFilesRemoved),
    harnessTaskDirectoryRemoved: false,
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
} catch (error) {
  result.failure ??= `Post-run evidence failed: ${sanitizeRuntimeError(String(error))}`
} finally {
  result.cleanup ??= { workerTerminated, allImageTaskDirectoriesRemoved: false, harnessTaskDirectoryRemoved: false, runtimeImagesPersistedToWorkspace: false }
  try {
    assertTaskDirectory(taskDirectory)
    await rm(taskDirectory, { recursive: true, force: true })
    result.cleanup.harnessTaskDirectoryRemoved = !(await exists(taskDirectory))
  } catch (error) {
    result.failure ??= `Harness cleanup failed: ${sanitizeRuntimeError(String(error))}`
  } finally {
    if (previousAuditPath === undefined) delete process.env.TESSERACT_OCR_NETWORK_AUDIT
    else process.env.TESSERACT_OCR_NETWORK_AUDIT = previousAuditPath
  }
}

const gate = evaluateOcrFeasibility({
  cases: result.cases,
  localExecution: result.runtimePaths.allAbsoluteAndLocal && result.artifacts?.allVerified === true,
  offlineExecution: result.networkBoundary?.observedAttemptCount === 0 && result.runtimePaths.automaticDownloadsDisabled,
  licenseAccepted: result.licenses.compatibleForExperimentAndRedistributionWithApacheNotice,
  compatibleResources: result.initialization !== null && result.failure === null && memory.minimumSystemFreeBytes >= OCR_FEASIBILITY_POLICY.minimumSystemFreeBytes,
  noExternalRequests: result.networkBoundary?.observedAttemptCount === 0,
  temporaryFilesRemoved: result.cleanup.workerTerminated && result.cleanup.allImageTaskDirectoriesRemoved && result.cleanup.harnessTaskDirectoryRemoved,
  workspaceUnchanged: result.workspace?.unchanged === true,
  latencyWithinBudget: warmRequired.length === OCR_FEASIBILITY_POLICY.requiredCaseIds.length && warmRequired.every(({ elapsedMs }) => elapsedMs <= OCR_FEASIBILITY_POLICY.maxWarmExtractionMs)
})
if (result.failure) gate.failures.push(`runtime failure: ${result.failure}`)
result.gate = { ...gate, outcome: gate.failures.length === 0 ? 'OCR feasibility passed via Tesseract.js' : 'OCR feasibility failed after QVAC OCR and Tesseract.js' }
result.outcome = result.gate.outcome

await mkdir(path.dirname(resultPath), { recursive: true })
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))
if (result.outcome !== 'OCR feasibility passed via Tesseract.js') process.exitCode = 1

async function runFixture(fixture) {
  const sourcePath = path.join(fixtureDirectory, fixture.file)
  const attempt = await captureOcrFixtureOutcome(fixture, async () => {
    const lifecycle = await withTemporaryImage(sourcePath, async (temporaryPath) => ({
      recognizedText: await recognize(temporaryPath),
      temporaryPathWasOutsideWorkspace: !temporaryPath.toLowerCase().startsWith(root.toLowerCase())
    }))
    return { ...lifecycle.result, temporaryFilesRemoved: lifecycle.cleaned }
  })
  const score = scoreOcrFixture(fixture, attempt.recognizedText)
  return {
    id: fixture.id,
    file: fixture.file,
    description: fixture.description,
    required: fixture.required,
    sha256: await sha256File(sourcePath),
    expectedTextContract: fixture.requiredTokens.join('\n'),
    expectedTokens: fixture.requiredTokens,
    recognizedText: attempt.recognizedText,
    elapsedMs: attempt.elapsedMs,
    ...score,
    normalization: 'NFKD, remove combining marks, uppercase, remove non-alphanumerics for token comparison only',
    error: attempt.error,
    temporaryPathWasOutsideWorkspace: attempt.temporaryPathWasOutsideWorkspace ?? null,
    temporaryFilesRemoved: attempt.temporaryFilesRemoved
  }
}

async function recognize(imagePath) {
  const { data } = await worker.recognize(imagePath)
  const text = String(data?.text ?? '').trim()
  if (!text) throw new Error('Tesseract.js returned no reviewable text')
  return text
}

function summarizePhases(events) {
  const names = ['loading tesseract core', 'initializing tesseract', 'loading language traineddata', 'initializing api']
  return names.map((status) => {
    const matching = events.filter((event) => event.status === status)
    return {
      status,
      startedMs: matching.at(0)?.elapsedMs ?? null,
      completedMs: matching.at(-1)?.elapsedMs ?? null,
      durationMs: matching.length > 1 ? matching.at(-1).elapsedMs - matching[0].elapsedMs : null
    }
  })
}

async function artifactEvidence(packageDir, coreDir, localWorkerPath, localLangPath) {
  const { relaxedSimd } = require('wasm-feature-detect')
  if (!(await relaxedSimd())) throw new Error('The reviewed relaxed-SIMD runtime variant is unavailable on this laptop')
  const relaxedWrapper = path.join(coreDir, 'tesseract-core-relaxedsimd-lstm.js')
  const relaxedWasm = path.join(coreDir, 'tesseract-core-relaxedsimd-lstm.wasm')
  const internalWorker = path.join(packageDir, 'src', 'worker-script', 'node', 'index.js')
  const networkBoundaries = path.join(path.dirname(localWorkerPath), 'network-boundaries.cjs')
  const runtimeExpected = TESSERACT_FEASIBILITY_MANIFEST.runtimeFiles
  const files = {
    offlineWorker: await fileEvidence(localWorkerPath, runtimeExpected.offlineWorker),
    networkBoundaries: await fileEvidence(networkBoundaries, runtimeExpected.networkBoundaries),
    nodeWorkerEntry: await fileEvidence(internalWorker, runtimeExpected.nodeWorkerEntry),
    relaxedSimdLstmWrapper: await fileEvidence(relaxedWrapper, runtimeExpected.relaxedSimdLstmWrapper),
    relaxedSimdLstmWasm: await fileEvidence(relaxedWasm, runtimeExpected.relaxedSimdLstmWasm),
    eng: await fileEvidence(path.join(localLangPath, 'eng.traineddata'), TESSERACT_FEASIBILITY_MANIFEST.tessdata.languages.eng),
    spa: await fileEvidence(path.join(localLangPath, 'spa.traineddata'), TESSERACT_FEASIBILITY_MANIFEST.tessdata.languages.spa)
  }
  const packageEvidence = await installedPackageEvidence(packageDir, TESSERACT_FEASIBILITY_MANIFEST.package)
  const coreEvidence = await installedPackageEvidence(coreDir, TESSERACT_FEASIBILITY_MANIFEST.core)
  return {
    package: packageEvidence,
    core: coreEvidence,
    selectedRuntimeVariant: 'relaxedsimd-lstm (capability probe was true on this laptop)',
    files,
    allVerified: packageEvidence.verified && coreEvidence.verified && Object.values(files).every(({ verified }) => verified)
  }
}

async function installedPackageEvidence(directory, declared) {
  const packageJson = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
  const locked = lock.packages[`node_modules/${declared.name}`]
  const installedBytes = await directorySize(directory)
  const installedTreeSha256 = await directoryTreeHash(directory)
  return {
    ...declared,
    installedVersion: packageJson.version,
    installedLicense: packageJson.license,
    installedBytes,
    installedTreeSha256,
    lockedVersion: locked?.version ?? null,
    lockedIntegrity: locked?.integrity ?? null,
    verified: packageJson.version === declared.version && packageJson.license === declared.license && installedBytes === declared.npmUnpackedBytes && installedTreeSha256 === declared.installedTreeSha256 && locked?.version === declared.version && locked?.integrity === declared.npmIntegrity
  }
}

async function fileEvidence(filePath, expected) {
  const bytes = (await stat(filePath)).size
  const sha256 = await sha256File(filePath)
  return { file: path.basename(filePath), bytes, sha256, verified: expected ? bytes === expected.bytes && sha256 === expected.sha256 : true }
}

async function directorySize(directory) {
  let bytes = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    bytes += entry.isDirectory() ? await directorySize(target) : (await stat(target)).size
  }
  return bytes
}

async function directoryTreeHash(directory) {
  const hash = createHash('sha256')
  await visit(directory)
  return hash.digest('hex')

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))
    for (const entry of entries) {
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) await visit(target)
      else {
        hash.update(path.relative(directory, target).replaceAll('\\', '/'))
        hash.update('\0')
        hash.update(await readFile(target))
      }
    }
  }
}

async function readAuditEvents(filePath) {
  try {
    return (await readFile(filePath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function assertTaskDirectory(directory) {
  const resolved = path.resolve(directory)
  const rootPrefix = `${path.resolve(tmpdir())}${path.sep}`.toLowerCase()
  if (!resolved.toLowerCase().startsWith(rootPrefix) || !path.basename(resolved).startsWith('tesseract-ocr-v2-')) {
    throw new Error(`Refusing cleanup outside Tesseract OCR feasibility scope: ${resolved}`)
  }
}

function relativeOrBasename(target) {
  const relative = path.relative(root, target)
  return relative.startsWith('..') ? path.basename(target) : relative.replaceAll('\\', '/')
}

function sanitizeRuntimeError(message) {
  return message.replace(/[A-Z]:\\[^\r\n]*tesseract-ocr-v2-[^\\\s]+\\([^\\\s]+)/gi, '<temporary-image>/$1')
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

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}
