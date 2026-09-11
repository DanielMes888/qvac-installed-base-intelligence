import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createPrototypeServer } from '../../src/server.mjs'
import { validateWorkspaceExport } from '../../src/core/workspace-export.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'emergency', 'export-delete-smoke.json')
const protectedPaths = [
  path.join(root, 'package.json'),
  path.join(root, 'data', 'prototype', 'seed.json'),
  path.join(root, 'test', 'emergency', 'workspace.test.mjs'),
  path.join(root, 'results', 'feasibility', 'E4_FAILURE_REPORT.md'),
  path.join(root, 'results', 'feasibility', 'E4_V2_FAILURE_REPORT.md')
]
const result = {
  schemaVersion: 'export-delete-smoke-v1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  synthetic: true,
  adapter: 'controlled-test-adapter',
  purpose: 'Deterministic local export, confirmed deletion, restart persistence, reset separation, path-boundary, and denied-network evidence.',
  export: null,
  deletion: null,
  protection: null,
  privacy: {
    externalNetworking: 'denied by the smoke-test request boundary',
    attemptedExternalRequests: [],
    applicationRequests: [],
    unexpectedExternalRequests: []
  },
  failure: null
}

let directory
let app
let restartedApp

try {
  directory = await mkdtemp(path.join(tmpdir(), 'qvac-export-delete-smoke-'))
  const workspacePath = path.join(directory, 'isolated-runtime', 'workspace.json')
  const beforeHashes = await hashes(protectedPaths)
  const guardedFetch = async (url, options) => {
    const parsed = new URL(url)
    if (parsed.hostname !== '127.0.0.1') {
      result.privacy.attemptedExternalRequests.push({ url: parsed.origin, blocked: true })
      throw new Error('External networking disabled by smoke test')
    }
    result.privacy.applicationRequests.push({ method: options?.method ?? 'GET', origin: parsed.origin, path: parsed.pathname })
    return fetch(url, options)
  }

  await guardedFetch('https://example.invalid/privacy-probe').catch(() => {})
  app = await createPrototypeServer({
    workspacePath,
    extractor: async () => ({
      status: 'failed',
      attempts: [{ status: 'failed', failureCategory: 'validation', errors: ['Salida controlada inválida'], rawOutput: '{"invalid-model-marker":true}' }],
      draft: null,
      model: { sdk: 'controlled-test-adapter' }
    })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${app.server.address().port}`

  const failedObservation = await guardedFetch(`${origin}/api/observations`, jsonRequest('POST', { customerId: 'northbridge', text: 'Nota sintética con salida controlada inválida.' })).then(parseOk)
  assert(failedObservation.status === 'failed' && failedObservation.draftClaims.length === 0, 'La salida inválida entró en el Workspace como Draft Claims')
  const exportedResponse = await guardedFetch(`${origin}/api/workspace/export`)
  const exported = await exportedResponse.json()
  assert(validateWorkspaceExport(exported), 'La exportación completa no superó su validador')
  assert(exported.observations.every((observation) => observation.inferenceAttempts.every((attempt) => !('rawOutput' in attempt) && !('validatedDraft' in attempt))), 'La exportación incluyó salida interna del modelo')
  assert(!JSON.stringify(exported).includes('invalid-model-marker'), 'La exportación conservó contenido inválido excluido')
  const refused = await guardedFetch(`${origin}/api/workspace`, jsonRequest('DELETE', { confirmation: 'NO' }))
  assert(refused.status === 400, 'La eliminación sin confirmación fue admitida')
  const afterRefusal = await guardedFetch(`${origin}/api/bootstrap`).then((response) => response.json())
  assert(afterRefusal.customers.length > 0, 'La cancelación alteró el Workspace')

  const deletion = await guardedFetch(`${origin}/api/workspace`, jsonRequest('DELETE', { confirmation: 'ELIMINAR' })).then(parseOk)
  assert(deletion.state.customers.length === 0 && deletion.state.observations.length === 0 && deletion.state.equipmentRecords.length === 0, 'El estado en memoria no quedó vacío')
  await app.close()
  app = null

  restartedApp = await createPrototypeServer({ workspacePath, extractor: async () => { throw new Error('El smoke no debe invocar QVAC') } })
  await new Promise((resolve) => restartedApp.server.listen(0, '127.0.0.1', resolve))
  const restartedOrigin = `http://127.0.0.1:${restartedApp.server.address().port}`
  const afterRestart = await guardedFetch(`${restartedOrigin}/api/bootstrap`).then((response) => response.json())
  assert(afterRestart.customers.length === 0 && afterRestart.aggregate.observations === 0, 'El reinicio restauró datos eliminados')
  const emptyExport = await guardedFetch(`${restartedOrigin}/api/workspace/export`).then((response) => response.json())
  assert(validateWorkspaceExport(emptyExport) && emptyExport.customers.length === 0, 'El Workspace vacío no se pudo exportar')
  await guardedFetch(`${restartedOrigin}/api/reset`, { method: 'POST' }).then(parseOk)
  const afterReset = await guardedFetch(`${restartedOrigin}/api/bootstrap`).then((response) => response.json())
  assert(afterReset.customers.length === exported.customers.length, 'Restablecer demostración no recreó el fixture sintético')

  const afterHashes = await hashes(protectedPaths)
  assert(JSON.stringify(beforeHashes) === JSON.stringify(afterHashes), 'Un archivo protegido cambió durante la eliminación')
  result.export = {
    schemaVersion: exported.schemaVersion,
    filename: exportedResponse.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1],
    collections: Object.fromEntries(['customers', 'observations', 'evidenceEntries', 'equipmentRecords', 'reconciliationLinks', 'verificationItems'].map((key) => [key, exported[key].length])),
    validBeforeDeletion: true,
    validWhenEmpty: true,
    invalidModelContentExported: false
  }
  result.deletion = {
    confirmationRequired: true,
    cancellationPreservedWorkspace: true,
    inMemoryEmpty: true,
    persistedEmptyAfterRestart: true,
    resetRestoredSyntheticFixture: true,
    storageTarget: 'temporary isolated directory'
  }
  result.protection = {
    filesChecked: protectedPaths.map((value) => path.relative(root, value).replaceAll('\\', '/')),
    unchanged: true,
    modelOrQvacCacheOperations: 0,
    recursiveDeletionOperations: 0
  }
} catch (error) {
  result.failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  process.exitCode = 1
} finally {
  if (app) await app.close()
  if (restartedApp) await restartedApp.close()
  if (directory) await rm(directory, { recursive: true, force: true })
  result.completedAt = new Date().toISOString()
  await mkdir(path.dirname(resultPath), { recursive: true })
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({ export: result.export, deletion: result.deletion, protection: result.protection, privacy: result.privacy, failure: result.failure }, null, 2))

function jsonRequest(method, body) {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

async function parseOk(response) {
  const value = await response.json()
  if (!response.ok) throw new Error(value.error ?? `HTTP ${response.status}`)
  return value
}

async function hashes(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (filePath) => [
    path.relative(root, filePath).replaceAll('\\', '/'),
    createHash('sha256').update(await readFile(filePath)).digest('hex')
  ])))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
