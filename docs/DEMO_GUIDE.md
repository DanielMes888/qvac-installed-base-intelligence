# Guía de demostración del prototipo

Estado: listo para ensayo del propietario del proyecto

Esta guía cubre el corte vertical de emergencia definido en [ADR 0006](adr/0006-use-time-constrained-browser-prototype.md). E4 y E4-v2 siguen fallidos. La demostración presenta una ruta acotada con QVAC local real; no demuestra precisión general ni preparación para producción.

## Problema, propuesta y valor

Las observaciones de campo sobre equipos instalados suelen llegar como texto sin estructura. Pueden quedar sin registrar, duplicarse o contener información incierta. El prototipo usa inferencia local con QVAC para convertir una observación en datos extraídos pendientes de revisión. Una persona decide qué aceptar y vincula la evidencia repetida con un equipo existente.

Propuesta breve para presentar:

> Convertimos observaciones de campo en evidencia estructurada y revisable. QVAC trabaja localmente, la persona conserva el control y la reconciliación evita aumentar la base instalada con equipos duplicados.

El valor que muestra el prototipo es una base instalada más confiable, menos interpretación manual de notas, prevención de registros duplicados y permanencia de la información sensible en el computador local. Estas son capacidades demostradas del prototipo, no resultados medidos en un proceso real de Philips.

## Preparación e inicio

Use el portátil Windows 11 declarado y el modelo `QWEN3_1_7B_INST_Q4` ya almacenado en caché. Desde la raíz del repositorio:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run reset
npm.cmd start
```

`npm.cmd ci` necesita acceso al registro de paquetes y solo hace falta si las dependencias no están instaladas o cambiaron. No elimine la caché del modelo QVAC. Cuando la terminal muestre `Prototipo listo en http://127.0.0.1:4173`, abra esa dirección exacta en el portátil.

Antes de presentar, ejecute una vez la verificación real del adaptador:

```powershell
npm.cmd run smoke:demo
```

El smoke test usa un espacio de trabajo ignorado y separado; no modifica el estado de la demostración en el navegador.

## Caso ensayado y resultado esperado

- Cliente: **Hospital General Northbridge · Campus Central**
- Observación: **Observé un escáner MRI DemoScan, modelo DS-One, en Radiología.**
- Fecha de observación: seleccione la fecha real del ensayo si desea mostrar **Registrada hoy**; déjela vacía para demostrar **Fecha de observación desconocida** sin inventarla.
- Extracción esperada: un equipo y cinco datos pendientes de revisión: tipo `MRI`, fabricante `DemoScan`, modelo `DS-One`, cantidad observada `1` y ubicación `Radiología`.
- Candidato esperado después de aprobar los cinco datos respaldados: `DemoScan MRI`, modelo `DS-One`, ubicación `Radiología`, registro semilla `nb-mri-01`.
- Reconciliación esperada: Northbridge conserva **2 registros de equipos** y el registro MRI recibe un vínculo de evidencia.

Trate siempre la salida como un borrador. Rechace cualquier valor que la observación no respalde. No reconcilie si no aparece el candidato esperado.

Si desea enseñar la corrección sin depender de un error real del modelo, use el smoke determinista antes del ensayo:

```powershell
npm.cmd run smoke:correction
```

Ese recorrido parte de un Draft Claim controlado `DS-Zero`, usa la misma API de **Corregir** para establecer `DS-One`, conserva ambos valores y demuestra que la base instalada sigue sin cambios hasta la revisión y reconciliación explícitas. No presente este adaptador controlado como inferencia real de QVAC.

## Flujo acotado de aclaración

Cuando QVAC devuelve una ambigüedad material, **Revisar** muestra una sola pregunta en español antes de habilitar las decisiones finales. El usuario puede:

- Responder y ejecutar el segundo y último análisis local.
- Elegir **No lo sé** y revisar los borradores iniciales sin otra inferencia.
- Elegir **Omitir** y revisar los borradores iniciales sin otra inferencia.

Una respuesta aparece debajo de la observación original como evidencia separada y fechada. Los borradores iniciales se reemplazan; la revisión explícita sigue siendo obligatoria y la base instalada no cambia hasta después de la revisión y una reconciliación humana.

El smoke real dedicado con el prompt v9 usó: **La directora de radiología dijo que hay tres escáneres MRI DemoScan. No quedó claro si eran los observados o el total de la sede.** La extracción inicial formuló una pregunta útil en español en 768.09 ms. La respuesta se guardó como evidencia separada y el segundo y último análisis terminó en 760.54 ms. La aplicación impidió otra pregunta y una revisión conservadora dejó la base instalada sin cambios. Sin embargo, la segunda salida conservó el alcance de cantidad como desconocido en vez de incorporar la respuesta como total explícito. Presente esto como validación del flujo acotado y sus barreras, no como resolución semántica completa de la aclaración.

## Guion de presentación: entre tres y cinco minutos

### 0:00–0:35 — Presentar el problema y el producto

**Qué mostrar:** la barra superior de la aplicación, el cliente activo, el estado **QVAC local disponible**, el indicador **Datos sintéticos** y la dirección `127.0.0.1`.

**Qué explicar:** use la propuesta breve de esta guía. La información de campo puede quedar sin estructura, repetirse o conservar incertidumbre. QVAC propone datos, la persona los revisa y la reconciliación evita duplicados. La pantalla principal se reserva para el trabajo operativo.

**Resultado visible:** el público identifica de inmediato el cliente, el estado local de QVAC y el límite de datos ficticios.

### 0:35–1:05 — Capturar: seleccionar y registrar

**Qué mostrar:** **Hospital General Northbridge · Campus Central** y la observación ensayada.

**Qué hacer:** confirme el cliente y lea la nota. Explique que el contexto evita mezclar clientes y que la observación original se guarda antes de inferir.

**Resultado visible:** un cliente ficticio, una nota breve y una fecha de observación opcional que se conserva separada de la fecha de registro.

### 1:05–1:50 — Capturar: analizar localmente

**Qué hacer:** pulse **Guardar y analizar con QVAC**.

**Qué explicar:** QVAC se ejecuta mediante el host Node en el mismo portátil y usa la RTX 4050. El inicio carga el modelo y ejecuta un calentamiento antes de habilitar la captura; el calentamiento v9 registrado tardó 27.01 segundos después de una carga de 4.52 segundos. Una vez listo, las cinco extracciones del benchmark quedaron entre 578.72 y 855.50 ms, y el smoke principal v9 final extrajo el caso ensayado en 558.78 ms.

**Resultado visible:** el botón queda bloqueado durante la inferencia, la barra superior indica que QVAC está analizando y luego vuelve a mostrar **QVAC local disponible**.

### 1:50–2:40 — Revisar: comprobar y decidir

**Qué mostrar:** **Datos extraídos pendientes de revisión.**, su evidencia y sus alcances.

**Qué hacer:** la aplicación abre **Revisar** automáticamente. Compare los cinco datos esperados con la observación original. Si un campo compatible es incorrecto, pulse **Corregir**, elija el campo, guarde el valor final y muestre que aparecen **Valor extraído por QVAC** y **Valor corregido por el usuario**. Después elija **Aprobar** o **Rechazar** en cada fila y pulse **Completar revisión** cuando todas las decisiones estén registradas.

**Por qué importa:** una salida válida en estructura todavía puede ser incorrecta. La corrección conserva la salida original y registra quién aportó el cambio. Solo los valores finales aprobados entran en la vista de trabajo.

**Resultado visible:** cinco decisiones explícitas y un candidato de equipo existente.

### 2:40–3:20 — Revisar: reconciliar

**Qué mostrar:** el candidato DemoScan DS-One y los dos registros existentes de Northbridge.

**Qué hacer:** compare la columna **Evidencia aceptada** con **Equipo existente propuesto** y pulse **Vincular con equipo existente**.

**Por qué importa:** una observación repetida debe enriquecer el registro existente sin crear otro equipo automáticamente.

**Resultado visible:** el mensaje confirma que el número de registros no aumentó; Northbridge sigue con dos equipos y el MRI muestra una nueva evidencia vinculada.

### 3:20–4:10 — Base instalada y Verificaciones

**Qué mostrar:** abra **Base instalada** para enseñar el resumen del cliente, la lista limpia de equipos, la última evidencia y la fecha de observación. Después abra **Verificaciones**.

**Qué explicar:** los registros verificados y provisionales permanecen separados. Las tres verificaciones principales muestran prioridad **Alta**, motivos concretos y la evidencia relacionada. Explique que las reglas son deterministas, que la fecha solo desempata dentro de una prioridad y que 90 días es un umbral configurable del prototipo, no una política oficial de Philips. Use los filtros de prioridad, cliente, equipo y motivo para abrir el backlog completo. El agregado solo combina métricas compatibles.

**Resultado visible:** tres registros verificados y dos provisionales en el espacio local; fechas expresadas como **Registrada hoy**, **Hace X días** o **Fecha de observación desconocida**; y verificaciones Alta/Media/Baja con razones visibles, sin presentarlas como un inventario físico auditado.

### 4:10–4:30 — Cierre honesto

Diga: “Esta es evidencia acotada de un prototipo. E4 y E4-v2 fallaron, la calidad semántica en notas complejas sigue limitada y el flujo depende de revisión humana.”

## Restablecimiento y recuperación

Para un ensayo limpio, detenga el servidor con `Ctrl+C` y ejecute:

```powershell
npm.cmd run reset
npm.cmd start
```

El botón **Restablecer demostración** recupera el mismo conjunto semilla sintético mientras el servidor está activo.

La sección **Datos y privacidad** mantiene dos acciones distintas:

- **Exportar JSON** descarga una instantánea local validada con observaciones, evidencia, intentos, decisiones, correcciones, equipos, reconciliaciones, verificaciones y agregados. El archivo no incluye salida interna inválida del modelo.
- **Eliminar datos del espacio de trabajo** muestra el alcance exacto, ofrece exportar primero y exige escribir `ELIMINAR`. Después de confirmar, el Workspace queda vacío incluso al reiniciar. Solo **Restablecer demostración** recrea los datos sintéticos.

Estas acciones funcionan sin conectividad externa. Para comprobarlas sin tocar el Workspace de ensayo, use:

```powershell
npm.cmd run smoke:export-delete
```

Si la extracción falla o devuelve JSON inválido, la interfaz debe indicar que la observación se guardó localmente y que ningún dato extraído entró en la base instalada. No improvise valores aceptados. Restablezca la demostración, confirme la nota ensayada y haga un nuevo intento. Si la estructura es válida pero un campo compatible es incorrecto, corríjalo con procedencia visible o rechácelo; no reconcilie información que no haya sido revisada.

Si el segundo análisis falla, confirme que la observación y la respuesta fechada siguen visibles, que los borradores iniciales ya no pueden revisarse y que no aparece otra pregunta. No vuelva a ejecutar QVAC para esa observación.

Si el puerto 4173 está en uso, cierre la terminal anterior del prototipo. Si no puede localizarla, ejecute `$env:PROTOTYPE_PORT=4174`, luego `npm.cmd start`, y abra `http://127.0.0.1:4174`. Para otros errores, confirme Node 22.17.0, ejecute `npm.cmd ci` con conexión y compruebe que el modelo descrito en `data/feasibility/e4-manifest-v1.json` continúe en caché. No seleccione ni descargue otro modelo durante la recuperación.

## Comprobación manual del propietario

- [ ] Con internet desconectado, `npm.cmd start` muestra la dirección local y la página carga.
- [ ] Todo el texto de navegación, acciones, estados, resultados y errores visibles está en español.
- [ ] Los avisos **Datos completamente sintéticos para demostración.** e **Inferencia local con QVAC: los datos no se envían a la nube.** permanecen visibles.
- [ ] La navegación separa claramente Capturar, Revisar, Base instalada y Verificaciones.
- [ ] Northbridge y la observación ensayada aparecen al iniciar.
- [ ] La captura guarda la nota antes de inferir, presenta un estado de progreso claro y termina con QVAC local disponible.
- [ ] Aparecen exactamente cinco datos respaldados y cada uno resalta su evidencia en la observación, sin mostrar detalles técnicos en el recorrido normal.
- [ ] **Corregir** conserva el valor de QVAC, muestra el valor del usuario y deja el dato pendiente hasta una nueva decisión explícita.
- [ ] Una corrección no respaldada literalmente aparece como evidencia aportada por el revisor y no se atribuye a QVAC.
- [ ] Completar las cinco decisiones muestra una comparación entre la evidencia aceptada y `DemoScan MRI · DS-One · Radiología`.
- [ ] Vincular la evidencia mantiene dos registros y aumenta a uno el vínculo de evidencia del MRI.
- [ ] Se ven tres verificaciones; el agregado muestra tres registros verificados y dos provisionales.
- [ ] Cada equipo muestra por separado su última evidencia y la fecha de observación disponible, sin fecha de expiración ni advertencia de que la información antigua sea incorrecta.
- [ ] Las verificaciones muestran Alta, Media o Baja con motivos comprensibles y mantienen visible la relación con el equipo y su evidencia.
- [ ] Los cuatro filtros restringen la lista por prioridad, cliente, equipo y motivo; no aparecen puntuaciones numéricas.
- [ ] La interfaz declara que el umbral de 90 días es configurable y no es política oficial de Philips.
- [ ] Restablecer devuelve las observaciones y los nuevos vínculos a cero.
- [ ] **Datos y privacidad** genera un archivo `workspace-local-AAAA-MM-DD.json` y muestra confirmación de exportación local.
- [ ] Cancelar la eliminación conserva el Workspace; una confirmación con `ELIMINAR` lo deja vacío después de reiniciar.
- [ ] **Restablecer demostración** permanece claramente separado y es la única acción que recrea el fixture sintético.
- [ ] Una salida inválida conserva la nota, no muestra datos para aceptar y no modifica la base instalada.
- [ ] Cuando exista una aclaración, solo aparece una pregunta; responder conserva evidencia y **No lo sé** u **Omitir** no ejecutan otra inferencia.

## Afirmaciones que deben evitarse

- No diga que E4 pasó ni que el modelo es preciso para notas de campo en general.
- No afirme que la inferencia ocurre dentro del navegador; QVAC se ejecuta en el host Node del mismo computador.
- No afirme que se trata de un inventario auditado, un flujo de Philips validado, seguridad o privacidad de producción, captura más rápida, adopción, integración con CRM o preparación para envío.
- La disponibilidad de una pregunta depende de que el modelo actual produzca un candidato válido; el smoke real dedicado no lo consiguió.
- La edición fuera de los seis campos de corrección aprobados, eliminación de observaciones individuales, empaquetado, ejecución móvil, evaluación E7 completa, experimentos con usuarios, recuperación avanzada y tableros ampliados siguen aplazados.
