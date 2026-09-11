import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { FileStore } from './core/file-store.mjs'
import { WorkspaceService } from './core/workspace-service.mjs'
import { exportFilename } from './core/workspace-export.mjs'
import { QVAC_CONFIGURATION, closeQvac, ensureQvacReady, extractEquipmentDraft } from './qvac/adapter.mjs'
import { ensureAnalyticsReady, interpretAnalyticsQuestion } from './qvac/analytics-adapter.mjs'
import { closePhotoOcr, recognizePhoto } from './core/photo-ocr.mjs'
import { closeVoiceTranscription, transcribeVoice } from './core/voice-transcription.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDirectory = path.join(root, 'public')

export async function createPrototypeServer({
  workspacePath = path.join(root, '.local', 'workspace.json'),
  extractor,
  analyticsInterpreter = interpretAnalyticsQuestion,
  transcriber = transcribeVoice
} = {}) {
  const usesLocalQvac = extractor === undefined
  const activeExtractor = extractor ?? ((note) => extractEquipmentDraft(note, { mode: 'simple-json-object', maxAttempts: 2 }))
  if (usesLocalQvac) await ensureQvacReady()
  const analyticsRuntime = usesLocalQvac ? await ensureAnalyticsReady() : { status: 'controlled', loadMs: null, warmupMs: null, backend: null, error: null }
  const activeAnalyticsInterpreter = analyticsRuntime.status === 'failed'
    ? async () => ({ status: 'failed', plan: null, attempts: [], configuration: null })
    : analyticsInterpreter
  const store = new FileStore({ seedPath: path.join(root, 'data', 'prototype', 'seed.json'), workspacePath })
  let workspace = new WorkspaceService(await store.load(), (state) => store.save(state))

  const server = createServer(async (request, response) => {
    try {
      if (!isLocalRequest(request)) return json(response, 403, { error: 'Se requiere un origen local' })
      const url = new URL(request.url, 'http://127.0.0.1')
      if (url.pathname === '/api/health') return json(response, 200, { ok: true, localOnly: true, qvac: QVAC_CONFIGURATION })
      if (url.pathname === '/api/bootstrap' && request.method === 'GET') {
        const state = workspace.snapshot()
        return json(response, 200, { label: state.label, customers: state.customers, aggregate: workspace.aggregate(), opportunityAggregate: workspace.opportunitySignalAggregate(), qvac: QVAC_CONFIGURATION, analyticsRuntime })
      }
      if (url.pathname === '/api/workspace/export' && request.method === 'GET') {
        const payload = workspace.exportWorkspace()
        return downloadJson(response, payload, exportFilename(payload.exportTimestamp))
      }
      if (url.pathname === '/api/workspace' && request.method === 'DELETE') {
        const state = await workspace.deleteWorkspace((await bodyJson(request)).confirmation)
        return json(response, 200, { deleted: true, state, aggregate: workspace.aggregate() })
      }
      if (url.pathname === '/api/observations' && request.method === 'POST') {
        const body = await bodyJson(request)
        const observation = await workspace.capture(body.customerId, body.text, activeExtractor, { observationDate: body.observationDate, provenance: body.provenance })
        return json(response, 201, observation)
      }
      if (url.pathname === '/api/photo-example' && request.method === 'GET') return photoExample(response)
      if (url.pathname === '/api/photo-ocr' && request.method === 'POST') return json(response, 200, await recognizePhoto(await bodyJson(request, 7 * 1024 * 1024)))
      if (url.pathname === '/api/voice-example' && request.method === 'GET') return voiceExample(response)
      if (url.pathname === '/api/voice-transcription' && request.method === 'POST') {
        const controller = new AbortController()
        request.once('aborted', () => controller.abort())
        response.once('close', () => { if (!response.writableEnded) controller.abort() })
        const mimeType = String(request.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase()
        const bytes = await bodyBuffer(request, 8 * 1024 * 1024)
        return json(response, 200, await transcriber({ bytes, mimeType }, { signal: controller.signal }))
      }
      if (url.pathname === '/api/verifications' && request.method === 'GET') {
        return json(response, 200, workspace.verificationItems({
          priority: url.searchParams.get('priority') || undefined,
          customerId: url.searchParams.get('customerId') || undefined,
          equipmentRecordId: url.searchParams.get('equipmentRecordId') || undefined,
          reasonCode: url.searchParams.get('reasonCode') || undefined
        }))
      }
      if (url.pathname === '/api/opportunities' && request.method === 'GET') {
        return json(response, 200, workspace.opportunitySignals({
          customerId: url.searchParams.get('customerId') || undefined,
          equipmentRecordId: url.searchParams.get('equipmentRecordId') || undefined,
          type: url.searchParams.get('type') || undefined,
          status: url.searchParams.get('status') || undefined
        }))
      }
      if (url.pathname === '/api/analytics' && request.method === 'POST') {
        return json(response, 200, await workspace.runAnalytics((await bodyJson(request)).question, activeAnalyticsInterpreter))
      }
      if (url.pathname === '/api/geography' && request.method === 'GET') {
        return json(response, 200, workspace.geographicInstalledBase({
          region: url.searchParams.get('region'),
          country: url.searchParams.get('country'),
          city: url.searchParams.get('city'),
          modality: url.searchParams.get('modality')
        }))
      }
      const opportunityReviewMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/dismiss$/)
      if (opportunityReviewMatch && request.method === 'POST') {
        return json(response, 200, await workspace.dismissOpportunitySignal(decodeURIComponent(opportunityReviewMatch[1]), (await bodyJson(request)).reason))
      }
      const viewMatch = url.pathname.match(/^\/api\/customers\/([^/]+)\/view$/)
      if (viewMatch && request.method === 'GET') return json(response, 200, workspace.customerView(viewMatch[1]))
      const clarificationMatch = url.pathname.match(/^\/api\/observations\/([^/]+)\/clarification$/)
      if (clarificationMatch && request.method === 'POST') {
        return json(response, 200, await workspace.clarify(clarificationMatch[1], await bodyJson(request), activeExtractor))
      }
      const correctionMatch = url.pathname.match(/^\/api\/observations\/([^/]+)\/claims\/([^/]+)\/correction$/)
      if (correctionMatch && request.method === 'POST') {
        return json(response, 200, await workspace.correctClaim(correctionMatch[1], correctionMatch[2], await bodyJson(request)))
      }
      const reviewMatch = url.pathname.match(/^\/api\/observations\/([^/]+)\/review$/)
      if (reviewMatch && request.method === 'POST') return json(response, 200, await workspace.review(reviewMatch[1], (await bodyJson(request)).decisions))
      const reconcileMatch = url.pathname.match(/^\/api\/observations\/([^/]+)\/reconcile$/)
      if (reconcileMatch && request.method === 'POST') {
        const body = await bodyJson(request)
        return json(response, 200, await workspace.reconcile(reconcileMatch[1], body.recordId, body.reason))
      }
      if (url.pathname === '/api/reset' && request.method === 'POST') {
        workspace = new WorkspaceService(await store.reset(), (state) => store.save(state))
        return json(response, 200, { reset: true })
      }
      if (url.pathname.startsWith('/api/')) return json(response, 404, { error: 'No encontrado' })
      return staticFile(response, url.pathname)
    } catch (error) {
      return json(response, 400, {
        error: error instanceof Error ? error.message : String(error),
        errorCategory: error?.category ?? (error?.name === 'AbortError' ? 'cancelled' : 'request-failed')
      })
    }
  })
  return { server, close: async () => { await closePhotoOcr(); await closeVoiceTranscription(); await closeQvac(); await new Promise((resolve) => server.close(resolve)) } }
}

export function startupErrorMessage(error, host, port) {
  if (error?.code === 'EADDRINUSE') {
    return `No se pudo iniciar el prototipo: http://${host}:${port} ya está en uso. Cierre la terminal donde se ejecuta el prototipo o seleccione otro puerto local con $env:PROTOTYPE_PORT=4174 antes de ejecutar npm.cmd start.`
  }
  return `No se pudo iniciar el prototipo: ${error instanceof Error ? error.message : String(error)}`
}

function isLocalRequest(request) {
  const host = request.headers.host ?? ''
  if (!/^127\.0\.0\.1(?::\d+)?$/.test(host)) return false
  const origin = request.headers.origin
  return origin === undefined || origin === `http://${host}`
}

async function bodyJson(request, maxBytes = 1024 * 1024) {
  return JSON.parse((await bodyBuffer(request, maxBytes)).toString('utf8') || '{}')
}

async function bodyBuffer(request, maxBytes = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) { size += chunk.length; if (size > maxBytes) throw new Error('La solicitud supera el límite permitido'); chunks.push(chunk) }
  return Buffer.concat(chunks)
}

function photoExample(response) {
  const filePath = path.join(root, 'test', 'fixtures', 'ocr', 'clear-image.png')
  response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
  return createReadStream(filePath).pipe(response)
}

function voiceExample(response) {
  const filePath = path.join(root, 'test', 'fixtures', 'transcription', 'spanish-medical-equipment.wav')
  response.writeHead(200, { 'content-type': 'audio/wav', 'cache-control': 'no-store' })
  return createReadStream(filePath).pipe(response)
}

function json(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(value))
}

function downloadJson(response, value, filename) {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store'
  })
  response.end(`${JSON.stringify(value, null, 2)}\n`)
}

async function staticFile(response, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  const filePath = path.resolve(publicDirectory, relative)
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) && filePath !== path.join(publicDirectory, 'index.html')) return json(response, 403, { error: 'Acceso denegado' })
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('La ruta no corresponde a un archivo')
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    response.writeHead(200, { 'content-type': `${types[path.extname(filePath)] ?? 'application/octet-stream'}; charset=utf-8` })
    createReadStream(filePath).pipe(response)
  } catch {
    json(response, 404, { error: 'No encontrado' })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = '127.0.0.1'
  const port = Number(process.env.PROTOTYPE_PORT || 4173)
  const app = await createPrototypeServer()
  app.server.on('error', async (error) => {
    console.error(startupErrorMessage(error, host, port))
    await closeQvac()
    process.exitCode = 1
  })
  app.server.listen(port, host, () => console.log(`Prototipo listo en http://${host}:${port}`))
  const shutdown = async () => { await app.close(); process.exit(0) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
