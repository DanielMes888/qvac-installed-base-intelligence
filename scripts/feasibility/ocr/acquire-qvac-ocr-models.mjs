import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { OCR_CRAFT, OCR_LATIN, close, getLoadedModelInfo, loadModel, unloadModel } from '@qvac/sdk'

import { OCR_MODEL_MANIFEST } from './ocr-model-manifest.mjs'

const expected = [OCR_CRAFT, OCR_LATIN].map(({ name, modelId, expectedSize, sha256Checksum, src }) => ({
  name,
  modelId,
  expectedSize,
  sha256Checksum,
  src
}))
for (const [descriptor, declared] of [[OCR_CRAFT, OCR_MODEL_MANIFEST.detector], [OCR_LATIN, OCR_MODEL_MANIFEST.recognizer]]) {
  if (descriptor.name !== declared.descriptor || descriptor.modelId !== declared.filename || descriptor.expectedSize !== declared.expectedSize || descriptor.sha256Checksum !== declared.sha256) {
    throw new Error(`Pinned OCR manifest no longer matches QVAC descriptor ${descriptor.name}`)
  }
}
console.log(JSON.stringify({ phase: 'pre-acquisition-review', manifest: OCR_MODEL_MANIFEST, expected }, null, 2))

let modelId
try {
  const started = performance.now()
  const reportedPercentages = new Map()
  modelId = await loadModel({
    modelSrc: OCR_LATIN,
    modelConfig: {
      detectorModelSrc: OCR_CRAFT,
      pipelineType: 'easyocr',
      langList: ['en'],
      backendDevice: 'cpu',
      nThreads: 6,
      contrastRetry: true,
      defaultRotationAngles: [90, 270]
    },
    onProgress(progress) {
      const bucket = Math.min(100, Math.floor((progress.percentage ?? 0) / 10) * 10)
      if (reportedPercentages.get(progress.downloadKey) !== bucket) {
        reportedPercentages.set(progress.downloadKey, bucket)
        console.log(JSON.stringify({ phase: 'acquisition-progress', progress: { ...progress, reportedBucket: bucket } }))
      }
    }
  })
  const loaded = await getLoadedModelInfo({ modelId })
  const cacheDirectory = path.join(homedir(), '.qvac', 'models')
  const cachedFiles = await findNamedFiles(cacheDirectory, new Set(expected.map(({ modelId: filename }) => filename)))
  console.log(JSON.stringify({
    phase: 'acquisition-complete',
    elapsedMs: performance.now() - started,
    modelId,
    loaded,
    cachedFiles
  }, null, 2))
} finally {
  if (modelId) await unloadModel({ modelId, clearStorage: false }).catch(() => {})
  await close().catch(() => {})
}

async function findNamedFiles(directory, names) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findNamedFiles(target, names))
    else if ([...names].some((name) => entry.name === name || entry.name.endsWith(`_${name}`))) found.push({ path: target, size: (await stat(target)).size })
  }
  return found.sort((left, right) => left.path.localeCompare(right.path))
}
