import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { verifyFrozenArtifacts } from '../../scripts/e4/artifacts.mjs'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))

test('the frozen E4 partition, prompt, and schema match their manifest', async () => {
  const result = await verifyFrozenArtifacts(repositoryRoot)

  assert.equal(result.valid, true, result.errors.join('\n'))
  assert.equal(result.recordCount, 20)
  assert.equal(result.files.length, 3)
})
