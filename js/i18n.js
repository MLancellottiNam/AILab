/* ============================================
   Namirial Dispatch — i18n del onboarding (ES / EN)
   --------------------------------------------
   Detecta el idioma del navegador (navigator.language): "es*" → español,
   cualquier otro → inglés. Expone:
   - SD_LANG: 'es' | 'en'
   - t(key): string traducido (cae a inglés y luego a la key si falta)
   - sdApplyI18n(): aplica las traducciones al HTML estático marcado con
     data-i18n / data-i18n-ph (placeholder) / data-i18n-title (title attr).

   Alcance: el ONBOARDING (parte de Hernán). El PDF Builder y el wizard de
   envío (parte de Marcos) quedan en inglés.
   ============================================ */

// Override opcional para dev/pruebas: localStorage.setItem('SD_LANG', 'es'|'en').
// Por defecto detecta el idioma del navegador (navigator.language).
const SD_LANG = (function () {
  const ov = (typeof localStorage !== 'undefined') && localStorage.getItem('SD_LANG');
  if (ov === 'es' || ov === 'en') return ov;
  return (typeof navigator !== 'undefined' && /^es/i.test(navigator.language || '')) ? 'es' : 'en';
})();

const I18N = {
  en: {
    // top bar
    'top.tagline': 'demo · simulated payments',
    // crumbs
    'crumb.s-fork': 'Start', 'crumb.s-client': 'Sign in', 'crumb.s-quiz': 'Assistant',
    'crumb.s-signup': 'Your details', 'crumb.s-token': 'Your account', 'crumb.s-plans': 'Plans',
    'crumb.s-pay': 'Payment', 'crumb.s-done': 'Confirmation', 'crumb.s-sendtype': 'Request type',
    'crumb.s-builder': 'PDF Builder', 'crumb.s-docsource': 'Document',
    'docsource.title': 'How do you want your document?',
    'docsource.lead': "Build it from your data with our AI, or bring a PDF you already have. Either way, we'll send it for signature.",
    'docsource.ai.title': 'Create a PDF with Namirial AI',
    'docsource.ai.desc': 'Start from your data and a short brief. The AI drafts the document, you brand it, and we generate one signed-ready PDF per recipient.',
    'docsource.ai.cta': 'Build with AI →',
    'docsource.own.title': 'I already have my PDF',
    'docsource.own.desc': 'Upload your own PDF(s) and a recipient list. We map the columns and send them for signature — no document generation.',
    'docsource.own.cta': 'Upload and send →',
    // common
    'common.back': '← Back',
    // fork
    'fork.title': "Let's get started",
    'fork.lead': "Turn a document and a data source into a batch of PDFs ready to sign. Tell us who you are and we'll build your plan.",
    'fork.client.title': "I'm already a customer",
    'fork.client.desc': 'You have an active account. Sign in with your token and use the tool.',
    'fork.client.cta': 'Sign in with my token →',
    'fork.new.title': 'I want to start',
    'fork.new.desc': "Not a customer yet. Answer a few questions and we'll recommend the plan that fits you.",
    'fork.new.cta': 'Build my plan →',
    // client
    'client.title': 'Sign in with your token',
    'client.lead': "Your credentials live only in this session. We don't store tokens, documents or data.",
    'client.product': 'Signature product',
    'client.tokenLabel': 'API token',
    'client.tokenHint': '🔒 The token travels in each request header and is discarded. It never touches disk or a database.',
    'client.enter': 'Enter the tool →',
    // quiz
    'quiz.title': 'Tell us what you need',
    'quiz.lead': "Let's chat for a minute and we'll build the plan that fits you, without overselling.",
    'quiz.assistant': 'Namirial Dispatch Assistant',
    'quiz.online': 'online',
    'quiz.inputPh': 'Type what you need… e.g. “I need to send 300 contracts for signature”',
    'quiz.startOver': '← Start over',
    // plans
    'plans.changeAnswers': '← Change answers',
    'plans.titlePlan': 'Your recommended plan',
    'plans.titlePack': 'Your recommended pack',
    'plans.recommendedFor': 'Recommended for you',
    // pay
    'pay.title': 'Confirm your subscription',
    'pay.lead': 'Simulated payment for the demo. No real card is charged.',
    'pay.email': 'Email', 'pay.card': 'Card number', 'pay.expiry': 'Expiry', 'pay.cvc': 'CVC',
    'pay.btn': 'Pay and start',
    'pay.dummy': '🧪 Dummy integration. In production this would be Stripe Checkout / Billing with a confirmation webhook.',
    'pay.chooseAnother': '← Choose another plan',
    // signup
    'signup.title': 'Your details',
    'signup.lead': 'We create your signature account and hand you back a token. Nothing is stored on our side.',
    'signup.first': 'First name', 'signup.last': 'Last name', 'signup.email': 'Email',
    'signup.company': 'Company', 'signup.username': 'Username', 'signup.phone': 'Phone',
    'signup.note': "ℹ️ Automatic account creation via API isn't available yet. In this demo we simulate the round-trip.",
    'signup.create': 'Create my account →',
    // token
    'token.title': 'Your account',
    'token.lead': 'Setting up your account — this only takes a moment.',
    'setup.connecting': 'Connecting to {product}',
    'setup.creating': 'Creating your account',
    'setup.payment': 'Authorizing payment · {plan}',
    'setup.paymentFree': 'Confirming your {plan} plan',
    'setup.workspace': 'Provisioning your workspace',
    'setup.issuing': 'Issuing your API token',
    'setup.email': 'Sending your welcome email',
    'setup.done': 'Account ready',
    'token.genLabel': 'Generated token (lives only in this session)',
    'token.mailHead': '📧 Welcome email preview',
    'token.enter': 'Continue →',
    // done
    'done.continue': 'Continue →',
    // sendtype
    'sendtype.title': 'What are you sending?',
    'sendtype.lead': "Pick the request type. It's the same set the bulk sender already supports.",
    'sendtype.recommended': 'Recommended',
    'sendtype.advanced': 'Advanced signature', 'sendtype.advancedDesc': 'Biometric or digital certificate',
    'sendtype.simple': 'Simple signature', 'sendtype.simpleDesc': 'One-click signing',
    'sendtype.email': 'Certified email', 'sendtype.emailDesc': 'Certify your communications',
    'sendtype.sms': 'Certified SMS', 'sendtype.smsDesc': 'Certify your text messages',
    'sendtype.continue': 'Continue →',

    // ===== chat FLOW =====
    'chat.q.sigType': "Hi! I'm the Namirial Dispatch assistant 👋<br><br>I'll help you find the plan that fits you. First: <b>what kind of signature do you need?</b><br><br><i>Not sure? Pick the closest one — I'll explain what each means.</i>",
    'chat.opt.advanced': 'Advanced signature', 'chat.opt.simple': 'Simple signature',
    'chat.opt.email': 'Certified email', 'chat.opt.sms': 'Certified SMS',
    'chat.info.advanced': '<b>Advanced signature.</b> The signer is uniquely identified — with biometrics or a digital certificate. It\'s the strongest, most legally robust option, ideal for contracts and important agreements.',
    'chat.info.simple': '<b>Simple signature.</b> Sign with a single click. Fast and frictionless — great for internal approvals or low-risk documents.',
    'chat.info.email': '<b>Certified email.</b> Sends your document with legal proof of delivery and content. No signature needed — you just want evidence that it was sent and received.',
    'chat.info.sms': '<b>Certified SMS.</b> A certified text message with legal proof of delivery, for short notices sent to a phone number.',

    'chat.q.freq': 'Perfect. Before sizing: <b>is this something you\'ll do regularly, or a one-off send?</b>',
    'chat.opt.monthly': 'Every month', 'chat.opt.oneshot': 'Just once', 'chat.opt.sometimes': 'Now and then',
    'chat.info.monthly': 'Then a monthly-quota plan suits you: build the template once and reuse it every month.',
    'chat.info.oneshot': '<b>No need to subscribe to anything.</b> We have <b>one-time packs</b>: you pay for the batch, send it and you\'re done. No account, no renewal.',
    'chat.info.sometimes': '<b>A one-time pack works for you</b>: packs don\'t expire, so you use it when you need it.',

    'chat.q.vol.oneshot': 'Good. <b>How many documents do you need to send in this batch?</b>',
    'chat.q.vol.monthly': 'Perfect. To size it: <b>how many documents do you send to sign per month?</b>',
    'chat.opt.vol.low.oneshot': '10 to 100', 'chat.opt.vol.mid.oneshot': '100 to 500', 'chat.opt.vol.high.oneshot': 'More than 500',
    'chat.opt.vol.low.monthly': 'Up to 100', 'chat.opt.vol.mid.monthly': '100 to 1,000', 'chat.opt.vol.high.monthly': 'More than 1,000',
    'chat.info.vol.low.oneshot': 'The <b>Small Pack</b> covers you. Build the template, cross it with your spreadsheet and send.',
    'chat.info.vol.mid.oneshot': 'The <b>Medium Pack</b>. At that volume, building documents by hand takes hours: here you do it in minutes.',
    'chat.info.vol.high.oneshot': 'The <b>Large Pack</b>. Heads up: if this repeats more than twice, a monthly plan is cheaper. Telling you anyway, even if it doesn\'t suit me 😅',
    'chat.info.vol.low.monthly': 'At that volume, most people start <b>for free</b>. No need to pay until you grow.',
    'chat.info.vol.mid.monthly': 'That\'s the range where manual work starts to hurt: <b>~2 minutes per document</b> is over 30 hours a month.',
    'chat.info.vol.high.monthly': 'High volume. At that scale, every minute you save per document is <b>days of work per year</b>.',

    'chat.q.team': 'And to wrap up — is this just for you, or would you like access for others on your team too?',
    'chat.opt.team.1': 'Just for me', 'chat.opt.team.few': 'A few of us', 'chat.opt.team.many': 'My whole team',
    'chat.info.team.1': 'A single seat, all set. You can always add teammates later.',
    'chat.info.team.few': 'We\'ll set up a few seats. Everyone shares the same templates and brand, so documents come out consistent.',
    'chat.info.team.many': 'Access for the whole team. At that size it\'s worth having centralized templates so nobody sends an off-brand document.',

    // chat replies (user bubbles)
    'chat.reply.advanced': 'Advanced signature', 'chat.reply.simple': 'Simple signature',
    'chat.reply.email': 'Certified email', 'chat.reply.sms': 'Certified SMS',
    'chat.reply.monthly': 'Every month', 'chat.reply.oneshot': 'Just once', 'chat.reply.sometimes': 'Now and then',
    'chat.reply.vol.low.oneshot': 'Between 10 and 100', 'chat.reply.vol.mid.oneshot': 'Between 100 and 500', 'chat.reply.vol.high.oneshot': 'More than 500',
    'chat.reply.vol.low.monthly': 'Up to 100 per month', 'chat.reply.vol.mid.monthly': 'Between 100 and 1,000', 'chat.reply.vol.high.monthly': 'More than 1,000',
    'chat.reply.team.1': 'Just for me', 'chat.reply.team.few': 'A few of us', 'chat.reply.team.many': 'My whole team',

    // chat misc
    'chat.gotIt': 'Got it 👍',
    'chat.notUnderstood': "I didn't quite catch that 🤔 — let me guide you. Pick the option that fits best:",
    'chat.offTopic': "I can only help you set up your document signing (signature type, volume, how often, team) 🙂 — that's outside what I handle. Let's get back to it:",
    'chat.progress': '{i} of {total}',
    'chat.done.pack': 'Done 🎯 Based on what you told me, the <b>{name}</b> fits you. Pay once and you\'re set.',
    'chat.done.plan': 'Done 🎯 Based on what you told me, the plan that fits you is <b>{name}</b>.<br><br>Here are the options so you can compare.',
    'chat.seePacks': 'Continue →', 'chat.seePlan': 'Continue →',

    // plans/packs
    'plan.for.starter': 'To get started solo', 'plan.note.starter': 'Up to 100 documents per month',
    'plan.for.pro': 'For teams that send often', 'plan.note.pro': 'Up to 1,000 documents per month',
    'plan.for.enterprise': 'High volume, multiple teams', 'plan.note.enterprise': 'Unlimited documents',
    'pack.name.small': 'Small Pack', 'pack.for.small': 'A one-off send', 'pack.note.small': 'Up to 100 documents · one-time payment',
    'pack.name.medium': 'Medium Pack', 'pack.for.medium': 'One large batch, once', 'pack.note.medium': 'Up to 500 documents · one-time payment',
    'pack.name.large': 'Large Pack', 'pack.for.large': 'High volume, one-off', 'pack.note.large': 'Up to 2,000 documents · one-time payment',
    'price.free': 'Free', 'price.oneTime': 'one-time', 'price.perMo': '/mo',
    'plan.startFree': 'Start for free', 'plan.buy': 'Buy {name}', 'plan.choose': 'Choose {name}',
    'why.text': 'You told us: {list}. That\'s why we recommend <b>{name}</b>.',
    'why.oneshot': 'a one-off send', 'why.occasional': 'occasional use',
    'why.vol.low': 'low volume', 'why.vol.mid': 'medium volume', 'why.vol.high': 'high volume',
    'why.team.1': 'individual use', 'why.team.few': 'team of up to 5', 'why.team.many': 'more than 5 people',
    // features
    'feat.pdfGen': 'PDF generator from Word/TXT', 'feat.data': 'Data from CSV, JSON, XLSX',
    'feat.bulk': 'Bulk send with your token', 'feat.noSub': 'No subscription or renewal',
    'feat.neverExpires': 'The pack never expires', 'feat.ai': 'Namirial Dispatch drafting',
    'feat.manualPlace': 'Manual field placement', 'feat.multiUser': 'Multi-user',
    'feat.everythingSmall': 'Everything in the Small Pack', 'feat.upTo500': 'Up to 500 documents',
    'feat.aiFields': 'Namirial Dispatch places the fields for you', 'feat.aiBrand': 'Namirial Dispatch applies your brand book',
    'feat.everythingMedium': 'Everything in the Medium Pack', 'feat.upTo2000': 'Up to 2,000 documents',
    'feat.fullAi': 'Full Namirial Dispatch drafting', 'feat.supportSend': 'Support during the send',
    'feat.everythingStarter': 'Everything in Starter', 'feat.aiMapping': 'Namirial Dispatch: automatic data mapping',
    'feat.upTo5Users': 'Up to 5 users', 'feat.prioritySupport': 'Priority support',
    'feat.everythingPro': 'Everything in Pro', 'feat.unlimitedDocs': 'Unlimited documents',
    'feat.unlimitedUsers': 'Unlimited users', 'feat.crm': 'CRM integration',
    'feat.dedicatedSupport': 'Dedicated support + SLA', 'feat.assistedOnboarding': 'Assisted onboarding',
    // pay summary
    'pay.plan.suffix': 'plan', 'pay.included': 'included', 'pay.aiLayer': 'Namirial Dispatch drafting',
    'pay.renewal': 'Renewal', 'pay.none': 'None · one-time', 'pay.totalToday': 'Total today',
    'pay.processing': 'Processing…',
    // done / recap
    'done.title.client': 'Session started', 'done.title.new': "You're all set!",
    'done.sub.client': 'Your token is loaded in this session. It was not stored anywhere.',
    'done.sub.new': 'Your {plan} account is ready. The token lives only in this session.',
    'recap.type': 'Type', 'recap.plan': 'Plan', 'recap.existingCustomer': 'Existing customer',
    'recap.token': 'Token', 'recap.inMemory': 'in memory', 'recap.persistence': 'Persistence', 'recap.none': 'None',
    'recap.aiLayer': 'Namirial Dispatch drafting', 'recap.enabled': 'Enabled', 'recap.manual': 'Manual mode',
    // signup console/email
    'signup.creating': '… creating account', 'signup.sendingMail': 'sending welcome email to {email}',
    'signup.mail.body': '<b>Welcome, {name}!</b><br><br>Your account (<b>{email}</b>) is ready. You now have access.<br><br>For security, your API token is never sent by email — you\'ll find it in your dashboard.',
    // sendtype note
    'sendtype.smsNote': '📱 Certified SMS has no document to build, so it skips the PDF Builder. It goes straight to sending — available once the builder→send bridge is connected.',
    'sendtype.smsAlert': 'Certified SMS skips the PDF Builder. Sending will be available when the bridge is connected.',
    // header pills
    'pill.aiActive': 'Namirial Dispatch', 'pill.manualMode': 'manual mode',
  },

  es: {
    'top.tagline': 'demo · pagos simulados',
    'crumb.s-fork': 'Inicio', 'crumb.s-client': 'Ingresar', 'crumb.s-quiz': 'Asistente',
    'crumb.s-signup': 'Tus datos', 'crumb.s-token': 'Tu cuenta', 'crumb.s-plans': 'Planes',
    'crumb.s-pay': 'Pago', 'crumb.s-done': 'Confirmación', 'crumb.s-sendtype': 'Tipo de envío',
    'crumb.s-builder': 'PDF Builder', 'crumb.s-docsource': 'Documento',
    'docsource.title': '¿Cómo querés tu documento?',
    'docsource.lead': 'Armalo desde tus datos con nuestra IA, o traé un PDF que ya tengas. En ambos casos lo mandamos a firmar.',
    'docsource.ai.title': 'Crear un PDF con Namirial IA',
    'docsource.ai.desc': 'Partí de tus datos y una idea corta. La IA redacta el documento, vos le ponés la marca y generamos un PDF listo para firmar por destinatario.',
    'docsource.ai.cta': 'Armar con IA →',
    'docsource.own.title': 'Ya tengo mi PDF',
    'docsource.own.desc': 'Subí tu(s) PDF(s) y una lista de destinatarios. Mapeamos las columnas y los mandamos a firmar — sin generar documento.',
    'docsource.own.cta': 'Subir y enviar →',
    'common.back': '← Volver',
    'fork.title': 'Empecemos',
    'fork.lead': 'Convertí un documento y una base de datos en un lote de PDFs listos para firmar. Contanos quién sos y armamos tu plan.',
    'fork.client.title': 'Ya soy cliente',
    'fork.client.desc': 'Tenés una cuenta activa. Ingresá con tu token y usá la herramienta.',
    'fork.client.cta': 'Ingresar con mi token →',
    'fork.new.title': 'Quiero empezar',
    'fork.new.desc': 'Todavía no sos cliente. Respondé unas preguntas y te recomendamos el plan que te sirve.',
    'fork.new.cta': 'Armar mi plan →',
    'client.title': 'Ingresá con tu token',
    'client.lead': 'Tus credenciales viven solo en esta sesión. No guardamos tokens, documentos ni datos.',
    'client.product': 'Producto de firma',
    'client.tokenLabel': 'Token de API',
    'client.tokenHint': '🔒 El token viaja en el header de cada request y se descarta. Nunca toca disco ni base de datos.',
    'client.enter': 'Entrar a la herramienta →',
    'quiz.title': 'Contanos qué necesitás',
    'quiz.lead': 'Charlemos un minuto y te armamos el plan que te sirve, sin venderte de más.',
    'quiz.assistant': 'Asistente Namirial Dispatch',
    'quiz.online': 'en línea',
    'quiz.inputPh': 'Escribí lo que necesitás… ej. “Necesito enviar 300 contratos para firmar”',
    'quiz.startOver': '← Empezar de nuevo',
    'plans.changeAnswers': '← Cambiar respuestas',
    'plans.titlePlan': 'Tu plan recomendado',
    'plans.titlePack': 'Tu pack recomendado',
    'plans.recommendedFor': 'Recomendado para vos',
    'pay.title': 'Confirmá tu suscripción',
    'pay.lead': 'Pago simulado para la demo. No se cobra ninguna tarjeta real.',
    'pay.email': 'Email', 'pay.card': 'Número de tarjeta', 'pay.expiry': 'Vencimiento', 'pay.cvc': 'CVC',
    'pay.btn': 'Pagar y empezar',
    'pay.dummy': '🧪 Integración dummy. En producción sería Stripe Checkout / Billing con webhook de confirmación.',
    'pay.chooseAnother': '← Elegir otro plan',
    'signup.title': 'Tus datos',
    'signup.lead': 'Creamos tu cuenta de firma y te devolvemos un token. No guardamos nada de nuestro lado.',
    'signup.first': 'Nombre', 'signup.last': 'Apellido', 'signup.email': 'Email',
    'signup.company': 'Empresa', 'signup.username': 'Usuario', 'signup.phone': 'Teléfono',
    'signup.note': 'ℹ️ La creación de cuenta por API todavía no está disponible. En esta demo simulamos el ida y vuelta.',
    'signup.create': 'Crear mi cuenta →',
    'token.title': 'Tu cuenta',
    'token.lead': 'Estamos creando tu cuenta — tarda solo un momento.',
    'setup.connecting': 'Conectando con {product}',
    'setup.creating': 'Creando tu cuenta',
    'setup.payment': 'Autorizando el pago · {plan}',
    'setup.paymentFree': 'Confirmando tu plan {plan}',
    'setup.workspace': 'Preparando tu espacio de trabajo',
    'setup.issuing': 'Generando tu token de API',
    'setup.email': 'Enviando tu email de bienvenida',
    'setup.done': 'Cuenta lista',
    'token.genLabel': 'Token generado (vive solo en esta sesión)',
    'token.mailHead': '📧 Vista previa del email de bienvenida',
    'token.enter': 'Continuar →',
    'done.continue': 'Continuar →',
    'sendtype.title': '¿Qué vas a enviar?',
    'sendtype.lead': 'Elegí el tipo de solicitud. Es el mismo conjunto que ya soporta el envío masivo.',
    'sendtype.recommended': 'Recomendado',
    'sendtype.advanced': 'Firma avanzada', 'sendtype.advancedDesc': 'Biométrica o certificado digital',
    'sendtype.simple': 'Firma simple', 'sendtype.simpleDesc': 'Firma de un clic',
    'sendtype.email': 'Email certificado', 'sendtype.emailDesc': 'Certificá tus comunicaciones',
    'sendtype.sms': 'SMS certificado', 'sendtype.smsDesc': 'Certificá tus mensajes de texto',
    'sendtype.continue': 'Continuar →',

    'chat.q.sigType': '¡Hola! Soy el asistente de Namirial Dispatch 👋<br><br>Te ayudo a encontrar el plan que te sirve. Primero: <b>¿qué tipo de firma necesitás?</b><br><br><i>¿No estás seguro? Elegí la más parecida — te explico cada una.</i>',
    'chat.opt.advanced': 'Firma avanzada', 'chat.opt.simple': 'Firma simple',
    'chat.opt.email': 'Email certificado', 'chat.opt.sms': 'SMS certificado',
    'chat.info.advanced': '<b>Firma avanzada.</b> Identifica al firmante de forma única — con biometría o certificado digital. Es la opción más robusta legalmente, ideal para contratos y acuerdos importantes.',
    'chat.info.simple': '<b>Firma simple.</b> Firmá con un solo clic. Rápida y sin fricción — ideal para aprobaciones internas o documentos de bajo riesgo.',
    'chat.info.email': '<b>Email certificado.</b> Envía tu documento con prueba legal de entrega y contenido. Sin firma — solo querés evidencia de que se envió y se recibió.',
    'chat.info.sms': '<b>SMS certificado.</b> Un mensaje de texto certificado con prueba legal de entrega, para avisos cortos a un teléfono.',

    'chat.q.freq': 'Perfecto. Antes de dimensionar: <b>¿es algo que vas a hacer seguido, o un envío puntual?</b>',
    'chat.opt.monthly': 'Todos los meses', 'chat.opt.oneshot': 'Una sola vez', 'chat.opt.sometimes': 'De vez en cuando',
    'chat.info.monthly': 'Entonces te conviene un plan con cuota mensual: armás la plantilla una vez y la reutilizás cada mes.',
    'chat.info.oneshot': '<b>No necesitás suscribirte a nada.</b> Tenemos <b>packs de única vez</b>: pagás el lote, lo enviás y listo. Sin cuenta, sin renovación.',
    'chat.info.sometimes': '<b>Un pack de única vez te sirve</b>: los packs no vencen, así que lo usás cuando lo necesitás.',

    'chat.q.vol.oneshot': 'Bien. <b>¿Cuántos documentos necesitás enviar en este lote?</b>',
    'chat.q.vol.monthly': 'Perfecto. Para dimensionarlo: <b>¿cuántos documentos enviás a firmar por mes?</b>',
    'chat.opt.vol.low.oneshot': '10 a 100', 'chat.opt.vol.mid.oneshot': '100 a 500', 'chat.opt.vol.high.oneshot': 'Más de 500',
    'chat.opt.vol.low.monthly': 'Hasta 100', 'chat.opt.vol.mid.monthly': '100 a 1.000', 'chat.opt.vol.high.monthly': 'Más de 1.000',
    'chat.info.vol.low.oneshot': 'El <b>Pack Pequeño</b> te cubre. Armás la plantilla, la cruzás con tu planilla y enviás.',
    'chat.info.vol.mid.oneshot': 'El <b>Pack Mediano</b>. A ese volumen, armar los documentos a mano lleva horas: acá lo hacés en minutos.',
    'chat.info.vol.high.oneshot': 'El <b>Pack Grande</b>. Ojo: si esto se repite más de dos veces, un plan mensual sale más barato. Te lo digo igual, aunque no me convenga 😅',
    'chat.info.vol.low.monthly': 'A ese volumen, la mayoría arranca <b>gratis</b>. No hace falta pagar hasta que crezcas.',
    'chat.info.vol.mid.monthly': 'Ese es el rango donde el trabajo manual empieza a doler: <b>~2 minutos por documento</b> son más de 30 horas al mes.',
    'chat.info.vol.high.monthly': 'Alto volumen. A esa escala, cada minuto que ahorrás por documento son <b>días de trabajo al año</b>.',

    'chat.q.team': 'Y para cerrar — ¿es solo para vos, o querés dar acceso a otras personas de tu equipo también?',
    'chat.opt.team.1': 'Solo para mí', 'chat.opt.team.few': 'Algunos de nosotros', 'chat.opt.team.many': 'Todo mi equipo',
    'chat.info.team.1': 'Una sola licencia, listo. Siempre podés sumar compañeros más adelante.',
    'chat.info.team.few': 'Preparamos unas licencias. Todos comparten las mismas plantillas y marca, así los documentos salen consistentes.',
    'chat.info.team.many': 'Acceso para todo el equipo. A ese tamaño conviene tener plantillas centralizadas para que nadie envíe un documento fuera de marca.',

    'chat.reply.advanced': 'Firma avanzada', 'chat.reply.simple': 'Firma simple',
    'chat.reply.email': 'Email certificado', 'chat.reply.sms': 'SMS certificado',
    'chat.reply.monthly': 'Todos los meses', 'chat.reply.oneshot': 'Una sola vez', 'chat.reply.sometimes': 'De vez en cuando',
    'chat.reply.vol.low.oneshot': 'Entre 10 y 100', 'chat.reply.vol.mid.oneshot': 'Entre 100 y 500', 'chat.reply.vol.high.oneshot': 'Más de 500',
    'chat.reply.vol.low.monthly': 'Hasta 100 por mes', 'chat.reply.vol.mid.monthly': 'Entre 100 y 1.000', 'chat.reply.vol.high.monthly': 'Más de 1.000',
    'chat.reply.team.1': 'Solo para mí', 'chat.reply.team.few': 'Algunos de nosotros', 'chat.reply.team.many': 'Todo mi equipo',

    'chat.gotIt': 'Perfecto 👍',
    'chat.notUnderstood': 'No te entendí del todo 🤔 — dejame guiarte. Elegí la opción que mejor encaje:',
    'chat.offTopic': 'Solo puedo ayudarte a preparar tu envío de documentos para firma (tipo de firma, volumen, cada cuánto, equipo) 🙂 — eso queda fuera de lo que manejo. Volvamos a eso:',
    'chat.progress': '{i} de {total}',
    'chat.done.pack': 'Listo 🎯 Por lo que me contaste, te sirve el <b>{name}</b>. Pagás una vez y quedás.',
    'chat.done.plan': 'Listo 🎯 Por lo que me contaste, el plan que te sirve es <b>{name}</b>.<br><br>Acá están las opciones para que compares.',
    'chat.seePacks': 'Continuar →', 'chat.seePlan': 'Continuar →',

    'plan.for.starter': 'Para arrancar solo', 'plan.note.starter': 'Hasta 100 documentos por mes',
    'plan.for.pro': 'Para equipos que envían seguido', 'plan.note.pro': 'Hasta 1.000 documentos por mes',
    'plan.for.enterprise': 'Alto volumen, varios equipos', 'plan.note.enterprise': 'Documentos ilimitados',
    'pack.name.small': 'Pack Pequeño', 'pack.for.small': 'Un envío puntual', 'pack.note.small': 'Hasta 100 documentos · pago único',
    'pack.name.medium': 'Pack Mediano', 'pack.for.medium': 'Un lote grande, una vez', 'pack.note.medium': 'Hasta 500 documentos · pago único',
    'pack.name.large': 'Pack Grande', 'pack.for.large': 'Alto volumen, puntual', 'pack.note.large': 'Hasta 2.000 documentos · pago único',
    'price.free': 'Gratis', 'price.oneTime': 'pago único', 'price.perMo': '/mes',
    'plan.startFree': 'Empezar gratis', 'plan.buy': 'Comprar {name}', 'plan.choose': 'Elegir {name}',
    'why.text': 'Nos dijiste: {list}. Por eso te recomendamos <b>{name}</b>.',
    'why.oneshot': 'un envío puntual', 'why.occasional': 'uso ocasional',
    'why.vol.low': 'volumen bajo', 'why.vol.mid': 'volumen medio', 'why.vol.high': 'volumen alto',
    'why.team.1': 'uso individual', 'why.team.few': 'equipo de hasta 5', 'why.team.many': 'más de 5 personas',
    'feat.pdfGen': 'Generador de PDF desde Word/TXT', 'feat.data': 'Datos desde CSV, JSON, XLSX',
    'feat.bulk': 'Envío masivo con tu token', 'feat.noSub': 'Sin suscripción ni renovación',
    'feat.neverExpires': 'El pack no vence nunca', 'feat.ai': 'Redacción Namirial Dispatch',
    'feat.manualPlace': 'Colocación manual de campos', 'feat.multiUser': 'Multiusuario',
    'feat.everythingSmall': 'Todo lo del Pack Pequeño', 'feat.upTo500': 'Hasta 500 documentos',
    'feat.aiFields': 'Namirial Dispatch coloca los campos por vos', 'feat.aiBrand': 'Namirial Dispatch aplica tu manual de marca',
    'feat.everythingMedium': 'Todo lo del Pack Mediano', 'feat.upTo2000': 'Hasta 2.000 documentos',
    'feat.fullAi': 'Redacción Namirial Dispatch completa', 'feat.supportSend': 'Soporte durante el envío',
    'feat.everythingStarter': 'Todo lo de Starter', 'feat.aiMapping': 'Namirial Dispatch: mapeo automático de datos',
    'feat.upTo5Users': 'Hasta 5 usuarios', 'feat.prioritySupport': 'Soporte prioritario',
    'feat.everythingPro': 'Todo lo de Pro', 'feat.unlimitedDocs': 'Documentos ilimitados',
    'feat.unlimitedUsers': 'Usuarios ilimitados', 'feat.crm': 'Integración con CRM',
    'feat.dedicatedSupport': 'Soporte dedicado + SLA', 'feat.assistedOnboarding': 'Onboarding asistido',
    'pay.plan.suffix': 'plan', 'pay.included': 'incluida', 'pay.aiLayer': 'Redacción Namirial Dispatch',
    'pay.renewal': 'Renovación', 'pay.none': 'Ninguna · pago único', 'pay.totalToday': 'Total hoy',
    'pay.processing': 'Procesando…',
    'done.title.client': 'Sesión iniciada', 'done.title.new': '¡Todo listo!',
    'done.sub.client': 'Tu token está cargado en esta sesión. No se guardó en ningún lado.',
    'done.sub.new': 'Tu cuenta {plan} está lista. El token vive solo en esta sesión.',
    'recap.type': 'Tipo', 'recap.plan': 'Plan', 'recap.existingCustomer': 'Cliente existente',
    'recap.token': 'Token', 'recap.inMemory': 'en memoria', 'recap.persistence': 'Persistencia', 'recap.none': 'Ninguna',
    'recap.aiLayer': 'Redacción Namirial Dispatch', 'recap.enabled': 'Activada', 'recap.manual': 'Modo manual',
    'signup.creating': '… creando cuenta', 'signup.sendingMail': 'enviando email de bienvenida a {email}',
    'signup.mail.body': '<b>¡Bienvenido, {name}!</b><br><br>Tu cuenta (<b>{email}</b>) está lista. Ya tenés acceso.<br><br>Por seguridad, tu token de API nunca se envía por email — lo encontrás en tu panel.',
    'sendtype.smsNote': '📱 El SMS certificado no tiene documento para armar, así que saltea el PDF Builder. Va directo al envío — disponible cuando se conecte el puente builder→envío.',
    'sendtype.smsAlert': 'El SMS certificado saltea el PDF Builder. El envío estará disponible cuando se conecte el puente.',
    'pill.aiActive': 'Namirial Dispatch', 'pill.manualMode': 'modo manual',
  },
};

function t(key, vars) {
  let s = (I18N[SD_LANG] && I18N[SD_LANG][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  return s;
}

// Aplica traducciones al HTML estático marcado con data-i18n*.
function sdApplyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
  document.documentElement.lang = SD_LANG;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', sdApplyI18n);
}
