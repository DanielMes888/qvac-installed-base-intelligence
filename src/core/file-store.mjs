import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export class FileStore {
  constructor({ seedPath, workspacePath }) {
    this.seedPath = seedPath
    this.workspacePath = workspacePath
  }

  async load() {
    try {
      return JSON.parse(await readFile(this.workspacePath, 'utf8'))
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
