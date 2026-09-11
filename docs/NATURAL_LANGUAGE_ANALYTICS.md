# Analítica local de lenguaje natural

Status: Ticket 03 en revisión del propietario.

QVAC local interpreta preguntas españolas mediante `prototype-installed-base-analytics-v1`, separado de la extracción v9. Solo produce un plan `analytics-query-v1`; nunca produce filas, conteos ni la respuesta final. El plan validado admite `count`, agrupación, límite y filtros `eq`, `gt` o `gte` sobre la lista cerrada: modalidad, cliente, país, ciudad, banda de confianza, vigencia, edad reportada y tipo/estado de oportunidad.

Antes de ejecutar, una capa semántica determinista compara la pregunta con el plan del modelo. Conserva restricciones explícitas, normaliza vocabulario permitido, retira agrupaciones no pedidas y rechaza contradicciones o filtros que la pregunta no respalda. La respuesta conserva por separado el plan validado del modelo, el plan normalizado, las reparaciones y los filtros ejecutados; nunca expone la salida cruda del modelo.

El ejecutor determinista consulta exclusivamente clientes, Equipment Records, Observations, Evidence Entries y Opportunity Signals del Workspace local. Los resultados muestran filtros, conteo, fuentes, evidencia/fecha disponible y el aviso sintético. Preguntas vacías, ambiguas, mutantes, externas, con SQL/código/rutas o planes inválidos se rechazan. La salida cruda del modelo no se expone.

Se admiten conteos o listados por modalidad, cliente, país/ciudad, confianza, vigencia y oportunidades; clientes que tengan una modalidad; edad reportada sobre un umbral; y el equivalente a “Muéstrame clientes en Brasil con sistemas MR estimados en más de siete años”. Si el Workspace sintético no contiene geografía o edad aplicable, la respuesta correcta es cero resultados, no datos inventados.

La interpretación permite un único reintento controlado. La carga, el calentamiento analítico y cada consulta interactiva se registran separadamente y reutilizan el mismo modelo cargado. La aplicación muestra calentamiento, estado listo o fallo. No cambia modelo, cuantización, prompt analítico v1, prompt de extracción v9, reconciliación ni Workspace.

Verificación:

```powershell
npm.cmd test -- test/stretch-goals/analytics.test.mjs
npm.cmd run smoke:analytics
npm.cmd run smoke:analytics:real
```

## Bloqueo observado el 2026-09-11

El smoke determinista pasó, pero el smoke real local no satisfizo el contrato semántico. QVAC omitió el filtro de país para “Equipos en Brasil”; después del único reintento permitido devolvió una agrupación no relacionada para “Equipos con evidencia antigua”; y emitió el valor no normalizado `alta` para la banda de confianza. Aunque esos planes tenían forma válida, no representaban correctamente la intención.

El resultado real original se conserva sin sobrescribir en `results/emergency/analytics-real-qvac-smoke-v1-failed.json` y se marca explícitamente como fallo.

## Ciclo correctivo acotado del 2026-09-11

Sin cambiar el prompt analítico v1, se añadió el anclaje semántico determinista y un calentamiento analítico explícito. La única ronda real corregida pasó estructura y semántica; está registrada en `results/emergency/analytics-real-qvac-smoke-v2-corrected.json`. La carga fue 5429.9 ms, el calentamiento 18023.0 ms y las consultas interactivas quedaron entre 0.02 ms para el rechazo previo a inferencia y 1027.1 ms para el caso que utilizó el único reintento. Ticket 03 permanece `in-progress` hasta revisión del propietario.
