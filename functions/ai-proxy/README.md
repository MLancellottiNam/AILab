# ai-proxy

Edge Function (Supabase, Deno) que hace de gateway de IA de Smart Dispatch.
Espejo estructural del `signaturit-proxy`/`esaw-proxy`, con una diferencia clave:

**La API key de Claude es del SERVIDOR, no del usuario.** El front no manda
ninguna credencial; solo `{ task, payload }`. La key se lee de
`Deno.env.get("ANTHROPIC_API_KEY")` y nunca sale de la función (no al front, no
al repo, no a logs).

## Contrato

```
POST  ai-proxy
body: { "task": "write-doc" | "extract-brand" | "detect-fields",
        "payload": { ... } }
 → 200 { "ok": true,  "data": { ... } }
 → 4xx/5xx { "ok": false, "error": "<mensaje corto para el usuario>" }
```

Tareas implementadas:

- **write-doc** — `payload: { idea, tone, lang, length, columns[], notes? }` →
  `{ text }`. Redacta la FORMA del documento con tokens `{{Columna}}` (literales,
  solo los dados) y una única ancla `{{firma_destinatario}}`. No da contenido
  jurídico. `notes` (opcional) = mini-prompt del usuario con instrucciones de
  diseño/contenido; se respetan salvo que choquen con las HARD RULES.
- **extract-brand** — `payload: { pdfBase64 }` (brandbook en base64) →
  `{ primary, secondary, font }`. Manda el PDF como bloque `document` a Claude.
  Colores validados como hex `#rrggbb` (el front cae a selección manual si falla).
- **detect-fields** — `payload: { text, columns[] }` →
  `{ fields: [{ raw, label, name, type }] }`. Nombra los huecos del texto pegado.
  Devuelve el `raw` EXACTO de cada hueco para que el front calcule la posición
  por string-match (sin confiar en offsets del modelo).

## Notas de arquitectura

- **Cero persistencia.** No guarda nada. El rate-limit (~40/h por IP) vive solo
  en memoria y se pierde al reciclar la función.
- Modelo: `claude-sonnet-5`. Parseo de la respuesta SIEMPRE con try-catch.

## Deploy

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-proxy --no-verify-jwt
```

La URL resultante ya coincide con `AI_PROXY_URL` en `js/ai.js`.
