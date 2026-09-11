import test from 'node:test'
import assert from 'node:assert/strict'

import { finalizeMediaRecording, normalizeBrowserAudio, selectMediaRecorderMimeType } from '../../public/voice-audio.js'

test('microphone tracks stop only after the recorder emits its final stop event', async () => {
  const events = []
  const chunks = [new Blob([new Uint8Array(512)], { type: 'audio/webm;codecs=opus' })]
  const recorder = new FakeMediaRecorder(events)
  const stream = { getTracks: () => [{ stop: () => events.push('track.stop') }] }

  const result = await finalizeMediaRecording({
    recorder,
    stream,
    chunks,
    selectedMimeType: 'audio/webm;codecs=opus',
    durationMs: 1_250
  })

  assert.deepEqual(events, ['requestData', 'recorder.stop', 'recorder.stop-event', 'track.stop'])
  assert.equal(result.blob.type, 'audio/webm;codecs=opus')
  assert.equal(result.blob.size, 512)
  assert.equal(result.durationMs, 1_250)
})

test('Chrome or Edge WebM Opus recording is converted to the validated mono PCM WAV boundary', async () => {
  const supported = []
  const selectedMimeType = selectMediaRecorderMimeType({
    isTypeSupported(value) {
      supported.push(value)
      return value === 'audio/webm;codecs=opus'
    }
  })
  assert.equal(selectedMimeType, 'audio/webm;codecs=opus')
  assert.deepEqual(supported, ['audio/webm;codecs=opus'])

  const source = new Blob([new Uint8Array(2_048)], { type: selectedMimeType })
  const normalized = await normalizeBrowserAudio(source, {
    AudioContextClass: FakeAudioContext,
    OfflineAudioContextClass: FakeOfflineAudioContext
  })
  const bytes = Buffer.from(await normalized.blob.arrayBuffer())

  assert.equal(normalized.sourceMimeType, 'audio/webm;codecs=opus')
  assert.equal(normalized.sourceSizeBytes, 2_048)
  assert.equal(normalized.targetMimeType, 'audio/wav')
  assert.equal(normalized.sampleRateHz, 16_000)
  assert.equal(normalized.channels, 1)
  assert.equal(normalized.bitsPerSample, 16)
  assert.equal(normalized.durationSeconds, 1)
  assert.equal(normalized.sizeBytes, 32_044)
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE')
  assert.equal(bytes.readUInt16LE(20), 1)
  assert.equal(bytes.readUInt16LE(22), 1)
  assert.equal(bytes.readUInt32LE(24), 16_000)
  assert.equal(bytes.readUInt16LE(34), 16)
})

class FakeAudioContext {
  async decodeAudioData() {
    const left = new Float32Array(48_000).fill(0.25)
    const right = new Float32Array(48_000).fill(0.75)
    return {
      duration: 1,
      length: 48_000,
      numberOfChannels: 2,
      sampleRate: 48_000,
      getChannelData(channel) { return channel === 0 ? left : right }
    }
  }

  async close() {}
}

class FakeOfflineAudioContext {
  constructor(channels, length, sampleRate) {
    assert.equal(channels, 1)
    assert.equal(length, 16_000)
    assert.equal(sampleRate, 16_000)
    this.length = length
    this.sampleRate = sampleRate
    this.destination = {}
  }

  createBuffer(_channels, length, sampleRate) {
    const samples = new Float32Array(length)
    return { sampleRate, getChannelData() { return samples } }
  }

  createBufferSource() {
    return { connect() {}, start() {} }
  }

  async startRendering() {
    const samples = new Float32Array(this.length).fill(0.5)
    return { sampleRate: this.sampleRate, getChannelData() { return samples } }
  }
}

class FakeMediaRecorder extends EventTarget {
  constructor(events) {
    super()
    this.events = events
    this.state = 'recording'
    this.mimeType = 'audio/webm;codecs=opus'
  }

  requestData() { this.events.push('requestData') }

  stop() {
    this.events.push('recorder.stop')
    this.state = 'inactive'
    queueMicrotask(() => {
      this.events.push('recorder.stop-event')
      this.dispatchEvent(new Event('stop'))
    })
  }
}
