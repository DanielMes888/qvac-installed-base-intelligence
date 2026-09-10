import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const MANIFEST_PATH = 'data/feasibility/e4-manifest-v1.json'

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function verifyFrozenArtifacts(repositoryRoot) {
  const root = path.resolve(repositoryRoot)
  const manifest = await loadJson(path.join(root, MANIFEST_PATH))
  const errors = []
  const files = []

  for (const entry of manifest.files) {
    const absolutePath = path.resolve(root, entry.path)
    if (!absolutePath.startsWith(`${root}${path.sep}`)) {
      errors.push(`${entry.path} escapes the repository root`)
      continue
    }

    const actualSha256 = sha256(await readFile(absolutePath))
    const matches = actualSha256 === entry.sha256
    files.push({ path: entry.path, expectedSha256: entry.sha256, actualSha256, matches })
    if (!matches) errors.push(`${entry.path} checksum mismatch`)
  }

  const dataset = await loadJson(path.join(root, 'data/feasibility/e4-notes-v1.json'))
  if (dataset.notes.length !== manifest.recordCount) {
    errors.push(`manifest expects ${manifest.recordCount} notes but dataset contains ${dataset.notes.length}`)
  }
  if (new Set(dataset.notes.map((note) => note.id)).size !== dataset.notes.length) {
    errors.push('dataset note IDs are not unique')
  }
  if (!dataset.synthetic) errors.push('dataset is not marked synthetic')

  return {
    valid: errors.length === 0,
    errors,
    files,
    recordCount: dataset.notes.length,
    manifest,
    dataset
  }
}
