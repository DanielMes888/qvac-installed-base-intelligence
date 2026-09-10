import { fileURLToPath } from 'node:url'

import { verifyFrozenArtifacts } from './artifacts.mjs'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const result = await verifyFrozenArtifacts(repositoryRoot)

console.log(JSON.stringify({
  valid: result.valid,
  recordCount: result.recordCount,
  files: result.files,
  errors: result.errors
}, null, 2))

if (!result.valid) process.exitCode = 1
