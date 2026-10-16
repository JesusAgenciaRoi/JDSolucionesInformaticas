/**
 * Motor de cotización general.
 * Lee las respuestas del cuestionario (src/lib/brief.ts) y las traduce en bloques de trabajo con horas.
 * No depende del rubro: cualquier proyecto se arma con las mismas piezas (usuarios, datos, tareas,
 * avisos, conexiones, diseño, migración, seguridad). Vos podés apagar, cambiar o agregar bloques.
 */
import { Q3, Q7, Q12, Q18, arr, has, isOnlyWeb, str, visibleSections, type BriefAnswers } from './brief';

export type Range = [number, number];
export type ClientType = 'emprendedor' | 'pyme' | 'empresa' | 'exterior';

export type Block = {
  id: string;
  /** Nombre técnico, para vos */
  label: string;
  /** Cómo se lo contás al cliente en la propuesta */
  scope: string;
  hours: Range;
  /** De qué respuesta sale, para que entiendas por qué está */
  why: string;
};

export type Adjust = {
  clientType: ClientType;
  /** Bloques apagados */
  off: string[];
  /** Horas cambiadas a mano por bloque */
  hours: Record<string, Range>;
  /** Cantidad de tipos de información (clientes, pedidos, productos…). null = la calcula el sistema */
  entities: number | null;
  extras: { id: string; label: string; hours: Range }[];
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

export const EMPTY_ADJUST: Adjust = { clientType: 'pyme', off: [], hours: {}, entities: null, extras: [] };

export const CLIENT_TYPES: { id: ClientType; label: string; hint: string; mult: number }[] = [
  { id: 'emprendedor', label: 'Emprendedor', hint: 'Recién arranca, presupuesto ajustado', mult: 0.9 },
  { id: 'pyme', label: 'Pyme / comercio', hint: 'Negocio funcionando', mult: 1 },
  { id: 'empresa', label: 'Empresa grande', hint: 'Más exigencias y más valor', mult: 1.3 },
  { id: 'exterior', label: 'Cliente del exterior', hint: 'Referencia de precios internacional', mult: 1.6 },
];

/* ---------- Lectura de respuestas ---------- */

/** Cuenta cosas en un texto libre: "nombres, teléfonos y fotos" → 3 */
export function countItems(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/,|;|\n|\s+y\s+|\s+e\s+|\//).map((x) => x.trim()).filter((x) => x.length > 1).length;
}

const isYes = (a: BriefAnswers, id: string) => str(a, id).startsWith('Sí');
const detail = (a: BriefAnswers, id: string) => str(a, `${id}_detail`);

/** Tipos de información que maneja el sistema (cada uno = guardar, listar, editar, borrar). */
export function guessEntities(a: BriefAnswers): number {
  if (isOnlyWeb(a)) return 0;
  // Pedidos, archivos, empleados y pagos tienen su propio bloque: acá solo lo que no lo tiene
  const fromTasks = [Q12.contacts, Q12.products, Q12.crud].filter((o) => has(a, 'q12', o)).length;
  // q19 suele listar campos (nombre, teléfono…), no tipos: se toma una fracción
  const fromText = Math.ceil(countItems(str(a, 'q19')) / 3);
  return Math.max(fromTasks, fromText);
}

const userTypes = (a: BriefAnswers) => arr(a, 'q7').filter((x) => ![Q7.me, Q7.public, Q7.unsure, Q7.roles].includes(x)).length;

const INTEGRATION_HINTS: { re: RegExp; label: string; hours: Range }[] = [
  { re: /whats?app|wsp/i, label: 'WhatsApp', hours: [10, 24] },
  { re: /mercado ?pago/i, label: 'Mercado Pago', hours: [8, 16] },
  { re: /calendar|calendario/i, label: 'Google Calendar', hours: [6, 14] },
  { re: /sheets|excel|planilla/i, label: 'Excel o planillas', hours: [5, 12] },
  { re: /factur|dgi|cfe|e-?ticket/i, label: 'facturación electrónica', hours: [16, 36] },
  { re: /instagram|facebook|meta|tiktok|google ads|publicidad/i, label: 'redes o publicidad', hours: [12, 28] },
  { re: /drive|dropbox/i, label: 'almacenamiento en la nube', hours: [5, 10] },
  { re: /mail|correo|gmail|outlook/i, label: 'correo', hours: [3, 8] },
];

/* ---------- Bloques ---------- */

export function buildBlocks(a: BriefAnswers, adj: Adjust): Block[] {
  const B: Block[] = [];
  const add = (id: string, label: string, scope: string, hours: Range, why: string) => B.push({ id, label, scope, hours, why });
  const onlyWeb = isOnlyWeb(a);
  const q3 = arr(a, 'q3');

  add('base', 'Puesta en marcha', 'Configuración, dominio, publicación y puesta en marcha', onlyWeb ? [4, 8] : [6, 12], 'Todo proyecto');

  // Web pública
  if (has(a, 'q3', Q3.web) || has(a, 'q3', Q3.shop)) {
    const secs = arr(a, 'web_sections').length + countItems(detail(a, 'web_sections'));
    const n = secs || 5;
    add('web_pages', `Web pública (${n} ${n === 1 ? 'sección' : 'secciones'})`, `Página web con ${n} ${n === 1 ? 'sección' : 'secciones'}, adaptada a celular`, [n * 2, n * 3.5], secs ? 'Secciones que eligió' : 'No eligió secciones: se asumen 5');
    if (str(a, 'web_update') === 'Sí, seguido.' || has(a, 'q12', Q12.content)) {
      add('cms', 'Panel para editar contenido', 'Panel para que cambies textos, fotos y precios', [8, 16], 'Quiere cambiar contenido seguido');
    } else if (str(a, 'web_update') === 'De vez en cuando.') {
      add('cms', 'Edición simple de contenido', 'Edición simple de textos y fotos', [4, 8], 'Quiere cambiar contenido de vez en cuando');
    }
  }

  // Tienda / pedidos / reservas
  if (has(a, 'q3', Q3.shop)) add('shop', 'Catálogo y carrito', 'Catálogo de productos con carrito y pedidos', [20, 40], 'Quiere vender por Internet');
  if (has(a, 'q12', Q12.orders)) add('orders', 'Pedidos, solicitudes o reservas', 'Recepción de pedidos, solicitudes o reservas', [14, 28], 'Recibir pedidos o reservas');
  const pays = arr(a, 'shop_pay').filter((x) => x !== 'No necesito cobrar por la web.' && x !== 'Transferencia.' && x !== 'En efectivo al entregar.');
  if (pays.length || has(a, 'q12', Q12.payments)) {
    const subs = has(a, 'shop_pay', 'Una cuota mensual o suscripción.');
    add('payments', subs ? 'Cobros online y suscripciones' : 'Cobros online', subs ? 'Cobros online y cuotas mensuales' : 'Cobros online (tarjeta o Mercado Pago)', subs ? [18, 34] : [10, 20], 'Quiere cobrar por la web');
  }
  if (has(a, 'shop_delivery', 'Envío a domicilio.')) add('shipping', 'Envíos', 'Opciones y costos de envío', [4, 10], 'Hace envíos');

  // Sistema: usuarios y datos
  if (!onlyWeb) {
    const q9 = str(a, 'q9');
    if (q9.startsWith('Sí') || q9.startsWith('Algunas') || has(a, 'q7', Q7.staff) || has(a, 'q7', Q7.clients) || has(a, 'q7', Q7.roles)) {
      add('auth', 'Cuentas de usuario', 'Ingreso con usuario y contraseña', q9.includes('Google') ? [10, 18] : [8, 14], 'Cada persona tiene su cuenta');
    }
    const types = userTypes(a);
    if (types > 1 || has(a, 'q7', Q7.roles)) {
      const extra = Math.max(1, types - 1);
      add('roles', `Permisos por tipo de usuario (${extra + 1})`, 'Permisos distintos según quién ingresa', [extra * 6, extra * 12], 'Varios tipos de usuario');
    }
    const ents = adj.entities ?? guessEntities(a);
    if (ents > 0) add('entities', `Información a gestionar (${ents} ${ents === 1 ? 'tipo' : 'tipos'})`, `Registro y gestión de ${ents === 1 ? 'un tipo' : `${ents} tipos`} de información`, [ents * 6, ents * 12], adj.entities != null ? 'Cantidad ajustada a mano' : 'Según lo que quiere guardar y las tareas que marcó');
    if (has(a, 'q12', Q12.files)) add('files', 'Archivos y documentos', 'Subida y consulta de archivos y documentos', [6, 12], 'Guardar documentos');
    if (has(a, 'q12', Q12.staff)) add('staff', 'Empleados, tareas o turnos', 'Gestión de empleados, tareas o turnos', [12, 24], 'Administrar empleados o turnos');
    if (has(a, 'q12', Q12.selfService)) add('portal', 'Autogestión para clientes', 'Espacio para que tus clientes hagan gestiones solos', [12, 24], 'Clientes que se autogestionan');
    if (has(a, 'q12', Q12.reports)) add('reports', 'Informes y estadísticas', 'Informes y estadísticas', [10, 20], 'Quiere informes');
    if (str(a, 'q22').trim()) add('search', 'Búsqueda, filtros y exportación', 'Búsqueda, filtros y descarga a Excel', [6, 14], 'Necesita buscar o exportar');
    if (isYes(a, 'q15')) add('states', 'Estados y etapas', 'Seguimiento por estados o etapas', [6, 12], 'Maneja estados o etapas');
    if (isYes(a, 'q16')) add('calc', 'Cálculos automáticos', 'Cálculos automáticos de importes y valores', [6, 16], 'Necesita cálculos');
    if (isYes(a, 'q17')) {
      const docs = Math.max(1, countItems(detail(a, 'q17')));
      add('docs', `Documentos generados (${docs})`, 'Generación de documentos descargables', [docs * 5, docs * 10], 'Genera documentos');
    }
    if (has(a, 'q12', Q12.automate) || has(a, 'q3', Q3.automation)) add('automation', 'Automatizaciones', 'Automatización de tareas repetitivas', [8, 20], 'Quiere automatizar tareas');
  }
  if (q3.includes(Q3.mobile)) add('pwa', 'App instalable en el celular', 'Aplicación instalable en el celular', [6, 12], 'Pidió aplicación para celulares');

  // Avisos
  const notif: [string, string, Range][] = [
    [Q18.email, 'correo', onlyWeb ? [2, 4] : [3, 6]], [Q18.whatsapp, 'WhatsApp', [10, 22]], [Q18.inApp, 'dentro de la app', [6, 12]],
    [Q18.sms, 'SMS', [6, 10]], [Q18.push, 'notificación en el celular', [6, 12]],
  ];
  for (const [opt, name, h] of notif) if (has(a, 'q18', opt)) add(`notif_${name}`, `Avisos por ${name}`, `Avisos automáticos por ${name}`, h, 'Eligió ese canal de avisos');

  // Conexiones
  if (isYes(a, 'q23')) {
    const d = detail(a, 'q23');
    const found = INTEGRATION_HINTS.filter((h) => h.re.test(d));
    // No contar dos veces lo que ya está en avisos o cobros
    const filtered = found.filter((h) => !(h.label === 'WhatsApp' && has(a, 'q18', Q18.whatsapp)) && !(h.label === 'Mercado Pago' && B.some((b) => b.id === 'payments')));
    for (const h of filtered) add(`int_${h.label}`, `Conexión con ${h.label}`, `Conexión con ${h.label}`, h.hours, `Lo nombró en conexiones`);
    if (!found.length) add('int_other', 'Conexión con otra herramienta', 'Conexión con las herramientas que ya usas', [10, 30], d ? `"${d.slice(0, 60)}"` : 'Dijo que sí, sin detalle');
  }
  if (has(a, 'q12', Q12.connect) && !isYes(a, 'q23')) add('int_generic', 'Conectar herramientas', 'Conexión entre tus herramientas', [8, 20], 'Marcó conectar herramientas');

  // Diseño
  const look = arr(a, 'q24');
  const onlyImprove = q3.length > 0 && q3.every((x) => x === Q3.improve);
  const design: Range = look.includes('Dinámico, con animaciones.') ? [16, 28] : look.some((x) => ['Moderno y visual.', 'Elegante o exclusivo.'].includes(x)) ? [10, 18] : look.includes('Profesional y corporativo.') ? [6, 12] : [4, 8];
  if (!(onlyImprove && !look.length)) add('design', 'Diseño a medida', look.includes('Dinámico, con animaciones.') ? 'Diseño a medida con animaciones' : 'Diseño a medida', design, look.length ? `Estilo: ${look.map((x) => x.replace('.', '')).join(', ').toLowerCase()}` : 'Estilo sin definir');
  const q25 = str(a, 'q25');
  if (q25 === 'No tengo nada todavía.') add('identity', 'Identidad visual', 'Logo y paleta de colores', [8, 16], 'No tiene logo');
  else if (q25 === 'Tengo logo, pero no el resto.') add('identity_light', 'Colores y estilo', 'Definición de colores y estilo', [3, 6], 'Tiene logo, falta el resto');
  if (str(a, 'q27') === 'Es fundamental.' || (arr(a, 'q10').length === 1 && has(a, 'q10', 'Celular.'))) add('mobile', 'Experiencia pensada para celular', 'Experiencia optimizada para celular', [4, 8], 'Se usa sobre todo en el celular');

  // Datos existentes y escala
  const q21 = str(a, 'q21');
  if (q21 === 'Sí, toda.') add('migration', 'Pasar los datos que ya tiene', 'Carga de la información que ya tienes', has(a, 'q20', 'En papel.') ? [14, 32] : [10, 24], `Datos en: ${arr(a, 'q20').join(' ').toLowerCase() || 'sin indicar'}`);
  else if (q21 === 'Sí, solamente una parte.') add('migration', 'Pasar parte de los datos', 'Carga de parte de la información que ya tienes', [5, 12], 'Quiere pasar una parte');
  const big = /\d{4,}|mil|miles|much/i.test(`${str(a, 'q28')} ${str(a, 'q29')}`);
  if (big && !onlyWeb) add('scale', 'Rendimiento para mucho volumen', 'Preparado para mucho volumen de datos', [6, 14], 'Maneja muchos registros o usuarios');
  if (isYes(a, 'q31')) add('multi', 'Varias sucursales o empresas', 'Gestión de varias sucursales o empresas', [16, 36], 'Varias sucursales o negocios');

  // Seguridad y continuidad
  if (isYes(a, 'q33')) add('audit', 'Historial de cambios', 'Historial de quién cambió qué', [6, 12], 'Quiere historial de cambios');
  if (str(a, 'q35') === 'Sí, automáticamente.') add('backups', 'Copias de seguridad automáticas', 'Copias de seguridad automáticas', [3, 6], 'Pidió respaldos automáticos');

  // Sistema existente y ayuda posterior
  if (q3.includes(Q3.improve)) {
    const access = str(a, 'improve_access');
    add('analysis', 'Análisis del sistema actual', 'Revisión del sistema que ya tienes', access.startsWith('No') ? [10, 24] : [6, 16], access ? `Acceso: ${access.toLowerCase()}` : 'Mejora de algo existente');
  }
  if (has(a, 'q39', 'Necesito capacitación para utilizarlo.')) add('training', 'Capacitación', 'Capacitación para usarlo', [2, 5], 'Pidió capacitación');
  if (has(a, 'q12', Q12.other) && detail(a, 'q12')) add('other_task', `Otra tarea: ${detail(a, 'q12').slice(0, 40)}`, detail(a, 'q12'), [6, 16], 'Tarea que agregó');

  // Ajustes a mano
  for (const e of adj.extras) B.push({ id: e.id, label: e.label, scope: e.label, hours: e.hours, why: 'Agregado por vos' });
  return B.map((b) => (adj.hours[b.id] ? { ...b, hours: adj.hours[b.id] } : b));
}

/* ---------- Cálculo ---------- */

export type Quote = {
  blocks: Block[];
  active: Block[];
  dev: Range;
  overhead: Range;
  qa: Range;
  risk: Range;
  unknownPct: number;
  hours: Range;
  hoursMid: number;
  weeks: Range;
  urgent: boolean;
  floor: number;
  target: number;
  high: number;
  monthly: number | null;
  payments: { label: string; pct: number }[];
  budget: string;
  warnings: string[];
};

export const roundPrice = (n: number) => (n >= 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);

/** Cuántas respuestas son "no lo sé" o quedaron vacías: mide qué tan definida está la idea. */
function unknownShare(a: BriefAnswers): number {
  const visible = new Set(visibleSections(a).flatMap((s) => s.questions.map((q) => q.id)));
  const keys = ['q3', 'q4', 'q7', 'q12', 'q18', 'q23', 'q24', 'q36'].filter((k) => visible.has(k));
  if (!keys.length) return 1;
  const unknown = keys.filter((k) => {
    const v = arr(a, k);
    return v.length === 0 || v.some((x) => /no lo s[eé]|todav[ií]a no|no tengo una fecha/i.test(x));
  }).length + (has(a, 'q3', Q3.unsure) ? 2 : 0);
  return Math.min(1, unknown / keys.length);
}

const BUDGET_MAX: Record<string, number> = {
  'Menos de USD 300.': 300, 'Entre USD 300 y USD 1.000.': 1000, 'Entre USD 1.000 y USD 3.000.': 3000, 'Entre USD 3.000 y USD 7.000.': 7000,
};

export function estimate(a: BriefAnswers, adj: Adjust, s: Settings): Quote {
  const blocks = buildBlocks(a, adj);
  const active = blocks.filter((b) => !adj.off.includes(b.id));
  const dev = active.reduce<Range>((acc, b) => [acc[0] + b.hours[0], acc[1] + b.hours[1]], [0, 0]);
  const overhead: Range = [dev[0] * s.overhead_pct / 100, dev[1] * s.overhead_pct / 100];
  const critical = str(a, 'q34') === 'Me ocasionaría pérdidas importantes.';
  const qaPct = s.qa_pct + (critical ? 10 : 0);
  const qa: Range = [dev[0] * qaPct / 100, dev[1] * qaPct / 100];

  const unknownPct = unknownShare(a);
  const base: Range = [dev[0] + overhead[0] + qa[0], dev[1] + overhead[1] + qa[1]];
  const risk: Range = [base[0] * unknownPct * 0.1, base[1] * unknownPct * 0.4];
  const hours: Range = [Math.round(base[0] + risk[0]), Math.round(base[1] + risk[1])];
  const hoursMid = (hours[0] + hours[1]) / 2;

  const q36 = str(a, 'q36');
  const perWeek = Math.max(1, s.hours_per_week);
  const weeks: Range = [Math.max(1, Math.ceil(hours[0] / perWeek)), Math.max(1, Math.ceil(hours[1] / perWeek))];
  // Urgente si lo quiere ya, o en un mes y no te da el tiempo
  const urgent = q36 === 'Lo antes posible.' || (q36 === 'Dentro de un mes.' && weeks[0] > 4);
  const urg = urgent ? 1.25 : 1;

  const mult = CLIENT_TYPES.find((t) => t.id === adj.clientType)?.mult ?? 1;
  let floor = hours[0] * s.floor_rate * urg * Math.max(1, mult);
  let target = hoursMid * s.target_rate * mult * urg;
  let high = Math.max(hoursMid * s.high_rate, hours[1] * s.target_rate) * mult * urg;
  floor = Math.max(floor, s.min_project);
  target = Math.max(target, floor);
  high = Math.max(high, target);
  [floor, target, high] = [roundPrice(floor), roundPrice(target), roundPrice(high)];

  const wantsCare = arr(a, 'q39').some((x) => /soporte|mantenga|agregando/i.test(x));
  const careHours = isOnlyWeb(a) ? 2 : Math.min(10, Math.max(3, Math.round(hoursMid / 40)));
  const monthly = wantsCare ? roundPrice(careHours * s.target_rate * mult) : null;

  const payments = target >= 1500
    ? [{ label: 'al aprobar la propuesta', pct: 40 }, { label: 'con la primera versión para probar', pct: 30 }, { label: 'al publicar', pct: 30 }]
    : [{ label: 'al aprobar la propuesta', pct: 50 }, { label: 'al publicar', pct: 50 }];

  const budget = str(a, 'q38') + (str(a, 'q38_detail') ? ` ${str(a, 'q38_detail')}` : '');
  const warnings: string[] = [];
  const bmax = BUDGET_MAX[str(a, 'q38')];
  if (bmax && bmax < floor) warnings.push(`Su presupuesto (hasta USD ${bmax.toLocaleString('es-UY')}) está por debajo de tu piso. Proponle una primera versión más chica: apagá bloques hasta entrar en el rango, y lo demás queda para una segunda etapa.`);
  if (bmax && bmax >= floor && bmax < target) warnings.push(`Su presupuesto (hasta USD ${bmax.toLocaleString('es-UY')}) queda entre tu piso y el recomendado: podés cerrar cerca de ese monto sin perder, o apagar algún bloque.`);
  if (bmax && bmax >= high) warnings.push('Su presupuesto está por encima de tu techo: no hace falta bajar el precio.');
  if (unknownPct >= 0.4) warnings.push('Muchas respuestas quedaron en "no lo sé". Antes de cerrar el precio, hacé una llamada para definir, o cobrá una etapa de definición aparte.');
  if (has(a, 'q18', Q18.whatsapp) || /whats?app/i.test(detail(a, 'q23'))) warnings.push('WhatsApp automático usa la API oficial de Meta: hay que verificar la empresa y tiene costo por mensaje, que paga el cliente.');
  if (str(a, 'improve_access').startsWith('No')) warnings.push('No tiene acceso a su sistema actual. Conseguir los accesos es lo primero, antes de comprometer plazos.');
  if (critical) warnings.push('Para el cliente, que se caiga le genera pérdidas: sumé 10% más de pruebas. Considerá un plan de soporte con tiempos de respuesta.');
  if (urgent) warnings.push('Lleva 25% de recargo por urgencia: lo quiere ya o en un plazo menor al que te lleva.');
  if (hours[1] > 200) warnings.push('Proyecto grande: dividilo en etapas con entregas y pagos separados.');
  if (has(a, 'q3', Q3.mobile)) warnings.push('La cotización es para una app web instalable. Una app nativa en las tiendas de Apple y Google lleva bastante más trabajo y costo de publicación.');

  return { blocks, active, dev, overhead, qa, risk, unknownPct, hours, hoursMid, weeks, urgent, floor, target, high, monthly, payments, budget, warnings };
}

const usd = (n: number) => `USD ${Math.round(n).toLocaleString('es-UY')}`;

/** Propuesta lista para WhatsApp o mail, en el idioma del cliente. */
export function proposalText(a: BriefAnswers, clientName: string, q: Quote, price: number): string {
  const first = clientName.trim().split(' ')[0];
  const project = str(a, 'q1') || 'tu proyecto';
  const plazo = q.weeks[0] === q.weeks[1] ? `${q.weeks[0]} semana(s)` : `${q.weeks[0]} a ${q.weeks[1]} semanas`;
  const lines = [
    `Hola${first ? ` ${first}` : ''}! Gracias por completar el cuestionario. Te paso la propuesta para ${project}.`,
    '',
    'Qué incluye:',
    ...q.active.map((b) => `• ${b.scope}`),
    '',
    `Inversión: ${usd(price)}`,
    `Plazo estimado: ${plazo} desde que tengo el contenido.`,
    '',
    'Forma de pago:',
    ...q.payments.map((p) => `• ${p.pct}% ${p.label}: ${usd(roundPrice((price * p.pct) / 100))}`),
  ];
  if (q.monthly) lines.push('', `Mantenimiento opcional después de publicar: ${usd(q.monthly)} por mes (hosting, respaldos, soporte y pequeños cambios).`);
  lines.push('', 'La propuesta vale por 15 días. Si quieres ajustar algo, coordinamos una llamada.', '', 'JD Soluciones Informáticas');
  return lines.join('\n');
}
