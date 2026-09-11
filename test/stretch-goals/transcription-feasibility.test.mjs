import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifestUrl = new URL('../fixtures/transcription/manifest.json', import.meta.url)
const resultUrl = new URL('../../results/feasibility/transcription-local-feasibility.json', import.meta.url)

test('frozen Spanish voice fixture has a bounded real-transcription contract', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
  assert.equal(manifest.synthetic, true)
  assert.equal(manifest.language, 'es-MX')
  assert.equal(manifest.maxDurationSeconds, 60)
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/)
  assert.ok(manifest.requiredTokens.length >= 4)
})

test('feasibility evidence records two real local runs, reuse, cleanup and bounded limitations', async () => {
  const result = JSON.parse(await readFile(resultUrl, 'utf8'))
  assert.equal(result.outcome, 'local transcription feasibility passed')
  assert.equal(result.engine.sdk, '@qvac/sdk 0.19.0')
  assert.equal(result.engine.model, 'WHISPER_TINY_Q8_0')
  assert.equal(result.engine.expectedModelBytes, 43537433)
  assert.equal(result.runs.length, 2)
  assert.equal(result.runs.every(({ realTranscription, elapsedMs, text }) => realTranscription && elapsedMs > 0 && text.length > 0), true)
  assert.equal(result.reuse.loadCount, 1)
  assert.equal(result.networkBoundary.observedAttemptCount, 0)
  assert.equal(result.cleanup.temporaryFilesRemoved, true)
  assert.equal(result.cleanup.modelUnloaded, true)
  assert.equal(result.workspace.unchanged, true)
  assert.ok(result.quality.tokenRecall > 0)
  assert.ok(result.limitations.length > 0)
})

test('feasibility harness uses QVAC transcription and never Web Speech or filename-derived text', async () => {
  const source = await readFile(new URL('../../scripts/feasibility/transcription/run-local-transcription-feasibility.mjs', import.meta.url), 'utf8')
  assert.match(source, /transcribe\(/)
  assert.match(source, /WHISPER_TINY_Q8_0/)
  assert.match(source, /installNetworkDeny/)
  assert.doesNotMatch(source, /SpeechRecognition|webkitSpeechRecognition/)
  assert.doesNotMatch(source, /includes\([^)]*file|basename\([^)]*===/)
})
