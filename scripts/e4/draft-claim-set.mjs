import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'

const schemaPath = fileURLToPath(
  new URL('../../schemas/e4-draft-claim-set.schema.json', import.meta.url)
)

let compiledValidator

async function getSchemaValidator() {
  if (!compiledValidator) {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'))
    compiledValidator = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
  }
  return compiledValidator
}

function formatSchemaError(error) {
  return `schema ${error.instancePath || '/'} ${error.message}`
}

export async function validateDraftClaimSet(draft, originalNote) {
  const errors = []
  const validateSchema = await getSchemaValidator()

  if (!validateSchema(draft)) {
    errors.push(...(validateSchema.errors ?? []).map(formatSchemaError))
    return { valid: false, errors }
  }

  const subjectIds = new Set()
  for (const subject of draft.subjects) {
    if (subjectIds.has(subject.subjectId)) {
      errors.push(`duplicate subject ${subject.subjectId}`)
    }
    subjectIds.add(subject.subjectId)
  }

  for (const [index, claim] of draft.claims.entries()) {
    if (!subjectIds.has(claim.subjectId)) {
      errors.push(`claim ${index} references unknown subject ${claim.subjectId}`)
    }
    if (!originalNote.includes(claim.evidenceExcerpt)) {
      errors.push(`claim ${index} evidence excerpt is not an exact substring of the saved note`)
    }
    if (claim.claimType === 'quantity' && claim.quantityValue === null) {
      errors.push(`quantity claim ${index} has no quantityValue`)
    }
    if (claim.claimType !== 'quantity' && claim.quantityValue !== null) {
      errors.push(`non-quantity claim ${index} has a quantityValue`)
    }
  }

  for (const [index, ambiguity] of draft.ambiguities.entries()) {
    for (const subjectId of ambiguity.subjectIds) {
      if (!subjectIds.has(subjectId)) {
        errors.push(`ambiguity ${index} references unknown subject ${subjectId}`)
      }
    }
    if (!originalNote.includes(ambiguity.evidenceExcerpt)) {
      errors.push(`ambiguity ${index} evidence excerpt is not an exact substring of the saved note`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function parseModelJson(text) {
  try {
    return { parsed: JSON.parse(text), error: null }
  } catch (error) {
    return { parsed: null, error: error instanceof Error ? error.message : String(error) }
  }
}
