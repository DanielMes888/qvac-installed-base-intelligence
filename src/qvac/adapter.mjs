import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'

import {
  QWEN3_1_7B_INST_Q4,
  VERBOSITY,
  close,
  completion,
  getLoadedModelInfo,
  loadModel,
  unloadModel
} from '@qvac/sdk'

import {
  compactDraftJsonSchema,
  extractionTool,
  parseCompactJson,
  validateCompactDraft
} from './compact-contract.mjs'
import {
  buildEvidenceSegments,
  validateSimpleDraft
} from './simple-json-contract.mjs'

export const QVAC_CONFIGURATION = Object.freeze({
  sdk: '0.19.0',
  modelExport: 'QWEN3_1_7B_INST_Q4',
  quantization: 'Q4_0',
  promptVersion: 'prototype-equipment-extraction-v9',
  outputContract: 'json-object-with-compact-raw-json-fallback',
  modelConfig: { device: 'gpu', gpu_layers: 99, ctx_size: 4096, tools: true, verbosity: VERBOSITY.ERROR },
  generationParams: { temp: 0, top_p: 1, seed: 20260910, predict: 250, reasoning_budget: 0 }
})

const SYSTEM_PROMPT = `Extract only equipment facts supported by the observation. Call record_equipment exactly once. Use short IDs. Source offsets a/b are zero-based JavaScript string offsets, b exclusive. Never repeat evidence. eq=equipment type, mk=manufacturer, md=model, qt=quantity, ag=age, loc=location, id=identifier. q: o=observed, t=explicit total, u=unknown. src: d=direct observation, a=attributed statement, u=unattributed statement, r=record/label. c: r=reported, e=estimated, u=unknown; model output cannot confirm facts. n marks negation. x is null or one material clarification. Do not explain. /no_think`
const SIMPLE_PROMPT = readFileSync(new URL('../../prompts/prototype-equipment-extraction-v9.txt', import.meta.url), 'utf8').trim()

let loaded
let warmed

export async function ensureQvacLoaded() {
  if (!loaded) {
    loaded = (async () => {
      const started = performance.now()
      const modelId = await loadModel({
        modelSrc: QWEN3_1_7B_INST_Q4,
        modelConfig: QVAC_CONFIGURATION.modelConfig
      })
      return {
        modelId,
        loadMs: performance.now() - started,
        info: await getLoadedModelInfo({ modelId })
      }
    })().catch((error) => {
      loaded = null
      throw error
    })
  }
  return loaded
}

export async function ensureQvacReady() {
  const model = await ensureQvacLoaded()
  if (!warmed) {
    warmed = runAttempt(model.modelId, 'Observé un equipo XRAY NovaMed X7.', 'simple-json-object', 1, null)
      .then((attempt) => ({ status: attempt.status, failureCategory: attempt.failureCategory, metrics: attempt.metrics }))
      .catch((error) => ({ status: 'failed', failureCategory: 'sdk', error: error instanceof Error ? error.message : String(error) }))
  }
  return { ...model, warmup: await warmed }
}

export async function extractEquipmentDraft(note, { mode = 'simple-json', maxAttempts = 2 } = {}) {
  const model = await ensureQvacLoaded()
  const attempts = []
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const attemptMode = mode === 'simple-json-object' && attemptNumber > 1 ? 'simple-json' : mode
    const attempt = await runAttempt(model.modelId, note, attemptMode, attemptNumber, attempts.at(-1)?.failureCategory)
    attempts.push(attempt)
    if (attempt.status === 'succeeded') break
  }
  return {
    status: attempts.at(-1)?.status ?? 'failed',
    mode,
    model: QVAC_CONFIGURATION,
    load: { loadMs: model.loadMs, info: model.info },
    attempts,
    draft: attempts.at(-1)?.validatedDraft ?? null
  }
}

export async function closeQvac() {
  if (loaded) {
    const model = await loaded
    await unloadModel({ modelId: model.modelId, clearStorage: false }).catch(() => {})
    loaded = null
    warmed = null
  }
  await close().catch(() => {})
}

async function runAttempt(modelId, note, mode, attemptNumber, priorFailure) {
  const evidenceSegments = buildEvidenceSegments(note)
  const history = [
    { role: 'system', content: mode.startsWith('simple-json') ? SIMPLE_PROMPT : SYSTEM_PROMPT },
    { role: 'user', content: mode.startsWith('simple-json')
      ? `Fuentes:\n${evidenceSegments.map(({ id, text }) => `${id}|${text}`).join('\n')}`
      : `Observation:\n${note}` }
  ]
  if (priorFailure) history.push({ role: 'user', content: `Retry once. Fix only ${priorFailure}. Use the same evidence. /no_think` })

  const started = performance.now()
  try {
    const request = {
      modelId,
      history,
      stream: true,
      captureThinking: false,
      emitRawDeltas: false,
      generationParams: {
        ...QVAC_CONFIGURATION.generationParams,
        seed: QVAC_CONFIGURATION.generationParams.seed + attemptNumber - 1
      }
    }
    if (mode === 'tool') request.tools = [extractionTool]
    else if (mode === 'simple-json-object') request.responseFormat = { type: 'json_object' }
    else if (mode === 'json') request.responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'compact_equipment',
        description: 'Compact equipment claims',
        schema: compactDraftJsonSchema,
        strict: true
      }
    }

    const run = completion(request)
    const final = await run.final
    const elapsedMs = performance.now() - started
    const rawOutput = final.raw?.fullText ?? final.contentText ?? ''
    const stopReason = final.stopReason ?? null
    let candidate
    let parseError = null

    if (mode === 'tool') {
      if (final.toolCalls.length !== 1 || final.toolCalls[0].name !== extractionTool.name) {
        parseError = `expected one ${extractionTool.name} call; received ${final.toolCalls.length}`
      } else {
        candidate = final.toolCalls[0].arguments
      }
    } else {
      const parsed = parseCompactJson(final.contentText ?? '')
      candidate = parsed.value
      parseError = parsed.error
    }

    const validation = parseError
      ? { valid: false, errors: [parseError], expanded: null }
      : mode.startsWith('simple-json')
        ? (() => {
            const result = validateSimpleDraft(candidate, evidenceSegments, stopReason)
            return { valid: result.valid, errors: result.errors, expanded: result.draft }
          })()
        : validateCompactDraft(candidate, note, stopReason)

    return {
      attemptNumber,
      status: validation.valid ? 'succeeded' : 'failed',
      failureCategory: validation.valid ? null : stopReason === 'length' ? 'length' : parseError ? 'parse' : 'validation',
      errors: validation.errors,
      stopReason,
      rawOutput,
      toolCalls: final.toolCalls,
      validatedDraft: validation.expanded,
      metrics: {
        totalMs: elapsedMs,
        promptTokens: final.stats?.promptTokens ?? null,
        generatedTokens: final.stats?.generatedTokens ?? null,
        emittedTokens: final.stats?.emittedTokens ?? null,
        timeToFirstToken: final.stats?.timeToFirstToken ?? null,
        tokensPerSecond: final.stats?.tokensPerSecond ?? null,
        backendDevice: final.stats?.backendDevice ?? null
      }
    }
  } catch (error) {
    return {
      attemptNumber,
      status: 'failed',
      failureCategory: 'sdk',
      errors: [error instanceof Error ? `${error.name}: ${error.message}` : String(error)],
      stopReason: null,
      rawOutput: '',
      toolCalls: [],
      validatedDraft: null,
      metrics: { totalMs: performance.now() - started }
    }
  }
}
