const $ = (selector) => document.querySelector(selector)
let currentObservation = null

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
const statusLabels = { verified: 'Verificado', provisional: 'Provisional', open: 'Abierto' }
const modalityLabels = { Ultrasound: 'Ultrasonido', 'Patient monitoring': 'Monitoreo de pacientes' }
const locationLabels = { Radiology: 'Radiología', Emergency: 'Emergencias', Imaging: 'Diagnóstico por imágenes', 'Critical Care': 'Cuidados intensivos', 'Room 2': 'Sala 2' }

$('#customer').addEventListener('change', loadView)
$('#extract').addEventListener('click', capture)
$('#review').addEventListener('click', review)
$('#reset').addEventListener('click', reset)

bootstrap().catch(() => setStatus('No fue posible conectar con el servidor local. Confirme que la aplicación esté iniciada.', 'error'))

async function bootstrap() {
  const data = await api('/api/bootstrap')
  $('#customer').innerHTML = data.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)} · ${escapeHtml(customer.site)}</option>`).join('')
  $('#footer-runtime').textContent = `${data.qvac.sdk} · ${data.qvac.modelExport} · GPU local`
  await loadView()
}

async function capture() {
  const button = $('#extract')
  const lockedControls = [$('#customer'), $('#note'), $('#reset')]
  button.disabled = true
  lockedControls.forEach((control) => { control.disabled = true })
  setStatus('Observación guardada. QVAC está extrayendo la información localmente…')
  $('#drafts').innerHTML = ''
  $('#draft-empty').classList.remove('hidden')
  $('#review').classList.add('hidden')
  $('#reconcile').innerHTML = ''
  try {
    currentObservation = await api('/api/observations', {
      method: 'POST',
      body: JSON.stringify({ customerId: $('#customer').value, text: $('#note').value })
    })
    await loadView()
    if (currentObservation.status !== 'succeeded') {
      setStatus(`Observación guardada localmente. La extracción de QVAC falló después de ${currentObservation.attempts.length} intento(s); ningún dato extraído entró en la base instalada. Restablezca la demostración o vuelva a usar la nota sintética.`, 'error')
      return
    }
    renderDrafts(currentObservation)
    const attempt = currentObservation.attempts.at(-1)
    setStatus(`Inferencia local completada con QVAC · GPU · ${Math.round(attempt.metrics.totalMs)} ms · ${attempt.metrics.generatedTokens ?? '—'} tokens generados`, 'success')
  } catch {
    setStatus('No fue posible completar la captura. Confirme que el servidor local siga activo.', 'error')
  } finally {
    button.disabled = false
    lockedControls.forEach((control) => { control.disabled = false })
  }
}

function renderDrafts(observation) {
  $('#draft-empty').classList.add('hidden')
  $('#drafts').innerHTML = `<div class="status"><span class="badge">Pendiente</span> Datos extraídos pendientes de revisión. Compare cada dato con su evidencia antes de aprobarlo.</div>${observation.draftClaims.map((claim) => `
    <div class="claim" data-claim="${claim.claimId}">
      <div class="claim-head"><div><div class="claim-type">${translate(claim.type, claimLabels)}</div><div class="claim-value">${escapeHtml(displayClaimValue(claim))}</div></div><span class="badge">${translate(claim.certainty, certaintyLabels)}</span></div>
      <div class="claim-meta">Fuente: ${translate(claim.sourceType, sourceLabels)} · Alcance de ubicación: ${translate(claim.locationScope, locationScopeLabels)}${claim.quantityScope ? ` · ${translate(claim.quantityScope, quantityScopeLabels)}` : ''}</div>
      <div class="evidence">“${escapeHtml(claim.evidence.text)}” · fragmento ${claim.evidence.start}–${claim.evidence.end}</div>
      <div class="choice"><label><input type="radio" name="${claim.claimId}" value="accepted"><span>Aprobar</span></label><label><input type="radio" name="${claim.claimId}" value="rejected" checked><span>Rechazar</span></label></div>
    </div>`).join('')}
    ${observation.clarification ? `<div class="evidence"><strong>Posible aclaración detectada:</strong> ${escapeHtml(observation.clarification.question)}</div>` : ''}`
  $('#review').classList.remove('hidden')
}

async function review() {
  const button = $('#review')
  button.disabled = true
  try {
    const decisions = currentObservation.draftClaims.map((claim) => ({ claimId: claim.claimId, decision: document.querySelector(`input[name="${claim.claimId}"]:checked`).value }))
    currentObservation = await api(`/api/observations/${currentObservation.id}/review`, { method: 'POST', body: JSON.stringify({ decisions }) })
    button.classList.add('hidden')
    renderCandidates(currentObservation.candidates)
    setStatus('Revisión aplicada. Ahora decida si la evidencia corresponde a un equipo existente.', 'success')
    await loadView()
  } catch {
    setStatus('No fue posible aplicar la revisión. Los datos siguen pendientes.', 'error')
  } finally {
    button.disabled = false
  }
}

function renderCandidates(candidates) {
  if (!candidates.length) {
    $('#reconcile').innerHTML = '<div class="status">Ningún dato aprobado coincide con un registro existente. La evidencia permanece sin vincular para evitar un duplicado incorrecto.</div>'
    return
  }
  $('#reconcile').innerHTML = `<h3>Posible equipo existente</h3><p class="caption">Revise la coincidencia y vincúlela explícitamente para evitar duplicar el registro.</p>${candidates.map((candidate) => `<div class="candidate"><strong>${escapeHtml(candidate.manufacturer)} ${escapeHtml(displayModality(candidate.modality))}</strong><br><small>${escapeHtml(candidate.model)} · ${escapeHtml(displayLocation(candidate.location))} · ${candidate.score} coincidencia(s)</small><br><button data-record="${candidate.id}">Vincular evidencia repetida</button></div>`).join('')}`
  $('#reconcile').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => reconcile(button.dataset.record)))
}

async function reconcile(recordId) {
  const button = $(`#reconcile button[data-record="${recordId}"]`)
  if (button) button.disabled = true
  try {
    await api(`/api/observations/${currentObservation.id}/reconcile`, { method: 'POST', body: JSON.stringify({ recordId, reason: 'El usuario confirmó que la evidencia repetida corresponde a este registro sintético' }) })
    $('#reconcile').innerHTML = '<div class="status success">Evidencia vinculada. El número de registros de equipos no aumentó.</div>'
    setStatus('Reconciliación completada sin crear un equipo duplicado.', 'success')
    await loadView()
  } catch {
    setStatus('No fue posible reconciliar la evidencia. No se creó ningún equipo nuevo.', 'error')
    if (button) button.disabled = false
  }
}

async function loadView() {
  const customerId = $('#customer').value
  if (!customerId) return
  const [view, bootstrapData] = await Promise.all([api(`/api/customers/${customerId}/view`), api('/api/bootstrap')])
  $('#customer-title').textContent = `Base instalada consolidada. ${view.customer.name}`
  $('#customer-metrics').innerHTML = metric(view.equipmentRecords.filter((record) => record.status === 'verified').length, 'Registros verificados') + metric(view.equipmentRecords.filter((record) => record.status === 'provisional').length, 'Registros provisionales') + metric(view.unlinkedClaims, 'Evidencias sin vincular') + metric(view.observations.length, 'Observaciones guardadas')
  $('#equipment').innerHTML = view.equipmentRecords.map((record) => `<div class="record"><div class="record-head"><strong>${escapeHtml(record.manufacturer)} ${escapeHtml(displayModality(record.modality))}</strong><span class="badge ${record.status === 'provisional' ? 'provisional' : ''}">${translate(record.status, statusLabels)}</span></div><small>${escapeHtml(record.model)} · ${escapeHtml(displayLocation(record.location))} · ${record.evidenceObservationIds.length} nueva(s) evidencia(s) vinculada(s)</small></div>`).join('')
  $('#verification').innerHTML = view.verificationItems.map((item) => `<div class="verify"><span class="priority">${item.priority}</span><div>${escapeHtml(item.reason)}<br><small>${translate(item.status, statusLabels)} · evidencia sintética</small></div></div>`).join('')
  renderAggregate(bootstrapData.aggregate)
}

function renderAggregate(data) {
  const max = Math.max(1, ...data.byModality.map((item) => item.count))
  $('#aggregate').innerHTML = `<div class="metric"><strong>${data.verifiedRecords}</strong><span>Registros verificados</span></div><div class="metric" style="margin-top:9px"><strong>${data.provisionalRecords}</strong><span>Registros provisionales</span></div>${data.byModality.map((item) => `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(displayModality(item.modality))}</span><b>${item.count}</b></div><div class="bar"><span style="width:${item.count / max * 100}%"></span></div></div>`).join('')}`
}

async function reset() {
  try {
    await api('/api/reset', { method: 'POST' })
    currentObservation = null
    $('#drafts').innerHTML = ''
    $('#draft-empty').classList.remove('hidden')
    $('#review').classList.add('hidden')
    $('#reconcile').innerHTML = ''
    setStatus('Demostración restablecida con datos completamente sintéticos.', 'success')
    await loadView()
  } catch {
    setStatus('No fue posible restablecer la demostración. Confirme que el servidor local siga activo.', 'error')
  }
}

function displayClaimValue(claim) {
  if (claim.type === 'equipmentType') return displayModality(String(claim.value))
  if (claim.type === 'location') return displayLocation(String(claim.value))
  return String(claim.value)
}

function displayModality(value) { return modalityLabels[value] ?? value }
function displayLocation(value) { return locationLabels[value] ?? value }
function translate(value, dictionary) { return dictionary[value] ?? value }
function metric(value, name) { return `<div class="metric"><strong>${value}</strong><span>${name}</span></div>` }
function setStatus(message, kind = '') { $('#capture-status').className = `status ${kind}`; $('#capture-status').textContent = message }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML }
async function api(url, options) { const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La solicitud local falló.'); return data }
