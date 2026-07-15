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

  // Caja de IA (paso 3, brandbook). Habilitada cuando el plan incluye IA; el
  // proxy real (ai-proxy) hace la extracción, con fallback a selección manual.
  const box = sdb$('sdbIaBox'), iaBtn = sdb$('sdbIaBtn');
  if (acc.ia) {
    box.classList.remove('locked');
    sdb$('sdbIaTitle').textContent = 'AI layer';
    sdb$('sdbIaDesc').textContent = 'Included in your plan. Upload your brand book (PDF) and the AI extracts colors and typography.';
    iaBtn.textContent = '✨ Extract brand from brand book';
  } else {
    box.classList.add('locked');
    sdb$('sdbIaTitle').textContent = 'AI layer · not included';
    sdb$('sdbIaDesc').textContent = 'Your plan uses manual mode. With the Pro plan, the AI extracts the brand, places the fields and maps the data for you.';
    iaBtn.textContent = '🔒 Available on the Pro plan';
  }
  iaBtn.disabled = !acc.ia;

  // Botón "Detect with AI" (junto a "Detect by patterns"): solo con plan IA.
  const detBtn = sdb$('sdbDetectAiBtn');
  if (detBtn) detBtn.style.display = acc.ia ? '' : 'none';

  // Redactor asistido (composeDoc): habilitado si el plan incluye IA.
  // Hoy composeDoc es determinista (plantillas); cuando esté el proxy Claude
  // pasa a ser la llamada real, y composeDoc queda de fallback.
  const cb = sdb$('sdbComposeBtn');
  if (acc.ia) { cb.disabled = false; cb.innerHTML = '✨ Draft with AI'; }
  else { cb.disabled = true; cb.textContent = '🔒 AI drafting (Pro plan)'; }

  // Card del documento: bloqueada hasta que haya datos cargados.
  const rows = typeof dataRows !== 'undefined' ? dataRows : [];
  if (rows.length) sdbUnlockDocCard(); else sdb$('sdbDocCard').classList.add('locked');

  sdbUpdQuota();
  sdbSyncColTray();
  sdbCheckReady();
}

function sdbUnlockDocCard() {
  sdb$('sdbDocCard').classList.remove('locked');
}

/* ---- Subir archivo (.docx / .txt) → cae en el mismo editor ---- */
async function sdbHandleDoc(files) {
  const f = files && files[0];
  if (!f) return;
  const name = f.name.toLowerCase();

  if (name.endsWith('.txt')) {
    sdb$('sdbDocEditor').value = await f.text();
    sdbEditorLive();
    sdbNote('Text loaded. If it uses ____ or [brackets], hit “Detect by patterns”.', 'ok');
    return;
  }
  if (!name.endsWith('.docx')) { alert('Upload a .docx or a .txt'); return; }

  try {
    const arrayBuffer = await f.arrayBuffer();
    const res = await mammoth.convertToHtml({ arrayBuffer });
    const html = res.value;
    const plain = html.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    sdb$('sdbDocEditor').value = plain;
    const all = sdbExtractVars(html);
    if (all.length) {
      sdbEditorLive();
      sdbNote(`Loaded <b>${sdbEsc(f.name)}</b> — ${all.length} variable(s) detected.`, 'ok');
    } else {
      sdbNote(`Loaded <b>${sdbEsc(f.name)}</b>. No <code>{{variables}}</code> — hit “Detect by patterns”.`, 'warn');
    }
  } catch (err) {
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

async function sdbDetectWithIA() {
  if (!sdbAcc().ia) return; // gated por plan (el botón ya está oculto)
  const txt = sdb$('sdbDocEditor').value.trim();
  if (!txt) { sdbNote('Write or paste something first.', 'warn'); return; }
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];

  const btn = sdb$('sdbDetectAiBtn');
  const prev = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Detecting…'; }
  sdbNote('Reading the document with AI…', 'ok');

  try {
    if (typeof aiCall !== 'function') throw new Error('ai_unavailable');
    const data = await aiCall('detect-fields', { text: txt, columns: headers });
    const raws = Array.isArray(data && data.fields) ? data.fields : [];
    // Ubicamos cada hueco por su `raw` EXACTO con un cursor que avanza (robusto
    // ante huecos repetidos; no confiamos en offsets del modelo).
    let cursor = 0;
    const found = [];
    raws.forEach(f => {
      if (!f || typeof f.raw !== 'string' || !f.raw) return;
      const idx = txt.indexOf(f.raw, cursor);
      if (idx < 0) return;
      const guess = sdbSlug(f.name || f.label) || ('field_' + (found.length + 1));
      found.push({
        raw: f.raw, label: f.label || f.raw, guess, pos: idx,
        type: (f.type === 'signature' || looksLikeSign(f.label) || looksLikeSign(guess)) ? 'signature' : 'data'
      });
      cursor = idx + f.raw.length;
    });
    if (!found.length) throw new Error('ai_no_match');
    found.sort((a, b) => a.pos - b.pos);
    sdbRenderFieldsEditor(found);
    sdbNote(`AI found <b>${found.length} field(s)</b>. Review the names and mark which one is the signature.`, 'ok');
  } catch (e) {
    // REGLA DE ORO: sin IA / error → detección por patrones (con etiquetas smart).
    const found = sdbScanFields(txt, true);
    if (!found.length) {
      sdbNote('AI unavailable and no blanks found by patterns. Try underscores (____), [brackets] or <code>{{variables}}</code>.', 'warn');
    } else {
      sdbRenderFieldsEditor(found);
      sdbNote(`AI was unavailable, so we detected <b>${found.length} field(s)</b> by patterns instead. Review and confirm.`, 'ok');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev || 'Detect with AI'; }
  }
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
  sdb$('sdbDocEditor').value = txt; // dejamos las {{variables}} visibles en el editor
  sdbApplyEditorText(txt);
  sdbNote(`✓ Document ready: <b>${builderState.dataVars.length} data field(s)</b> and <b>${builderState.signAnchors.length} signature(s)</b>. You can cross your data now.`, 'ok');
}

/* Texto libre (con {{variables}}) → docHtml + pipeline. Reusado por el editor
   en vivo (drag&drop de columnas) y por la detección por patrones. */
function sdbApplyEditorText(txt) {
  builderState.docHtml = txt.split(/\n{2,}/).map(p => `<p>${sdbEsc(p).replace(/\n/g, '<br>')}</p>`).join('');
  sdbSplitVars(sdbExtractVars(builderState.docHtml));
  sdbRenderVarChips();
  sdbRenderPreview();
  sdbCheckReady();
}

/* ========================================
   REDACTOR ASISTIDO — composeDoc (determinista, fallback sin IA)
   La IA redacta FORMA, no contenido jurídico. Cuando esté el proxy Claude,
   sdbCompose() pasa a llamarlo y composeDoc queda como fallback.
   ======================================== */
const SDB_I18N = {
  es: { greeting: 'Estimado/a', details: 'Datos', closing: 'Saludos cordiales', signature: 'Firma', title: 'Documento' },
  en: { greeting: 'Dear', details: 'Details', closing: 'Kind regards', signature: 'Signature', title: 'Document' },
  pt: { greeting: 'Prezado/a', details: 'Dados', closing: 'Atenciosamente', signature: 'Assinatura', title: 'Documento' },
  it: { greeting: 'Gentile', details: 'Dati', closing: 'Cordiali saluti', signature: 'Firma', title: 'Documento' },
  fr: { greeting: 'Cher/Chère', details: 'Détails', closing: 'Cordialement', signature: 'Signature', title: 'Document' }
};
// Nota: cuidado con /id/ que matchea "apell(id)o" → usar \bid\b / _id$.
const SDB_RX_NAME = /\bnombre\b|\bname\b|first[_\s]?name|\bfirst\b/i;
const SDB_RX_LAST = /apellido|last[_\s]?name|surname|\blast\b/i;
function sdbLabelize(h) {
  return String(h).replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function composeDoc(brief, opts, headers) {
  const T = SDB_I18N[opts.lang] || SDB_I18N.en;
  const nameCol = headers.find(h => SDB_RX_NAME.test(h));
  const lastCol = headers.find(h => SDB_RX_LAST.test(h));
  const greetVars = [nameCol, lastCol].filter(Boolean).map(c => `{{${c}}}`).join(' ');
  const dataCols = headers.filter(h => h !== nameCol && h !== lastCol);
  const dataBlock = dataCols.map(h => `${sdbLabelize(h)}: {{${h}}}`).join('\n');

  const words = brief.trim().split(/\s+/).filter(Boolean);
  const isShort = words.length <= 40;
  const lead = { formal: '', neutral: '', close: '', commercial: '' }; // el tono ya se refleja en greeting/closing
  void lead; void opts.tone; void opts.length; // deterministas; el proxy real usará estos matices

  if (isShort) {
    // Redacta el documento entero a partir de la intención del usuario
    return [
      `${T.greeting}${greetVars ? ' ' + greetVars : ''},`,
      '',
      brief.trim(),
      '',
      `${T.details}:`,
      dataBlock || '—',
      '',
      `${T.closing},`,
      '',
      `${T.signature}: {{sign}}`
    ].join('\n');
  }
  // Documento largo pegado: respeta el texto, suma campos faltantes + firma
  const parts = [brief.trim()];
  if (dataBlock) parts.push('', `${T.details}:`, dataBlock);
  parts.push('', `${T.signature}: {{sign}}`);
  return parts.join('\n');
}

async function sdbCompose() {
  if (!sdbAcc().ia) return; // gated por plan (el botón ya está disabled igual)
  const brief = sdb$('sdbBrief').value.trim();
  if (!brief) { sdbNote('Write what you need to send first.', 'warn'); return; }
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  const opts = { tone: sdb$('sdbTone').value, lang: sdb$('sdbLang').value, len: sdb$('sdbLen').value };

  const btn = sdb$('sdbComposeBtn');
  const prevLabel = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '✨ Drafting…'; }

  let text, note;
  try {
    // Camino IA: el proxy Claude redacta la FORMA con {{columnas}} + firma.
    if (typeof aiCall !== 'function') throw new Error('ai_unavailable');
    const data = await aiCall('write-doc', {
      idea: brief, tone: opts.tone, lang: opts.lang, length: opts.len, columns: headers
    });
    text = data && typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) throw new Error('ai_empty');
    note = '✓ Draft ready. Edit anything, drag in columns, or generate. (The assistant writes form, not legal content.)';
  } catch (e) {
    // REGLA DE ORO: sin IA / error / timeout → fallback determinista, sin romper nada.
    text = composeDoc(brief, opts, headers);
    note = '✓ Draft ready (AI was unavailable, so we drafted it for you). Edit anything, drag in columns, or generate.';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = prevLabel || '✨ Draft with AI'; }
  }

  sdb$('sdbDocEditor').value = text;
  // Título de marca desde el idioma elegido (si el usuario no lo cambió)
  if (!sdb$('sdbDocTitle').value.trim()) sdb$('sdbDocTitle').value = (SDB_I18N[opts.lang] || SDB_I18N.en).title;
  sdbApplyEditorText(text);
  sdbNote(note, 'ok');
}

/* Editor en vivo: si ya hay {{variables}} en el texto, actualiza al instante.
   Si no (texto con ____ / [corchetes]), espera a "Detect by patterns". */
function sdbEditorLive() {
  const txt = sdb$('sdbDocEditor').value;
  if (/\{\{/.test(txt)) sdbApplyEditorText(txt);
}

/* ---- Bandeja de columnas arrastrables (aparece cuando hay CSV) ---- */
function sdbSyncColTray() {
  const tray = sdb$('sdbColTray'), chips = sdb$('sdbColChips');
  if (!tray) return;
  const headers = typeof dataHeaders !== 'undefined' ? dataHeaders : [];
  if (!headers.length) { tray.style.display = 'none'; return; }
  chips.innerHTML = '';
  // Chip de ancla de firma (no viene del CSV)
  const signChip = document.createElement('span');
  signChip.className = 'sdb-col-chip sign';
  signChip.textContent = '✍ sign';
  signChip.draggable = true;
  signChip.dataset.token = '{{sign}}';
  chips.appendChild(signChip);
  // Chips de columnas del CSV
  headers.forEach(h => {
    const c = document.createElement('span');
    c.className = 'sdb-col-chip';
    c.textContent = h;
    c.draggable = true;
    c.dataset.token = `{{${h}}}`;
    chips.appendChild(c);
  });
  chips.querySelectorAll('.sdb-col-chip').forEach(c => {
    c.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', c.dataset.token));
    c.addEventListener('click', () => sdbInsertAtCursor(c.dataset.token));
  });
  tray.style.display = 'block';
}

function sdbInsertAtCursor(token) {
  const ta = sdb$('sdbDocEditor');
  const s = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
  const e = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
  ta.value = ta.value.slice(0, s) + token + ta.value.slice(e);
  const pos = s + token.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
  sdbEditorLive();
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
  sdbUnlockDocCard(); // ya hay datos → habilitar el documento
  sdbUpdQuota();
  sdbSyncColTray();
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
// Botón "Extract brand from brand book": abre el selector de PDF. El trabajo
// real lo hace sdbExtractBrand() al elegir archivo.
function sdbRunIA() {
  if (!sdbAcc().ia) return;
  const inp = sdb$('sdbFileBrand');
  if (inp) inp.click();
}

// Matchea el nombre de fuente que devuelve la IA contra las opciones del select
// (Inter/Georgia/Times/Arial). Si no hay match, deja la fuente actual.
function sdbMatchFont(name) {
  if (!name) return null;
  const sel = sdb$('sdbBrandFont');
  const n = String(name).toLowerCase();
  const opt = [...sel.options].find(o => {
    const label = o.textContent.toLowerCase();
    const val = o.value.toLowerCase();
    return label.includes(n) || n.includes(label.split(' ')[0]) || val.includes(n);
  });
  return opt ? opt.value : null;
}

async function sdbExtractBrand(files) {
  const f = files && files[0];
  if (!f) return;
  if (!/pdf$/i.test(f.name) && f.type !== 'application/pdf') {
    sdbNote('Upload your brand book as a <b>PDF</b>.', 'warn');
    return;
  }
  const btn = sdb$('sdbIaBtn');
  const prev = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '✨ Reading brand book…'; }
  sdbNote('Reading your brand book with AI…', 'ok');

  try {
    if (typeof aiCall !== 'function') throw new Error('ai_unavailable');
    // PDF → base64 (sin el prefijo data:...;base64,). Cero persistencia: en memoria.
    const pdfBase64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error('read_error'));
      r.readAsDataURL(f);
    });
    const data = await aiCall('extract-brand', { pdfBase64 });
    if (!data || !/^#[0-9a-fA-F]{6}$/.test(data.primary || '')) throw new Error('ai_bad_brand');

    sdb$('sdbBrandColor').value = data.primary;
    sdb$('sdbBrandHex').value = data.primary;
    sdbSyncBrand();
    const fontVal = sdbMatchFont(data.font);
    if (fontVal) { sdb$('sdbBrandFont').value = fontVal; sdbRenderPreview(); }
    sdbNote(`✓ Brand applied from <b>${sdbEsc(f.name)}</b>: color <code>${sdbEsc(data.primary)}</code>${data.font ? ` · font “${sdbEsc(data.font)}”${fontVal ? '' : ' (no close match, kept current)'}` : ''}. Tweak it if you like.`, 'ok');
  } catch (e) {
    // REGLA DE ORO: sin IA / error → selección manual, sin romper nada.
    sdbNote('We couldn\'t read the brand book with AI — set the color and font manually below.', 'warn');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev || '✨ Extract brand from brand book'; }
    const inp = sdb$('sdbFileBrand');
    if (inp) inp.value = ''; // permite re-subir el mismo archivo
  }
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
// ⚠ OJO al soldar el puente (bridge): las anclas de acá son TEXTO.
//   - Signaturit: OK, coloca la firma por ancla de texto invisible.
//   - eSAW: NO usa anclas de texto (confirmado contra sandbox). Necesita
//     campos AcroForm reales (/FT /Sig). El PDF de html2pdf es plano, sin
//     AcroForm → para destino eSAW hay que post-procesar el Blob e insertar
//     los campos de firma (ej. pdf-lib) en la posición de cada ancla ANTES
//     de mandarlo. Detalle en el encabezado de js/providers/esaw.js y en
//     CLAUDE.md §4/§6.
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
  const brandInp = sdb$('sdbFileBrand');
  if (brandInp) brandInp.addEventListener('change', e => sdbExtractBrand(e.target.files));
  sdb$('sdbDocEditor').addEventListener('input', sdbEditorLive); // preview en vivo + soltar columnas

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

  ['sdbDropData'].forEach(id => {
    const z = sdb$(id);
    if (!z) return;
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
