import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  WHISPER_TINY_Q8_0,
  cancel,
  getLoadedModelInfo,
  getModelInfo,
  loadModel,
  transcribe,
  unloadModel
} from '@qvac/sdk'

const MAX_DURATION_SECONDS = 60
const MAX_BYTES = 8 * 1024 * 1024

let modelPromise
let loadedModel
let modelLoads = 0
const activeRequestIds = new Set()

export const VOICE_LIMITS = Object.freeze({
  maxBytes: MAX_BYTES,
  maxDurationSeconds: MAX_DURATION_SECONDS,
  acceptedMimeTypes: ['audio/wav', 'audio/wave', 'audio/x-wav']
})

export class VoiceTranscriptionError extends Error {
  constructor(category, message, options) {
    super(message, options)
    this.name = 'VoiceTranscriptionError'
    this.category = category
  }
}

export async function transcribeVoice({ base64, bytes: inputBytes, mimeType }, { signal } = {}) {
  const bytes = decodeAudio({ base64, bytes: inputBytes })
  const wave = inspectWave(bytes, mimeType)
  const taskDirectory = await mkdtemp(path.join(tmpdir(), 'voice-transcription-'))
  const filePath = path.join(taskDirectory, `${randomUUID()}.wav`)
  let run
  let cancelOnAbort
  try {
    if (signal?.aborted) throw abortError()
    await writeFile(filePath, bytes, { flag: 'wx' })
    const model = await getModel()
    if (signal?.aborted) throw abortError()
    run = transcribe({ modelId: model.modelId, audioChunk: filePath })
    activeRequestIds.add(run.requestId)
    cancelOnAbort = () => cancel({ requestId: run.requestId }).catch(() => {})
    signal?.addEventListener('abort', cancelOnAbort, { once: true })
    const text = String(await run).trim()
    if (signal?.aborted) throw abortError()
    if (!text) throw new VoiceTranscriptionError('no-usable-transcript', 'El audio no contiene una transcripción utilizable')
    return {
      text,
      durationSeconds: wave.durationSeconds,
      temporary: true,
      engine: 'QVAC Whisper Tiny',
      received: {
        mimeType,
        sizeBytes: bytes.length,
        format: 'PCM',
        channels: wave.channels,
        bitsPerSample: wave.bitsPerSample,
        sampleRateHz: wave.sampleRate,
        durationSeconds: wave.durationSeconds
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError' || error instanceof VoiceTranscriptionError) throw error
    throw new VoiceTranscriptionError('transcription-failed', 'La transcripción local falló. Vuelva a intentar o grabe de nuevo.', { cause: error })
  } finally {
    if (run?.requestId) activeRequestIds.delete(run.requestId)
    if (cancelOnAbort) signal?.removeEventListener('abort', cancelOnAbort)
    await rm(taskDirectory, { recursive: true, force: true })
  }
}

export async function closeVoiceTranscription() {
  await Promise.all([...activeRequestIds].map((requestId) => cancel({ requestId }).catch(() => {})))
  activeRequestIds.clear()
  if (!modelPromise) return
  const model = await modelPromise.catch(() => null)
  loadedModel = null
  modelPromise = null
  if (model?.modelId) await unloadModel({ modelId: model.modelId, clearStorage: false }).catch(() => {})
}

export function voiceTranscriptionDiagnostics() {
  return Object.freeze({ modelLoads, modelReady: Boolean(loadedModel), activeRequests: activeRequestIds.size })
}

async function getModel() {
  if (!modelPromise) {
    modelLoads += 1
    modelPromise = getModelInfo(WHISPER_TINY_Q8_0).then((info) => {
      if (!info.isCached) throw new VoiceTranscriptionError('model-unavailable', 'Los recursos del modelo local no están instalados')
      return loadModel({
        modelSrc: WHISPER_TINY_Q8_0,
        modelConfig: { language: 'es', temperature: 0, no_context: true, print_progress: false }
      })
    }).then(async (modelId) => {
      loadedModel = { modelId, info: await getLoadedModelInfo({ modelId }) }
      return loadedModel
    }).catch((error) => {
      modelPromise = null
      throw new VoiceTranscriptionError('model-unavailable', `No se pudo preparar la transcripción local. Verifique que el modelo esté instalado: ${error.message}`, { cause: error })
    })
  }
  return modelPromise
}

function decodeAudio({ base64, bytes }) {
  let decoded
  if (Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) {
    decoded = Buffer.from(bytes)
  } else if (typeof base64 === 'string' && base64 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64) && base64.length % 4 === 0) {
    decoded = Buffer.from(base64, 'base64')
  } else {
    throw new VoiceTranscriptionError('empty-audio', 'El audio está vacío o no tiene contenido válido')
  }
  if (!decoded.length) throw new VoiceTranscriptionError('empty-audio', 'El audio está vacío')
  if (decoded.length > MAX_BYTES) throw new VoiceTranscriptionError('size-limit', 'El audio supera el límite de 8 MB')
  return decoded
}

function inspectWave(bytes, mimeType) {
  if (!VOICE_LIMITS.acceptedMimeTypes.includes(mimeType)) throw new VoiceTranscriptionError('conversion-required', 'El audio del navegador debe convertirse localmente a WAV PCM antes de transcribir')
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new VoiceTranscriptionError('invalid-wav', 'El archivo WAV está vacío, corrupto o no es compatible')
  }
  let offset = 12
  let format
  let dataBytes
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    if (id === 'fmt ' && size >= 16 && start + 16 <= bytes.length) {
      format = {
        code: bytes.readUInt16LE(start),
        channels: bytes.readUInt16LE(start + 2),
        sampleRate: bytes.readUInt32LE(start + 4),
        byteRate: bytes.readUInt32LE(start + 8),
        bitsPerSample: bytes.readUInt16LE(start + 14)
      }
    }
    if (id === 'data') dataBytes = size
    if (format && dataBytes !== undefined) break
    offset = start + size + (size % 2)
  }
  if (!format || dataBytes === undefined || format.code !== 1 || format.channels !== 1 || !format.sampleRate || !format.byteRate || format.bitsPerSample !== 16) {
    throw new VoiceTranscriptionError('invalid-wav', 'El archivo WAV debe ser PCM mono de 16 bits')
  }
  const durationSeconds = dataBytes / format.byteRate
  if (durationSeconds <= 0) throw new VoiceTranscriptionError('empty-audio', 'El audio WAV está vacío')
  if (durationSeconds > MAX_DURATION_SECONDS) throw new VoiceTranscriptionError('duration-limit', 'La grabación supera el límite de 60 segundos')
  if (dataBytes > bytes.length) throw new VoiceTranscriptionError('invalid-wav', 'El archivo WAV está corrupto o incompleto')
  return { durationSeconds, channels: format.channels, sampleRate: format.sampleRate, bitsPerSample: format.bitsPerSample }
}

function abortError() {
  return new DOMException('La transcripción fue cancelada', 'AbortError')
}
