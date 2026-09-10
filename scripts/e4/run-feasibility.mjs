import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { close, getModelInfo, getSystemResources } from '@qvac/sdk'

import { verifyFrozenArtifacts } from './artifacts.mjs'
import {
  GENERATION_PARAMS,
  MODEL_CONFIG,
  MODEL_DESCRIPTOR,
  extractDraftClaims,
  loadExtractionModel,
  unloadExtractionModel
} from './qvac-extraction.mjs'
import { buildGates, summarizeCases } from './results-summary.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultsDirectory = path.join(root, 'results', 'feasibility')
const resultPath = path.join(resultsDirectory, 'e4-run-v1.json')
const nextPath = `${resultPath}.next`
await mkdir(resultsDirectory, { recursive: true })
await rm(nextPath, { force: true })

const frozen = await verifyFrozenArtifacts(root)
if (!frozen.valid) throw new Error(`Frozen artifacts invalid: ${frozen.errors.join('; ')}`)

const prompt = await readFile(path.join(root, 'prompts/e4-equipment-extraction-v1.txt'), 'utf8')
const schema = JSON.parse(await readFile(path.join(root, 'schemas/e4-draft-claim-set.schema.json'), 'utf8'))

const result = {
  schemaVersion: 'e4-run-v1',
  ticket: '01-prove-real-local-qvac-feasibility',
  startedAt: new Date().toISOString(),
  endedAt: null,
  execution: {
    sameComputer: true,
    cloudInference: false,
    delegatedInference: false,
    networkMode: 'restricted execution environment; cached model; no network permission requested',
    node: process.version,
    npm: '10.9.2',
    qvacSdk: '0.19.0',
    model: frozen.manifest.model,
    modelConfig: MODEL_CONFIG,
    generationParams: GENERATION_PARAMS,
    maxAttemptsPerNote: 2,
    promptPath: 'prompts/e4-equipment-extraction-v1.txt',
    schemaPath: 'schemas/e4-draft-claim-set.schema.json',
    datasetPath: 'data/feasibility/e4-notes-v1.json',
    manifestPath: 'data/feasibility/e4-manifest-v1.json'
  },
  harnessNoLostNotesDefinition: 'Before model loading or inference starts, all 20 stable note IDs and complete original texts are fully written to e4-run-v1.json.next and atomically promoted to e4-run-v1.json. A crash during replacement may leave either file; at least one contains every note. Attempts never create or replace an observation. Windows sandbox execution did not permit fsync, recorded in e4-harness-failure-01.json.',
  resourcesBefore: null,
  resourcesAfter: null,
  modelInfo: null,
  loadedModelInfo: null,
  coldLoadMs: null,
  cases: frozen.dataset.notes.map((note) => ({
    noteId: note.id,
    originalText: note.text,
    manualChecks: note.manualChecks,
    persistedBeforeInferenceAt: null,
    attempts: [],
    terminalStatus: 'not-started',
    admissibleDraft: null
  })),
  summary: null,
  gates: null,
  fatalFailure: null
}

let modelId = null
try {
  await persistResult()
  result.resourcesBefore = await getSystemResources({ sample: true })
  result.modelInfo = await getModelInfo({ name: MODEL_DESCRIPTOR.name })
  const loaded = await loadExtractionModel()
  modelId = loaded.modelId
  result.coldLoadMs = loaded.loadMs
  result.loadedModelInfo = loaded.loadedModel
  await persistResult()

  for (const note of frozen.dataset.notes) {
    const caseResult = result.cases.find((item) => item.noteId === note.id)
    caseResult.persistedBeforeInferenceAt = new Date().toISOString()
    caseResult.terminalStatus = 'processing'
    await persistResult()

    const firstAttempt = await extractDraftClaims({
      modelId,
      note: note.text,
      noteId: note.id,
      prompt,
      schema,
      attemptNumber: 1
    })
    caseResult.attempts.push(firstAttempt)
    await persistResult()

    if (firstAttempt.status === 'failed') {
      const retry = await extractDraftClaims({
        modelId,
        note: note.text,
        noteId: note.id,
        prompt,
        schema,
        attemptNumber: 2,
        priorErrorCategory: firstAttempt.failureCategory
      })
      caseResult.attempts.push(retry)
    }

    const finalAttempt = caseResult.attempts.at(-1)
    caseResult.terminalStatus = finalAttempt.status
    if (finalAttempt.status === 'succeeded') {
      caseResult.admissibleDraft = finalAttempt.parsedOutput
    }
    await persistResult()
    console.log(`${note.id}: ${caseResult.terminalStatus} after ${caseResult.attempts.length} attempt(s), ${caseResult.attempts.reduce((sum, attempt) => sum + attempt.metrics.totalMs, 0).toFixed(0)} ms`)
  }

  result.resourcesAfter = await getSystemResources({ sample: true })
} catch (error) {
  result.fatalFailure = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { name: 'UnknownError', message: String(error) }
  for (const caseResult of result.cases.filter((item) => !['succeeded', 'failed'].includes(item.terminalStatus))) {
    caseResult.terminalStatus = 'failed'
    caseResult.attempts.push({
      noteId: caseResult.noteId,
      attemptNumber: caseResult.attempts.length + 1,
      status: 'failed',
      failureCategory: 'harness-fatal',
      errors: [result.fatalFailure.message],
      rawOutput: '',
      metrics: {
        totalMs: 0,
        observedTtftMs: null,
        engineTimeToFirstToken: null,
        promptTokens: null,
        generatedTokens: null,
        emittedTokens: null,
        tokensPerSecond: null,
        cacheTokens: null,
        backendDevice: null
      },
      stopReason: null
    })
  }
} finally {
  if (modelId) {
    try {
      await unloadExtractionModel(modelId)
    } catch (error) {
      result.unloadFailure = error instanceof Error ? error.message : String(error)
    }
  }
  await close().catch(() => {})

  result.endedAt = new Date().toISOString()
  result.summary = summarizeCases(result.cases)
  result.gates = buildGates(result, frozen.dataset.notes.length)
  result.gates.pass = Object.values(result.gates).every(Boolean)
  await persistResult()
}

console.log(JSON.stringify({ resultPath, summary: result.summary, gates: result.gates, fatalFailure: result.fatalFailure }, null, 2))
if (!result.gates.pass) process.exitCode = 1

async function persistResult() {
  await writeFile(nextPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  await rm(resultPath, { force: true })
  await rename(nextPath, resultPath)
}
