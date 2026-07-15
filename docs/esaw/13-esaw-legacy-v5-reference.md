# API v5 y versiones anteriores: Referencia heredada (DEPRECATED)

**⚠️ ADVERTENCIA**: Este documento cubre API v5, v4, v3 y versiones anteriores, que han sido **deprecadas desde marzo de 2024**. Este contenido es **solo como referencia** si encuentras código legacy o necesitas mantener integraciones v5 existentes.

**Recomendación**: Migrarse a **API v6** es obligatorio para nuevas integraciones y funcionalidades futuras. Ver [10-esaw-signature-types.md](10-esaw-signature-types.md) para cambios conceptuales v5→v6.

---

## Estados del API

- **API v3, v4**: Deprecadas desde marzo 2024
- **API v5**: Mantenida solo por compatibilidad (máximo hasta fecha no especificada)
- **API v6**: Versión actual recomendada

En SaaS, se removió SOAP en abril 2022. En on-premise, SOAP incluido hasta v21.76 (spring 2024).

---

## Flujo básico v5 (legacy)

### 1. Autorización

Dos métodos en v5:

**Opción A: Organization Key + User Login Name** (no recomendado)
```xml
<authorization>
  <organizationKey>4647688a-xxxx-xxxx-xxxx-xxxxxxxx</organizationKey>
  <userLoginName>your@email.address</userLoginName>
</authorization>
```

**Opción B: API Token** (recomendado)
```xml
<authorization>
  <apiToken>hizit4enf8ellb6b5hwh5b------------------------------</apiToken>
</authorization>
```

Errores de autenticación devuelven HTTP 401 Unauthorized (REST) o baseResult=failed (SOAP).

El **Bearer Token** (mismo valor que el apiToken, en formato `Authorization: Bearer <token>`) también funciona en algunos métodos concretos, p.ej. `sspfile/uploadtemporary`.

**Tip para pruebas en Postman**: guarda `SspFileId` y `EnvelopeId` como variables de entorno tras cada llamada (`pm.environment.set("envelopeId", pm.response.json().EnvelopeId)`) para reutilizarlas en las siguientes requests sin copiar/pegar.

### 2. Upload documento

**REST v5**:
```
POST https://demo.esignanywhere.net/Api/v5/sspfile/uploadtemporary
```

**SOAP v5**:
```
UploadTemporarySspFile_v1
```

Retorna **SspFileId** (temporal, válido 10 minutos o hasta crear envelope).

### 3. Preparar workstep (opcional)

Analiza PDF para detectar campos. Retorna configuración adhoc si la necesitas.

**REST v5**:
```
POST https://demo.esignanywhere.net/Api/v5/envelope/prepare
```

### 4. Enviar envelope

**REST v5**:
```
POST https://demo.esignanywhere.net/Api/v5/envelope/send
```

Retorna **EnvelopeId**.

### 5. Descargar documento completado

**REST v5**:
```
GET https://demo.esignanywhere.net/Api/v5/envelope/downloadCompletedDocument/{documentId}
```

En v5, el **documentId** se obtiene de la respuesta `getEnvelope`. Cada envelope completado expone tres documentos descargables distintos:

| Tipo | Campo | Contenido |
|---|---|---|
| **Documento firmado** | `FlowDocumentId` | PDF original con la firma del recipient |
| **Audit Trail** | `LogDocumentId` | Evidencia legal de todas las acciones (PDF) |
| **Audit XML** | `LogXmlDocumentId` | Misma auditoría en formato XML |

Códigos HTTP adicionales en v5: `204 NoContent` (éxito sin cuerpo de respuesta) y `500 Server Error` (error interno), además de los ya listados en la FAQ de abajo.

---

## Conceptos v5 no presentes en v6

### Workstep Configuration
En v5, cada recipient tenía un `workstepConfiguration` con todos sus detalles (campo positions, tipos de firma, validación, etc.). En v6 esto se aplanó a `Activity` con `Action` (Sign/View/SendCopy) conteniendo los detalles.

### Estructuras de modelos v5
- **SspFileId** array (v5) vs **Documents** array (v6)
- **Steps** (v5) vs **Activities** (v6)
- **RecipientType** string (v5) vs **Action** con discriminador (v6)
- **AddFormFields** (v5) vs asignación directa a activities (v6)

### Tipos de campo de formulario (WorkstepTasks, v5)

| Tipo | Descripción |
|---|---|
| Signature | Campo de firma (requerido/opcional) |
| TextBox | Entrada de texto |
| CheckBox | Casilla de verificación |
| RadioButton | Selección única |
| ComboBox | Selección de lista |
| ListBox | Lista multiselecta |
| AttachmentField | Carga de archivo |

Recordatorios y expiración se configuraban a nivel de `SendEnvelopeDescription`:
```json
{
  "EnableReminders": true,
  "FirstReminderDayAmount": 5,
  "RecurrentReminderDayAmount": 3,
  "BeforeExpirationDayAmount": 3,
  "DaysUntilExpire": 28
}
```

### Métodos removidos
- `GET /v5/envelope/{templateId}/copyFromTemplate` → use `POST /v6/template/createdraft`
- `POST /v5/envelope/sendFromTemplate` → use `/v6/template/createdraft` + `/v6/draft/send`
- User Management endpoints → no equivalente en v6 (contacta Namirial)

---

## FAQ Developer v5 (legacy)

Las siguientes preguntas y respuestas son de documentación v5. Muchas aplican también a v6, pero verifica siempre la v6 API reference.

### Errores y debugging

**P: ¿Cómo manejo errores HTTP?**

- 200 OK: Llamada exitosa
- 400 Bad Request: Payload inválido (ej. email malformado)
- 401 Unauthorized: Autenticación fallida
- 403 Forbidden: No autorizado / feature no habilitada
- 404 Not Found: Recurso no existe
- 415 Unsupported Media Type: Content-Type incorrecto (upload)

Respuesta de error (v5):
```json
{
  "ErrorId": "ERR0014",
  "Message": "Descripción del error",
  "TraceId": "guid-para-soporte"
}
```

**P: ¿Cómo depuro problemas de configuración?**

- Usa **Developer Mode** en UI para crear un envelope visualmente
- Descarga la JSON configuration (botón "Download")
- Compárala contra tu JSON generada
- Revisa el **audit trail** del envelope completado (contiene logs de autenticación, eventos, etc.)

### Integración específica v5

**P: ¿Cómo valido que el destinatario es quien dice ser?**

En v5, usa `AuthenticationMethods` y, si es OAuth/SAML, configura **Filters** que validen claims del IdP:

```json
{
  "AuthenticationMethods": [
    {
      "Method": "CustomOAuthProvider",
      "Parameter": "MyOAuthProvider",
      "Filters": [
        {
          "CompareOperation": "Equals",
          "FilterId": "Email",
          "FilterValue": "john@example.com"
        }
      ]
    }
  ]
}
```

En v6, esto es **Data Mappings** en OAuth configuration.

**P: ¿Cómo descargo el documento firmado?**

En v5, tras completar el envelope, llamabas:
```
GET /v5/envelope/{envelopeId}
```
y recuperabas `completedDocuments[].documentId`.

En v6, llamas:
```
GET /v6/envelope/{envelopeId}/files
```
que retorna un array de `Documents` con `FileId`.

Luego descargas:
```
GET /v6/file/{fileId}
```

---

## Guía Beginner v5 (REST y SOAP)

### Caso de uso básico

1. **Upload document** → SspFileId
2. **Create envelope** (con WorkstepConfiguration) → EnvelopeId
3. **Send envelope** → Notificaciones enviadas
4. **Poll envelope status** o **recibir callback** → Saber cuándo completado
5. **Download completed document** → Documento firmado

### Configuración mínima v5 (REST)

```json
{
  "SspFileIds": ["<FileId>"],
  "SendEnvelopeDescription": {
    "Name": "Test Envelope",
    "EmailSubject": "Please sign",
    "EmailBody": "Dear #RecipientFirstName#...",
    "Steps": [
      {
        "OrderIndex": 1,
        "RecipientType": "Signer",
        "Recipients": [
          {
            "Email": "john@example.com",
            "FirstName": "John",
            "LastName": "Doe",
            "LanguageCode": "en"
          }
        ],
        "WorkstepConfiguration": {
          "WorkstepLabel": "Sign",
          "SmallTextZoomFactorPercent": 100,
          "Policy": {
            "GeneralPolicies": {
              "AllowSaveDocument": true,
              "AllowSaveAuditTrail": true,
              "AllowRejectWorkstep": true
            }
          },
          "SignatureTemplate": {
            "Width": 190.0,
            "Height": 80.0,
            "Signatures": [
              {
                "Id": "sig1",
                "DocRefNumber": 1,
                "Position": {
                  "PositionX": 100.0,
                  "PositionY": 200.0
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### Callback en v5

Tras completar envelope, eSAW contactaba la **CallbackUrl** configurada:

```
POST {CallbackUrl}?EnvelopeId={envelopeId}&Action={action}
```

Acciones: `envelopeFinished`, `workstepFinished`, `workstepRejected`, `workstepDelegated`, etc.

En v6, callbacks estructurados en `CallbackConfiguration.ActivityActionCallbackConfiguration`.

---

## Guía Migración v5 a v6

### Cambios de estructura principales

| v5 | v6 | Impacto |
|---|---|---|
| `SspFileId` array | `Documents` array (con DocumentNumber) | Todo array de ficheros |
| `Steps` array | `Activity` array | Estructura flat, sin workstepConfiguration anidado |
| `RecipientType` string | `Action` object (Sign/View/SendCopy) | Discriminador explicito |
| `WorkstepConfiguration` | Propiedades dentro de `Action` | Reducción de jerarquía |
| Métodos `GET` para cambios | Cambiar a `POST` | Endpoint semantics |

### Migración paso a paso

1. **Estructura documento**:
   ```v5
   "SspFileIds": ["<FileId1>", "<FileId2>"]
   ```
   ```v6
   "Documents": [
     { "FileId": "<FileId1>", "DocumentNumber": 1 },
     { "FileId": "<FileId2>", "DocumentNumber": 2 }
   ]
   ```

2. **Estructura recipients**:
   ```v5
   "Steps": [
     {
       "OrderIndex": 1,
       "Recipients": [{ ... }],
       "RecipientType": "Signer",
       "WorkstepConfiguration": { ... }
     }
   ]
   ```
   ```v6
   "Activities": [
     {
       "Action": {
         "Sign": {
           "RecipientConfiguration": { ... },
           "Elements": { ... }
         }
       }
     }
   ]
   ```

3. **Métodos HTTP**:
   ```v5
   GET /v5/envelope/{id}/cancel
   ```
   ```v6
   POST /v6/envelope/cancel
   ```

4. **Download**:
   ```v5
   GET /v5/envelope/downloadCompletedDocument/{documentId}
   ```
   ```v6
   GET /v6/file/{fileId}
   ```

### Testing

- Crea un envelope con **v5 API** y descárgalo con **v6 API** → Error `InvalidEnvelopeApiVersion`
- Solución: continúa usando v5 para GET si lo necesitas

---

## Sample Configuration v5 (referencia)

### Simple Sign + Copy Flow

```json
{
  "SspFileIds": ["document-id-1"],
  "SendEnvelopeDescription": {
    "Name": "Contract Review",
    "EmailSubject": "Please sign the contract",
    "EmailBody": "Dear #RecipientFirstName#,\n\nPlease review and sign the attached contract.",
    "DaysUntilExpire": 28,
    "EnableReminders": true,
    "FirstReminderDayAmount": 5,
    "Steps": [
      {
        "OrderIndex": 1,
        "RecipientType": "Signer",
        "Recipients": [{
          "Email": "legal@customer.com",
          "FirstName": "Legal",
          "LastName": "Officer"
        }],
        "WorkstepConfiguration": {
          "WorkstepLabel": "Sign Contract",
          "SignatureTemplate": {
            "Signatures": [{
              "Id": "sig1",
              "DocRefNumber": 1,
              "Position": { "PositionX": 100, "PositionY": 700 },
              "Width": 200,
              "Height": 50
            }]
          },
          "Policy": {
            "GeneralPolicies": {
              "AllowSaveDocument": true,
              "AllowRejectWorkstep": true
            }
          }
        }
      },
      {
        "OrderIndex": 2,
        "RecipientType": "Cc",
        "Recipients": [{
          "Email": "archive@company.com",
          "FirstName": "Archive",
          "LastName": "Service"
        }]
      }
    ]
  }
}
```

---

## Recursos legacy

- **v5 REST API Reference**: Documentación swagger (ya deprecada)
- **SOAP WSDL**: https://demo.esignanywhere.net/api.asmx?WSDL (removida en April 2022 SaaS)
- **Java Library** (v5): Librería deprecated
- **Sample Code** (C#, Java): Basados en v5

---

## Conclusión

Si mantienes código v5:
1. **Planifica migración a v6** cuanto antes
2. **Usa este documento solo como referencia** si necesitas entender código legacy
3. **Consulta v6 API reference** para nuevas funcionalidades
4. **Contacta Namirial** si tienes dependencias críticas en v5 que no existen en v6

Para nuevos proyectos, **empieza siempre con API v6**.
