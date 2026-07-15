# Flujo de integración: enviar y verificar un envelope

Este es el flujo que ejecuta la acción `send_envelope` de la prueba en vivo del chatbot, y el mismo patrón que usa la integración .NET real de Signaturit/SignaFrame (`ESawSignatureService.cs`).

## 1. Subir el/los documento(s)

```
POST /v6/file/upload
Content-Type: multipart/form-data
apiToken: <token>

file: <binario PDF>
```

Respuesta (`FileUploadResponse`):

```json
{ "FileId": "c5a229ae-xxxx-xxxx-b6e8-d4eb9fd7bcf5" }
```

**Restricción**: no se permite subir varios ficheros en una sola llamada — una llamada por fichero.

## 2. Crear y enviar el envelope

```
POST /v6/envelope/send
Content-Type: application/json
apiToken: <token>
```

Body (`EnvelopeSendRequest`, campos obligatorios marcados con `*`):

```json
{
  "Documents*": [{ "FileId*": "c5a229ae-...", "DocumentNumber": 1 }],
  "Name*": "Contrato de prueba",
  "AddDocumentTimestamp": false,
  "ShareWithTeam": true,
  "LockFormFieldsOnFinish": false,
  "LateIdentification": false,
  "Activities*": [
    {
      "Action": {
        "Sign": {
          "RecipientConfiguration": {
            "ContactInformation": { "Email": "firmante@ejemplo.com", "GivenName": "Nombre", "Surname": "Apellido", "LanguageCode": "ES" },
            "NotificationChannel": "Email",
            "AllowAccessAfterFinish": false,
            "AllowDelegation": false,
            "RequireViewContentBeforeFormFilling": false
          },
          "SequenceMode": "NoSequenceEnforced",
          "Elements": {
            "Signatures": [{
              "ElementId": "Firma1",
              "Required": true,
              "DocumentNumber": 1,
              "UseExternalTimestampServer": false,
              "AllowedSignatureTypes": { "DrawToSign": { "UseExternalSignatureImage": "Disabled", "Preferred": false } },
              "FieldDefinition": { "Position": { "PageNumber": 1, "X": 100, "Y": 700 }, "Size": { "Width": 150, "Height": 50 } },
              "TaskConfiguration": { "BatchGroup": "GrupoFirma1" }
            }]
          },
          "BatchConfiguration": { "Mode": "OptOutWithRequiredAlwaysSelected", "RequireScrollingOverAllSignaturesBeforeSigning": false },
          "SigningGroup": "1"
        }
      },
      "VisibilityOptions": [{ "DocumentNumber": 1, "IsHidden": false }]
    }
  ],
  "EmailConfiguration": { "Subject": "Por favor firma el documento", "Message": "Hola #RecipientFirstName#..." },
  "ExpirationConfiguration": { "ExpirationInSecondsAfterSending": 2419200 },
  "CallbackConfiguration": { "CallbackUrl": "https://tu-backend/callback", "StatusUpdateCallbackUrl": "https://tu-backend/status" }
}
```

Respuesta (`EnvelopeSendResponse`):

```json
{ "EnvelopeId": "1a2b3c4d-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
```

## 3. Obtener el enlace de firma (viewer link)

```
GET /v6/envelope/{envelopeId}/viewerlinks
apiToken: <token>
```

```json
{ "ViewerLinks": [{ "ActivityId": "...", "Email": "firmante@ejemplo.com", "ViewerLink": "https://demo.esignanywhere.net/frontend/sign/..." }] }
```

Este es el enlace que se envía o se muestra al firmante para completar la firma en el *SignAnyWhere Viewer*.

## 4. Consultar estado

```
GET /v6/envelope/{envelopeId}
apiToken: <token>
```

```json
{
  "Id": "1a2b3c4d-...",
  "EnvelopeStatus": "Active",
  "Name": "Contrato de prueba",
  "SentDate": "2026-07-02T10:00:00Z",
  "Activities": [{ "Id": "...", "Status": "Pending", "OpenedDate": null, "FinishedDate": null }]
}
```

`EnvelopeStatus` ∈ `Active | Completed | Canceled | Expired | Rejected`. `Activity.Status` ∈ `Pending | Completed | Rejected | Delegated`.

## 5. Descargar documentos (cuando el envelope está `Completed`)

```
GET /v6/envelope/{envelopeId}/files
apiToken: <token>
```

```json
{
  "Documents": [{ "FileId": "...", "FileName": "contrato.pdf", "PageCount": 3, "DocumentNumber": 1 }],
  "AuditTrail": { "FileId": "...", "XmlFileId": "..." }
}
```

Luego, por cada `FileId` de interés (documento firmado o `AuditTrail.FileId` para el certificado de auditoría):

```
GET /v6/file/{fileId}
apiToken: <token>
```

Devuelve el binario con `Content-Type` y `Content-Disposition` apropiados.

## Notas de implementación (de la integración .NET real)

- El header se llama exactamente `apiToken` (no `Authorization`) cuando se usa API Token — hay que quitar cualquier valor previo antes de añadirlo (`DefaultRequestHeaders.Remove` + `Add`), para evitar duplicados si el `HttpClient` se reutiliza.
- Si se quiere que el propio firmante reciba una copia del documento final **sin** depender de la feature `AllowAccessFinishedWorkstep` (que si no está habilitada devuelve `ERR0014`), hay que añadir una `Activity` adicional con `Action.SendCopy` dirigida a su email, en vez de poner `AllowAccessAfterFinish: true`.
- Cuando hay varios firmantes con distinto orden, se agrupan por email en `SigningGroup`s numerados según el orden mínimo declarado (`SignatureOrder`), y cada grupo tiene su propio `BatchGroup` (`BatchGroup{n}`) para que sus campos se firmen juntos.
- El serializador debe omitir propiedades `null` al construir el JSON (`DefaultIgnoreCondition = WhenWritingNull`) — la API es estricta con tipos pero tolera campos opcionales ausentes.

Ver ejemplos ejecutables de este mismo flujo en varios lenguajes en [`code-examples/`](code-examples/).
