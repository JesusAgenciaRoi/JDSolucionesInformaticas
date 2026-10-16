/**
 * Motor de cotización: convierte las respuestas de la encuesta en horas y en un rango de precios en USD.
 * Es una función pura (sin red), así se puede probar y ajustar fácil.
 */

export type Range = [number, number];

export type ProjectType = 'landing' | 'institucional' | 'tienda' | 'app' | 'dashboard' | 'integracion' | 'soporte';
export type ClientType = 'emprendedor' | 'pyme' | 'empresa' | 'exterior';

export type Answers = {
  clientName: string;
  clientType: ClientType;
  projectType: ProjectType;
  /** Páginas o pantallas totales (web) */
  pages: number;
  /** Módulos o funciones grandes (app / dashboard: fuentes de datos) */
  modules: number;
  features: string[];
  integrations: string[];
  design: 'tiene' | 'logo' | 'nada';
  content: 'listo' | 'parcial' | 'crear';
  migration: 'no' | 'pocos' | 'muchos';
  urgency: 'flexible' | 'normal' | 'urgente';
  clarity: 'claro' | 'medio' | 'idea';
  support: boolean;
  notes: string;
};

export type Settings = {
  floor_rate: number;
  target_rate: number;
  high_rate: number;
  hours_per_week: number;
  min_project: number;
  overhead_pct: number;
  qa_pct: number;
};

export const DEFAULT_SETTINGS: Settings = {
  floor_rate: 15,
  target_rate: 22,
  high_rate: 32,
  hours_per_week: 15,
  min_project: 150,
  overhead_pct: 15,
  qa_pct: 10,
};

export const PROJECT_TYPES: { id: ProjectType; label: string; ask: string; hint: string; base: Range; includedPages: number; perPage: Range; includedModules: number; perModule: Range; supportHours: number }[] = [
  { id: 'landing', ask: 'Que lo encuentren en internet con una sola página', label: 'Landing / una página', hint: 'Una sola página para presentar un producto o servicio', base: [8, 14], includedPages: 1, perPage: [3, 5], includedModules: 0, perModule: [0, 0], supportHours: 1 },
  { id: 'institucional', ask: 'Mostrar su negocio en una web con varias secciones', label: 'Sitio institucional', hint: 'Inicio, nosotros, servicios, contacto…', base: [18, 32], includedPages: 5, perPage: [3, 5], includedModules: 0, perModule: [0, 0], supportHours: 2 },
  { id: 'tienda', ask: 'Vender o mostrar productos por internet', label: 'Catálogo o tienda online', hint: 'Productos, carrito y pedidos', base: [40, 70], includedPages: 6, perPage: [3, 5], includedModules: 0, perModule: [0, 0], supportHours: 4 },
  { id: 'app', ask: 'Un sistema para organizar el trabajo del día a día', label: 'App o sistema a medida', hint: 'Gestión de clientes, turnos, stock, pedidos…', base: [40, 80], includedPages: 0, perPage: [0, 0], includedModules: 3, perModule: [12, 24], supportHours: 6 },
  { id: 'dashboard', ask: 'Ver sus números y resultados en un solo lugar', label: 'Dashboard', hint: 'Métricas y reportes en un solo lugar', base: [25, 50], includedPages: 0, perPage: [0, 0], includedModules: 2, perModule: [8, 16], supportHours: 4 },
  { id: 'integracion', ask: 'Que dos programas se pasen datos o que algo se haga solo', label: 'Integración o automatización', hint: 'Conectar sistemas, automatizar tareas', base: [8, 20], includedPages: 0, perPage: [0, 0], includedModules: 1, perModule: [6, 14], supportHours: 2 },
  { id: 'soporte', ask: 'Arreglar o mejorar algo que ya tiene', label: 'Arreglo o mejora puntual', hint: 'Algo que ya existe y hay que tocar', base: [4, 12], includedPages: 0, perPage: [0, 0], includedModules: 1, perModule: [4, 10], supportHours: 0 },
];

export const FEATURES: { id: string; label: string; ask: string; hours: Range; skipFor?: ProjectType[] }[] = [
  { id: 'login', ask: '¿Sus clientes o empleados entran con usuario y contraseña?', label: 'Usuarios con cuenta (login)', hours: [10, 18] },
  { id: 'roles', ask: '¿Hay personas que ven o hacen cosas distintas? (dueño, empleado, cliente)', label: 'Distintos tipos de usuario y permisos', hours: [8, 16] },
  { id: 'cms', ask: '¿Quiere cambiar textos, fotos o precios él mismo?', label: 'Panel para que el cliente cargue contenido', hours: [12, 24] },
  { id: 'pagos', ask: '¿Le quiere cobrar a sus clientes por la web?', label: 'Cobros online', hours: [10, 20] },
  { id: 'reservas', ask: '¿Sus clientes reservan turnos, horarios o lugares?', label: 'Reservas, turnos o agenda', hours: [12, 24] },
  { id: 'carrito', ask: '¿Sus clientes eligen productos y hacen un pedido?', label: 'Carrito y pedidos', hours: [14, 28], skipFor: ['tienda'] },
  { id: 'notificaciones', ask: '¿Quiere que le llegue un aviso (o al cliente) cuando pasa algo?', label: 'Avisos por email, WhatsApp o push', hours: [4, 8] },
  { id: 'formularios', ask: '¿Necesita que la gente le complete datos? (inscripción, presupuesto)', label: 'Formularios a medida', hours: [3, 8] },
  { id: 'buscador', ask: '¿Tiene muchas cosas y hay que poder buscar o filtrar?', label: 'Buscador y filtros', hours: [6, 14] },
  { id: 'reportes', ask: '¿Quiere sacar listados, totales o planillas?', label: 'Reportes o exportar a Excel/PDF', hours: [8, 16] },
  { id: 'archivos', ask: '¿Él o sus clientes suben fotos o documentos?', label: 'Subir fotos o archivos', hours: [6, 12] },
  { id: 'blog', ask: '¿Quiere publicar novedades o artículos seguido?', label: 'Blog o novedades', hours: [6, 12] },
  { id: 'multiidioma', ask: '¿Lo tiene que ver gente que habla otro idioma?', label: 'Varios idiomas', hours: [8, 16] },
  { id: 'pwa', ask: '¿Lo quiere usar como una app en el celular?', label: 'Instalable en el celular', hours: [5, 10] },
  { id: 'seo', ask: '¿Le importa aparecer cuando lo buscan en Google?', label: 'Posicionamiento en Google (SEO básico)', hours: [4, 8] },
];

export const INTEGRATIONS: { id: string; label: string; ask: string; hours: Range }[] = [
  { id: 'mercadopago', ask: 'Cobrar con Mercado Pago', label: 'Mercado Pago', hours: [8, 16] },
  { id: 'whatsapp', ask: 'Que los mensajes de WhatsApp se manden o lleguen solos', label: 'WhatsApp (API oficial)', hours: [10, 24] },
  { id: 'google', ask: 'Usar sus planillas, calendario o Drive de Google', label: 'Google (Sheets, Calendar, Drive)', hours: [6, 14] },
  { id: 'ads', ask: 'Traer los resultados de su publicidad en redes o Google', label: 'APIs de publicidad (Meta, Google, TikTok)', hours: [12, 28] },
  { id: 'facturacion', ask: 'Hacer facturas electrónicas desde el sistema', label: 'Facturación electrónica', hours: [16, 36] },
  { id: 'sistema', ask: 'Conectarse con un programa que ya usa (caja, stock, contabilidad)', label: 'Sistema propio del cliente (ERP, otro)', hours: [16, 40] },
  { id: 'email', ask: 'Mandar correos automáticos (confirmaciones, recordatorios)', label: 'Correo transaccional', hours: [3, 6] },
];

const DESIGN: Record<Answers['design'], { label: string; hours: Range }> = {
  tiene: { label: 'Ya tiene logo, colores y sabe cómo lo quiere', hours: [0, 0] },
  logo: { label: 'Tiene logo, el resto lo propongo yo', hours: [6, 12] },
  nada: { label: 'No tiene logo ni colores', hours: [14, 28] },
};
const CONTENT: Record<Answers['content'], { label: string; hours: Range }> = {
  listo: { label: 'Me pasa todos los textos y fotos', hours: [0, 0] },
  parcial: { label: 'Me pasa algunas cosas', hours: [3, 8] },
  crear: { label: 'No tiene nada escrito', hours: [8, 16] },
};
const MIGRATION: Record<Answers['migration'], { label: string; hours: Range }> = {
  no: { label: 'Arranca de cero', hours: [0, 0] },
  pocos: { label: 'Tiene una planilla o lista chica', hours: [4, 8] },
  muchos: { label: 'Tiene mucha info o un sistema viejo', hours: [12, 30] },
};

export const CLIENT_TYPES: { id: ClientType; label: string; hint: string; mult: number }[] = [
  { id: 'emprendedor', label: 'Emprendedor', hint: 'Recién arranca, presupuesto ajustado', mult: 0.9 },
  { id: 'pyme', label: 'Pyme / comercio', hint: 'Negocio funcionando', mult: 1 },
  { id: 'empresa', label: 'Empresa grande', hint: 'Más exigencias y más valor', mult: 1.3 },
  { id: 'exterior', label: 'Cliente del exterior', hint: 'Paga en USD con referencia internacional', mult: 1.6 },
];

export const URGENCY: Record<Answers['urgency'], { label: string; mult: number }> = {
  flexible: { label: 'Cuando se pueda', mult: 1 },
  normal: { label: 'En las próximas semanas', mult: 1 },
  urgente: { label: 'Lo necesita ya', mult: 1.3 },
};

/** La falta de claridad no cambia lo mínimo, pero agranda el techo: es el riesgo de que el alcance crezca. */
export const CLARITY: Record<Answers['clarity'], { label: string; minMult: number; maxMult: number }> = {
  claro: { label: 'Lo explica con detalle', minMult: 1, maxMult: 1 },
  medio: { label: 'Sabe lo que quiere, no cómo', minMult: 1.05, maxMult: 1.15 },
  idea: { label: 'Es una idea, hay que pensarla juntos', minMult: 1.1, maxMult: 1.3 },
};

export const OPTIONS = { DESIGN, CONTENT, MIGRATION };

export const EMPTY_ANSWERS: Answers = {
  clientName: '',
  clientType: 'pyme',
  projectType: 'institucional',
  pages: 5,
  modules: 3,
  features: [],
  integrations: [],
  design: 'logo',
  content: 'parcial',
  migration: 'no',
  urgency: 'normal',
  clarity: 'medio',
  support: true,
  notes: '',
};

export type Line = { label: string; hours: Range };

export type Quote = {
  lines: Line[];
  hours: Range;
  hoursMid: number;
  weeks: Range;
  floor: number;
  target: number;
  high: number;
  monthly: number | null;
  payments: { label: string; pct: number; amount: number }[];
  warnings: string[];
};

const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]];
const scale = (r: Range, k: number): Range => [r[0] * k, r[1] * k];

/** Redondea a 10 USD, o a 50 si pasa de 1.000, para que el número se vea prolijo al cliente. */
export const roundPrice = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
const roundH = (n: number) => Math.round(n);

export function estimate(a: Answers, s: Settings): Quote {
  const type = PROJECT_TYPES.find((t) => t.id === a.projectType) ?? PROJECT_TYPES[1];
  const lines: Line[] = [{ label: `Base: ${type.label}`, hours: type.base }];

  const extraPages = Math.max(0, (a.pages || 0) - type.includedPages);
  if (type.includedPages > 0 && extraPages > 0) lines.push({ label: `${extraPages} página(s) extra`, hours: scale(type.perPage, extraPages) });

  const extraModules = Math.max(0, (a.modules || 0) - type.includedModules);
  if (type.includedModules > 0 && extraModules > 0) {
    const what = a.projectType === 'dashboard' ? 'fuente(s) de datos' : 'módulo(s)';
    lines.push({ label: `${extraModules} ${what} extra`, hours: scale(type.perModule, extraModules) });
  }

  for (const f of FEATURES) {
    if (!a.features.includes(f.id) || f.skipFor?.includes(a.projectType)) continue;
    lines.push({ label: f.label, hours: f.hours });
  }
  for (const i of INTEGRATIONS) {
    if (!a.integrations.includes(i.id)) continue;
    // Si ya cuenta "Cobros online", Mercado Pago va incluido ahí: no se cobra dos veces.
    if (i.id === 'mercadopago' && a.features.includes('pagos')) continue;
    lines.push({ label: `Integración: ${i.label}`, hours: i.hours });
  }
  if (DESIGN[a.design].hours[1] > 0) lines.push({ label: DESIGN[a.design].label, hours: DESIGN[a.design].hours });
  if (CONTENT[a.content].hours[1] > 0) lines.push({ label: CONTENT[a.content].label, hours: CONTENT[a.content].hours });
  if (MIGRATION[a.migration].hours[1] > 0) lines.push({ label: MIGRATION[a.migration].label, hours: MIGRATION[a.migration].hours });

  let dev: Range = [0, 0];
  for (const l of lines) dev = add(dev, l.hours);

  const overhead = scale(dev, s.overhead_pct / 100);
  const qa = scale(dev, s.qa_pct / 100);
  lines.push({ label: `Reuniones y gestión (${s.overhead_pct}%)`, hours: overhead });
  lines.push({ label: `Pruebas, ajustes y publicación (${s.qa_pct}%)`, hours: qa });

  let total = add(add(dev, overhead), qa);
  const c = CLARITY[a.clarity];
  if (c.maxMult > 1) {
    const risk: Range = [total[0] * (c.minMult - 1), total[1] * (c.maxMult - 1)];
    lines.push({ label: `Margen por alcance poco definido`, hours: risk });
    total = add(total, risk);
  }

  const hours: Range = [roundH(total[0]), roundH(total[1])];
  const hoursMid = (hours[0] + hours[1]) / 2;
  const clientMult = CLIENT_TYPES.find((t) => t.id === a.clientType)?.mult ?? 1;
  const urg = URGENCY[a.urgency].mult;

  // Piso: horas mínimas a tu tarifa piso. No se aplica el descuento de emprendedor: es tu límite.
  let floor = hours[0] * s.floor_rate * urg * Math.max(1, clientMult);
  // Recomendado: horas probables a tu tarifa objetivo.
  let target = hoursMid * s.target_rate * clientMult * urg;
  // Techo: horas probables a tu tarifa alta, o las horas máximas a la objetivo, lo que sea mayor.
  let high = Math.max(hoursMid * s.high_rate, hours[1] * s.target_rate) * clientMult * urg;

  floor = Math.max(floor, s.min_project);
  target = Math.max(target, floor);
  high = Math.max(high, target);
  [floor, target, high] = [roundPrice(floor), roundPrice(target), roundPrice(high)];

  const perWeek = Math.max(1, s.hours_per_week);
  const weeks: Range = [Math.max(1, Math.ceil(hours[0] / perWeek)), Math.max(1, Math.ceil(hours[1] / perWeek))];

  const monthly = a.support && type.supportHours > 0 ? roundPrice(type.supportHours * s.target_rate * clientMult) : null;

  const split = target >= 1500 ? [['Al aprobar la propuesta', 40], ['Con la primera versión para probar', 30], ['Al publicar', 30]] : [['Al aprobar la propuesta', 50], ['Al publicar', 50]];
  const payments = (split as [string, number][]).map(([label, pct]) => ({ label, pct, amount: roundPrice((target * pct) / 100) }));

  const warnings: string[] = [];
  if (a.clarity === 'idea') warnings.push('El alcance todavía es una idea. Cobrá una etapa de definición aparte o cotizá solo una primera versión.');
  if (a.integrations.includes('whatsapp')) warnings.push('La API oficial de WhatsApp exige verificar la empresa en Meta y tiene costo por conversación, que paga el cliente.');
  if (a.integrations.includes('facturacion')) warnings.push('La facturación electrónica depende del proveedor del cliente. Pedí su documentación antes de cerrar el precio.');
  if (hours[1] > 200) warnings.push('Proyecto grande: conviene dividirlo en etapas con entregas y pagos separados.');
  if (a.urgency === 'urgente') warnings.push('Incluye 30% de recargo por urgencia. Decíselo al cliente: es lo que cuesta dejar otros trabajos de lado.');

  return { lines, hours, hoursMid, weeks, floor, target, high, monthly, payments, warnings };
}

const usd = (n: number) => `USD ${n.toLocaleString('es-UY')}`;

/** Texto de propuesta listo para pegar en WhatsApp o en un mail. */
export function proposalText(a: Answers, q: Quote, price: number): string {
  const type = PROJECT_TYPES.find((t) => t.id === a.projectType)!;
  const scope: string[] = [];
  if (type.includedPages > 0) scope.push(`${Math.max(a.pages, 1)} página(s) adaptadas a celular`);
  if (type.includedModules > 0 && a.projectType !== 'soporte') scope.push(`${Math.max(a.modules, 1)} ${a.projectType === 'dashboard' ? 'fuente(s) de datos' : 'módulo(s) principal(es)'}`);
  for (const f of FEATURES) if (a.features.includes(f.id) && !f.skipFor?.includes(a.projectType)) scope.push(f.label);
  for (const i of INTEGRATIONS) if (a.integrations.includes(i.id)) scope.push(`Integración con ${i.label}`);
  if (a.design === 'nada') scope.push('Identidad visual básica (logo y colores)');
  if (a.design !== 'tiene') scope.push('Diseño a medida');
  if (a.content === 'crear') scope.push('Redacción de textos');

  const pays = q.payments.map((p) => `• ${p.pct}% ${p.label.toLowerCase()}: ${usd(roundPrice((price * p.pct) / 100))}`).join('\n');
  const plazo = q.weeks[0] === q.weeks[1] ? `${q.weeks[0]} semana(s)` : `${q.weeks[0]} a ${q.weeks[1]} semanas`;

  return [
    `Hola${a.clientName ? ` ${a.clientName.split(' ')[0]}` : ''}! Te paso la propuesta para ${type.label.toLowerCase()}.`,
    '',
    'Qué incluye:',
    ...scope.map((s) => `• ${s}`),
    '• Publicación y puesta en marcha',
    '',
    `Inversión: ${usd(price)}`,
    `Plazo estimado: ${plazo} desde que tengo el contenido.`,
    '',
    'Forma de pago:',
    pays,
    q.monthly ? `\nMantenimiento opcional después de publicar: ${usd(q.monthly)} por mes (hosting, respaldos y pequeños cambios).` : '',
    '',
    'La propuesta vale por 15 días. Cualquier duda, coordinamos una llamada.',
    '',
    'JD Soluciones Informáticas',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n');
}


/* ---------- Detección en lenguaje natural ---------- */

type Rule = { re: RegExp; feature?: string; integration?: string; type?: ProjectType; why: string };

/** Palabras que usa un cliente sin conocimientos técnicos y lo que suelen significar. */
const RULES: Rule[] = [
  { re: /turno|reserv|agenda|cita|horario disponible|hora libre/, feature: 'reservas', type: 'app', why: 'habla de turnos o reservas' },
  { re: /pag(ar|o|uen)|cobr|tarjeta|transferen|se[ñn]a/, feature: 'pagos', why: 'quiere cobrar' },
  { re: /mercado ?pago/, integration: 'mercadopago', why: 'nombra Mercado Pago' },
  { re: /carrito|pedido|encarg|compr(ar|en|as)/, feature: 'carrito', type: 'tienda', why: 'la gente compra o hace pedidos' },
  { re: /vend|tienda|cat[aá]logo|productos|precio/, type: 'tienda', why: 'muestra o vende productos' },
  { re: /usuario|contrase|cuenta|ingres(ar|en)|logue|entrar con/, feature: 'login', why: 'la gente entra con su cuenta' },
  { re: /emplead|vendedor|socio|admin|permis|solo (yo|él|ella)|cada uno ve/, feature: 'roles', why: 'hay personas con permisos distintos' },
  { re: /(cambiar|subir|cargar|actualizar|modificar) (yo|él|ella|los precios|las fotos|los textos|productos)|sin depender|yo mismo/, feature: 'cms', why: 'quiere cargar cosas él mismo' },
  { re: /avis|notific|recordatorio|que me llegue|que le llegue|alerta/, feature: 'notificaciones', why: 'quiere avisos' },
  { re: /whats?app|wsp|guasap/, integration: 'whatsapp', why: 'nombra WhatsApp' },
  { re: /formulario|inscrip|anotar|complet(ar|en)|presupuest/, feature: 'formularios', why: 'la gente completa datos' },
  { re: /busc(ar|ador)|filtr|encontrar r[aá]pido/, feature: 'buscador', why: 'hay que buscar entre muchas cosas' },
  { re: /reporte|planilla|excel|listado|cu[aá]nto (vend|gan|factur)|totales|estad[ií]stic/, feature: 'reportes', why: 'quiere listados o totales' },
  { re: /n[uú]meros|m[eé]tricas|resultados|dashboard|tablero|ver todo junto|rendimiento/, type: 'dashboard', why: 'quiere ver números juntos' },
  { re: /foto|imagen|archivo|documento|pdf|comprobante/, feature: 'archivos', why: 'se suben fotos o archivos' },
  { re: /novedades|blog|art[ií]culo|noticias/, feature: 'blog', why: 'quiere publicar novedades' },
  { re: /ingl[eé]s|portugu[eé]s|idioma|extranjer|turista/, feature: 'multiidioma', why: 'hay público de otro idioma' },
  { re: /celular|\bapp\b|aplicaci[oó]n|descargar|instalar/, feature: 'pwa', why: 'lo quiere usar como app' },
  { re: /google|aparecer|que me encuentren|buscador de google/, feature: 'seo', why: 'quiere aparecer en Google' },
  { re: /factura|dgi|e-?ticket|cfe/, integration: 'facturacion', why: 'necesita facturar' },
  { re: /sheets|planilla de google|calendar|calendario|drive/, integration: 'google', why: 'usa herramientas de Google' },
  { re: /facebook|instagram|meta|tiktok|anuncios|publicidad|campa[ñn]a/, integration: 'ads', why: 'tiene publicidad en redes' },
  { re: /mail|correo|e-?mail/, integration: 'email', why: 'quiere mandar correos' },
  { re: /stock|inventario|clientes|proveedores|caja|gesti[oó]n|organizar|control/, type: 'app', why: 'quiere organizar su trabajo' },
  { re: /sistema que (ya )?(uso|usa|tengo|tiene)|programa que (ya )?(uso|usa|tengo|tiene)|conectar con/, integration: 'sistema', why: 'ya usa otro programa' },
  { re: /solo (una|1) p[aá]gina|algo simple|presencia|que me conozcan|tarjeta de presentaci/, type: 'landing', why: 'quiere algo simple para que lo conozcan' },
  { re: /arregl|no anda|se rompi|mejorar (mi|la|el)|ya tengo (una|la) (web|p[aá]gina)/, type: 'soporte', why: 'ya tiene algo y hay que tocarlo' },
];

export type Suggestion = { kind: 'feature' | 'integration' | 'type'; id: string; label: string; why: string };

export function detect(text: string): Suggestion[] {
  const t = text.toLowerCase().normalize('NFC');
  if (t.trim().length < 3) return [];
  const out = new Map<string, Suggestion>();
  for (const r of RULES) {
    if (!r.re.test(t)) continue;
    if (r.feature) {
      const f = FEATURES.find((x) => x.id === r.feature)!;
      out.set(`f:${f.id}`, { kind: 'feature', id: f.id, label: f.label, why: r.why });
    }
    if (r.integration) {
      const i = INTEGRATIONS.find((x) => x.id === r.integration)!;
      out.set(`i:${i.id}`, { kind: 'integration', id: i.id, label: i.label, why: r.why });
    }
    if (r.type && !out.has('t')) {
      const p = PROJECT_TYPES.find((x) => x.id === r.type)!;
      out.set('t', { kind: 'type', id: p.id, label: p.label, why: r.why });
    }
  }
  return [...out.values()];
}
