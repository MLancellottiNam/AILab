/* ============================================
   Smart Dispatch — Onboarding (fork + cliente + chat guiado)
   --------------------------------------------
   SPA de una sola página: secciones que se muestran/ocultan con sdGo(id).
   El estado vive en memoria y se comparte con el builder vía ACC.
   ============================================ */

const sd$ = id => document.getElementById(id);

/* ===== Estado compartido ===== */
const A = { product: null, freq: null, vol: null, ia: null, team: null }; // respuestas del chat
let chosen = null;                                                        // plan/pack elegido
const ACC = { plan: null, ia: false, limit: Infinity, oneshot: false, isClient: false };
const isOneShot = () => A.freq === 'oneshot' || A.freq === 'sometimes';

const CRUMBS = {
  's-fork': 'Empezar', 's-client': 'Ingreso', 's-quiz': 'Asistente',
  's-plans': 'Planes', 's-pay': 'Pago', 's-done': 'Confirmación', 's-builder': 'PDF Builder'
};

/* ===== Navegación ===== */
function sdGo(id) {
  document.querySelectorAll('.sd-screen').forEach(s => s.classList.remove('on'));
  sd$(id).classList.add('on');
  sd$('sdCrumb').textContent = CRUMBS[id] || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 's-quiz' && !sdChatLogEl().children.length) sdAskStep(0);
  if (id === 's-builder' && typeof sdbOnEnter === 'function') sdbOnEnter();
}
function sdPickOne(el) {
  el.parentElement.querySelectorAll('.sd-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}

/* ============ CHAT GUIADO ============
   El camino por detrás siempre es Signaturit. El chat educa mientras clasifica. */
const FLOW = [
  {
    key: 'product',
    bot: '¡Hola! Soy el asistente de Smart Dispatch 👋<br><br>Te ayudo a armar el plan que te sirve. Primero: <b>¿con qué producto de firma vas a enviar tus documentos?</b>',
    opts: [
      { label: 'Signaturit', v: 'signaturit' },
      { label: 'eSignAnywhere', v: 'esaw' },
      { label: 'Todavía no sé', v: 'unknown' }
    ],
    info: (v) => {
      if (v === 'signaturit') return '<b>Buena elección.</b> Signaturit coloca la firma por <i>ancla de texto</i>: escribís <code>{{firma}}</code> en tu documento y la firma aparece justo ahí. Sin calcular coordenadas.';
      if (v === 'esaw') return '<b>Anotado.</b> eSignAnywhere está en camino. Por ahora te armamos todo sobre <b>Signaturit</b>, y cuando eSAW esté listo migrás sin rehacer nada — el documento es el mismo.';
      return '<b>Sin problema.</b> Arrancamos con <b>Signaturit</b>, que es el más directo: la firma se coloca escribiendo <code>{{firma}}</code> en tu documento.';
    },
    reply: (v) => ({ signaturit: 'Uso Signaturit', esaw: 'Uso eSignAnywhere', unknown: 'Todavía no sé' }[v])
  },
  {
    key: 'freq',
    bot: 'Perfecto. Antes de dimensionar: <b>¿esto es algo que vas a hacer seguido, o es un envío puntual?</b>',
    opts: [
      { label: 'Todos los meses', v: 'monthly' },
      { label: 'Una sola vez', v: 'oneshot' },
      { label: 'Cada tanto', v: 'sometimes' }
    ],
    info: (v) => {
      if (v === 'monthly') return 'Entonces te conviene un plan con cuota mensual: armás la plantilla una vez y la reusás todos los meses.';
      if (v === 'oneshot') return '<b>No hace falta que te suscribas a nada.</b> Tenemos <b>packs de un solo uso</b>: pagás por el lote, lo mandás y listo. Sin cuenta, sin renovación.';
      return '<b>Un pack de un solo uso te sirve</b>: los packs no vencen, así que lo usás cuando lo necesites.';
    },
    reply: (v) => ({ monthly: 'Todos los meses', oneshot: 'Una sola vez', sometimes: 'Cada tanto' }[v])
  },
  {
    key: 'vol',
    bot: () => isOneShot()
      ? 'Bien. <b>¿Cuántos documentos tenés que mandar en este lote?</b><br><br><i>El mínimo son 10 envíos.</i>'
      : 'Perfecto. Para dimensionar: <b>¿cuántos documentos mandás a firmar por mes?</b>',
    opts: () => isOneShot()
      ? [{ label: '10 a 100', v: 'low' }, { label: '100 a 500', v: 'mid' }, { label: 'Más de 500', v: 'high' }]
      : [{ label: 'Hasta 100', v: 'low' }, { label: '100 a 1.000', v: 'mid' }, { label: 'Más de 1.000', v: 'high' }],
    info: (v) => {
      if (isOneShot()) {
        if (v === 'low') return 'El <b>Pack Chico</b> te cubre. Armás la plantilla, cruzás tu Excel y mandás.';
        if (v === 'mid') return 'El <b>Pack Mediano</b>. A ese volumen, armar los documentos a mano son varias horas: acá lo resolvés en minutos.';
        return 'El <b>Pack Grande</b>. Ojo: si esto se repite más de dos veces, un plan mensual te sale más barato. Te lo digo igual aunque no me convenga 😅';
      }
      if (v === 'low') return 'Con ese volumen, la mayoría arranca <b>gratis</b>. No hace falta que pagues hasta que crezcas.';
      if (v === 'mid') return 'Ese es el rango donde el armado manual empieza a doler: <b>~2 minutos por documento</b> son más de 30 horas al mes.';
      return 'Alto volumen. A esa escala, cada minuto que ahorrás por documento son <b>días de trabajo al año</b>. También vas a querer conectar tu CRM.';
    },
    reply: (v) => isOneShot()
      ? ({ low: 'Entre 10 y 100', mid: 'Entre 100 y 500', high: 'Más de 500' }[v])
      : ({ low: 'Hasta 100 por mes', mid: 'Entre 100 y 1.000', high: 'Más de 1.000' }[v])
  },
  {
    key: 'ia',
    bot: 'Entendido. Una que define bastante: <b>¿querés que la IA arme los documentos por vos?</b><br><br>La IA lee tu documento, decide dónde va cada campo de firma y aplica tu marca. Vos confirmás. <i>Sin IA, todo funciona igual — solo que lo hacés a mano.</i>',
    opts: [
      { label: 'Sí, que la IA lo haga', v: 'yes' },
      { label: 'Prefiero manual', v: 'no' },
      { label: '¿Qué hace exactamente?', v: 'explain' }
    ],
    info: (v) => {
      if (v === 'yes') return '<b>Buena.</b> La IA te pre-completa: coloca los campos, saca los colores de tu manual de marca y mapea las columnas de tu Excel. Vos tenés la última palabra.';
      if (v === 'no') return '<b>Perfecto, y es gratis.</b> El modo manual hace todo lo mismo: cargás el documento, ponés los campos, cruzás el Excel. La IA solo te ahorra los clics.';
      return null; // caso especial "explain"
    },
    reply: (v) => ({ yes: 'Sí, quiero la IA', no: 'Prefiero hacerlo manual', explain: '¿Qué hace exactamente?' }[v])
  },
  {
    key: 'team',
    skipIf: () => isOneShot(),
    bot: 'Última: <b>¿cuántas personas del equipo lo van a usar?</b>',
    opts: [
      { label: 'Solo yo', v: '1' },
      { label: '2 a 5', v: 'few' },
      { label: 'Más de 5', v: 'many' }
    ],
    info: (v) => {
      if (v === '1') return 'Listo, ya tengo todo lo que necesito.';
      if (v === 'few') return 'Un equipo chico. Todos comparten las mismas plantillas y marca, así los documentos salen consistentes.';
      return 'Varias áreas. A ese tamaño conviene tener plantillas centralizadas para que nadie mande un documento fuera de marca.';
    },
    reply: (v) => ({ '1': 'Solo yo', few: 'Entre 2 y 5', many: 'Más de 5 personas' }[v])
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
    sd$('sdChatProgress').textContent = `${idx} de ${total}`;
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
      sdAddBot('Te muestro con un ejemplo real 👇');
      setTimeout(() => {
        sdAddInfo('<b>Sin IA:</b> abrís el documento, escribís <code>{{firma}}</code> donde va la firma, elegís tu color a mano y mapeás cada columna del Excel.<br><br><b>Con IA:</b> subís el documento y tu manual de marca. La IA detecta que la firma va al cierre, saca tu color corporativo del brandbook y mapea las columnas sola. Vos revisás y confirmás.<br><br>La diferencia es tiempo, no capacidad: <b>los dos caminos llegan al mismo PDF</b>.');
        setTimeout(() => {
          sdAddBot('¿Entonces?');
          sdSetChips([{ label: 'Sí, quiero la IA', v: 'yes' }, { label: 'Prefiero manual', v: 'no' }], (o2) => sdHandlePick(st, o2));
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
      ? `Listo 🎯 No necesitás suscribirte: con lo que me contaste, te sirve el <b>${C[rec].name}</b>. Pagás una vez y listo.`
      : `Listo 🎯 Con lo que me contaste, el plan que te sirve es <b>${C[rec].name}</b>.<br><br>Te muestro las opciones para que compares.`);
    sdChatActsEl().innerHTML = '';
    const b = document.createElement('button');
    b.className = 'sd-btn primary'; b.style.cssText = 'width:100%;justify-content:center';
    b.textContent = isOneShot() ? 'Ver los packs →' : 'Ver mi plan →';
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

/* ===== Camino "ya soy cliente" ===== */
function sdEnterAsClient() {
  ACC.plan = 'Cliente'; ACC.ia = true; ACC.limit = Infinity; ACC.isClient = true; ACC.oneshot = false;
  sd$('sdDoneTitle').textContent = 'Sesión iniciada';
  sd$('sdDoneSub').textContent = 'Tu token quedó cargado en esta sesión. No se guardó en ningún lado.';
  sd$('sdRecap').innerHTML = `
    <div class="r"><span>Tipo</span><span>Cliente existente</span></div>
    <div class="r"><span>Token</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px">•••• solo en memoria</span></div>
    <div class="r"><span>Persistencia</span><span style="color:var(--success)">Ninguna</span></div>
    <div class="r"><span>Capa de IA</span><span style="color:var(--success)">Habilitada</span></div>`;
  sdGo('s-done');
}
