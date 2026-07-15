/* ============================================
   Smart Dispatch — Onboarding (fork + cliente + chat guiado)
   --------------------------------------------
   SPA de una sola página: secciones que se muestran/ocultan con sdGo(id).
   El estado vive en memoria y se comparte con el builder vía ACC.
   (UI en inglés; comentarios internos en español.)
   ============================================ */

const sd$ = id => document.getElementById(id);

/* ===== Estado compartido ===== */
const A = { sigType: null, product: null, freq: null, vol: null, ia: null, team: null }; // respuestas del chat (product se DERIVA de sigType)
let chosen = null;                                                        // plan/pack elegido
const ACC = { plan: null, ia: false, limit: Infinity, oneshot: false, isClient: false, sendType: null, token: null, product: null, used: 0 };

/* Token de PREPRODUCCIÓN de Signaturit para la demo: se usa en TODOS los caminos
   (cliente nuevo tras el alta y usuario que ya tiene token). El entorno de envío
   por defecto es Sandbox. NOTA: es un token de preprod para el demo, no de
   producción; sigue viajando por header y no se persiste. */
const SIG_PREPROD_TOKEN = 'XaGXALJHVNrksuUxLGplRrmByBHTNiEVwUXECDzRPyInxbbNAkgvBYPDaXFCOGgjsTgebxpCjHFxpVdxaXaKKc';
const isOneShot = () => A.freq === 'oneshot' || A.freq === 'sometimes';
let fromSignup = false; // lo setea signup.js al volver del alta con el token

/* ===== Navegación con historial real (navStack) ===== */
let navStack = [];
let currentScreen = 's-fork';
function sdGo(id, push = true) {
  if (push && currentScreen && currentScreen !== id) navStack.push(currentScreen);
  currentScreen = id;
  document.querySelectorAll('.sd-screen').forEach(s => s.classList.remove('on'));
  sd$(id).classList.add('on');
  sd$('sdCrumb').textContent = t('crumb.' + id);
  sd$('sdBack').style.display = navStack.length ? '' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 's-quiz' && !sdChatLogEl().children.length) sdAskStep(0);
  if (id === 's-provider') sdSyncProviderPreselect();
  if (id === 's-builder' && typeof sdbOnEnter === 'function') sdbOnEnter();
  if (typeof sdRenderUsagePill === 'function') sdRenderUsagePill(); // saldo en el header (una vez con token)
}
function goBack() {
  if (!navStack.length) return;
  sdGo(navStack.pop(), false);
}
document.addEventListener('keydown', e => {
  if ((e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft')) && navStack.length) {
    e.preventDefault();
    goBack();
  }
});
function sdPickOne(el) {
  el.parentElement.querySelectorAll('.sd-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}

/* ===== Proveedor (Signaturit / eSAW) — alimenta el select cfg-provider
   que ya lee app.js/startBulkSend. Se preselecciona con lo elegido antes. ===== */
function sdPickProvider(el) {
  document.querySelectorAll('#s-provider .sd-sendtype').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  ACC.provider = el.dataset.provider;
  const sel = document.getElementById('cfg-provider');
  if (sel) sel.value = ACC.provider; // <- la MISMA fuente que usa el envío del bulksend
  sd$('sdProviderNext').disabled = false;
}
function sdContinueProvider() {
  if (!ACC.provider) return;
  sdGo('s-sendtype');
}
function sdSyncProviderPreselect() {
  // Preseleccionar según el producto que ya eligió (chat o login de cliente)
  const want = (ACC.product === 'esaw' || A.product === 'esaw') ? 'esaw' : 'signaturit';
  const el = document.querySelector(`#s-provider .sd-sendtype[data-provider="${want}"]`);
  if (el && !document.querySelector('#s-provider .sd-sendtype.sel')) sdPickProvider(el);
}

/* ===== Tipo de envío — REUSA operationType del bulksend (app.js) ===== */
const sdSendTypeLabel = type => type ? t('sendtype.' + type) : null;

/* ===== Tipo de firma → proveedor (selección AUTOMÁTICA, camino "quiero empezar") =====
   El usuario NO elige el proveedor: lo decide el tipo de firma. El proveedor es
   transparente para el cliente (no se le muestra).
   DEMO: por detrás SIEMPRE llevamos todo a Signaturit — la generación de doc para
   eSAW (campos AcroForm reales) todavía no está lista, así que el envío funciona
   end-to-end solo con Signaturit. La firma "advanced" es un tipo de firma válido
   en Signaturit (type=advanced), no un proveedor. (Antes: advanced → eSAW.) */
const SIG_TYPE_PROVIDER = { advanced: 'signaturit', simple: 'signaturit', email: 'signaturit', sms: 'signaturit' };
const PROVIDER_NAME = { signaturit: 'Signaturit', esaw: 'eSignAnywhere' };
function sdPickSendType(el) {
  document.querySelectorAll('#s-sendtype .sd-sendtype').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  operationType = el.dataset.type;   // <- la MISMA global que ya usa el envío
  ACC.sendType = operationType;
  sd$('sdSendTypeNext').disabled = false;
  const note = sd$('sdSendTypeNote');
  if (operationType === 'sms') {
    note.style.display = 'block';
    note.innerHTML = t('sendtype.smsNote');
  } else {
    note.style.display = 'none';
  }
}
function sdContinueSendType() {
  if (!operationType) return;
  if (operationType === 'sms') {
    // SMS no tiene documento → saltea el builder. El envío se conecta con el puente.
    alert(t('sendtype.smsAlert'));
    return;
  }
  sdGo('s-docsource'); // advanced / simple / email → elegir origen del documento
}

/* Continuar desde s-done. El usuario nuevo ya eligió el tipo de firma en el chat
   (operationType ya está seteado) → va directo al builder, sin volver a preguntar
   en s-sendtype. El cliente existente no pasó por el chat → elige el tipo ahí. */
function sdAfterDone() {
  if (operationType) {
    if (operationType === 'sms') {
      alert(t('sendtype.smsAlert'));
      return;
    }
    sdGo('s-docsource');   // elegir: crear con IA o traer PDF propio
  } else {
    sdGo('s-sendtype');
  }
}

/* ============ CHAT GUIADO ============
   El camino por detrás siempre es Signaturit. El chat educa mientras clasifica. */
const FLOW = [
  {
    key: 'sigType',
    bot: () => t('chat.q.sigType'),
    opts: () => [
      { label: t('chat.opt.advanced'), v: 'advanced' },
      { label: t('chat.opt.simple'), v: 'simple' },
      { label: t('chat.opt.email'), v: 'email' },
      { label: t('chat.opt.sms'), v: 'sms' }
    ],
    info: (v) => t('chat.info.' + v),
    reply: (v) => t('chat.reply.' + v)
  },
  {
    key: 'freq',
    bot: () => t('chat.q.freq'),
    opts: () => [
      { label: t('chat.opt.monthly'), v: 'monthly' },
      { label: t('chat.opt.oneshot'), v: 'oneshot' },
      { label: t('chat.opt.sometimes'), v: 'sometimes' }
    ],
    info: (v) => t('chat.info.' + v),
    reply: (v) => t('chat.reply.' + v)
  },
  {
    key: 'vol',
    bot: () => isOneShot() ? t('chat.q.vol.oneshot') : t('chat.q.vol.monthly'),
    opts: () => {
      const m = isOneShot() ? 'oneshot' : 'monthly';
      return [
        { label: t('chat.opt.vol.low.' + m), v: 'low' },
        { label: t('chat.opt.vol.mid.' + m), v: 'mid' },
        { label: t('chat.opt.vol.high.' + m), v: 'high' }
      ];
    },
    info: (v) => t('chat.info.vol.' + v + '.' + (isOneShot() ? 'oneshot' : 'monthly')),
    reply: (v) => t('chat.reply.vol.' + v + '.' + (isOneShot() ? 'oneshot' : 'monthly'))
  },
  {
    key: 'team',
    skipIf: () => isOneShot(),
    bot: () => t('chat.q.team'),
    opts: () => [
      { label: t('chat.opt.team.1'), v: '1' },
      { label: t('chat.opt.team.few'), v: 'few' },
      { label: t('chat.opt.team.many'), v: 'many' }
    ],
    info: (v) => t('chat.info.team.' + v),
    reply: (v) => t('chat.reply.team.' + v)
  }
];

let chatStep = 0;
const sdChatLogEl = () => sd$('sdChatLog');
const sdChatActsEl = () => sd$('sdChatActions');

function sdScrollChat() { sdChatLogEl().scrollTop = sdChatLogEl().scrollHeight; }
function sdAddBot(html) {
  const d = document.createElement('div'); d.className = 'sd-msg';
  d.innerHTML = `<div class="bav">ND</div><div class="sd-bubble">${html}</div>`;
  sdChatLogEl().appendChild(d); sdScrollChat();
}
function sdAddMe(txt) {
  const d = document.createElement('div'); d.className = 'sd-msg me';
  d.innerHTML = `<div class="sd-bubble">${txt}</div>`;
  sdChatLogEl().appendChild(d); sdScrollChat();
}
function sdAddInfo(html) {
  const d = document.createElement('div'); d.className = 'sd-info-pill';
  d.innerHTML = `💡 ${html}`;
  sdChatLogEl().appendChild(d); sdScrollChat();
}
function sdTyping(on) {
  const ex = sd$('sdTypingDots');
  if (on) {
    if (ex) return;
    const d = document.createElement('div'); d.className = 'sd-msg'; d.id = 'sdTypingDots';
    d.innerHTML = '<div class="bav">ND</div><div class="sd-typing"><i></i><i></i><i></i></div>';
    sdChatLogEl().appendChild(d); sdScrollChat();
  } else if (ex) ex.remove();
}
function sdSetChips(opts, onPick) {
  sdChatActsEl().innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button'); b.className = 'sd-chip'; b.textContent = o.label;
    b.onclick = () => onPick(o); sdChatActsEl().appendChild(b);
  });
}
function sdClearChips() { sdChatActsEl().innerHTML = '<span class="sd-chat-hint">…</span>'; }

function sdAskStep(i) {
  const st = FLOW[i];
  if (!st) return sdFinishChat();
  if (st.skipIf && st.skipIf()) { chatStep = i + 1; return sdAskStep(chatStep); }
  sdClearChips();
  sdTyping(true);
  setTimeout(() => {
    sdTyping(false);
    sdAddBot(typeof st.bot === 'function' ? st.bot() : st.bot);
    const total = FLOW.filter(s => !(s.skipIf && s.skipIf())).length;
    const idx = FLOW.slice(0, i + 1).filter(s => !(s.skipIf && s.skipIf())).length;
    sd$('sdChatProgress').textContent = t('chat.progress', { i: idx, total });
    const opts = typeof st.opts === 'function' ? st.opts() : st.opts;
    sdSetChips(opts, (o) => sdHandlePick(st, o));
  }, 650);
}

function sdHandlePick(st, o) {
  sdAddMe(st.reply(o.v));
  sdClearChips();

  A[st.key] = o.v;

  // Tipo de firma: fija operationType y asigna el proveedor INTERNAMENTE. El
  // proveedor es transparente para el cliente — NO se menciona en el onboarding;
  // recién al final del envío se le dice por dónde se envió y cómo hacer seguimiento.
  if (st.key === 'sigType') sdSetSigType(o.v);

  // El 💡 explica el tipo de firma (recomendado), no el proveedor.
  const info = st.info(o.v);
  if (info) setTimeout(() => sdAddInfo(info), 400);

  setTimeout(() => { chatStep++; sdAskStep(chatStep); }, info ? 1100 : 500);
}

/* Fija el tipo de firma: operationType (global del envío), ACC.sendType y el
   proveedor derivado. Compartido entre los chips y la interpretación por IA. */
function sdSetSigType(v) {
  A.sigType = v;
  operationType = v;          // la MISMA global que usa el envío en app.js
  ACC.sendType = v;
  const prov = SIG_TYPE_PROVIDER[v];
  A.product = prov;           // signup.js lee A.product
  ACC.product = prov;
  return prov;
}

/* ============ TEXTO LIBRE (chat conversacional real) ============
   El cliente escribe con sus palabras; interpretamos la intención con IA
   (Claude vía proxy) y, si no está o no entiende, con heurística local. Lo que
   quede sin resolver se pregunta guiado con chips. */
async function sdSubmitText(e) {
  if (e) e.preventDefault();
  const input = sd$('sdChatText');
  const text = (input.value || '').trim();
  if (!text) return;
  input.value = '';
  sdAddMe(text);
  sdClearChips();
  sdTyping(true);

  // 1) IA primero; 2) si no, heurística local.
  let intent = await SDIntent.classifyIntent(text, { step: FLOW[chatStep] && FLOW[chatStep].key, answers: A });
  if (!intent) intent = SDIntent.localGuess(text);

  sdTyping(false);

  // Guardamos si el tipo de firma ya estaba fijado ANTES de aplicar, para no
  // repetir el 💡 explicativo si la interpretación lo vuelve a inferir.
  const hadSigType = A.sigType != null;
  const applied = intent ? sdApplyIntent(intent) : [];

  if (!applied.length) {
    // Nada aplicable: o el mensaje está fuera del ámbito del asistente (temas
    // ajenos a preparar un envío de documentos para firma), o no se entendió.
    // Mostramos el redirect (clarify de la IA o chat.offTopic) y RE-MOSTRAMOS
    // SOLO las opciones del paso actual — sin repetir la pregunta/saludo entero.
    sdAddBot(intent && intent.clarify ? intent.clarify : t('chat.offTopic'));
    const st = FLOW[chatStep];
    if (st) {
      const opts = typeof st.opts === 'function' ? st.opts() : st.opts;
      sdSetChips(opts, (o) => sdHandlePick(st, o));
    }
    return;
  }

  // Confirmamos lo entendido y seguimos por el primer paso sin responder.
  if (intent.reply) sdAddBot(intent.reply);
  else sdAddBot(t('chat.gotIt'));

  // El 💡 con la descripción del tipo de firma recomendado también en el camino
  // por texto libre (igual que al elegir un chip): si la interpretación fijó el
  // tipo de firma, lo explicamos antes de seguir con la próxima pregunta.
  const info = !hadSigType && applied.includes('sigType') && intent.sigType ? t('chat.info.' + intent.sigType) : null;
  if (info) setTimeout(() => sdAddInfo(info), 400);
  setTimeout(sdAdvanceFromIntent, info ? 1100 : 0);
}

/* Aplica al estado A los campos válidos que trajo el intent. Devuelve la lista
   de campos aplicados. Maneja sigType especial (proveedor + provider msg). */
function sdApplyIntent(intent) {
  const order = ['sigType', 'freq', 'vol', 'team'];
  const applied = [];
  order.forEach(k => {
    if (intent[k] == null) return;
    if (k === 'sigType') sdSetSigType(intent[k]); // proveedor interno, transparente para el cliente
    else A[k] = intent[k];
    applied.push(k);
  });
  return applied;
}

/* Salta al primer paso del FLOW que siga sin responder (respetando skipIf).
   Si ya está todo, cierra el chat. */
function sdAdvanceFromIntent() {
  const i = FLOW.findIndex(st => {
    if (st.skipIf && st.skipIf()) return false;
    return A[st.key] == null;
  });
  if (i === -1) { chatStep = FLOW.length; return setTimeout(sdFinishChat, 700); }
  chatStep = i;
  setTimeout(() => sdAskStep(chatStep), 700);
}

function sdFinishChat() {
  sd$('sdChatProgress').textContent = '';
  sdTyping(true);
  setTimeout(() => {
    sdTyping(false);
    const rec = recommend();
    const C = catalog();
    sdAddBot(isOneShot()
      ? t('chat.done.pack', { name: planName(C[rec]) })
      : t('chat.done.plan', { name: planName(C[rec]) }));
    sdChatActsEl().innerHTML = '';
    const b = document.createElement('button');
    b.className = 'sd-btn primary'; b.style.cssText = 'width:100%;justify-content:center';
    b.textContent = isOneShot() ? t('chat.seePacks') : t('chat.seePlan');
    b.onclick = sdComputePlan;
    sdChatActsEl().appendChild(b);
  }, 800);
}

function sdResetChat() {
  chatStep = 0;
  A.sigType = A.product = A.freq = A.vol = A.team = null;
  sdChatLogEl().innerHTML = ''; sdChatActsEl().innerHTML = '';
  sdAskStep(0);
}

/* ===== Confirmación del token (cliente existente O post-alta) ===== */
function sdEnterAsClient() {
  const token = sd$('sdTok').value.trim();
  if (fromSignup) {
    // Viene del alta: el plan ya se eligió/pagó → NO resetear. Solo adjuntar token.
    ACC.token = token;
    fromSignup = false;
  } else {
    // Cliente existente de verdad: cuenta con IA y sin límite.
    ACC.plan = 'Customer'; ACC.ia = true; ACC.limit = Infinity; ACC.isClient = true; ACC.oneshot = false; ACC.token = token;
  }
  sdRenderClientDone();
  sdGo('s-done');
}

function sdRenderClientDone() {
  const mask = tok => tok ? (tok.slice(0, 12) + '…') : '••••';
  sd$('sdDoneTitle').textContent = ACC.isClient ? t('done.title.client') : t('done.title.new');
  sd$('sdDoneSub').textContent = ACC.isClient ? t('done.sub.client') : t('done.sub.new', { plan: ACC.plan });
  sd$('sdRecap').innerHTML = `
    <div class="r"><span>${ACC.isClient ? t('recap.type') : t('recap.plan')}</span><span>${ACC.isClient ? t('recap.existingCustomer') : ACC.plan}${ACC.ia ? '<span class="sd-badge-ia">ND</span>' : ''}</span></div>
    <div class="r"><span>${t('recap.token')}</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px">${mask(ACC.token)} · ${t('recap.inMemory')}</span></div>
    <div class="r"><span>${t('recap.persistence')}</span><span style="color:var(--success)">${t('recap.none')}</span></div>
    <div class="r"><span>${t('recap.aiLayer')}</span><span style="color:${ACC.ia ? 'var(--success)' : 'var(--text-muted)'}">${ACC.ia ? t('recap.enabled') : t('recap.manual')}</span></div>`;
}

/* Prefill del token de preprod en el campo del cliente existente (misma fuente
   que usa el alta). Los scripts van al final del <body>, así que el DOM ya existe. */
if (typeof sd$ === 'function' && sd$('sdTok')) sd$('sdTok').value = SIG_PREPROD_TOKEN;
