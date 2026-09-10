import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { FileStore } from './core/file-store.mjs'
import { WorkspaceService } from './core/workspace-service.mjs'
import { QVAC_CONFIGURATION, closeQvac, extractEquipmentDraft } from './qvac/adapter.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDirectory = path.join(root, 'public')

export async function createPrototypeServer({
  workspacePath = path.join(root, '.local', 'workspace.json'),
  extractor = (note) => extractEquipmentDraft(note, { mode: 'simple-json', maxAttempts: 2 })
} = {}) {
  const store = new FileStore({ seedPath: path.join(root, 'data', 'prototype', 'seed.json'), workspacePath })
  let workspace = new WorkspaceService(await store.load(), (state) => store.save(state))

  const server = createServer(async (request, response) => {
    try {
      if (!isLocalRequest(request)) return json(response, 403, { error: 'Local origin required' })
      const url = new URL(request.url, 'http://127.0.0.1')
      if (url.pathname === '/api/health') return json(response, 200, { ok: true, localOnly: true, qvac: QVAC_CONFIGURATION })
      if (url.pathname === '/api/bootstrap' && request.method === 'GET') {
        const state = workspace.snapshot()
        return json(response, 200, { label: state.label, customers: state.customers, aggregate: workspace.aggregate(), qvac: QVAC_CONFIGURATION })
      }
      if (url.pathname === '/api/observations' && request.method === 'POST') {
        const body = await bodyJson(request)
        const observation = await workspace.capture(body.customerId, body.text, extractor)
        return json(response, 201, observation)
      }
      const viewMatch = url.pathname.match(/^\/api\/customers\/([^/]+)\/view$/)
      if (viewMatch && request.method === 'GET') return json(response, 200, workspace.customerView(viewMatch[1]))
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
      if (url.pathname.startsWith('/api/')) return json(response, 404, { error: 'Not found' })
      return staticFile(response, url.pathname)
    } catch (error) {
      return json(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  })
  return { server, close: async () => { await closeQvac(); await new Promise((resolve) => server.close(resolve)) } }
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

async function staticFile(response, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  const filePath = path.resolve(publicDirectory, relative)
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) && filePath !== path.join(publicDirectory, 'index.html')) return json(response, 403, { error: 'Forbidden' })
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('Not a file')
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    response.writeHead(200, { 'content-type': `${types[path.extname(filePath)] ?? 'application/octet-stream'}; charset=utf-8` })
    createReadStream(filePath).pipe(response)
  } catch {
    json(response, 404, { error: 'Not found' })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = '127.0.0.1'
  const port = Number(process.env.PROTOTYPE_PORT || 4173)
  const app = await createPrototypeServer()
  app.server.listen(port, host, () => console.log(`Prototype ready at http://${host}:${port}`))
  const shutdown = async () => { await app.close(); process.exit(0) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
