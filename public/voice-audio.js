const TARGET_SAMPLE_RATE_HZ = 16_000
const MAX_DURATION_SECONDS = 60

const RECORDER_MIME_TYPES = Object.freeze([
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4'
])

export function selectMediaRecorderMimeType(MediaRecorderClass = globalThis.MediaRecorder) {
  if (typeof MediaRecorderClass?.isTypeSupported !== 'function') return ''
  return RECORDER_MIME_TYPES.find((mimeType) => MediaRecorderClass.isTypeSupported(mimeType)) ?? ''
}

export function finalizeMediaRecording({ recorder, stream, chunks, selectedMimeType, durationMs }) {
  if (!recorder || recorder.state !== 'recording') return Promise.reject(audioError('recorder-inactive', 'No hay una grabación activa para detener'))
  return new Promise((resolve, reject) => {
    const cleanupTracks = () => stream?.getTracks().forEach((track) => track.stop())
    recorder.addEventListener('stop', () => {
      cleanupTracks()
      const mimeType = recorder.mimeType || selectedMimeType || 'application/octet-stream'
      const blob = new Blob(chunks, { type: mimeType })
      resolve(Object.freeze({ blob, durationMs, mimeType, sizeBytes: blob.size }))
    }, { once: true })
    recorder.addEventListener('error', (event) => {
      cleanupTracks()
      reject(audioError('recording-failed', 'El navegador no pudo completar la grabación', event.error))
    }, { once: true })
    try {
      recorder.requestData?.()
    } catch {
      // stop() still requests the final MediaRecorder chunk.
    }
    recorder.stop()
  })
}

export async function normalizeBrowserAudio(blob, {
  AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
  OfflineAudioContextClass = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext
} = {}) {
  if (!(blob instanceof Blob) || blob.size === 0) throw audioError('empty-audio', 'La grabación no contiene audio')
  if (!AudioContextClass || !OfflineAudioContextClass) throw audioError('conversion-unavailable', 'Este navegador no permite convertir la grabación al formato local requerido')

  const context = new AudioContextClass()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    const durationSeconds = Number(decoded.duration)
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw audioError('empty-audio', 'La grabación no contiene audio utilizable')
    if (durationSeconds > MAX_DURATION_SECONDS + 0.05) throw audioError('duration-limit', 'La grabación supera el límite de 60 segundos')

    const outputLength = Math.ceil(durationSeconds * TARGET_SAMPLE_RATE_HZ)
    const offline = new OfflineAudioContextClass(1, outputLength, TARGET_SAMPLE_RATE_HZ)
    const mono = offline.createBuffer(1, decoded.length, decoded.sampleRate)
    const mixed = mono.getChannelData(0)
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const source = decoded.getChannelData(channel)
      for (let index = 0; index < source.length; index += 1) mixed[index] += source[index] / decoded.numberOfChannels
    }
    const node = offline.createBufferSource()
    node.buffer = mono
    node.connect(offline.destination)
    node.start()
    const wave = pcmToWave(await offline.startRendering())
    return Object.freeze({
      blob: wave,
      sourceMimeType: blob.type || 'application/octet-stream',
      sourceSizeBytes: blob.size,
      targetMimeType: 'audio/wav',
      sizeBytes: wave.size,
      durationSeconds,
      sampleRateHz: TARGET_SAMPLE_RATE_HZ,
      channels: 1,
      bitsPerSample: 16
    })
  } catch (error) {
    if (error?.category) throw error
    throw audioError('conversion-failed', 'El navegador no pudo convertir la grabación a WAV PCM. Vuelva a grabar y hable cerca del micrófono.', error)
  } finally {
    await context.close()
  }
}

function pcmToWave(buffer) {
  const samples = buffer.getChannelData(0)
  const output = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(output)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(view, 8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return new Blob([output], { type: 'audio/wav' })
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
}

function audioError(category, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined)
  error.category = category
  return error
}
