# Control local de datos del Workspace

Estado: capacidad acotada del prototipo de emergencia

## Exportación `workspace-export-v1`

La acción **Exportar JSON** solicita al host local una instantánea del Workspace, la valida y crea la descarga en el navegador. El nombre sigue `workspace-local-AAAA-MM-DD.json`, usando la fecha UTC de `exportTimestamp`. La operación no carga ni envía el archivo a ningún servicio.

La estructura superior es fija:

| Campo | Contenido |
| --- | --- |
| `schemaVersion` | Versión literal `workspace-export-v1` |
| `exportTimestamp` | Fecha ISO 8601 de creación |
| `workspace` | Identificador local estable, etiqueta sintética y límite de uso |
| `customers` | Clientes y sedes ficticias |
| `observations` | Notas originales, fechas, sujetos, Draft Claims, decisiones, aclaraciones y metadatos saneados de inferencia |
| `evidenceEntries` | Evidencia aceptada, respuestas de aclaración y aportes de corrección |
| `equipmentRecords` | Registros de equipos y referencias a su evidencia |
| `reconciliationLinks` | Relación explícita entre observación y equipo existente |
| `verificationItems` | Estado, prioridad, motivos y referencias de evidencia |
| `aggregate` | Resultados agregados permitidos de la instantánea |

Los identificadores locales existentes se conservan. El validador comprueba unicidad y referencias entre cliente, observación, evidencia, equipo, reconciliación y verificación antes de permitir la descarga. Las colecciones se ordenan por identificador para que la representación sea estable; la fecha de exportación cambia en cada ejecución.

Los intentos de inferencia conservan identificador, número, fase, revisión, fechas, estado, razón de parada, categoría de fallo, cantidad de errores, métricas y estado del borrador. `rawOutput`, `validatedDraft` y el contenido inválido del modelo se excluyen. Los Draft Claims que sí forman parte del Workspace conservan el valor original de QVAC, el valor revisado, la evidencia, la decisión y el historial de correcciones.

## Eliminación segura

**Eliminar datos del espacio de trabajo** requiere escribir exactamente `ELIMINAR`. Cancelar no llama al endpoint de eliminación. La pantalla ofrece **Exportar antes de eliminar** y enumera los datos afectados.

La eliminación escribe primero un archivo temporal completo y reemplaza el único archivo JSON configurado como almacenamiento del Workspace con un estado vacío. Vacía clientes de ejecución, observaciones, Evidence Entries, Draft Claims y correcciones contenidas, vínculos de reconciliación, registros de equipos y Verification Items. El proceso no recorre ni elimina directorios.

El destino se resuelve a una ruta absoluta de archivo `.json` cuyo nombre identifica explícitamente un Workspace; se rechazan rutas vacías, comodines, variables sin resolver, nombres genéricos como `package.json` y la ruta del fixture sintético. No se modifican el código, el modelo o su caché, fixtures congelados, evidencia de pruebas, documentación ni archivos externos. Reiniciar conserva el estado vacío. **Restablecer demostración** es una acción separada y explícita que vuelve a copiar el fixture sintético.

## Evidencia de privacidad

`npm.cmd run smoke:export-delete` usa un directorio temporal aislado, bloquea en su propia frontera cualquier solicitud no dirigida a `127.0.0.1`, registra las solicitudes intentadas y comprueba hashes de archivos protegidos. Valida la exportación completa y vacía, la confirmación y cancelación, la persistencia tras reinicio y el restablecimiento separado.

Este resultado demuestra el comportamiento de la aplicación durante el smoke test. No es una auditoría completa de seguridad del sistema operativo. E4 y E4-v2 permanecen fallidos.
