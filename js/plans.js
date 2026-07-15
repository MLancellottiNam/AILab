/* ============================================
   Smart Dispatch — Planes, packs y checkout (dummy)
   --------------------------------------------
   Recomienda plan/pack según las respuestas del chat (A), simula el pago y
   escribe el estado en ACC. Ese ACC es el que condiciona el builder.
   (UI en inglés; comentarios internos en español.)
   ============================================ */

const PACKS = {
  small:  { name: 'Small Pack',  for: 'A one-off send',        price: 19,  priceLabel: '€19',  limit: 100,  oneshot: true,
    note: 'Up to 100 documents · one-time payment',
    feats: [['PDF generator from Word/TXT', 1], ['Data from CSV, JSON, XLSX', 1], ['Bulk send with your token', 1], ['No subscription or renewal', 1], ['The pack never expires', 1], ['AI layer', 0]] },
  medium: { name: 'Medium Pack', for: 'One large batch, once', price: 49,  priceLabel: '€49',  limit: 500,  oneshot: true,
    note: 'Up to 500 documents · one-time payment',
    feats: [['Everything in the Small Pack', 1], ['Up to 500 documents', 1], ['AI: places the fields for you', 1], ['AI: applies your brand book', 1], ['No subscription or renewal', 1], ['The pack never expires', 1]] },
  large:  { name: 'Large Pack',  for: 'High volume, one-off',  price: 99,  priceLabel: '€99',  limit: 2000, oneshot: true,
    note: 'Up to 2,000 documents · one-time payment',
    feats: [['Everything in the Medium Pack', 1], ['Up to 2,000 documents', 1], ['Full AI', 1], ['Support during the send', 1], ['No subscription or renewal', 1], ['The pack never expires', 1]] }
};

const PLANS = {
  starter:    { name: 'Starter',    for: 'To get started solo',        price: 0,   priceLabel: 'Free', limit: 100,
    note: 'Up to 100 documents per month',
    feats: [['PDF generator from Word/TXT', 1], ['Data from CSV, JSON, XLSX', 1], ['Manual field placement', 1], ['Bulk send with your token', 1], ['AI layer', 0], ['Multi-user', 0]] },
  pro:        { name: 'Pro',        for: 'For teams that send often',  price: 49,  priceLabel: '€49',  limit: 1000,
    note: 'Up to 1,000 documents per month',
    feats: [['Everything in Starter', 1], ['AI: places the fields for you', 1], ['AI: automatic data mapping', 1], ['AI: applies your brand book', 1], ['Up to 5 users', 1], ['Priority support', 0]] },
  enterprise: { name: 'Enterprise', for: 'High volume, multiple teams', price: 199, priceLabel: '€199', limit: Infinity,
    note: 'Unlimited documents',
    feats: [['Everything in Pro', 1], ['Unlimited documents', 1], ['Unlimited users', 1], ['CRM integration', 1], ['Dedicated support + SLA', 1], ['Assisted onboarding', 1]] }
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
  if (isOneShot()) b.push(A.freq === 'oneshot' ? 'a one-off send' : 'occasional use');
  if (A.vol === 'low') b.push('low volume');
  if (A.vol === 'mid') b.push('medium volume');
  if (A.vol === 'high') b.push('high volume');
  b.push(A.ia === 'yes' ? 'you want the AI layer' : 'you prefer manual mode');
  if (A.team === '1') b.push('individual use');
  if (A.team === 'few') b.push('team of up to 5');
  if (A.team === 'many') b.push('more than 5 people');
  return `You told us: ${b.join(' · ')}. That's why we recommend <b>${catalog()[k].name}</b>.`;
}

function sdComputePlan() {
  const rec = recommend();
  const box = sd$('sdPlansBox');
  box.innerHTML = '';
  Object.entries(catalog()).forEach(([key, p]) => {
    const isRec = key === rec;
    const el = document.createElement('div');
    el.className = 'sd-plan' + (isRec ? ' rec' : '');
    el.innerHTML = `${isRec ? '<div class="tag">Recommended for you</div>' : ''}
      <h3>${p.name}</h3><div class="for">${p.for}</div>
      <div class="price">${p.priceLabel}${p.price ? (p.oneshot ? '<small> one-time</small>' : '<small>/mo</small>') : ''}</div>
      <div class="price-note">${p.note}</div>
      <ul>${p.feats.map(([f, on]) => `<li class="${on ? '' : 'off'}"><span class="ck">${on ? '✓' : '✕'}</span>${f}</li>`).join('')}</ul>
      <button class="sd-btn ${isRec ? 'primary' : 'ghost'}" onclick="sdChoose('${key}')">${p.price === 0 ? 'Start for free' : (p.oneshot ? 'Buy ' + p.name : 'Choose ' + p.name)}</button>`;
    box.appendChild(el);
  });
  sd$('sdPlansTitle').textContent = isOneShot() ? 'Your recommended pack' : 'Your recommended plan';
  sd$('sdPlanWhy').innerHTML = whyText(rec);
  sdGo('s-plans');
}

function sdChoose(key) {
  chosen = key;
  const p = catalog()[key];
  if (p.price === 0) { sdActivate(key, false); return; } // Starter gratis → sin checkout
  sd$('sdPayPlanName').textContent = (p.oneshot ? '' : 'Plan ') + p.name;
  sd$('sdPayAmount').innerHTML = `${p.priceLabel}<span style="font-size:13px;font-weight:400;opacity:.7">${p.oneshot ? ' one-time' : '/mo'}</span>`;
  sd$('sdPaySummary').innerHTML = `
    <div class="li"><span>${p.name}</span><span>${p.priceLabel}${p.oneshot ? '' : '/mo'}</span></div>
    <div class="li"><span>${p.note}</span><span></span></div>
    ${A.ia === 'yes' ? '<div class="li"><span>AI layer</span><span style="color:var(--success)">included</span></div>' : ''}
    ${p.oneshot ? '<div class="li"><span>Renewal</span><span style="color:var(--success)">None · one-time</span></div>' : ''}
    <div class="li tot"><span>Total today</span><span>${p.priceLabel}</span></div>`;
  sdGo('s-pay');
}

function sdPay() {
  const b = sd$('sdPayBtn');
  b.disabled = true; b.innerHTML = '<span class="sd-spinner"></span> Processing…';
  // TODO(Stripe): acá iría Stripe Checkout / Billing + webhook de confirmación.
  //               Hoy es un pago simulado (dummy) para la demo.
  setTimeout(() => { sdActivate(chosen, true); b.disabled = false; b.textContent = 'Pay and start'; }, 1500);
}

function sdActivate(key, paid) {
  const p = catalog()[key];
  const one = !!p.oneshot;
  ACC.plan = p.name;
  ACC.limit = p.limit;
  ACC.ia = one ? (key !== 'small') : ((key !== 'starter' && A.ia === 'yes') || key === 'enterprise');
  ACC.oneshot = one;
  ACC.isClient = false;
  // El plan quedó elegido; ahora pasa por el alta (crea la cuenta y te da el token).
  // El plan gratuito también pasa por acá (necesita token igual).
  sdStartSignup();
}

/* ===== Entrada al builder: aplica el plan y navega ===== */
function sdEnterBuilder() {
  // Pills del header compartido (sd-top): plan + IA + tipo de envío
  const stLabel = (typeof SD_SENDTYPE_LABEL !== 'undefined' && ACC.sendType) ? SD_SENDTYPE_LABEL[ACC.sendType] : null;
  const provLabel = ACC.provider === 'esaw' ? 'eSAW' : (ACC.provider ? 'Signaturit' : null);
  sd$('sdTopRight').innerHTML =
    `<span class="sd-pill plan">${ACC.plan}</span>` +
    (provLabel ? `<span class="sd-pill">${provLabel}</span>` : '') +
    (ACC.ia ? '<span class="sd-pill ia">AI active</span>' : '<span class="sd-pill">manual mode</span>') +
    (stLabel ? `<span class="sd-pill">${stLabel}</span>` : '');
  sdGo('s-builder'); // sdGo llama a sdbOnEnter() para reflejar ACC en el builder
}
