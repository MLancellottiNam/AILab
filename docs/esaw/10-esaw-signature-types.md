# Tipos de firma en eSAW

eSAW soporta diversos tipos de firma electrónica, cada uno con diferentes características legales y requisitos de autenticación. Es importante verificar con un asesor legal qué tipo de firma es adecuado para tu caso de uso.

## Regulación eIDAS (UE)

Dentro de la Unión Europea, la regulación eIDAS 910/2014 define dos categorías de firma:

### Firma Electrónica Avanzada (AES)
- Proporciona información identificativa única vinculada al firmante
- El firmante tiene control exclusivo de los datos usados para crear la firma
- Garantiza que la firma sea inválida si el documento se modifica (ej. PAdES)

### Firma Electrónica Cualificada (QES)
- Creada mediante dispositivo cualificado (p.ej. tarjeta inteligente, Certificado Remoto de TSP)
- Equivalente legalmente a firma manuscrita
- No impugnable por el firmante
- Requiere identificación del firmante (LRA o partners)

## Tipos de firma en eSAW

| Tipo | Nivel | Descripción |
|---|---|---|
| **Click to Sign** | AES (con segundo factor) | Firma simple: el firmante hace clic en el campo. Se recomienda combinar con autenticación (p.ej. SMS-OTP) |
| **Draw to Sign** | AES (con segundo factor) | Firma dibujada (ratón, dedo, lápiz). Requiere autenticación adicional recomendada |
| **Type to Sign** | AES (con segundo factor) | Firma escrita como texto con fuente estilizada. Requiere autenticación adicional |
| **Biometric Signature** | AES | Captura criptográfica en tiempo real de la biometría manuscrita. No requiere autenticación adicional. Típicamente requiere hardware (Signature Pad, Tablet con Pen) |
| **SMS-OTP Signature** | AES | Click + confirmación OTP por SMS. El teléfono del firmante es el elemento de control único |
| **Local Certificate** | AES/QES según certificado | Accede a certificados instalados localmente (Smart Cards, USB Token, Windows Cert Store) |
| **Digital Remote Certificate** | AES/QES según certificado | Accede a certificados remotos almacenados en CA/TSP. Credenciales bajo control del firmante |
| **Disposable Certificate** | QES | Certificado desechable vía TSP de Namirial. Simple para signatarios (T&C + SMS OTP) |
| **Custom Signature Types** | Según configuración | Integraciones personalizadas de TSP o tipos específicos por caso de uso |

## Escenarios recomendados

### Escenario Remoto
El firmante usa sus propios dispositivos (smartphone, PC), típicamente desde casa u oficina.

**Recomendación AES**: **Click to Sign** combinado con **SMS-OTP** para autenticación. Buena experiencia de usuario y aceptación.

**Alternativa**: SMS-OTP Signature, pero requiere OTP por cada campo de firma (requiere batch signing si hay múltiples campos).

**Para QES**: Disposable Certificate (firma con Click + confirmación SMS-OTP o Namirial OTP App).

### Escenario Point-of-Sale (PoS)
Firma en local con hardware disponible (Signature Pad, Tablet, PC con touchscreen y pen).

**Recomendación AES**: **Biometric Signature** (forma natural en PoS). Alternativamente, transformar a escenario remoto si el firmante usa su dispositivo.

**Para QES**: Disposable Certificate, típicamente con SIGNificant Kiosk + Signature Pad.

## Configuración de firma PAdES

La configuración PAdES define el nivel de firma según estándares PDF:

- **PAdES BASELINE-B**: Firma con certificado (sin timestamp externo)
- **PAdES BASELINE-T**: Includes B-Level + timestamp de TSA
- **PAdES BASELINE-LT**: Includes T-Level + datos completos de certificación y revocación
- **PAdES BASELINE-LTA**: Includes LT-Level + timestamp de TSA adicional

Si un campo permite múltiples tipos de firma, la configuración PAdES se aplica por campo. Si hay conflictos, se usa el nivel más alto entre los tipos permitidos.

## Evidencia y validación

El PDF firmado contiene:
- Certificados digitales (identidad del signatario e emisor del documento)
- Integridad del documento (cambios visibles tras firma)
- Historial de firma y documento
- Timestamps confiables (opcional)
- Información de geolocalización (opcional)
- Validez del certificado en momento de firma (OCSP/CRL)

Además, eSAW genera una **pista de auditoría sellada digitalmente** (excepto si se deshabilita) que documenta:
- Hash del sobre y documentos
- Notificaciones enviadas y direcciones
- Métodos de autenticación usados
- Direcciones IP del lector
- Ubicaciones geográficas
- Fechas y horas de acciones
- Todas las acciones: abrir página, confirmaciones, rellenos, firmas, etc.

---

# Cambios conceptuales: API v5 a v6

La migración de API v5 a v6 requiere cambios significativos en la implementación del cliente, ya que v6 aborda desventajas conocidas de versiones anteriores. La recomendación es migrar pronto a v6 para nuevos proyectos y clientes.

**Nota importante**: Si creaste envelopes con API v5 e intentas recuperarlos con API v6, pueden ocurrir incompatibilidades. Algunos endpoints v6 devuelven error `InvalidEnvelopeApiVersion`. Solución: continúa usando llamadas v5 para recuperar envelopes creados con v5 en operaciones GET (GetElements, Get, GetConfiguration, etc.).

## Características no soportadas en v6

Las siguientes solo están disponibles en API v5:

- **SequenceOnlyRequiredTasks**: Eliminado. Usa `SequenceEnforced` o `NoSequenceEnforced` según caso.
- **Swisscom Automatic Signatures / Organization Certificates**: Se añadirán en futuro.
- **Document links a bookmarks**: Solo soporta hyperlinks a recursos WWW.
- **Some undocumented data structures**: Funcionalidad antigua de SIGNificant app/Kiosk no disponible en SAW Viewer (se añadirá si se considera importante).
- **User Management**: Sin endpoints `/user/*` en v6 (usa v5 si lo necesitas).
- **OverrideHolderInCaseOfMismatch, ViewerPreferences, SignatureRenderingLayout**: Removidos.
- **Signing certification via thumbprint**: Removido (usa Custom Sealing Certificate vía UI o API).
- **AttachSignedDocumentsToEnvelopeLog**: No permite agregar documentos firmados al audit trail.
- **VisibleAreaOptions, Pattern field** en `/file/prepare`: Removidos.

## Cambios globales de nomenclatura

### Insecure organization tokens
Eliminada la opción de usar tokens de organización inseguros.

### Terminología consistente
- Se revisaron y estandarizaron todos los nombres en API y modelos.
- En contexto de workflow, se usan elementos nombrados consistentemente.
- Cambio de **firstName/lastName** a **givenName/surname** (más inclusivo globalmente).
- Cambio de **recipient** a **activity** (en BPMN, un sobre es un workflow con actividades, no solo recipients).
- Cambio de **whitelist/blacklist** a **allowlist/blocklist**.

### Enumeración de estado de envelope
Revisados y alineados con WebUI:

| v1-v5 | v6 | Notas |
|---|---|---|
| Started, InProgress | Active | |
| ActionRequired | ActionRequired | Derivado de "Active" según usuario |
| WaitingForOthers | WaitingForOthers | Derivado de "Active" según usuario |
| Completed | Completed | |
| CompletedWithWarnings | (eliminado) | |
| Canceled | Canceled | |
| Rejected | Rejected | |
| ExpiringSoon | ExpiringSoon | Definido en v5 pero no usado; ahora se deriva de "Active" |
| Expired | Expired | |
| Draft, Template | (en endpoints separados) | Ahora en `/draft/` y `/template/` |
| BulkCompleted, BulkPartlyCompleted | (en `/envelopebulk/`) | Separados a métodos dedicados |

### Enumeración de certificado desechable

**Identification Types (v5 → v6)**:
- FOREIGN_TAX_CODE → ForeignTaxCode
- PERSONAL_NUMBER → PersonalNumber
- PASSPORT → Passport
- NATIONAL_IDENTITY_CARD → NationalIdentityCard
- Etc. (snake_case → PascalCase)

**Document Types (v5 → v6)**:
- IdentityCard → IdentityCard
- DriverLicense → DriverLicense
- PASS → Passport
- CIE → NationalElectronicIdentityCard
- Etc.

## Cambios de complejidad

### Separación bulk sending
- **v5**: `/v5/envelope/*` cubría tanto envelopes simples como bulk (parent envelope).
- **v6**: `/v6/envelope/*` solo para envelopes simples; `/v6/envelope/bulk/*` para parent envelopes resultantes de bulk sending.

### Simplificación envelope/find
- **v5**: Permitía arrays de recipients, senders, signers.
- **v6**: Solo strings simples (un sender, un signer, un recipient). Para búsquedas complejas, consulta múltiples veces.

## Cambios a nivel de método

### Authorization
- `GET /v4/authorization` → `GET /v6/authorization/validate` (destaca que NO es obligatoria).
- Tres endpoints v5 se fusionan en `GET /v6/authorization/whoami` (retorna roles del usuario).

### Draft
- `POST /v5/draft/send/{draftId}` → `POST /v6/draft/send` (draftId en body).
- `POST /v5/draft/createFromTemplate` → `POST /v6/template/createdraft`.
- `PATCH /v5/draft/update/{draftId}` → `POST /v6/draft/update`.
- Nuevos: `GET /v6/draft/{draftId}/files`, `POST /v6/draft/find`.

### Envelope
Cambios de tipo HTTP y URI:
- `GET /v5/envelope/{envelope}/cancel` → `POST /v6/envelope/cancel`
- `GET /v5/envelope/{envelope}/remind` → `POST /v6/envelope/remind`
- `GET /v5/envelope/{envelope}/unlock` → `POST /v6/envelope/unlock`

**GET /v6/envelope/{envelopeId}** ahora retorna solo datos básicos; se divide en:
- `/configuration` → configuración detallada
- `/files` → IDs de ficheros
- `/forms` → datos de campos de formulario
- `/viewerlinks` → URIs para abrir SignAnyWhere Viewer

Descargas:
- `GET /v5/envelope/downloadCompletedDocument/{documentId}` → `GET /v6/file/{fileId}`

Restart:
- `POST /v5/envelope/{envelopeId}/restart` + `GET /v5/envelope/{envelopeId}/restart/{expirationInDays}` → `POST /v6/envelope/restartexpired`

File parsing:
- `POST /v5/envelope/prepare` → `POST /v6/file/prepare` (ahora opera en fichero antes de draft/envelope).

Bulk sending:
- `POST /v5/envelope/send` (singular + bulk) → `POST /v6/envelope/send` (solo singular); `POST /v6/envelope/bulk/send` (bulk).

### Otros cambios
- **License**: `GET /v4/license` → `GET /v6/organization/license`
- **Organization**: `GET /v5/organization/sealing` → `GET /v6/organization/automaticprofile`
- **Recipient** (terminology): `DELETE /v4/recipient/{id}/fromEnvelope/{envelopeId}` → `POST /v6/envelope/activity/delete` (ahora "activity")
- **Team**: `POST /v4/team` → `POST /v6/team/replace`
- **Templates**: `GET /v5/envelope/{templateId}/copyFromTemplate` → `POST /v6/template/createdraft` + `POST /v6/draft/send`
- **System**: `GET /v4/version` → `GET /v6/system/version`

## Cambios en modelos JSON

### Envelope
- `SspFileId` array → `Documents` array con `FileId` y `DocumentNumber`.
- `AddFormFields` array → campos asignados directamente a actividades; solo `UnassignedElements` para campos sin actividad.
- `Steps` array → `Activity` array (un nivel menos de jerarquía).
- `RecipientType` (string) → `Action` con uno de: `Sign`, `View`, `SendCopy`, `SignAutomatic`, `SignAsP7M`.
- `DocumentOptions` → `VisibilityOptions` (mejor nombrado).
- `DraftOptions` → `AgentRedirectConfiguration`.

### Configuraciones agrupadas
- Reminders, Expiration, Callback, Email → secciones separadas (vs. propiedades sueltas en v5).

## Nuevas funcionalidades en v6

- **Workstep Parameters on Drafts**: Más parametrización en drafts permite preconfigurar y luego editar en AgentRedirect.
- **Recipient Placeholders**: Soporte explícito para templates con placeholders que se resuelven al crear draft.
- **Signature Configuration**: Mayor control PAdES; default signature method desde organization settings.
- **General Policies**: Añadidas como v23.49; SMS-OTP message customization.

## Reglas claras en v6

**Parámetros en llamadas**:
- GET: parámetros en URI path.
- POST: NO hay parámetros en URI; TODO en body.

**Formatos de datos**:
- Fechas: RFC 3339 "full-date" (ej. 2022-11-25).
- Timestamps: RFC 3339 "date-time" con timezone obligatoria (ej. 2022-11-25T09:11:12Z).
- Colores: HTML color code (#rrggbb), ej. #ff0000 rojo.

**Verbos HTTP**: Solo GET y POST; no PUT, PATCH, DELETE.
