# Estructura de un Envelope (sobre de firma)

Un *envelope* es la unidad de trabajo de eSAW: agrupa documentos, destinatarios y la configuración de cómo deben firmarlo/verlo.

## Documents

Referencian ficheros ya subidos vía `POST /v6/file/upload` (ver [05-esaw-integration-flow.md](05-esaw-integration-flow.md)):

```json
"Documents": [
  { "FileId": "c5a229ae-xxxx-xxxx-b6e8-d4eb9fd7bcf5", "DocumentNumber": 1 }
]
```

`DocumentNumber` es el índice (1-based) que referencian luego los campos de firma (`FieldDefinition`) y las opciones de visibilidad (`VisibilityOptions`).

## Activities

Cada `Activity` es un paso del flujo, con una `Action` (qué debe hacer el destinatario) y `VisibilityOptions` (qué documentos ve). Las actividades se agrupan por `SigningGroup` (firma) o `CopyingGroup` (copia) para definir si son secuenciales o paralelas.

Tipos de `Action` más usados:

- **`Sign`** — el destinatario debe firmar. Contiene `RecipientConfiguration`, `Elements` (campos a rellenar/firmar), `SequenceMode` (`NoSequenceEnforced` = firma en cualquier orden dentro del mismo `SigningGroup`), `BatchConfiguration`.
- **`SendCopy`** — el destinatario solo recibe una copia (no bloquea el flujo). Se usa tanto para CC como para hacer llegar el documento final al propio firmante sin depender de `AllowAccessAfterFinish` (ver overview).
- Otros tipos existentes en la plataforma (no cubiertos por los ejemplos de este repo): `View`, `FormFilling`, `AutomaticSign`.

### RecipientConfiguration

```json
{
  "ContactInformation": {
    "Email": "firmante@ejemplo.com",
    "GivenName": "Nombre",
    "Surname": "Apellido",
    "LanguageCode": "ES"
  },
  "NotificationChannel": "Email",
  "AllowAccessAfterFinish": false,
  "AllowDelegation": false,
  "RequireViewContentBeforeFormFilling": false
}
```

- `NotificationChannel`: `"Email"` o `"None"` (sin notificación automática — útil si la notificación la gestiona el sistema integrador).
- Métodos de autenticación adicionales del destinatario (no solo email): código de acceso preestablecido, SMS-OTP, login externo (Google/LinkedIn), OAuth2/SAML, Swedish BankID.

### Elements — campos del documento

- **Signatures**: cada firma referencia `DocumentNumber`, tiene un `ElementId` único, `Required`, `FieldDefinition.Position` (`PageNumber`, `X`, `Y`) y `Size` (`Width`, `Height`), y `AllowedSignatureTypes`.
- **Tipos de firma soportados**: `ClickToSign` (un clic), `DrawToSign` (dibujar con ratón/dedo/lápiz), `TypeToSign` (escribir el nombre con fuente estilizada), certificados (`LocalCertificate`, `DisposableCertificate`, `RemoteCertificate`), `SwedishBankId`, biométrica.
- **Campos de formulario**: textbox, checkbox, combobox, radio, listbox.
- **Campos predefinidos**: `TextFields`, `EmailFields`, `InitialsFields`, `GivenNameFields`, `SurnameFields`, `FullNameFields`, `DataFields`.
- `TaskConfiguration.BatchGroup`: agrupa varios campos para que el firmante los complete de una sola acción ("firma en lote").

### BatchConfiguration

```json
{ "Mode": "OptOutWithRequiredAlwaysSelected", "RequireScrollingOverAllSignaturesBeforeSigning": false }
```

## VisibilityOptions

Por documento, controla si un destinatario concreto lo ve (`IsHidden: false`) u oculta (`IsHidden: true`) — útil cuando distintos firmantes no deben ver todos los anexos.

## EmailConfiguration / ExpirationConfiguration / ReminderConfiguration / CallbackConfiguration

```json
{
  "EmailConfiguration": {
    "Subject": "Por favor firma el documento adjunto",
    "Message": "Hola #RecipientFirstName# #RecipientLastName#...",
    "SenderDisplayName": "Namirial Group"
  },
  "ExpirationConfiguration": { "ExpirationInSecondsAfterSending": 2419200 },
  "ReminderConfiguration": { "Enabled": true, "FirstReminderInDays": 3, "ReminderResendIntervalInDays": 2, "BeforeExpirationInDays": 1 },
  "CallbackConfiguration": { "CallbackUrl": "https://tu-backend/callback", "StatusUpdateCallbackUrl": "https://tu-backend/status-callback" }
}
```

El `Message` admite placeholders (`#RecipientFirstName#`, `#RecipientLastName#`, `#PersonalMessage#`, `#EnvelopeName#`, `#ExpirationDate#`) que eSAW sustituye al enviar.

## Estados de un envelope

`GET /v6/envelope/{envelopeId}` devuelve `EnvelopeStatus` con uno de estos valores: `Active`, `Completed`, `Canceled`, `Expired`, `Rejected`. Cada `Activity` dentro de la respuesta tiene su propio `Status`: `Pending`, `Completed`, `Rejected`, `Delegated`.
