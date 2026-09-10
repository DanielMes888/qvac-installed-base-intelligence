import { spawn } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = path.join(root, 'results', 'feasibility')
const statePath = path.join(directory, 'e4-interruption-probe-state.json')
const nextPath = `${statePath}.next`
const resultPath = path.join(directory, 'e4-interruption-probe.json')
await mkdir(directory, { recursive: true })

if (process.argv.includes('--child')) {
  const note = {
    observationId: 'E4-INTERRUPTION-001',
    originalText: 'Synthetic demonstration data: I saw one DemoScan MRI in Room 2.',
    status: 'processing',
    persistedBeforeInferenceAt: new Date().toISOString()
  }
  await atomicWrite(statePath, nextPath, note)
  process.stdout.write('PERSISTED\n')
  setInterval(() => {}, 1000)
} else {
  await rm(statePath, { force: true })
  await rm(nextPath, { force: true })
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child'], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr += chunk })
  await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('PERSISTED')) resolve()
    })
  })
  child.kill()
  await new Promise((resolve) => child.once('exit', resolve))

  const recovered = JSON.parse(await readFile(statePath, 'utf8'))
  const passed = recovered.observationId === 'E4-INTERRUPTION-001'
    && recovered.originalText.includes('DemoScan MRI')
    && recovered.status === 'processing'
  const result = {
    schemaVersion: 'e4-interruption-probe-v1',
    observedAt: new Date().toISOString(),
    childExitCode: child.exitCode,
    childSignalCode: child.signalCode,
    stderr,
    recovered,
    passed
  }
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ resultPath, passed, childSignalCode: child.signalCode }, null, 2))
  if (!passed) process.exitCode = 1
}

async function atomicWrite(target, temporary, value) {
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rm(target, { force: true })
  await rename(temporary, target)
}
