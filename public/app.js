const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]

let currentObservation = null
let currentView = null

const claimLabels = {
  equipmentType: 'Tipo de equipo',
  manufacturer: 'Fabricante',
  model: 'Modelo',
  quantity: 'Cantidad',
  location: 'Ubicación',
  age: 'Antigüedad',
  identifier: 'Identificador'
}
const certaintyLabels = { reported: 'Reportado', estimated: 'Estimado', unknown: 'Desconocido', confirmed: 'Confirmado' }
const sourceLabels = { directObservation: 'Observación directa', attributedStatement: 'Declaración atribuida', unattributedStatement: 'Declaración sin atribuir', recordOrLabel: 'Registro o etiqueta' }
const locationScopeLabels = { room: 'Sala', dept: 'Departamento', site: 'Sede', customer: 'Cliente', unknown: 'Sin definir' }
const quantityScopeLabels = { observed: 'Cantidad observada', reportedTotal: 'Total reportado', unknown: 'Alcance desconocido' }
const statusLabels = { verified: 'Verificado', provisional: 'Provisional', open: 'Pendiente' }
const modalityLabels = { Ultrasound: 'Ultrasonido', 'Patient monitoring': 'Monitoreo de pacientes' }
const locationLabels = { Radiology: 'Radiología', Emergency: 'Emergencias', Imaging: 'Diagnóstico por imágenes', 'Critical Care': 'Cuidados intensivos', 'Room 2': 'Sala 2' }

$$('.nav-item').forEach((button) => button.addEventListener('click', () => activateWorkspace(button.dataset.workspace)))
$$('.workspace-link').forEach((button) => button.addEventListener('click', () => activateWorkspace(button.dataset.target)))
$('#customer').addEventListener('change', changeCustomer)
$('#note').addEventListener('input', updateNoteLength)
$('#capture-form').addEventListener('submit', capture)
$('#review').addEventListener('click', review)
$('#answer-clarification').addEventListener('click', () => clarify('answered'))
$('#unknown-clarification').addEventListener('click', () => clarify('unknown'))
$('#skip-clarification').addEventListener('click', () => clarify('skipped'))
$('#reset').addEventListener('click', reset)

bootstrap().catch(() => {
  setRuntime('No se pudo conectar con QVAC local', 'error')
  setFeedback('No fue posible conectar con el servidor local. Confirme que la aplicación esté iniciada.', 'error')
})

async function bootstrap() {
  const data = await api('/api/bootstrap')
  $('#customer').innerHTML = data.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)} · ${escapeHtml(customer.site)}</option>`).join('')
  $('#footer-runtime').textContent = `${data.qvac.sdk} · ${data.qvac.modelExport} · GPU local`
  updateNoteLength()
  await loadView()
  setRuntime('QVAC local disponible', 'ready')
}

function activateWorkspace(name) {
  $$('.workspace').forEach((workspace) => workspace.classList.toggle('active', workspace.id === `workspace-${name}`))
  $$('.nav-item').forEach((button) => {
    const active = button.dataset.workspace === name
    button.classList.toggle('active', active)
    button.setAttribute('aria-current', active ? 'page' : 'false')
  })
  document.querySelector(`#workspace-${name}`)?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function changeCustomer() {
  if (currentObservation && currentObservation.customerId !== $('#customer').value) clearReviewWorkspace()
  await loadView()
}

async function capture(event) {
  event.preventDefault()
  const button = $('#extract')
  const lockedControls = [$('#customer'), $('#note'), $('#reset')]
  button.disabled = true
  button.innerHTML = '<span><span class="spinner" aria-hidden="true"></span>Guardando y analizando…</span>'
  lockedControls.forEach((control) => { control.disabled = true })
  setRuntime('QVAC analizando localmente', 'working')
  setFeedback('Guardando la observación antes de iniciar el análisis local…', 'loading')
  clearReviewWorkspace(false)

  try {
    currentObservation = await api('/api/observations', {
      method: 'POST',
      body: JSON.stringify({ customerId: $('#customer').value, text: $('#note').value })
    })
    renderOriginalObservation(currentObservation)
    await loadView()
    if (currentObservation.status !== 'succeeded') {
      showExtractionFailure(currentObservation)
      activateWorkspace('review')
      return
    }
    const needsClarification = currentObservation.clarification?.status === 'pending'
    renderDrafts(currentObservation, { reviewEnabled: !needsClarification })
    if (needsClarification) renderClarification(currentObservation.clarification)
    setFeedback(needsClarification ? 'Análisis local completado. Responda una aclaración breve antes de la revisión final.' : 'Análisis local completado. Revise los datos antes de incorporarlos.', 'success')
    activateWorkspace('review')
  } catch {
    setFeedback('No fue posible completar la captura. Confirme que el servidor local siga activo; el texto permanece en el formulario.', 'error')
  } finally {
    button.disabled = false
    button.innerHTML = '<span>Guardar y analizar con QVAC</span><span aria-hidden="true">→</span>'
    lockedControls.forEach((control) => { control.disabled = false })
    setRuntime('QVAC local disponible', 'ready')
  }
}

function renderOriginalObservation(observation) {
  $('#original-note').textContent = observation.originalText
  $('#clarification-evidence').innerHTML = (observation.evidenceEntries ?? []).map((entry) => `<div class="saved-answer"><span>Respuesta de aclaración · ${formatDate(entry.recordedAt)}</span><strong>${escapeHtml(entry.text)}</strong></div>`).join('')
  $('#observation-state').className = 'observation-state saved'
  $('#observation-state').textContent = `Observación guardada · ${formatDate(observation.recordedAt)}`
}

function showExtractionFailure(observation) {
  $('#draft-empty').classList.remove('hidden')
  $('#draft-empty').innerHTML = `<strong>La observación está guardada</strong><span>QVAC no produjo datos seguros después de ${observation.attempts.length} intento(s). Ningún resultado modificó la base instalada.</span><button class="button secondary workspace-link" data-target="capture" type="button">Volver a Capturar</button>`
  $('#draft-empty').querySelector('.workspace-link').addEventListener('click', () => activateWorkspace('capture'))
  $('#review-progress').textContent = 'Análisis no completado'
  $('#review-progress').className = 'review-progress error'
  $('#review-nav-count').classList.add('hidden')
  setFeedback('Observación guardada localmente. El análisis no produjo datos utilizables; puede volver a intentarlo desde Capturar.', 'error')
}

function renderDrafts(observation, { reviewEnabled = true } = {}) {
  $('#draft-empty').classList.add('hidden')
  $('#review-nav-count').textContent = observation.draftClaims.length
  $('#review-nav-count').classList.remove('hidden')
  $('#drafts').innerHTML = observation.draftClaims.map((claim) => `
    <article class="claim" data-claim="${claim.claimId}">
      <div class="claim-main">
        <div class="claim-name"><span>${translate(claim.type, claimLabels)}</span><strong>${escapeHtml(displayClaimValue(claim))}</strong></div>
        <span class="certainty ${claim.certainty}">${translate(claim.certainty, certaintyLabels)}</span>
      </div>
      <div class="evidence"><span>Evidencia en la observación</span><mark>${escapeHtml(claim.evidence.text)}</mark></div>
      <div class="claim-footer">
        <details><summary>Ver procedencia</summary><p>${translate(claim.sourceType, sourceLabels)} · ${translate(claim.locationScope, locationScopeLabels)}${claim.quantityScope ? ` · ${translate(claim.quantityScope, quantityScopeLabels)}` : ''}</p></details>
        <fieldset class="decision"><legend>Decisión</legend><label><input type="radio" name="${claim.claimId}" value="accepted" ${reviewEnabled ? '' : 'disabled'}><span>Aprobar</span></label><label><input type="radio" name="${claim.claimId}" value="rejected" ${reviewEnabled ? '' : 'disabled'}><span>Rechazar</span></label></fieldset>
      </div>
    </article>`).join('')

  $$('.decision input').forEach((input) => input.addEventListener('change', updateReviewProgress))
  $('#review').classList.toggle('hidden', !reviewEnabled)
  if (reviewEnabled) updateReviewProgress()
  else {
    $('#review-progress').textContent = '1 aclaración pendiente'
    $('#review-progress').className = 'review-progress'
  }
}

function renderClarification(clarification) {
  $('#clarification-question').textContent = clarification.question
  $('#clarification-answer').value = ''
  $('#clarification').classList.remove('hidden')
  $('#clarification-status').textContent = ''
  $('#review-nav-count').textContent = '1'
  $('#review-nav-count').classList.remove('hidden')
}

async function clarify(outcome) {
  const answer = $('#clarification-answer').value.trim()
  if (outcome === 'answered' && !answer) {
    setClarificationStatus('Escriba una respuesta antes de continuar.', 'error')
    $('#clarification-answer').focus()
    return
  }

  const controls = [$('#answer-clarification'), $('#unknown-clarification'), $('#skip-clarification'), $('#clarification-answer')]
  controls.forEach((control) => { control.disabled = true })
  if (outcome === 'answered') {
    $('#answer-clarification').innerHTML = '<span><span class="spinner" aria-hidden="true"></span>Guardando y analizando…</span>'
    setClarificationStatus('Respuesta guardada. QVAC realiza el segundo y último análisis local…', 'loading')
    setRuntime('QVAC analizando la aclaración', 'working')
  } else {
    setClarificationStatus(outcome === 'unknown' ? 'Guardando “No lo sé”…' : 'Omitiendo la aclaración…', 'loading')
  }

  try {
    currentObservation = await api(`/api/observations/${currentObservation.id}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ outcome, answer: outcome === 'answered' ? answer : undefined })
    })
    renderOriginalObservation(currentObservation)
    $('#clarification').classList.add('hidden')
    if (currentObservation.status !== 'succeeded') {
      showClarificationFailure(currentObservation)
      return
    }
    renderDrafts(currentObservation)
    setFeedback(outcome === 'answered' ? 'Aclaración incorporada. Revise los datos finales antes de usarlos.' : 'Aclaración finalizada. Revise los datos extraídos y conserve cualquier incertidumbre.', 'success')
  } catch {
    setClarificationStatus('No fue posible guardar la decisión. La pregunta sigue pendiente; vuelva a intentarlo.', 'error')
  } finally {
    controls.forEach((control) => { control.disabled = false })
    $('#answer-clarification').innerHTML = '<span>Responder y volver a analizar</span><span aria-hidden="true">→</span>'
    setRuntime('QVAC local disponible', 'ready')
  }
}

function showClarificationFailure(observation) {
  $('#drafts').innerHTML = ''
  $('#draft-empty').classList.remove('hidden')
  $('#draft-empty').innerHTML = '<strong>La observación y la respuesta están guardadas</strong><span>El segundo análisis no produjo datos seguros. Los borradores anteriores quedaron reemplazados y nada modificó la base instalada.</span>'
  $('#review').classList.add('hidden')
  $('#review-progress').textContent = 'Análisis final no completado'
  $('#review-progress').className = 'review-progress error'
  $('#review-nav-count').classList.add('hidden')
  setFeedback(`La aclaración quedó guardada. QVAC agotó el máximo de ${observation.attempts.length} inferencias sin producir datos finales revisables.`, 'error')
}

function updateReviewProgress() {
  const total = currentObservation?.draftClaims.length ?? 0
  const completed = $$('.decision input:checked').length
  $('#review-progress').textContent = total ? `${completed} de ${total} decisiones completadas` : 'Sin datos pendientes'
  $('#review-progress').className = `review-progress${completed === total && total ? ' complete' : ''}`
  $('#review').disabled = !total || completed !== total
}

async function review() {
  const button = $('#review')
  button.disabled = true
  button.innerHTML = '<span><span class="spinner" aria-hidden="true"></span>Aplicando revisión…</span>'
  try {
    const decisions = currentObservation.draftClaims.map((claim) => ({ claimId: claim.claimId, decision: document.querySelector(`input[name="${claim.claimId}"]:checked`).value }))
    currentObservation = await api(`/api/observations/${currentObservation.id}/review`, { method: 'POST', body: JSON.stringify({ decisions }) })
    renderReviewedClaims(currentObservation)
    renderCandidates(currentObservation.candidates)
    $('#reconciliation-section').classList.remove('hidden')
    $('#review-progress').textContent = 'Revisión completada'
    $('#review-progress').className = 'review-progress complete'
    $('#review-nav-count').classList.add('hidden')
    setFeedback('Revisión completada. Los datos rechazados quedaron fuera de la base instalada.', 'success')
    await loadView()
    $('#reconciliation-section').scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch {
    setFeedback('No fue posible aplicar la revisión. Sus decisiones siguen visibles para volver a intentarlo.', 'error')
    updateReviewProgress()
  } finally {
    button.innerHTML = '<span>Completar revisión</span><span aria-hidden="true">→</span>'
  }
}

function renderReviewedClaims(observation) {
  $$('.claim').forEach((card) => {
    const claim = observation.draftClaims.find((item) => item.claimId === card.dataset.claim)
    card.classList.add(claim.decision)
    card.querySelectorAll('input').forEach((input) => { input.disabled = true })
  })
  $('#review').classList.add('hidden')
}

function renderCandidates(candidates) {
  const accepted = currentObservation.draftClaims.filter((claim) => claim.decision === 'accepted' && !claim.negated)
  if (!candidates.length) {
    $('#reconcile').innerHTML = '<div class="surface empty-reconciliation"><strong>No hay un equipo existente suficientemente relacionado</strong><p>La evidencia aceptada permanece sin vincular. No se creará ningún registro automáticamente.</p></div>'
    return
  }

  $('#reconcile').innerHTML = candidates.map((candidate, index) => {
    const matches = matchingFields(accepted, candidate)
    return `<article class="surface comparison-card ${index ? 'secondary-candidate' : ''}">
      <div class="comparison-column"><span class="comparison-label">Evidencia aceptada</span>${accepted.map((claim) => `<div class="comparison-row"><span>${translate(claim.type, claimLabels)}</span><strong>${escapeHtml(displayClaimValue(claim))}</strong></div>`).join('')}</div>
      <div class="match-connector"><span aria-hidden="true">↔</span><strong>${matches.length} coincidencias</strong><small>${matches.map((field) => translate(field, claimLabels)).join(', ')}</small></div>
      <div class="comparison-column equipment-candidate"><span class="comparison-label">Equipo existente propuesto</span><h3>${escapeHtml(candidate.manufacturer)} ${escapeHtml(displayModality(candidate.modality))}</h3><p>${escapeHtml(candidate.model)} · ${escapeHtml(displayLocation(candidate.location))}</p><span class="status-pill ${candidate.status}">${translate(candidate.status, statusLabels)}</span><button class="button primary link-record" data-record="${candidate.id}" type="button"><span>Vincular con equipo existente</span><span aria-hidden="true">→</span></button><small class="duplicate-note">La vinculación agrega evidencia a este equipo y evita crear un duplicado.</small></div>
    </article>`
  }).join('')
  $$('.link-record').forEach((button) => button.addEventListener('click', () => reconcile(button.dataset.record)))
}

async function reconcile(recordId) {
  const button = $(`.link-record[data-record="${recordId}"]`)
  if (button) {
    button.disabled = true
    button.innerHTML = '<span><span class="spinner" aria-hidden="true"></span>Vinculando…</span>'
  }
  try {
    await api(`/api/observations/${currentObservation.id}/reconcile`, { method: 'POST', body: JSON.stringify({ recordId, reason: 'El usuario confirmó que la evidencia repetida corresponde a este registro sintético' }) })
    $('#reconcile').innerHTML = '<div class="surface reconciliation-success"><span aria-hidden="true">✓</span><div><strong>Evidencia vinculada sin crear un duplicado</strong><p>El equipo existente conserva su registro y ahora incluye esta observación.</p><button class="button secondary workspace-link" data-target="installed" type="button">Ver base instalada</button></div></div>'
    $('#reconcile .workspace-link').addEventListener('click', () => activateWorkspace('installed'))
    setFeedback('Reconciliación completada. El número de equipos no aumentó.', 'success')
    await loadView()
  } catch {
    setFeedback('No fue posible vincular la evidencia. No se creó ningún equipo nuevo; vuelva a intentarlo.', 'error')
    if (button) {
      button.disabled = false
      button.innerHTML = '<span>Vincular con equipo existente</span><span aria-hidden="true">→</span>'
    }
  }
}

async function loadView() {
  const customerId = $('#customer').value
  if (!customerId) return
  const [view, bootstrapData] = await Promise.all([api(`/api/customers/${customerId}/view`), api('/api/bootstrap')])
  currentView = view
  $('#header-customer').textContent = view.customer.name
  $('#installed-title').textContent = `Base instalada de ${view.customer.name}`
  $('#installed-description').textContent = `${view.customer.site} · vista de trabajo basada en evidencia sintética revisada.`
  renderCustomerMetrics(view)
  renderEquipment(view.equipmentRecords)
  renderVerification(view)
  renderAggregate(bootstrapData.aggregate)
}

function renderCustomerMetrics(view) {
  $('#customer-metrics').innerHTML = [
    summaryMetric(view.equipmentRecords.length, 'Equipos registrados', 'Total del cliente'),
    summaryMetric(view.equipmentRecords.filter((record) => record.status === 'verified').length, 'Verificados', 'Identidad respaldada'),
    summaryMetric(view.equipmentRecords.filter((record) => record.status === 'provisional').length, 'Provisionales', 'Identidad por confirmar'),
    summaryMetric(view.observations.length, 'Observaciones', 'Notas guardadas localmente')
  ].join('')
}

function renderEquipment(records) {
  $('#equipment').innerHTML = records.length ? records.map((record) => `<article class="equipment-row"><span class="equipment-symbol" aria-hidden="true">${escapeHtml(record.modality.slice(0, 2).toUpperCase())}</span><div class="equipment-identity"><strong>${escapeHtml(record.manufacturer)} ${escapeHtml(displayModality(record.modality))}</strong><span>${escapeHtml(record.model)} · ${escapeHtml(displayLocation(record.location))}</span></div><div class="equipment-evidence"><strong>${record.evidenceObservationIds.length}</strong><span>evidencias nuevas</span></div><span class="status-pill ${record.status}">${translate(record.status, statusLabels)}</span></article>`).join('') : '<div class="empty-state"><strong>No hay equipos registrados</strong><span>Las observaciones revisadas aparecerán aquí.</span></div>'
}

function renderVerification(view) {
  const items = view.verificationItems
  $('#verification-nav-count').textContent = items.length
  $('#verification-summary').textContent = `${items.length} pendiente${items.length === 1 ? '' : 's'}`
  $('#verification').innerHTML = items.length ? items.map((item) => {
    const record = view.equipmentRecords.find((candidate) => candidate.id === item.equipmentRecordId)
    const relation = record ? `${record.manufacturer} ${displayModality(record.modality)} · ${record.model}` : 'Grupo de equipos por confirmar'
    return `<article class="verification-row"><span class="priority-badge">${item.priority}</span><div class="verification-copy"><strong>${escapeHtml(item.reason)}</strong><span>Confirmar en una próxima revisión de evidencia.</span></div><div class="verification-relation"><strong>${escapeHtml(relation)}</strong><span>${record ? displayLocation(record.location) : 'Relación aún no resuelta'}</span></div><span class="status-pill open">${translate(item.status, statusLabels)}</span></article>`
  }).join('') : '<div class="empty-state"><strong>No hay verificaciones pendientes</strong><span>La evidencia disponible no requiere una comprobación prioritaria.</span></div>'
}

function renderAggregate(data) {
  const max = Math.max(1, ...data.byModality.map((item) => item.count))
  $('#aggregate').innerHTML = `<div class="aggregate-summary"><div><strong>${data.verifiedRecords}</strong><span>Verificados</span></div><div><strong>${data.provisionalRecords}</strong><span>Provisionales</span></div><div><strong>${data.customers}</strong><span>Clientes ficticios</span></div></div><div class="modality-list"><span class="comparison-label">Registros por modalidad</span>${data.byModality.map((item) => `<div class="bar-row"><div><span>${escapeHtml(displayModality(item.modality))}</span><strong>${item.count}</strong></div><div class="bar"><span style="width:${item.count / max * 100}%"></span></div></div>`).join('')}</div>`
}

async function reset() {
  const button = $('#reset')
  button.disabled = true
  button.textContent = 'Restableciendo…'
  try {
    await api('/api/reset', { method: 'POST' })
    currentObservation = null
    clearReviewWorkspace()
    setFeedback('Demostración restablecida con los datos sintéticos iniciales.', 'success')
    await loadView()
    activateWorkspace('capture')
  } catch {
    setFeedback('No fue posible restablecer la demostración. Confirme que el servidor local siga activo.', 'error')
  } finally {
    button.disabled = false
    button.textContent = 'Restablecer'
  }
}

function clearReviewWorkspace(clearObservation = true) {
  if (clearObservation) currentObservation = null
  $('#original-note').textContent = 'Todavía no hay una observación para revisar.'
  $('#clarification-evidence').innerHTML = ''
  $('#observation-state').className = 'observation-state'
  $('#observation-state').textContent = 'Registre una observación desde Capturar.'
  $('#drafts').innerHTML = ''
  $('#clarification').classList.add('hidden')
  $('#clarification-answer').value = ''
  $('#clarification-status').textContent = ''
  $('#draft-empty').classList.remove('hidden')
  $('#draft-empty').innerHTML = '<strong>No hay datos para revisar</strong><span>Analice una observación para comenzar.</span><button class="button secondary workspace-link" data-target="capture" type="button">Ir a Capturar</button>'
  $('#draft-empty .workspace-link').addEventListener('click', () => activateWorkspace('capture'))
  $('#review').classList.add('hidden')
  $('#reconciliation-section').classList.add('hidden')
  $('#reconcile').innerHTML = ''
  $('#review-progress').textContent = 'Sin datos pendientes'
  $('#review-progress').className = 'review-progress'
  $('#review-nav-count').classList.add('hidden')
}

function matchingFields(claims, candidate) {
  const pairs = { equipmentType: candidate.modality, manufacturer: candidate.manufacturer, model: candidate.model }
  return Object.entries(pairs).filter(([type, value]) => claims.some((claim) => claim.type === type && String(claim.value).toLowerCase() === String(value).toLowerCase())).map(([type]) => type)
}

function updateNoteLength() { $('#note-length').textContent = `${$('#note').value.length} caracteres` }
function displayClaimValue(claim) {
  if (claim.type === 'equipmentType') return displayModality(String(claim.value))
  if (claim.type === 'location') return displayLocation(String(claim.value))
  return String(claim.value)
}
function displayModality(value) { return modalityLabels[value] ?? value }
function displayLocation(value) { return locationLabels[value] ?? value }
function translate(value, dictionary) { return dictionary[value] ?? value }
function summaryMetric(value, label, detail) { return `<article class="summary-card"><strong>${value}</strong><div><span>${label}</span><small>${detail}</small></div></article>` }
function setFeedback(message, kind = '') { $('#capture-status').className = `feedback ${kind}`; $('#capture-status').textContent = message }
function setClarificationStatus(message, kind = '') { $('#clarification-status').className = `feedback ${kind}`; $('#clarification-status').textContent = message }
function setRuntime(message, kind) { $('#runtime-status').className = `runtime-status ${kind}`; $('#runtime-status').innerHTML = `<span class="status-dot"></span>${escapeHtml(message)}` }
function formatDate(value) { return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML }
async function api(url, options) { const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La solicitud local falló.'); return data }
