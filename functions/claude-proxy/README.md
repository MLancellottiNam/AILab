# claude-proxy — despliegue (para Marcos)

Edge Function de Supabase (Deno) que es la **capa de IA** del onboarding: recibe
el texto libre que escribe el cliente en el chat y devuelve su intención
estructurada en JSON (tipo de firma, volumen, frecuencia, IA, equipo). La usa
`js/ai.js` (`SDIntent.classifyIntent`).

## Regla clave: la API key es del SERVIDOR

A diferencia del token de firma (que es del usuario y viaja por header), la
**API key de Anthropic es nuestra** y vive solo en el servidor, como secreto de
la función. Nunca en el browser.

## Requisitos

- Supabase CLI, acceso al **mismo proyecto** que los otros proxies
  (ref `plejrqzzxnypnxxnamxj`).
- Una API key de Anthropic (https://console.anthropic.com/).

## Desplegar

```bash
# 1. Login + link (una sola vez)
supabase login
supabase link --project-ref plejrqzzxnypnxxnamxj

# 2. Copiar esta carpeta a supabase/functions/claude-proxy/

# 3. Cargar la API key como secreto de la función (NO como env del browser)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 4. Desplegar — ¡--no-verify-jwt! (el browser llama sin JWT de Supabase)
supabase functions deploy claude-proxy --no-verify-jwt
```

`--no-verify-jwt` es obligatorio por lo mismo que el `esaw-proxy`: el browser
llama a la función sin token de auth de Supabase.

## Nombre y URL (no cambiar)

Slug **`claude-proxy`** → URL:

```
https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/claude-proxy
```

...que es el `CLAUDE_PROXY_URL` ya hardcodeado en `js/ai.js`. Con otro nombre o
proyecto, hay que actualizar esa constante.

## Modelo

Usa `claude-opus-4-8`. Para este caso interactivo (clasificar cada mensaje del
chat en tiempo real) quizás convenga `claude-haiku-4-5` por latencia y costo —
es cambiar una línea en `index.ts`. Decisión de producto.

## Contrato

Request del browser → proxy:
```json
{ "task": "onboarding_intent", "text": "necesito enviar 300 contratos para firma", "context": {...} }
```
Respuesta:
```json
{ "sigType": "advanced", "vol": "mid", "freq": null, "ia": null, "team": null,
  "reply": "Perfecto, suena a firma avanzada para tus contratos.", "clarify": null }
```
En error (proxy caído, refusal, etc.) el front cae al fallback guiado/heurístico.

## Probar rápido (curl)

```bash
curl -s -X POST "https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/claude-proxy" \
  -H "content-type: application/json" \
  -d '{"task":"onboarding_intent","text":"quiero mandar 500 contratos legales para firmar cada mes"}'
```
