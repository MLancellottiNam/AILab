# Configuración de Cuenta y Organización en eSAW

**Referencia para administradores y gerentes de organización en la interfaz de Settings.**

---

## API Tokens and Apps (Gestión de Tokens)

**Acceso:** Settings → API Tokens and Apps

### Tokens de API por Usuario (Recomendado)

Cada usuario crea y gestiona sus propios tokens para integraciones API.

**Características:**
- Recomendación: crear tokens **diferentes para cada integración externa**
- Facilita revocación selectiva si un token se expone
- Token alfanumérico de 66 dígitos (v6+; longitud puede cambiar)

**Acciones:**
- **Create Token:** genera nuevo token
- **Disable (slider):** desactiva temporalmente sin eliminar
- **Details view:** muestra valor completo para copiar al Clipboard
- **Delete:** elimina permanentemente

**Buena práctica:** Guardar token en gestor de contraseñas; tratarlo como contraseña.

### API Tokens a Nivel de Organización

Token único para toda la organización.

**Requisitos:**
- Feature Flag "OrganizationApiToken" habilitado
- Permiso de Administrador en la organización
- (Sólo para v21.16+; invisible en versiones anteriores)

**Características:**
- Acceso amplio: organización completa
- **No recomendado** en escenarios donde debe compartirse (riesgo de abuso)
- Formato: 32 dígitos alfanuméricos (no necesariamente GUID)

**Acciones:** Crear, listar, deshabilitar, copiar, eliminar (igual que tokens de usuario)

### OAuth Application Configuration

Para integrar vía OAuth 2.0 (en lugar de token directo):

**Requisitos en eSAW:**
- Configuración de "OAuth Application" en AdminWeb (on-premise)
- O solicitar a Namirial Cloud Operations (SaaS)

**Datos necesarios para la aplicación:**
- Nombre de integración (visible al usuario cuando otorga permiso)
- Logo (opcional)
- Descripción (opcional)
- Redirect URL (HTTPS, URL completa, reachable desde servidor eSAW)

**Flujo OAuth Code Grant:**
1. Integración redirige usuario a página de autorización de eSAW
2. Usuario autentica y otorga permiso
3. eSAW redirige a Redirect URL con código de autorización
4. Backend intercambia código por Bearer Token (API token del usuario)
5. Integración almacena token de forma segura (encriptado)

**Ventaja:** Usuario no comparte token; puede revocar acceso en cualquier momento.

---

## License Overview (Visión General de Licencia)

**Acceso:** Settings → License (requiere permiso "User can view license settings")

### Información Mostrada

- **Plan:** Free Trial, por documentos, por usuarios, etc.
- **Expiration Date:** Fecha de vencimiento de la licencia
- **Envelopes Sent:** Cantidad total desde activación
- **Registered Users:** Usuarios creados bajo esta licencia

### Opciones de Compra

- **SaaS (demo.esignanywhere.net):** sin pago requerido
- **SaaS (saas.esignanywhere.net):** prueba gratuita registrable
- **On-Premise:** contactar ventas Namirial o usar código de bono

### Acciones

**SaaS únicamente:**
- **Cancel Organization Account:** borra toda la organización
  - Requiere confirmar con contraseña
  - **Irreversible:** elimina envelopes, drafts, usuarios, equipos
  - Tiempo de borrado: hasta 24h

**On-Premise únicamente:**
- **Upload License:** suba archivo de licencia
- **Request License:** genere solicitud para Namirial

---

## Envelope and Signature Field Statistics

Tabla de contadores **relevantes para licencia:**

### Estadísticas Mostradas

**Por tipo de firma (más compleja permitida):**
- Click2Sign
- Type2Sign
- OTP/SMS
- Biométrica
- Certificado Disposable
- Firma Remota Cualificada

**Columnas:**
- Tipo de firma
- Cantidad de envelopes
- Cantidad de campos de firma

**Nota:** Los contadores incluyen datos históricos (incluso de antes de renovación de licencia). Por eso la tabla puede diferir del resumen en "Envelopes Sent".

### Interpretación

**Ejemplo:** Envelope con 3 campos:
- Campo 1: Click2Sign + Disposable → cuenta como "Disposable" (más complejo)
- Campo 2: Biométrica → cuenta como "Biométrica"
- Campo 3: Click2Sign → cuenta como "Click2Sign"

En estadísticas se registra: 1 envelope "Disposable", 1 "Biométrica", 1 "Click2Sign"

---

## License Notifications Configuration

**Acceso:** Settings → License → Notifications

### Alertas por Licencia

**Consumo (volumen-based):**
- Configurable: alerta cuando se alcance X% (ej: 80%)
- Envía notificación por email

**Tiempo (time-based):**
- Configurable: alerta N días antes de expiración
- Envía notificación por email

### Callback de Expiración

Defina endpoint HTTP/HTTPS que será llamado cuando se alcance el umbral de advertencia:

```
POST https://your-system.com/license-alert?event=threshold_reached
```

**Payload típico:**
```json
{
  "organization": "Acme Corp",
  "license_type": "volume_based",
  "consumption_percent": 80,
  "timestamp": "2026-07-03T10:00:00Z"
}
```

---

## Custom Timestamp Service

**Acceso:** Settings → Organization → Timestamp Configuration

**Requisitos:**
- Feature Flag "AllowUsingCustomTimeStampService" habilitado
- Permisos: "View organization settings" + "Edit organization settings"

### Configuración

| Campo | Descripción |
|---|---|
| **Server URL** | Endpoint del servicio de timestamp (RFC 3161) |
| **User** | Credencial para autenticación |
| **Password** | Contraseña |
| **Hash Algorithm** | SHA1, SHA256, o SHA512 |

**Nota:** Si no está configurado, se usa servidor de timestamp por defecto.

### Prioridad

Si ambos flags "Timestamp" y "AllowUsingCustomTimeStampService" están habilitados:
→ **AllowUsingCustomTimeStampService toma precedencia**

Si "AllowUsingCustomTimeStampService" está habilitado pero SIN valores configurados:
→ Timestamps NO disponibles (a menos que "Timestamp" flag también esté activo)

### Aplicación

- **Envelopes nuevos:** Usa configuración actual
- **Envelopes ya enviados:** Aplica cambio retroactivamente
- **Visible en:** Audit Trail del envelope

---

## Login Page Configuration

**Acceso:** Configure desde AdminWeb o SaaS tenant settings

### Métodos de Autenticación

#### Username/Password (Estándar)
- Disponible si eSAW gestiona contraseñas
- Campo de usuario y contraseña
- Opcional: CAPTCHA según config

#### OAuth 2.0 / SAML
- Listados si están configurados como "published"
- Requiere Identity Provider Configuration en eSAW Settings
- Etiquetas personalizables (ej: "Login with Microsoft", "Login with Google")

### Sign Up / Trial Registration
- Solo en algunas instancias SaaS
- Registro automático con feature set de evaluación

### Password Reset

**Flujo:**
1. Usuario clic en "Forgot your password?"
2. Ingresa email
3. Recibe enlace (válido 24h por defecto)
4. Establece nueva contraseña

**Restricciones:**
- No disponible si OAuth/SAML habilitado para el usuario
- Enlace expira tras tiempo configurado (24h estándar)
- Enlace expirado: vuelve a iniciar proceso

---

## OAuth Identity Provider Configuration

**Acceso:** Settings → Identity Providers

Para permitir que usuarios autentten vía OAuth (en lugar de usuario/contraseña o SAML).

### Crear OAuth Identity Provider

**Datos requeridos:**
1. **Provider Name:** nombre visible (ej: "Google", "Microsoft")
2. **Client ID:** proporcionado por IdP externo
3. **Client Secret:** guardar en password manager; **NUNCA** en código frontend
4. **Scope:** ej: "openid profile email"
5. **Authorization URI:** ej: `https://accounts.google.com/o/oauth2/v2/auth`
6. **Token URI:** ej: `https://oauth2.googleapis.com/token`
7. **JWKS URI:** URL de claves públicas del IdP

### Validación de JWT

- **JWKS URI:** descarga claves públicas
- **Issuer:** valida emisor del token
- **Audience:** valida a quién va dirigido el token
- **Validate lifetime:** rechaza tokens expirados

### Field Mapping

Mapear claims de OAuth a campos de eSAW:

| Claim OAuth | Campo eSAW | Modo |
|---|---|---|
| given_name | Recipient First Name | Validate / Update |
| family_name | Recipient Last Name | Validate / Update |
| email | Email | Validate / Update |
| sub | User ID | Validate |

**Modos:**
- **Validate:** verifica que el valor coincida (ej: nombre en OAuth = nombre definido por remitente)
- **Update:** actualiza el campo con valor de OAuth

### Publicar en Login Page

Checkbox "Publish on login page" → aparece botón de OAuth en página de login

### Multiple Identity Providers

Es posible definir múltiples OAuth providers (ej: Google + Microsoft + GitHub) para que usuarios elijan

---

## IDHub (OAuth Middleware para Identificación)

**Nota:** Configuración avanzada, típicamente manejada por Namirial staff.

**Propósito:** Exponer identificación (SPID, Netheos, etc.) a través de interfaz OAuth estándar.

### Arquitectura

```
eSignAnyWhere (usuario selecciona "Identificación via Netheos")
    ↓
IDHub Middleware (OAuth wrapper)
    ↓
Netheos / Trust&Sign (identificación real)
```

### Configuración en IDHub

**Datos necesarios:**
- Credenciales Netheos (API URL, username, token)
- O credenciales SPID
- O credenciales CIE (italiano eID)

**Resultado:** IDHub expone OAuth endpoints estandarizados que eSAW puede consumir

### Configuración en eSAW

En **Settings → Identity Providers**, crear Identity Provider que apunte a IDHub:

**Campos clave:**
- Provider Name: ej: "Netheos Trust&Sign"
- Client ID / Client Secret: obtenidos de IDHub
- Authorization URI: `https://id-hub-demo.namirial.app/identityserver/connect/authorize`
- Token URI: `https://id-hub-demo.namirial.app/identityserver/connect/token`
- JWKS URI: `https://id-hub-demo.namirial.app/identityserver/.well-known/openid-configuration/jwks`

### Field Mapping para Identificación

Typical mappings para certificados disposables:

| Claim | Campo | Modo |
|---|---|---|
| given_name | Recipient First Name | Validate |
| family_name | Recipient Last Name | Validate |
| identification_type | Disposable Cert ID Type | Update |
| document_type | Disposable Cert Document Type | Update |
| identification_number | Disposable Cert ID Number | Update |
| phone_number | Disposable Cert Phone | Update |
| issuing_country | Disposable Cert Issuing Country | Update |
| issued_on | Disposable Cert Issued On | Update |
| expiry_date | Disposable Cert Expiry | Update |

---

## Errors View (Vista de Errores)

**Acceso:** Settings → Errors View (requiere permiso "User can use notification errors")

### Errores Registrados

**Callbacks fallidos:**

| Estado | Umbrales | Acción |
|---|---|---|
| **Warning** | Después de 10° intento fallido | Visible en errors view |
| **Error** | Después de 30° intento fallido | Permanente; visible en errors view |

**Valores por defecto** (configurables en `_global.xml`):
- `notificationErrorThreshold`: 10
- `notificationMaximumRetries`: 30

### Actions desde Errors View

- **Retry:** reintentar callback manualmente
- **View Details:** ver payload, response code, logs
- **Delete:** limpiar del error log

### Contexto

Para más info sobre callbacks: ver [06-esaw-callbacks.md](06-esaw-callbacks.md) (si existe) o API Callbacks.

---

## Roles and Permissions (Administración de Roles)

**Acceso:** Settings → Users → Roles (requiere permiso de Admin)

### Roles Predefinidos

| Rol | Capacidades |
|---|---|
| **Power User** | Enviar y gestionar envelopes |
| **Registered Signer** | Firmar documentos, ver tareas |
| **Administrator** | Cambiar org settings, gestionar usuarios, definir equipos |
| **Automatic Sealing Sender** | Usar firmas remotas automáticas |
| **Developer** | Descargar JSON/XML de envelopes |
| **Api User** | Usar API SOAP/REST |

**Nota:** Roles predefinidos no se pueden modificar.

### Custom Roles

Si habilitado, definir roles personalizados:
- Grant específicas permissions
- O block (remover) permissions de otros roles
- Combinable: usuario puede tener múltiples roles

### Permission Resolution

Si usuario tiene múltiples roles:
1. **Grant:** Rol A otorga permisos X, Y, Z
2. **Block:** Rol B bloquea permiso Y
3. **Resultado:** Usuario tiene X, Z (no Y)

### Preview Permissions

Botón en editor de usuario:
- Simula permisos resultantes
- Útil para debug de roles complejos

---

## Team Management

**Acceso:** Settings → Teams

(Ver también [15-esaw-backoffice-ui.md](15-esaw-backoffice-ui.md) para detalles UI)

**Configuración:**
- Crear equipos y asignar líderes
- Habilitar/deshabilitar sharing de envelopes
- Habilitar/deshabilitar sharing de templates
- Estructura multinivel

---

## User Management

**Acceso:** Settings → Users (tabla de usuarios)

**Acciones:**
- **Add User:** crear nuevo usuario (envía email de activación)
- **Edit:** cambiar nombre, idioma, roles, estado (enabled/disabled)
- **Delete:** eliminar (requiere reasignar envelopes, drafts, templates)
- **Add from Address Book:** agregar contacto existente

**Nota:** Email **no es modificable** — crear nuevo usuario si cambia email

---

## Organization Settings (General)

**Acceso:** Settings → Organization

**Configuraciones típicas:**
- Nombre de organización
- Logo
- Timezone
- Notificaciones por defecto
- Políticas de passwords
- Feature Flags (si habilitado)
- Custom HTML/CSS

---

## Address Book

**Acceso:** Documents → Address Book (requiere permiso "User can use address book")

**Función:** Guardar contactos frecuentes para reutilizar en nuevo envelope.

**Acciones:**
- Agregar contacto (nombre, email)
- Buscar
- Usar en wizard de crear envelope
- Eliminar

---

## Signer Guide Settings (Configuración de Políticas de Firma)

**Acceso:** Settings → Policies (si aplica)

**Configuraciones:**
- **Agreement/Terms Dialog:** mostrar términos y condiciones antes de firmar
- **Authentication Methods:** requerir PIN, OTP, biométrica (por defecto)
- **Signature Types Allowed:** Click2Sign, Type2Sign, Biometric, Qualified, etc.
- **Form Field Policies:** permitir/bloquear guardar, imprimir, adjuntar

---

## Notification Settings (Notificaciones Globales)

**Acceso:** Settings → Notifications (si habilitado)

**Configurables:**
- **Expiration Alerts:** días antes de expiración para recordar
- **Reminder Intervals:** cuándo enviar recordatorios (inmediato, N días, etc.)
- **Email From Address:** dirección de remitente para notificaciones
- **Email Templates:** customizar texto de emails

---

## Troubleshooting

### "Redirect URI does not match"
- OAuth error: la Redirect URL no coincide con configuración en IdP
- Verificar URL exacta (incluyendo protocolo, dominio, path)
- Asegurarse que es HTTPS
- Verificar que es reachable desde servidor eSAW

### Token expirado
- Si se almacenó token de usuario en sistema externo, puede expirar
- Usuario puede revocar permiso en Settings → OAuth Applications
- Sistema debe manejar reintentos de autenticación
- Usar refresh tokens si IdP lo soporta (eSAW v6+ puede)

### Callback fallido
- Ver Errors View
- Verificar HTTPS (requerido en SaaS)
- Verificar firewall/DNS
- Aumentar timeout si endpoint es lento
- Reintentar manualmente

---

**Última actualización:** Configuración v21+. Detalles específicos pueden variar según versión instalada.
