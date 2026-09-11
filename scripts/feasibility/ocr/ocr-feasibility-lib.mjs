import { access, copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const OCR_FEASIBILITY_POLICY = Object.freeze({
  schemaVersion: 'local-ocr-feasibility-v1',
  requiredCaseIds: Object.freeze([
    'clear-image',
    'small-text',
    'low-contrast',
    'slight-rotation',
    'multiple-lines',
    'alphanumeric'
  ]),
  diagnosticCaseIds: Object.freeze(['deliberately-difficult']),
  minimumTokenRecall: 0.8,
  maxWarmExtractionMs: 5000,
  minimumSystemFreeBytes: 536870912,
  persistsImages: false,
  mutatesWorkspace: false
})

export async function runBoundedOcrCall({ imagePath, engine, timeoutMs = 30000, signal }) {
  if (!/\.(?:png|jpe?g|bmp)$/i.test(imagePath)) throw new Error(`Unsupported OCR feasibility image format: ${path.extname(imagePath) || '(none)'}`)
  if (signal?.aborted) throw new DOMException('OCR feasibility call cancelled before inference', 'AbortError')
  let handle
  try {
    const blocks = await Promise.race([
      engine(imagePath),
      new Promise((_, reject) => { handle = setTimeout(() => reject(new Error(`OCR feasibility timeout after ${timeoutMs} ms`)), timeoutMs) })
    ])
    if (!Array.isArray(blocks) || blocks.every(({ text }) => String(text ?? '').trim() === '')) throw new Error('OCR feasibility engine returned no reviewable text')
    return blocks
  } finally {
    clearTimeout(handle)
  }
}

export function normalizeOcrText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
}

export function scoreOcrFixture(fixture, recognizedText) {
  const normalizedRecognized = normalizeOcrText(recognizedText)
  const tokenResults = fixture.requiredTokens.map((token) => ({
    token,
    matched: normalizedRecognized.includes(normalizeOcrText(token))
  }))
  const matchedTokens = tokenResults.filter(({ matched }) => matched).map(({ token }) => token)
  const missingTokens = tokenResults.filter(({ matched }) => !matched).map(({ token }) => token)
  const tokenRecall = tokenResults.length === 0 ? 1 : matchedTokens.length / tokenResults.length
  return {
    requiredTokens: [...fixture.requiredTokens],
    matchedTokens,
    missingTokens,
    tokenRecall,
    passed: tokenRecall >= OCR_FEASIBILITY_POLICY.minimumTokenRecall
  }
}

export function evaluateOcrFeasibility(input) {
  const failures = []
  const byId = new Map(input.cases.map((item) => [item.id, item]))
  for (const caseId of OCR_FEASIBILITY_POLICY.requiredCaseIds) {
    if (!byId.get(caseId)?.passed) failures.push(`required fixture failed: ${caseId}`)
  }

  const checks = {
    localExecution: input.localExecution,
    offlineExecution: input.offlineExecution,
    licenseAccepted: input.licenseAccepted,
    compatibleResources: input.compatibleResources,
    noExternalRequests: input.noExternalRequests,
    temporaryFilesRemoved: input.temporaryFilesRemoved,
    workspaceUnchanged: input.workspaceUnchanged,
    latencyWithinBudget: input.latencyWithinBudget
  }
  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) failures.push(`gate check failed: ${name}`)
  }

  return {
    checks,
    failures,
    outcome: failures.length === 0 ? 'OCR feasibility passed' : 'OCR feasibility failed'
  }
}

export async function withTemporaryImage(sourcePath, operation) {
  const root = path.resolve(tmpdir())
  const taskDirectory = await mkdtemp(path.join(root, 'qvac-ocr-feasibility-'))
  assertTaskDirectory(taskDirectory, root)
  const temporaryPath = path.join(taskDirectory, path.basename(sourcePath))
  let operationResult
  let operationError
  try {
    await copyFile(sourcePath, temporaryPath)
    operationResult = await operation(temporaryPath, taskDirectory)
  } catch (error) {
    operationError = error
  } finally {
    assertTaskDirectory(taskDirectory, root)
    await rm(taskDirectory, { recursive: true, force: true })
  }

  let cleaned = false
  try {
    await access(taskDirectory)
  } catch {
    cleaned = true
  }
  if (operationError) {
    const throwable = operationError instanceof Error ? operationError : new Error(String(operationError))
    throwable.temporaryFilesRemoved = cleaned
    throw throwable
  }
  return { result: operationResult, cleaned, taskDirectory }
}

export async function exerciseTemporaryImageDecision(sourcePath, decision) {
  if (!['reviewed', 'cancelled'].includes(decision)) throw new Error(`Unsupported synthetic lifecycle decision: ${decision}`)
  const lifecycle = await withTemporaryImage(sourcePath, async (temporaryPath) => ({
    decision,
    temporaryImageExistedDuringDecision: await exists(temporaryPath),
    imageOrTextPersisted: false
  }))
  return { ...lifecycle.result, temporaryFilesRemoved: lifecycle.cleaned }
}

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

function assertTaskDirectory(taskDirectory, root) {
  const resolved = path.resolve(taskDirectory)
  const prefix = `${root}${path.sep}`.toLowerCase()
  if (!resolved.toLowerCase().startsWith(prefix) || path.basename(resolved).startsWith('qvac-ocr-feasibility-') === false) {
    throw new Error(`Refusing temporary cleanup outside the OCR feasibility scope: ${resolved}`)
  }
}
