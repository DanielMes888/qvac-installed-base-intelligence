import { z } from 'zod'

export const ANALYTICS_CONTRACT_VERSION = 'analytics-query-v1'
export const ANALYTICS_ALLOWED_FIELDS = Object.freeze(['modality', 'customerName', 'country', 'city', 'confidenceBand', 'freshnessBand', 'reportedAgeYears', 'opportunityType', 'opportunityStatus'])
export const ANALYTICS_ENUM_VALUES = deepFreeze({
  confidenceBand: ['high', 'medium', 'low', 'unavailable'],
  freshnessBand: ['recent', 'old', 'unknown'],
  opportunityStatus: ['unreviewed', 'dismissed'],
  opportunityType: ['reportedAgeReview', 'incompleteInformationReview', 'staleEvidenceReview', 'unknownObservationDateReview', 'invalidObservationDateReview', 'materialVerificationReview']
})
const groupFields = ANALYTICS_ALLOWED_FIELDS.filter((field) => field !== 'reportedAgeYears')
const filterSchema = z.object({ field: z.enum(ANALYTICS_ALLOWED_FIELDS), operator: z.enum(['eq', 'gt', 'gte']), value: z.union([z.string().max(100), z.number().finite()]) }).strict()
const readySchema = z.object({ version: z.literal(ANALYTICS_CONTRACT_VERSION), status: z.literal('ready'), dataset: z.enum(['equipment', 'opportunities']), resultMode: z.enum(['records', 'customers']), filters: z.array(filterSchema).max(6), groupBy: z.enum(groupFields).nullable(), metric: z.literal('count'), limit: z.number().int().min(1).max(100) }).strict()
const rejectedSchema = z.object({ version: z.literal(ANALYTICS_CONTRACT_VERSION), status: z.literal('rejected'), reason: z.string().min(1).max(200) }).strict()
const planSchema = z.discriminatedUnion('status', [readySchema, rejectedSchema])

export function validateAnalyticsPlan(candidate, { executable = false } = {}) {
  const parsed = planSchema.safeParse(candidate)
  if (!parsed.success) return { valid: false, errors: parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`), plan: null }
  if (parsed.data.status === 'rejected') return { valid: true, errors: [], plan: parsed.data }
  const plan = parsed.data
  const opportunityFields = new Set(['opportunityType', 'opportunityStatus'])
  if (plan.dataset === 'equipment' && [...plan.filters.map(({ field }) => field), plan.groupBy].some((field) => opportunityFields.has(field))) return invalid('Los campos de oportunidad requieren dataset opportunities')
  if (plan.dataset === 'opportunities' && plan.filters.some(({ field }) => ['confidenceBand', 'freshnessBand', 'reportedAgeYears'].includes(field))) return invalid('Ese campo requiere dataset equipment')
  for (const filter of plan.filters) {
    if (filter.field === 'reportedAgeYears' && (typeof filter.value !== 'number' || filter.operator === 'eq')) return invalid('reportedAgeYears requiere gt/gte numérico')
    if (filter.field !== 'reportedAgeYears' && (typeof filter.value !== 'string' || filter.operator !== 'eq')) return invalid(`${filter.field} requiere eq y texto`)
    if (executable && ANALYTICS_ENUM_VALUES[filter.field] && !ANALYTICS_ENUM_VALUES[filter.field].includes(filter.value)) return invalid(`${filter.field} no usa un valor contractual permitido`)
  }
  return { valid: true, errors: [], plan }
}

export function anchorAnalyticsPlan(question, candidate, source) {
  const validation = validateAnalyticsPlan(candidate)
  if (!validation.valid) return semanticInvalid('El plan del modelo no satisface el esquema analítico.', validation.errors)
  if (validation.plan.status === 'rejected') return { valid: true, errors: [], modelPlan: structuredClone(validation.plan), plan: structuredClone(validation.plan), repairs: [] }

  const modelPlan = structuredClone(validation.plan)
  const detected = detectQuestionSemantics(question, source)
  if (!detected.valid) return semanticInvalid(detected.error, [], modelPlan)
  if (!detected.filters.length && !detected.groupBy && !detected.dataset && !detected.resultMode) return semanticInvalid('La pregunta no contiene un alcance analítico inequívoco.', [], modelPlan)

  const plan = structuredClone(modelPlan)
  const repairs = []
  if (detected.dataset && plan.dataset !== detected.dataset) return semanticInvalid('El dataset del modelo contradice el alcance explícito de la pregunta.', [], modelPlan)
  if (detected.resultMode && plan.resultMode !== detected.resultMode) return semanticInvalid('El tipo de resultado del modelo contradice la pregunta.', [], modelPlan)

  const anchoredFields = new Map(detected.filters.map((filter) => [filter.field, filter]))
  const normalizedModelFilters = []
  for (const filter of plan.filters) {
    const anchored = anchoredFields.get(filter.field)
    if (!anchored) return semanticInvalid(`El filtro ${filter.field} no está respaldado explícitamente por la pregunta.`, [], modelPlan)
    const normalized = normalizeModelFilter(filter, source)
    if (!normalized || !sameFilter(normalized, anchored)) return semanticInvalid(`El filtro ${filter.field} contradice la restricción explícita de la pregunta.`, [], modelPlan)
    normalizedModelFilters.push(normalized)
    if (!sameFilter(filter, normalized)) repairs.push(`Se normalizó ${filter.field} “${filter.value}” como “${normalized.value}”.`)
  }
  for (const anchored of detected.filters) {
    if (!normalizedModelFilters.some((filter) => sameFilter(filter, anchored))) {
      normalizedModelFilters.push(structuredClone(anchored))
      repairs.push(anchored.message)
    }
  }
  plan.filters = deduplicateFilters(normalizedModelFilters)

  if (detected.groupBy) {
    if (plan.groupBy && plan.groupBy !== detected.groupBy) return semanticInvalid('La agrupación del modelo contradice la agrupación explícita.', [], modelPlan)
    if (!plan.groupBy) repairs.push(`Se conservó la agrupación explícita por ${GROUP_LABELS[detected.groupBy]}.`)
    plan.groupBy = detected.groupBy
  } else if (plan.groupBy) {
    repairs.push(`Se retiró la agrupación no solicitada por ${GROUP_LABELS[plan.groupBy]}.`)
    plan.groupBy = null
  }

  const executable = validateAnalyticsPlan(plan, { executable: true })
  if (!executable.valid) return semanticInvalid('El plan normalizado no satisface el contrato ejecutable.', executable.errors, modelPlan)
  return { valid: true, errors: [], modelPlan, plan: executable.plan, repairs }
}

export function executeAnalyticsPlan(plan, source) {
  const validation = validateAnalyticsPlan(plan, { executable: true })
  if (!validation.valid || plan.status !== 'ready') throw new Error(validation.errors[0] ?? 'El plan no está listo para ejecución')
  const rows = plan.dataset === 'equipment' ? equipmentRows(source) : opportunityRows(source)
  const filtered = rows.filter((row) => plan.filters.every((filter) => matches(row, filter)))
  const selected = plan.resultMode === 'customers' ? [...new Map(filtered.map((row) => [row.customerId, row])).values()] : filtered
  const groups = plan.groupBy
    ? Object.entries(selected.reduce((counts, row) => ({ ...counts, [displayValue(row[plan.groupBy])]: (counts[displayValue(row[plan.groupBy])] ?? 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b, 'es')).map(([value, count]) => ({ value, count })).slice(0, plan.limit)
    : []
  const resultRows = selected.slice(0, plan.limit).map(({ raw, ...row }) => row)
  return {
    contractVersion: ANALYTICS_CONTRACT_VERSION,
    filters: structuredClone(plan.filters), groupBy: plan.groupBy, metric: plan.metric,
    count: selected.length, groups, rows: resultRows,
    sourceCollections: plan.dataset === 'equipment' ? ['customers', 'equipmentRecords', 'observations', 'evidenceEntries'] : ['customers', 'equipmentRecords', 'evidenceEntries', 'opportunitySignals'],
    synthetic: true,
    disclaimer: 'Resultado determinista del Workspace local con datos sintéticos; no es una regla oficial de Philips.'
  }
}

export function analyticsAnswer(result) {
  if (result.groups.length) return `${result.count} resultado${result.count === 1 ? '' : 's'} en el Workspace local: ${result.groups.map(({ value, count }) => `${value}: ${count}`).join('; ')}.`
  if (!result.count) return 'No se encontraron resultados en el Workspace local para los filtros interpretados.'
  return `${result.count} resultado${result.count === 1 ? '' : 's'} en el Workspace local.`
}

export function rejectUnsafeQuestion(question) {
  const text = question?.trim()
  if (!text) return 'Escriba una pregunta analítica.'
  if (text.length > 500) return 'La pregunta excede 500 caracteres.'
  if (/(?:\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\b(?:elimina|eliminar|borra|borrar|modifica|modificar|actualiza|actualizar)\b|javascript:|powershell|cmd\.exe|\.\.\/|\.\.\\|https?:\/\/|ignora (?:las|todas)|prompt)/i.test(text)) return 'La pregunta contiene instrucciones no permitidas por el contrato de solo lectura.'
  return null
}

function detectQuestionSemantics(question, source) {
  const raw = String(question ?? '').trim()
  const text = fold(raw)
  const filters = []
  const matchedRanges = []

  const customer = matchKnownValue(text, source.customers?.map(({ name }) => name).filter(Boolean) ?? [])
  if (customer.ambiguous) return { valid: false, error: 'La pregunta coincide con más de un cliente sintético.' }
  if (customer.value) {
    filters.push(anchorFilter('customerName', customer.value, `Se conservó el cliente explícito “${customer.value}”.`))
    matchedRanges.push(customer.range)
  }

  const countries = unique(source.customers?.map(({ country }) => country).filter(Boolean) ?? [])
  const country = matchAliasedValue(text, countries, COUNTRY_ALIASES, matchedRanges)
  if (country.ambiguous) return { valid: false, error: 'El país mencionado no tiene una coincidencia inequívoca.' }
  if (country.value) filters.push(anchorFilter('country', country.value, `Se conservó el país explícito “${country.mentioned}” como “${country.value}”.`))

  const city = matchKnownValue(text, source.customers?.map(({ city }) => city).filter(Boolean) ?? [], matchedRanges)
  if (city.ambiguous) return { valid: false, error: 'La ciudad mencionada no tiene una coincidencia inequívoca.' }
  if (city.value) filters.push(anchorFilter('city', city.value, `Se conservó la ciudad explícita “${city.value}”.`))

  const confidence = /\b(?:confianza|banda)\b/.test(text) ? matchVocabulary(text, CONFIDENCE_TERMS) : { value: null, term: null, ambiguous: false }
  if (confidence.ambiguous) return { valid: false, error: 'La banda de confianza es ambigua.' }
  if (confidence.value) filters.push(anchorFilter('confidenceBand', confidence.value, `Confianza “${confidence.term}” interpretada como banda ${confidence.value}.`))

  const freshness = matchVocabulary(text, FRESHNESS_TERMS)
  if (freshness.ambiguous) return { valid: false, error: 'La vigencia solicitada es ambigua.' }
  if (freshness.value) filters.push(anchorFilter('freshnessBand', freshness.value, `Vigencia “${freshness.term}” interpretada como ${freshness.value}.`))

  const modality = matchVocabulary(text, MODALITY_TERMS)
  if (modality.ambiguous) return { valid: false, error: 'La modalidad solicitada es ambigua.' }
  if (modality.value) filters.push(anchorFilter('modality', modality.value, `Modalidad “${modality.term}” interpretada como ${modality.value}.`))

  const age = matchReportedAge(text)
  if (age) filters.push({ field: 'reportedAgeYears', operator: age.operator, value: age.value, message: `Se conservó el umbral explícito de antigüedad ${age.operator} ${age.value}.` })

  const opportunityStatus = matchVocabulary(text, OPPORTUNITY_STATUS_TERMS)
  if (opportunityStatus.ambiguous) return { valid: false, error: 'El estado de oportunidad es ambiguo.' }
  if (opportunityStatus.value) filters.push(anchorFilter('opportunityStatus', opportunityStatus.value, `Estado “${opportunityStatus.term}” interpretado como ${opportunityStatus.value}.`))

  const groupBy = matchGroup(text)
  const dataset = /\b(?:oportunidad(?:es)?|senal(?:es)?)\b/.test(text) ? 'opportunities' : null
  const resultMode = /(?:muestrame|dime|lista|cuales son)\s+(?:los\s+)?clientes\b|\bclientes?\s+(?:con|en|que)\b/.test(text) ? 'customers' : null
  const unknownLocation = raw.match(/\ben\s+([A-ZÁÉÍÓÚÑ][\p{L} -]{2,50}?)(?=\s+(?:con|por|que|y)\b|[?.!,]|$)/u)
  if (unknownLocation && !country.value && !city.value && !customer.value) return { valid: false, error: `No se pudo resolver “${unknownLocation[1].trim()}” contra la geografía sintética permitida.` }
  return { valid: true, filters, groupBy, dataset, resultMode }
}

function normalizeModelFilter(filter, source) {
  if (filter.field === 'reportedAgeYears') return structuredClone(filter)
  const folded = fold(filter.value)
  if (filter.field === 'confidenceBand') return normalizedVocabularyFilter(filter, folded, CONFIDENCE_TERMS)
  if (filter.field === 'freshnessBand') return normalizedVocabularyFilter(filter, folded, FRESHNESS_TERMS)
  if (filter.field === 'modality') return normalizedVocabularyFilter(filter, folded, MODALITY_TERMS)
  if (filter.field === 'opportunityStatus') return normalizedVocabularyFilter(filter, folded, OPPORTUNITY_STATUS_TERMS)
  if (filter.field === 'opportunityType') return ANALYTICS_ENUM_VALUES.opportunityType.includes(filter.value) ? structuredClone(filter) : null
  const values = filter.field === 'customerName' ? source.customers?.map(({ name }) => name) : source.customers?.map((customer) => customer[filter.field])
  if (filter.field === 'country') {
    const matched = matchAliasedValue(folded, unique(values?.filter(Boolean) ?? []), COUNTRY_ALIASES)
    return matched.value ? { ...filter, value: matched.value } : null
  }
  const matched = matchKnownValue(folded, unique(values?.filter(Boolean) ?? []))
  return matched.value ? { ...filter, value: matched.value } : null
}

function normalizedVocabularyFilter(filter, text, vocabulary) {
  const match = matchVocabulary(text, vocabulary)
  return match.value && !match.ambiguous ? { ...filter, value: match.value } : null
}

function matchKnownValue(text, values, excludedRanges = []) {
  const matches = values.map((value) => ({ value, token: fold(value) })).filter(({ token }) => token && containsToken(text, token)).map((item) => ({ ...item, range: tokenRange(text, item.token) })).filter(({ range }) => !excludedRanges.some((excluded) => overlaps(range, excluded)))
  const longest = matches.sort((left, right) => right.token.length - left.token.length)[0]
  return { value: longest?.value ?? null, range: longest?.range ?? null, ambiguous: matches.length > 1 && matches[0].token.length === matches[1].token.length }
}

function matchAliasedValue(text, existingValues, aliases, excludedRanges = []) {
  const matches = Object.entries(aliases).flatMap(([canonical, terms]) => terms.flatMap((term) => tokenRanges(text, fold(term)).filter((range) => !excludedRanges.some((excluded) => overlaps(range, excluded))).map(() => ({ canonical, mentioned: term }))))
  if (matches.length) {
    if (new Set(matches.map(({ canonical }) => canonical)).size > 1) return { value: null, mentioned: null, ambiguous: true }
    const match = matches[0]
    const existing = existingValues.find((value) => fold(value) === fold(match.canonical)) ?? existingValues.find((value) => aliases[match.canonical].some((alias) => fold(alias) === fold(value)))
    return { value: existing ?? match.canonical, mentioned: match.mentioned, ambiguous: false }
  }
  const known = matchKnownValue(text, existingValues, excludedRanges)
  if (known.value) return { ...known, mentioned: known.value }
  return { value: null, mentioned: null, ambiguous: false }
}

function matchVocabulary(text, vocabulary) {
  const matches = Object.entries(vocabulary).flatMap(([value, terms]) => terms.filter((term) => containsToken(text, fold(term))).map((term) => ({ value, term })))
  const values = new Set(matches.map(({ value }) => value))
  return { value: values.size === 1 ? matches[0].value : null, term: values.size === 1 ? matches[0].term : null, ambiguous: values.size > 1 }
}

function matchGroup(text) {
  for (const [field, terms] of Object.entries(GROUP_TERMS)) if (terms.some((term) => text.includes(`por ${fold(term)}`))) return field
  return null
}

function matchReportedAge(text) {
  const words = { siete: 7, ocho: 8, nueve: 9, diez: 10 }
  const match = text.match(/(?:mas de|superior(?:es)? a)\s+(\d+|siete|ocho|nueve|diez)\s+anos?/)
  if (!match) return null
  return { operator: 'gt', value: Number(match[1]) || words[match[1]] }
}

function anchorFilter(field, value, message) { return { field, operator: 'eq', value, message } }
function deduplicateFilters(filters) { return [...new Map(filters.map(({ message, ...filter }) => [`${filter.field}:${filter.operator}:${filter.value}`, filter])).values()] }
function sameFilter(left, right) { return left.field === right.field && left.operator === right.operator && normalize(left.value) === normalize(right.value) }
function semanticInvalid(message, errors = [], modelPlan = null) { return { valid: false, errors: [message, ...errors], modelPlan: modelPlan ? structuredClone(modelPlan) : null, plan: null, repairs: [] } }
function unique(values) { return [...new Set(values)] }
function fold(value) { return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g, ' ').trim() }
function containsToken(text, token) { return (` ${text} `).includes(` ${token} `) }
function tokenRange(text, token) { const start = (` ${text} `).indexOf(` ${token} `); return [Math.max(0, start), Math.max(0, start) + token.length] }
function tokenRanges(text, token) { const padded = ` ${text} `; const needle = ` ${token} `; const ranges = []; let from = 0; while (from < padded.length) { const start = padded.indexOf(needle, from); if (start === -1) break; ranges.push([Math.max(0, start), Math.max(0, start) + token.length]); from = start + needle.length - 1 } return ranges }
function overlaps(left, right) { return left && right && left[0] <= right[1] && right[0] <= left[1] }
function deepFreeze(value) { for (const nested of Object.values(value)) if (nested && typeof nested === 'object') deepFreeze(nested); return Object.freeze(value) }

const COUNTRY_ALIASES = deepFreeze({ Brazil: ['Brasil', 'Brazil'] })
const CONFIDENCE_TERMS = deepFreeze({ high: ['alta', 'alto', 'high'], medium: ['media', 'medio', 'medium'], low: ['baja', 'bajo', 'low'], unavailable: ['no disponible', 'unavailable'] })
const FRESHNESS_TERMS = deepFreeze({ recent: ['evidencia reciente', 'datos recientes', 'actualizada', 'actualizado'], old: ['evidencia antigua', 'evidencia desactualizada', 'datos viejos', 'datos antiguos', 'antigua', 'desactualizada'], unknown: ['fecha desconocida', 'sin fecha', 'unknown date'] })
const MODALITY_TERMS = deepFreeze({ MRI: ['mri', 'mr', 'resonancia magnetica'], CT: ['ct', 'tomografia computarizada'], Ultrasound: ['ultrasonido', 'ultrasound'], 'Patient monitoring': ['monitoreo de pacientes', 'patient monitoring'] })
const OPPORTUNITY_STATUS_TERMS = deepFreeze({ unreviewed: ['sin revisar', 'pendiente', 'unreviewed'], dismissed: ['descartada', 'descartadas', 'descartado', 'descartados', 'dismissed'] })
const GROUP_TERMS = deepFreeze({ modality: ['modalidad'], customerName: ['cliente', 'clientes'], country: ['pais', 'paises'], city: ['ciudad', 'ciudades'], confidenceBand: ['confianza'], freshnessBand: ['vigencia'], opportunityType: ['tipo'], opportunityStatus: ['estado'] })
const GROUP_LABELS = deepFreeze({ modality: 'modalidad', customerName: 'cliente', country: 'país', city: 'ciudad', confidenceBand: 'confianza', freshnessBand: 'vigencia', opportunityType: 'tipo de oportunidad', opportunityStatus: 'estado de oportunidad' })

function equipmentRows(source) {
  const opportunities = source.opportunitySignals ?? []
  return source.equipmentRecords.map((record) => {
    const customer = source.customers.find(({ id }) => id === record.customerId) ?? {}
    const ageSignal = opportunities.find((signal) => signal.context.equipmentRecordId === record.id && signal.type === 'reportedAgeReview')
    return { customerId: record.customerId, customerName: customer.name ?? 'Desconocido', country: customer.country ?? null, city: customer.city ?? null, modality: record.modality, confidenceBand: record.confidenceScore?.band?.key ?? 'unavailable', freshnessBand: freshnessBand(record.confidenceScore), reportedAgeYears: ageSignal?.facts.find(({ key }) => key === 'reportedAgeYears')?.value ?? null, equipmentRecordId: record.id, evidenceIds: record.evidenceEntryIds ?? [], observationDate: record.latestObservationDate ?? null }
  })
}

function opportunityRows(source) {
  return (source.opportunitySignals ?? []).map((signal) => {
    const customer = source.customers.find(({ id }) => id === signal.context.customerId) ?? {}
    return { customerId: signal.context.customerId, customerName: customer.name ?? 'Desconocido', country: customer.country ?? null, city: customer.city ?? null, modality: source.equipmentRecords.find(({ id }) => id === signal.context.equipmentRecordId)?.modality ?? null, opportunityType: signal.type, opportunityStatus: signal.review.status, equipmentRecordId: signal.context.equipmentRecordId, evidenceIds: signal.evidenceIds, observationDate: signal.context.freshness.latestObservationDate }
  })
}

function matches(row, { field, operator, value }) {
  const actual = row[field]
  if (actual === null || actual === undefined) return false
  if (operator === 'eq') return normalize(actual) === normalize(value)
  if (typeof actual !== 'number' || typeof value !== 'number') return false
  return operator === 'gt' ? actual > value : actual >= value
}
function normalize(value) { return String(value).trim().toLocaleLowerCase('es') }
function displayValue(value) { return value === null || value === undefined || value === '' ? 'Desconocido' : String(value) }
function freshnessBand(score) { const component = score?.components?.freshness; if (!component?.latestObservationDate) return 'unknown'; return component.ageDays >= 90 ? 'old' : 'recent' }
function invalid(message) { return { valid: false, errors: [message], plan: null } }
