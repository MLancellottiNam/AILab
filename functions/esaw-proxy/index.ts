// ========================================
// esaw-proxy — Supabase Edge Function (Deno)
// ----------------------------------------
// Espejo del signaturit-proxy, pero para eSignAnyWhere (eSAW).
//
// Por qué existe: el browser NO puede llamar a la API de eSAW directamente
// (probado 2026-07-15 → el preflight OPTIONS devuelve 405, no hay cabeceras
// CORS, la request real falla con net::ERR_FAILED). Esta función corre en el
// servidor (sin CORS), reenvía la request y le agrega las cabeceras CORS a la
// respuesta para que el browser la acepte.
//
// Diferencia clave con el proxy de Signaturit: eSAW autentica con el header
// `apiToken: <token>`, NO con `Authorization: Bearer`. Es lo único que cambia.
//
// Contrato con el front (js/providers/esaw.js):
//   fetch(ESAW_PROXY_URL, {
//     method,                                  // POST (upload/prepare/envelope) o GET
//     headers: {
//       'x-esaw-token': <token del usuario>,   // se reenvía como apiToken
//       'x-api-url':   <endpoint real de eSAW>, // p.ej. .../api/v6/file/upload
//       'content-type': ...                      // lo pone el browser (JSON o multipart)
//     },
//     body                                     // JSON o FormData, se pasa tal cual
//   })
//
// Regla de arquitectura del proyecto: cero persistencia. Este proxy NO guarda
// el token ni el body en ningún lado — lo usa en el reenvío y lo descarta.
// ========================================

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-esaw-token, x-api-url, x-method-override",
  "Access-Control-Max-Age": "86400",
};

// Solo permitimos reenviar a hosts de eSAW: evita que la función se use como
// relay abierto hacia cualquier URL.
const ALLOWED_HOSTS = ["demo.esignanywhere.net", "esignanywhere.net"];

function isAllowed(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const apiUrl = req.headers.get("x-api-url");
  const token = req.headers.get("x-esaw-token");

  if (!apiUrl) return json(400, { error: "Missing x-api-url header" });
  if (!isAllowed(apiUrl)) return json(403, { error: "x-api-url host not allowed" });

  // Permite forzar el método vía override (mismo patrón que el proxy de
  // Signaturit para GET); si no, usa el método real de la request.
  const method = (req.headers.get("x-method-override") || req.method).toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  // Cabeceras hacia eSAW: token como apiToken + content-type original (para
  // multipart, el content-type trae el boundary y hay que conservarlo).
  const outHeaders = new Headers();
  if (token) outHeaders.set("apiToken", token);
  const ct = req.headers.get("content-type");
  if (ct) outHeaders.set("content-type", ct);

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl, {
      method,
      headers: outHeaders,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });
  } catch (e) {
    return json(502, { error: "Upstream fetch failed", detail: String(e) });
  }

  // Respuesta al browser con CORS. Conservamos content-type y, si viene, el
  // content-disposition (para descargas de documentos firmados vía /file/{id}).
  const respHeaders = new Headers(CORS);
  const upCt = upstream.headers.get("content-type");
  if (upCt) respHeaders.set("content-type", upCt);
  const cd = upstream.headers.get("content-disposition");
  if (cd) respHeaders.set("content-disposition", cd);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: respHeaders,
  });
});
