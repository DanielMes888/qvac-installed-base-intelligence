import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { freemem, tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { WHISPER_TINY_Q8_0, close, getLoadedModelInfo, loadModel, transcribe, unloadModel } from '@qvac/sdk'

const require = createRequire(import.meta.url)
const { installNetworkDeny } = require('../ocr/network-boundaries.cjs')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const fixturePath = path.join(root, 'test', 'fixtures', 'transcription', 'spanish-medical-equipment.wav')
const manifest = JSON.parse(await readFile(path.join(root, 'test', 'fixtures', 'transcription', 'manifest.json'), 'utf8'))
const resultPath = path.join(root, 'results', 'feasibility', 'transcription-local-feasibility.json')
const previousResult = await readFile(resultPath, 'utf8').then(JSON.parse).catch(() => null)
const workspacePath = path.join(root, 'data', 'prototype', 'seed.json')
const workspaceBefore = sha256(await readFile(workspacePath))
const taskDirectory = await mkdtemp(path.join(tmpdir(), 'transcription-feasibility-'))
const taskAudioPath = path.join(taskDirectory, 'synthetic-audio.wav')
const networkAttempts = []
let restoreNetwork = () => {}
let modelId
let modelUnloaded = false
let temporaryFilesRemoved = false
const startedAt = new Date().toISOString()
const runs = []
const memoryBefore = { rssBytes: process.memoryUsage().rss, systemFreeBytes: freemem() }
let loadMs = null
let modelInfo = null
let memoryAfterRuns = null

try {
  await copyFile(fixturePath, taskAudioPath)
  const loadStarted = performance.now()
  modelId = await loadModel({
    modelSrc: WHISPER_TINY_Q8_0,
    modelConfig: { language: 'es', temperature: 0, no_context: true, print_progress: false }
  })
  loadMs = performance.now() - loadStarted
  modelInfo = await getLoadedModelInfo({ modelId })
  restoreNetwork = installNetworkDeny({ attempts: networkAttempts })
  for (let index = 0; index < 2; index += 1) {
    const runStarted = performance.now()
    const text = String(await transcribe({ modelId, audioChunk: taskAudioPath })).trim()
    runs.push({ index: index + 1, realTranscription: true, elapsedMs: performance.now() - runStarted, text })
  }
  memoryAfterRuns = { rssBytes: process.memoryUsage().rss, systemFreeBytes: freemem() }
} finally {
  restoreNetwork()
  if (modelId) {
    await unloadModel({ modelId, clearStorage: false }).catch(() => {})
    modelUnloaded = true
  }
  await close().catch(() => {})
  await rm(taskDirectory, { recursive: true, force: true })
  temporaryFilesRemoved = true
}

const recognizedTokens = normalize(runs[0]?.text ?? '')
const matchedTokens = manifest.requiredTokens.filter((token) => recognizedTokens.includes(normalize(token)))
const result = {
  schemaVersion: 'local-transcription-feasibility-v1',
  startedAt,
  completedAt: new Date().toISOString(),
  synthetic: true,
  outcome: runs.length === 2 && runs.every(({ text }) => text.length > 0) && matchedTokens.length >= 3 && networkAttempts.length === 0
    ? 'local transcription feasibility passed'
    : 'local transcription feasibility failed',
  engine: {
    sdk: '@qvac/sdk 0.19.0', model: 'WHISPER_TINY_Q8_0', modelType: 'whispercpp-transcription',
    quantization: 'q8_0', expectedModelBytes: WHISPER_TINY_Q8_0.expectedSize,
    sha256: WHISPER_TINY_Q8_0.sha256Checksum, sourceRevision: 'ggerganov/whisper.cpp@5359861c739e955e79d9a303bcbc70fb988958b1',
    license: 'MIT', language: 'es', loadMs, loadCount: 1,
    loadedInfo: { backendDevice: modelInfo?.backendDevice ?? null, backendName: modelInfo?.backendName ?? null }
  },
  preparation: {
    firstObservedDownloadAndLoadMs: previousResult?.preparation?.firstObservedDownloadAndLoadMs ?? previousResult?.engine?.loadMs ?? loadMs,
    currentCachedLoadMs: loadMs,
    modelCacheRetained: true
  },
  fixture: { id: manifest.id, bytes: (await stat(fixturePath)).size, durationSeconds: manifest.durationSeconds, sha256: sha256(await readFile(fixturePath)) },
  runs,
  reuse: { loadCount: 1, sameModelId: true, secondRunUsedLoadedModel: true },
  quality: { matchedTokens, requiredTokens: manifest.requiredTokens, tokenRecall: matchedTokens.length / manifest.requiredTokens.length, editableForDemo: matchedTokens.length >= 3 },
  memory: { before: memoryBefore, afterRuns: memoryAfterRuns, afterCleanup: { rssBytes: process.memoryUsage().rss, systemFreeBytes: freemem() }, note: 'Approximate process RSS and system free-memory samples; not isolated model allocation.' },
  networkBoundary: { kind: 'instrumented Node boundaries, not an operating-system audit', observedAttemptCount: networkAttempts.length, attempts: networkAttempts },
  cleanup: { temporaryFilesRemoved, modelUnloaded },
  workspace: { path: 'data/prototype/seed.json', unchanged: workspaceBefore === sha256(await readFile(workspacePath)) },
  limitations: ['Synthetic SAPI voice only; microphone variability is not measured by this feasibility run.', 'Tiny multilingual Whisper can omit accents or proper-name spelling; user review remains mandatory.', 'Instrumented network boundaries are not a complete operating-system audit.']
}

await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result))
if (result.outcome !== 'local transcription feasibility passed') process.exitCode = 1

function sha256(value) { return createHash('sha256').update(value).digest('hex') }
function normalize(value) { return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() }
