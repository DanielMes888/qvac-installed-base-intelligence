# Philips Customer Installed Base Intelligence with QVAC

**Current status: Both E4 feasibility attempts failed. Under the project owner's deadline exception, a provisional same-computer browser/Node prototype now demonstrates one narrow real-QVAC workflow. This does not mark E4 as passed, unblock Ticket 02, or establish submission readiness.**

## Pitch del producto

**Problema.** Las observaciones de campo sobre equipos instalados llegan como notas sin estructura. Pueden quedar sin registrar, duplicarse o conservar información incierta sin una fuente visible.

**Solución.** El prototipo usa QVAC local para convertir una observación en datos revisables. Una persona acepta o rechaza cada dato y reconcilia la evidencia repetida con equipos existentes antes de actualizar la vista de trabajo.

**Valor.** La aplicación muestra una base instalada más confiable, reduce la interpretación manual de notas, evita crear registros duplicados y mantiene la información en el computador local. Estas son capacidades del prototipo; no son resultados medidos en un proceso real de Philips.

## Run the emergency prototype

Prerequisites are the pinned Node/npm versions, installed dependencies, and the cached model documented in the E4 evidence.

```powershell
npm.cmd run reset
npm.cmd start
```

Open `http://127.0.0.1:4173` on the same laptop. Use the prefilled synthetic observation for the rehearsed path, review each extracted datum, then explicitly link the repeated evidence to the suggested seeded record. The operational interface separates capture, review, installed-base records, and prioritized verification items.

```powershell
npm.cmd test
npm.cmd run smoke:demo
```

The smoke command invokes the real cached QVAC model and writes reviewable evidence to [demo-smoke.json](results/emergency/demo-smoke.json). Follow the [demo guide](docs/DEMO_GUIDE.md), and see the [prototype report](results/emergency/PROTOTYPE_REPORT.md), [emergency scope status](docs/EMERGENCY_DEMO_STATUS.md), and [deadline ADR](docs/adr/0006-use-time-constrained-browser-prototype.md) for the bounded result and limitations.

The application also supports one bounded clarification. When the initial QVAC output contains a material Spanish question, the user may answer, select **No lo sé**, or omit it. An answer is stored as a dated Evidence Entry and triggers one final local extraction; the initial drafts are superseded and the final drafts still require explicit review. Skipping and **No lo sé** use the initial drafts without another inference. The installed base never changes during clarification.

The dedicated command below preserves the current real-model result in [clarification-smoke.json](results/emergency/clarification-smoke.json):

```powershell
npm.cmd run smoke:clarification
```

On the recorded run, the 1.7B model completed the initial extraction but returned no clarification candidate, so the command stopped before a second inference. Controlled-adapter tests cover the complete lifecycle; this real-model limitation must remain visible and must not be presented as a successful clarification demonstration.

## Corrección durante la revisión

Antes de completar la revisión, cada dato extraído ofrece la acción **Corregir** para tipo de equipo, fabricante, modelo, cantidad, alcance de cantidad y estado de certeza. La aplicación conserva el **Valor extraído por QVAC** y muestra por separado el **Valor corregido por el usuario**. Cada cambio registra fecha, revisor, campo, valores anterior y nuevo, y un motivo opcional.

Si el nuevo valor no aparece directamente en la observación original, se guarda como Evidence Entry atribuida al revisor y nunca a QVAC. Corregir no aprueba el dato ni modifica un equipo existente: la persona todavía debe aceptar o rechazar el valor final y después decidir cualquier reconciliación.

El smoke determinista recorre esta API pública con un Draft Claim controlado deliberadamente incorrecto:

```powershell
npm.cmd run smoke:correction
```

Su evidencia se publica en [correction-smoke.json](results/emergency/correction-smoke.json). Este smoke prueba el flujo y la procedencia; no mide la calidad de QVAC.

## Vigencia y prioridad de verificación

La aplicación conserva por separado la fecha de observación, cuando el usuario la conoce, y la fecha en que la evidencia se registró. Cada equipo muestra la fecha de su evidencia más reciente con textos como **Registrada hoy** o **Hace X días**; una fecha de observación ausente se presenta como **Fecha de observación desconocida**. La antigüedad no vence el equipo ni significa que la información sea incorrecta.

Los Verification Items reciben prioridad **Alta**, **Media** o **Baja** mediante reglas deterministas. Conflictos, identidad desconocida y cantidades ambiguas son Alta; estimaciones, correcciones aportadas solo por el revisor, fabricante/modelo faltante y evidencia antigua o sin fecha son Media; información reportada coherente que aún requiere confirmación es Baja. Dentro de la misma prioridad se muestra primero la fecha de observación desconocida y luego la evidencia más antigua.

El umbral actual de 90 días es una regla configurable del prototipo. **No es una política oficial de Philips** y no establece una fecha de expiración. La vista explica cada prioridad y permite filtrar por prioridad, cliente, equipo y motivo.

```powershell
npm.cmd run smoke:freshness
```

El resultado determinista se publica en [freshness-priority-smoke.json](results/emergency/freshness-priority-smoke.json). Usa un adaptador controlado para verificar reglas y relaciones; no es evidencia de calidad de QVAC.

## Problem

Hospital equipment observations remain scattered across field employees' notes and memory. Incomplete, estimated, repeated, or contradictory reports can produce unreliable installed-base records without clear supporting evidence.

## Proposed solution

A private, offline-capable application will turn equipment observation notes into structured claims, preserve uncertainty and provenance, and suggest matches for human review without automatically merging ambiguous records. The hypothetical primary user is a field Account Manager / Sales Representative working in a single-user local workspace.

The prototype runs on the inspected Windows 11 laptop with Ryzen 5 8645HS, approximately 16 GB RAM, and RTX 4050 Laptop GPU with 6 GB VRAM. The deadline exception provisionally uses a responsive browser UI connected to a loopback-only Node host on that laptop. Mobile remains future work.

Verified asset records, provisional records, and reported totals are displayed separately. Verification uses explicitly trusted fictional seed references and does not prove real-world identity or current installation. The MVP supports local history, the same user's next visit, and structured export; it does not replace complete visit notes or provide cross-device synchronization or CRM ingestion.

## Mandatory local inference

All evaluated AI inference must use a pinned, tested `@qvac/sdk` version on the same physical computer that holds the workspace. Cloud and delegated inference are excluded. The core workflow must work without internet access after dependencies and models are installed.

A web interface must identify where QVAC executes: both browser and native QVAC host run on the workspace computer. This is not browser-local inference. Peer model downloads are distinct from peer inference.

Initial [platform research](docs/references/QVAC_PLATFORM_RESEARCH.md) found that official [QVAC v0.19.0 release notes](https://docs.qvac.tether.io/reference/release-notes/#delegated-inference-removed) remove delegated inference. The MVP excludes delegation and will not downgrade the SDK to restore it; the exact tested release will be recorded during the approved spike.

The original E4 spike failed its structured-output and latency gates, and E4-v2 stopped at its mandatory model-fit gate. Those results remain authoritative. The emergency prototype evidence is a one-case demonstration smoke test, not a replacement feasibility evaluation.

Original notes are saved before inference. A clarification answer is saved separately before the optional second and final inference. The emergency slice preserves both when extraction fails; ordinary retry and human-authored manual recovery remain deferred.

QVAC-generated claims remain drafts until explicit review and never affect customer views or aggregates beforehand. The prototype accepts fictional demonstration data only, includes no application telemetry or automatic upload, and relies on the operating-system account for access. It does not claim enterprise authentication, encrypted storage, or production security.

The accepted specification defines offline JSON export and observation deletion, but the emergency slice defers both workflows.

## Authoritative plan

Read the [Official Project Plan](docs/OFFICIAL_PROJECT_PLAN.md) before planning or implementation. The accepted specification and tickets remain the delivery baseline, subject to the recorded emergency owner exception.

The [grilling record](docs/GRILLING_RECORD.md) tracks decisions, assumptions, and validation work. [CONTEXT.md](CONTEXT.md) records domain terminology. The [original challenge reference](docs/references/PHILIPS_CHALLENGE_BRIEF.docx) is preserved unchanged, with its source boundaries documented in [reference notes](docs/references/README.md).

The [compliance matrix](docs/COMPLIANCE_MATRIX.md) separates the stored Philips brief, user-provided Track 01 text, and unverified general submission commitments. The first executable implementation work remains E4 after a specification and first ticket exist; platform-dependent work waits for the measured post-E4 ADR.
