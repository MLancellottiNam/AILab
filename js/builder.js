/* ============================================
   Smart Dispatch — PDF Builder (pantalla 6, dentro del flujo)
   --------------------------------------------
   Word/TXT o texto pegado con {{variables}} → HTML → un PDF por fila.
   - Paso 1 con dos pestañas: subir archivo (.docx/.txt) o escribir/pegar.
   - Detección de campos: por patrones (camino base, sin IA) o con IA (apagada
     hasta el proxy real de Claude).
   - mammoth.convertToHtml (conserva formato).
   - Reusa el parseo de datos del bulksend (dataRows/dataHeaders globales).
   - Lee ACC (plan del onboarding): caja de IA, botón de IA, cuota y corte.
   - Genera PDFs con html2pdf. Cero persistencia: todo en memoria.

   Al generar, cada fila produce un DispatchDoc (contrato interno agnóstico
   del producto de firma; ver typedef en js/providers/signaturit.js).
   ============================================ */

const builderState = {
  docHtml: '',       // HTML del documento (mammoth o texto pegado)
  dataVars: [],      // variables de datos → se reemplazan con columnas
  signAnchors: [],   // anclas de firma
  previewIdx: 0,
  dispatchDocs: [],  // DispatchDoc[] de la última corrida (en memoria)
  detected: []       // campos detectados en el editor libre
};

/* ===== Helpers locales ===== */
const sdbEsc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sdbEscReg = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sdbRx = name => new RegExp(`\\{\\{\\s*${sdbEscReg(name)}\\s*\\}\\}`, 'g');
const sdb$ = id => document.getElementById(id);
const looksLikeSign = v => /firma|sign|signature/i.test(v);
const sdbSlug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
const sdbAcc = () => (typeof ACC !== 'undefined' ? ACC : { plan: 'Demo', ia: false, limit: Infinity, oneshot: false });
function sdbPickColumn(row, rx) {
  const key = (typeof dataHeaders !== 'undefined' ? dataHeaders : []).find(h => rx.test(h));
  return key ? String(row[key] ?? '') : '';
}
function sdbNote(msg, kind) {
  const n = sdb$('sdbDetectNote');
  n.className = 'sdb-detect-note show ' + kind;
  n.innerHTML = msg;
}

/* ========================================
   ENTRADA AL BUILDER — reflejar el plan (ACC)
   ======================================== */
function sdbOnEnter() {
  const acc = sdbAcc();

  // Caja de IA (paso 3, brandbook). Real pendiente del proxy → siempre disabled.
  const box = sdb$('sdbIaBox'), iaBtn = sdb$('sdbIaBtn');
  if (acc.ia) {
    box.classList.remove('locked');
    sdb$('sdbIaTitle').textContent = 'AI layer';
    sdb$('sdbIaDesc').textContent = 'Included in your plan. Upload your brand book and the AI will extract colors and typography. (In progress.)';
    iaBtn.textContent = '✨ Extract brand from brand book · coming soon';
  } else {
    box.classList.add('locked');
    sdb$('sdbIaTitle').textContent = 'AI layer · not included';
    sdb$('sdbIaDesc').textContent = 'Your plan uses manual mode. With the Pro plan, the AI extracts the brand, places the fields and maps the data for you.';
    iaBtn.textContent = '🔒 Available on the Pro plan';
  }
  iaBtn.disabled = true; // sin proxy todavía

  // Botón "Detectar con IA" (paso 1) — mismo criterio, apagado hasta el proxy.
  const detBtn = sdb$('sdbBtnDetectIA');
  detBtn.disabled = true;
  detBtn.textContent = acc.ia ? '✨ Detect with AI · coming soon' : '🔒 Detect with AI (Pro plan)';

  sdbUpdQuota();
  sdbCheckReady();
}

/* ========================================
   PASO 1 — Modo del documento (pestañas)
   ======================================== */
let sdbDocMode = 'upload';
function sdbSetDocMode(m) {
  sdbDocMode = m;
  sdb$('sdbTabUpload').classList.toggle('on', m === 'upload');
  sdb$('sdbTabWrite').classList.toggle('on', m === 'write');
  sdb$('sdbModeUpload').style.display = m === 'upload' ? '' : 'none';
  sdb$('sdbModeWrite').style.display = m === 'write' ? '' : 'none';
}

/* ---- Subir archivo (.docx / .txt) ---- */
async function sdbHandleDoc(files) {
  const f = files && files[0];
  if (!f) return;
  const name = f.name.toLowerCase();

  if (name.endsWith('.txt')) {
    const t = await f.text();
    sdbSetDocMode('write');
    sdb$('sdbDocEditor').value = t;
    sdbNote('Text loaded. Detect the fields to continue.', 'ok');
    return;
  }
  if (!name.endsWith('.docx')) { alert('Upload a .docx or a .txt'); return; }

  const label = sdb$('sdbDropDocLabel');
  label.innerHTML = 'Processing…';
  try {
    const arrayBuffer = await f.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer });
    builderState.docHtml = res.value;

    const all = sdbExtractVars(builderState.docHtml);
    if (!all.length) {
      // Word sin {{variables}}: lo pasamos al editor para detectar por patrones
      const plain = builderState.docHtml.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      builderState.docHtml = '';
      sdbSetDocMode('write');
      sdb$('sdbDocEditor').value = plain;
      sdbNote('Your document doesn\'t use <code>{{variables}}</code> — no problem. Detect the fields by patterns and we continue.', 'warn');
      return;
    }
    sdbSplitVars(all);
    sdb$('sdbDropDoc').classList.add('ok');
    label.innerHTML = `✓ <b>${sdbEsc(f.name)}</b><br><span class="sdb-sub">${all.length} variable(s) detected</span>`;
    sdbRenderVarChips();
    sdbRenderPreview();
    sdbCheckReady();
  } catch (err) {
    sdb$('sdbDropDoc').classList.remove('ok');
    label.innerHTML = 'Upload your <b>template.docx</b> or <b>.txt</b><br><span class="sdb-sub">with or without variables — we detect them for you</span>';
    alert('Error reading the document: ' + err.message);
  }
}

function sdbExtractVars(html) {
  return [...new Set([...html.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m => m[1].trim()))];
}
function sdbSplitVars(all) {
  builderState.signAnchors = all.filter(looksLikeSign);
  builderState.dataVars = all.filter(v => !looksLikeSign(v));
}

/* ---- Detección por patrones (camino base, SIN IA) ---- */
const SDB_STOP = /^(el|la|los|las|un|una|de|del|con|por|para|en|y|o|a|su|sus|al|se|que|es)$/i;
function sdbLabelFrom(before) {
  const seg = before.split(/[.,;:\n]/).pop().trim();
  let w = seg.split(/\s+/).filter(Boolean);
  while (w.length && SDB_STOP.test(w[w.length - 1])) w.pop();
  w = w.slice(-3);
  while (w.length && SDB_STOP.test(w[0])) w.shift();
  return w.join(' ').trim();
}
function sdbScanFields(txt, smart) {
  const found = []; let i = 0;
  const push = (raw, label, guess, pos) => found.push({ raw, label, guess, pos, type: 'data' });
  [...txt.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].forEach(m => push(m[0], m[1].trim(), m[1].trim(), m.index));
  [...txt.matchAll(/\[([^\]]{2,40})\]/g)].forEach(m => push(m[0], m[1].trim(), sdbSlug(m[1]), m.index));
  [...txt.matchAll(/([A-ZÁÉÍÓÚÑa-záéíóúñ][^\n:]{2,40}):[ \t]*(_{3,})/g)].forEach(m => {
    push(m[2], m[1].trim(), sdbSlug(m[1]), m.index + m[0].indexOf(m[2]));
  });
  [...txt.matchAll(/_{3,}/g)].forEach(m => {
    if (found.some(f => f.pos === m.index)) return;
    let lab = smart ? sdbLabelFrom(txt.slice(Math.max(0, m.index - 60), m.index)) : '';
    if (!lab) { i++; lab = 'Field ' + i; }
    push(m[0], lab, sdbSlug(lab) || ('field_' + (++i)), m.index);
  });
  found.sort((a, b) => a.pos - b.pos);
  found.forEach(f => { if (looksLikeSign(f.label)) f.type = 'signature'; });
  return found;
}
function sdbDetectManual() {
  const txt = sdb$('sdbDocEditor').value.trim();
  if (!txt) { sdbNote('Write or paste something first.', 'warn'); return; }
  const found = sdbScanFields(txt, false);
  if (!found.length) { sdbNote('I couldn\'t find any blanks to fill. Try underscores (____), [brackets] or <code>{{variables}}</code>.', 'warn'); return; }
  sdbRenderFieldsEditor(found);
  sdbNote(`Found <b>${found.length} fields</b> by patterns. Name them and mark which one is the signature.`, 'ok');
}
const SDB_SAMPLE = `INSURANCE POLICY AGREEMENT

The insurer hereby formalizes policy number ____________ with the insured ________________, holder of ID [id number], domiciled at ________________, in the city of ____________.

COVERAGE DETAILS

The agreement covers the insured under the [coverage type] modality, with an insured sum of ____________ and a monthly premium of __________. Coverage begins on ____________.

ACKNOWLEDGMENT AND SIGNATURE

In witness whereof, the insured signs this agreement.

Insured's signature: ________________________`;

function sdbLoadSample() {
  sdb$('sdbDocEditor').value = SDB_SAMPLE;
  sdbNote('Example loaded. Try <b>Detect by patterns</b>.', 'ok');
}

function sdbDetectWithIA() {
  // Apagado hasta el proxy real de Claude. El botón está disabled; esto es un salvavidas.
  // TODO(IA): reemplazar por llamada al proxy Claude → JSON de campos {label,type}.
  sdbNote('AI detection is enabled once we connect the Claude proxy. For now use <b>Detect by patterns</b>.', 'warn');
}

/* ---- Editor de campos detectados ---- */
function sdbRenderFieldsEditor(found) {
  builderState.detected = found;
  const box = sdb$('sdbFieldsEditor');
  box.innerHTML = '';
  found.forEach((f, i) => {
    const r = document.createElement('div');
    r.className = 'sdb-field-row-edit';
    const isSign = f.type === 'signature' || looksLikeSign(f.label);
    r.innerHTML = `
      <input class="fx" value="${sdbEsc(f.guess)}" title="${sdbEsc(f.label)}" onchange="sdbSetFieldName(${i}, this.value)">
      <select onchange="sdbSetFieldType(${i}, this.value)">
        <option value="data" ${!isSign ? 'selected' : ''}>Dato</option>
        <option value="signature" ${isSign ? 'selected' : ''}>Firma</option>
      </select>
      <span class="del" onclick="sdbRemoveField(${i})">×</span>`;
    box.appendChild(r);
  });
  const btn = document.createElement('button');
  btn.className = 'sd-btn teal';
  btn.style.cssText = 'width:100%;justify-content:center;margin-top:9px;font-size:13px;padding:9px';
  btn.textContent = 'Confirm fields and use this document';
  btn.onclick = sdbApplyDetected;
  box.appendChild(btn);
}
function sdbSetFieldType(i, v) { builderState.detected[i].type = v === 'signature' ? 'signature' : 'data'; }
function sdbSetFieldName(i, v) { builderState.detected[i].guess = sdbSlug(v) || builderState.detected[i].guess; }
function sdbRemoveField(i) { builderState.detected.splice(i, 1); sdbRenderFieldsEditor(builderState.detected); }

function sdbApplyDetected() {
  let txt = sdb$('sdbDocEditor').value;
  // Reemplazar de atrás para adelante para no romper los índices
  [...builderState.detected].sort((a, b) => b.pos - a.pos).forEach(f => {
    const name = f.type === 'signature' ? (looksLikeSign(f.guess) ? f.guess : 'sign_' + f.guess) : f.guess;
    txt = txt.slice(0, f.pos) + `{{${name}}}` + txt.slice(f.pos + f.raw.length);
  });
  // Texto plano → HTML simple, y de acá sigue el pipeline de siempre
  builderState.docHtml = txt.split(/\n{2,}/).map(p => `<p>${sdbEsc(p).replace(/\n/g, '<br>')}</p>`).join('');
  sdbSplitVars(sdbExtractVars(builderState.docHtml));
  sdbRenderVarChips();
  sdbRenderPreview();
  sdbCheckReady();
  sdbNote(`✓ Document ready: <b>${builderState.dataVars.length} data field(s)</b> and <b>${builderState.signAnchors.length} signature(s)</b>. You can cross your data now.`, 'ok');
}

function sdbRenderVarChips() {
  const b = sdb$('sdbVarsBox');
  b.innerHTML = '';
  builderState.dataVars.forEach(v => {
    const c = document.createElement('span'); c.className = 'sdb-var-chip'; c.textContent = `{{${v}}}`; b.appendChild(c);
  });
  builderState.signAnchors.forEach(v => {
    const c = document.createElement('span'); c.className = 'sdb-var-chip sign'; c.textContent = `{{${v}}} ✍`; b.appendChild(c);
  });
  sdb$('sdbAnchorBanner').style.display = builderState.signAnchors.length ? 'block' : 'none';
}

/* ========================================
   PASO 2 — Datos (reusa el parseo del bulksend)
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
  handleDataUpload(files); // parsea y llena dataRows/dataHeaders (app.js)
}
function sdbOnDataLoaded(fileName, format) {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  if (!rows.length) return;
  builderState.previewIdx = 0;
  sdb$('sdbDropData').classList.add('ok');
  sdb$('sdbDropDataLabel').innerHTML = `✓ <b>${sdbEsc(fileName)}</b> (${format})<br><span class="sdb-sub">${rows.length} rows · ${headers.length} columns</span>`;
  sdb$('sdbDataInfo').innerHTML = 'Columns: ' + headers.map(h => `<code>${sdbEsc(h)}</code>`).join(' ');
  sdbUpdQuota();
  sdbRenderPreview();
  sdbCheckReady();
}
function sdbUpdQuota() {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const acc = sdbAcc();
  if (!rows.length) { sdb$('sdbQuotaBox').style.display = 'none'; return; }
  sdb$('sdbQuotaBox').style.display = 'flex';
  const over = rows.length > acc.limit;
  sdb$('sdbQuotaTxt').innerHTML = `<b style="color:${over ? 'var(--error)' : 'var(--text)'}">${rows.length}</b> / ${acc.limit === Infinity ? '∞' : acc.limit} docs${acc.oneshot ? ' in pack' : ''}`;
}

/* ========================================
   PASO 3 — Marca
   ======================================== */
function sdbSyncBrand() {
  const c = sdb$('sdbBrandColor').value;
  document.documentElement.style.setProperty('--sdb-brand', c);
  sdb$('sdbBrandHex').value = c;
  sdbRenderPreview();
}
function sdbRunIA() {
  // Extracción del brandbook con IA — pendiente del proxy de Claude.
  // TODO(IA): subir brandbook (PDF) → proxy Claude → JSON {primary, secondary, font}.
  sdbNote('AI brand extraction is enabled once we connect the Claude proxy.', 'warn');
}

/* ========================================
   FUSIÓN + PREVIEW
   ======================================== */
function sdbFillTemplate(html, row) {
  let out = html;
  builderState.dataVars.forEach(v => {
    const has = row && row[v] != null && row[v] !== '';
    const val = has ? String(row[v]) : `[${v}]`;
    out = out.replace(sdbRx(v), `<span class="sdb-val">${sdbEsc(val)}</span>`);
  });
  const reveal = sdb$('sdbRevealAnchors').checked;
  builderState.signAnchors.forEach(a => {
    out = out.replace(sdbRx(a), `<span class="sdb-sign-anchor${reveal ? ' reveal' : ''}" data-anchor="${sdbEsc(a)}">${sdbEsc(a)}</span>`);
  });
  return out;
}
function sdbRenderPreview() {
  const box = sdb$('sdbPreview');
  if (!builderState.docHtml) {
    box.innerHTML = '<div class="sdb-empty">Upload a document to see the preview with your data.</div>';
    sdb$('sdbPager').textContent = '';
    return;
  }
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const row = rows[builderState.previewIdx] || null;
  box.style.fontFamily = sdb$('sdbBrandFont').value;
  box.innerHTML = `
    <div class="sdb-doc-bar"></div>
    <div class="sdb-doc-title">${sdbEsc(sdb$('sdbDocTitle').value || 'Document')}</div>
    <div class="sdb-doc-meta">${row ? `Recipient ${builderState.previewIdx + 1} of ${rows.length}` : 'No data · placeholders shown'}</div>
    ${sdbFillTemplate(builderState.docHtml, row)}`;
  sdb$('sdbPager').textContent = rows.length ? `${builderState.previewIdx + 1} / ${rows.length}` : '';
}

/* ========================================
   CONTRATO INTERNO (agnóstico del producto de firma)
   ======================================== */
function sdbBuildDispatchDoc(row, pdfBlob) {
  return {
    pdf: pdfBlob,
    recipient: {
      name: sdbPickColumn(row, /nombre|name|cliente/i),
      email: sdbPickColumn(row, /email|correo|e-?mail/i)
    },
    anchors: builderState.signAnchors.map(a => ({ id: a, text: a, type: 'signature', required: true }))
  };
}

/* ========================================
   PASO 4 — Generación (html2pdf, un PDF por fila, corte por ACC.limit)
   ======================================== */
function sdbCheckReady() {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  const acc = sdbAcc();
  const ok = builderState.docHtml && rows.length;
  sdb$('sdbGenBtn').disabled = !ok;
  if (!ok) { sdb$('sdbGenHint').textContent = 'Load the document and the data to enable.'; return; }
  if (rows.length > acc.limit) {
    sdb$('sdbGenHint').innerHTML = `<span style="color:var(--error)">⚠ ${rows.length} documents exceeds your plan limit (${acc.limit}). The first ${acc.limit} will be generated.</span>`;
  } else {
    sdb$('sdbGenHint').textContent = `Ready to generate ${rows.length} PDF(s).`;
  }
}

async function sdbGenerate() {
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  if (!builderState.docHtml || !rows.length) return;
  const acc = sdbAcc();

  const btn = sdb$('sdbGenBtn');
  btn.disabled = true;
  sdb$('sdbResults').innerHTML = '';
  builderState.dispatchDocs = [];

  const title = sdb$('sdbDocTitle').value || 'Document';
  const font = sdb$('sdbBrandFont').value;
  const brand = sdb$('sdbBrandColor').value;
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  const nameKey = headers.find(h => /nombre|name|cliente/i.test(h));
  const n = acc.limit === Infinity ? rows.length : Math.min(rows.length, acc.limit);

  for (let i = 0; i < n; i++) {
    const row = rows[i];
    const el = document.createElement('div');
    el.style.cssText = `font-family:${font};font-size:13px;line-height:1.7;color:#1a2332;padding:40px 48px;width:720px;background:#fff`;
    el.innerHTML = `
      <div style="height:5px;background:${brand};margin:-40px -48px 26px"></div>
      <div style="font-size:20px;font-weight:700;color:${brand};margin-bottom:4px">${sdbEsc(title)}</div>
      <div style="font-size:11px;color:#5f6b7a;margin-bottom:20px;font-family:monospace">Recipient ${i + 1}</div>
      ${sdbFillTemplate(builderState.docHtml, row)}`;
    // Anclas de firma: pintadas del color de fondo → invisibles en el PDF
    el.querySelectorAll('.sdb-sign-anchor').forEach(a => { a.style.color = '#fff'; a.style.background = '#fff'; a.style.border = 'none'; });

    const fname = `${sdbSlug(title)}_${sdbSlug(String((nameKey && row[nameKey]) || ('doc_' + (i + 1))))}.pdf`;
    const opts = { margin: 0, filename: fname, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'pt', format: 'a4' } };

    const blob = await html2pdf().set(opts).from(el).outputPdf('blob');
    sdbDownload(blob, fname);
    builderState.dispatchDocs.push(sdbBuildDispatchDoc(row, blob));

    const it = document.createElement('div');
    it.className = 'sdb-result-item';
    it.innerHTML = `<span class="sdb-dot"></span><span class="sdb-fname">${sdbEsc(fname)}</span><span class="sdb-badge">generated</span>`;
    sdb$('sdbResults').appendChild(it);
    await new Promise(r => setTimeout(r, 110));
  }

  const done = document.createElement('div');
  done.className = 'sdb-done';
  const skipped = rows.length - n;
  done.textContent = `✓ ${n} PDF(s) generated and downloaded.` + (skipped > 0 ? ` (${skipped} beyond the plan limit)` : '');
  sdb$('sdbResults').appendChild(done);
  btn.disabled = false;
}

function sdbDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ========================================
   WIRING
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

  sdb$('sdbPreview').addEventListener('click', () => {
    const rows = typeof dataRows !== 'undefined' ? dataRows : [];
    if (!rows.length) return;
    builderState.previewIdx = (builderState.previewIdx + 1) % rows.length;
    sdbRenderPreview();
  });

  ['sdbDropDoc', 'sdbDropData'].forEach(id => {
    const z = sdb$(id);
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag'); });
    z.addEventListener('dragleave', () => z.classList.remove('drag'));
    z.addEventListener('drop', e => {
      e.preventDefault(); z.classList.remove('drag');
      const input = z.querySelector('input');
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sdbInit);
else sdbInit();
