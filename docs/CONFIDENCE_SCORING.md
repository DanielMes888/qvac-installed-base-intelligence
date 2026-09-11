# Confidence scoring del prototipo

Status: aprobado por el propietario; Ticket 01 `done`.

## Propósito y límites

Cada Equipment Record de la vista instalada incluye un indicador derivado y explicable sobre la calidad de la evidencia disponible. Es una regla configurable del prototipo: no es una probabilidad estadística, una regla oficial de Philips, una confirmación factual ni una evaluación clínica o comercial.

El indicador permanece separado de Certainty Status, prioridad Alta/Media/Baja de los Verification Items, aceptación o corrección humana e identidad verificada/provisional. Calcularlo no modifica Observations, Evidence Entries, Draft Claims, reconciliaciones, Verification Items, Equipment Records ni resultados de QVAC.

## Contrato `equipment-confidence-v1`

La política central está en `src/core/confidence-score.mjs` y suma exactamente 100 puntos:

| Componente | Máximo | Subumbrales deterministas |
| --- | ---: | --- |
| Completitud | 40 | 10 puntos por cada campo conocido: modalidad, fabricante, modelo y ubicación. Vacío, `unknown`, `desconocido`, `sin definir` y `n/a` valen cero. |
| Vigencia | 30 | 0–30 días: 30; 31–90: 20; 91–180: 10; más de 180: 0. Una fecha de observación desconocida vale 0 y permanece visible; `recordedAt` no la sustituye. |
| Corroboración independiente | 30 | 0 o 1 procedencia distinta: 0; 2: 20; 3 o más: 30. |

Bandas:

- `Alta`: 80–100.
- `Media`: 50–79.
- `Baja`: 0–49.

El resultado contiene versión, disponibilidad, total, banda, fecha de evaluación, puntos/máximo y razón humana de cada componente, además de procedencias inspeccionables con texto, autor, fecha, alcance y función dentro del cálculo. Si ninguna evidencia compatible tiene alcance explícito para el Equipment Record, el total es `null` y la banda visible es `No disponible`; los componentes se explican, pero no se presenta un total inventado.

## Reglas de procedencia

- Todas las Accepted Claims y correcciones vinculadas a la misma Observation representan una sola procedencia.
- Aceptar o corregir una claim no crea corroboración independiente.
- Dos Observations solo corroboran entre sí cuando conservan fuentes distintas y alcance explícito; el mismo autor cuenta una sola vez. Texto normalizado idéntico también cuenta una sola vez para evitar que una copia aparente corroboración.
- Una Observation sin claims aceptadas y sin alcance estructurado explícito no habilita el indicador.
- Evidence Entries sin Observation pueden contar como una fuente distinta cuando son Trusted Fictional References vinculadas al Equipment Record o declaran compatibilidad estructurada. El texto libre ordinario no se interpreta mediante heurísticas para establecer compatibilidad. Entradas atribuidas al mismo autor, o con contenido duplicado, cuentan una sola vez aunque difiera su origen técnico; las fuentes sin autor tampoco se multiplican por ID.
- Claims aceptadas que contradicen campos conocidos del Equipment Record se excluyen de vigencia y corroboración y quedan señaladas como incompatibles.
- Valores incompatibles para un campo a igual fecha/periodo se excluyen como conflicto comparable. Valores distintos en fechas diferentes permanecen visibles como posible cambio: pueden determinar vigencia, pero no se corroboran entre sí ni se presentan como conflicto resuelto.
- Una Observation con claims aceptadas de alcance desconocido no aporta puntos. Si no queda otra procedencia de alcance explícito, el indicador queda `No disponible`.
- Las fechas desconocidas permanecen visibles incluso cuando otra fuente fechada determina la vigencia. Las fechas futuras se señalan y se excluyen; nunca se convierten en evidencia reciente.
- La puntuación utiliza únicamente relaciones persistidas y no crea ni resuelve relaciones.

## Integración y exportación

`WorkspaceService.customerView()` calcula `confidenceScore` al construir cada Equipment Record del read-model. La UI muestra total y banda de forma compacta, o `No disponible`, y deja el desglose, razones, enlaces internos y contenido de la evidencia dentro de `Ver desglose y evidencia`.

`workspace-export-v1` permanece sin cambios. El score es derivado y no se persiste ni se añade a esa exportación sin una futura aprobación explícita de un contrato versionado.

## Verificación

Pruebas focalizadas:

```powershell
npm.cmd test -- test/stretch-goals/confidence-score.test.mjs test/stretch-goals/confidence-workspace.test.mjs
```

Smoke determinista:

```powershell
npm.cmd run smoke:confidence
```

El smoke usa solamente evidencia sintética, una fecha de evaluación fija y cálculo local determinista. Su salida se conserva en `results/emergency/confidence-scoring-smoke.json`; no ejecuta inferencia QVAC.
