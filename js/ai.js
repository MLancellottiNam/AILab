/* ============================================
   Smart Dispatch — Cliente de IA (front)
   --------------------------------------------
   Único punto de contacto del browser con la capa de IA. Habla con el proxy
   (Edge Function ai-proxy), NUNCA con Anthropic directo: la API key es del
   servidor (CORS + no exponer la key).

   Contrato: aiCall(task, payload) → Promise<data>
     - resuelve con `data` (el objeto ya parseado por el proxy) si {ok:true}
     - LANZA en cualquier fallo (no-ok, red, timeout, JSON inválido)

   REGLA DE ORO: quien llama decide el fallback. aiCall no conoce a composeDoc
   ni a scanFields; solo lanza y el builder cae al camino manual sin romper nada.
   ============================================ */

const AI_PROXY_URL = 'https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/ai-proxy';
const AI_TIMEOUT_MS = 20000;

async function aiCall(task, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, payload }),
      signal: ctrl.signal
    });
  } catch (e) {
    // Red caída o timeout (abort) → tratamos igual: la IA no está disponible.
    throw new Error('ai_unreachable');
  } finally {
    clearTimeout(timer);
  }

  let body;
  try {
    body = await resp.json();
  } catch (e) {
    throw new Error('ai_bad_response');
  }
  if (!resp.ok || !body || body.ok !== true) {
    throw new Error((body && body.error) || 'ai_error');
  }
  return body.data;
}
