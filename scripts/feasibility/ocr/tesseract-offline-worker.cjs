'use strict'

const auditPath = process.env.TESSERACT_OCR_NETWORK_AUDIT
const { installNetworkDeny } = require('./network-boundaries.cjs')

installNetworkDeny({ auditPath })

require('tesseract.js/src/worker-script/node/index.js')
