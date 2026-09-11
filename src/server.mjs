import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { FileStore } from './core/file-store.mjs'
import { WorkspaceService } from './core/workspace-service.mjs'
import { exportFilename } from './core/workspace-export.mjs'
import { QVAC_CONFIGURATION, closeQvac, ensureQvacReady, extractEquipmentDraft } from './qvac/adapter.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDirectory = path.join(root, 'public')

export async function createPrototypeServer({
  workspacePath = path.join(root, '.local', 'workspace.json'),
  extractor
} = {}) {
  const usesLocalQvac = extractor === undefined
  const activeExtractor = extractor ?? ((note) => extractEquipmentDraft(note, { mode: 'simple-json-object', maxAttempts: 2 }))
  if (usesLocalQvac) await ensureQvacReady()
  const store = new FileStore({ seedPath: path.join(root, 'data', 'prototype', 'seed.json'), workspacePath })
  let workspace = new WorkspaceService(await store.load(), (state) => store.save(state))

  const server = createServer(async (request, response) => {
    try {
      if (!isLocalRequest(request)) return json(response, 403, { error: 'Se requiere un origen local' })
      const url = new URL(request.url, 'http://127.0.0.1')
      if (url.pathname === '/api/health') return json(response, 200, { ok: true, localOnly: true, qvac: QVAC_CONFIGURATION })
      if (url.pathname === '/api/bootstrap' && request.method === 'GET') {
        const state = workspace.snapshot()
        return json(response, 200, { label: state.label, customers: state.customers, aggregate: workspace.aggregate(), qvac: QVAC_CONFIGURATION })
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
        const observation = await workspace.capture(body.customerId, body.text, activeExtractor, { observationDate: body.observationDate })
        return json(response, 201, observation)
      }
      if (url.pathname === '/api/verifications' && request.method === 'GET') {
        return json(response, 200, workspace.verificationItems({
          priority: url.searchParams.get('priority') || undefined,
          customerId: url.searchParams.get('customerId') || undefined,
          equipmentRecordId: url.searchParams.get('equipmentRecordId') || undefined,
          reasonCode: url.searchParams.get('reasonCode') || undefined
        }))
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
      return json(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  })
  return { server, close: async () => { await closeQvac(); await new Promise((resolve) => server.close(resolve)) } }
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

async function bodyJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
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
