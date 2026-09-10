# Emergency prototype demo guide

Status: ready for project-owner rehearsal

This guide covers the bounded emergency vertical slice from [ADR 0006](adr/0006-use-time-constrained-browser-prototype.md). Both E4 attempts remain failed. The demo shows one real local-QVAC path and must not be presented as broad extraction validation or production readiness.

## Setup and startup

Use the declared Windows 11 laptop with the cached `QWEN3_1_7B_INST_Q4` model. From the repository root:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run reset
npm.cmd start
```

`npm.cmd ci` requires package access and is only needed when dependencies are absent or changed. Do not delete the QVAC model cache. When the server prints `Prototype ready at http://127.0.0.1:4173`, open that exact address on the laptop.

Before presenting, run the real adapter smoke check once:

```powershell
npm.cmd run smoke:demo
```

The smoke command uses a separate ignored workspace, so it does not change the browser demo state.

## Rehearsed input and expected result

- Customer: **Northbridge General · Central Campus**
- Observation: **I saw one DemoScan MRI scanner, model DS-One, in Radiology.**
- Expected compact extraction: one equipment subject and Draft Claims for equipment type `MRI`, manufacturer `DemoScan`, model `DS-One`, observed quantity `1`, and location `Radiology`.
- Expected candidate after accepting all five supported claims: `DemoScan MRI`, model `DS-One`, location `Radiology`, seeded record `nb-mri-01`.
- Expected reconciliation: Northbridge remains at **2 equipment records**; the MRI record gains one evidence link.

Treat the output as a draft even when it matches this expectation. Reject any unsupported value. Do not reconcile if the expected candidate is absent.

## Presentation script: about four minutes

**0:00–0:35 — Frame the problem.** Explain that field observations can be incomplete or repeated. State the bounded claim: this prototype turns one synthetic equipment note into reviewable local evidence without automatically creating another equipment record.

**0:35–0:55 — Show the boundary.** Point to `127.0.0.1`, the persistent synthetic-data notice, “Local QVAC · same computer,” and “No cloud inference.” If practical, disconnect the laptop before the demo and reload the local page.

**0:55–1:15 — Capture.** Select Northbridge General, leave the rehearsed observation unchanged, and click **Save & run local QVAC**. Say: “The original note is saved first. QVAC is now extracting on this laptop’s RTX 4050.”

**1:15–1:45 — Use the wait.** The first inference after startup usually takes about 20–25 seconds; the latest recorded smoke run took 20.69 seconds, including a 5.01-second cached model load. Point out that the button is disabled and the status says extraction is local. Subsequent runs can be much faster after model loading.

**1:45–2:35 — Review.** Confirm the five expected Draft Claims and their supporting sentence offsets. Explain that schema validity does not prove semantic correctness. Change each supported claim from the safe Reject default to **Accept**, then click **Apply review decisions**.

**2:35–3:10 — Reconcile.** Show the existing DemoScan DS-One candidate and Northbridge’s two equipment records. Click **Link repeated evidence**. Point out the success message and that the count remains two while the MRI record gains an evidence link.

**3:10–3:45 — Show useful views.** Show verified and provisional records separately, the three “Verify next visit” items, and the aggregate’s separate verified/provisional counts and modality bars.

**3:45–4:10 — State the limit.** Say: “This is bounded prototype evidence. E4 and E4-v2 failed, complex-note semantic quality remains weak, and this workflow depends on human review.”

## Reset and recovery

For a clean rehearsal, stop the server with `Ctrl+C`, then run:

```powershell
npm.cmd run reset
npm.cmd start
```

The **Reset demo** button restores the same synthetic seed while the server is running.

If extraction fails or produces invalid JSON, the UI must say that the note was saved locally and that no Draft Claims entered the working view. Do not improvise accepted values. Use **Reset demo**, confirm the rehearsed input, and try one fresh capture. If QVAC returns structurally valid but semantically wrong claims, reject those claims and state the model limitation; do not reconcile them.

If startup says port 4173 is already in use, close the earlier prototype terminal. If it cannot be found, use `$env:PROTOTYPE_PORT=4174` and run `npm.cmd start`, then open `http://127.0.0.1:4174`. For other startup failures, confirm Node 22.17.0, run `npm.cmd ci` while connected, and verify that the cached model described in `data/feasibility/e4-manifest-v1.json` remains available. Do not download or select another model during demo recovery.

## Project-owner visual checklist

- [ ] With internet disconnected, `npm.cmd start` reaches the ready message and `http://127.0.0.1:4173` loads.
- [ ] The synthetic-data notice, local-QVAC badge, no-cloud card, customer selector, note field, capture button, and all three result panels are visible without broken layout.
- [ ] Northbridge General is selected and the exact rehearsed note is present.
- [ ] Clicking capture immediately shows that the original note was saved, disables the button during inference, and ends with a green local-QVAC/GPU/latency status.
- [ ] Exactly five supported Draft Claims appear with evidence and numeric offsets; every claim is deliberately changed from Reject to Accept.
- [ ] Applying decisions reveals `DemoScan MRI · DS-One · Radiology` as the candidate.
- [ ] Linking repeated evidence leaves Northbridge at two equipment records and changes the MRI evidence-link count to one.
- [ ] Three verification items are visible and the aggregate shows three verified and two provisional records.
- [ ] **Reset demo** returns Northbridge to zero captured notes and zero new evidence links.
- [ ] If any claim is wrong, rejecting it keeps it out of the working view; if extraction fails, the red status says the note was saved and no Draft Claims entered.

## Claims to avoid

- Do not say E4 passed or that the model is accurate on general field notes.
- Do not claim browser-local inference; QVAC runs in the same-computer Node host.
- Do not claim audited inventory, Philips workflow validation, production privacy/security, faster capture, adoption, CRM integration, or submission readiness.
- Clarification processing, export, deletion, packaging, mobile execution, full E7 evaluation, user experiments, advanced recovery, and expanded dashboards remain deferred.
