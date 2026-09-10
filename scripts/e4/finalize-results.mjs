import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { buildGates, summarizeCases } from './results-summary.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const resultPath = path.join(root, 'results', 'feasibility', 'e4-run-v1.json')
const result = JSON.parse(await readFile(resultPath, 'utf8'))
result.summary = summarizeCases(result.cases)
result.gates = buildGates(result, 20)
result.gates.pass = Object.values(result.gates).every(Boolean)
result.finalizedAt = new Date().toISOString()
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ resultPath, summary: result.summary, gates: result.gates }, null, 2))
if (!result.gates.pass) process.exitCode = 1
