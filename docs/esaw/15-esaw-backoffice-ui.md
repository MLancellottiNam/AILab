# Interfaz de Back-Office de eSAW

**Referencia visual y funcional para usuarios que crean, envían y gestionan envelopes en la aplicación web.**

## Pantalla Principal de Firma (SignAnyWhere Viewer)

### Elementos de la Barra Superior

#### Botones de Navegación Guiada
- Flechas que avanzan/retroceden por campos interactivos en el orden definido por el remitente
- Pueden filtrar para mostrar solo campos requeridos o todos los campos

#### Botones de Acceso Directo
- **Delegate:** involucrar otro firmante (si está permitida la delegación)
- **Finish:** completar el sobre (visible solo si aplica)
- Etiquetas personalizables según configuración organizacional

#### Menú Hamburguesa
Acceso a acciones adicionales (ver sección siguiente)

### Área de Vista Previa

**Herramientas de Zoom:**
- Zoom Out / Zoom In / Reset
- Facilita lectura en diferentes tamaños de pantalla

**Navegación de Páginas:**
- First Page / Previous / Next / Last Page
- Para documentos multi-página

### Área del Documento

Muestra el/los documento(s) a firmar. Pueden estar en secuencia o lado a lado dependiendo de la configuración.

**Contenedor típico:**
1. Portada (contrato)
2. Formulario de pago
3. Términos y condiciones

### Campos Interactivos

Los campos pueden configurarse como **requeridos** (borde rojo) u **opcionales**.

| Tipo | Descripción |
|---|---|
| **Signature Field** | Área para agregar firma. Puede permitir múltiples tipos (Click2Sign, biométrica, etc.) |
| **Text Box** | Entrada de texto; puede tener validación, máscara, etc. |
| **Combo Box** | Lista desplegable (se muestra solo el valor seleccionado) |
| **List Box** | Lista con múltiples selecciones visibles |
| **Check Box** | Casilla de verificación |
| **Radio Button** | Selección única dentro de un grupo |
| **Attachment Field** | Carga de archivo con restricciones opcionales |
| **Typewriter Annotations** | Campo de solo lectura (ej: fecha, nombre automático) |
| **Link** | Hipervínculo a sitio externo (términos y condiciones, etc.) |
| **Reading Tasks** | Confirmación de lectura de área/página/documento |

### Barra de Pie (Footer)

- Información de versión del producto
- Enlaces legales: Términos de Uso, Privacidad, Cookies

## Funciones del Menú Hamburguesa

### Finish (Completar)
- Última acción tras completar todas las firmas y campos requeridos
- Puede ser automática o requerir confirmación, según configuración
- Comparable a "entregar papel firmado" al socio comercial

### Reject (Rechazar)
- Rechaza y cierra el flujo del sobre de forma definitiva
- **Efecto:** El sobre no puede ser procesado por ningún otro firmante
- Termina la cadena de firma

### Undo (Deshacer)
- Deshace la última acción realizada
- Disponible en la mayoría de operaciones

### Print (Imprimir)
- Abre el diálogo de impresora del navegador
- Permite imprimir el documento antes de firmar

### Download (Descargar)
Opciones disponibles:
- **Finished Document:** PDF firmado
- **Audit Trail:** Evidencia de todas las acciones (legal en caso de AES)
- **Audit Trail XML:** Auditoría en formato XML
- **Original Document:** PDF sin firmar
- **Lote:** Descarga múltiples archivos (zip/sin comprimir)

### Delegate (Delegar)
- Asigna otro firmante cuando el actual no tiene autoridad
- Requiere validación de delegación habilitada en el envelope
- Mantiene historial de auditoría de la delegación

### Open in App (Abrir en Aplicación)
- Cambia del visor web a aplicación nativa instalada en el dispositivo

### Open in Kiosk (Abrir en Kiosk)
- Integración con dispositivos de firma biométrica (Namirial NT100xx, etc.)
- Vuelve a SignAnyWhere Viewer tras completar en Kiosk

### Language Selector
- Cambia idioma de interfaz (si está disponible)

### Settings (Configuración)
**Datos almacenados localmente (cookies y navegador):**
- Nombre de equipo (para licencias)
- Preferencia de acceso a SIGNificant Device Driver
- Selección de modo de firma (batch signing, tipo de firma preferido)
- Galería de imágenes de firma personalizadas

**Opciones de teclado:**
- Navegación de arriba a abajo (modo accesibilidad) — habilitado por defecto
- Usar orden definida por el remitente

**Opciones de dispositivo/modo:**
- Mostrar información de "aplicación nativa disponible"
- Redirigir automáticamente a aplicación nativa
- Dispositivo de firma preferido

### About (Acerca de)
- Lista de librerías de código abierto utilizadas
- Enlaces a documentación de licencias

---

## Asistente de Firma en Lote (Bulk Signing Assistant)

Permite firmar **múltiples documentos de una vez** sin repetir acciones en cada página.

### Ubicación
- Sección "Documents" en el back-office
- Abre en nueva pestaña

### Limitaciones
Solo lista actividades de firma que cumplen:
- Sin autenticación configurada
- Sin diálogo de términos y condiciones (a nivel envelope u organización)
- Tipos de firma: **Click2Sign** o **Type2Sign** únicamente

### Elementos de la Interfaz

| Elemento | Función |
|---|---|
| **Checkbox "Select All"** | Selecciona/deselecciona todos los envelopes |
| **Vista de envelopes** | Lista de documentos disponibles para firma en lote |
| **Preview panel** | Muestra documento del envelope seleccionado |
| **Botón "Sign"** | Inicia firma para todos los seleccionados |
| **Vista de documento** | Área principal de firma |
| **Delegation setting** | Permitir/bloquear delegación |
| **Finish button** | Completa el lote |
| **Additional settings** | Configuración avanzada |

---

## Editor de Equipos (Team Editor)

Estructura virtual de organizaciones para compartir envelopes y plantillas entre miembros con control granular.

### Conceptos Clave

- **Team Leader:** usuario raíz con acceso a todos los envelopes del equipo
- **Team Members:** usuarios en el equipo que pueden ver envelopes según configuración de sharing
- **Sharing Disabled:** cada usuario solo ve sus propios envelopes (excepto Team Leader)
- **Sharing Enabled:** todos los miembros ven envelopes de otros miembros del equipo

### Crear un Equipo

1. **Crear registro de equipo**
   - Settings → Team → "New Team"
   - Nombre del equipo + Team Leader (obligatorio)

2. **Agregar miembros**
   - Drag & drop del usuario sobre un miembro existente
   - (No se puede soltar sobre área vacía; requiere miembro como destino)

3. **Configurar sharing**
   - Checkbox: "Allow sharing of envelopes between all members"
   - Checkbox: "Allow sharing of templates between all members"

### Permisos por Configuración

| Escenario | Team Leader | Team Member |
|---|---|---|
| **Sin sharing** | ✓ Envelopes, ✓ Templates, ✓ Drafts | ✓ Solo propios |
| **Con sharing** | ✓ Todos | ✓ Todos del equipo |

### Estructura Multinivel

Posible crear jerarquías de equipos:
- **Nivel 1 (Raíz):** Equipo con líderes de equipos como miembros
- **Nivel 2:** Equipos liderados por miembros del Nivel 1

**Ejemplo:** Empresa → Departamentos → Subdepartamentos

---

## Compartir Envelopes/Drafts/Templates en Equipo

**Reglas de visibilidad:**

- **Team Leader** siempre ve envelopes de su equipo
- **Team Member** ve envelopes según:
  - Si sharing está habilitado → ve todos
  - Si sharing está deshabilitado → solo los suyos
- **Prevent Sharing:** Usuario puede bloquear compartir sus documentos incluso si el equipo lo permite (ni el líder ve excepto si lo creó)

**Casos de uso:**
- Equipo con sharing = colaboración abierta
- Equipo sin sharing = privacidad por usuario
- Equipos multinivel = jerarquía de aprobación

---

## Crear Sobre (Envelope Create Wizard)

Flujo paso a paso en la interfaz.

### Pasos Típicos

1. **Seleccionar documento(s)** — upload o desde clipboard
2. **Configurar recipients** — agregue firmantes (nombre, email, idioma)
3. **Diseñador (Designer)** — coloque campos de firma y formularios
4. **Página de Resumen (Summary)** — valide parámetros, notificaciones
5. **Enviar** — inicie el flujo

### Página de Resumen

**Contenido:**
- Nombre del envelope
- Lista de recipients
- Mensajes personalizados
- Documentos adjuntos

**Configuración de notificaciones:**
- Recordatorio inicial (días)
- Recordatorios recurrentes (intervalo)
- Recordatorio antes de expiración (días)
- Fecha de expiración total

**Opciones generales:**
- Use qualified timestamp
- Prevent editing form fields after envelope finished

**Botones de navegación:**
- ← Back (volver a Designer)
- Discard (borrar draft)
- Save As → Template / Draft
- Sign (si el remitente es primer firmante)
- Developer Mode (JSON export)
- Send Envelope (o Next si hay custom pages)

### Modo Developer

- Genera JSON de la estructura del envelope
- Requiere rol **Developer**
- Útil para pruebas de API (v6+)
- Nota: en v22.50+, solo genera JSON v6 (no soporta v5)

---

## Gestión de Documentos Completados

### Detalles del Documento

Visible cuando se hace clic en un envelope completado:

**Información mostrada:**
- Estado actual (Completed, In Progress, Rejected, etc.)
- Recipients (con estado individual)
- Documento preview
- Mensajes enviados

**Acciones disponibles:**
- **Remind:** Envía email de recordatorio al siguiente firmante
- **Cancel:** Cancela el flujo (no permite más firmas)
- **Delete:** Borra el envelope del sistema
- **Unlock:** (Parallel signing) desbloquea recipients paralelos
- **Download:** Descarga documento firmado, auditoría, JSON
- **Edit Recipient:** Modifica email/nombre/idioma de un recipient

### Descargas

- **Finished Document:** PDF con firma(s)
- **Audit Trail:** Evidencia legal PDF
- **JSON:** Estructura del envelope (requiere rol Developer)

### Editar Recipient

Permite cambiar después del envío:
- Email del recipient
- Nombre
- Idioma de interfaz
- Mensaje personalizado
- Permisos (delegación, acceso a envelope completado)

---

## Vistas de Envelopes (Dashboard/Inbox)

### Vistas Principales

- **Home:** Resumen de actividad reciente
- **Documents → Sent:** Envelopes enviados (con filtros)
- **Documents → Signed:** Envelopes firmados como recipient
- **Drafts:** Borradores no enviados

### Filtros Comunes

| Filtro | Opciones |
|---|---|
| Estado | Completed, In Progress, Expired, Rejected |
| Fecha | Enviado, Completado, Por completar |
| Por equipo | Si el usuario pertenece a equipos |
| Por remitente | Nombre/email del que lo envió |
| Búsqueda | Nombre del envelope, recipient |

### Acciones en Tabla

- Clic en row → Detalles del envelope
- Checkbox → Seleccionar para acciones bulk
- 3-dot menu → Más acciones (reminder, cancel, delete)

---

## Plantillas (Templates)

**Requisitos:**
- Feature flag "EnvelopeTemplates" habilitado
- Permiso "User can view envelope template"

### Crear Plantilla

Desde Envelope Create Wizard:
- Summary page → "Save As" → "Template"
- O desde envelope completado

### Uso de Plantilla

1. Documents → Templates
2. Seleccione plantilla
3. Haga clic "Create Envelope from Template"
4. Rellene valores específicos para el caso

### Placeholders de Recipients

Permiten definir roles:
- **{{Requester}}** → name/email se solicita al usar
- **{{Approver}}** → name/email se solicita al usar
- Simplifica reutilización en casos repetitivos

### Visibilidad

**Accesible para:**
- Su creador (propietario)
- Usuarios cuyos titulares se eliminaron (transferencia automática)
- Otros miembros del equipo (si sharing está habilitado)
- Todos en la organización (si marcada "Available for all organization users")

---

## Clipboard (Plugin de Microsoft Office)

Almacena documentos creados desde **Microsoft Office Plugin** (Word, Excel, etc.).

**Visibilidad:** Requiere permiso "User can use clipboard"

**Flujo:**
1. Cree documento en Office → marque para firma
2. Plugin lo envía a Clipboard en eSAW
3. Desde Clipboard, cree envelope a partir del documento

---

## Página de Login

### Opciones de Autenticación

| Método | Descripción |
|---|---|
| **Username/Password** | Estándar si eSAW gestiona contraseñas |
| **Captcha** | Puede requerirse según config |
| **OAuth 2.0** | Si el IdP está publicado en login |
| **SAML** | Si está configurado |

### Registro de Prueba (Trial)

- "Sign Up" disponible en algunas instancias SaaS
- Registro automático con feature set de evaluación
- Tiempo limitado

### Recuperación de Contraseña

1. Clic "Forgot your password?"
2. Ingrese email
3. Reciba enlace (válido 24h por defecto)
4. Establezca nueva contraseña
5. Enlace expira: rehaga proceso

**Nota:** No disponible si OAuth/SAML están habilitados para el usuario

---

## Navegación General

### Estructura de Menú (Típica)

**Top Navigation:**
- Logo/Home
- Documents (Inbox, Sent, Signed, Drafts, Templates)
- Clipboard (si aplica)
- Address Book
- Settings

**Settings (Admin/Power User):**
- Users
- Teams
- Organization Settings
- License
- API Tokens and Apps
- Roles and Permissions
- Identity Providers (OAuth/SAML)

---

## Consideraciones de Accesibilidad

- WCAG 2.1 soportado donde es posible
- Zoom y navegación por teclado disponibles
- Para usuarios con lectores de pantalla: descargue PDF y use lector estándar (Adobe Acrobat recomendado)
- Modo accesibilidad en Settings: navegación de arriba a abajo habilitada por defecto

---

**Última actualización:** Interfaz correspondiente a versiones v21+. Las pantallas pueden variar según customizaciones organizacionales.
