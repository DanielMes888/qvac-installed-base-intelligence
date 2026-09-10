import { z } from 'zod'

const itemSchema = z.object({
  e: z.string().min(1).max(40),
  m: z.string().max(50).optional().default(''),
  d: z.string().max(50).optional().default(''),
  q: z.number().int().nonnegative().nullable().optional().default(null),
  qs: z.enum(['o', 't', 'u']).optional().default('u'),
  l: z.string().max(60).optional().default(''),
  ls: z.enum(['room', 'dept', 'site', 'customer', 'unknown']).optional().default('unknown'),
  src: z.enum(['d', 'a', 'u', 'r']).optional().default('u'),
  c: z.enum(['r', 'e', 'u']).optional().default('u'),
  n: z.boolean().optional().default(false),
  r: z.string().regex(/^e\d+$/)
}).strict()

const clarificationSchema = z.object({
  k: z.enum(['qty', 'loc', 'attach', 'id', 'detail']),
  i: z.number().int().nonnegative(),
  q: z.string().min(1).max(140),
  r: z.string().regex(/^e\d+$/)
}).strict()

const simpleDraftSchema = z.object({
  i: z.array(itemSchema).min(1).max(6),
  x: clarificationSchema.nullable().optional().default(null)
}).strict()

const typeNames = { eq: 'equipmentType', mk: 'manufacturer', md: 'model', qt: 'quantity', loc: 'location' }
const quantityScopes = { o: 'observed', t: 'reportedTotal', u: 'unknown' }
const sourceTypes = { d: 'directObservation', a: 'attributedStatement', u: 'unattributedStatement', r: 'recordOrLabel' }
const certainties = { r: 'reported', e: 'estimated', u: 'unknown' }

export function buildEvidenceSegments(note) {
  const segments = []
  const matcher = /[^.!?]+[.!?]?/g
  for (const match of note.matchAll(matcher)) {
    const raw = match[0]
    const leading = raw.length - raw.trimStart().length
    const text = raw.trim()
    if (!text) continue
    const start = match.index + leading
    segments.push({ id: `e${segments.length}`, start, end: start + text.length, text })
  }
  return segments
}

export function validateSimpleDraft(input, evidenceSegments, stopReason) {
  if (stopReason === 'length') return { valid: false, errors: ['length-stopped output is invalid'], draft: null }
  const parsed = simpleDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '/'} ${issue.message}`), draft: null }
  }

  const evidence = new Map(evidenceSegments.map((segment) => [segment.id, segment]))
  const errors = []
  parsed.data.i.forEach((item, index) => {
    if (!evidence.has(item.r)) errors.push(`item ${index} references unknown evidence ${item.r}`)
  })
  if (parsed.data.x && !evidence.has(parsed.data.x.r)) errors.push(`clarification references unknown evidence ${parsed.data.x.r}`)
  if (parsed.data.x && parsed.data.x.i >= parsed.data.i.length) errors.push('clarification references unknown item')
  if (errors.length) return { valid: false, errors, draft: null }

  let claimIndex = 0
  const claims = []
  const subjects = parsed.data.i.map((item, index) => {
    const subjectId = `s${index + 1}`
    const base = {
      subjectId,
      kind: item.q !== null && item.q > 1 ? 'observedGroup' : 'provisionalIndividual',
      label: [item.m, item.d || item.e].filter(Boolean).join(' ')
    }
    const common = {
      subjectId,
      locationScope: item.ls,
      sourceType: sourceTypes[item.src],
      certainty: certainties[item.c],
      negated: item.n,
      evidence: evidence.get(item.r)
    }
    addClaim('eq', item.e, common)
    if (item.m) addClaim('mk', item.m, common)
    if (item.d) addClaim('md', item.d, common)
    if (item.q !== null) addClaim('qt', item.q, { ...common, quantityScope: quantityScopes[item.qs] })
    if (item.l) addClaim('loc', item.l, common)
    return base
  })

  return {
    valid: true,
    errors: [],
    draft: {
      version: 1,
      subjects,
      claims,
      clarification: parsed.data.x ? {
        kind: parsed.data.x.k,
        subjectId: `s${parsed.data.x.i + 1}`,
        question: parsed.data.x.q,
        evidence: evidence.get(parsed.data.x.r)
      } : null
    }
  }

  function addClaim(type, value, common) {
    claimIndex += 1
    claims.push({ claimId: `c${claimIndex}`, type: typeNames[type], value, ...common })
  }
}
