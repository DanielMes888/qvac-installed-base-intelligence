import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { TESSERACT_FEASIBILITY_MANIFEST } from './tesseract-feasibility-lib.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const revision = TESSERACT_FEASIBILITY_MANIFEST.tessdata.revision
const cacheDirectory = path.join(root, '.local', 'feasibility', 'ocr', 'tesseract-v2', `tessdata_fast-${revision}`)
const resultPath = path.join(root, 'results', 'feasibility', 'tesseract-acquisition-v2.json')
await mkdir(cacheDirectory, { recursive: true })

const started = performance.now()
const artifacts = []
for (const [language, declared] of Object.entries(TESSERACT_FEASIBILITY_MANIFEST.tessdata.languages)) {
  const target = path.join(cacheDirectory, declared.file)
  let downloaded = false
  if (!(await exists(target))) {
    await downloadExact(declared.source, target)
    downloaded = true
  }
  const evidence = await verifyArtifact(target, declared)
  if (!evidence.verified) throw new Error(`Tesseract model verification failed for ${declared.file}; the existing file was not overwritten`)
  artifacts.push({ language, cacheFile: declared.file, downloaded, ...evidence })
}

const result = {
  schemaVersion: 'tesseract-acquisition-v2',
  operation: 'acquire-if-missing-and-verify-exact-cache',
  verifiedAt: new Date().toISOString(),
  sourceRevision: revision,
  sourceRepository: TESSERACT_FEASIBILITY_MANIFEST.tessdata.repository,
  license: TESSERACT_FEASIBILITY_MANIFEST.tessdata.license,
  elapsedMs: performance.now() - started,
  cacheDirectory: path.relative(root, cacheDirectory).replaceAll('\\', '/'),
  artifacts,
  initialAcquisitionEvidence: 'results/feasibility/tesseract-acquisition-v2-initial.json'
}
await mkdir(path.dirname(resultPath), { recursive: true })
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(result, null, 2))

async function downloadExact(source, target) {
  const partial = `${target}.part`
  try {
    await new Promise((resolve, reject) => {
      const output = createWriteStream(partial, { flags: 'wx' })
      const request = https.get(source, { headers: { 'user-agent': 'qvac-installed-base-ocr-feasibility' } }, (response) => {
        if (response.statusCode !== 200) {
          response.resume()
          reject(new Error(`Download failed with HTTP ${response.statusCode}`))
          return
        }
        response.pipe(output)
        output.on('finish', () => output.close(resolve))
      })
      request.on('error', reject)
      output.on('error', reject)
    })
    await rename(partial, target)
  } catch (error) {
    await unlink(partial).catch(() => {})
    throw error
  }
}

async function verifyArtifact(target, declared) {
  const bytes = (await stat(target)).size
  const sha256 = createHash('sha256').update(await readFile(target)).digest('hex')
  return { bytes, sha256, source: declared.source, verified: bytes === declared.bytes && sha256 === declared.sha256 }
}

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}
