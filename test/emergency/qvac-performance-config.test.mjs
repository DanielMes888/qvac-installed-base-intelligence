import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { QVAC_CONFIGURATION } from '../../src/qvac/adapter.mjs'

test('optimized QVAC profile preserves the pinned local model and bounded generation contract', () => {
  assert.equal(QVAC_CONFIGURATION.sdk, '0.19.0')
  assert.equal(QVAC_CONFIGURATION.modelExport, 'QWEN3_1_7B_INST_Q4')
  assert.equal(QVAC_CONFIGURATION.quantization, 'Q4_0')
  assert.equal(QVAC_CONFIGURATION.modelConfig.device, 'gpu')
  assert.equal(QVAC_CONFIGURATION.generationParams.reasoning_budget, 0)
  assert.equal(QVAC_CONFIGURATION.generationParams.predict, 250)
  assert.equal(QVAC_CONFIGURATION.promptVersion, 'prototype-equipment-extraction-v9')
  assert.equal(QVAC_CONFIGURATION.outputContract, 'json-object-with-compact-raw-json-fallback')
})

test('benchmark and prompt history remain versioned and fixed', async () => {
  const benchmark = JSON.parse(await readFile(new URL('../../data/prototype/performance-benchmark-v1.json', import.meta.url), 'utf8'))
  assert.equal(benchmark.cases.length, 5)
  assert.equal(new Set(benchmark.cases.map(({ id }) => id)).size, 5)
  assert.equal(benchmark.cases.filter(({ expected }) => expected.clarification).length, 1)
  assert.equal(benchmark.cases.filter(({ expected }) => !expected.clarification).length, 4)
  for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const prompt = await readFile(new URL(`../../prompts/prototype-equipment-extraction-v${version}.txt`, import.meta.url), 'utf8')
    assert.ok(prompt.trim().length > 0)
  }
})
