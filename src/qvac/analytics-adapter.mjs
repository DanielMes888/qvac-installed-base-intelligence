import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { completion } from '@qvac/sdk'

import { ensureQvacLoaded, QVAC_CONFIGURATION } from './adapter.mjs'
import { validateAnalyticsPlan } from '../core/analytics.mjs'

const prompt = (await readFile(new URL('../../prompts/prototype-installed-base-analytics-v1.txt', import.meta.url), 'utf8')).trim()
export const ANALYTICS_QVAC_CONFIGURATION = Object.freeze({ promptVersion: 'prototype-installed-base-analytics-v1', contractVersion: 'analytics-query-v1', modelExport: QVAC_CONFIGURATION.modelExport, maxAttempts: 2 })
let warmed

export async function ensureAnalyticsReady() {
  const model = await ensureQvacLoaded()
  if (!warmed || warmed.modelId !== model.modelId) {
    warmed = { modelId: model.modelId, promise: warmAnalytics(model) }
  }
  return warmed.promise
}

export async function interpretAnalyticsQuestion(question) {
  const model = await ensureQvacLoaded()
  const attempts = []
  for (let number = 1; number <= 2; number += 1) {
    const attempt = await runAnalyticsAttempt(model, question, number)
    attempts.push(attempt)
    if (attempt.status === 'succeeded') return { status: 'succeeded', plan: attempt.plan, attempts: attempts.map(withoutPlan), load: { loadMs: model.loadMs, info: model.info }, configuration: ANALYTICS_QVAC_CONFIGURATION }
  }
  return { status: 'failed', plan: null, attempts, load: { loadMs: model.loadMs, info: model.info }, configuration: ANALYTICS_QVAC_CONFIGURATION }
}

async function warmAnalytics(model) {
  const started = performance.now()
  const attempt = await runAnalyticsAttempt(model, 'Equipos por modalidad', 1)
  const semanticallyReady = attempt.status === 'succeeded' && attempt.plan?.dataset === 'equipment' && attempt.plan?.groupBy === 'modality' && attempt.plan?.filters?.length === 0
  return {
    status: semanticallyReady ? 'ready' : 'failed',
    loadMs: model.loadMs,
    warmupMs: performance.now() - started,
    backend: attempt.backend,
    attempts: [withoutPlan(attempt)],
    error: semanticallyReady ? null : 'El calentamiento analítico local no produjo el plan seguro esperado.'
  }
}

async function runAnalyticsAttempt(model, question, number) {
  const started = performance.now()
  try {
    const history = [{ role: 'system', content: prompt }, { role: 'user', content: question }]
    if (number === 2) history.push({ role: 'user', content: 'Retry once. Return only one valid allowed JSON object. /no_think' })
    const run = completion({ modelId: model.modelId, history, stream: true, captureThinking: false, emitRawDeltas: false, responseFormat: { type: 'json_object' }, generationParams: { temp: 0, top_p: 1, seed: 20260911 + number - 1, predict: 220, reasoning_budget: 0 } })
    const final = await run.final
    const candidate = JSON.parse(final.contentText ?? '')
    const validation = validateAnalyticsPlan(candidate)
    return { number, status: validation.valid ? 'succeeded' : 'failed', errors: validation.errors, plan: validation.plan, stopReason: final.stopReason ?? null, latencyMs: performance.now() - started, backend: final.stats?.backendDevice ?? model.info?.device ?? null }
  } catch (error) {
    return { number, status: 'failed', errors: [error instanceof Error ? error.message : String(error)], plan: null, stopReason: null, latencyMs: performance.now() - started, backend: model.info?.device ?? null }
  }
}

function withoutPlan({ plan, ...attempt }) { return attempt }
