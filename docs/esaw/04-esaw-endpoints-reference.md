# Referencia de endpoints — EsignatureAnywhere REST API v6

Base path: `/api/v6` sobre `https://demo.esignanywhere.net` (sandbox) o el host de producción de la organización. Todas las peticiones requieren la cabecera `apiToken` o `Authorization: Bearer` (ver [01-esaw-overview.md](01-esaw-overview.md)). Tabla generada a partir de `swagger.v6.esaw.json` (51 operaciones).

### Authorization

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/authorization/whoami` | Información del usuario autenticado. |
| `GET` | `/v6/authorization/validate` | Verifica que el usuario autenticado puede usar la API. |

### AutomaticProfile

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/organization/automaticprofile` | Perfiles de firma automática disponibles. |

### Draft (borradores)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/draft/{draftId}` | Overview de un borrador. |
| `GET` | `/v6/draft/{draftId}/files` | Documentos de un borrador. |
| `GET` | `/v6/draft/{draftId}/elements` | Elementos de los documentos de un borrador. |
| `GET` | `/v6/draft/{draftId}/configuration` | Configuración del borrador y sus activities. |
| `POST` | `/v6/draft/find` | Buscar borradores por criterios de filtro. |
| `POST` | `/v6/draft/send` | Enviar un borrador (lo convierte en envelope). |
| `POST` | `/v6/draft/create` | Crear un nuevo borrador. |
| `POST` | `/v6/draft/delete` | Eliminar un borrador. |
| `POST` | `/v6/draft/update` | Actualizar la configuración del borrador. |
| `POST` | `/v6/draft/reorderactivities` | Reordenar las activities de un borrador. |
| `POST` | `/v6/draft/activity/replace` | Reemplazar una activity existente del borrador. |

### Envelope (sobres — el flujo principal)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/envelope/{envelopeId}` | Overview de un envelope (incluye `EnvelopeStatus`). |
| `GET` | `/v6/envelope/{envelopeId}/files` | Documentos y ficheros relacionados (incluye audit trail). |
| `GET` | `/v6/envelope/{envelopeId}/history` | Historial de eventos del envelope. |
| `GET` | `/v6/envelope/{envelopeId}/elements` | Elementos de los documentos del envelope. |
| `GET` | `/v6/envelope/{envelopeId}/viewerlinks` | Enlaces al SignAnyWhere Viewer para activities activas. |
| `GET` | `/v6/envelope/{envelopeId}/configuration` | Configuración del envelope y sus activities. |
| `POST` | `/v6/envelope/find` | Buscar envelopes por criterios de filtro. |
| `POST` | `/v6/envelope/send` | **Crear y enviar un envelope** (acción principal de "prueba en vivo"). |
| `POST` | `/v6/envelope/cancel` | Cancelar un envelope activo. |
| `POST` | `/v6/envelope/delete` | Eliminar un envelope. |
| `POST` | `/v6/envelope/remind` | Enviar recordatorio a las activities activas. |
| `POST` | `/v6/envelope/unlock` | Desbloquear un envelope bloqueado por una activity paralela iniciada. |
| `POST` | `/v6/envelope/restartexpired` | Reiniciar un envelope expirado. |
| `POST` | `/v6/envelope/activity/delete` | Eliminar una activity no finalizada de un envelope activo. |
| `POST` | `/v6/envelope/activity/replace` | Reemplazar una activity no finalizada. |

### EnvelopeBulk (envío masivo)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/envelopebulk/{bulkId}` | Overview de un bulk y sus hijos. |
| `POST` | `/v6/envelopebulk/find` | Buscar bulks por criterios de filtro. |
| `POST` | `/v6/envelopebulk/send` | Crear y enviar un envelope bulk. |
| `POST` | `/v6/envelopebulk/cancel` | Cancelar todos los envelopes hijos activos. |
| `POST` | `/v6/envelopebulk/delete` | Eliminar un bulk y sus hijos. |
| `POST` | `/v6/envelopebulk/remind` | Recordatorio a todas las activities activas de los hijos. |
| `POST` | `/v6/envelopebulk/restartexpired` | Reiniciar todos los hijos expirados. |

### File

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/file/{fileId}` | Descargar un fichero de un envelope completado. |
| `POST` | `/v6/file/upload` | **Subir un fichero temporal** (paso previo obligatorio a `envelope/send`). Solo un fichero por llamada. |
| `POST` | `/v6/file/delete` | Eliminar un fichero subido. |
| `POST` | `/v6/file/prepare` | Extraer elementos, tags avanzados y SigStrings de ficheros subidos. |

### License / SealingCertificate / System / Team

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/organization/license` | Estado de la licencia actual. |
| `GET` | `/v6/organization/sealingcertificates` | Certificados de sellado disponibles. |
| `GET` | `/v6/system/version` | Versión actual de eSignAnyWhere. |
| `GET` | `/v6/organization/team` | Equipos disponibles. |
| `POST` | `/v6/organization/team/replace` | Reemplazar todos los equipos existentes. |

### Template (plantillas)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/v6/template/{templateId}` | Overview de una plantilla. |
| `GET` | `/v6/template/{templateId}/files` | Documentos de una plantilla. |
| `GET` | `/v6/template/{templateId}/elements` | Elementos de una plantilla. |
| `GET` | `/v6/template/{templateId}/configuration` | Configuración de la plantilla y sus activities. |
| `POST` | `/v6/template/find` | Buscar plantillas por criterios de filtro. |
| `POST` | `/v6/template/createdraft` | Crear un borrador a partir de una plantilla. |
