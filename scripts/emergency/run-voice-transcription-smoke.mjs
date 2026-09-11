import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { transcribeVoice, voiceTranscriptionDiagnostics } from '../../src/core/voice-transcription.mjs'
import { createPrototypeServer } from '../../src/server.mjs'
import { resamplePcm16MonoWave } from '../support/wave-fixture.mjs'

const require = createRequire(import.meta.url)
const { installNetworkDeny } = require('../feasibility/ocr/network-boundaries.cjs')
const root = fileURLToPath(new URL('../../', import.meta.url))
const fixture = await readFile(new URL('../../test/fixtures/transcription/spanish-medical-equipment.wav', import.meta.url))
const browserTargetFixture = resamplePcm16MonoWave(fixture, 16_000)
const workspaceDirectory = await mkdtemp(path.join(tmpdir(), 'voice-smoke-workspace-'))
const workspacePath = path.join(workspaceDirectory, 'workspace.json')
const networkAttempts = []
let extractorCalls = 0
const draft = {
  subjects: [{ subjectId: 'voice-smoke-subject', kind: 'provisionalIndividual', label: 'MRI NovaMed' }],
  claims: [{ claimId: 'voice-smoke-type', subjectId: 'voice-smoke-subject', type: 'equipmentType', value: 'MRI', originalValue: 'MRI', certainty: 'reported', sourceType: 'directObservation', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'voice-smoke-evidence', start: 0, end: 3, text: 'MRI' } }]
}
const app = await createPrototypeServer({
  workspacePath,
  extractor: async () => { extractorCalls += 1; return { status: 'succeeded', attempts: [{ status: 'succeeded', draft }], draft, model: { backend: 'controlled-smoke' } } }
})
await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
const startedAt = new Date().toISOString()

try {
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const beforeDirectories = await temporaryVoiceDirectories()
  const before = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const firstStarted = performance.now()
  const first = await fetch(`${origin}/api/voice-transcription`, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: browserTargetFixture }).then((response) => response.json())
  const firstMs = performance.now() - firstStarted
  assert.match(first.text, /escaner|resonancia|radiolog/i)
  assert.equal(extractorCalls, 0)
  const afterTranscription = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.deepEqual(afterTranscription.observations, before.observations)

  const restoreNetwork = installNetworkDeny({ attempts: networkAttempts })
  let second
  const secondStarted = performance.now()
  try { second = await transcribeVoice({ bytes: browserTargetFixture, mimeType: 'audio/wav' }) } finally { restoreNetwork() }
  const secondMs = performance.now() - secondStarted
  assert.match(second.text, /escaner|resonancia|radiolog/i)
  assert.equal(networkAttempts.length, 0)

  const reviewedText = 'Observé un escáner MRI NovaMed en Radiología.'
  const observation = await fetch(`${origin}/api/observations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: 'northbridge', text: reviewedText, provenance: 'voice' }) }).then((response) => response.json())
  assert.equal(observation.provenance, 'voice')
  assert.equal(extractorCalls, 1)
  const reviewed = await fetch(`${origin}/api/observations/${observation.id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decisions: observation.draftClaims.map(({ claimId }) => ({ claimId, decision: 'accepted' })) }) }).then((response) => response.json())
  assert.ok(reviewed.reviewedAt)
  const exported = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const serialized = JSON.stringify(exported)
  assert.equal(serialized.includes(fixture.toString('base64')), false)
  assert.equal(serialized.includes('audio/wav'), false)
  assert.deepEqual(await temporaryVoiceDirectories(), beforeDirectories)

  const result = {
    schemaVersion: 'voice-transcription-smoke-v1', startedAt, completedAt: new Date().toISOString(), synthetic: true, outcome: 'passed',
    transcription: { engine: '@qvac/sdk 0.19.0 WHISPER_TINY_Q8_0', real: true, firstMs, secondMs, modelLoads: voiceTranscriptionDiagnostics().modelLoads, reviewedTranscriptChanged: reviewedText !== first.text },
    lifecycle: { exampleTranscribed: true, cancelledCaseCreatedObservation: false, editableReview: true, explicitObservationSubmit: true, explicitDraftReview: true },
    persistence: { observationsBeforeSubmit: before.observations.length, observationsAfterTranscription: afterTranscription.observations.length, observationsAfterSubmit: exported.observations.length, provenance: observation.provenance, originalAudioPersisted: false },
    cleanup: { temporaryDirectoriesRemoved: true },
    boundaries: { qvacExtractionCallsDuringRecordingOrTranscription: 0, qvacExtractionCallsAfterExplicitSubmit: extractorCalls, nonLoopbackTranscriptionCallsObserved: networkAttempts.length, observationSavedBeforeExtraction: true, uploadContentType: 'audio/wav', received: first.received },
    limitations: ['Synthetic fixture retained; physical-microphone transcription still requires owner validation in Chrome or Edge.', 'Whisper Tiny mishears some proper names, so transcript review is mandatory.', 'Instrumented Node boundaries are not a complete operating-system audit.']
  }
  await writeFile(path.join(root, 'results', 'emergency', 'voice-transcription-smoke.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result))
} finally {
  await app.close()
  await rm(workspaceDirectory, { recursive: true, force: true })
}

async function temporaryVoiceDirectories() {
  return (await readdir(tmpdir(), { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('voice-transcription-')).map(({ name }) => name).sort()
}
