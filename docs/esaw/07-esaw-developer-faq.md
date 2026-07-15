# Preguntas Frecuentes para Desarrolladores (Developer FAQ)

Recopilación de respuestas a preguntas comunes sobre integración, customización y solución de problemas con eSAW.

## Customización

### Emails y idiomas

**¿Cómo personalizar los emails y los idiomas?**

Puedes configurar plantillas de email e idiomas para los firmantes de eSAW. Consulta la sección de configuración en la guía de usuario para más detalles.

### Interfaz de usuario

**¿Cómo personalizar la UI de eSAW?**

Existen dos posibilidades:
- **UI para Firmantes**: personalizable mediante cambio de plantilla
- **UI para Usuarios (Backoffice)**: solo disponible en instancias privadas en la nube o on-premise. Contacta con Namirial para más información.

## REST API y Herramientas

### Introducción a la API

**¿Cómo usar la interfaz REST? ¿Qué herramientas de testing existen?**

eSAW ofrece una interfaz REST con formato JSON. La mayoría de lenguajes de programación ofrecen clientes REST simples. Como punto de partida, **Postman** es una herramienta de testing de servicios web muy utilizada.

Consulta la **referencia de API REST Swagger** en `https://demo.esignanywhere.net/Api` para detalles técnicos.

## Capacidades de la API

### Prefill de formularios PDF

**¿Se pueden rellenar previamente formularios PDF?**

Sí, es posible usar la API para rellenar campos de formulario PDF con valores. La configuración se realiza mediante el parámetro `"OverrideOptions"` en el request de envío de envelope.

### Múltiples documentos en un envelope

**¿Se pueden enviar varios documentos en un único envelope?**

Sí. Añade dos o más documentos en el array `"Documents"` del request de envío de envelope:

```json
"Documents": [
  {"FileId": "<uuid>", "DocumentNumber": 1},
  {"FileId": "<uuid>", "DocumentNumber": 2}
]
```

### Integración del Designer en tu aplicación

**¿Cómo integrar el diseñador de eSAW en mi aplicación?**

1. Crea un draft y configura la opción `"allowAgentRedirect": true` en `"AgentRedirectConfiguration"`
2. El parámetro `"iFrameWhiteList"` extiende la cabecera HTTP con una lista para integrar en tu portal web (via `X-FRAME-OPTIONS`)
3. Embebe el Designer usando: `https://demo.esignanywhere.net/AgentRedirect/index?draftid=##draftid##`

Una vez el draft se complete, puedes iniciar el envelope.

### Suprimir email para un destinatario

**¿Cómo no enviar email a un destinatario específico?**

Añade `"DisableEmail": true` en la configuración del envelope JSON para ese destinatario.

## Integración y Callbacks

### Reintentos de callback

**¿Cuántas veces se reintentan los callbacks?**

eSAW reintentar llamar a la URL de callback hasta **30 veces**. Con los timeouts configurados, esto es suficiente para recuperarse si el sistema es llamado está caído algunos minutos.

**Importante**: responde con HTTP 200 inmediatamente al recibir el callback, antes de procesar (descargar documentos, etc.) para evitar timeout.

### Personalizar mensajes SMS OTP

**¿Cómo personalizar el contenido y idioma del SMS OTP?**

Si está habilitado el feature flag `ActivityEngineCustomLocalizations`:

1. Descarga el archivo base desde *Organization Settings → Activity-Engine Custom Localizations*
2. Renómbralo con el código de idioma (ej: `Localizations.de.custom.json`)
3. Abre el archivo y adapta los valores
4. Borra todos los otros items (con valores por defecto) para recibir actualizaciones automáticas tras upgrades

Consulta *Language Support* para idiomas disponibles. **Nota**: se aplican restricciones de longitud SMS.

### Apps SIGNificant y WorkstepId

**¿Cómo integrar SIGNificant Apps con eSAW o capturar el WorkstepId?**

Opción 1: incluir enlaces en notificaciones:
```json
"IncludedEmailAppLinks": {"Android": true, "iOS": true, "Windows": true}
```

Opción 2: capturar el `workstepRedirectionURL` del response de `GET /v6/envelope/{envelopeId}/viewerlinks`:
- URL por defecto: redirige al SAW Viewer
- Añade parámetro `&responseType=returnWorkstepId` para obtener el WorkstepId
- Con el WorkstepId puedes conectar SIGNificant product; cuando termine, el flujo continúa automáticamente

Otros valores de `responseType`:
- `redirectToAndroidApp` / `redirectToIOsApp` / `redirectToWindowsApp` — app específica
- `redirectToViewer` — SAW Viewer (default)

### Callbacks en eventos específicos

**¿Cómo recibir callbacks en eventos específicos (ej: firma rechazada)?**

Puedes configurar callbacks específicos en eventos concretos. Consulta la guía de [06-esaw-callbacks.md](06-esaw-callbacks.md) para detalles completos sobre tipos de eventos y configuración.

## Documentos y Archivos

### PDF y PDF/A

**¿Cómo eSAW maneja PDF vs PDF/A?**

Si subes un PDF/A, permanecerá como PDF/A válido a lo largo del flujo. Si subes un PDF no-A, el documento final también será no-A.

### Placeholders para campos de firma

**¿Existe una forma simple de marcar campos de firma en documentos?**

Sí, usa **SigStrings**: escribe una cadena (simplemente `` `sig` ``) en el documento y eSAW colocará automáticamente un campo de firma. Consulta la documentación de placeholders para opciones avanzadas (campos de formulario, radio buttons, etc.) en *Placeholder Use Case*.

### Adobe Reader dice que documentos no están validados correctamente

Normalmente causado por Adobe Reader desactualizado o certificados obsoletos. Instala la versión más reciente o actualiza certificados (*Settings > Trust Manager > Update AATL/EUTL*).

## Estados y Configuración

### Estados de envelope disponibles

**¿Qué estados puede tener un envelope?**

**Envelope:**
- `Draft` — no enviado
- `Active` / `InProgress` — en firma
- `Completed` — finalizado (estado final)
- `Canceled` — cancelado por el sender (estado final)
- `Expired` — expirado (estado final)
- `Rejected` — rechazado por un firmante (estado final)
- `Template` — plantilla reutilizable

**Bulk (envíos masivos):**
- `Draft`, `Canceled`, `Completed`, `Expired`, `Rejected`, `Template` — igual que envelope
- `Started` — iniciado pero requiere más configuración
- `CompletedWithWarnings` — advertencias sobre certificados desechables longevos
- `BulkCompleted` — todos los envelopes completados
- `BulkPartlyCompleted` — solo parte completada

### Metadata en envelopes

**¿Se pueden guardar metadatos en los envelopes?**

Sí. Añade datos en el campo `"MetaData"` de la configuración de documento:

```json
"Documents": [
  {
    "FileId": "<uuid>",
    "DocumentNumber": 1,
    "Name": "contract.pdf",
    "MetaData": "<tus datos>"
  }
]
```

El sistema almacena datos arbitrarios no-eSAW. Tu solución integradora puede descargar los archivos y enviarlos al archivo.

## Troubleshooting

### Envelope finalizado pero status aún "In Progress"

**¿Por qué un envelope completado sigue en estado "In Progress"?**

Causa probable: post-procesamiento (callback). El sistema espera HTTP 200; si devuelves error, reintentar (hasta 30 veces) puede retardar el cambio a "Finished". Asegúrate de responder HTTP 200 inmediatamente al callback.

### WorkstepRedirectionUrl vacío, envelope en estado "Started"

**¿Por qué workstepRedirectionUrl está vacío?**

El envelope no está aún en el estado correcto. "Started" significa que el link del primer recipient aún se está creando. Espera hasta que status sea "InProgress".

Alternativas:
- Activa `"suppressEmails"` en la configuración del recipient
- O marca `"Prevent emails from being sent"` en la organización (Admin Web)

Entonces el link se genera inmediatamente al enviar.

### Reading task (confirmación de lectura)

**¿Cómo requerir que el firmante confirme la lectura?**

Puedes definir una *reading task* donde el firmante debe confirmar haber leído. Consulta *Reading Task Guide* para detalles de configuración.

---

**Nota:** Esta es una recopilación de preguntas frecuentes comunes. Para preguntas específicas sobre arquitectura y protocolo, consulta [01-esaw-overview.md](01-esaw-overview.md) y [05-esaw-integration-flow.md](05-esaw-integration-flow.md).
