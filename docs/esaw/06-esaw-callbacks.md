# Callbacks (webhooks) de EsignatureAnywhere

eSAW notifica cambios de estado llamando a URLs HTTP(S) configuradas en `CallbackConfiguration` (ver [02-esaw-envelope-concepts.md](02-esaw-envelope-concepts.md)). En SaaS, el callback debe ser HTTPS y escuchar en el puerto 443 o en el rango 1025-65535.

## Tipos de callback

1. **Envelope callback** (`CallbackUrl`) — se dispara cuando el envelope llega a un **estado final** (completado/rechazado). Placeholders disponibles: `##EnvelopeId##`, `##Action##` (p.ej. `envelopeFinished`).

2. **Envelope status callback** (`StatusUpdateCallbackUrl`) — se dispara por **eventos intermedios** del workstep, no solo al finalizar. Acciones típicas: `workstepFinished`, `workstepRejected`, `workstepDelegated`, `workstepOpened`, `sendSignNotification`, `envelopeExpired`. Admite parámetros personalizados (p.ej. IDs internos del sistema integrador) para correlacionar el callback con tu propio registro.

3. **Workstep event callback** — logging detallado de eventos de la plataforma subyacente. Placeholders: `##WorkstepId##`, `##EventType##`, `##Source##`, `##Time##`, `##RecipientEmail##`, `##EnvelopeId##`. Más de 30 tipos de evento configurables.

## Reintentos

Si el endpoint de callback no responde correctamente, eSAW reintenta con intervalos crecientes (5, 10, 15, 20+ minutos) hasta **30 intentos a lo largo de ~36 horas**, tras lo cual el callback se marca como fallido permanentemente.

## Implicación para el diseño del backend

Si el chatbot o cualquier integrador quiere reaccionar a "el firmante ya firmó" en tiempo real (en vez de hacer polling a `GET /v6/envelope/{id}`), debe exponer un endpoint público HTTPS y registrarlo en `CallbackConfiguration.StatusUpdateCallbackUrl` al enviar el envelope. Para el flujo de "prueba en vivo" de este chatbot (una única llamada síncrona de test), no es necesario implementar callbacks — basta con consultar el estado tras un tiempo prudencial o mostrar el `EnvelopeId`/`ViewerLink` al usuario.
