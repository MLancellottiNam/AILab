/* ============================================
   Smart Dispatch — Panel de consumo (créditos)
   --------------------------------------------
   Muestra el saldo del pack/plan: gauge de restantes, tiles Total/Usados/
   Restantes, barra de uso y desglose del último lote. Cero persistencia: el
   consumo (ACC.used) vive en memoria y se descuenta AL ENVIAR (no al generar);
   un envío rechazado o expirado no se reintegra.

   Accesos: botón "Ver mi consumo →" al terminar de enviar, y el pill del plan
   en el header (clickeable, muestra el saldo). El pill aparece SIEMPRE una vez
   que hay token (ACC.token).
   ============================================ */

const sdU$ = id => document.getElementById(id);
let sdUsageOrigin = 'app';

function sdUsageBalance() {
  const acc = typeof ACC !== 'undefined' ? ACC : { limit: Infinity, used: 0, plan: 'Demo' };
  const total = acc.limit;
  const used = acc.used || 0;
  const unlimited = !isFinite(total);
  const remaining = unlimited ? Infinity : Math.max(0, total - used);
  return { total, used, remaining, unlimited, plan: acc.plan || 'Plan' };
}

/* Pill del plan con saldo, clickeable → panel. Aparece apenas hay token. */
function sdRenderUsagePill() {
  const has = typeof ACC !== 'undefined' && !!ACC.token;
  const b = sdUsageBalance();
  const label = `${b.plan}${b.unlimited ? ' · ∞' : ' · ' + b.remaining + ' disp.'}`;

  // Header del onboarding (sd-top → #sdTopRight): reutiliza el pill .plan.
  const top = sdU$('sdTopRight');
  if (top && has) {
    let pill = top.querySelector('.sd-pill.plan');
    if (!pill) { pill = document.createElement('span'); pill.className = 'sd-pill plan'; top.insertBefore(pill, top.firstChild); }
    pill.textContent = label;
    pill.classList.add('sd-pill-click');
    pill.onclick = sdOpenUsage;
    pill.title = 'Ver mi consumo';
  }

  // Header del envío (app): botón #appUsagePill.
  const appPill = sdU$('appUsagePill');
  if (appPill) {
    if (has) { appPill.textContent = label; appPill.style.display = ''; }
    else { appPill.style.display = 'none'; }
  }
}

function sdOpenUsage() {
  const wrapEl = document.querySelector('.sd-wrap');
  const appActive = sdU$('appWrapper') && sdU$('appWrapper').classList.contains('active');
  sdUsageOrigin = appActive ? 'app' : ((wrapEl && getComputedStyle(wrapEl).display !== 'none') ? 'onboarding' : 'app');

  document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { if (!el.closest('#usageView')) el.style.display = 'none'; });
  const ov = sdU$('launcherOverlay'); if (ov) ov.classList.add('hidden');
  const wrap = sdU$('appWrapper'); if (wrap) wrap.classList.remove('active');
  sdU$('usageView').style.display = 'block';
  window.scrollTo({ top: 0 });
  sdUsageRender();
}

function sdCloseUsage() {
  sdU$('usageView').style.display = 'none';
  if (sdUsageOrigin === 'app') {
    const wrap = sdU$('appWrapper'); if (wrap) wrap.classList.add('active');
  } else {
    document.querySelectorAll('.sd-top, .sd-wrap').forEach(el => { if (!el.closest('#usageView')) el.style.display = ''; });
  }
}

function sdUsageInternal() {
  // Panel interno del proveedor. Ajustable: apunta al dashboard de Signaturit.
  window.open('https://app.signaturit.com', '_blank', 'noopener');
}

function sdUsageRender() {
  const b = sdUsageBalance();
  const fmt = n => (n === Infinity ? '∞' : String(n));

  sdU$('usageTitle').textContent = 'Your usage';
  sdU$('usagePlanLine').innerHTML = b.unlimited
    ? `${b.plan} · unlimited sends`
    : `${b.plan} · <b>${b.used}</b> of <b>${b.total}</b> sends used`;

  sdU$('usageTotal').textContent = fmt(b.total);
  sdU$('usageUsed').textContent = String(b.used);
  sdU$('usageLeft').textContent = fmt(b.remaining);
  sdU$('usageRemaining').textContent = fmt(b.remaining);
  sdU$('usageRemainingLbl').textContent = b.unlimited ? 'unlimited' : 'left';

  // Desglose del último lote enviado (si hay sendLog en memoria).
  const bd = sdU$('usageBreakdown');
  const log = (typeof sendLog !== 'undefined' && Array.isArray(sendLog)) ? sendLog : [];
  if (log.length) {
    const ok = log.filter(l => l.status === 'ok').length;
    const er = log.length - ok;
    bd.innerHTML = `<span class="ubd-lbl">Last batch</span>` +
      `<span class="stat-badge success">✓ ${ok} sent</span>` +
      (er ? `<span class="stat-badge error">✗ ${er} error(s)</span>` : '');
    bd.style.display = 'flex';
  } else {
    bd.style.display = 'none';
  }

  // Animaciones: gauge + barra arrancan en 0 y transicionan tras un pequeño delay.
  const C = 2 * Math.PI * 52; // circunferencia del gauge
  const fill = sdU$('usageGaugeFill');
  const bar = sdU$('usageBarFill');
  const frac = b.unlimited ? 1 : (b.total > 0 ? b.remaining / b.total : 0); // arco = restante
  const usedPct = b.unlimited ? 0 : (b.total > 0 ? Math.round((b.used / b.total) * 100) : 0);

  fill.style.strokeDasharray = C;
  fill.style.strokeDashoffset = C;          // empieza vacío
  bar.style.width = '0%';
  sdU$('usageBarTxt').textContent = b.unlimited ? 'Unlimited plan' : `${usedPct}% used`;

  setTimeout(() => {
    fill.style.strokeDashoffset = C * (1 - frac);
    bar.style.width = (b.unlimited ? 100 : usedPct) + '%';
  }, 180);
}

/* Se llama desde app.js al terminar de enviar: descuenta créditos (al ENVIAR)
   y refresca el pill del header. `n` = envíos efectivamente disparados. */
function sdUsageConsume(n) {
  if (typeof ACC === 'undefined' || !n) return;
  ACC.used = (ACC.used || 0) + n;
  sdRenderUsagePill();
}
