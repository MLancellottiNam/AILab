// ========================================
// ai-proxy — Supabase Edge Function (Deno)
// ----------------------------------------
// Gateway de IA de Smart Dispatch. Espejo estructural del signaturit/esaw-proxy,
// pero con una diferencia CLAVE de arquitectura:
//
//   La API key de Claude es NUESTRA (secreto del servidor). No viaja por header
//   del usuario como el token de firma. El front NO manda ninguna credencial:
//   solo { task, payload }. La key se lee de Deno.env y nunca sale de acá
//   (jamás al front, al repo ni a logs).
//
// Contrato con el front (js/ai.js → aiCall):
//   fetch(AI_PROXY_URL, {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({ task, payload })
//   })
//   → 200 { ok: true,  data: {...} }
//   → 4xx/5xx { ok: false, error: '<mensaje corto para el usuario>' }
//
// Tareas (se agregan de a una):
//   - write-doc      → redacta la FORMA de un documento con {{columnas}} + firma
//   - extract-brand  → (pendiente) brandbook PDF → {primary, secondary, font}
//   - detect-fields  → (pendiente) texto pegado → campos {label, name, type}
//
// Regla de arquitectura del proyecto: cero persistencia. Esta función NO guarda
// nada. El rate-limit por IP vive solo en memoria (se pierde al reciclar la
// función, que es exactamente lo que queremos).
//
// Deploy: supabase functions deploy ai-proxy --no-verify-jwt
//         supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ========================================

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Rate-limit en memoria: por IP, ventana deslizante de 1h, ~40 llamadas.
// La key es nuestra y el deploy queda abierto durante el evento; esto evita
// que alguien vacíe la cuenta probando. No persiste (Map en memoria).
const RATE_MAX = 40;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

// ---- Prompts (viven en el server, nunca en el front) ----

// write-doc: redacta FORMA, no contenido jurídico. Usa SOLO las columnas dadas
// como tokens literales {{Columna}} (el builder reemplaza row[Columna] tal cual),
// y una única ancla de firma {{firma_destinatario}}.
function writeDocPrompt(p: {
  idea: string;
  tone: string;
  lang: string;
  length: string;
  columns: string[];
}): string {
  const cols = (p.columns || []).filter(Boolean);
  const tokens = cols.map((c) => `{{${c}}}`).join(", ") || "(none)";
  return `You are a document-form assistant for a bulk-signing tool. You draft the FORM of a document, never legal content.

HARD RULES:
- Return ONLY this JSON, nothing else: {"text": "<the document as plain text>"}
- Insert data placeholders using EXCLUSIVELY these exact tokens (never invent, rename or reformat them): ${tokens}
- Include exactly ONE signature anchor, written literally as {{firma_destinatario}}, placed where the recipient signs (usually the end).
- Do NOT give legal advice. Do NOT add, interpret or suggest clauses, obligations or legal terms. Draft only what the user asks for, as wording/form.
- Write in this language: ${p.lang}. Tone: ${p.tone}. Length: ${p.length} (short = a few lines, medium = a couple of short paragraphs, detailed = longer).

THE USER'S IDEA:
"""
${p.idea}
"""

INSTRUCTIONS:
- If the idea is long (more than ~40 words), treat it as the body: KEEP the user's wording, do not rewrite it. Only weave in the {{column}} tokens where they fit naturally and append the {{firma_destinatario}} anchor.
- If the idea is short, write the full document from it, honoring the requested tone, language and length, weaving in the given column tokens and the signature anchor.
- A column token may be omitted if it has no natural place. NEVER use a token that is not in the list above.`;
}

// ---- Llamada a Anthropic + parseo defensivo ----
async function callClaude(
  key: string,
  system: string,
  userPrompt: string,
  maxTokens: number,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (_e) {
    return { ok: false, status: 502, error: "Could not reach the AI service" };
  }

  if (!res.ok) {
    // No filtramos el cuerpo del error de Anthropic al usuario (podría traer detalles).
    return { ok: false, status: 502, error: "The AI service returned an error" };
  }

  // Parseo SIEMPRE con try-catch. Nunca asumir que el JSON viene limpio.
  try {
    const body = await res.json();
    const txt = (body.content || []).map((b: { text?: string }) => b.text || "").join("");
    const cleaned = txt.replace(/```json|```/g, "").trim();
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (_e) {
    return { ok: false, status: 502, error: "The AI returned invalid JSON" };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json(503, { ok: false, error: "AI is not configured" });

  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  if (rateLimited(ip)) return json(429, { ok: false, error: "Too many AI requests, try again later" });

  let payload: { task?: string; payload?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch (_e) {
    return json(400, { ok: false, error: "Invalid request body" });
  }

  const task = payload?.task;
  const p = payload?.payload || {};

  switch (task) {
    case "write-doc": {
      const prompt = writeDocPrompt({
        idea: String(p.idea || ""),
        tone: String(p.tone || "neutral"),
        lang: String(p.lang || "en"),
        length: String(p.length || "medium"),
        columns: Array.isArray(p.columns) ? (p.columns as string[]) : [],
      });
      const out = await callClaude(
        key,
        "You output ONLY valid JSON. No markdown, no code fences, no commentary.",
        prompt,
        2000,
      );
      if (!out.ok) return json(out.status, { ok: false, error: out.error });
      const data = out.data as { text?: unknown };
      if (!data || typeof data.text !== "string" || !data.text.trim()) {
        return json(502, { ok: false, error: "The AI response was empty" });
      }
      return json(200, { ok: true, data: { text: data.text } });
    }

    // TODO(IA): extract-brand, detect-fields (siguiente paso, tras validar write-doc).

    default:
      return json(400, { ok: false, error: "Unknown task" });
  }
});
