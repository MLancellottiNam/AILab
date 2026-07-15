// ========================================
// claude-proxy — Supabase Edge Function (Deno)
// ----------------------------------------
// Capa de IA del onboarding. Recibe el TEXTO LIBRE del cliente y devuelve su
// intención estructurada (tipo de firma, volumen, frecuencia, IA, equipo).
//
// Regla de arquitectura (CLAUDE.md §7): la API key de Claude es NUESTRA
// (secreto del servidor) — vive acá como env var ANTHROPIC_API_KEY, NUNCA en
// el browser. El token de firma del usuario es otra cosa y no se mezcla.
//
// Contrato con el front (js/ai.js → SDIntent.classifyIntent):
//   POST { task: "onboarding_intent", text: "<lo que escribió el cliente>",
//          context: { step, answers } }
//   → 200 { sigType?, freq?, vol?, ia?, team?, reply?, clarify? }  (solo JSON)
//   En error → { error } y el front cae al fallback guiado/heurístico.
//
// Se usa structured outputs (output_config.format) para garantizar que Claude
// devuelva SOLO el JSON del schema (regla CLAUDE.md §7.4). Cero persistencia:
// el texto del cliente se usa en la llamada y se descarta.
// ========================================

import Anthropic from "npm:@anthropic-ai/sdk";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

// Explicación de cada tipo de firma para que el modelo clasifique bien.
const SYSTEM = `Sos el clasificador de intención del onboarding de Smart Dispatch (una herramienta que genera lotes de PDFs para firmar y los envía masivamente).

A partir del mensaje libre del cliente, extraé lo que se pueda inferir con seguridad. NO inventes: si un campo no está claro en el texto, devolvelo como null.

Campos:
- sigType: tipo de firma que necesita.
  - "advanced" = firma avanzada (biométrica o certificado digital; contratos, acuerdos legales, alta garantía).
  - "simple" = firma simple de un clic (aprobaciones internas, bajo riesgo).
  - "email" = email certificado (prueba de entrega, sin firma).
  - "sms" = SMS certificado (aviso corto a un teléfono).
- freq: "monthly" (recurrente/mensual), "oneshot" (una sola vez), "sometimes" (de vez en cuando).
- vol: "low" (hasta ~100), "mid" (~100 a 1000), "high" (más de 1000).
- ia: "yes" si quiere que la IA arme los documentos, "no" si prefiere manual.
- team: "1" (solo él), "few" (2 a 5), "many" (más de 5).
- reply: una frase breve y cálida, EN EL MISMO IDIOMA en que escribió el cliente (si escribió en español, respondé en español), que confirme y recomiende el tipo de firma que mejor le encaja y por qué. NUNCA menciones el proveedor: no nombres "Signaturit" ni "eSAW"/"eSignAnywhere" — para el cliente es transparente. Sin markdown.
- clarify: si NO entendiste nada útil, una pregunta breve (en el idioma del cliente) para guiarlo; si entendiste algo, null.

FUERA DE ÁMBITO: tu único trabajo es entender la necesidad del cliente para preparar su envío de documentos para firma. Si el mensaje NO tiene que ver con eso (preguntas de cultura general, deportes, noticias, charla, o cualquier tema ajeno), NO completes ni inventes campos: devolvé sigType, freq, vol, ia, team y reply TODOS en null, y en clarify una frase breve (en el idioma del cliente) aclarando amablemente que solo podés ayudar a definir su envío de documentos para firma y reconduciendo la conversación.`;

// Schema de salida: todos los campos requeridos y nullable (structured outputs
// exige additionalProperties:false + required con todas las claves). Los enums
// nullable van como anyOf(enum string | null) — structured outputs NO acepta
// `type: ["string","null"]` junto con `enum` (validado contra la API, 2026-07).
const nullableEnum = (values: string[]) => ({ anyOf: [{ type: "string", enum: values }, { type: "null" }] });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sigType: nullableEnum(["advanced", "simple", "email", "sms"]),
    freq: nullableEnum(["monthly", "oneshot", "sometimes"]),
    vol: nullableEnum(["low", "mid", "high"]),
    ia: nullableEnum(["yes", "no"]),
    team: nullableEnum(["1", "few", "many"]),
    reply: { type: ["string", "null"] },
    clarify: { type: ["string", "null"] },
  },
  required: ["sigType", "freq", "vol", "ia", "team", "reply", "clarify"],
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY not configured" });

  let body: { text?: string; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const text = (body.text || "").toString().trim();
  if (!text) return json(400, { error: "Missing 'text'" });

  const client = new Anthropic({ apiKey });

  try {
    // Modelo: claude-opus-4-8 (flagship). Para este uso interactivo y de baja
    // latencia se puede cambiar a "claude-haiku-4-5" (más rápido/barato) si hace
    // falta — es una decisión de producto, no del código.
    const resp = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "disabled" }, // clasificación simple; structured outputs fuerza el JSON
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Contexto: ${JSON.stringify(body.context ?? {})}\n\nMensaje del cliente:\n${text}`,
      }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    if (resp.stop_reason === "refusal") return json(200, { error: "refusal" });

    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return json(200, { error: "no_output" });

    // structured outputs garantiza JSON válido según SCHEMA; parseamos igual con try-catch.
    const intent = JSON.parse(block.text);
    return json(200, intent);
  } catch (e) {
    return json(502, { error: "Upstream error", detail: String(e) });
  }
});
