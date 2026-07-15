/* ========================================
   ESAW PROVIDER — adaptador eSignAnyWhere (API v6)
   ========================================
   Misma interfaz que el flujo de Signaturit en app.js: se envía UN envelope
   por destinatario/fila, secuencialmente, con delay entre envíos (bulk vía
   loop, NO vía /v6/envelopebulk/send — decisión explícita del equipo).

   CONFIRMADO CONTRA SANDBOX (demo.esignanywhere.net, 2026-07-15): eSAW NO
   posiciona firmas por texto/anclas como Signaturit. "SigStrings" son
   CAMPOS DE FORMULARIO PDF REALES (AcroForm widgets), no texto escaneado.
   Se probó:
   - Texto plano visible ("sig", "#sig#", "{sig}", "{{sig}}", "SIG",
     "signature", "sig1", "[sig]") en el contenido del PDF → 0 detecciones.
   - Un AcroForm widget /FT /Tx (campo de texto) llamado "sig" → detectado
     en UnassignedElements.TextBoxes, con Position/Size ya calculados desde
     el /Rect del campo.
   - Un AcroForm widget /FT /Sig (campo de firma real de PDF) → detectado
     en UnassignedElements.Signatures, con ElementId = nombre del campo,
     FieldDefinition.Position (PageNumber/X/Y) y Size ya listos.
   - envelope/send con ese elemento devuelto tal cual (agregando solo
     RecipientConfiguration) → EnvelopeId real, EnvelopeStatus: Active,
     viewerlink de firma funcional. Flujo end-to-end confirmado.

   IMPLICACIÓN PARA EL PDF BUILDER (Marcos): el builder tiene que insertar
   un campo de formulario AcroForm real de tipo /FT /Sig en el PDF, en la
   posición donde debe ir cada firma — NO alcanza con imprimir un ancla de
   texto invisible como se hace hoy para Signaturit. html2pdf (la lib
   elegida en CLAUDE.md) no genera AcroForm; hace falta post-procesar el
   PDF resultante con una lib que sí soporte crear form fields (ej.
   pdf-lib, que tiene API para agregar campos AcroForm a un PDF existente).

   Pendiente aún:
   - `ESAW_PROXY_URL` es un placeholder — falta crear la Edge Function
     esaw-proxy (espejo de signaturit-proxy) que traduzca `x-esaw-token`
     a header `apiToken` (eSAW no usa `Authorization: Bearer`).
   - Con un solo campo de firma por documento el emparejamiento con
     `recipients` es directo (recipients[0] ↔ el único elemento). Con
     múltiples firmantes en un mismo PDF, falta definir la convención de
     nombres de campo (ej. "sig_1", "sig_2") para saber qué ElementId le
     corresponde a cada firmante — no probado todavía.
   ======================================== */

(function (global) {
  // URL de la Edge Function esaw-proxy (mismo proyecto Supabase que el
  // signaturit-proxy). Funciona apenas Marcos la despliegue con el slug
  // `esaw-proxy` — ver functions/esaw-proxy/README.md (¡deploy con
  // --no-verify-jwt!). Si se despliega con otro nombre/proyecto, cambiar acá.
  const ESAW_PROXY_URL = 'https://plejrqzzxnypnxxnamxj.supabase.co/functions/v1/esaw-proxy';

  const ENVS = {
    sandbox: 'https://demo.esignanywhere.net/api/v6',
    production: 'https://esignanywhere.net/api/v6', // TODO: confirmar host real de producción de la organización
  };

  async function proxyFetch(env, path, token, init) {
    const apiUrl = ENVS[env] + path;
    const resp = await fetch(ESAW_PROXY_URL, {
      ...init,
      headers: { ...(init.headers || {}), 'x-esaw-token': token, 'x-api-url': apiUrl },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data.Message || data.message || data.error || JSON.stringify(data);
      throw new Error(msg);
    }
    return data;
  }

  // 1. Sube el PDF ya generado por el builder (con los campos AcroForm de
  // firma ya insertados). Un fichero por llamada.
  async function uploadFile(env, token, fileBlob, fileName) {
    const fd = new FormData();
    fd.append('file', fileBlob, fileName);
    const data = await proxyFetch(env, '/file/upload', token, { method: 'POST', body: fd });
    return data.FileId;
  }

  // 2. Extrae los campos AcroForm detectados en el documento (Signatures,
  // TextBoxes, etc.), ya con posición/tamaño calculados desde el PDF.
  // Body confirmado: { FileIds: [...] } (plural, array) — no { FileId }.
  async function prepareFile(env, token, fileId) {
    const data = await proxyFetch(env, '/file/prepare', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FileIds: [fileId] }),
    });
    return (data.UnassignedElements && data.UnassignedElements.Signatures) || [];
  }

  // Empareja los campos de firma detectados con los firmantes, en orden de
  // aparición (recipients[i] ↔ signatureFields[i]). Válido para 1 firmante
  // + 1 campo (caso confirmado). Con varios firmantes hace falta definir
  // convención de nombres de campo (ver nota al inicio del archivo).
  function assignSignaturesToRecipients(signatureFields, recipients) {
    return recipients.map((_, i) => {
      const field = signatureFields[i];
      if (!field) return null;
      return { ...field, Required: true };
    }).filter(Boolean);
  }

  // 3. Crea y envía el envelope con un firmante (o varios, en el mismo
  // SigningGroup = firma en paralelo, igual que hace hoy Signaturit con
  // múltiples `recipients[i]`).
  async function sendEnvelope(env, token, { fileId, fileName, recipients, signatures, subject, body }) {
    const documentNumber = 1;
    const activities = recipients.map((r, i) => ({
      Action: {
        Sign: {
          RecipientConfiguration: {
            ContactInformation: {
              Email: r.email,
              GivenName: r.name || r.email.split('@')[0],
              Surname: '',
              LanguageCode: 'ES',
            },
            NotificationChannel: 'Email',
          },
          SequenceMode: 'NoSequenceEnforced',
          Elements: { Signatures: signatures[i] ? [signatures[i]] : [] },
          SigningGroup: '1',
        },
      },
      VisibilityOptions: [{ DocumentNumber: documentNumber, IsHidden: false }],
    }));

    const payload = {
      Documents: [{ FileId: fileId, DocumentNumber: documentNumber, Name: fileName }],
      Name: fileName,
      Activities: activities,
      EmailConfiguration: { Subject: subject || 'Por favor firma el documento', Message: body || '' },
    };

    const data = await proxyFetch(env, '/envelope/send', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data.EnvelopeId;
  }

  // Interfaz común de providers (ver CLAUDE.md § 5):
  // send({ recipients, fileBlob, fileName, subject, body, env }, token)
  // → { id } — mismo shape de retorno que espera hoy el loop de
  // startBulkSend() en app.js para Signaturit (`data.id`).
  async function send({ recipients, fileBlob, fileName, subject, body, env = 'sandbox' }, token) {
    const fileId = await uploadFile(env, token, fileBlob, fileName);
    const signatureFields = await prepareFile(env, token, fileId);
    const signatures = assignSignaturesToRecipients(signatureFields, recipients);
    const envelopeId = await sendEnvelope(env, token, { fileId, fileName, recipients, signatures, subject, body });
    return { id: envelopeId };
  }

  global.ESAWProvider = { send, uploadFile, prepareFile, sendEnvelope };
})(window);
