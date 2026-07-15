# EsignatureAnywhere (eSAW) — Visión general

EsignatureAnywhere (eSAW), de Namirial, es la plataforma de firma electrónica del grupo. Dentro del chatbot de integración de Namirial Group, **es el único producto con pruebas en vivo habilitadas** (Signaturit, Ivnosys y ValidatedId se documentan pero no ejecutan llamadas reales desde este asistente).

## Arquitectura de la API

- **Versión actual**: REST API **v6** (v3/v4 deprecadas desde marzo de 2024; v5 se mantiene solo por compatibilidad).
- **Formato**: JSON.
- **Principio de diseño**: solo verbos `GET` y `POST` — no hay `PUT`/`PATCH`/`DELETE` como tales; las acciones de "borrar" o "cancelar" son endpoints `POST` dedicados (`/envelope/delete`, `/envelope/cancel`, etc.).
- **Host de referencia (demo/sandbox)**: `https://demo.esignanywhere.net/api`
- **Swagger interactivo**: `https://demo.esignanywhere.net/swagger/#/`
- **Flujo básico**: subir documento(s) → enviar un *envelope* (sobre) con la configuración de destinatarios y campos → consultar estado/resultado → descargar documento(s) firmado(s).

## Autenticación

Dos métodos soportados, ambos vía **cabecera HTTP** (nunca en el body ni en query string):

| Método | Cabecera | Formato |
|---|---|---|
| API Token (recomendado) | `apiToken` | `apiToken: <token de 64 caracteres>` |
| Bearer Token (OAuth2 Code Grant) | `Authorization` | `Authorization: Bearer <token>` |

- El **API Token es específico de usuario** y se genera en *Settings → Api Tokens and Apps*. Tras crearlo hay que **activarlo con el slider on/off** antes de poder usarlo.
- Se recomienda **un token distinto por integración** — así se puede revocar uno sin afectar a otras integraciones.
- Existe un *Organization API Token* (obsoleto, solo funciona en API v1-v5) que da acceso a todos los sobres/plantillas de la organización; requiere el feature flag `OrganizationApiToken`. **No usar en integraciones nuevas.**
- Una autenticación fallida devuelve `401 Unauthorized`; una autenticación correcta permite continuar hacia la lógica de negocio del endpoint (200/400/403/404 según el caso).

## Modo Developer

*Developer Mode* es un "constructor de configuración": permite crear un flujo de firma completo desde la UI (Designer) y descargar el JSON de configuración resultante, en vez de escribirlo a mano.

- Requiere el rol **Developer** o un rol personalizado con el permiso *"User can download api envelope description"*.
- Se puede descargar el JSON **antes de enviar** (puede tener coste) o **después de enviar** un sobre ya probado manualmente — esta segunda opción es la más práctica para prototipar un payload real sin adivinar el posicionamiento de los campos (`Position.X/Y`, `Size.Width/Height`).
- `demo.esignanywhere.net` es gratuito para pruebas; el acceso extendido requiere contactar con Namirial.

## Errores

Todas las respuestas de error (excepto 401, que no lleva body) siguen esta forma (`ErrorResponse`):

```json
{
  "ErrorId": "ERR0014",
  "Message": "Descripción legible del error",
  "TraceId": "guid-para-soporte"
}
```

Códigos HTTP típicos: `400` (payload inválido), `401` (no autenticado), `403` (no autorizado / feature no habilitado para la cuenta), `404` (recurso no encontrado), `415` (tipo de contenido no soportado en upload).

Ejemplo real de integración (Signaturit/SignaFrame): el campo `AllowAccessAfterFinish=true` en `RecipientConfiguration` requiere la feature `AllowAccessFinishedWorkstep` habilitada en la cuenta; si no está activa, la API devuelve `ERR0014`. La alternativa que no depende de esa feature es enviar una copia final al firmante mediante una activity de tipo `SendCopy` (ver [02-esaw-envelope-concepts.md](02-esaw-envelope-concepts.md)).
