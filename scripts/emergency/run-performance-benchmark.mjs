import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { closeQvac, ensureQvacReady, extractEquipmentDraft, QVAC_CONFIGURATION } from '../../src/qvac/adapter.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const datasetPath = path.join(root, 'data', 'prototype', 'performance-benchmark-v1.json')
const label = process.argv[2] ?? 'candidate'
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Use a simple benchmark label')
const resultPath = path.join(root, 'results', 'emergency', `performance-${label}.json`)
const dataset = JSON.parse(await readFile(datasetPath, 'utf8'))
const report = {
  schemaVersion: 'prototype-performance-result-v1',
  benchmarkVersion: dataset.schemaVersion,
  label,
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  environment: { sdk: QVAC_CONFIGURATION.sdk, modelExport: QVAC_CONFIGURATION.modelExport, quantization: QVAC_CONFIGURATION.quantization, modelConfig: QVAC_CONFIGURATION.modelConfig, generationParams: QVAC_CONFIGURATION.generationParams, promptVersion: QVAC_CONFIGURATION.promptVersion ?? 'inline-v1' },
  load: null,
  warmup: null,
  cases: [],
  summary: null,
  failure: null
}

try {
  const loaded = await ensureQvacReady()
  report.load = { loadMs: loaded.loadMs, info: loaded.info }
  report.warmup = loaded.warmup
  for (const benchmarkCase of dataset.cases) {
    const extraction = await extractEquipmentDraft(benchmarkCase.note, { mode: 'simple-json-object', maxAttempts: 2 })
    const semantic = scoreSemantic(extraction.draft, benchmarkCase.expected, benchmarkCase.note)
    report.cases.push({
      id: benchmarkCase.id,
      note: benchmarkCase.note,
      expected: benchmarkCase.expected,
      status: extraction.status,
      attempts: extraction.attempts.map(({ attemptNumber, status, failureCategory, errors, stopReason, rawOutput, metrics }) => ({ attemptNumber, status, failureCategory, errors, stopReason, rawOutput, metrics })),
      draft: extraction.draft,
      semantic
    })
  }
  report.summary = summarize(report.cases)
} catch (error) {
  report.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  report.completedAt = new Date().toISOString()
  await closeQvac()
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({ label, loadMs: report.load?.loadMs, summary: report.summary, failure: report.failure }, null, 2))

function scoreSemantic(draft, expected, note) {
  if (!draft) return { passed: false, checks: { validDraft: false }, errors: ['No valid Draft Claim set'] }
  const claims = draft.claims.filter(({ negated }) => !negated)
  const find = (type) => claims.find((claim) => claim.type === type)
  const checks = {
    equipmentType: same(find('equipmentType')?.value, expected.equipmentType),
    manufacturer: expected.manufacturer === null ? !find('manufacturer') : same(find('manufacturer')?.value, expected.manufacturer),
    model: expected.model === null ? !find('model') : same(find('model')?.value, expected.model),
    quantity: Number(find('quantity')?.value) === expected.quantity,
    quantityScope: find('quantity')?.quantityScope === expected.quantityScope,
    sourceType: claims.length > 0 && claims.every((claim) => claim.sourceType === expected.sourceType),
    certainty: claims.length > 0 && claims.every((claim) => claim.certainty === expected.certainty),
    evidenceLinkage: claims.length > 0 && claims.every((claim) => claim.evidence && note.slice(claim.evidence.start, claim.evidence.end) === claim.evidence.text),
    clarification: expected.clarification
      ? draft.clarification?.kind === expected.clarificationKind && conciseSpanish(draft.clarification.question)
      : draft.clarification === null,
    noUnsupportedIdentityOrQuantity: noUnsupportedIdentityOrQuantity(claims, expected)
  }
  return { passed: Object.values(checks).every(Boolean), checks, errors: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name) }
}

function summarize(cases) {
  const attempts = cases.flatMap((item) => item.attempts)
  const successfulAttempts = attempts.filter(({ status }) => status === 'succeeded')
  const validCases = cases.filter(({ status }) => status === 'succeeded')
  const explicit = cases.filter(({ expected }) => !expected.clarification)
  const ambiguous = cases.find(({ expected }) => expected.clarification)
  const warmLatencies = cases.map((item) => item.attempts.reduce((sum, attempt) => sum + (attempt.metrics?.totalMs ?? 0), 0))
  return {
    schemaValid: { numerator: validCases.length, denominator: cases.length },
    semanticPass: { numerator: cases.filter(({ semantic }) => semantic.passed).length, denominator: cases.length },
    zeroUnsupportedIdentitiesOrQuantities: cases.every(({ semantic }) => semantic.checks.noUnsupportedIdentityOrQuantity === true),
    explicitCasesWithoutQuestion: { numerator: explicit.filter(({ draft }) => draft?.clarification === null).length, denominator: explicit.length },
    ambiguousCaseHasValidQuestion: ambiguous?.semantic.checks.clarification === true,
    under15Seconds: { numerator: warmLatencies.filter((value) => value <= 15_000).length, denominator: warmLatencies.length },
    retries: attempts.length - cases.length,
    failures: attempts.filter(({ status }) => status !== 'succeeded').length,
    latencyMs: distribution(warmLatencies),
    ttftMs: distribution(successfulAttempts.map(({ metrics }) => metrics?.timeToFirstToken).filter(Number.isFinite)),
    promptTokens: distribution(successfulAttempts.map(({ metrics }) => metrics?.promptTokens).filter(Number.isFinite)),
    outputTokens: distribution(successfulAttempts.map(({ metrics }) => metrics?.generatedTokens).filter(Number.isFinite)),
    throughputTokensPerSecond: distribution(successfulAttempts.map(({ metrics }) => metrics?.tokensPerSecond).filter(Number.isFinite))
  }
}

function noUnsupportedIdentityOrQuantity(claims, expected) {
  const allowed = { manufacturer: expected.manufacturer, model: expected.model, quantity: expected.quantity }
  return Object.entries(allowed).every(([type, value]) => {
    const found = claims.filter((claim) => claim.type === type)
    if (value === null) return found.length === 0
    return found.length === 1 && same(found[0].value, value)
  }) && claims.every((claim) => claim.type !== 'identifier')
}

function conciseSpanish(question) {
  return typeof question === 'string' && question.length <= 140 && (question.startsWith('¿') || /\b(cuál|cuánt|qué|corresponde|total)\b/i.test(question))
}

function same(left, right) {
  return String(left ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() === String(right ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function distribution(values) {
  if (!values.length) return { count: 0, min: null, median: null, max: null }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return { count: sorted.length, min: sorted[0], median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, max: sorted.at(-1) }
}
