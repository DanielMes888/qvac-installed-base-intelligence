const $ = (selector) => document.querySelector(selector)
let currentObservation = null

await bootstrap()

$('#customer').addEventListener('change', loadView)
$('#extract').addEventListener('click', capture)
$('#review').addEventListener('click', review)
$('#reset').addEventListener('click', reset)

async function bootstrap() {
  const data = await api('/api/bootstrap')
  $('#customer').innerHTML = data.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)} · ${escapeHtml(customer.site)}</option>`).join('')
  $('#footer-runtime').textContent = `${data.qvac.sdk} · ${data.qvac.modelExport} · local GPU`
  await loadView()
}

async function capture() {
  const button = $('#extract')
  const lockedControls = [$('#customer'), $('#note'), $('#reset')]
  button.disabled = true
  lockedControls.forEach((control) => { control.disabled = true })
  setStatus('Original note saved. QVAC is extracting locally…')
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
      setStatus(`Note saved locally. QVAC extraction failed after ${currentObservation.attempts.length} attempt(s); no Draft Claims entered the working view. Reset or try the synthetic note again.`, 'error')
      return
    }
    renderDrafts(currentObservation)
    const attempt = currentObservation.attempts.at(-1)
    setStatus(`Real local QVAC · GPU · ${Math.round(attempt.metrics.totalMs)} ms · ${attempt.metrics.generatedTokens ?? '—'} output tokens`, 'success')
  } catch (error) {
    setStatus(error.message, 'error')
  } finally {
    button.disabled = false
    lockedControls.forEach((control) => { control.disabled = false })
  }
}

function renderDrafts(observation) {
  $('#draft-empty').classList.add('hidden')
  $('#drafts').innerHTML = `<div class="status"><span class="badge">Draft only</span> Review every claim. Schema validity does not prove factual correctness.</div>${observation.draftClaims.map((claim) => `
    <div class="claim" data-claim="${claim.claimId}">
      <div class="claim-head"><div><div class="claim-type">${label(claim.type)}</div><div class="claim-value">${escapeHtml(String(claim.value))}</div></div><span class="badge">${escapeHtml(claim.certainty)}</span></div>
      <div class="evidence">“${escapeHtml(claim.evidence.text)}” · offsets ${claim.evidence.start}–${claim.evidence.end}</div>
      <div class="choice"><label><input type="radio" name="${claim.claimId}" value="accepted"><span>Accept</span></label><label><input type="radio" name="${claim.claimId}" value="rejected" checked><span>Reject</span></label></div>
    </div>`).join('')}
    ${observation.clarification ? `<div class="evidence"><strong>One clarification candidate:</strong> ${escapeHtml(observation.clarification.question)}</div>` : ''}`
  $('#review').classList.remove('hidden')
}

async function review() {
  const decisions = currentObservation.draftClaims.map((claim) => ({ claimId: claim.claimId, decision: document.querySelector(`input[name="${claim.claimId}"]:checked`).value }))
  currentObservation = await api(`/api/observations/${currentObservation.id}/review`, { method: 'POST', body: JSON.stringify({ decisions }) })
  $('#review').classList.add('hidden')
  renderCandidates(currentObservation.candidates)
  await loadView()
}

function renderCandidates(candidates) {
  if (!candidates.length) {
    $('#reconcile').innerHTML = '<div class="status">No accepted claim matches an existing record. Evidence remains unlinked.</div>'
    return
  }
  $('#reconcile').innerHTML = `<h3>Possible existing record</h3><p class="caption">Link explicitly to avoid duplicate growth.</p>${candidates.map((candidate) => `<div class="candidate"><strong>${escapeHtml(candidate.manufacturer)} ${escapeHtml(candidate.modality)}</strong><br><small>${escapeHtml(candidate.model)} · ${escapeHtml(candidate.location)} · score ${candidate.score}</small><br><button data-record="${candidate.id}">Link repeated evidence</button></div>`).join('')}`
  $('#reconcile').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => reconcile(button.dataset.record)))
}

async function reconcile(recordId) {
  await api(`/api/observations/${currentObservation.id}/reconcile`, { method: 'POST', body: JSON.stringify({ recordId, reason: 'User confirmed the repeated evidence matches this seeded record' }) })
  $('#reconcile').innerHTML = '<div class="status success">Linked as new evidence. Equipment record count did not increase.</div>'
  await loadView()
}

async function loadView() {
  const customerId = $('#customer').value
  if (!customerId) return
  const [view, bootstrapData] = await Promise.all([api(`/api/customers/${customerId}/view`), api('/api/bootstrap')])
  $('#customer-title').textContent = view.customer.name
  $('#customer-metrics').innerHTML = metric(view.equipmentRecords.filter((r) => r.status === 'verified').length, 'Verified records') + metric(view.equipmentRecords.filter((r) => r.status === 'provisional').length, 'Provisional records') + metric(view.unlinkedClaims, 'Unlinked claims') + metric(view.observations.length, 'Captured notes')
  $('#equipment').innerHTML = view.equipmentRecords.map((record) => `<div class="record"><div class="record-head"><strong>${escapeHtml(record.manufacturer)} ${escapeHtml(record.modality)}</strong><span class="badge ${record.status === 'provisional' ? 'provisional' : ''}">${record.status}</span></div><small>${escapeHtml(record.model)} · ${escapeHtml(record.location)} · ${record.evidenceObservationIds.length} new evidence link(s)</small></div>`).join('')
  $('#verification').innerHTML = view.verificationItems.map((item) => `<div class="verify"><span class="priority">${item.priority}</span><div>${escapeHtml(item.reason)}<br><small>Open · synthetic evidence</small></div></div>`).join('')
  renderAggregate(bootstrapData.aggregate)
}

function renderAggregate(data) {
  const max = Math.max(1, ...data.byModality.map((item) => item.count))
  $('#aggregate').innerHTML = `<div class="metric"><strong>${data.verifiedRecords}</strong><span>Verified records</span></div><div class="metric" style="margin-top:9px"><strong>${data.provisionalRecords}</strong><span>Provisional records</span></div>${data.byModality.map((item) => `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(item.modality)}</span><b>${item.count}</b></div><div class="bar"><span style="width:${item.count / max * 100}%"></span></div></div>`).join('')}`
}

async function reset() {
  await api('/api/reset', { method: 'POST' })
  currentObservation = null
  $('#drafts').innerHTML = ''
  $('#draft-empty').classList.remove('hidden')
  $('#review').classList.add('hidden')
  $('#reconcile').innerHTML = ''
  setStatus('Synthetic workspace reset.', 'success')
  await loadView()
}

function metric(value, name) { return `<div class="metric"><strong>${value}</strong><span>${name}</span></div>` }
function label(value) { return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()) }
function setStatus(message, kind = '') { $('#capture-status').className = `status ${kind}`; $('#capture-status').textContent = message }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML }
async function api(url, options) { const response = await fetch(url, { headers: { 'content-type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data }
