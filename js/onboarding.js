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
const ACC = { plan: null, ia: false, limit: Infinity, oneshot: false, isClient: false, sendType: null, token: null, product: null };
const isOneShot = () => A.freq === 'oneshot' || A.freq === 'sometimes';
let fromSignup = false; // lo setea signup.js al volver del alta con el token

const CRUMBS = {
  's-fork': 'Start', 's-client': 'Sign in', 's-quiz': 'Assistant', 's-signup': 'Your details',
  's-token': 'Your token', 's-plans': 'Plans', 's-pay': 'Payment', 's-done': 'Confirmation',
  's-sendtype': 'Request type', 's-builder': 'PDF Builder'
};

/* ===== Navegación con historial real (navStack) ===== */
let navStack = [];
let currentScreen = 's-fork';
function sdGo(id, push = true) {
  if (push && currentScreen && currentScreen !== id) navStack.push(currentScreen);
  currentScreen = id;
  document.querySelectorAll('.sd-screen').forEach(s => s.classList.remove('on'));
  sd$(id).classList.add('on');
  sd$('sdCrumb').textContent = CRUMBS[id] || '';
  sd$('sdBack').style.display = navStack.length ? '' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 's-quiz' && !sdChatLogEl().children.length) sdAskStep(0);
  if (id === 's-builder' && typeof sdbOnEnter === 'function') sdbOnEnter();
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

/* ===== Tipo de envío — REUSA operationType del bulksend (app.js) ===== */
const SD_SENDTYPE_LABEL = { advanced: 'Advanced signature', simple: 'Simple signature', email: 'Certified email', sms: 'Certified SMS' };

/* ===== Tipo de firma → proveedor (selección AUTOMÁTICA, camino "quiero empezar") =====
   El usuario NO elige el proveedor: lo decide el tipo de firma. La firma avanzada
   (el nivel más alto) va a eSAW (fuerte en firma de alta garantía); el resto a
   Signaturit (arranque más directo). Ver decisión de diseño en CLAUDE.md §6. */
const SIG_TYPE_PROVIDER = { advanced: 'esaw', simple: 'signaturit', email: 'signaturit', sms: 'signaturit' };
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
    note.innerHTML = '📱 Certified SMS has no document to build, so it skips the PDF Builder. It goes straight to sending — available once the builder→send bridge is connected.';
  } else {
    note.style.display = 'none';
  }
}
function sdContinueSendType() {
  if (!operationType) return;
  if (operationType === 'sms') {
    // SMS no tiene documento → saltea el builder. El envío se conecta con el puente.
    alert('Certified SMS skips the PDF Builder. Sending will be available when the bridge is connected.');
    return;
  }
  sdEnterBuilder(); // advanced / simple / email → builder
}

/* Continuar desde s-done. El usuario nuevo ya eligió el tipo de firma en el chat
   (operationType ya está seteado) → va directo al builder, sin volver a preguntar
   en s-sendtype. El cliente existente no pasó por el chat → elige el tipo ahí. */
function sdAfterDone() {
  if (operationType) {
    if (operationType === 'sms') {
      alert('Certified SMS skips the PDF Builder. Sending will be available when the bridge is connected.');
      return;
    }
    sdEnterBuilder();
  } else {
    sdGo('s-sendtype');
  }
}

/* ============ CHAT GUIADO ============
   El camino por detrás siempre es Signaturit. El chat educa mientras clasifica. */
const FLOW = [
  {
    key: 'sigType',
    bot: 'Hi! I\'m the Smart Dispatch assistant 👋<br><br>I\'ll help you find the plan that fits you. First: <b>what kind of signature do you need?</b><br><br><i>Not sure? Pick the closest one — I\'ll explain what each means.</i>',
    opts: [
      { label: 'Advanced signature', v: 'advanced' },
      { label: 'Simple signature', v: 'simple' },
      { label: 'Certified email', v: 'email' },
      { label: 'Certified SMS', v: 'sms' }
    ],
    info: (v) => ({
      advanced: '<b>Advanced signature.</b> The signer is uniquely identified — with biometrics or a digital certificate. It\'s the strongest, most legally robust option, ideal for contracts and important agreements.',
      simple: '<b>Simple signature.</b> Sign with a single click. Fast and frictionless — great for internal approvals or low-risk documents.',
      email: '<b>Certified email.</b> Sends your document with legal proof of delivery and content. No signature needed — you just want evidence that it was sent and received.',
      sms: '<b>Certified SMS.</b> A certified text message with legal proof of delivery, for short notices sent to a phone number.'
    }[v]),
    reply: (v) => ({ advanced: 'Advanced signature', simple: 'Simple signature', email: 'Certified email', sms: 'Certified SMS' }[v])
  },
  {
    key: 'freq',
    bot: 'Perfect. Before sizing: <b>is this something you\'ll do regularly, or a one-off send?</b>',
    opts: [
      { label: 'Every month', v: 'monthly' },
      { label: 'Just once', v: 'oneshot' },
      { label: 'Now and then', v: 'sometimes' }
    ],
    info: (v) => {
      if (v === 'monthly') return 'Then a monthly-quota plan suits you: build the template once and reuse it every month.';
      if (v === 'oneshot') return '<b>No need to subscribe to anything.</b> We have <b>one-time packs</b>: you pay for the batch, send it and you\'re done. No account, no renewal.';
      return '<b>A one-time pack works for you</b>: packs don\'t expire, so you use it when you need it.';
    },
    reply: (v) => ({ monthly: 'Every month', oneshot: 'Just once', sometimes: 'Now and then' }[v])
  },
  {
    key: 'vol',
    bot: () => isOneShot()
      ? 'Good. <b>How many documents do you need to send in this batch?</b><br><br><i>Minimum is 10 sends.</i>'
      : 'Perfect. To size it: <b>how many documents do you send to sign per month?</b>',
    opts: () => isOneShot()
      ? [{ label: '10 to 100', v: 'low' }, { label: '100 to 500', v: 'mid' }, { label: 'More than 500', v: 'high' }]
      : [{ label: 'Up to 100', v: 'low' }, { label: '100 to 1,000', v: 'mid' }, { label: 'More than 1,000', v: 'high' }],
    info: (v) => {
      if (isOneShot()) {
        if (v === 'low') return 'The <b>Small Pack</b> covers you. Build the template, cross it with your spreadsheet and send.';
        if (v === 'mid') return 'The <b>Medium Pack</b>. At that volume, building documents by hand takes hours: here you do it in minutes.';
        return 'The <b>Large Pack</b>. Heads up: if this repeats more than twice, a monthly plan is cheaper. Telling you anyway, even if it doesn\'t suit me 😅';
      }
      if (v === 'low') return 'At that volume, most people start <b>for free</b>. No need to pay until you grow.';
      if (v === 'mid') return 'That\'s the range where manual work starts to hurt: <b>~2 minutes per document</b> is over 30 hours a month.';
      return 'High volume. At that scale, every minute you save per document is <b>days of work per year</b>. You\'ll also want to connect your CRM.';
    },
    reply: (v) => isOneShot()
      ? ({ low: 'Between 10 and 100', mid: 'Between 100 and 500', high: 'More than 500' }[v])
      : ({ low: 'Up to 100 per month', mid: 'Between 100 and 1,000', high: 'More than 1,000' }[v])
  },
  {
    key: 'ia',
    bot: 'Got it. One that matters a lot: <b>do you want the AI to build the documents for you?</b><br><br>The AI reads your document, decides where each signature field goes and applies your brand. You confirm. <i>Without AI, everything still works — you just do it by hand.</i>',
    opts: [
      { label: 'Yes, let the AI do it', v: 'yes' },
      { label: 'I prefer manual', v: 'no' },
      { label: 'What does it do exactly?', v: 'explain' }
    ],
    info: (v) => {
      if (v === 'yes') return '<b>Nice.</b> The AI pre-fills for you: it places the fields, pulls the colors from your brand book and maps your spreadsheet columns. You always have the last word.';
      if (v === 'no') return '<b>Perfect, and it\'s free.</b> Manual mode does everything the same: load the document, place the fields, cross the spreadsheet. The AI just saves you clicks.';
      return null; // caso especial "explain"
    },
    reply: (v) => ({ yes: 'Yes, I want the AI', no: 'I prefer to do it manually', explain: 'What does it do exactly?' }[v])
  },
  {
    key: 'team',
    skipIf: () => isOneShot(),
    bot: 'And to wrap up — is this just for you, or would you like access for others on your team too?',
    opts: [
      { label: 'Just for me', v: '1' },
      { label: 'A few of us', v: 'few' },
      { label: 'My whole team', v: 'many' }
    ],
    info: (v) => {
      if (v === '1') return 'A single seat, all set. You can always add teammates later.';
      if (v === 'few') return 'We\'ll set up a few seats. Everyone shares the same templates and brand, so documents come out consistent.';
      return 'Access for the whole team. At that size it\'s worth having centralized templates so nobody sends an off-brand document.';
    },
    reply: (v) => ({ '1': 'Just for me', few: 'A few of us', many: 'My whole team' }[v])
  }
];

let chatStep = 0;
const sdChatLogEl = () => sd$('sdChatLog');
const sdChatActsEl = () => sd$('sdChatActions');

function sdScrollChat() { sdChatLogEl().scrollTop = sdChatLogEl().scrollHeight; }
function sdAddBot(html) {
  const d = document.createElement('div'); d.className = 'sd-msg';
  d.innerHTML = `<div class="bav">SD</div><div class="sd-bubble">${html}</div>`;
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
    d.innerHTML = '<div class="bav">SD</div><div class="sd-typing"><i></i><i></i><i></i></div>';
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
    sd$('sdChatProgress').textContent = `${idx} of ${total}`;
    const opts = typeof st.opts === 'function' ? st.opts() : st.opts;
    sdSetChips(opts, (o) => sdHandlePick(st, o));
  }, 650);
}

function sdHandlePick(st, o) {
  sdAddMe(st.reply(o.v));
  sdClearChips();

  // Caso especial: explicar la IA y volver a preguntar
  if (st.key === 'ia' && o.v === 'explain') {
    sdTyping(true);
    setTimeout(() => {
      sdTyping(false);
      sdAddBot('Let me show you with a real example 👇');
      setTimeout(() => {
        sdAddInfo('<b>Without AI:</b> you open the document, write <code>{{sign}}</code> where the signature goes, pick your color by hand and map each spreadsheet column.<br><br><b>With AI:</b> you upload the document and your brand book. The AI detects that the signature goes at the end, pulls your corporate color from the brand book and maps the columns itself. You review and confirm.<br><br>The difference is time, not capability: <b>both paths reach the same PDF</b>.');
        setTimeout(() => {
          sdAddBot('So?');
          sdSetChips([{ label: 'Yes, I want the AI', v: 'yes' }, { label: 'I prefer manual', v: 'no' }], (o2) => sdHandlePick(st, o2));
        }, 700);
      }, 500);
    }, 700);
    return;
  }

  A[st.key] = o.v;

  // Tipo de firma: fija operationType + asigna proveedor (helper compartido).
  if (st.key === 'sigType') sdSetSigType(o.v);

  const info = st.info(o.v);
  if (info) setTimeout(() => sdAddInfo(info), 400);

  // Para el tipo de firma, además de explicarlo mostramos la asignación de
  // proveedor (+ aviso si es eSAW, cuyo builder todavía está en integración).
  if (st.key === 'sigType') {
    setTimeout(() => sdAddInfo(sdProviderMsg(SIG_TYPE_PROVIDER[o.v])), 1000);
    setTimeout(() => { chatStep++; sdAskStep(chatStep); }, 1900);
    return;
  }

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

function sdProviderMsg(prov) {
  return prov === 'esaw'
    ? 'Advanced signatures run on <b>eSignAnywhere</b>, our provider for higher-assurance signing — we set that up for you, no need to choose.<br><br><i>Heads up: document generation for eSignAnywhere is still being wired up, so you can finish onboarding now and sending will follow shortly.</i>'
    : 'We\'ll set you up on <b>Signaturit</b> — the quickest way to start with this signature type. No need to pick a provider: we choose the best fit for you.';
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

  const applied = intent ? sdApplyIntent(intent) : [];

  if (!applied.length) {
    // No entendimos nada → guiar con el paso actual.
    sdAddBot('I didn\'t quite catch that 🤔 — let me guide you. Pick the option that fits best:');
    return sdAskStep(chatStep);
  }

  // Confirmamos lo entendido y seguimos por el primer paso sin responder.
  if (intent.reply) sdAddBot(intent.reply);
  else sdAddBot('Got it 👍');
  sdAdvanceFromIntent();
}

/* Aplica al estado A los campos válidos que trajo el intent. Devuelve la lista
   de campos aplicados. Maneja sigType especial (proveedor + provider msg). */
function sdApplyIntent(intent) {
  const order = ['sigType', 'freq', 'vol', 'ia', 'team'];
  const applied = [];
  order.forEach(k => {
    if (intent[k] == null) return;
    if (k === 'sigType') { sdSetSigType(intent[k]); setTimeout(() => sdAddInfo(sdProviderMsg(SIG_TYPE_PROVIDER[intent[k]])), 500); }
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
      ? `Done 🎯 No need to subscribe: based on what you told me, the <b>${C[rec].name}</b> fits you. Pay once and you're set.`
      : `Done 🎯 Based on what you told me, the plan that fits you is <b>${C[rec].name}</b>.<br><br>Here are the options so you can compare.`);
    sdChatActsEl().innerHTML = '';
    const b = document.createElement('button');
    b.className = 'sd-btn primary'; b.style.cssText = 'width:100%;justify-content:center';
    b.textContent = isOneShot() ? 'See the packs →' : 'See my plan →';
    b.onclick = sdComputePlan;
    sdChatActsEl().appendChild(b);
  }, 800);
}

function sdResetChat() {
  chatStep = 0;
  A.sigType = A.product = A.freq = A.vol = A.ia = A.team = null;
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
  const mask = t => t ? (t.slice(0, 12) + '…') : '••••';
  sd$('sdDoneTitle').textContent = ACC.isClient ? 'Session started' : 'You\'re all set!';
  sd$('sdDoneSub').textContent = ACC.isClient
    ? 'Your token is loaded in this session. It was not stored anywhere.'
    : `Your ${ACC.plan} account is ready. The token lives only in this session.`;
  sd$('sdRecap').innerHTML = `
    <div class="r"><span>${ACC.isClient ? 'Type' : 'Plan'}</span><span>${ACC.isClient ? 'Existing customer' : ACC.plan}${ACC.ia ? '<span class="sd-badge-ia">AI</span>' : ''}</span></div>
    <div class="r"><span>Token</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px">${mask(ACC.token)} · in memory</span></div>
    <div class="r"><span>Persistence</span><span style="color:var(--success)">None</span></div>
    <div class="r"><span>AI layer</span><span style="color:${ACC.ia ? 'var(--success)' : 'var(--text-muted)'}">${ACC.ia ? 'Enabled' : 'Manual mode'}</span></div>`;
}
