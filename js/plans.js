/* ============================================
   Smart Dispatch — Planes, packs y checkout (dummy)
   --------------------------------------------
   Recomienda plan/pack según las respuestas del chat (A), simula el pago y
   escribe el estado en ACC. Ese ACC es el que condiciona el builder.
   Textos vía i18n (t()); nombres de plan (Starter/Pro/Enterprise) son de marca
   y no se traducen; los packs sí (pack.name.*).
   ============================================ */

const PACKS = {
  small:  { nameKey: 'pack.name.small',  forKey: 'pack.for.small',  price: 19,  priceLabel: '€19',  limit: 100,  oneshot: true, noteKey: 'pack.note.small',
    feats: [['feat.pdfGen', 1], ['feat.data', 1], ['feat.bulk', 1], ['feat.noSub', 1], ['feat.neverExpires', 1], ['feat.ai', 0]] },
  medium: { nameKey: 'pack.name.medium', forKey: 'pack.for.medium', price: 49,  priceLabel: '€49',  limit: 500,  oneshot: true, noteKey: 'pack.note.medium',
    feats: [['feat.everythingSmall', 1], ['feat.upTo500', 1], ['feat.aiFields', 1], ['feat.aiBrand', 1], ['feat.noSub', 1], ['feat.neverExpires', 1]] },
  large:  { nameKey: 'pack.name.large',  forKey: 'pack.for.large',  price: 99,  priceLabel: '€99',  limit: 2000, oneshot: true, noteKey: 'pack.note.large',
    feats: [['feat.everythingMedium', 1], ['feat.upTo2000', 1], ['feat.fullAi', 1], ['feat.supportSend', 1], ['feat.noSub', 1], ['feat.neverExpires', 1]] }
};

const PLANS = {
  starter:    { name: 'Starter',    forKey: 'plan.for.starter',    price: 0,   priceLabel: '€0',   limit: 100,      noteKey: 'plan.note.starter',
    feats: [['feat.pdfGen', 1], ['feat.data', 1], ['feat.manualPlace', 1], ['feat.bulk', 1], ['feat.ai', 0], ['feat.multiUser', 0]] },
  pro:        { name: 'Pro',        forKey: 'plan.for.pro',        price: 49,  priceLabel: '€49',  limit: 1000,     noteKey: 'plan.note.pro',
    feats: [['feat.everythingStarter', 1], ['feat.aiFields', 1], ['feat.aiMapping', 1], ['feat.aiBrand', 1], ['feat.upTo5Users', 1], ['feat.prioritySupport', 0]] },
  enterprise: { name: 'Enterprise', forKey: 'plan.for.enterprise', price: 199, priceLabel: '€199', limit: Infinity, noteKey: 'plan.note.enterprise',
    feats: [['feat.everythingPro', 1], ['feat.unlimitedDocs', 1], ['feat.unlimitedUsers', 1], ['feat.crm', 1], ['feat.dedicatedSupport', 1], ['feat.assistedOnboarding', 1]] }
};

const catalog = () => isOneShot() ? PACKS : PLANS;
// Nombre a mostrar: plans usan marca (name); packs se traducen (nameKey).
const planName = p => p.name || t(p.nameKey);
const priceText = p => p.price === 0 ? t('price.free') : p.priceLabel;

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
  // Arrancamos con el TIPO DE FIRMA recomendado (el proveedor es transparente
  // para el cliente y no se menciona acá).
  const b = [];
  const st = sdSendTypeLabel(ACC.sendType);
  if (st) b.push(st);
  if (isOneShot()) b.push(A.freq === 'oneshot' ? t('why.oneshot') : t('why.occasional'));
  if (A.vol) b.push(t('why.vol.' + A.vol));
  b.push(A.ia === 'yes' ? t('why.ia.yes') : t('why.ia.no'));
  if (A.team) b.push(t('why.team.' + A.team));
  return t('why.text', { list: b.join(' · '), name: planName(catalog()[k]) });
}

function sdComputePlan() {
  const rec = recommend();
  const box = sd$('sdPlansBox');
  box.innerHTML = '';
  Object.entries(catalog()).forEach(([key, p]) => {
    const isRec = key === rec;
    const name = planName(p);
    const suffix = p.price ? (p.oneshot ? `<small> ${t('price.oneTime')}</small>` : `<small>${t('price.perMo')}</small>`) : '';
    const btn = p.price === 0 ? t('plan.startFree') : (p.oneshot ? t('plan.buy', { name }) : t('plan.choose', { name }));
    const el = document.createElement('div');
    el.className = 'sd-plan' + (isRec ? ' rec' : '');
    el.innerHTML = `${isRec ? `<div class="tag">${t('plans.recommendedFor')}</div>` : ''}
      <h3>${name}</h3><div class="for">${t(p.forKey)}</div>
      <div class="price">${priceText(p)}${suffix}</div>
      <div class="price-note">${t(p.noteKey)}</div>
      <ul>${p.feats.map(([f, on]) => `<li class="${on ? '' : 'off'}"><span class="ck">${on ? '✓' : '✕'}</span>${t(f)}</li>`).join('')}</ul>
      <button class="sd-btn ${isRec ? 'primary' : 'ghost'}" onclick="sdChoose('${key}')">${btn}</button>`;
    box.appendChild(el);
  });
  sd$('sdPlansTitle').textContent = isOneShot() ? t('plans.titlePack') : t('plans.titlePlan');
  sd$('sdPlanWhy').innerHTML = whyText(rec);
  sdGo('s-plans');
}

function sdChoose(key) {
  chosen = key;
  const p = catalog()[key];
  if (p.price === 0) { sdActivate(key, false); return; } // Starter gratis → sin checkout
  const name = planName(p);
  sd$('sdPayPlanName').textContent = name;
  sd$('sdPayAmount').innerHTML = `${priceText(p)}<span style="font-size:13px;font-weight:400;opacity:.7">${p.oneshot ? ' ' + t('price.oneTime') : t('price.perMo')}</span>`;
  sd$('sdPaySummary').innerHTML = `
    <div class="li"><span>${name}</span><span>${priceText(p)}${p.oneshot ? '' : t('price.perMo')}</span></div>
    <div class="li"><span>${t(p.noteKey)}</span><span></span></div>
    ${A.ia === 'yes' ? `<div class="li"><span>${t('pay.aiLayer')}</span><span style="color:var(--success)">${t('pay.included')}</span></div>` : ''}
    ${p.oneshot ? `<div class="li"><span>${t('pay.renewal')}</span><span style="color:var(--success)">${t('pay.none')}</span></div>` : ''}
    <div class="li tot"><span>${t('pay.totalToday')}</span><span>${priceText(p)}</span></div>`;
  sdGo('s-pay');
}

function sdPay() {
  const b = sd$('sdPayBtn');
  b.disabled = true; b.innerHTML = `<span class="sd-spinner"></span> ${t('pay.processing')}`;
  // TODO(Stripe): acá iría Stripe Checkout / Billing + webhook de confirmación.
  //               Hoy es un pago simulado (dummy) para la demo.
  setTimeout(() => { sdActivate(chosen, true); b.disabled = false; b.textContent = t('pay.btn'); }, 1500);
}

function sdActivate(key, paid) {
  const p = catalog()[key];
  const one = !!p.oneshot;
  ACC.plan = planName(p);
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
  const stLabel = sdSendTypeLabel(ACC.sendType);
  sd$('sdTopRight').innerHTML =
    `<span class="sd-pill plan">${ACC.plan}</span>` +
    (ACC.ia ? `<span class="sd-pill ia">${t('pill.aiActive')}</span>` : `<span class="sd-pill">${t('pill.manualMode')}</span>`) +
    (stLabel ? `<span class="sd-pill">${stLabel}</span>` : '');
  sdGo('s-builder'); // sdGo llama a sdbOnEnter() para reflejar ACC en el builder
}
