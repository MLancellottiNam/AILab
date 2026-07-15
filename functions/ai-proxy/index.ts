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
// Tareas:
//   - write-doc      → redacta la FORMA de un documento con {{columnas}} + firma
//   - extract-brand  → brandbook PDF → {primary, secondary, font}
//   - detect-fields  → texto pegado → campos {raw, label, name, type}
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
  notes: string;
}): string {
  const cols = (p.columns || []).filter(Boolean);
  const tokens = cols.map((c) => `{{${c}}}`).join(", ") || "(none)";
  const notesBlock = p.notes && p.notes.trim()
    ? `\n\nEXTRA DESIGN/CONTENT NOTES FROM THE USER (honor them as long as they don't break the HARD RULES; never add legal advice):\n"""\n${p.notes.trim()}\n"""`
    : "";
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
- A column token may be omitted if it has no natural place. NEVER use a token that is not in the list above.${notesBlock}`;
}

// ---- Prompts de las otras tareas ----

// extract-brand: lee el brandbook (PDF) y saca identidad de marca. Best-effort:
// si algo no está claro, devuelve su mejor estimación (el front valida igual).
const EXTRACT_BRAND_PROMPT =
  `You extract the visual brand identity from this brand book PDF. Return ONLY this JSON:
{"primary":"#rrggbb","secondary":"#rrggbb","font":"<primary typeface family name>","footer":"<one-line document footer>"}
- primary = the main brand color; secondary = the main accent/secondary color.
- Colors MUST be 6-digit hex (e.g. #00B4B6). If a color is given in another format, convert it.
- font = the name of the primary typeface family (e.g. "Inter", "Georgia", "Helvetica"). Just the family name.
- footer = a short, professional one-line footer for the brand's documents, drawn from the brand book: e.g. the company legal name, website, and/or a confidentiality note. Plain text, under ~120 characters, no markdown. This is FORM/branding only — do NOT invent legal clauses or terms. If nothing suitable is in the brand book, use an empty string "".
- If a value is not explicit, give your best guess from the document. Never return anything but the JSON.`;

// detect-fields: nombra los huecos de un texto pegado. Devuelve el `raw` EXACTO
// de cada hueco para que el front calcule la posición sin confiar en offsets del
// modelo (robusto). Usa las columnas de datos como nombres cuando encajan.
function detectFieldsPrompt(text: string, columns: string[]): string {
  const cols = (columns || []).filter(Boolean);
  const colList = cols.length ? cols.join(", ") : "(no data columns provided)";
  return `You detect fillable blanks in a pasted document and name them. Return ONLY this JSON:
{"fields":[{"raw":"<exact characters of the blank>","label":"<human label>","name":"<slug>","type":"data"|"signature"}]}

RULES:
- List the fields in the ORDER they appear in the text.
- "raw" MUST be the exact run of characters that forms the blank as it appears in the text: the underscores (e.g. "________"), the bracketed text (e.g. "[coverage type]"), or the token (e.g. "{{name}}"). Copy it verbatim so it can be found by string match.
- "name" is a lowercase slug (a-z, 0-9, underscores). If a blank clearly corresponds to one of these data columns, reuse its exact name: ${colList}. Otherwise derive a short slug from the context.
- "type" is "signature" when the blank is where someone signs (words like firma/sign/signature nearby); otherwise "data".
- Do NOT invent blanks that are not in the text.

TEXT:
"""
${text}
"""`;
}

// ---- Llamada a Anthropic + parseo defensivo ----
// `content` es lo que va en messages[0].content: un string simple o un array de
// bloques (texto + document para PDFs).
async function callClaude(
  key: string,
  system: string,
  content: unknown,
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
        messages: [{ role: "user", content }],
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
        notes: String(p.notes || ""),
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

    case "extract-brand": {
      const pdfBase64 = typeof p.pdfBase64 === "string" ? p.pdfBase64 : "";
      if (!pdfBase64) return json(400, { ok: false, error: "Missing brand book" });
      const out = await callClaude(
        key,
        "You output ONLY valid JSON. No markdown, no code fences, no commentary.",
        [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: EXTRACT_BRAND_PROMPT },
        ],
        400,
      );
      if (!out.ok) return json(out.status, { ok: false, error: out.error });
      const d = out.data as { primary?: unknown; secondary?: unknown; font?: unknown; footer?: unknown };
      const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
      const primary = hex(d?.primary);
      if (!primary) return json(502, { ok: false, error: "Could not read the brand colors" });
      const footer = typeof d?.footer === "string" ? d.footer.trim().slice(0, 160) : "";
      return json(200, {
        ok: true,
        data: {
          primary,
          secondary: hex(d?.secondary) || primary,
          font: typeof d?.font === "string" && d.font.trim() ? d.font.trim() : "",
          footer,
        },
      });
    }

    case "detect-fields": {
      const text = typeof p.text === "string" ? p.text : "";
      if (!text.trim()) return json(400, { ok: false, error: "No text to analyze" });
      const columns = Array.isArray(p.columns) ? (p.columns as string[]) : [];
      const out = await callClaude(
        key,
        "You output ONLY valid JSON. No markdown, no code fences, no commentary.",
        detectFieldsPrompt(text, columns),
        1500,
      );
      if (!out.ok) return json(out.status, { ok: false, error: out.error });
      const d = out.data as { fields?: unknown };
      if (!Array.isArray(d?.fields)) return json(502, { ok: false, error: "The AI response was malformed" });
      // Saneamos: cada campo necesita un `raw` string; el resto con defaults.
      const fields = (d.fields as Record<string, unknown>[])
        .filter((f) => f && typeof f.raw === "string" && f.raw.length > 0)
        .map((f) => ({
          raw: f.raw as string,
          label: typeof f.label === "string" ? f.label : (f.raw as string),
          name: typeof f.name === "string" ? f.name : "",
          type: f.type === "signature" ? "signature" : "data",
        }));
      if (!fields.length) return json(502, { ok: false, error: "No fields detected" });
      return json(200, { ok: true, data: { fields } });
    }

    default:
      return json(400, { ok: false, error: "Unknown task" });
  }
});
