/* ============================================
   Smart Dispatch — Onboarding (fork + cliente + chat guiado)
   --------------------------------------------
   SPA de una sola página: secciones que se muestran/ocultan con sdGo(id).
   El estado vive en memoria y se comparte con el builder vía ACC.
   (UI en inglés; comentarios internos en español.)
   ============================================ */

const sd$ = id => document.getElementById(id);

/* ===== Estado compartido ===== */
const A = { product: null, freq: null, vol: null, ia: null, team: null }; // respuestas del chat
let chosen = null;                                                        // plan/pack elegido
const ACC = { plan: null, ia: false, limit: Infinity, oneshot: false, isClient: false, sendType: null, token: null, product: null };
const isOneShot = () => A.freq === 'oneshot' || A.freq === 'sometimes';
let fromSignup = false; // lo setea signup.js al volver del alta con el token

const CRUMBS = {
  's-fork': 'Start', 's-client': 'Sign in', 's-quiz': 'Assistant', 's-signup': 'Your details',
  's-token': 'Your token', 's-plans': 'Plans', 's-pay': 'Payment', 's-done': 'Confirmation',
  's-provider': 'Provider', 's-sendtype': 'Request type', 's-builder': 'PDF Builder'
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
  if (id === 's-provider') sdSyncProviderPreselect();
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
const SD_SENDTYPE_LABEL = { advanced: 'Advanced signature', simple: 'Simple signature', email: 'Certified email', sms: 'Certified SMS' };
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

/* ============ CHAT GUIADO ============
   El camino por detrás siempre es Signaturit. El chat educa mientras clasifica. */
const FLOW = [
  {
    key: 'product',
    bot: 'Hi! I\'m the Smart Dispatch assistant 👋<br><br>I\'ll help you build the plan that fits you. First: <b>which signature product will you use to send your documents?</b>',
    opts: [
      { label: 'Signaturit', v: 'signaturit' },
      { label: 'eSignAnywhere', v: 'esaw' },
      { label: 'Not sure yet', v: 'unknown' }
    ],
    info: (v) => {
      if (v === 'signaturit') return '<b>Great choice.</b> Signaturit places the signature by <i>text anchor</i>: you write <code>{{sign}}</code> in your document and the signature appears right there. No coordinates.';
      if (v === 'esaw') return '<b>Noted.</b> eSignAnywhere is on the way. For now we\'ll build everything on <b>Signaturit</b>, and when eSAW is ready you migrate without redoing anything — the document is the same.';
      return '<b>No problem.</b> We\'ll start with <b>Signaturit</b>, the most direct one: the signature is placed by writing <code>{{sign}}</code> in your document.';
    },
    reply: (v) => ({ signaturit: 'I use Signaturit', esaw: 'I use eSignAnywhere', unknown: 'Not sure yet' }[v])
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
    bot: 'Last one: <b>how many people on the team will use it?</b>',
    opts: [
      { label: 'Just me', v: '1' },
      { label: '2 to 5', v: 'few' },
      { label: 'More than 5', v: 'many' }
    ],
    info: (v) => {
      if (v === '1') return 'Done, I have everything I need.';
      if (v === 'few') return 'A small team. Everyone shares the same templates and brand, so documents come out consistent.';
      return 'Several areas. At that size it\'s worth having centralized templates so nobody sends an off-brand document.';
    },
    reply: (v) => ({ '1': 'Just me', few: 'Between 2 and 5', many: 'More than 5 people' }[v])
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
  const info = st.info(o.v);
  if (info) setTimeout(() => sdAddInfo(info), 400);
  setTimeout(() => { chatStep++; sdAskStep(chatStep); }, info ? 1100 : 500);
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
  A.product = A.freq = A.vol = A.ia = A.team = null;
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
