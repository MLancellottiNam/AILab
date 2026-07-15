# Flujos de usuario: creador del sobre vs. firmante

Esta página es útil cuando el usuario del chatbot pregunta "¿cómo funciona para el usuario final?" en vez de hacer preguntas puramente técnicas de API.

## Flujo del creador del sobre (UI, no API)

El *envelope creator* de eSAW sigue tres fases:

1. **Creación** — subir documento(s) y definir destinatarios (firmantes, copia, visores, firma masiva/bulk).
2. **Designer** — colocar campos de firma y de formulario sobre el documento (posición visual, no coordenadas manuales — Developer Mode permite exportar el JSON resultante).
3. **Envío** — configurar notificaciones, mensaje, expiración, recordatorios, y disparar el envío.

Tipos de destinatario:
- **"Needs to Sign"** — bloquea el flujo hasta que firma.
- **"Receives a copy"** — no bloquea, solo recibe notificación/copia.
- Firma **secuencial o paralela** entre destinatarios (equivale a `SigningGroup` en la API — mismo grupo = paralelo, grupos distintos con orden = secuencial).

Controles adicionales disponibles desde la UI (y espejados en la API): reemplazo de documento preservando campos ya colocados, expiración relativa o absoluta, recordatorios automáticos, visibilidad de documentos por destinatario.

## Flujo del firmante

1. **Recibe la invitación** por email (con el branding de la organización emisora).
2. **Accede al documento** pulsando "OPEN DOCUMENT" — puede requerir autenticación adicional (código de acceso, SMS-OTP, login externo, verificación de identidad) y aceptar Términos y Condiciones.
3. **Lee y firma** dentro del *SignAnyWhere Viewer*.
4. **Completa la firma** con una acción explícita de "finalizar".
5. **Descarga el documento firmado** (opcional, según configuración).

Tipos de firma disponibles para el firmante: `ClickToSign`, `DrawToSign`, `TypeToSign`, `SMS-OTP`, firma biométrica, certificados digitales (desechable, local o remoto). Todos quedan embebidos en el PDF siguiendo estándares del sector (con traza de auditoría descargable — ver `AuditTrail` en [05-esaw-integration-flow.md](05-esaw-integration-flow.md)).

## Configuración a nivel de organización

Desde *Settings and Customizing* se gestionan (fuera del alcance de la API de integración, son ajustes de cuenta):

- **Equipos y usuarios** (Team Settings, Users)
- **Roles y permisos** (incluye el permiso para Developer Mode)
- **Proveedores de identidad** (para autenticación de firmantes vía SSO)
- **Licencias**
- **Idioma y localización**
- **Plantillas de notificación**
- **Configuración de acuerdos (Agreements)**
- **Historial de sobres y vista de errores** (auditoría/troubleshooting)

Qué secciones ve cada usuario depende de sus permisos y de las feature flags habilitadas para la organización (ver la nota sobre `AllowAccessFinishedWorkstep` / `ERR0014` en el overview).
