import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'feasibility', 'e4-topology-probe.json')
await mkdir(path.dirname(resultPath), { recursive: true })
const require = createRequire(import.meta.url)
const sdkPackage = JSON.parse(await readFile(require.resolve('@qvac/sdk/package'), 'utf8'))

const electronProbe = {
  sdkForgeExportResolvable: false,
  forgeExportPath: null,
  forgePeerDependency: sdkPackage.peerDependencies?.['@electron-forge/plugin-base'] ?? null,
  importError: null
}

try {
  electronProbe.forgeExportPath = require.resolve('@qvac/sdk/electron-forge')
  electronProbe.sdkForgeExportResolvable = true
} catch (error) {
  electronProbe.importError = error instanceof Error ? error.message : String(error)
}

const loopbackProbe = await probeLoopbackOnlyHost()
const result = {
  schemaVersion: 'e4-topology-probe-v1',
  observedAt: new Date().toISOString(),
  qvacSdk: sdkPackage.version,
  scope: 'No Electron or browser UI was built. This checks only SDK packaging surface and loopback host mechanics.',
  electron: electronProbe,
  browserNativeHost: loopbackProbe
}
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ resultPath, result }, null, 2))

async function probeLoopbackOnlyHost() {
  const expectedOrigin = 'http://127.0.0.1:4173'
  const server = createServer((request, response) => {
    if (request.headers.origin !== expectedOrigin) {
      response.writeHead(403).end('forbidden')
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  try {
    const accepted = await fetch(`http://127.0.0.1:${address.port}`, {
      headers: { origin: expectedOrigin }
    })
    const rejected = await fetch(`http://127.0.0.1:${address.port}`, {
      headers: { origin: 'http://example.invalid' }
    })
    return {
      boundAddress: address.address,
      addressFamily: address.family,
      acceptedLocalOriginStatus: accepted.status,
      rejectedForeignOriginStatus: rejected.status,
      shutdownWithProbe: true
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}
