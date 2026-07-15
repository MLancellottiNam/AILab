/* ============================================
   Smart Dispatch — Puente builder → envío (Signaturit)
   --------------------------------------------
   Toma los PDFs generados por el builder (builderState.dispatchDocs) y los
   inyecta en el flujo de envío masivo HEREDADO del bulksend (app.js), sin
   reescribirlo: registra los Blobs en `pdfFiles`, arma `matchedData` (una fila
   por destinatario, con su PDF + firmante), y muestra la UI de envío en el paso
   de Configuración para que el usuario pegue su token y dispare `startBulkSend`.

   Proveedor: SIGNATURIT (camino soldado de punta a punta). Cada PDF se manda
   como `files[0]` y el/los firmante(s) como `recipients[i]`. Las anclas de
   firma viajan DENTRO del PDF (texto invisible) y quedan cargadas en cada item
   (`item.anchors`) para cuando confirmemos el formato exacto del "word anchor"
   de Signaturit (ver js/providers/signaturit.js). eSAW necesita campos AcroForm
   reales → pendiente (post-proceso pdf-lib), es el segundo paso del puente.

   Cero persistencia: todo en memoria; los Blobs se descartan con la sesión.
   ============================================ */

// Estado del puente. `active` lo lee app.js (updatePreview) para NO reconstruir
// matchedData desde el mapeo de columnas cuando el builder ya lo armó.
window.__sdBridge = { active: false };

function sdbCanBridge() {
  // builderState es binding léxico global (no window.*), igual que ACC.
  return typeof builderState !== 'undefined' && builderState.dispatchDocs && builderState.dispatchDocs.length > 0;
}

/* Tipo de operación de envío a partir del onboarding (ACC.sendType).
   SMS no usa builder; si viniera algo raro, caemos a firma simple. */
function sdbBridgeOperation() {
  const t = (typeof ACC !== 'undefined' && ACC.sendType) ? ACC.sendType : null;
  return (t === 'advanced' || t === 'simple' || t === 'email') ? t : 'simple';
}

function sdbBridgeToSend() {
  if (!sdbCanBridge()) {
    if (typeof sdbNote === 'function') sdbNote('Generate the PDFs first, then send them for signature.', 'warn');
    return;
  }

  const docs = builderState.dispatchDocs;

  // 1) Registrar los PDFs generados en el flujo de envío (pdfFiles) y armar
  //    matchedData (una fila por destinatario). Nombre de archivo único y
  //    estable por índice para evitar colisiones.
  pdfFiles = {};
  const md = docs.map((doc, i) => {
    const fileName = `document_${i + 1}.pdf`;
    pdfFiles[fileName.toLowerCase()] = { file: doc.pdf, size: doc.pdf.size };
    const email = (doc.recipient && doc.recipient.email) || '';
    const name = (doc.recipient && doc.recipient.name) || (email ? email.split('@')[0] : '');
    return {
      rawRow: (typeof dataRows !== 'undefined' && dataRows[i]) || {},
      signers: [{ email, name }],
      email, name,
      fileName,
      fileMatch: true,
      fileSize: doc.pdf.size,
      anchors: doc.anchors || []   // viajan en el PDF; disponibles para el ancla real
    };
  });
  matchedData = md;

  // 2) Config del envío: proveedor Signaturit, tipo de operación, sin plantilla.
  operationType = sdbBridgeOperation();
  useTemplate = false;
  const tplToggle = document.getElementById('toggle-template');
  if (tplToggle) { tplToggle.checked = false; tplToggle.dispatchEvent(new Event('change')); }
  const provSel = document.getElementById('cfg-provider');
  if (provSel) provSel.value = 'signaturit';

  // Aviso si el onboarding había asignado eSAW (su envío de doc está pendiente).
  const esawWanted = (typeof ACC !== 'undefined' && (ACC.product === 'esaw' || ACC.provider === 'esaw'));

  // 3) Mostrar la UI de envío heredada y ocultar el onboarding/builder.
  window.__sdBridge.active = true;
  document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { el.style.display = 'none'; });
  const overlay = document.getElementById('launcherOverlay');
  if (overlay) overlay.classList.add('hidden');
  const wrap = document.getElementById('appWrapper');
  if (wrap) wrap.classList.add('active');
  const badge = document.getElementById('badgeOperation');
  if (badge && typeof OPERATION_LABELS !== 'undefined') badge.textContent = OPERATION_LABELS[operationType] || '';
  if (typeof setupBulkMode === 'function') setupBulkMode();

  // Prefill útil: asunto/cuerpo desde el título del documento (editables).
  const title = (document.getElementById('sdbDocTitle') && document.getElementById('sdbDocTitle').value) || 'Document';
  const subjToggle = document.getElementById('toggle-subject'), subjInput = document.getElementById('cfg-subject');
  if (subjToggle && subjInput && !subjInput.value.trim()) { subjToggle.checked = true; subjInput.value = title; subjToggle.dispatchEvent(new Event('change')); }

  // 4) Ir al paso de Configuración (el usuario pega su token y envía).
  if (typeof goToStep === 'function') goToStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (esawWanted) {
    alert('Your onboarding selected eSignAnywhere (eSAW). Document generation for eSAW is still being wired up (real AcroForm signature fields), so this batch will be sent through Signaturit. Enter your token to continue.');
  }
}

/* Camino "ya tengo mi PDF": el usuario NO usa el builder. Abrimos el flujo
   NATIVO del bulksend (Config → Archivos → Mapeo → Envío) para que suba su(s)
   PDF(s) + lista de destinatarios y los mande a firmar. Sin puente: el mapeo y
   la preview nativos hacen el matching (por eso __sdBridge.active = false). */
function sdbEnterOwnPdf() {
  window.__sdBridge.active = false;

  // Estado de envío limpio (el usuario carga lo suyo desde cero).
  pdfFiles = {}; matchedData = []; sendLog = [];
  dataRows = []; dataHeaders = [];
  useTemplate = false;
  const tplToggle = document.getElementById('toggle-template');
  if (tplToggle) tplToggle.checked = false;

  operationType = sdbBridgeOperation();
  const provSel = document.getElementById('cfg-provider');
  if (provSel) provSel.value = (typeof ACC !== 'undefined' && (ACC.product === 'esaw' || ACC.provider === 'esaw')) ? 'esaw' : 'signaturit';

  document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { el.style.display = 'none'; });
  const overlay = document.getElementById('launcherOverlay');
  if (overlay) overlay.classList.add('hidden');
  const wrap = document.getElementById('appWrapper');
  if (wrap) wrap.classList.add('active');
  const badge = document.getElementById('badgeOperation');
  if (badge && typeof OPERATION_LABELS !== 'undefined') badge.textContent = OPERATION_LABELS[operationType] || '';
  if (typeof setupBulkMode === 'function') setupBulkMode();
  if (typeof goToStep === 'function') goToStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// Alias usado por la pantalla de elección (s-docsource).
window.sdEnterOwnPdf = sdbEnterOwnPdf;

// Salir del envío y volver al builder (por si el usuario quiere retocar).
function sdbBridgeBackToBuilder() {
  window.__sdBridge.active = false;
  const wrap = document.getElementById('appWrapper');
  if (wrap) wrap.classList.remove('active');
  document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { el.style.display = ''; });
  if (typeof sdGo === 'function') sdGo('s-builder');
}
