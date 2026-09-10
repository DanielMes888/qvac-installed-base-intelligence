import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { FileStore } from '../../src/core/file-store.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const store = new FileStore({
  seedPath: path.join(root, 'data', 'prototype', 'seed.json'),
  workspacePath: path.join(root, '.local', 'workspace.json')
})
await store.reset()
console.log('Synthetic workspace reset.')
