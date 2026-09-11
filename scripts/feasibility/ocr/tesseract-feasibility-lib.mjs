import path from 'node:path'

import { OCR_FEASIBILITY_POLICY } from './ocr-feasibility-lib.mjs'

export const TESSERACT_FEASIBILITY_MANIFEST = Object.freeze({
  schemaVersion: 'local-ocr-feasibility-tesseract-v2',
  requiredCaseIds: OCR_FEASIBILITY_POLICY.requiredCaseIds,
  diagnosticCaseIds: OCR_FEASIBILITY_POLICY.diagnosticCaseIds,
  package: Object.freeze({
    name: 'tesseract.js',
    version: '7.0.0',
    repositoryRevision: 'b5cff0bca691a99ff69f1b162184e6c5a78629ef',
    license: 'Apache-2.0',
    npmUnpackedBytes: 1411341,
    npmIntegrity: 'sha512-exPBkd+z+wM1BuMkx/Bjv43OeLBxhL5kKWsz/9JY+DXcXdiBjiAch0V49QR3oAJqCaL5qURE0vx9Eo+G5YE7mA==',
    installedTreeSha256: '8bc813c179d0b986123ae47f90fac442763dc54c90f37cce37d99798df0a11d9'
  }),
  core: Object.freeze({
    name: 'tesseract.js-core',
    version: '7.0.0',
    repositoryRevision: 'acffef2b66eb44a31df297e11d905f4b39001068',
    license: 'Apache-2.0',
    npmUnpackedBytes: 45262431,
    npmIntegrity: 'sha512-WnNH518NzmbSq9zgTPeoF8c+xmilS8rFIl1YKbk/ptuuc7p6cLNELNuPAzcmsYw450ca6bLa8j3t0VAtq435Vw==',
    installedTreeSha256: 'd908999751e0ca0c59ea342c4982fdf3b277ada2502e601399bc7544d42e259b'
  }),
  runtimeFiles: Object.freeze({
    offlineWorker: Object.freeze({ bytes: 231, sha256: '070081510e806489937368545a6eb1f62d2fd886175490353fccf67aa09918cf' }),
    networkBoundaries: Object.freeze({ bytes: 1783, sha256: '49a6a4970af9eca122202d36c84b37536da3ba8b7ace29c1758b74bd802e5853' }),
    nodeWorkerEntry: Object.freeze({ bytes: 771, sha256: 'a973c23ce067bc752c0bf602297eac843098e531ac03f3ea34cdf694326a6d02' }),
    relaxedSimdLstmWrapper: Object.freeze({ bytes: 89360, sha256: 'a37ac78b707e8d5d3d2e532cc3c4e69b04d127ea44a608f1e7de17640402aa5c' }),
    relaxedSimdLstmWasm: Object.freeze({ bytes: 2862266, sha256: '7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545' })
  }),
  tessdata: Object.freeze({
    repository: 'tesseract-ocr/tessdata_fast',
    revision: '87416418657359cb625c412a48b6e1d6d41c29bd',
    license: 'Apache-2.0',
    licenseSource: 'https://github.com/tesseract-ocr/tessdata_fast/blob/87416418657359cb625c412a48b6e1d6d41c29bd/LICENSE',
    languages: Object.freeze({
      eng: Object.freeze({
        file: 'eng.traineddata',
        bytes: 4113088,
        sha256: '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
        source: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/87416418657359cb625c412a48b6e1d6d41c29bd/eng.traineddata'
      }),
      spa: Object.freeze({
        file: 'spa.traineddata',
        bytes: 2294433,
        sha256: '6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464',
        source: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/87416418657359cb625c412a48b6e1d6d41c29bd/spa.traineddata'
      })
    })
  })
})

export function assertLocalTesseractRuntime(runtime, approvedRoots) {
  for (const [name, value] of Object.entries(runtime)) {
    if (typeof value !== 'string' || /^https?:\/\//i.test(value) || !path.isAbsolute(value)) {
      throw new Error(`${name} must be an absolute local path`)
    }
    const resolved = path.resolve(value).toLowerCase()
    const permitted = approvedRoots.some((root) => {
      const approved = path.resolve(root).toLowerCase()
      return resolved === approved || resolved.startsWith(`${approved}${path.sep}`)
    })
    if (!permitted) throw new Error(`${name} is outside an approved root`)
  }
  return runtime
}

export function median(sample) {
  if (!Array.isArray(sample) || sample.length === 0) throw new Error('Median requires a non-empty sample')
  const ordered = [...sample].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 1 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

export async function captureOcrFixtureOutcome(fixture, operation, now = performance.now.bind(performance)) {
  const started = now()
  try {
    const value = await operation()
    return { ...value, elapsedMs: now() - started, error: null }
  } catch (error) {
    return {
      recognizedText: '',
      elapsedMs: now() - started,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      temporaryFilesRemoved: error?.temporaryFilesRemoved === true
    }
  }
}
