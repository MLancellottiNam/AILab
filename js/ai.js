/* ============================================
   Smart Dispatch — Capa de IA del onboarding
   --------------------------------------------
   Interpreta el TEXTO LIBRE que escribe el cliente en el chat y devuelve su
   intención estructurada (tipo de firma, volumen, frecuencia, IA, equipo).

   - Primario: Claude vía `claude-proxy` (Edge Function con la API key del
     SERVIDOR — ver functions/claude-proxy/). Claude devuelve SOLO JSON.
   - Fallback: heurística local por palabras clave (sin IA) para que el chat
     igual pueda GUIAR al cliente si el proxy no está disponible. Regla del
     proyecto: la demo se sostiene sin IA.
   (UI en inglés; comentarios internos en español.)
   ============================================ */

(function (global) {
  // Mismo proyecto Supabase que los otros proxies. Funciona cuando Marcos
  // despliegue la función `claude-proxy` (ver functions/claude-proxy/README.md).
  const CLAUDE_PROXY_URL = 'https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/claude-proxy';

  // Valores válidos por campo (para no aceptar basura del modelo).
  const VALID = {
    sigType: ['advanced', 'simple', 'email', 'sms'],
    freq: ['monthly', 'oneshot', 'sometimes'],
    vol: ['low', 'mid', 'high'],
    ia: ['yes', 'no'],
    team: ['1', 'few', 'many']
  };

  function sanitize(intent) {
    if (!intent || typeof intent !== 'object') return null;
    const out = {};
    for (const k of Object.keys(VALID)) {
      if (intent[k] && VALID[k].includes(intent[k])) out[k] = intent[k];
    }
    if (typeof intent.reply === 'string') out.reply = intent.reply;
    if (typeof intent.clarify === 'string') out.clarify = intent.clarify;
    return out;
  }

  // Primario: manda el prompt del cliente al proxy de Claude, que responde con
  // el intent en JSON. Devuelve el intent saneado o null (proxy caído / no
  // entendió / error). El chat decide el fallback.
  async function classifyIntent(text, context) {
    try {
      const resp = await fetch(CLAUDE_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'onboarding_intent', text, context })
      });
      if (!resp.ok) return null;
      const data = await resp.json().catch(() => null);
      if (!data || data.error) return null;
      const clean = sanitize(data);
      return (clean && Object.keys(clean).length) ? { ...clean, source: 'ai' } : null;
    } catch {
      return null;
    }
  }

  // Fallback SIN IA: adivina campos por palabras clave (ES/EN). No pretende ser
  // exhaustivo — solo lo justo para que el chat pueda guiar. source:'local'.
  function localGuess(text) {
    const t = ' ' + text.toLowerCase() + ' ';
    const g = { source: 'local' };

    // Tipo de firma
    if (/qes|cualificad|qualified|notari|escritur|regulad|alta garant/.test(t)) g.sigType = 'advanced';
    else if (/contrat|acuerdo|agreement|avanzad|advanced|certificad\w* digital|biometr|legal/.test(t)) g.sigType = 'advanced';
    else if (/un clic|one[- ]?click|simple|r[aá]pid|interno|approval|aprobaci/.test(t)) g.sigType = 'simple';
    else if (/\bsms\b|texto|mensaje de texto|whatsapp|tel[eé]fono|phone/.test(t)) g.sigType = 'sms';
    else if (/email|correo|e-?mail|mail certificad/.test(t)) g.sigType = 'email';

    // Volumen (número explícito o palabras)
    const num = (t.match(/\b(\d{2,7})\b/) || [])[1];
    if (num) { const n = +num; g.vol = n > 1000 ? 'high' : (n >= 100 ? 'mid' : 'low'); }
    else if (/much[oa]s|miles|thousands|gran volumen|high volume|masiv/.test(t)) g.vol = 'high';
    else if (/pocos|few|algunos|small/.test(t)) g.vol = 'low';

    // Frecuencia
    if (/mensual|monthly|cada mes|todos los meses|regular|siempre/.test(t)) g.freq = 'monthly';
    else if (/una vez|one[- ]?off|\bonce\b|puntual|single|solo esta vez/.test(t)) g.freq = 'oneshot';
    else if (/a veces|de vez en cuando|sometimes|ocasional|now and then/.test(t)) g.freq = 'sometimes';

    // Equipo
    if (/solo yo|just me|myself|una persona|individual/.test(t)) g.team = '1';
    else if (/equipo|team|varios|colegas|compa[nñ]er/.test(t)) g.team = 'few';

    // ¿Mencionó IA?
    if (/\bia\b|\bai\b|autom[aá]tic|que lo haga|inteligencia artificial/.test(t)) g.ia = 'yes';
    else if (/manual|a mano|yo mismo/.test(t)) g.ia = 'no';

    const found = Object.keys(g).filter(k => k !== 'source').length;
    return found ? g : null;
  }

  global.SDIntent = { classifyIntent, localGuess };
})(window);
