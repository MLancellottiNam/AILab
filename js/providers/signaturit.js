/* ============================================
   Smart Dispatch — Adaptador Signaturit (VACÍO por ahora)
   --------------------------------------------
   Cada producto de firma (Signaturit, eSAW) implementa la MISMA interfaz:

       send(dispatchDoc, token, options) → Promise<{ id }>

   Recibe el CONTRATO INTERNO (DispatchDoc), neutral respecto del producto,
   y lo traduce al payload real de la API. El resto de la app no sabe a qué
   producto le está hablando.

   ⚠ Pendiente: confirmar en la doc de Signaturit el formato exacto del
   "word anchor" (cómo se declara el widget de firma anclado a un texto).
   Cuando esté, se completa SOLO la traducción de abajo. Nada más cambia.
   ============================================ */

/**
 * Contrato interno, agnóstico del producto de firma.
 * Lo produce el PDF Builder (js/builder.js → sdbBuildDispatchDoc).
 *
 * @typedef {Object} DispatchAnchor
 * @property {string} id        Identificador estable del ancla (p. ej. "firma_1").
 * @property {string} text      Texto exacto embebido (invisible) en el PDF; el
 *                              producto de firma lo busca para posicionar el widget.
 * @property {'signature'|'date'|'text'} type  Tipo de campo.
 * @property {boolean} required Si el campo es obligatorio.
 *
 * @typedef {Object} DispatchRecipient
 * @property {string} name
 * @property {string} email
 *
 * @typedef {Object} DispatchDoc
 * @property {Blob} pdf                    PDF generado (en memoria, no persiste).
 * @property {DispatchRecipient} recipient Destinatario de este documento.
 * @property {DispatchAnchor[]} anchors    Anclas de firma/campos del documento.
 */

/**
 * Traduce un DispatchDoc al envío real de Signaturit y lo manda por el proxy.
 *
 * @param {DispatchDoc} dispatchDoc
 * @param {string} token                 Token del usuario (viaja por header, se descarta).
 * @param {Object} [options]             Ajustes del envío (env, subject, body, branding_id…).
 * @returns {Promise<{id: string}>}
 */
async function sendWithSignaturit(dispatchDoc, token, options = {}) {
  // TODO(puente): traducir DispatchDoc → FormData de Signaturit:
  //   - recipients[0][name] / recipients[0][email]  ← dispatchDoc.recipient
  //   - files[0]                                     ← dispatchDoc.pdf
  //   - anclas de firma (dispatchDoc.anchors)        ← FORMATO A CONFIRMAR
  //   - type=advanced, subject, body, branding_id    ← options
  //   Reusar PROXY_URL y el patrón de headers de app.js (x-signaturit-token,
  //   x-api-url). NO reescribir el envío existente: apoyarse en él.
  throw new Error('Adaptador Signaturit todavía no implementado (pendiente formato de ancla).');
}

// Exponer en el ámbito global (sin bundler). La app elige el adaptador por producto.
window.signaturitProvider = { send: sendWithSignaturit };
