const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]

let currentObservation = null
let currentView = null
let allVerificationItems = []
let allOpportunitySignals = []
let allCustomers = []

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
const correctionFieldLabels = { equipmentType: 'Tipo de equipo', manufacturer: 'Fabricante', model: 'Modelo', quantity: 'Cantidad', quantityScope: 'Alcance de cantidad', certainty: 'Estado de certeza' }
const statusLabels = { verified: 'Verificado', provisional: 'Provisional', open: 'Pendiente' }
const priorityLabels = { high: 'Alta', medium: 'Media', low: 'Baja' }
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
$('#export-workspace').addEventListener('click', exportWorkspace)
$('#export-before-delete').addEventListener('click', exportWorkspace)
$('#open-delete').addEventListener('click', openDeleteConfirmation)
$('#cancel-delete').addEventListener('click', cancelDelete)
$('#delete-phrase').addEventListener('input', updateDeleteConfirmation)
$('#confirm-delete').addEventListener('click', deleteWorkspace)
for (const id of ['#verification-priority', '#verification-customer', '#verification-equipment', '#verification-reason']) {
  $(id).addEventListener('change', applyVerificationFilters)
}
for (const id of ['#opportunity-type', '#opportunity-status']) $(id).addEventListener('change', applyOpportunityFilters)

bootstrap().catch(() => {
  setRuntime('No se pudo conectar con QVAC local', 'error')
  setFeedback('No fue posible conectar con el servidor local. Confirme que la aplicación esté iniciada.', 'error')
})

async function bootstrap() {
  const data = await api('/api/bootstrap')
  allCustomers = data.customers
  const customerSelect = $('#customer')
  customerSelect.innerHTML = data.customers.length
    ? data.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)} · ${escapeHtml(customer.site)}</option>`).join('')
    : '<option value="">Workspace vacío</option>'
  customerSelect.disabled = data.customers.length === 0
  $('#extract').disabled = data.customers.length === 0
  $('#footer-runtime').textContent = `${data.qvac.sdk} · ${data.qvac.modelExport} · GPU local`
  updateNoteLength()
  if (!data.customers.length) {
    renderEmptyWorkspace(data.aggregate)
    setRuntime('QVAC local disponible', 'ready')
    return
  }
  await loadView({ syncVerificationCustomer: true })
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
  await loadView({ syncVerificationCustomer: true })
}

async function capture(event) {
  event.preventDefault()
  const button = $('#extract')
  const lockedControls = [$('#customer'), $('#note'), $('#observation-date'), $('#reset')]
  button.disabled = true
  button.innerHTML = '<span><span class="spinner" aria-hidden="true"></span>Guardando y analizando…</span>'
  lockedControls.forEach((control) => { control.disabled = true })
  setRuntime('QVAC analizando localmente', 'working')
  setFeedback('Guardando la observación antes de iniciar el análisis local…', 'loading')
  clearReviewWorkspace(false)

  try {
    currentObservation = await api('/api/observations', {
      method: 'POST',
      body: JSON.stringify({ customerId: $('#customer').value, text: $('#note').value, observationDate: $('#observation-date').value || null })
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
  $('#clarification-evidence').innerHTML = (observation.evidenceEntries ?? []).map((entry) => entry.type === 'reviewerCorrection'
    ? `<div class="saved-answer reviewer-evidence"><span>Evidencia aportada por el revisor · ${formatDate(entry.recordedAt)}</span><strong>${escapeHtml(translate(entry.field, correctionFieldLabels))}: ${escapeHtml(entry.text)}</strong>${entry.reason ? `<small>${escapeHtml(entry.reason)}</small>` : ''}</div>`
    : `<div class="saved-answer"><span>Respuesta de aclaración · ${formatDate(entry.recordedAt)}</span><strong>${escapeHtml(entry.text)}</strong></div>`).join('')
  $('#observation-state').className = 'observation-state saved'
  $('#observation-state').innerHTML = `<span>${observation.observationDate ? `Fecha de observación: ${formatObservationDate(observation.observationDate)}` : 'Fecha de observación desconocida'}</span><span>Evidencia registrada: ${formatDate(observation.recordedAt)} · ${formatEvidenceAge(observation.recordedAt)}</span>`
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
      ${renderCorrectionSummary(claim)}
      <div class="evidence"><span>Evidencia en la observación</span><mark>${escapeHtml(claim.evidence.text)}</mark></div>
      <div class="claim-footer">
        <details><summary>Ver procedencia</summary><p>${translate(claim.sourceType, sourceLabels)} · ${translate(claim.locationScope, locationScopeLabels)}${claim.quantityScope ? ` · ${translate(claim.quantityScope, quantityScopeLabels)}` : ''}</p></details>
        <div class="claim-actions">${reviewEnabled ? `<button class="button secondary correct-claim" data-claim="${claim.claimId}" type="button">Corregir</button>` : ''}<fieldset class="decision"><legend>Decisión</legend><label><input type="radio" name="${claim.claimId}" value="accepted" ${reviewEnabled ? '' : 'disabled'}><span>Aprobar</span></label><label><input type="radio" name="${claim.claimId}" value="rejected" ${reviewEnabled ? '' : 'disabled'}><span>Rechazar</span></label></fieldset></div>
      </div>
      ${reviewEnabled ? renderCorrectionForm(claim) : ''}
    </article>`).join('')

  $$('.decision input').forEach((input) => input.addEventListener('change', updateReviewProgress))
  $$('.correct-claim').forEach((button) => button.addEventListener('click', () => openCorrection(button.dataset.claim)))
  $$('.cancel-correction').forEach((button) => button.addEventListener('click', () => closeCorrection(button.dataset.claim)))
  $$('.correction-field').forEach((select) => select.addEventListener('change', () => renderCorrectionInput(select.closest('.correction-form'), select.value)))
  $$('.correction-form').forEach((form) => form.addEventListener('submit', correctClaim))
  $('#review').classList.toggle('hidden', !reviewEnabled)
  if (reviewEnabled) updateReviewProgress()
  else {
    $('#review-progress').textContent = '1 aclaración pendiente'
    $('#review-progress').className = 'review-progress'
  }
}

function renderCorrectionSummary(claim) {
  if (!claim.corrections?.length) return ''
  const latest = claim.corrections.at(-1)
  return `<div class="correction-summary">
    <div><span>Valor extraído por QVAC</span><strong>${escapeHtml(formatCorrectionValue(claim, latest.field, true))}</strong></div>
    <span class="correction-arrow" aria-hidden="true">→</span>
    <div><span>Valor corregido por el usuario</span><strong>${escapeHtml(formatCorrectionValue(claim, latest.field, false))}</strong></div>
    <small>${latest.origin === 'reviewerProvided' ? 'Origen: evidencia aportada por el revisor' : 'Origen: observación original'} · ${formatDate(latest.correctedAt)}</small>
  </div>`
}

function renderCorrectionForm(claim) {
  const fields = correctionFields(claim)
  return `<form class="correction-form hidden" data-claim="${claim.claimId}" novalidate>
    <div class="correction-grid">
      <label>Campo a corregir<select class="correction-field" name="field">${fields.map((field) => `<option value="${field}">${translate(field, correctionFieldLabels)}</option>`).join('')}</select></label>
      <label class="correction-value-label">Valor corregido<div class="correction-value-control"></div></label>
    </div>
    <label>Motivo breve <span>(opcional)</span><input class="correction-reason" name="reason" maxlength="200" type="text" placeholder="Explique por qué realizó el cambio"></label>
    <p class="correction-help">El valor original de QVAC se conservará. Si el nuevo valor no aparece en la observación, se guardará como evidencia aportada por usted.</p>
    <div class="correction-form-actions"><button class="button secondary save-correction" type="submit">Guardar corrección</button><button class="text-button cancel-correction" data-claim="${claim.claimId}" type="button">Cancelar</button></div>
    <div class="correction-status feedback" aria-live="polite"></div>
  </form>`
}

function correctionFields(claim) {
  const fields = ['certainty']
  if (['equipmentType', 'manufacturer', 'model', 'quantity'].includes(claim.type)) fields.unshift(claim.type)
  if (claim.type === 'quantity') fields.splice(1, 0, 'quantityScope')
  return fields
}

function openCorrection(claimId) {
  const form = $(`.correction-form[data-claim="${claimId}"]`)
  $$('.correction-form').forEach((candidate) => candidate.classList.toggle('hidden', candidate !== form))
  renderCorrectionInput(form, form.querySelector('.correction-field').value)
  form.classList.remove('hidden')
  form.querySelector('input, select').focus()
}

function closeCorrection(claimId) {
  $(`.correction-form[data-claim="${claimId}"]`)?.classList.add('hidden')
}

function renderCorrectionInput(form, field) {
  const claim = currentObservation.draftClaims.find((item) => item.claimId === form.dataset.claim)
  const currentValue = correctionCurrentValue(claim, field)
  const control = form.querySelector('.correction-value-control')
  if (field === 'quantityScope') {
    control.innerHTML = `<select name="correctedValue" required>${Object.entries(quantityScopeLabels).map(([value, label]) => `<option value="${value}" ${value === currentValue ? 'selected' : ''}>${label}</option>`).join('')}</select>`
  } else if (field === 'certainty') {
    control.innerHTML = `<select name="correctedValue" required>${['reported', 'estimated', 'unknown'].map((value) => `<option value="${value}" ${value === currentValue ? 'selected' : ''}>${certaintyLabels[value]}</option>`).join('')}</select>`
  } else {
    const type = field === 'quantity' ? 'number' : 'text'
    const constraints = field === 'quantity' ? 'min="1" step="1"' : 'maxlength="100"'
    control.innerHTML = `<input name="correctedValue" type="${type}" ${constraints} required value="${escapeHtml(currentValue)}">`
  }
}

async function correctClaim(event) {
  event.preventDefault()
  const form = event.currentTarget
  const claimId = form.dataset.claim
  const decisions = new Map($$('.decision input:checked').map((input) => [input.name, input.value]))
  const submit = form.querySelector('.save-correction')
  const status = form.querySelector('.correction-status')
  submit.disabled = true
  status.className = 'correction-status feedback loading'
  status.textContent = 'Guardando la corrección…'
  try {
    const field = form.querySelector('.correction-field').value
    const input = form.querySelector('[name="correctedValue"]')
    currentObservation = await api(`/api/observations/${currentObservation.id}/claims/${claimId}/correction`, {
      method: 'POST',
      body: JSON.stringify({ field, correctedValue: input.value, reason: form.querySelector('.correction-reason').value })
    })
    renderOriginalObservation(currentObservation)
    renderDrafts(currentObservation)
    for (const [savedClaimId, decision] of decisions) {
      if (savedClaimId === claimId) continue
      const inputToRestore = document.querySelector(`input[name="${savedClaimId}"][value="${decision}"]`)
      if (inputToRestore) inputToRestore.checked = true
    }
    updateReviewProgress()
    setFeedback('Corrección guardada. El dato todavía requiere aprobación o rechazo explícito.', 'success')
  } catch (error) {
    submit.disabled = false
    status.className = 'correction-status feedback error'
    status.textContent = error instanceof Error ? error.message : 'No fue posible guardar la corrección.'
  }
}

function correctionCurrentValue(claim, field) {
  if (field === 'certainty') return claim.reviewedCertainty
  if (field === 'quantityScope') return claim.reviewedQuantityScope
  return claim.reviewedValue
}

function formatCorrectionValue(claim, field, original) {
  const value = field === 'certainty'
    ? (original ? claim.originalCertainty : claim.reviewedCertainty)
    : field === 'quantityScope'
      ? (original ? claim.originalQuantityScope : claim.reviewedQuantityScope)
      : (original ? claim.originalValue : claim.reviewedValue)
  if (field === 'certainty') return translate(value, certaintyLabels)
  if (field === 'quantityScope') return translate(value, quantityScopeLabels)
  if (field === 'equipmentType') return displayModality(String(value))
  return String(value)
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
    card.querySelectorAll('input, select, textarea, button').forEach((control) => { control.disabled = true })
    card.querySelector('.correction-form')?.classList.add('hidden')
    card.querySelector('.correct-claim')?.classList.add('hidden')
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

async function loadView({ syncVerificationCustomer = false } = {}) {
  const customerId = $('#customer').value
  if (!customerId) return
  const [view, bootstrapData, verificationItems] = await Promise.all([api(`/api/customers/${customerId}/view`), api('/api/bootstrap'), api('/api/verifications')])
  currentView = view
  allVerificationItems = verificationItems
  $('#header-customer').textContent = view.customer.name
  $('#installed-title').textContent = `Base instalada de ${view.customer.name}`
  $('#installed-description').textContent = `${view.customer.site} · vista de trabajo basada en evidencia sintética revisada.`
  renderCustomerMetrics(view)
  renderEquipment(view.equipmentRecords)
  allOpportunitySignals = view.opportunitySignals ?? []
  applyOpportunityFilters()
  renderVerificationFilters({ selectedCustomerId: syncVerificationCustomer ? customerId : undefined, freshnessPolicy: view.freshnessPolicy })
  applyVerificationFilters()
  renderAggregate(bootstrapData.aggregate, bootstrapData.opportunityAggregate)
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
  $('#equipment').innerHTML = records.length ? records.map((record) => `<article class="equipment-row"><span class="equipment-symbol" aria-hidden="true">${escapeHtml(record.modality.slice(0, 2).toUpperCase())}</span><div class="equipment-identity"><strong>${escapeHtml(record.manufacturer)} ${escapeHtml(displayModality(record.modality))}</strong><span>${escapeHtml(record.model)} · ${escapeHtml(displayLocation(record.location))}</span><small>Última evidencia: ${formatEvidenceAge(record.latestEvidenceAt)}${record.latestEvidenceAt ? ` · ${formatDateOnly(record.latestEvidenceAt)}` : ''}</small><small>${record.latestObservationDate ? `Fecha de observación: ${formatObservationDate(record.latestObservationDate)}` : 'Fecha de observación desconocida'}</small></div>${renderConfidenceScore(record.confidenceScore)}<div class="equipment-evidence"><strong>${record.evidenceObservationIds.length}</strong><span>observaciones nuevas</span></div><span class="status-pill ${record.status}">${translate(record.status, statusLabels)}</span></article>`).join('') : '<div class="empty-state"><strong>No hay equipos registrados</strong><span>Las observaciones revisadas aparecerán aquí.</span></div>'
}

function renderOpportunities(signals) {
  $('#opportunities').innerHTML = signals.length ? signals.map((signal) => `<article class="opportunity-card">
    <div><span class="status-pill ${signal.review.status === 'dismissed' ? 'provisional' : 'verified'}">${signal.review.status === 'dismissed' ? 'Descartada' : 'Por revisar'}</span><h3>${escapeHtml(signal.label)}</h3><p>${escapeHtml(signal.reason)}</p></div>
    <details><summary>Ver razón y evidencia</summary><p><strong>Contexto:</strong> cliente ${escapeHtml(signal.context.customerId)}, equipo ${escapeHtml(signal.context.equipmentRecordId)}; confianza ${signal.context.confidence.available ? `${signal.context.confidence.total}/100 (${escapeHtml(signal.context.confidence.band.label)})` : 'no disponible'}; evidencia más reciente ${displayOpportunityDate(signal.context.freshness.latestObservationDate)}.</p>${renderOpportunityConfidence(signal.context.confidence)}<p><strong>Siguiente verificación:</strong> ${escapeHtml(signal.suggestedVerification)}</p><ul>${signal.facts.map((fact) => `<li><strong>${escapeHtml(fact.label)}:</strong> ${escapeHtml(Array.isArray(fact.value) ? fact.value.join(', ') : fact.value ?? 'desconocida')}</li>`).join('')}</ul><ol>${signal.evidence.map((entry) => `<li><strong>${escapeHtml(entry.author)}</strong>: ${escapeHtml(entry.text)} <small>${displayOpportunityDate(entry.observationDate)} · alcance ${escapeHtml(translate(entry.locationScope, locationScopeLabels))}</small></li>`).join('')}</ol><p>Regla ${escapeHtml(signal.rule.version)} / ${escapeHtml(signal.rule.id)}.</p><p>${escapeHtml(signal.disclaimer)}</p></details>
    ${signal.review.status === 'unreviewed' ? `<button class="button secondary dismiss-opportunity" data-signal="${escapeHtml(signal.id)}" type="button">Descartar señal</button>` : `<small>Descartada por ${escapeHtml(signal.review.actor)}: ${escapeHtml(signal.review.reason)}</small>`}
  </article>`).join('') : '<div class="empty-state"><strong>Sin señales para revisar</strong><span>Las reglas conservadoras no detectaron hechos suficientes.</span></div>'
  $$('.dismiss-opportunity').forEach((button) => button.addEventListener('click', () => dismissOpportunity(button)))
}

function renderOpportunityConfidence(confidence) {
  if (!confidence.components) return '<p>Desglose de confianza no disponible; no se infiere.</p>'
  const labels = { completeness: 'Completitud', freshness: 'Vigencia', corroboration: 'Corroboración' }
  return `<ul class="opportunity-confidence">${Object.entries(confidence.components).map(([key, component]) => `<li><strong>${labels[key]}: ${component.points}/${component.maximum}</strong> · ${escapeHtml(component.reason)}</li>`).join('')}</ul>`
}

function applyOpportunityFilters() {
  const type = $('#opportunity-type').value
  const status = $('#opportunity-status').value
  renderOpportunities(allOpportunitySignals.filter((signal) => (!type || signal.type === type) && (!status || signal.review.status === status)))
}

async function dismissOpportunity(button) {
  button.disabled = true
  try {
    await api(`/api/opportunities/${encodeURIComponent(button.dataset.signal)}/dismiss`, { method: 'POST', body: JSON.stringify({ reason: 'Descartada durante la revisión local del prototipo' }) })
    await loadView()
  } catch {
    button.disabled = false
    button.textContent = 'No se pudo descartar; reintentar'
  }
}

function renderConfidenceScore(score) {
  if (!score) return ''
  const components = [
    ['Completitud', score.components.completeness],
    ['Vigencia', score.components.freshness],
    ['Corroboración', score.components.corroboration]
  ]
  const evidence = score.evidence ?? []
  const headline = score.available
    ? `${score.total}/100 <small class="confidence-band ${escapeHtml(score.band.key)}">${escapeHtml(score.band.label)}</small>`
    : `<small class="confidence-band unavailable">${escapeHtml(score.band.label)}</small>`
  return `<div class="equipment-confidence"><span>Confianza de evidencia</span><strong>${headline}</strong><details><summary>Ver desglose y evidencia</summary>${score.availabilityReason ? `<p class="confidence-warning">${escapeHtml(score.availabilityReason)}</p>` : ''}<ul>${components.map(([label, component]) => `<li><strong>${label}: ${component.points}/${component.maximum}</strong><span>${escapeHtml(component.reason)}</span></li>`).join('')}</ul><p>Regla ${escapeHtml(score.version)} · Fecha de evaluación: ${formatObservationDate(score.evaluatedOn)}</p><p>Procedencias consideradas: ${score.components.corroboration.sourceIds.length ? score.components.corroboration.sourceIds.map((id) => `<a href="#${confidenceEvidenceAnchor(id)}">${escapeHtml(id)}</a>`).join(', ') : 'ninguna'}.</p>${evidence.length ? `<ol class="confidence-evidence-list">${evidence.map(renderConfidenceEvidence).join('')}</ol>` : '<p>No hay evidencia vinculada.</p>'}<p>${escapeHtml(score.disclaimer)}</p><p>No cambia la certeza, la prioridad, la revisión ni la identidad.</p></details></div>`
}

function renderConfidenceEvidence(item) {
  const exclusionLabels = { unknownScope: 'alcance desconocido', unreviewedScope: 'sin claim aceptada ni alcance estructurado', incompatibleEvidence: 'evidencia incompatible', compatibilityUnestablished: 'compatibilidad no establecida', duplicateProvenance: 'procedencia repetida para corroboración', possibleChangeForCorroboration: 'posible cambio temporal; no corrobora el mismo estado' }
  const excluded = item.exclusionCodes?.length ? ` · Excluida: ${item.exclusionCodes.map((code) => exclusionLabels[code] ?? code).join(', ')}` : ''
  const roles = [item.countedForFreshness ? 'determina vigencia' : null, item.countedForCorroboration ? 'cuenta para corroboración' : null].filter(Boolean)
  return `<li id="${confidenceEvidenceAnchor(item.id)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.excerpt || 'Sin texto visible')}</span><small>${escapeHtml(item.author)} · ${item.observationDate ? formatObservationDate(item.observationDate) : 'fecha de observación desconocida'} · ${item.scope === 'explicitRecordScope' ? 'alcance explícito del registro' : 'alcance desconocido'}${roles.length ? ` · ${roles.join(' y ')}` : ''}${excluded}</small></li>`
}

function confidenceEvidenceAnchor(id) {
  return `confidence-evidence-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function renderVerificationFilters({ selectedCustomerId, freshnessPolicy }) {
  const customerSelect = $('#verification-customer')
  const previousCustomer = selectedCustomerId ?? customerSelect.value
  customerSelect.innerHTML = `<option value="">Todos</option>${allCustomers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join('')}`
  customerSelect.value = previousCustomer

  const equipmentSelect = $('#verification-equipment')
  const previousEquipment = equipmentSelect.value
  const equipment = [...new Map(allVerificationItems.filter((item) => item.equipmentRecord).map((item) => [item.equipmentRecord.id, item.equipmentRecord])).values()]
  equipmentSelect.innerHTML = `<option value="">Todos</option><option value="unlinked">Sin equipo vinculado</option>${equipment.map((record) => `<option value="${record.id}">${escapeHtml(record.manufacturer)} ${escapeHtml(displayModality(record.modality))} · ${escapeHtml(record.model)}</option>`).join('')}`
  if ([...equipmentSelect.options].some(({ value }) => value === previousEquipment)) equipmentSelect.value = previousEquipment

  const reasonSelect = $('#verification-reason')
  const previousReason = reasonSelect.value
  const reasons = new Map()
  for (const item of allVerificationItems) item.reasonCodes.forEach((code, index) => reasons.set(code, item.reasons[index]))
  reasonSelect.innerHTML = `<option value="">Todos</option>${[...reasons].sort((left, right) => left[1].localeCompare(right[1], 'es')).map(([code, label]) => `<option value="${code}">${escapeHtml(label)}</option>`).join('')}`
  if (reasons.has(previousReason)) reasonSelect.value = previousReason
  $('#freshness-policy').textContent = `${freshnessPolicy.disclaimer} Umbral actual: ${freshnessPolicy.materiallyOldDays} días.`
}

function applyVerificationFilters() {
  const priority = $('#verification-priority').value
  const customerId = $('#verification-customer').value
  const equipmentId = $('#verification-equipment').value
  const reasonCode = $('#verification-reason').value
  const filtered = allVerificationItems.filter((item) =>
    (!priority || item.priority === priority) &&
    (!customerId || item.customerId === customerId) &&
    (!equipmentId || (equipmentId === 'unlinked' ? !item.equipmentRecordId : item.equipmentRecordId === equipmentId)) &&
    (!reasonCode || item.reasonCodes.includes(reasonCode)))
  const defaultCustomerView = !priority && customerId === $('#customer').value && !equipmentId && !reasonCode
  renderVerification(defaultCustomerView ? filtered.slice(0, 3) : filtered, filtered.length)
}

function renderVerification(items, total = items.length) {
  const selectedCustomer = $('#customer').value
  $('#verification-nav-count').textContent = allVerificationItems.filter((item) => item.customerId === selectedCustomer).length
  $('#verification-summary').textContent = items.length === total ? `${total} pendiente${total === 1 ? '' : 's'}` : `${items.length} de ${total} pendientes`
  $('#verification').innerHTML = items.length ? items.map((item) => {
    const record = item.equipmentRecord
    const relation = record ? `${record.manufacturer} ${displayModality(record.modality)} · ${record.model}` : 'Grupo de equipos por confirmar'
    const evidence = item.supportingEvidenceEntries
    return `<article class="verification-row"><span class="priority-badge ${item.priority}">${escapeHtml(item.priorityLabel ?? translate(item.priority, priorityLabels))}</span><div class="verification-copy"><strong>${item.reasons.map(escapeHtml).join(' · ')}</strong><span>Prioridad calculada con reglas deterministas y explicables.</span><details class="verification-evidence"><summary>${evidence.length} evidencia${evidence.length === 1 ? '' : 's'} relacionada${evidence.length === 1 ? '' : 's'}</summary>${evidence.map((entry) => `<p><strong>${escapeHtml(entry.author)}</strong> · ${formatEvidenceAge(entry.recordedAt)}<br>${entry.observationDate ? `Fecha de observación: ${formatObservationDate(entry.observationDate)}` : 'Fecha de observación desconocida'}</p>`).join('')}</details></div><div class="verification-relation"><strong>${escapeHtml(relation)}</strong><span>${record ? `${displayLocation(record.location)} · Última evidencia: ${formatEvidenceAge(record.latestEvidenceAt)}` : 'Relación con equipo aún no resuelta'}</span><small>${escapeHtml(item.customer?.name ?? 'Cliente desconocido')}</small></div><span class="status-pill open">${translate(item.status, statusLabels)}</span></article>`
  }).join('') : '<div class="empty-state"><strong>No hay verificaciones pendientes</strong><span>Los filtros actuales no contienen elementos abiertos.</span></div>'
}

function renderAggregate(data, opportunityAggregate = { unreviewed: 0 }) {
  const max = Math.max(1, ...data.byModality.map((item) => item.count))
  $('#aggregate').innerHTML = `<div class="aggregate-summary"><div><strong>${data.verifiedRecords}</strong><span>Verificados</span></div><div><strong>${data.provisionalRecords}</strong><span>Provisionales</span></div><div><strong>${data.customers}</strong><span>Clientes ficticios</span></div><div><strong>${opportunityAggregate.unreviewed}</strong><span>Señales por revisar</span></div></div><div class="modality-list"><span class="comparison-label">Registros por modalidad</span>${data.byModality.map((item) => `<div class="bar-row"><div><span>${escapeHtml(displayModality(item.modality))}</span><strong>${item.count}</strong></div><div class="bar"><span style="width:${item.count / max * 100}%"></span></div></div>`).join('')}</div>`
}

async function reset() {
  const button = $('#reset')
  button.disabled = true
  button.textContent = 'Restableciendo…'
  try {
    await api('/api/reset', { method: 'POST' })
    currentObservation = null
    $('#observation-date').value = ''
    clearReviewWorkspace()
    setFeedback('Demostración restablecida con los datos sintéticos iniciales.', 'success')
    await bootstrap()
    activateWorkspace('capture')
  } catch {
    setFeedback('No fue posible restablecer la demostración. Confirme que el servidor local siga activo.', 'error')
  } finally {
    button.disabled = false
    button.textContent = 'Restablecer demostración'
  }
}

async function exportWorkspace() {
  const buttons = [$('#export-workspace'), $('#export-before-delete')]
  buttons.forEach((button) => { button.disabled = true })
  setDataFeedback('export', 'Generando y validando el archivo local…', 'loading')
  try {
    const response = await fetch('/api/workspace/export')
    if (!response.ok) throw new Error((await response.json()).error || 'La exportación local falló')
    const payload = await response.json()
    validateExportForDownload(payload)
    const filename = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || `workspace-local-${payload.exportTimestamp.slice(0, 10)}.json`
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDataFeedback('export', `Exportación local preparada: ${filename}`, 'success')
  } catch (error) {
    setDataFeedback('export', `No fue posible exportar: ${error.message}. Sus datos permanecen guardados.`, 'error')
  } finally {
    buttons.forEach((button) => { button.disabled = false })
  }
}

function openDeleteConfirmation() {
  $('#delete-confirmation').classList.remove('hidden')
  $('#open-delete').classList.add('hidden')
  $('#delete-phrase').value = ''
  updateDeleteConfirmation()
  $('#delete-phrase').focus()
}

function cancelDelete() {
  $('#delete-confirmation').classList.add('hidden')
  $('#open-delete').classList.remove('hidden')
  $('#delete-phrase').value = ''
  updateDeleteConfirmation()
  setDataFeedback('delete', 'Eliminación cancelada. El Workspace no cambió.', 'success')
}

function updateDeleteConfirmation() {
  $('#confirm-delete').disabled = $('#delete-phrase').value !== 'ELIMINAR'
}

async function deleteWorkspace() {
  const button = $('#confirm-delete')
  button.disabled = true
  button.textContent = 'Eliminando datos locales…'
  setDataFeedback('delete', 'Vaciando únicamente el archivo del Workspace…', 'loading')
  try {
    await api('/api/workspace', { method: 'DELETE', body: JSON.stringify({ confirmation: $('#delete-phrase').value }) })
    currentObservation = null
    currentView = null
    allVerificationItems = []
    clearReviewWorkspace()
    await bootstrap()
    cancelDelete()
    setDataFeedback('delete', 'Datos del Workspace eliminados. El estado vacío permanecerá después de reiniciar.', 'success')
  } catch (error) {
    setDataFeedback('delete', `No fue posible eliminar los datos: ${error.message}. El Workspace permanece disponible.`, 'error')
  } finally {
    button.textContent = 'Eliminar definitivamente'
    updateDeleteConfirmation()
  }
}

function validateExportForDownload(payload) {
  if (payload?.schemaVersion !== 'workspace-export-v1') throw new Error('la versión del archivo no es válida')
  if (Number.isNaN(Date.parse(payload.exportTimestamp))) throw new Error('la fecha de exportación no es válida')
  for (const key of ['customers', 'observations', 'evidenceEntries', 'equipmentRecords', 'reconciliationLinks', 'verificationItems']) {
    if (!Array.isArray(payload[key])) throw new Error(`falta la colección ${key}`)
  }
}

function renderEmptyWorkspace(aggregate) {
  $('#header-customer').textContent = 'Sin cliente seleccionado'
  $('#installed-title').textContent = 'Base instalada consolidada'
  $('#installed-description').textContent = 'El Workspace está vacío. Restablezca la demostración para recrear los datos sintéticos.'
  $('#customer-metrics').innerHTML = [
    summaryMetric(0, 'Equipos registrados', 'Workspace vacío'),
    summaryMetric(0, 'Verificados', 'Sin datos'),
    summaryMetric(0, 'Provisionales', 'Sin datos'),
    summaryMetric(0, 'Observaciones', 'Sin datos')
  ].join('')
  renderEquipment([])
  renderOpportunities([])
  allOpportunitySignals = []
  renderAggregate(aggregate)
  $('#verification-customer').innerHTML = '<option value="">Todos</option>'
  $('#verification-equipment').innerHTML = '<option value="">Todos</option>'
  $('#verification-reason').innerHTML = '<option value="">Todos</option>'
  $('#freshness-policy').textContent = 'No hay evidencia en el Workspace.'
  renderVerification([])
}

function setDataFeedback(kind, message, state = '') {
  const target = $(`#${kind}-status`)
  target.className = `feedback ${state}`
  target.textContent = message
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
  return Object.entries(pairs).filter(([type, value]) => claims.some((claim) => claim.type === type && String(claim.reviewedValue ?? claim.value).toLowerCase() === String(value).toLowerCase())).map(([type]) => type)
}

function updateNoteLength() { $('#note-length').textContent = `${$('#note').value.length} caracteres` }
function displayClaimValue(claim) {
  const value = claim.reviewedValue ?? claim.value
  if (claim.type === 'equipmentType') return displayModality(String(value))
  if (claim.type === 'location') return displayLocation(String(value))
  return String(value)
}
function displayModality(value) { return modalityLabels[value] ?? value }
function displayLocation(value) { return locationLabels[value] ?? value }
function translate(value, dictionary) { return dictionary[value] ?? value }
function summaryMetric(value, label, detail) { return `<article class="summary-card"><strong>${value}</strong><div><span>${label}</span><small>${detail}</small></div></article>` }
function setFeedback(message, kind = '') { $('#capture-status').className = `feedback ${kind}`; $('#capture-status').textContent = message }
function setClarificationStatus(message, kind = '') { $('#clarification-status').className = `feedback ${kind}`; $('#clarification-status').textContent = message }
function setRuntime(message, kind) { $('#runtime-status').className = `runtime-status ${kind}`; $('#runtime-status').innerHTML = `<span class="status-dot"></span>${escapeHtml(message)}` }
function formatDate(value) { return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatDateOnly(value) { return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value)) }
function formatObservationDate(value) { return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`)) }
function displayOpportunityDate(value) { const parsed = new Date(`${value}T00:00:00.000Z`); const valid = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; return valid ? formatObservationDate(value) : value ? `${escapeHtml(value)} (inválida)` : 'fecha de observación desconocida' }
function formatEvidenceAge(value) {
  if (!value) return 'Evidencia sin fecha'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const days = Math.max(0, Math.floor((today - date) / 86_400_000))
  if (days === 0) return 'Registrada hoy'
  return `Hace ${days} día${days === 1 ? '' : 's'}`
}
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML }
async function api(url, options) { const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La solicitud local falló.'); return data }
