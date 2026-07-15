# CLAUDE.md — Smart Dispatch (AILab)

> Documento base para que cualquier sesión (Marcos, Hernán o Claude) arranque
> sabiendo qué estamos construyendo, sobre qué base, y con qué reglas.
> **Idioma:** la **UI va en inglés** (decisión de Marcos, 2026-07); los
> comentarios internos quedan en español rioplatense; nombres de archivos y
> variables en inglés.

---

## 1. Qué es Smart Dispatch

Herramienta que convierte un **documento base** (Word/TXT con variables
`{{campo}}`) + una **fuente de datos** (CSV/JSON/XLSX) en un **lote de PDFs
listos para firmar**, y los envía masivamente vía **Signaturit** (y más
adelante **eSAW**).

MVP para un AI Camp de 2 días, entre dos personas:
- **Marcos** — PDF Builder, puente builder→envío, capa de IA.
- **Hernán** — Onboarding conversacional + planes, integración eSAW.

---

## 2. Los dos repos

- **Base existente (LEER, NO reescribir):**
  https://github.com/MLancellottiNam/siganturitdisp.git
  Es el "bulksend" que ya resuelve todo el **envío masivo**. HTML/CSS/JS puro.
  Se despliega hoy en GitHub Pages. Su nombre de producto es *"Multi Send
  Signaturit"*.
- **Repo nuevo (DONDE CONSTRUIMOS):**
  https://github.com/MLancellottiNam/AILab.git
  Copiamos el bulksend acá como punto de partida (commit `base: bulksend
  existente`) y construimos encima. **Un solo repo.**

---

## 3. Lo que el bulksend YA resuelve (NO REESCRIBIR sin aprobación)

- Envío masivo con progreso en vivo (barra + log con badges/timestamps/stats).
- Integración Signaturit vía **proxy** (Edge Function) con el token del usuario
  por header.
- Parseo de **CSV, JSON y XLSX** (SheetJS para XLSX).
- Mapeo inteligente de columnas con **auto-match**.
- `handleWordUpload`: ya detecta variables `{{...}}` en un Word (mammoth).
- 4 tipos de operación: firma avanzada, firma simple, email certificado, SMS.

### Anatomía del bulksend (mapa de archivos)

| Archivo       | Qué contiene |
|---------------|--------------|
| `index.html`  | Launcher modal (elegir tipo de operación) + flujo de 4 pasos (Config → Archivos → Mapeo → Envío) + modal de variables. |
| `styles.css`  | Variables CSS. Colores Signaturit: `#00B4B6` teal, `#0D1F3C` navy, `#FF6B35` naranja. Tipografías Inter + JetBrains Mono. |
| `app.js`      | Toda la lógica (~1300 líneas): estado global, launcher, parseo, mapeo, envío. |
| `research.txt`| Análisis de envíos programados (fuera de alcance del MVP). |

### Cómo funciona el proxy de Signaturit

- Constante interna en `app.js`: `PROXY_URL` (Supabase Edge Function).
- El browser **no puede** llamar directo a Signaturit (CORS). El proxy reenvía.
- Patrón de request: `fetch(PROXY_URL, { method:'POST', headers:{
  'x-signaturit-token': token, 'x-api-url': env + endpoint }, body: FormData })`.
- El proxy toma `x-signaturit-token` y lo reenvía como `Authorization: Bearer`.
- **GET vía override:** para listar plantillas se manda `x-method-override: GET`.
- **La palabra "Supabase" NO debe aparecer jamás en la UI ni en textos
  visibles.** El proxy es solo una constante interna.

### Endpoints de Signaturit usados

```
POST /v3/signatures.json     — firma simple y avanzada (type=advanced)
POST /v3/emails.json          — email certificado
POST /v3/sms.json             — SMS certificado
GET  /v3/templates.json       — listar plantillas
```

Envío firma (FormData): `recipients[i][name]`, `recipients[i][email]`,
`files[0]`, `templates[0]`, `type=advanced`, `subject`, `body`, `branding_id`,
`data[widgetName]` (variables de plantilla).

Restricción conocida: **no permite URLs** en `subject`/`body`.

---

## 4. Puntos de enganche (dónde insertamos lo nuevo)

Referencias a `app.js` del bulksend (números aproximados, verificar en el
código real tras la copia):

1. **`handleWordUpload(files)` (~línea 272)** — Hoy usa
   `mammoth.extractRawText` y el regex `/\{\{([^}]+)\}\}/g` para detectar
   variables. **El PDF Builder necesita `mammoth.convertToHtml`** (conservar
   formato) además del texto crudo. Acá se separan: **variables de datos** vs
   **anclas de firma** (regex `firma|sign|signature`).

2. **`updatePreview()` (~línea 820) → `matchedData`** — Estructura por fila:
   `{ rawRow, signers:[{email,name}], email, name, fileName, fileMatch,
   fileSize }`. **Este es el objetivo del puente:** el PDF generado se inyecta
   acá como un archivo por fila.

3. **Loop de envío `startBulkSend()` (~línea 1068)** — En
   `fd.append('files[0]', pdfFiles[...].file, item.fileName)` (~línea 1101) se
   adjunta el PDF. **El puente registra el Blob generado en `pdfFiles` (o
   equivalente), setea `item.fileName`/`fileMatch=true`, y agrega el/los
   parámetro(s) `anchor` de las firmas.**

4. **`PROXY_URL` (línea 5)** — Patrón a **espejar** para el proxy de eSAW.

> **Signaturit coloca la firma con el parámetro `anchor` (texto), NO con
> coordenadas.** Por eso las anclas del builder son texto (`{{firma_1}}`),
> se pintan del color de fondo (invisibles en el PDF) y su nombre viaja al
> envío como `anchor`. Sin este puente, builder y envío son dos herramientas
> separadas.

> ⚠️ **eSAW NO funciona como Signaturit (CONFIRMADO contra el sandbox,
> Hernán 2026-07-15).** eSAW **no** detecta anclas de texto invisible: sus
> "SigStrings" son **campos de formulario PDF reales (AcroForm widgets
> `/FT /Sig`)**. Se probó: texto plano (`sig`, `{{sig}}`, `#sig#`, etc.) →
> 0 detecciones vía `POST /v6/file/prepare`. Un campo AcroForm `/FT /Sig`
> con nombre → detectado con posición (página, X, Y) y tamaño ya calculados.
> **Implicación para el puente/builder:** para el destino eSAW, `html2pdf`
> (que genera PDF plano, sin AcroForm) **no alcanza** — hay que post-procesar
> el PDF e insertar campos de firma reales (ej. con **pdf-lib**) donde hoy
> van las anclas de texto. Detalle completo del hallazgo y del flujo
> `upload → prepare → envelope/send` en el encabezado de
> `js/providers/esaw.js`.

---

## 5. Estructura propuesta de AILab

Módulos separados y autocontenidos, sin bundler. Un `index.html` que orquesta.

```
AILab/
├─ CLAUDE.md                 ← este archivo
├─ index.html                ← shell: onboarding → builder → envío
├─ styles.css                ← base heredada del bulksend + estilos nuevos
├─ app.js                    ← envío masivo (heredado, tocar lo mínimo)
├─ js/
│  ├─ onboarding.js          ← [Hernán] fork cliente/nuevo + chat guiado + planes
│  ├─ plans.js               ← [Hernán] definición de planes + gating (IA/cuota)
│  ├─ builder.js             ← [Marcos] Word/TXT → HTML → PDF por fila (html2pdf)
│  ├─ bridge.js              ← [Marcos] puente builder → matchedData/envío (anchors)
│  ├─ providers/
│  │  ├─ signaturit.js       ← adaptador Signaturit (extraído del app.js actual)
│  │  └─ esaw.js             ← [Hernán] adaptador eSAW (misma interfaz)
│  └─ ai.js                  ← [Marcos] cliente al proxy de Claude (opcional, al final)
└─ functions/                ← Edge Functions (Deno), solo proxies
   ├─ signaturit-proxy/      ← el que ya existe (referencia)
   ├─ esaw-proxy/            ← [Hernán] espejo del de Signaturit
   └─ claude-proxy/          ← [Marcos] API key del SERVIDOR, no del usuario
```

**Interfaz común de providers** (para que Signaturit y eSAW convivan):
un adaptador expone algo como `send({ recipients, fileBlob, anchors, options },
token)` y traduce al formato de cada API. El envío genérico no sabe a qué
producto le habla.

---

## 6. Lo que hay que AGREGAR (backlog por dueño)

### PDF Builder — Marcos
- Word/TXT con `{{variables}}` → mammoth → **HTML** (no solo texto).
- Detectar y separar variables de datos vs anclas de firma
  (regex `firma|sign|signature`).
- Cruzar plantilla + cada fila, reemplazando variables.
- Aplicar marca (color, tipografía, título).
- Un PDF por fila con **html2pdf, en el browser** (sin backend).
- Las anclas de firma se pintan del color de fondo → invisibles en el PDF.

### Puente builder → envío (CRÍTICO) — Marcos
- Pasar el PDF generado + los nombres de las anclas al flujo de envío existente.
- Signaturit usa `anchor` (texto), NO coordenadas.
- ⚠️ **eSAW es distinto:** necesita campos AcroForm reales en el PDF, no
  anclas de texto (ver callout en §4). El puente/builder tiene que ramificar
  por producto: texto invisible para Signaturit vs campo `/FT /Sig` real
  (pdf-lib) para eSAW.

### Onboarding conversacional + planes — Hernán
- Pantalla fork: "ya soy cliente" (entra con token) vs "quiero empezar" (chat).
- **Chat guiado** (no formulario): chips de respuesta, "escribiendo…", píldoras
  de info entre preguntas.
- 1ª pregunta: **a qué producto envía** (Signaturit / eSAW / no sé). Por detrás
  el camino SIEMPRE es Signaturit; la respuesta se adapta a lo elegido.
- Después: volumen/mes, IA sí-no (con opción "¿qué hace exactamente?"), tamaño
  de equipo.
- **3 planes:** Starter (gratis, 100 docs, sin IA), Pro (€49, 1.000 docs, con
  IA), Enterprise (€199, ilimitado, con CRM).
- Checkout Stripe **dummy** (simulado). Dejar comentado dónde iría Stripe
  Checkout/Billing + webhook.
- El plan elegido controla el builder: caja de IA bloqueada o no, cuota vs
  límite.

### Integración eSAW — Hernán
- ~~**PRIMERO (día 1, mayor riesgo):** ¿eSAW soporta anclas de texto como
  Signaturit, o exige coordenadas x/y/página?~~ **RESUELTO (Hernán,
  2026-07-15):** ni una cosa ni la otra exactamente — eSAW posiciona por
  **campos AcroForm reales** (`/FT /Sig`) embebidos en el PDF; `file/prepare`
  los detecta y devuelve su posición/tamaño ya calculados. El mismo PDF **NO**
  sirve tal cual para ambos productos (ver callout en §4). Requiere un builder
  que inserte campos de firma reales (pdf-lib) para el camino eSAW.
- [x] Adaptador que traduce el envío genérico al formato de eSAW → hecho en
  `js/providers/esaw.js` (interfaz común `send(...)`, misma que Signaturit).
  Flujo `upload → prepare → envelope/send`, envío secuencial por loop (NO
  `/envelopebulk/send`, decisión del equipo). **Probado end-to-end contra el
  sandbox demo** (envelope real creado, viewer link funcional).
- [ ] Proxy espejo del de Signaturit (`esaw-proxy`, token por header como
  `apiToken` — eSAW **no** usa `Authorization: Bearer`). **Pendiente:** hoy
  `ESAW_PROXY_URL` en `esaw.js` es un placeholder.
- [ ] Convención de nombres de campo para **múltiples firmantes** en un mismo
  PDF (ej. `sig_1`, `sig_2`) — con 1 firmante ya funciona; con varios falta.
- Docs de integración eSAW de referencia en `docs/esaw/`.
- Debe convivir con Signaturit detrás de la misma interfaz. ✓

### Capa de IA (opcional, al FINAL) — Marcos
- Proxy a la API de Anthropic — **la API key es del SERVIDOR, no del usuario.**
- No llamar a Anthropic desde el browser (CORS + expondría la key).
- Claude devuelve **solo JSON**; parsear siempre con try-catch.
- Usos: extraer colores del brandbook (PDF), sugerir dónde van las anclas.
- **El modo manual es el camino base.** Si la IA no llega, la demo se sostiene.

---

## 7. Reglas de arquitectura NO NEGOCIABLES

1. **Cero persistencia.** No se guarda NADA: ni tokens, ni documentos, ni datos,
   ni PDFs. Todo en memoria de sesión, se descarta. Nos mantiene fuera del
   alcance de datos personales (RGPD). Es la decisión más importante.
2. **El token del usuario viaja por header (HTTPS) en cada request, se usa y se
   descarta.** Nunca a disco, DB, logs ni localStorage.
3. **La API key de Claude es nuestra** (secreto del servidor); el token de firma
   es del usuario. Dos cosas distintas, no se mezclan.
4. **La IA siempre devuelve solo JSON.** Parsear con try-catch.
5. **Sin IA todo funciona igual**, en modo manual. La IA es acelerador, no
   requisito.

---

## 8. Stack (el del bulksend — NO cambiar)

- **Frontend:** HTML + CSS + JS puro. Sin React, sin frameworks, sin bundler.
- **Backend:** Supabase Edge Functions (Deno), solo para los proxies.
- **Librerías:** mammoth (docx), html2pdf (PDF), SheetJS/xlsx.
- **Deploy:** Cloudflare Pages (estático).

---

## 9. Convenciones

- **UI en inglés**; comentarios internos en **español rioplatense**; archivos/variables en **inglés**.
- Módulos separados y autocontenidos.
- Commits chicos y descriptivos.
- **Confirmar el plan con el dueño antes de escribir código.**
- No mencionar "Supabase" en ningún texto visible al usuario.
