import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { recognizePhoto, closePhotoOcr, photoOcrDiagnostics, PHOTO_OCR_LIMITS } from '../../src/core/photo-ocr.mjs'
import { WorkspaceService } from '../../src/core/workspace-service.mjs'
import { createPrototypeServer } from '../../src/server.mjs'

const png = await readFile(new URL('../fixtures/ocr/clear-image.png', import.meta.url))
const jpeg = await readFile(new URL('../fixtures/ocr/clear-image.jpg', import.meta.url))
const pngBase64 = png.toString('base64')

test.after(closePhotoOcr)

test('real OCR accepts valid PNG and JPEG content and reuses one local worker', async () => {
  const startsBefore = photoOcrDiagnostics().workerStarts
  const pngResult = await recognizePhoto({ base64: pngBase64, mimeType: 'image/png' })
  const jpegResult = await recognizePhoto({ base64: jpeg.toString('base64'), mimeType: 'image/jpeg' })
  assert.match(pngResult.text, /NOVAMED|AX-700/)
  assert.match(jpegResult.text, /NOVAMED|AX-700/)
  assert.equal(pngResult.temporary, true)
  assert.equal(jpegResult.mimeType, 'image/jpeg')
  assert.equal(photoOcrDiagnostics().workerStarts - startsBefore, 1)
})

test('photo OCR rejects spoofed MIME, SVG, corrupt images, oversized payloads and excessive dimensions', async () => {
  await assert.rejects(() => recognizePhoto({ base64: pngBase64, mimeType: 'image/jpeg' }), /contenido no coincide/)
  await assert.rejects(() => recognizePhoto({ base64: Buffer.from('<svg></svg>').toString('base64'), mimeType: 'image/svg+xml' }), /Solo se permiten/)
  await assert.rejects(() => recognizePhoto({ base64: Buffer.from('not-image').toString('base64'), mimeType: 'image/png' }), /Solo se permiten/)
  await assert.rejects(() => recognizePhoto({ base64: Buffer.alloc(PHOTO_OCR_LIMITS.maxBytes + 1).toString('base64'), mimeType: 'image/png' }), /límite/)
  const excessivePng = Buffer.from(png)
  excessivePng.writeUInt32BE(PHOTO_OCR_LIMITS.maxDimension + 1, 16)
  await assert.rejects(() => recognizePhoto({ base64: excessivePng.toString('base64'), mimeType: 'image/png' }), /dimensiones/)
  const corruptJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01])
  await assert.rejects(() => recognizePhoto({ base64: corruptJpeg.toString('base64'), mimeType: 'image/jpeg' }), /JPEG/)
})

test('temporary OCR directories are removed after success and recognition error', async () => {
  const before = await temporaryOcrDirectories()
  await recognizePhoto({ base64: pngBase64, mimeType: 'image/png' })
  const truncated = png.subarray(0, 32)
  await assert.rejects(() => recognizePhoto({ base64: truncated.toString('base64'), mimeType: 'image/png' }))
  assert.deepEqual(await temporaryOcrDirectories(), before)
})

test('OCR is read-only until explicit submission, persists edited text and photo provenance, and exports no image', async (t) => {
  const workspacePath = path.join(await mkdtemp(path.join(tmpdir(), 'photo-workspace-')), 'workspace.json')
  const draft = { subjects: [{ subjectId: 'photo-subject' }], claims: [{ claimId: 'photo-claim', subjectId: 'photo-subject', type: 'equipmentType', value: 'MRI', originalValue: 'MRI', certainty: 'reported', sourceType: 'directObservation', locationScope: 'dept', quantityScope: null, negated: false, evidence: { id: 'photo-evidence', start: 0, end: 3, text: 'MRI' } }] }
  const app = await createPrototypeServer({ workspacePath, extractor: async () => ({ status: 'succeeded', attempts: [{ status: 'succeeded', draft }], draft, model: { backend: 'controlled-test' } }) })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await app.close(); await rm(path.dirname(workspacePath), { recursive: true, force: true }) })
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const before = await fetch(`${origin}/api/bootstrap`).then((response) => response.json())
  const ocr = await fetch(`${origin}/api/photo-ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base64: pngBase64, mimeType: 'image/png' }) }).then((response) => response.json())
  const afterRecognition = await fetch(`${origin}/api/bootstrap`).then((response) => response.json())
  assert.equal(afterRecognition.aggregate.observations, before.aggregate.observations)

  const editedText = `${ocr.text.replace('NOVAMED', 'NOVAMED REVISADO')}\nCorrección revisada por el usuario.`
  const observation = await fetch(`${origin}/api/observations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: before.customers[0].id, text: editedText, provenance: 'photo-assisted' }) }).then((response) => response.json())
  assert.equal(observation.originalText, editedText)
  assert.equal(observation.provenance, 'photo-assisted')
  const exported = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  assert.equal(exported.observations[0].provenance, 'photo-assisted')
  assert.equal(JSON.stringify(exported).includes(pngBase64), false)
  assert.equal(JSON.stringify(exported).includes('image/png'), false)
})

test('cancel means no submit and leaves observations, claims, equipment and verification state unchanged', async (t) => {
  const workspacePath = path.join(await mkdtemp(path.join(tmpdir(), 'photo-cancel-')), 'workspace.json')
  const app = await createPrototypeServer({ workspacePath, extractor: async () => { throw new Error('QVAC must not run during OCR or cancel') } })
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await app.close(); await rm(path.dirname(workspacePath), { recursive: true, force: true }) })
  const origin = `http://127.0.0.1:${app.server.address().port}`
  const before = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  const response = await fetch(`${origin}/api/photo-ocr`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ base64: pngBase64, mimeType: 'image/png' }) })
  assert.equal(response.status, 200)
  const afterCancel = await fetch(`${origin}/api/workspace/export`).then((response) => response.json())
  for (const key of ['observations', 'evidenceEntries', 'equipmentRecords', 'verificationItems']) assert.deepEqual(afterCancel[key], before[key])
})

test('older Workspaces load with text provenance without changing export version', async () => {
  const legacy = {
    synthetic: true,
    label: 'Datos sintéticos',
    customers: [{ id: 'c1', name: 'Hospital ficticio', site: 'Sede' }],
    equipmentRecords: [], evidenceEntries: [], verificationItems: [],
    observations: [{ id: 'o1', customerId: 'c1', originalText: 'MRI', recordedAt: '2026-09-10T00:00:00.000Z', status: 'failed', attempts: [], subjects: [], draftClaims: [], clarification: null, reviewedAt: null, reconciliation: null }]
  }
  const service = new WorkspaceService(legacy, async () => {})
  assert.equal(service.snapshot().observations[0].provenance, 'text')
  assert.equal(service.exportWorkspace().schemaVersion, 'workspace-export-v1')
})

test('visible photo flow exposes required controls, retry, editable handoff and URL cleanup', async () => {
  const page = await readFile(new URL('../../public/index.html', import.meta.url), 'utf8')
  const client = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8')
  for (const copy of ['Añadir desde una imagen', 'Seleccionar imagen', 'Reconocer texto', 'Revisa y corrige el texto', 'Usar como observación', 'Cambiar imagen', 'Cancelar', 'Probar imagen de ejemplo']) assert.ok(page.includes(copy))
  for (const behavior of [/button\.textContent = 'Volver a intentar'/, /\$\('#note'\)\.value = text/, /captureProvenance = 'photo-assisted'/, /URL\.revokeObjectURL\(photoObjectUrl\)/, /clearPhotoCapture\(\)/]) assert.match(client, behavior)
  assert.doesNotMatch(page, /WASM|worker|tesseract\.js|ruta interna/i)
})

async function temporaryOcrDirectories() {
  return (await readdir(tmpdir(), { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('photo-ocr-')).map(({ name }) => name).sort()
}
