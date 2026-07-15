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
  sdRunTokenConsole(data, signupProduct);
}

/* Consola tipo terminal: muestra el POST y la respuesta línea por línea */
function sdRunTokenConsole(data, product) {
  const isEsaw = product === 'esaw';
  const productName = isEsaw ? 'eSignAnywhere' : 'Signaturit';
  const endpoint = isEsaw ? 'POST /api/v4/account' : 'POST /v3/accounts';
  const con = sd$('sdConsole');
  con.innerHTML = '';
  sd$('sdTokenBox').style.display = 'none';
  sd$('sdMailPreview').style.display = 'none';
  sd$('sdTokenEnter').style.display = 'none';

  const acct = createAccount(data, product);
  signupToken = acct.token;

  const body = JSON.stringify({
    first_name: data.first_name, last_name: data.last_name,
    email: data.email, company: data.company, username: data.username, phone: data.phone
  }, null, 2);

  const lines = [
    { html: `<span class="c-req">${endpoint}</span>  <span class="c-dim">Host: api.${isEsaw ? 'esignanywhere' : 'signaturit'}.com</span>`, d: 250 },
    { html: `<span class="c-dim">${sdEscConsole(body)}</span>`, d: 500 },
    { html: `<span class="c-dim">… creating account</span>`, d: 900 },
    { html: `<span class="c-ok">← 201 Created</span>`, d: 500 },
    { html: `{ "api_token": "<span class="c-key">${acct.token}</span>", "status": "active" }`, d: 400 },
    { html: `<span class="c-dim">// sending welcome email to ${sdEscConsole(data.email)}</span>`, d: 450 }
  ];

  let i = 0;
  const step = () => {
    if (i >= lines.length) return sdRevealToken(data, product, productName);
    con.innerHTML += (con.innerHTML ? '\n' : '') + lines[i].html;
    con.scrollTop = con.scrollHeight;
    const d = lines[i].d; i++;
    setTimeout(step, d);
  };
  step();
}

function sdRevealToken(data, product, productName) {
  sd$('sdTokenValue').textContent = signupToken;
  sd$('sdTokenBox').style.display = 'block';
  // El mail NO lleva el token: solo dice en qué producto tiene cuenta
  sd$('sdMailBody').innerHTML = `
    <b>Welcome to ${productName}, ${sdEscConsole(data.first_name)}!</b><br><br>
    Your account (<b>${sdEscConsole(data.email)}</b>) is ready. You now have access to ${productName}.<br><br>
    For security, your API token is never sent by email — you'll find it in your dashboard.`;
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
