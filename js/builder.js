/* ============================================
   Smart Dispatch — PDF Builder (modo manual)
   --------------------------------------------
   Núcleo nuevo: Word/TXT con {{variables}} → HTML → un PDF por fila.
   - mammoth.convertToHtml (conserva formato; NO reusa handleWordUpload
     del bulksend, que usa extractRawText para otra cosa).
   - Separa variables de datos vs anclas de firma (/firma|sign|signature/i).
   - Reusa el parseo de datos del bulksend (dataRows/dataHeaders globales).
   - Genera PDFs con html2pdf en el browser. Cero persistencia: todo en memoria.

   Al generar, cada documento produce un DispatchDoc: el CONTRATO INTERNO
   agnóstico del producto de firma (ver typedef en js/providers/signaturit.js).
   El puente builder→envío se suelda después contra ese contrato.
   ============================================ */

const builderState = {
  docHtml: '',        // HTML del docx (mammoth)
  dataVars: [],       // ['nombre', 'monto', ...]  → se reemplazan con datos
  signAnchors: [],    // ['firma_1', ...]           → anclas de firma
  previewIdx: 0,      // fila mostrada en la vista previa
  dispatchDocs: []    // DispatchDoc[] generados en la última corrida (en memoria)
};

/* ===== Helpers locales (no pisar los globales del bulksend) ===== */
const sdbEsc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sdbEscReg = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sdbRx = name => new RegExp(`\\{\\{\\s*${sdbEscReg(name)}\\s*\\}\\}`, 'g');
const sdb$ = id => document.getElementById(id);
const looksLikeSign = v => /firma|sign|signature/i.test(v);
function sdbPickColumn(row, rx) {
  const key = (typeof dataHeaders !== 'undefined' ? dataHeaders : []).find(h => rx.test(h));
  return key ? String(row[key] ?? '') : '';
}
const sdbSlug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

/* ========================================
   NAVEGACIÓN (entrada temporal de dev)
   Cuando el onboarding de Hernán esté listo, va a llamar a showBuilder().
   ======================================== */
function showBuilder() {
  document.getElementById('launcherOverlay')?.classList.add('hidden');
  document.getElementById('appWrapper')?.classList.remove('active');
  sdb$('s-builder').classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeBuilder() {
  sdb$('s-builder').classList.remove('on');
  document.getElementById('launcherOverlay')?.classList.remove('hidden');
}

/* ========================================
   1. DOCUMENTO BASE (docx → HTML)
   ======================================== */
async function sdbHandleDoc(files) {
  const f = files && files[0];
  if (!f) return;
  if (!f.name.toLowerCase().endsWith('.docx')) { alert('Por ahora solo .docx'); return; }

  const label = sdb$('sdbDropDocLabel');
  label.innerHTML = 'Procesando…';
  try {
    const arrayBuffer = await f.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer });
    builderState.docHtml = res.value;

    const all = [...new Set([...builderState.docHtml.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m => m[1].trim()))];
    builderState.signAnchors = all.filter(looksLikeSign);
    builderState.dataVars = all.filter(v => !looksLikeSign(v));

    sdb$('sdbDropDoc').classList.add('ok');
    label.innerHTML = `✓ <b>${sdbEsc(f.name)}</b><br><span class="sdb-sub">${all.length} variable(s) detectada(s)</span>`;
    sdbRenderVarChips();
    sdbRenderPreview();
    sdbCheckReady();
  } catch (err) {
    sdb$('sdbDropDoc').classList.remove('ok');
    label.innerHTML = 'Subí tu <b>plantilla.docx</b><br><span class="sdb-sub">con variables entre llaves dobles</span>';
    alert('Error al leer el documento: ' + err.message);
  }
}

function sdbRenderVarChips() {
  const b = sdb$('sdbVarsBox');
  b.innerHTML = '';
  builderState.dataVars.forEach(v => {
    const c = document.createElement('span');
    c.className = 'sdb-var-chip';
    c.textContent = `{{${v}}}`;
    b.appendChild(c);
  });
  builderState.signAnchors.forEach(v => {
    const c = document.createElement('span');
    c.className = 'sdb-var-chip sign';
    c.textContent = `{{${v}}} ✍`;
    b.appendChild(c);
  });
  sdb$('sdbAnchorBanner').style.display = builderState.signAnchors.length ? 'block' : 'none';
}

/* ========================================
   2. DATOS (reusa el parseo del bulksend)
   Un solo upload compartido: el builder y el envío comparten
   dataRows/dataHeaders. Envolvemos onDataLoaded (sin tocar app.js) para
   enterarnos cuando el parseo async termina.
   ======================================== */
(function wrapOnDataLoaded() {
  const orig = window.onDataLoaded;
  window.onDataLoaded = function (fileName, format) {
    if (typeof orig === 'function') orig.call(this, fileName, format);
    sdbOnDataLoaded(fileName, format);
  };
})();

function sdbHandleData(files) {
  if (!files || !files.length) return;
  // handleDataUpload() del bulksend parsea y llena dataRows/dataHeaders.
  handleDataUpload(files);
}

function sdbOnDataLoaded(fileName, format) {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  if (!rows.length) return;
  builderState.previewIdx = 0;
  sdb$('sdbDropData').classList.add('ok');
  sdb$('sdbDropDataLabel').innerHTML = `✓ <b>${sdbEsc(fileName)}</b> (${format})<br><span class="sdb-sub">${rows.length} filas · ${headers.length} columnas</span>`;
  sdb$('sdbDataInfo').innerHTML = 'Columnas: ' + headers.map(h => `<code>${sdbEsc(h)}</code>`).join(' ');
  sdbRenderPreview();
  sdbCheckReady();
}

/* ========================================
   3. MARCA (manual)
   ======================================== */
function sdbSyncBrand() {
  const c = sdb$('sdbBrandColor').value;
  document.documentElement.style.setProperty('--sdb-brand', c);
  sdb$('sdbBrandHex').value = c;
  sdbRenderPreview();
}

/* ========================================
   4. FUSIÓN + PREVIEW
   ======================================== */
function sdbFillTemplate(html, row) {
  let out = html;
  // Variables de datos → valor de la fila (o [placeholder] si no hay dato)
  builderState.dataVars.forEach(v => {
    const has = row && row[v] != null && row[v] !== '';
    const val = has ? String(row[v]) : `[${v}]`;
    out = out.replace(sdbRx(v), `<span class="sdb-val">${sdbEsc(val)}</span>`);
  });
  // Anclas de firma → texto exacto que viajará como ancla (invisible en el PDF)
  const reveal = sdb$('sdbRevealAnchors').checked;
  builderState.signAnchors.forEach(a => {
    out = out.replace(sdbRx(a), `<span class="sdb-sign-anchor${reveal ? ' reveal' : ''}" data-anchor="${sdbEsc(a)}">${sdbEsc(a)}</span>`);
  });
  return out;
}

function sdbRenderPreview() {
  const box = sdb$('sdbPreview');
  if (!builderState.docHtml) {
    box.innerHTML = '<div class="sdb-empty">Subí un documento para ver la vista previa con tus datos.</div>';
    sdb$('sdbPager').textContent = '';
    return;
  }
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const row = rows[builderState.previewIdx] || null;
  box.style.fontFamily = sdb$('sdbBrandFont').value;
  box.innerHTML = `
    <div class="sdb-doc-bar"></div>
    <div class="sdb-doc-title">${sdbEsc(sdb$('sdbDocTitle').value || 'Documento')}</div>
    <div class="sdb-doc-meta">${row ? `Destinatario ${builderState.previewIdx + 1} de ${rows.length}` : 'Sin datos · se muestran los marcadores'}</div>
    ${sdbFillTemplate(builderState.docHtml, row)}`;
  sdb$('sdbPager').textContent = rows.length ? `${builderState.previewIdx + 1} / ${rows.length}` : '';
}

/* ========================================
   CONTRATO INTERNO (agnóstico del producto de firma)
   Ver typedef DispatchDoc en js/providers/signaturit.js.
   ======================================== */
function sdbBuildDispatchDoc(row, pdfBlob) {
  return {
    pdf: pdfBlob,
    recipient: {
      name: sdbPickColumn(row, /nombre|name|cliente/i),
      email: sdbPickColumn(row, /email|correo|e-?mail/i)
    },
    anchors: builderState.signAnchors.map(a => ({
      id: a,               // identificador estable del ancla
      text: a,             // texto exacto embebido (invisible) en el PDF
      type: 'signature',   // manual: todas firma; la IA podrá inferir date/text
      required: true
    }))
  };
}

/* ========================================
   5. GENERACIÓN DE PDF (html2pdf, un PDF por fila)
   ======================================== */
function sdbCheckReady() {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const ok = builderState.docHtml && rows.length;
  sdb$('sdbGenBtn').disabled = !ok;
  sdb$('sdbGenHint').textContent = ok
    ? `Listo para generar ${rows.length} PDF(s).`
    : 'Cargá el documento y los datos para habilitar.';
}

async function sdbGenerate() {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  if (!builderState.docHtml || !rows.length) return;

  const btn = sdb$('sdbGenBtn');
  btn.disabled = true;
  sdb$('sdbResults').innerHTML = '';
  builderState.dispatchDocs = [];

  const title = sdb$('sdbDocTitle').value || 'Documento';
  const font = sdb$('sdbBrandFont').value;
  const brand = sdb$('sdbBrandColor').value;
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  const nameKey = headers.find(h => /nombre|name|cliente/i.test(h));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Elemento suelto (A4) que se rasteriza a PDF
    const el = document.createElement('div');
    el.style.cssText = `font-family:${font};font-size:13px;line-height:1.7;color:#1a2332;padding:40px 48px;width:720px;background:#fff`;
    el.innerHTML = `
      <div style="height:5px;background:${brand};margin:-40px -48px 26px"></div>
      <div style="font-size:20px;font-weight:700;color:${brand};margin-bottom:4px">${sdbEsc(title)}</div>
      <div style="font-size:11px;color:#5f6b7a;margin-bottom:20px;font-family:monospace">Destinatario ${i + 1}</div>
      ${sdbFillTemplate(builderState.docHtml, row)}`;
    // Anclas de firma: se pintan del color de fondo → invisibles en el PDF
    el.querySelectorAll('.sdb-sign-anchor').forEach(a => {
      a.style.color = '#fff';
      a.style.background = '#fff';
      a.style.border = 'none';
    });

    const fname = `${sdbSlug(title)}_${sdbSlug(String((nameKey && row[nameKey]) || ('doc_' + (i + 1))))}.pdf`;
    const opts = {
      margin: 0,
      filename: fname,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'pt', format: 'a4' }
    };

    // Blob en memoria (para el futuro puente) + descarga (entregable del modo manual)
    const blob = await html2pdf().set(opts).from(el).outputPdf('blob');
    sdbDownload(blob, fname);
    builderState.dispatchDocs.push(sdbBuildDispatchDoc(row, blob));

    const it = document.createElement('div');
    it.className = 'sdb-result-item';
    it.innerHTML = `<span class="sdb-dot"></span><span class="sdb-fname">${sdbEsc(fname)}</span><span class="sdb-badge">generado</span>`;
    sdb$('sdbResults').appendChild(it);
    await new Promise(r => setTimeout(r, 110));
  }

  const done = document.createElement('div');
  done.className = 'sdb-done';
  done.textContent = `✓ ${builderState.dispatchDocs.length} PDF(s) generados y descargados.`;
  sdb$('sdbResults').appendChild(done);
  btn.disabled = false;
}

function sdbDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========================================
   WIRING de eventos del builder
   ======================================== */
function sdbInit() {
  if (!sdb$('s-builder')) return;

  sdb$('sdbFileDoc').addEventListener('change', e => sdbHandleDoc(e.target.files));
  sdb$('sdbFileData').addEventListener('change', e => sdbHandleData(e.target.files));

  sdb$('sdbBrandColor').addEventListener('input', sdbSyncBrand);
  sdb$('sdbBrandHex').addEventListener('input', e => {
    const v = e.target.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { sdb$('sdbBrandColor').value = v; sdbSyncBrand(); }
  });
  sdb$('sdbDocTitle').addEventListener('input', sdbRenderPreview);
  sdb$('sdbBrandFont').addEventListener('change', sdbRenderPreview);
  sdb$('sdbRevealAnchors').addEventListener('change', sdbRenderPreview);
  sdb$('sdbGenBtn').addEventListener('click', sdbGenerate);

  // Pasar de destinatario al hacer click en la vista previa
  sdb$('sdbPreview').addEventListener('click', () => {
    const rows = typeof dataRows !== 'undefined' ? dataRows : [];
    if (!rows.length) return;
    builderState.previewIdx = (builderState.previewIdx + 1) % rows.length;
    sdbRenderPreview();
  });

  // Drag & drop en las dos zonas
  ['sdbDropDoc', 'sdbDropData'].forEach(id => {
    const z = sdb$(id);
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag'); });
    z.addEventListener('dragleave', () => z.classList.remove('drag'));
    z.addEventListener('drop', e => {
      e.preventDefault();
      z.classList.remove('drag');
      const input = z.querySelector('input');
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sdbInit);
else sdbInit();
