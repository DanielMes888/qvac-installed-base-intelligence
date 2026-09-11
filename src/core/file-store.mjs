import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export class FileStore {
  constructor({ seedPath, workspacePath }) {
    this.seedPath = safeJsonPath(seedPath, 'fixture sintético')
    this.workspacePath = safeJsonPath(workspacePath, 'Workspace')
    if (samePath(this.seedPath, this.workspacePath)) throw new Error('El Workspace no puede usar la ruta del fixture sintético')
    if (!path.basename(this.workspacePath).toLowerCase().includes('workspace')) {
      throw new Error('La ruta de Workspace debe identificar explícitamente un archivo de Workspace')
    }
  }

  async load() {
    try {
      const workspace = JSON.parse(await readFile(this.workspacePath, 'utf8'))
      const seed = JSON.parse(await readFile(this.seedPath, 'utf8'))
      return applySyntheticGeographyDefaults(workspace, seed)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return this.reset()
    }
  }

  async save(state) {
    await mkdir(path.dirname(this.workspacePath), { recursive: true })
    const next = `${this.workspacePath}.next`
    await writeFile(next, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rm(this.workspacePath, { force: true })
    await rename(next, this.workspacePath)
  }

  async reset() {
    const seed = JSON.parse(await readFile(this.seedPath, 'utf8'))
    await this.save(seed)
    return structuredClone(seed)
  }
}

function applySyntheticGeographyDefaults(workspace, seed) {
  if (workspace.synthetic !== true || seed.synthetic !== true) return workspace
  const seedCustomers = new Map((seed.customers ?? []).map((customer) => [customer.id, customer]))
  const migrated = structuredClone(workspace)
  for (const customer of migrated.customers ?? []) {
    const seedCustomer = seedCustomers.get(customer.id)
    if (!seedCustomer) continue
    for (const field of ['region', 'country', 'city']) {
      if (!Object.hasOwn(customer, field) && seedCustomer[field]) customer[field] = seedCustomer[field]
    }
  }
  return migrated
}

function safeJsonPath(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`La ruta de ${label} es obligatoria`)
  if (/[%*$?]/.test(value)) throw new Error(`La ruta de ${label} contiene caracteres no permitidos`)
  const resolved = path.resolve(value)
  if (path.extname(resolved).toLowerCase() !== '.json') throw new Error(`La ruta de ${label} debe ser un archivo JSON`)
  return resolved
}

function samePath(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0
}
