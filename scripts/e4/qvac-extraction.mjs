import { performance } from 'node:perf_hooks'

import {
  QWEN3_1_7B_INST_Q4,
  VERBOSITY,
  completion,
  getLoadedModelInfo,
  loadModel,
  unloadModel
} from '@qvac/sdk'

import { parseModelJson, validateDraftClaimSet } from './draft-claim-set.mjs'

export const MODEL_DESCRIPTOR = QWEN3_1_7B_INST_Q4

export const MODEL_CONFIG = Object.freeze({
  device: 'gpu',
  gpu_layers: 99,
  ctx_size: 4096,
  verbosity: VERBOSITY.ERROR
})

export const GENERATION_PARAMS = Object.freeze({
  temp: 0,
  top_p: 1,
  seed: 20260910,
  predict: 700
})

export async function loadExtractionModel() {
  const started = performance.now()
  const modelId = await loadModel({
    modelSrc: MODEL_DESCRIPTOR,
    modelConfig: MODEL_CONFIG
  })
  const loadMs = performance.now() - started
  const loadedModel = await getLoadedModelInfo({ modelId })
  return { modelId, loadMs, loadedModel }
}

export async function unloadExtractionModel(modelId) {
  await unloadModel({ modelId, clearStorage: false, autoClose: true })
}

function retryInstruction(errorCategory) {
  return `The prior response failed ${errorCategory}. Retry once using the same evidence. Return only a corrected object matching the supplied schema. Do not invent facts. /no_think`
}

export async function extractDraftClaims({
  modelId,
  note,
  noteId,
  prompt,
  schema,
  attemptNumber,
  priorErrorCategory = null
}) {
  const history = [
    { role: 'system', content: prompt },
    { role: 'user', content: `Observation ID: ${noteId}\nObservation: ${note}` }
  ]
  if (priorErrorCategory) {
    history.push({ role: 'user', content: retryInstruction(priorErrorCategory) })
  }

  const started = performance.now()
  let observedFirstTokenAt = null
  let content = ''
  let engineStats = null
  let stopReason = null

  try {
    const run = completion({
      modelId,
      history,
      stream: true,
      captureThinking: false,
      emitRawDeltas: false,
      generationParams: {
        ...GENERATION_PARAMS,
        seed: GENERATION_PARAMS.seed + attemptNumber - 1
      },
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'e4_draft_claim_set',
          description: 'Atomic scoped equipment claims grounded in the observation',
          schema,
          strict: true
        }
      }
    })

    for await (const event of run.events) {
      if (event.type === 'contentDelta') {
        if (observedFirstTokenAt === null && event.text.length > 0) {
          observedFirstTokenAt = performance.now()
        }
        content += event.text
      } else if (event.type === 'completionStats') {
        engineStats = event.stats
      } else if (event.type === 'completionDone') {
        stopReason = event.stopReason
      }
    }

    const final = await run.final
    content = final.contentText || content
    engineStats = final.stats ?? engineStats
    stopReason = final.stopReason ?? stopReason
    const totalMs = performance.now() - started
    const parsed = parseModelJson(content)

    if (parsed.error) {
      return {
        noteId,
        attemptNumber,
        status: 'failed',
        failureCategory: 'json-parse',
        errors: [parsed.error],
        rawOutput: content,
        metrics: buildMetrics(started, observedFirstTokenAt, totalMs, engineStats),
        stopReason
      }
    }

    const validation = await validateDraftClaimSet(parsed.parsed, note)
    if (!validation.valid) {
      return {
        noteId,
        attemptNumber,
        status: 'failed',
        failureCategory: validation.errors.some((error) => error.startsWith('schema '))
          ? 'schema-validation'
          : 'deterministic-evidence-validation',
        errors: validation.errors,
        rawOutput: content,
        parsedOutput: parsed.parsed,
        metrics: buildMetrics(started, observedFirstTokenAt, totalMs, engineStats),
        stopReason
      }
    }

    return {
      noteId,
      attemptNumber,
      status: 'succeeded',
      failureCategory: null,
      errors: [],
      rawOutput: content,
      parsedOutput: parsed.parsed,
      metrics: buildMetrics(started, observedFirstTokenAt, totalMs, engineStats),
      stopReason
    }
  } catch (error) {
    const totalMs = performance.now() - started
    return {
      noteId,
      attemptNumber,
      status: 'failed',
      failureCategory: 'sdk-error',
      errors: [error instanceof Error ? `${error.name}: ${error.message}` : String(error)],
      rawOutput: content,
      metrics: buildMetrics(started, observedFirstTokenAt, totalMs, engineStats),
      stopReason
    }
  }
}

function buildMetrics(started, observedFirstTokenAt, totalMs, stats) {
  return {
    totalMs,
    observedTtftMs: observedFirstTokenAt === null ? null : observedFirstTokenAt - started,
    engineTimeToFirstToken: stats?.timeToFirstToken ?? null,
    promptTokens: stats?.promptTokens ?? null,
    generatedTokens: stats?.generatedTokens ?? null,
    emittedTokens: stats?.emittedTokens ?? null,
    tokensPerSecond: stats?.tokensPerSecond ?? null,
    cacheTokens: stats?.cacheTokens ?? null,
    backendDevice: stats?.backendDevice ?? null
  }
}
