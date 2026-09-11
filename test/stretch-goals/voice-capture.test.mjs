import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  closeVoiceTranscription,
  transcribeVoice,
  voiceTranscriptionDiagnostics,
  VOICE_LIMITS
} from '../../src/core/voice-transcription.mjs'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { createPrototypeServer } from '../../src/server.mjs'
import { resamplePcm16MonoWave } from '../../scripts/support/wave-fixture.mjs'

const fixture = await readFile(new URL('../fixtures/transcription/spanish-medical-equipment.wav', import.meta.url))
const browserTargetFixture = resamplePcm16MonoWave(fixture, 16_000)

test.after(closeVoiceTranscription)

test('real Spanish audio is transcribed locally and one loaded model is reused', async () => {
  const startsBefore = voiceTranscriptionDiagnostics().modelLoads
  const first = await transcribeVoice({ bytes: browserTargetFixture, mimeType: 'audio/wav' })
  const second = await transcribeVoice({ base64: fixture.toString('base64'), mimeType: 'audio/wav' })
  assert.match(first.text, /escaner|resonancia|radiolog/i)
  assert.match(second.text, /escaner|resonancia|radiolog/i)
  assert.equal(first.temporary, true)
  assert.equal(first.engine, 'QVAC Whisper Tiny')
  assert.deepEqual(first.received, {
    mimeType: 'audio/wav',
    sizeBytes: browserTargetFixture.length,
    format: 'PCM',
    channels: 1,
    bitsPerSample: 16,
    sampleRateHz: 16_000,
    durationSeconds: first.durationSeconds
  })
  assert.equal(voiceTranscriptionDiagnostics().modelLoads - startsBefore, 1)
})

test('voice input rejects empty, corrupt, oversized and overlong audio', async () => {
  await assert.rejects(() => transcribeVoice({ base64: '', mimeType: 'audio/wav' }), /vacío|válido/i)
  await assert.rejects(() => transcribeVoice({ base64: Buffer.from('not-wave').toString('base64'), mimeType: 'audio/wav' }), /WAV/i)
  await assert.rejects(() => transcribeVoice({ base64: fixture.toString('base64'), mimeType: 'audio/mpeg' }), /WAV/i)
  await assert.rejects(
    () => transcribeVoice({ bytes: Buffer.from('browser-webm'), mimeType: 'audio/webm;codecs=opus' }),
    (error) => error.category === 'conversion-required' && /WAV/i.test(error.message)
  )
  await assert.rejects(() => transcribeVoice({ base64: Buffer.alloc(VOICE_LIMITS.maxBytes + 1).toString('base64'), mimeType: 'audio/wav' }), /límite/i)
  const overlong = Buffer.from(fixture)
  const dataOffset = overlong.indexOf(Buffer.from('data'))
  overlong.writeUInt32LE(VOICE_LIMITS.maxDurationSeconds * 22050 * 2 + 2, dataOffset + 4)
  await assert.rejects(() => transcribeVoice({ base64: overlong.toString('base64'), mimeType: 'audio/wav' }), /60 segundos/i)
})

test('browser-normalized WAV reaches the local transcriber as binary audio with received metadata', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'voice-upload-'))
  let received
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => ({ status: 'failed', attempts: [] }),
    transcriber: async (input) => {
      received = input
      return {
        text: 'Texto sintético',
        durationSeconds: 5.17,
        temporary: true,
        engine: 'QVAC Whisper Tiny',
        received: { mimeType: input.mimeType, sizeBytes: input.bytes.length }
      }
    }
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })

  const response = await fetch(`http://127.0.0.1:${app.server.address().port}/api/voice-transcription`, {
    method: 'POST',
    headers: { 'content-type': 'audio/wav' },
    body: fixture
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(received.mimeType, 'audio/wav')
  assert.deepEqual(received.bytes, fixture)
  assert.deepEqual(payload.received, { mimeType: 'audio/wav', sizeBytes: fixture.length })
})

test('transcription is read-only until reviewed text is explicitly submitted with voice provenance', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'voice-workspace-'))
  let extractorCalls = 0
  const draft = {
    subjects: [{ subjectId: 'voice-subject' }],
    claims: [{ claimId: 'voice-claim', subjectId: 'voice-subject', type: 'equipmentType', value: 'MRI', originalValue: 'MRI', certainty: 'reported', sourceType: 'directObservation', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'voice-evidence', start: 0, end: 3, text: 'MRI' } }]
  }
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => { extractorCalls += 1; return { status: 'succeeded', attempts: [{ status: 'succeeded', draft }], draft, model: { backend: 'controlled-test' } } },
    transcriber: async () => ({ text: 'Texto transcrito sin revisar', durationSeconds: 5.17, temporary: true, engine: 'QVAC Whisper Tiny' })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const before = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const transcription = await fetch(`${origin}/api/voice-transcription`, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: fixture }).then((response) => response.json())
  const afterTranscription = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.equal(transcription.text, 'Texto transcrito sin revisar')
  assert.equal(extractorCalls, 0)
  assert.deepEqual(afterTranscription.observations, before.observations)

  const reviewedText = 'MRI NovaMed corregido por el usuario.'
  const observation = await fetch(`${origin}/api/observations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: 'northbridge', text: reviewedText, provenance: 'voice' }) }).then((response) => response.json())
  assert.equal(observation.originalText, reviewedText)
  assert.equal(observation.provenance, 'voice')
  assert.equal(extractorCalls, 1)
  const exported = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.equal(exported.observations.at(-1).provenance, 'voice')
  assert.equal(JSON.stringify(exported).includes(fixture.toString('base64')), false)
  assert.equal(JSON.stringify(exported).includes('audio/wav'), false)
})

test('older Workspaces default missing provenance to text and accept voice as a distinct origin', async () => {
  const state = { synthetic: true, label: 'Datos sintéticos', customers: [{ id: 'c1', name: 'Cliente', site: 'Sede' }], equipmentRecords: [], evidenceEntries: [], verificationItems: [], observations: [{ id: 'old', customerId: 'c1', originalText: 'MRI', recordedAt: '2026-09-10T00:00:00.000Z', status: 'failed', attempts: [], subjects: [], draftClaims: [] }] }
  const service = new WorkspaceService(state, async () => {})
  assert.equal(service.snapshot().observations[0].provenance, 'text')
  const created = await service.capture('c1', 'MRI por voz', async () => ({ status: 'failed', attempts: [] }), { provenance: 'voice' })
  assert.equal(created.provenance, 'voice')
})

test('temporary transcription directories are removed after success and failure', async () => {
  const before = await temporaryVoiceDirectories()
  await transcribeVoice({ base64: fixture.toString('base64'), mimeType: 'audio/wav' })
  await assert.rejects(() => transcribeVoice({ base64: Buffer.from('bad').toString('base64'), mimeType: 'audio/wav' }))
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(() => transcribeVoice({ bytes: fixture, mimeType: 'audio/wav' }, { signal: controller.signal }), /cancelada/i)
  assert.deepEqual(await temporaryVoiceDirectories(), before)
})

test('observation capture contains compact text, image and voice modes with one active panel', async () => {
  const page = await readFile(new URL('../../public/index.html', import.meta.url), 'utf8')
  for (const label of ['Escribir', 'Imagen', 'Voz']) assert.match(page, new RegExp(`data-capture-method="[^"]+"[^>]*>${label}<\\/button>`))
  assert.match(page, /role="tablist"/)
  assert.match(page, /id="capture-panel-text"[^>]*data-capture-panel="text"/)
  assert.match(page, /id="capture-panel-photo"[^>]*data-capture-panel="photo"[^>]*hidden/)
  assert.match(page, /id="capture-panel-voice"[^>]*data-capture-panel="voice"[^>]*hidden/)
  assert.ok(page.indexOf('id="capture-panel-voice"') > page.indexOf('id="capture-form"'))
  assert.ok(page.indexOf('id="capture-panel-voice"') < page.indexOf('</form>'))
})

test('visible voice flow offers recording, playback, retry, example, transcription, review and cleanup', async () => {
  const page = await readFile(new URL('../../public/index.html', import.meta.url), 'utf8')
  const client = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8')
  for (const copy of ['Escribir', 'Imagen', 'Voz', 'Iniciar grabación', 'Detener', 'Escuchar', 'Volver a grabar', 'Transcribir', 'Revisa y corrige la transcripción', 'Usar como observación', 'Cancelar', 'Probar audio de ejemplo']) assert.ok(page.includes(copy), copy)
  for (const behavior of [/navigator\.mediaDevices\.getUserMedia/, /track\.stop\(\)/, /URL\.revokeObjectURL\(voiceObjectUrl\)/, /normalizeBrowserAudio/, /finalizeMediaRecording/, /captureProvenance = 'voice'/, /AbortController/, /content-type': 'audio\/wav/, /60_000/]) assert.match(client, behavior)
  assert.doesNotMatch(client, /SpeechRecognition|webkitSpeechRecognition/)
  const voiceMarkup = page.match(/<section id="capture-panel-voice"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.doesNotMatch(voiceMarkup, /WHISPER_TINY|@qvac\/sdk|modelo.*ruta|audioChunk/i)
})

test('aborting a transcription request reaches the local transcription boundary', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'voice-cancel-'))
  let cancelled = false
  const app = await createPrototypeServer({
    workspacePath: path.join(directory, 'workspace.json'),
    extractor: async () => ({ status: 'failed', attempts: [] }),
    transcriber: async (_input, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => { cancelled = true; reject(new DOMException('cancelled', 'AbortError')) }, { once: true })
      setTimeout(() => resolve({ text: 'late', temporary: true }), 2_000)
    })
  })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }) })
  const controller = new AbortController()
  const pending = fetch(`http://127.0.0.1:${app.server.address().port}/api/voice-transcription`, { method: 'POST', signal: controller.signal, headers: { 'content-type': 'audio/wav' }, body: fixture })
  setTimeout(() => controller.abort(), 25)
  await assert.rejects(pending, /abort/i)
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(cancelled, true)
})

async function temporaryVoiceDirectories() {
  return (await readdir(tmpdir(), { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('voice-transcription-')).map(({ name }) => name).sort()
}
