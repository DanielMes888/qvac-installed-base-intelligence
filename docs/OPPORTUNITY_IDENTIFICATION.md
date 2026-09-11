# Identificación conservadora de posibles oportunidades

Status: implementación de Ticket 02 en revisión del propietario.

## Propósito y límites

La vista de base instalada presenta señales deterministas para revisar hechos que podrían justificar una comprobación posterior. Cada resultado se identifica como una regla configurable del prototipo sobre datos sintéticos. No es una conclusión comercial, una regla oficial de Philips, una indicación clínica ni una recomendación de reemplazo.

Las señales se calculan localmente desde Evidence Entries y relaciones ya persistidas. No ejecutan QVAC, no enriquecen datos desde fuentes externas y no modifican Draft Claims, Equipment Records, Verification Items, reconciliaciones ni Confidence scoring. El score de confianza se muestra solamente como contexto independiente: no activa ni descarta una señal.

## Contrato `opportunity-signals-v1`

La política central está en `src/core/opportunity-signals.mjs`:

| Regla | Umbral determinista | Evidencia requerida | Supresión conservadora |
| --- | --- | --- | --- |
| Antigüedad reportada | Claim `age` aceptada de 7 años o más | Evidence Entry aceptada, un único sujeto inequívoco, alcance conocido y fecha válida no futura | Un conflicto comparable, varios sujetos o una fecha desconocida/inválida impiden presentar la antigüedad como hecho activador. |
| Información incompleta | Al menos 2 de fabricante, modelo y ubicación sin valor conocido | Evidencia revisada o referencia sintética vinculada | El estado provisional por sí solo nunca activa la regla. |
| Vigencia | La evidencia revisada más reciente tiene 90 días o más | Al menos una Evidence Entry fechada y vinculada | La fecha de registro no sustituye la fecha de observación. |
| Fecha desconocida | Una o más evidencias revisadas vinculadas no conservan fecha de observación | Evidence Entry vinculada sin fecha | La fecha permanece `null`; no se estima aunque exista otra fuente fechada. |
| Fecha no aplicable | Fecha inválida o posterior a la evaluación | Evidence Entry vinculada que conserva el valor recibido | Se excluye de vigencia y queda visible para revisión; no se corrige automáticamente. |
| Verificación material | Verification Item abierto con motivo permitido | Evidence Entry de soporte visible | No resuelve el conflicto ni elige una versión como verdadera. |

Los motivos permitidos para verificación material son conflicto de evidencia (incluidas edades reportadas distintas en la misma fecha y alcance), cantidad ambigua o conflictiva, cantidad con alcance desconocido, identidad desconocida y conflicto de reconciliación no resuelto. Ante edades comparables contradictorias se muestran ambas evidencias dentro de una señal de verificación y se suprime la señal específica de antigüedad. Los identificadores combinan Equipment Record, regla y una huella determinista de los hechos y evidencia activadores: una regla repetida se deduplica para el mismo estado, mientras que evidencia materialmente distinta no hereda un descarte anterior.

## Presentación y revisión

La sección **Posibles oportunidades para revisar** permite filtrar por tipo y estado, inspeccionar razón, hechos, evidencia, fechas, alcance conocido o desconocido, desglose contextual 40/30/30, versión de regla y siguiente verificación sugerida. Descartar una señal conserva solamente actor, fecha y motivo de esa decisión local; no cambia ningún hecho ni flujo operativo.

La revisión de umbrales y lenguaje confirma que `7 años`, `2 campos` y `90 días` son valores configurables de demostración, no política de Philips. La redacción usa “posible” y “revisar” y evita afirmar intención de compra, necesidad clínica, obsolescencia, venta confirmada o reemplazo obligatorio.

## Limitaciones conocidas

- No se implementó una regla de “tecnología reportada”: no existe una taxonomía o umbral aprobado que permita convertir ese texto en una señal sin inventar política.
- Las señales son un read-model derivado. `workspace-export-v1` permanece sin cambios y no incluye el historial de descarte sin un contrato de exportación versionado aprobado.
- No hay priorización de ventas, probabilidad, valor monetario, recomendación ni integración CRM.

## Verificación

```powershell
npm.cmd test -- test/stretch-goals/opportunity-signals.test.mjs test/stretch-goals/opportunity-workspace.test.mjs
npm.cmd run smoke:opportunities
```

El smoke usa exclusivamente clientes y evidencia sintéticos, una fecha fija y reglas locales. Su resultado se conserva en `results/emergency/opportunity-identification-smoke.json` y registra explícitamente cero llamadas a QVAC y cero efectos operativos.
