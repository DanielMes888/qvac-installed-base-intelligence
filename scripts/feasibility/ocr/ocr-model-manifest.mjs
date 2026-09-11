export const OCR_MODEL_MANIFEST = Object.freeze({
  sdkVersion: '0.19.0',
  enginePackage: '@qvac/ocr-ggml',
  engineVersion: '0.21.0',
  license: 'Apache-2.0',
  modelRedistributionStatus: 'not-established-by-this-feasibility-spike',
  detector: Object.freeze({
    descriptor: 'OCR_CRAFT',
    filename: 'craft_mlt_25k.gguf',
    expectedSize: 83133856,
    sha256: '74501993caf4581ce09b280f49a1b3d249c0f5a78496e047718b398457a875aa'
  }),
  recognizer: Object.freeze({
    descriptor: 'OCR_LATIN',
    filename: 'latin_g2.gguf',
    expectedSize: 15396512,
    sha256: 'dd1c7a436e9175904e63683e939635892f45c8c6377d5e14e87cf8b175e10768'
  })
})
