import { z } from 'zod'

const subjectSchema = z.object({
  i: z.string().min(1).max(8),
  k: z.enum(['g', 'u', 'x'])
}).strict()

const claimSchema = z.object({
  i: z.string().min(1).max(8),
  s: z.string().min(1).max(8),
  t: z.enum(['eq', 'mk', 'md', 'qt', 'ag', 'loc', 'id']),
  v: z.union([z.string().min(1).max(80), z.number().nonnegative()]),
  q: z.enum(['o', 't', 'u']).optional(),
  l: z.enum(['room', 'dept', 'site', 'customer', 'unknown']),
  src: z.enum(['d', 'a', 'u', 'r']),
  c: z.enum(['r', 'e', 'u']),
  n: z.boolean(),
  a: z.number().int().nonnegative(),
  b: z.number().int().positive()
}).strict().superRefine((claim, context) => {
  if (claim.t === 'qt' && (typeof claim.v !== 'number' || claim.q === undefined)) {
    context.addIssue({ code: 'custom', message: 'quantity claims require numeric v and q' })
  }
  if (claim.t !== 'qt' && claim.q !== undefined) {
    context.addIssue({ code: 'custom', message: 'q is only valid for quantity claims' })
  }
})

const clarificationSchema = z.object({
  k: z.enum(['qty', 'loc', 'attach', 'id', 'detail']),
  s: z.string().min(1).max(8),
  a: z.number().int().nonnegative(),
  b: z.number().int().positive(),
  q: z.string().min(1).max(160)
}).strict()

export const compactDraftSchema = z.object({
  v: z.literal(1),
  s: z.array(subjectSchema).min(1).max(8),
  c: z.array(claimSchema).min(1).max(24),
  x: clarificationSchema.nullable()
}).strict()

export const compactDraftJsonSchema = z.toJSONSchema(compactDraftSchema)

export const extractionTool = {
  name: 'record_equipment',
  description: 'Record compact medical-equipment claims from the supplied observation. Call exactly once.',
  parameters: compactDraftSchema
}

export function validateCompactDraft(input, note, stopReason) {
  if (stopReason === 'length') {
    return { valid: false, errors: ['length-stopped output is invalid'], expanded: null }
  }

  const parsed = compactDraftSchema.safeParse(input)
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '/'} ${issue.message}`),
      expanded: null
    }
  }

  const errors = []
  const subjectIds = new Set(parsed.data.s.map((subject) => subject.i))
  if (subjectIds.size !== parsed.data.s.length) errors.push('subject IDs must be unique')

  const claimIds = new Set()
  for (const claim of parsed.data.c) {
    if (claimIds.has(claim.i)) errors.push(`duplicate claim ID ${claim.i}`)
    claimIds.add(claim.i)
    if (!subjectIds.has(claim.s)) errors.push(`claim ${claim.i} references unknown subject ${claim.s}`)
    if (!validSpan(note, claim.a, claim.b)) errors.push(`claim ${claim.i} has invalid source offsets`)
  }

  if (parsed.data.x) {
    if (!subjectIds.has(parsed.data.x.s)) errors.push('clarification references unknown subject')
    if (!validSpan(note, parsed.data.x.a, parsed.data.x.b)) errors.push('clarification has invalid source offsets')
  }

  if (errors.length) return { valid: false, errors, expanded: null }

  return {
    valid: true,
    errors: [],
    expanded: {
      ...parsed.data,
      c: parsed.data.c.map((claim) => ({ ...claim, evidence: note.slice(claim.a, claim.b) })),
      x: parsed.data.x ? { ...parsed.data.x, evidence: note.slice(parsed.data.x.a, parsed.data.x.b) } : null
    }
  }
}

export function parseCompactJson(text) {
  try {
    const json = text
      .replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '')
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
    return { value: JSON.parse(json), error: null }
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) }
  }
}

function validSpan(text, start, end) {
  return start < end && end <= text.length && text.slice(start, end).trim().length > 0
}
