/* ============================================
   Smart Dispatch — Alta de usuario nuevo (SIMULADA)
   --------------------------------------------
   Hoy ni Signaturit ni eSAW permiten crear cuentas por API. Simulamos el
   ida y vuelta. Todo aislado detrás de createAccount(): cuando exista la API
   real, se reemplaza por una Edge Function 'create-account' sin tocar el resto.
   (UI en inglés; comentarios internos en español.)
   ============================================ */

let signupToken = null;
let signupProduct = 'signaturit';

/* Producto elegido en el chat (unknown/existente → signaturit por defecto) */
function sdCurrentProduct() { return A.product === 'esaw' ? 'esaw' : 'signaturit'; }

/* Simulación del alta. TODO(alta real): reemplazar por fetch a la Edge Function
   'create-account' que llama a la API del producto y devuelve el api_token. */
function createAccount(data, product) {
  const prefix = product === 'esaw' ? 'esaw_live_' : 'sig_live_';
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return { token: prefix + rand, product };
}

function sdStartSignup() { sdGo('s-signup'); }

function sdSubmitSignup() {
  const data = {
    first_name: sd$('sdSuFirst').value.trim(),
    last_name: sd$('sdSuLast').value.trim(),
    email: sd$('sdSuEmail').value.trim(),
    company: sd$('sdSuCompany').value.trim(),
    username: sd$('sdSuUser').value.trim(),
    phone: sd$('sdSuPhone').value.trim()
  };
  signupProduct = sdCurrentProduct();
  sdGo('s-token');
  sdRunSetupProgress(data, signupProduct);
}

/* Animación de progreso: pasos secuenciales (spinner → check) + barra que se
   llena en ~5s, y recién al final revela el token. Reemplaza a la consola
   tipo terminal (decisión de Marcos, 2026-07). El alta sigue simulada:
   createAccount() se resuelve al instante, la demora es puramente de UX. */
function sdRunSetupProgress(data, product) {
  const isEsaw = product === 'esaw';
  const productName = isEsaw ? 'eSignAnywhere' : 'Signaturit';
  const planName = ACC.plan || 'Starter';
  const isFree = /starter/i.test(planName) || ACC.oneshot === false && ACC.plan == null;

  const wrap = sd$('sdSetup');
  sd$('sdTokenBox').style.display = 'none';
  sd$('sdMailPreview').style.display = 'none';
  sd$('sdTokenEnter').style.display = 'none';

  // El token se genera ya (la demora es visual), pero se revela al final.
  const acct = createAccount(data, product);
  signupToken = acct.token;

  // Pasos de la puesta en marcha. El de pago cambia según sea plan gratis o no.
  const steps = [
    { label: t('setup.connecting', { product: productName }) },
    { label: t('setup.creating') },
    { label: isFree ? t('setup.paymentFree', { plan: planName })
                    : t('setup.payment', { plan: planName }) },
    { label: t('setup.workspace') },
    { label: t('setup.issuing') },
    { label: t('setup.email') }
  ];

  // Markup: barra de progreso + lista de pasos.
  wrap.innerHTML = `
    <div class="sd-setup-bar"><span class="sd-setup-fill" id="sdSetupFill"></span></div>
    <div class="sd-setup-steps">
      ${steps.map((s, i) => `
        <div class="sd-setup-step" data-i="${i}">
          <span class="sd-setup-ic"></span>
          <span class="sd-setup-lbl">${sdEscConsole(s.label)}</span>
        </div>`).join('')}
    </div>`;

  const fill = sd$('sdSetupFill');
  const rows = [...wrap.querySelectorAll('.sd-setup-step')];
  const per = 820; // ms por paso → ~4.9s en total

  let i = 0;
  const run = () => {
    // cerrar el paso anterior como completado
    if (i > 0) rows[i - 1].classList.replace('active', 'done');
    if (i >= steps.length) {
      fill.style.width = '100%';
      return setTimeout(() => sdRevealToken(data, product, productName), 350);
    }
    rows[i].classList.add('active');
    fill.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
    i++;
    setTimeout(run, per);
  };
  run();
}

function sdRevealToken(data, product, productName) {
  sd$('sdTokenValue').textContent = signupToken;
  sd$('sdTokenBox').style.display = 'block';
  // El mail NO lleva el token ni nombra el proveedor (transparente para el cliente).
  sd$('sdMailBody').innerHTML = t('signup.mail.body', {
    name: sdEscConsole(data.first_name),
    email: sdEscConsole(data.email),
  });
  sd$('sdMailPreview').style.display = 'block';
  sd$('sdTokenEnter').style.display = '';
}

/* "Enter with this token": vuelve al fork/cliente con el token autocompletado
   y el producto preseleccionado. El plan ya elegido se mantiene (fromSignup). */
function sdFinishSignup() {
  fromSignup = true;
  ACC.token = signupToken;
  ACC.product = signupProduct;
  sd$('sdTok').value = signupToken;
  // preseleccionar el producto en s-client
  const opts = document.querySelectorAll('#s-client .sd-opt');
  opts.forEach(o => o.classList.remove('sel'));
  const idx = signupProduct === 'esaw' ? 1 : 0;
  if (opts[idx]) opts[idx].classList.add('sel');
  sdGo('s-client');
}

const sdEscConsole = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
