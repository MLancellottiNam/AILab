# Autenticación de firmante: Recipients, OAuth2/OIDC, SAML

Configuración de cómo autentican y se identifican los firmantes antes de acceder a documentos. Incluye métodos de autenticación adicionales más allá de email (códigos de acceso, SMS-OTP, OAuth2, SAML, BankID, etc.).

## Página Recipients: configuración del firmante

La **Recipients Page** en eSAW UI define datos generales del envelope y el flujo de firma.

### Secciones principales

- **Envelope**: Nombre, equipo (team sharing), acuerdo (agreement), certificado de sellado personalizado
- **Documents**: Añadir/remover/reordenar documentos (soporta hasta 50)
- **Recipients (Activities)**: Definir firmantes, tipo de actividad, autenticación
- **Document Visibility**: Qué documentos ve cada actividad
- **Messages**: Templates de email personalizados
- **Meta Data**: Metadatos del envelope (requiere feature `BeforeDraftSendRedirect`)
- **Advanced Settings**: Configuraciones avanzadas (redirect pre-envío, etc.)

### Datos principales del firmante (Recipient Primary Data)

| Campo | Descripción |
|---|---|
| **Order Index** | Número que define el orden. Índices iguales = actividades paralelas (ambas invitadas simultáneamente). |
| **E-Mail** | Email válido. Autocomplete desde address book, usuarios de org, o recientemente usados. |
| **First Name (Given Name)** | Nombre del firmante. Se usa para certificados desechables. |
| **Last Name (Surname)** | Apellido del firmante. Se usa para certificados desechables. |
| **Mobile Phone** | Formato internacional (+xx country code). Para SMS-OTP, BankID, etc. |
| **Recipient Type** | Tipo de actividad: Signer, Must-View, Send Copy (CC), PKCS#7. |

### Tipos de recipient

- **Signer**: Debe firmar o completar tareas. No es obligatorio que tenga campos de firma asignados (excepto si están marcados como required).
- **Must-View**: Actividad completada cuando el recipient abre el email. No requiere acciones en el documento.
- **Send Copy (CC)**: Recibe copia del documento completado. No bloquea el flujo.
- **PKCS#7**: Firma en contenedor P7M en lugar de incrustarse en PDF. Confirma presionando SIGN en lugar de FINISH.

### Restricciones de aplicación
La aplicación está diseñada para trabajar con hasta 50 documentos y hasta 50 recipients por envelope.

---

## Métodos de autenticación del firmante

Más allá del email, eSAW soporta **RecipientConfiguration → AuthenticationConfiguration** con:

- **Access Code (Código de acceso)**: PIN predefinido
- **SMS-OTP**: One-Time Password por SMS
- **Swedish BankID**: Integración nativa
- **OAuth2 / OIDC**: Proveedor de identidad externo (Google, Facebook, LinkedIn, custom, eID, etc.)
- **SAML**: Proveedores SAML (ADFS, Azure AD, etc.)

La autenticación ocurre **después de que el firmante abre el email**, antes de acceder al SignAnyWhere Viewer.

---

# OAuth 2.0 / OIDC para autenticación de firmante

Configura un proveedor OAuth2 externo para forzar que los firmantes se autentiquen con sus credenciales de identidad.

## Configuración del proveedor de identidad

Accede a **Settings → Identity Providers** para añadir un nuevo proveedor OAuth2 de firmante.

### Campos de configuración

| Campo | Descripción |
|---|---|
| **Provider Name** | Nombre mostrado en la UI de SignAnyWhere Viewer |
| **Redirect URL** | URL callback (mostrada al configurar; debe estar whitelisted en IdP) |
| **Client ID** | Identificador del cliente en el IdP |
| **Client Secret** | Secreto del cliente (mantenerlo seguro) |
| **Scope** | Permisos solicitados (ej. `openid profile email`) |
| **Authorization URI** | Endpoint `/authorize` del IdP |
| **Token URI** | Endpoint `/token` del IdP |
| **Logout URI** | Endpoint de logout (opcional) |

### Dos enfoques de recuperación de datos

#### 1. OAuth 2.0 + Resource URIs
Especifica una o más **Resource URIs** que eSAW contactará tras obtener el token para recuperar datos de identificación (JSON).

```
GET /userinfo?oauth_token=<token>
```

Retorna JSON que eSAW valida/actualiza contra los datos del recipient:

```json
{
  "given_name": "John",
  "family_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890"
}
```

**Parámetro de autenticación** en Resource URI:
- `oauth_token`: parámetro query `oauth_token`
- `oauth2_access_token`: parámetro query `oauth2_access_token`
- `access_token`: parámetro query `access_token`
- `bearer`: Header `Authorization: Bearer <token>` (recomendado para OIDC)

#### 2. OpenID Connect (OIDC) con JWT
El IdP retorna un **JWT** (JSON Web Token) directamente en el token endpoint.

**Configuración JWT**:
- **JWKS URI**: URL del conjunto de claves públicas para verificar firma JWT
- **Issuer**: Validar que el JWT fue emitido por este issuer
- **Validaciones** (por defecto deshabilitadas):
  - Nonce (prevenir replay attacks)
  - Audience (debe ser tu Client ID)
  - Issuer
  - Lifetime

**Ejemplo JWT decodificado**:
```json
{
  "iss": "https://idp.example.com",
  "sub": "1234567890",
  "given_name": "John",
  "family_name": "Doe",
  "email": "john@example.com",
  "aud": "your-client-id",
  "iat": 1234567890
}
```

En JWT, accede a datos anidados con punto (`.`):
```
person_data.given_name
```

### Data Mappings: validación y actualización

Define qué datos de Resource URI o JWT se **validan** (comparan contra valores esperados) o se **actualizan** (reemplazan en recipient).

**Ejemplo: validación**
```
Field property path: email
Validate/Update: Validate
Data field: Recipient email address
Expected value: john@example.com (automático: email del recipient en envelope)
```

**Ejemplo: actualización**
```
Field property path: given_name
Validate/Update: Update
Data field: Recipient First Name
(Sobrescribe el nombre del recipient con el del IdP)
```

### Mapeos predefinidos

| Recipient (WebUI) | JWT/Resource URI | Descripción |
|---|---|---|
| First Name | Recipient first name | Sobrescribe given name |
| Last Name | Recipient last name | Sobrescribe surname |
| Email | Recipient email address | Validar email del recipient |
| Phone Number | Recipient phonenumber | Formato internacional +xx |
| Disposable Cert: Document Type | Cert document type | IdentityCard, Passport, etc. |
| Disposable Cert: Document Number | Cert document number | Alfanumérico |
| Disposable Cert: Document Issued On | Cert document issued on | Formato de fecha |
| Disposable Cert: Document Issued By | Cert document issued by | Autoridad emisora |
| Disposable Cert: Document Expiry Date | Cert document expiry date | Formato de fecha |
| Disposable Cert: Identification Type | Cert identification type | DrivingLicense, Passport, etc. |
| Disposable Cert: Identification Number | Cert identification number | Alfanumérico |
| Disposable Cert: Phone Number | Cert phonenumber | Formato internacional +xx |

---

## Flujo de autenticación del firmante

1. Firmante abre email de eSAW
2. Hace clic en "OPEN DOCUMENT"
3. Se muestra UI de autenticación OAuth2 (lista de proveedores habilitados)
4. Elige el proveedor y es redirigido al IdP
5. Inicia sesión en IdP
6. IdP redirige a eSAW con token
7. eSAW contacta Resource URI o valida JWT
8. Datos se validan/actualizan
9. Acceso concedido a SignAnyWhere Viewer

Toda la información de autenticación se registra en el **audit trail**.

---

# SAML para autenticación de firmante

SAML (Security Assertion Markup Language) es un estándar XML para federar identidades.

## Configuración SAML

Accede a **Settings → Identity Providers** y añade un proveedor SAML.

### Ficheros necesarios

1. **Federation Metadata XML**: Metadatos del IdP SAML (contiene certificados, endpoints)
   - Pode ser subido como fichero o URL (ej. `https://idp.example.com/FederationMetadata.xml`)

2. **Authentication Request Token (Authn Request XML)**: Solicitud de autenticación SAML que eSAW enviará al IdP
   - Necesario después de subir Federation Metadata

### Pasos de configuración

1. Dar un nombre al proveedor
2. Subir Federation Metadata (file o URI)
3. Subir Authn Request Token XML
4. Añadir **attribute mappings** (selecciona atributos disponibles: Email, Sid, Username)
5. Habilitar el proveedor
6. **Descargar Service Provider Metadata** y entregarla al IdP para que la confíe

### Attribute mappings

eSAW soporta actualmente estos atributos SAML para mapeo:
- **Email**
- **Sid** (Security Identifier)
- **Username**

### Ejemplos de IdP SAML soportados

- **ADFS** (Active Directory Federation Services)
- **Azure AD** (con SAML, no OAuth)
- Otros proveedores SAML estándar (Okta, PingFederate, etc.)

**Nota**: Namirial recomienda contactar con el equipo SAML por la complejidad. La comunicación con el IdP no debe estar bloqueada (importante en SaaS).

---

# Identificación vs. Autenticación

### Autenticación
"¿Eres quien dices ser?" → Verificar identidad existente (Google login, eID, contraseña, etc.).

### Identificación  
"¿Quién eres realmente?" → Verificación de identidad fuerte con documento. Típicamente retorna datos que eSAW usa para emisión de **Disposable Certificate (QES)**.

---

# Configuración avanzada: Custom Sealing Certificate

Disponible desde v23.49. Permite configurar un certificado de sellado personalizado para el envelope (en **Envelope Settings** de Recipients Page).

---

# Validación y FAQ

## Error: "The validation of the OAuth login could not be processed"

**Causas posibles:**
- Token URI inválida
- JWKS URI inválida (JWT no puede verificarse)
- Validaciones JWT no cumplen (expiry, audience, issuer, nonce)
- Credenciales (Client ID/Secret) incorrectas

**Solución:**
1. Revisa la configuración contra el manual del IdP
2. Verifica los logs del servidor (`<TOKEN_FETCH_CALL_FAILED>`)
3. Prueba endpoints manualmente (Postman, curl)

---

# Referencias

- Para flujo de integración completo, ver [05-esaw-integration-flow.md](05-esaw-integration-flow.md)
- Para configuración de organización global (certificados, políticas, etc.), ver [03-esaw-user-signer-flows.md](03-esaw-user-signer-flows.md)
- Para tipos de firma y certificados, ver [10-esaw-signature-types.md](10-esaw-signature-types.md)
