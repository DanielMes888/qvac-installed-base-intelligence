import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import Tesseract from 'tesseract.js'

const require = createRequire(import.meta.url)
const { installNetworkDeny } = require('../../scripts/feasibility/ocr/network-boundaries.cjs')
const root = fileURLToPath(new URL('../../', import.meta.url))
const MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 6000
const LANG_PATH = path.join(root, '.local', 'feasibility', 'ocr', 'tesseract-v2', 'tessdata_fast-87416418657359cb625c412a48b6e1d6d41c29bd')
const WORKER_PATH = path.join(root, 'scripts', 'feasibility', 'ocr', 'tesseract-offline-worker.cjs')
const CORE_PATH = path.dirname(require.resolve('tesseract.js-core/package.json'))

let workerPromise
let worker
let workerStarts = 0

export const PHOTO_OCR_LIMITS = Object.freeze({ maxBytes: MAX_BYTES, maxDimension: MAX_DIMENSION, acceptedMimeTypes: ['image/png', 'image/jpeg'] })

export async function recognizePhoto({ base64, mimeType }) {
  const bytes = decodeImage(base64)
  const detected = inspectImage(bytes)
  if (detected.mimeType !== mimeType) throw new Error('El contenido no coincide con el tipo de imagen declarado')
  if (bytes.length > MAX_BYTES) throw new Error('La imagen supera el límite de 5 MB')
  if (detected.width > MAX_DIMENSION || detected.height > MAX_DIMENSION) throw new Error('Las dimensiones de la imagen superan el límite permitido')
  const taskDirectory = await mkdtemp(path.join(tmpdir(), 'photo-ocr-'))
  const filePath = path.join(taskDirectory, `${randomUUID()}${detected.extension}`)
  try {
    await writeFile(filePath, bytes, { flag: 'wx' })
    const activeWorker = await getWorker()
    const result = await activeWorker.recognize(filePath)
    const text = String(result.data?.text ?? '').trim()
    if (!text) throw new Error('No se pudo leer texto en la imagen')
    return { text, mimeType: detected.mimeType, temporary: true }
  } finally {
    await rm(taskDirectory, { recursive: true, force: true })
  }
}

export async function closePhotoOcr() {
  if (!workerPromise) return
  const activeWorker = await workerPromise.catch(() => null)
  worker = null
  workerPromise = null
  await activeWorker?.terminate()
}

export function photoOcrDiagnostics() {
  return Object.freeze({ workerStarts, workerReady: Boolean(worker) })
}

async function getWorker() {
  if (!workerPromise) {
    workerStarts += 1
    const attempts = []
    const restore = installNetworkDeny({ attempts })
    workerPromise = Tesseract.createWorker(['eng', 'spa'], Tesseract.OEM.LSTM_ONLY, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      cachePath: path.join(tmpdir(), 'photo-ocr-cache-disabled'),
      cacheMethod: 'none',
      gzip: false,
      logger: () => {},
      errorHandler: () => {}
    }).then((created) => {
      restore()
      worker = created
      return created
    }).catch((error) => {
      restore()
      workerPromise = null
      throw new Error(`No se pudo preparar el reconocimiento local. Verifique los modelos OCR instalados: ${error.message}`)
    })
  }
  return workerPromise
}

function decodeImage(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error('La imagen no tiene un contenido base64 válido')
  const bytes = Buffer.from(value, 'base64')
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('La imagen supera el límite de 5 MB o está vacía')
  return bytes
}

function inspectImage(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('La imagen PNG está corrupta')
    const width = bytes.readUInt32BE(16); const height = bytes.readUInt32BE(20)
    if (!width || !height) throw new Error('Las dimensiones PNG no son válidas')
    return { mimeType: 'image/png', extension: '.png', width, height }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const dimensions = jpegDimensions(bytes)
    return { mimeType: 'image/jpeg', extension: '.jpg', ...dimensions }
  }
  throw new Error('Solo se permiten imágenes PNG o JPEG válidas')
}

function jpegDimensions(bytes) {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('La imagen JPEG está corrupta')
    const marker = bytes[offset + 1]
    if (marker === 0xd9 || marker === 0xda) break
    const length = bytes.readUInt16BE(offset + 2)
    if (length < 2 || offset + length + 2 > bytes.length) throw new Error('La imagen JPEG está corrupta')
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) }
    }
    offset += length + 2
  }
  throw new Error('La imagen JPEG no contiene dimensiones válidas')
}
