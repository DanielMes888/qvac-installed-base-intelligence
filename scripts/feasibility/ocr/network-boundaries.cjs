'use strict'

const fs = require('node:fs')
const http = require('node:http')
const https = require('node:https')
const net = require('node:net')
const tls = require('node:tls')
const dns = require('node:dns')

const NETWORK_BOUNDARIES = Object.freeze([
  ['globalThis', 'fetch'],
  [http, 'request'],
  [http, 'get'],
  [https, 'request'],
  [https, 'get'],
  [net, 'connect'],
  [net, 'createConnection'],
  [tls, 'connect'],
  [dns, 'lookup'],
  [dns, 'resolve'],
  [dns, 'resolve4'],
  [dns, 'resolve6']
])

function installNetworkDeny({ attempts, auditPath }) {
  const originals = []
  try {
    for (const [owner, name] of NETWORK_BOUNDARIES) {
      const target = owner === 'globalThis' ? globalThis : owner
      const label = owner === 'globalThis' ? `globalThis.${name}` : `${moduleName(owner)}.${name}`
      originals.push([target, name, target[name]])
      target[name] = (...args) => {
        const event = { boundary: label, target: String(args[0]?.href ?? args[0]?.hostname ?? args[0]?.host ?? args[0] ?? '(unknown)') }
        attempts?.push(event)
        if (auditPath) fs.appendFileSync(auditPath, `${JSON.stringify({ ...event, observedAt: new Date().toISOString() })}\n`, 'utf8')
        throw new Error(`NETWORK_DISABLED_DURING_TESSERACT_OCR: ${label}`)
      }
    }
  } catch (error) {
    restoreNetworkBoundaries(originals)
    throw error
  }
  return () => restoreNetworkBoundaries(originals)
}

function restoreNetworkBoundaries(originals) {
  for (const [target, name, original] of originals) target[name] = original
}

function moduleName(owner) {
  if (owner === http) return 'http'
  if (owner === https) return 'https'
  if (owner === net) return 'net'
  if (owner === tls) return 'tls'
  return 'dns'
}

module.exports = { installNetworkDeny }
