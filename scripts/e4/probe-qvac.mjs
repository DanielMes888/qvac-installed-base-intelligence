import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { close, downloadAsset, getModelInfo, getSystemResources } from '@qvac/sdk'

import { verifyFrozenArtifacts } from './artifacts.mjs'
import {
  MODEL_DESCRIPTOR,
  extractDraftClaims,
  loadExtractionModel,
  unloadExtractionModel
} from './qvac-extraction.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultsDirectory = path.join(root, 'results', 'feasibility')
const resultPath = path.join(resultsDirectory, 'e4-acquisition-probe.json')
await mkdir(resultsDirectory, { recursive: true })

const frozen = await verifyFrozenArtifacts(root)
if (!frozen.valid) throw new Error(`Frozen artifacts invalid: ${frozen.errors.join('; ')}`)

const prompt = await readFile(path.join(root, 'prompts/e4-equipment-extraction-v1.txt'), 'utf8')
const schema = JSON.parse(await readFile(path.join(root, 'schemas/e4-draft-claim-set.schema.json'), 'utf8'))
const startedAt = new Date().toISOString()
const probe = {
  schemaVersion: 'e4-acquisition-probe-v1',
  startedAt,
  endedAt: null,
  node: process.version,
  qvacSdk: '0.19.0',
  model: frozen.manifest.model,
  acquisition: null,
  coldLoad: null,
  resourcesBefore: null,
  resourcesAfter: null,
  modelInfoBefore: null,
  modelInfoAfter: null,
  loadedModelInfo: null,
  cacheChecksum: null,
  extraction: null,
  failure: null
}

let modelId = null
try {
  probe.resourcesBefore = await getSystemResources({ sample: true })
  probe.modelInfoBefore = await getModelInfo({ name: MODEL_DESCRIPTOR.name })

  const progressMilestones = []
  let lastMilestone = -10
  const downloadStarted = performance.now()
  await downloadAsset({
    assetSrc: MODEL_DESCRIPTOR,
    seed: false,
    onProgress(progress) {
      const milestone = Math.min(100, Math.floor(progress.percentage / 10) * 10)
      if (milestone > lastMilestone || progress.percentage >= 100) {
        lastMilestone = milestone
        progressMilestones.push({
          percentage: progress.percentage,
          downloadedBytes: progress.downloaded,
          totalBytes: progress.total,
          observedAt: new Date().toISOString()
        })
      }
    }
  })
  probe.acquisition = {
    elapsedMs: performance.now() - downloadStarted,
    progressMilestones
  }

  const loaded = await loadExtractionModel()
  modelId = loaded.modelId
  probe.coldLoad = { elapsedMs: loaded.loadMs }
  probe.loadedModelInfo = loaded.loadedModel
  probe.resourcesAfter = await getSystemResources({ sample: true })
  probe.modelInfoAfter = await getModelInfo({ name: MODEL_DESCRIPTOR.name })

  const cacheFile = probe.modelInfoAfter.cacheFiles.find((file) => file.isCached)
  if (cacheFile?.path) {
    probe.cacheChecksum = {
      path: cacheFile.path,
      expectedSha256: cacheFile.sha256Checksum,
      actualSha256: await hashFile(cacheFile.path)
    }
  }

  probe.extraction = await extractDraftClaims({
    modelId,
    note: frozen.dataset.notes[0].text,
    noteId: frozen.dataset.notes[0].id,
    prompt,
    schema,
    attemptNumber: 1
  })
} catch (error) {
  probe.failure = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { name: 'UnknownError', message: String(error) }
} finally {
  if (modelId) {
    try {
      await unloadExtractionModel(modelId)
    } catch (error) {
      probe.unloadFailure = error instanceof Error ? error.message : String(error)
    }
  }
  await close().catch(() => {})
  probe.endedAt = new Date().toISOString()
  await writeFile(resultPath, `${JSON.stringify(probe, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify({
  resultPath,
  failure: probe.failure,
  acquisitionMs: probe.acquisition?.elapsedMs ?? null,
  coldLoadMs: probe.coldLoad?.elapsedMs ?? null,
  extractionStatus: probe.extraction?.status ?? null,
  extractionMetrics: probe.extraction?.metrics ?? null,
  cacheChecksumMatches: probe.cacheChecksum
    ? probe.cacheChecksum.actualSha256 === probe.cacheChecksum.expectedSha256
    : null
}, null, 2))

if (probe.failure || probe.extraction?.status !== 'succeeded') process.exitCode = 1

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}
