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
   'create-account' que llama a la API del producto y devuelve el api_token.
   Para la demo devolvemos el token de PREPRODUCCIÓN de Signaturit (mismo que
   usa el cliente existente), así el envío funciona de punta a punta. */
function createAccount(data, product) {
  return { token: SIG_PREPROD_TOKEN, product };
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

/* "Continuar": el alta ya generó el token y el chat ya definió plan, tipo de
   firma y proveedor. Vamos al paso de origen del documento (s-docsource) con
   todo precargado (token en memoria + proveedor que usará el envío). Saltamos
   s-client y s-done; el builder se alcanza al elegir cómo armar el documento. */
function sdFinishSignup() {
  ACC.token = signupToken;
  ACC.product = signupProduct;
  ACC.provider = signupProduct; // el proveedor del envío = el que definió el chat
  sd$('sdTok').value = signupToken; // el envío lee el token desde ACC.token
  // El select del envío (bulksend) usa la MISMA fuente: dejarlo alineado.
  const sel = document.getElementById('cfg-provider');
  if (sel) sel.value = ACC.provider;
  // SMS no tiene documento → no hay builder (el envío va por el puente).
  if (operationType === 'sms') { alert(t('sendtype.smsAlert')); return; }
  sdGo('s-docsource'); // elegir origen del documento (IA vs PDF propio) → builder
}

const sdEscConsole = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
