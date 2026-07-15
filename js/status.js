/* ============================================
   Smart Dispatch — Check status (consulta de estado desde CSV)
   --------------------------------------------
   El usuario sube el CSV que exportó tras enviar (contracara de exportLog:
   status,recipient,id_or_error) y consultamos el estado ACTUAL de cada firma
   contra Signaturit. Reusa el proxy existente (PROXY_URL) con el patrón GET
   (x-method-override), el tokenizer de CSV (parseCsvLine) y las credenciales
   ya cargadas (cfg-token / cfg-env). Cero persistencia: todo en memoria.

   - Una sola llamada por lote de 100 UUIDs (GET /v3/signatures.json?ids=...).
   - Una fila por DOCUMENTO (una firma puede tener varios firmantes).
   - Filas status=error del CSV: se muestran tal cual, sin consultar.
   - Descarga del firmado (solo completed): binario vía proxy → Blob PDF.
   Solo en pantalla, no se exporta.
   ============================================ */

const SD_ST_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SD_ST_BATCH = 100;

// status → etiqueta + color (exactos de la doc de Signaturit)
const SD_ST_MAP = {
  in_queue:  { label: 'In process',        cls: 'gray'  },
  ready:     { label: 'Pending signature', cls: 'amber' },
  signing:   { label: 'Signing',           cls: 'amber' },
  completed: { label: 'Signed',            cls: 'green' },
  expired:   { label: 'Expired',           cls: 'red'   },
  canceled:  { label: 'Canceled',          cls: 'red'   },
  declined:  { label: 'Declined',          cls: 'red'   },
  error:     { label: 'Error',             cls: 'red'   }
};

const sdSt$ = id => document.getElementById(id);

// De dónde se abrió (para volver al lugar correcto): 'onboarding' (screen de
// tipo de envío) o 'launcher' (menú del app).
let sdStatusOrigin = 'launcher';

function sdStatusOpen() {
  // Recordar origen: si el onboarding está visible, venimos de ahí.
  const wrapEl = document.querySelector('.sd-wrap');
  sdStatusOrigin = (wrapEl && getComputedStyle(wrapEl).display !== 'none') ? 'onboarding' : 'launcher';

  // Ocultar el onboarding (sd-top/sd-wrap), pero NO los del propio status view.
  document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { if (!el.closest('#statusView')) el.style.display = 'none'; });
  const ov = sdSt$('launcherOverlay'); if (ov) ov.classList.add('hidden');
  const wrap = sdSt$('appWrapper'); if (wrap) wrap.classList.remove('active');
  sdSt$('statusView').style.display = 'block';

  // reset
  sdSt$('statusResults').style.display = 'none';
  sdSt$('statusProgress').style.display = 'none';
  sdSt$('statusBody').innerHTML = '';
  sdSt$('statusStats').innerHTML = '';
  const inp = sdSt$('statusInput'); if (inp) inp.value = '';
  const dz = sdSt$('statusDropZone'); if (dz) dz.classList.remove('has-file');
  window.scrollTo({ top: 0 });
}

function sdStatusBack() {
  sdSt$('statusView').style.display = 'none';
  if (sdStatusOrigin === 'onboarding') {
    // Volver al onboarding (el screen activo sigue siendo el de tipo de envío).
    document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { if (!el.closest('#statusView')) el.style.display = ''; });
  } else {
    const ov = sdSt$('launcherOverlay'); if (ov) ov.classList.remove('hidden');
  }
}

/* ---- Lectura del CSV (reusa el tokenizer parseCsvLine de app.js) ---- */
function sdStatusHandleFile(files) {
  const f = files && files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    let text = String(e.target.result);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) { alert('Empty file'); return; }

    const sep = ','; // el CSV lo exportamos nosotros con comas
    const rows = [];
    lines.forEach((line, i) => {
      const cells = typeof parseCsvLine === 'function' ? parseCsvLine(line, sep) : line.split(sep);
      const status = (cells[0] || '').trim().toLowerCase();
      // saltar encabezado
      if (i === 0 && status === 'status') return;
      const recipient = (cells[1] || '').trim();
      // id_or_error es la última columna; si el mensaje de error trae comas, unir el resto
      const idOrError = cells.slice(2).join(sep).trim();
      if (!status && !recipient && !idOrError) return;
      rows.push({ status, recipient, idOrError });
    });
    if (!rows.length) { alert('No rows found in the CSV'); return; }

    const dz = sdSt$('statusDropZone'); if (dz) dz.classList.add('has-file');
    sdStatusRun(rows);
  };
  reader.readAsText(f);
}

/* ---- Consulta contra Signaturit (una llamada por lote de 100) ---- */
async function sdStatusRun(rows) {
  const token = (sdSt$('cfg-token') && sdSt$('cfg-token').value.trim()) || '';
  const env = (sdSt$('cfg-env') && sdSt$('cfg-env').value) || 'https://api.sandbox.signaturit.com';
  if (!token) { alert('No API token available'); return; }

  // Clasificar filas del CSV.
  const toQuery = [];               // UUIDs a consultar
  const uuidToRecipient = {};
  rows.forEach(r => {
    if (r.status === 'ok' && SD_ST_UUID.test(r.idOrError)) {
      toQuery.push(r.idOrError);
      uuidToRecipient[r.idOrError.toLowerCase()] = r.recipient;
    }
  });

  // Consulta en lotes de 100, cruzando por signature id.
  const sigById = {};
  const batches = [];
  for (let i = 0; i < toQuery.length; i += SD_ST_BATCH) batches.push(toQuery.slice(i, i + SD_ST_BATCH));

  const prog = sdSt$('statusProgress'), fill = sdSt$('statusProgressFill'), ptxt = sdSt$('statusProgressTxt');
  if (batches.length) {
    prog.style.display = 'block';
    for (let b = 0; b < batches.length; b++) {
      ptxt.textContent = `Querying ${toQuery.length} signature(s)…` + (batches.length > 1 ? ` (batch ${b + 1}/${batches.length})` : '');
      try {
        const data = await sdStatusFetch(token, env, batches[b]);
        if (Array.isArray(data)) data.forEach(s => { if (s && s.id) sigById[String(s.id).toLowerCase()] = s; });
      } catch (e) {
        // Un lote que falla no rompe el resto: esos UUIDs quedarán "no encontrado".
      }
      fill.style.width = Math.round(((b + 1) / batches.length) * 100) + '%';
    }
    setTimeout(() => { prog.style.display = 'none'; }, 400);
  }

  // Construir filas de resultado.
  const out = [];
  rows.forEach(r => {
    if (r.status !== 'ok') { // error de envío del CSV → mostrar tal cual
      out.push({ kind: 'send-error', recipient: r.recipient, note: r.idOrError || 'Send error' });
      return;
    }
    if (!SD_ST_UUID.test(r.idOrError)) {
      out.push({ kind: 'invalid', recipient: r.recipient, note: 'Invalid signature id' });
      return;
    }
    const sig = sigById[r.idOrError.toLowerCase()];
    if (!sig) { out.push({ kind: 'notfound', recipient: r.recipient, note: 'Not found' }); return; }
    const docs = Array.isArray(sig.documents) && sig.documents.length ? sig.documents : [null];
    docs.forEach(doc => {
      out.push({
        kind: 'doc',
        recipient: (doc && doc.email) || r.recipient,
        name: (doc && doc.name) || '',
        status: (doc && doc.status) || 'error',
        sentAt: sig.created_at || '',
        signedAt: sdStatusSignedDate(doc),
        sigId: sig.id,
        docId: doc && doc.id,
        fileName: doc && doc.file && doc.file.name,
        decliner: (doc && doc.decliner_email) || sig.decliner_email || ''
      });
    });
  });

  sdStatusRender(out);
}

function sdStatusFetch(token, env, ids) {
  return fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'x-signaturit-token': token,
      'x-api-url': env + '/v3/signatures.json?ids=' + ids.join(',') + '&limit=' + SD_ST_BATCH,
      'x-method-override': 'GET',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  }).then(r => r.json());
}

/* Fecha de firma: evento document_completed / document_signed en events[]. */
function sdStatusSignedDate(doc) {
  if (!doc || !Array.isArray(doc.events)) return '';
  const ev = doc.events.find(e => e && (e.type === 'document_completed' || e.type === 'document_signed'));
  return ev ? ev.created_at : '';
}

function sdStatusFmtDate(iso) {
  if (!iso) return '—';
  // Signaturit devuelve "+0000" sin dos puntos → normalizar para Date.
  const norm = String(iso).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(norm);
  if (isNaN(d.getTime())) return iso;
  try { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d); }
  catch (e) { return d.toLocaleString(); }
}

/* ---- Render de la tabla ---- */
function sdStatusRender(out) {
  const c = sdSt$('statusResults');
  c.style.display = 'block';
  sdSt$('statusHead').innerHTML = '<tr><th>#</th><th>Recipient</th><th>Status</th><th>Sent</th><th>Signed</th><th>Download</th></tr>';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  let completed = 0, other = 0, issues = 0;

  const body = out.map((r, i) => {
    let pill, sent = '—', signed = '—', dl = '—', sub = '';
    if (r.kind === 'doc') {
      const m = SD_ST_MAP[r.status] || { label: r.status || 'Unknown', cls: 'gray' };
      pill = `<span class="st-pill ${m.cls}">${esc(m.label)}</span>`;
      sent = sdStatusFmtDate(r.sentAt);
      signed = r.status === 'completed' ? sdStatusFmtDate(r.signedAt) : '—';
      if (r.status === 'completed') { completed++; } else { other++; }
      if (r.status === 'completed' && r.sigId && r.docId) {
        dl = `<a class="st-dl" onclick="sdStatusDownload('${esc(r.sigId)}','${esc(r.docId)}','${esc((r.fileName || 'signed.pdf').replace(/'/g, ''))}')">⬇ Signed PDF</a>`;
      }
      if (r.status === 'declined' && r.decliner) sub = `<div class="st-sub">Declined by ${esc(r.decliner)}</div>`;
      if (r.name) sub = `<div class="st-sub">${esc(r.name)}</div>` + sub;
    } else {
      // send-error / invalid / notfound
      const cls = r.kind === 'notfound' ? 'gray' : 'red';
      const label = r.kind === 'send-error' ? 'Send error' : (r.kind === 'invalid' ? 'Invalid id' : 'Not found');
      pill = `<span class="st-pill ${cls}">${label}</span>`;
      sub = r.note ? `<div class="st-sub">${esc(r.note)}</div>` : '';
      issues++;
    }
    return `<tr><td>${i + 1}</td><td>${esc(r.recipient) || '—'}${sub}</td><td>${pill}</td><td>${sent}</td><td>${signed}</td><td>${dl}</td></tr>`;
  }).join('');

  sdSt$('statusBody').innerHTML = body;
  sdSt$('statusStats').innerHTML =
    `<span class="stat-badge success">✓ ${completed} signed</span>` +
    (other ? `<span class="stat-badge warning">${other} in progress</span>` : '') +
    (issues ? `<span class="stat-badge error">${issues} issue(s)</span>` : '');
}

/* ---- Descarga del PDF firmado (binario vía proxy → Blob) ----
   El proxy NO preserva el content-type (responde application/json aunque el
   body sea el PDF), así que leemos arrayBuffer y forzamos el tipo en el Blob. */
async function sdStatusDownload(sigId, docId, fileName) {
  const token = (sdSt$('cfg-token') && sdSt$('cfg-token').value.trim()) || '';
  const env = (sdSt$('cfg-env') && sdSt$('cfg-env').value) || 'https://api.sandbox.signaturit.com';
  try {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'x-signaturit-token': token,
        'x-api-url': env + '/v3/signatures/' + sigId + '/documents/' + docId + '/download/signed',
        'x-method-override': 'GET',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();
    const blob = new Blob([buf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName || 'signed.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) {
    alert('Could not download the signed PDF: ' + e.message);
  }
}

/* Drag & drop sobre la zona (mismo patrón que el resto de la app). */
(function sdStatusWireDrop() {
  const z = sdSt$('statusDropZone');
  if (!z) return;
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('dragover'); });
  z.addEventListener('dragleave', () => z.classList.remove('dragover'));
  z.addEventListener('drop', e => {
    e.preventDefault(); z.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length) sdStatusHandleFile(e.dataTransfer.files);
  });
})();
