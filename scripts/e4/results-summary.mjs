export function summarizeCases(cases) {
  const firstAttemptSucceeded = cases.filter((item) => item.attempts[0]?.status === 'succeeded').length
  const firstAttemptJsonSchemaValid = cases.filter((item) => isJsonSchemaValid(item.attempts[0])).length
  const succeededAfterRetry = cases.filter(
    (item) => item.attempts[0]?.status === 'failed' && item.attempts[1]?.status === 'succeeded'
  ).length
  const unresolvedFailures = cases.filter((item) => item.terminalStatus === 'failed').length
  const jsonSchemaValidAfterRetry = cases.filter((item) => isJsonSchemaValid(item.attempts.at(-1))).length
  const endToEndLatencyMs = cases.map((item) =>
    item.attempts.reduce((sum, attempt) => sum + (attempt.metrics?.totalMs ?? 0), 0)
  )
  const successfulAttempts = cases
    .flatMap((item) => item.attempts)
    .filter((attempt) => attempt.status === 'succeeded')
  const allAttempts = cases.flatMap((item) => item.attempts)

  return {
    totalCases: cases.length,
    firstAttemptSucceeded,
    firstAttemptSuccessRate: ratio(firstAttemptSucceeded, cases.length),
    firstAttemptJsonSchemaValid,
    firstAttemptJsonSchemaValidRate: ratio(firstAttemptJsonSchemaValid, cases.length),
    succeededAfterRetry,
    retrySuccessRate: ratio(succeededAfterRetry, cases.filter((item) => item.attempts.length > 1).length),
    jsonSchemaValidAfterRetry,
    postRetryJsonSchemaValidRate: ratio(jsonSchemaValidAfterRetry, cases.length),
    admissibleAfterDeterministicChecks: cases.length - unresolvedFailures,
    postRetryAdmissibleRate: ratio(cases.length - unresolvedFailures, cases.length),
    unresolvedFailures,
    retryCount: cases.filter((item) => item.attempts.length > 1).length,
    warmCasesWithin15Seconds: endToEndLatencyMs.filter((value) => value <= 15_000).length,
    endToEndLatencyMs,
    latency: distribution(endToEndLatencyMs),
    observedTtftMs: distribution(allAttempts.map((item) => item.metrics?.observedTtftMs).filter(isNumber)),
    engineTimeToFirstToken: distribution(allAttempts.map((item) => item.metrics?.engineTimeToFirstToken).filter(isNumber)),
    promptTokens: distribution(allAttempts.map((item) => item.metrics?.promptTokens).filter(isNumber)),
    generatedTokens: distribution(allAttempts.map((item) => item.metrics?.generatedTokens).filter(isNumber)),
    emittedTokens: distribution(allAttempts.map((item) => item.metrics?.emittedTokens).filter(isNumber)),
    tokensPerSecond: distribution(allAttempts.map((item) => item.metrics?.tokensPerSecond).filter(isNumber)),
    backendDevices: [...new Set(allAttempts.map((item) => item.metrics?.backendDevice).filter(Boolean))],
    successfulAttemptCount: successfulAttempts.length
  }
}

export function buildGates(result, expectedCaseCount = 20) {
  return {
    noCrashes: result.fatalFailure === null,
    noLostNotes: result.cases.length === expectedCaseCount
      && result.cases.every((item) =>
        item.originalText.length > 0
        && ['succeeded', 'failed'].includes(item.terminalStatus)
        && ['succeeded', 'failed'].includes(item.attempts.at(-1)?.status)
      ),
    schemaValidAfterAtMostOneRetry: result.summary.jsonSchemaValidAfterRetry === expectedCaseCount,
    warmLatencyAtMost15SecondsFor19Of20: result.summary.warmCasesWithin15Seconds >= 19,
    invalidOutputExcludedFromWorkingData: result.cases.every((item) =>
      item.admissibleDraft === null || item.terminalStatus === 'succeeded'
    ),
    offlineCachedModelRunCompleted: result.fatalFailure === null
      && result.cases.length === expectedCaseCount
  }
}

function isJsonSchemaValid(attempt) {
  return attempt?.status === 'succeeded'
    || attempt?.failureCategory === 'deterministic-evidence-validation'
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function distribution(values) {
  if (values.length === 0) return { count: 0, min: null, median: null, p95: null, max: null }
  const sorted = [...values].sort((left, right) => left - right)
  return {
    count: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1)
  }
}

function percentile(sorted, percentileValue) {
  const index = Math.ceil(percentileValue * sorted.length) - 1
  return sorted[Math.max(0, index)]
}
