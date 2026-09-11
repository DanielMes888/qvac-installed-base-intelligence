# Geographic Installed-Base Map

Status: Ticket 04 `in-progress`, pendiente de revisión del propietario.

La vista geográfica es un read model determinista y local sobre clientes ficticios y Equipment Records existentes. Presenta la jerarquía `Región → País → Ciudad → Cliente → Equipos instalados`, conteos por modalidad, filtros y navegación al Customer 360 sin ejecutar QVAC ni modificar el Workspace.

Panamá es el enfoque inicial cuando tiene datos aplicables. Dos de los tres clientes sembrados están en ciudades panameñas distintas y el tercero es un caso internacional sintético en Brasil. Se conservaron los identificadores de clientes y los cinco Equipment Records existentes.

Los Workspace sintéticos creados antes de estos campos reciben al cargarse únicamente las propiedades geográficas ausentes, copiadas por identificador desde el fixture sintético actual. Esta evolución conserva valores presentes, incluso `null` o vacíos explícitos; no agrega clientes o equipos, no cambia reconciliaciones y no escribe el archivo por el solo hecho de abrir el mapa.

El mapa es un esquema HTML/CSS propio, no una representación cartográfica precisa. No contiene coordenadas, direcciones, tiles, geocodificación, recursos remotos ni ubicaciones reales de Philips. Su lista jerárquica accesible expone la misma jerarquía, conteos, estado del registro, banda de confianza, vigencia, procedencia y vínculo al Customer 360. La certeza de claims no se resume ni se infiere en el mapa: permanece consultable con su evidencia en Customer 360. Una geografía ausente se muestra como `Ubicación no especificada` y no se confunde con Quantity Scope ni Location Scope de una claim.

Verificación:

```powershell
npm.cmd test -- test/stretch-goals/geographic-map.test.mjs
npm.cmd run smoke:geography
```
