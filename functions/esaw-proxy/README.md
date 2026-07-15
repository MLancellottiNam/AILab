# esaw-proxy — despliegue (para Marcos)

Edge Function de Supabase (Deno) que hace de proxy entre el browser y la API de
eSignAnyWhere (eSAW). Espejo del `signaturit-proxy`, con una única diferencia:
reenvía el token como header `apiToken` en vez de `Authorization: Bearer`.

## Por qué hace falta

El browser no puede llamar a eSAW directo (CORS: el preflight `OPTIONS` a
`demo.esignanywhere.net` devuelve 405, no hay cabeceras CORS). Sin este proxy,
el envío por eSAW desde `js/providers/esaw.js` falla con `net::ERR_FAILED`.

## Requisitos

- Supabase CLI (`npm i -g supabase` o `brew install supabase/tap/supabase`).
- Acceso al **mismo proyecto** donde vive el `signaturit-proxy`
  (ref `plejrqzzxnypnxxnamxj`).

## Desplegar

```bash
# 1. Login y linkear el proyecto (una sola vez)
supabase login
supabase link --project-ref plejrqzzxnypnxxnamxj

# 2. Copiar esta carpeta a supabase/functions/esaw-proxy/ del proyecto
#    (o desplegar desde donde tengas la estructura supabase/)

# 3. Desplegar — ¡IMPORTANTE el flag --no-verify-jwt!
supabase functions deploy esaw-proxy --no-verify-jwt
```

### ⚠️ `--no-verify-jwt` es obligatorio

El browser llama al proxy **sin** token de auth de Supabase (solo manda el token
de eSAW en `x-esaw-token`). Por defecto Supabase exige un JWT y rechazaría la
llamada con 401. Con `--no-verify-jwt` la función queda pública, que es lo que
necesitamos (igual que el signaturit-proxy).

## Nombre y URL (no cambiar)

El slug **tiene que ser `esaw-proxy`**. Así la URL queda:

```
https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/esaw-proxy
```

...que es exactamente la constante `ESAW_PROXY_URL` que ya está hardcodeada en
`js/providers/esaw.js`. Si lo desplegás con otro nombre o en otro proyecto, hay
que actualizar esa constante en el front.

## Contrato (lo que espera el front)

Request del browser → proxy:
- `x-esaw-token`: token del usuario (se reenvía como `apiToken`).
- `x-api-url`: endpoint real de eSAW (p.ej. `.../api/v6/file/upload`).
- `content-type` + `body`: se pasan tal cual (sirve para JSON y multipart).

El proxy solo reenvía a hosts `*.esignanywhere.net` (allowlist interna, para no
quedar como relay abierto). Cero persistencia: no guarda token ni body.

## Probar rápido (curl, sin browser)

```bash
curl -i -X POST "https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/esaw-proxy" \
  -H "x-esaw-token: <TOKEN_DEMO>" \
  -H "x-api-url: https://demo.esignanywhere.net/api/v6/authorization/whoami" \
  -H "x-method-override: GET"
# Debería devolver el JSON de whoami con status 200.
```
