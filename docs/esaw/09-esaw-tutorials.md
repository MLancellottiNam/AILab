# Tutoriales y Patrones de Integración

**Nota**: esta colección contiene patrones prácticos y use cases de eSAW. Para tutoriales detallados (Hello World, Create and Send Envelopes, document tagging, Designer UI), consulta la documentación completa en Confluence.

---

## Reutilización de flujos: Plantillas (Templates)

### Por qué usar plantillas

Las plantillas permiten **reutilizar configuraciones de envelope** para procesos repetitivos, ahorrando tiempo y evitando errores de configuración (ej: campo de texto olvidado).

**Flujo típico:**
1. Usuario/agente **diseña una plantilla** en la UI (con configuración completa)
2. Tu integración **obtiene el templateId** y lo usa vía API para crear envelopes rapidamente

### Crear y gestionar plantillas

#### Paso 1: Crear en UI

1. En la interfaz de eSAW, ve a la sección *Templates*
2. Haz clic en "create your first template" o "create new template"
3. Configura:
   - **Destinatarios**: específicos o placeholders (si usas placeholders, deberás sobrescribirlos al usar la plantilla)
   - **Campos de firma**: posicionamiento, tipos de firma
   - **Configuración de envelope**: expiration, reminders, etc.
4. Guarda la plantilla

#### Paso 2: Recuperar templateId

Una vez guardada, puedes encontrar el ID en la URL: `https://demo.esignanywhere.net/Templates/Detail/##TemplateID##`

O consultar vía API:

```
GET /v6/template/find
```

Con parámetros de búsqueda:
- `SearchText` — buscar por nombre
- `RecipientEmail` — filtrar por email de destinatario

**Response:**
```json
{
  "templates": [
    {
      "Id": "57605fc5-xxxx-xxxx-xxxx-901f9bb6aef7",
      "Name": "Contract Template - Sales",
      "CreationDate": "2025-09-12T06:42:14+00:00"
    }
  ]
}
```

### Usar plantillas vía API

#### Crear un draft desde la plantilla

```
POST /v6/template/createdraft
```

Body:
```json
{
  "TemplateId": "aa78a404-xxxx-xxxx-xxxx-8138065dc8a0"
}
```

**Response:**
```json
{
  "DraftId": "57605fc5-xxxx-xxxx-xxxx-901f9bb6aef7"
}
```

Una vez tengas el `DraftId`, puedes:
- Abrirlo en el Designer para editar (ver [07-esaw-developer-faq.md](07-esaw-developer-faq.md#integración-del-designer-en-tu-aplicación))
- O enviar directamente si no requiere cambios (usando el endpoint estándar de envío de envelope)

#### Obtener la configuración completa

Para obtener toda la configuración de una plantilla (útil para copiar/modificar):

```
GET /v6/template/{templateId}/configuration
```

Esto devuelve la configuración JSON completa (documentos, activities, recipients, validaciones, etc.) que puedes usar como referencia o para sobrescribir en nuevos envelopes.

### Patrones comunes

#### Patrón 1: Plantilla con recipients fijos

**Caso**: "Contrato de venta estándar siempre va a aprobador A, después a cliente"

- Define ambos recipients en la plantilla
- Usa directamente sin editar recipients
- Solo personaliza documento/metadata si es necesario

#### Patrón 2: Plantilla con placeholders

**Caso**: "Contrato de venta; cada venta tiene cliente diferente, mismo flujo de firmas"

- Define `SignPlaceholder` en Activities (en lugar de `Sign` con recipient específico)
- Al crear draft desde plantilla, el sistema espera que **sobrescribas** los placeholders con datos reales
- Muy útil para procesos con variables por transacción

#### Patrón 3: Plantilla para control de calidad

**Caso**: "Agente diseña envelope interactivamente, después la API lo reutiliza"

- Agente crea y guarda plantilla (con Designer, visualmente)
- Tu backend recupera el `templateId`
- En la integración, usa el `templateId` para nuevas instancias sin tener que hardcodear JSON

---

## Integración de flujos comunes

Para patrones de integración API completos (upload → envelope → callback → download), consulta [05-esaw-integration-flow.md](05-esaw-integration-flow.md).

Para casos de integración avanzada (SIGNificant Apps, portal web, Designer embebido), consulta *Integration Scenarios* en la documentación oficial.

---

## Notas

- Las plantillas se gestionan por **organización**; cada usuario puede verlas según permisos
- Los placeholders son especialmente útiles para SaaS/multi-tenant (cada tenant sus datos, mismo flujo)
- Los cambios en la plantilla **no afectan** envelopes ya enviados
- Si necesitas diferentes configuraciones para un mismo documento, crea plantillas separadas por escenario
