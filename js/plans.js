/* ============================================
   Smart Dispatch — Planes, packs y checkout (dummy)
   --------------------------------------------
   Recomienda plan/pack según las respuestas del chat (A), simula el pago y
   escribe el estado en ACC. Ese ACC es el que condiciona el builder.
   ============================================ */

const PACKS = {
  small:  { name: 'Pack Chico',   for: 'Un envío puntual',      price: 19,  priceLabel: '€19',  limit: 100,  oneshot: true,
    note: 'Hasta 100 documentos · pago único',
    feats: [['Generador de PDF desde Word/TXT', 1], ['Datos desde CSV, JSON, XLSX', 1], ['Envío masivo con tu token', 1], ['Sin suscripción ni renovación', 1], ['El pack no vence', 1], ['Capa de IA', 0]] },
  medium: { name: 'Pack Mediano', for: 'Un lote grande, una vez', price: 49,  priceLabel: '€49',  limit: 500,  oneshot: true,
    note: 'Hasta 500 documentos · pago único',
    feats: [['Todo lo del Pack Chico', 1], ['Hasta 500 documentos', 1], ['IA: coloca los campos sola', 1], ['IA: aplica tu manual de marca', 1], ['Sin suscripción ni renovación', 1], ['El pack no vence', 1]] },
  large:  { name: 'Pack Grande',  for: 'Alto volumen puntual',  price: 99,  priceLabel: '€99',  limit: 2000, oneshot: true,
    note: 'Hasta 2.000 documentos · pago único',
    feats: [['Todo lo del Pack Mediano', 1], ['Hasta 2.000 documentos', 1], ['IA completa', 1], ['Soporte durante el envío', 1], ['Sin suscripción ni renovación', 1], ['El pack no vence', 1]] }
};

const PLANS = {
  starter:    { name: 'Starter',    for: 'Para arrancar solo',            price: 0,   priceLabel: 'Gratis', limit: 100,
    note: 'Hasta 100 documentos por mes',
    feats: [['Generador de PDF desde Word/TXT', 1], ['Datos desde CSV, JSON, XLSX', 1], ['Colocación manual de campos', 1], ['Envío masivo con tu token', 1], ['Capa de IA', 0], ['Multi-usuario', 0]] },
  pro:        { name: 'Pro',        for: 'Para equipos que envían seguido', price: 49,  priceLabel: '€49',  limit: 1000,
    note: 'Hasta 1.000 documentos por mes',
    feats: [['Todo lo del plan Starter', 1], ['IA: coloca los campos sola', 1], ['IA: mapeo automático de datos', 1], ['IA: aplica tu manual de marca', 1], ['Hasta 5 usuarios', 1], ['Soporte prioritario', 0]] },
  enterprise: { name: 'Enterprise', for: 'Alto volumen y varias áreas',    price: 199, priceLabel: '€199', limit: Infinity,
    note: 'Documentos ilimitados',
    feats: [['Todo lo del plan Pro', 1], ['Documentos ilimitados', 1], ['Usuarios ilimitados', 1], ['Integración con CRM', 1], ['Soporte dedicado + SLA', 1], ['Onboarding asistido', 1]] }
};

const catalog = () => isOneShot() ? PACKS : PLANS;

function recommend() {
  if (isOneShot()) {
    if (A.vol === 'high') return 'large';
    if (A.vol === 'mid' || A.ia === 'yes') return 'medium';
    return 'small';
  }
  if (A.vol === 'high' || A.team === 'many') return 'enterprise';
  if (A.ia === 'yes' || A.vol === 'mid' || A.team === 'few') return 'pro';
  return 'starter';
}

function whyText(k) {
  const b = ['Signaturit']; // por detrás siempre arranca acá
  if (isOneShot()) b.push(A.freq === 'oneshot' ? 'un envío puntual' : 'uso ocasional');
  if (A.vol === 'low') b.push('bajo volumen');
  if (A.vol === 'mid') b.push('volumen medio');
  if (A.vol === 'high') b.push('alto volumen');
  b.push(A.ia === 'yes' ? 'querés la capa de IA' : 'preferís el modo manual');
  if (A.team === '1') b.push('uso individual');
  if (A.team === 'few') b.push('equipo de hasta 5');
  if (A.team === 'many') b.push('más de 5 personas');
  return `Nos dijiste: ${b.join(' · ')}. Por eso te recomendamos <b>${catalog()[k].name}</b>.`;
}

function sdComputePlan() {
  const rec = recommend();
  const box = sd$('sdPlansBox');
  box.innerHTML = '';
  Object.entries(catalog()).forEach(([key, p]) => {
    const isRec = key === rec;
    const el = document.createElement('div');
    el.className = 'sd-plan' + (isRec ? ' rec' : '');
    el.innerHTML = `${isRec ? '<div class="tag">Recomendado para vos</div>' : ''}
      <h3>${p.name}</h3><div class="for">${p.for}</div>
      <div class="price">${p.priceLabel}${p.price ? (p.oneshot ? '<small> pago único</small>' : '<small>/mes</small>') : ''}</div>
      <div class="price-note">${p.note}</div>
      <ul>${p.feats.map(([f, on]) => `<li class="${on ? '' : 'off'}"><span class="ck">${on ? '✓' : '✕'}</span>${f}</li>`).join('')}</ul>
      <button class="sd-btn ${isRec ? 'primary' : 'ghost'}" onclick="sdChoose('${key}')">${p.price === 0 ? 'Empezar gratis' : (p.oneshot ? 'Comprar ' + p.name : 'Elegir ' + p.name)}</button>`;
    box.appendChild(el);
  });
  sd$('sdPlansTitle').textContent = isOneShot() ? 'Tu pack recomendado' : 'Tu plan recomendado';
  sd$('sdPlanWhy').innerHTML = whyText(rec);
  sdGo('s-plans');
}

function sdChoose(key) {
  chosen = key;
  const p = catalog()[key];
  if (p.price === 0) { sdActivate(key, false); return; } // Starter gratis → sin checkout
  sd$('sdPayPlanName').textContent = (p.oneshot ? '' : 'Plan ') + p.name;
  sd$('sdPayAmount').innerHTML = `${p.priceLabel}<span style="font-size:13px;font-weight:400;opacity:.7">${p.oneshot ? ' único' : '/mes'}</span>`;
  sd$('sdPaySummary').innerHTML = `
    <div class="li"><span>${p.oneshot ? '' : 'Plan '}${p.name}</span><span>${p.priceLabel}${p.oneshot ? '' : '/mes'}</span></div>
    <div class="li"><span>${p.note}</span><span></span></div>
    ${A.ia === 'yes' ? '<div class="li"><span>Capa de IA</span><span style="color:var(--success)">incluida</span></div>' : ''}
    ${p.oneshot ? '<div class="li"><span>Renovación</span><span style="color:var(--success)">Ninguna · pago único</span></div>' : ''}
    <div class="li tot"><span>Total hoy</span><span>${p.priceLabel}</span></div>`;
  sdGo('s-pay');
}

function sdPay() {
  const b = sd$('sdPayBtn');
  b.disabled = true; b.innerHTML = '<span class="sd-spinner"></span> Procesando…';
  // TODO(Stripe): acá iría Stripe Checkout / Billing + webhook de confirmación.
  //               Hoy es un pago simulado (dummy) para la demo.
  setTimeout(() => { sdActivate(chosen, true); b.disabled = false; b.textContent = 'Pagar y empezar'; }, 1500);
}

function sdActivate(key, paid) {
  const p = catalog()[key];
  const one = !!p.oneshot;
  ACC.plan = p.name;
  ACC.limit = p.limit;
  ACC.ia = one ? (key !== 'small') : ((key !== 'starter' && A.ia === 'yes') || key === 'enterprise');
  ACC.oneshot = one;
  ACC.isClient = false;
  sd$('sdDoneTitle').textContent = paid ? '¡Pago confirmado!' : '¡Cuenta creada!';
  sd$('sdDoneSub').textContent = one
    ? `Tu ${p.name} está listo. Sin suscripción: usalo cuando quieras.`
    : (paid ? `Tu suscripción a ${p.name} está activa.` : 'Tu plan Starter está activo. Ya podés generar documentos.');
  sd$('sdRecap').innerHTML = `
    <div class="r"><span>${one ? 'Pack' : 'Plan'}</span><span>${p.name}${ACC.ia ? '<span class="sd-badge-ia">IA</span>' : ''}</span></div>
    <div class="r"><span>${one ? 'Pago' : 'Facturación'}</span><span>${p.price ? p.priceLabel + (one ? ' · único' : '/mes') : '—'}</span></div>
    <div class="r"><span>${one ? 'Documentos disponibles' : 'Límite de envíos'}</span><span>${p.limit === Infinity ? 'Ilimitado' : p.limit + (one ? '' : '/mes')}</span></div>
    ${one ? '<div class="r"><span>Renovación</span><span style="color:var(--success)">Ninguna</span></div>' : ''}
    <div class="r"><span>Capa de IA</span><span style="color:${ACC.ia ? 'var(--success)' : 'var(--text-muted)'}">${ACC.ia ? 'Habilitada' : 'Modo manual'}</span></div>`;
  sdGo('s-done');
}

/* ===== Entrada al builder: aplica el plan y navega ===== */
function sdEnterBuilder() {
  // Pills del header compartido (sd-top)
  sd$('sdTopRight').innerHTML = `<span class="sd-pill plan">${ACC.plan}</span>` +
    (ACC.ia ? '<span class="sd-pill ia">IA activa</span>' : '<span class="sd-pill">modo manual</span>');
  sdGo('s-builder'); // sdGo llama a sdbOnEnter() para reflejar ACC en el builder
}
