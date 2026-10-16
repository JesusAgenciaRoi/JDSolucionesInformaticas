/**
 * Cuestionario para el cliente. Las preguntas se muestran u ocultan según lo que va respondiendo.
 * Los ids (q1…q42) son estables: el cotizador lee las respuestas por id.
 * Las preguntas extra que aparecen por condiciones usan ids con nombre (web_sections, shop_delivery…).
 */

export type BriefAnswers = Record<string, string | string[]>;

export type Question = {
  id: string;
  label: string;
  help?: string;
  type: 'text' | 'textarea' | 'single' | 'multi' | 'top3';
  options?: string[];
  /** Opción que abre un campo de texto para detallar (ej. "Otro", "Sí. ¿Cuáles?") */
  detailFor?: string[];
  detailLabel?: string;
  /** Si devuelve false, la pregunta no se muestra (y no se cuenta como pendiente) */
  showIf?: (a: BriefAnswers) => boolean;
  placeholder?: string;
};

export type Section = { id: string; title: string; intro?: string; questions: Question[]; showIf?: (a: BriefAnswers) => boolean };

/* ---------- Opciones con nombre, para usarlas en condiciones y en el cotizador ---------- */

export const Q3 = {
  web: 'Una página web para presentar mi negocio.',
  shop: 'Una tienda para vender productos por Internet.',
  mobile: 'Una aplicación para celulares.',
  platform: 'Una plataforma para gestionar mi negocio.',
  tool: 'Una herramienta para mis empleados o clientes.',
  automation: 'Un sistema para automatizar tareas.',
  improve: 'Mejorar o ampliar un sistema que ya tengo.',
  unsure: 'Tengo una idea, pero todavía no sé qué tipo de solución necesito.',
  other: 'Otro',
};
export const Q7 = {
  me: 'Solamente yo.',
  staff: 'Mis empleados o colaboradores.',
  clients: 'Mis clientes.',
  partners: 'Mis proveedores o socios.',
  public: 'Cualquier persona que visite mi página.',
  roles: 'Personas con diferentes funciones y permisos.',
  unsure: 'Todavía no lo sé.',
};
export const Q12 = {
  contacts: 'Registrar clientes o contactos.',
  files: 'Guardar información y documentos.',
  crud: 'Consultar, modificar o eliminar registros.',
  products: 'Gestionar productos o servicios.',
  orders: 'Recibir pedidos, solicitudes o reservas.',
  payments: 'Gestionar pagos, facturas o cobros.',
  messages: 'Enviar mensajes, avisos o recordatorios.',
  reports: 'Crear informes o estadísticas.',
  staff: 'Administrar empleados, tareas o turnos.',
  content: 'Publicar contenido, imágenes o videos.',
  selfService: 'Permitir que los clientes realicen gestiones por su cuenta.',
  automate: 'Automatizar tareas repetitivas.',
  connect: 'Conectar información de diferentes herramientas.',
  other: 'Otra',
};
export const Q18 = {
  email: 'Por correo electrónico.',
  whatsapp: 'Por WhatsApp.',
  inApp: 'Dentro de la propia aplicación.',
  sms: 'Mediante mensajes SMS.',
  push: 'Mediante notificaciones en el celular.',
  none: 'No necesito notificaciones.',
  unsure: 'No lo sé.',
};
export const YES_NO = ['Sí.', 'No.', 'No lo sé.'];

/* ---------- Ayudantes para condiciones ---------- */

export const arr = (a: BriefAnswers, id: string): string[] => {
  const v = a[id];
  return Array.isArray(v) ? v : v ? [v] : [];
};
export const str = (a: BriefAnswers, id: string): string => {
  const v = a[id];
  return Array.isArray(v) ? v.join(', ') : (v ?? '');
};
export const has = (a: BriefAnswers, id: string, opt: string) => arr(a, id).includes(opt);

/** Solo una web de presentación (sin sistema detrás): se ocultan las preguntas de gestión de datos. */
export const isOnlyWeb = (a: BriefAnswers) => {
  const q3 = arr(a, 'q3');
  return q3.length > 0 && q3.every((x) => x === Q3.web);
};
const wantsWebOrShop = (a: BriefAnswers) => has(a, 'q3', Q3.web) || has(a, 'q3', Q3.shop);
const sellsOrBooks = (a: BriefAnswers) => has(a, 'q3', Q3.shop) || has(a, 'q12', Q12.orders) || has(a, 'q12', Q12.products);
const severalUserTypes = (a: BriefAnswers) => {
  const q7 = arr(a, 'q7').filter((x) => x !== Q7.unsure && x !== Q7.me);
  return q7.length > 1 || q7.includes(Q7.roles) || (q7.length === 1 && q7[0] !== Q7.public);
};
const notOnlyPublic = (a: BriefAnswers) => {
  const q7 = arr(a, 'q7');
  return !(q7.length === 1 && q7[0] === Q7.public);
};

/* ---------- Cuestionario ---------- */

export const SECTIONS: Section[] = [
  {
    id: 'negocio',
    title: 'Sobre tu negocio y tu idea',
    questions: [
      { id: 'q1', type: 'text', label: '¿Cómo se llama tu negocio o proyecto?' },
      { id: 'q2', type: 'textarea', label: '¿A qué te dedicas y qué servicios o productos ofreces?' },
      { id: 'q3', type: 'multi', label: '¿Qué te gustaría crear?', help: 'Puedes marcar más de una.', options: Object.values(Q3), detailFor: [Q3.other], detailLabel: '¿Qué otra cosa?' },
      {
        id: 'improve_what', type: 'textarea', label: '¿Qué sistema tienes hoy y qué te gustaría mejorar o agregar?',
        help: 'Si sabes con qué está hecho (WordPress, Wix, un programa a medida…), cuéntanos.', showIf: (a) => has(a, 'q3', Q3.improve),
      },
      {
        id: 'improve_access', type: 'single', label: '¿Tienes acceso a todo lo de ese sistema? (dominio, hosting, código, contraseñas)',
        options: ['Sí, tengo todo.', 'Tengo una parte.', 'No, lo maneja otra persona o empresa.', 'No lo sé.'], showIf: (a) => has(a, 'q3', Q3.improve),
      },
      {
        id: 'q4', type: 'textarea', label: '¿Qué problema quieres resolver con este proyecto?',
        help: 'Por ejemplo: pierdo mucho tiempo con tareas manuales, tengo dificultades para organizar clientes, quiero vender por Internet o necesito centralizar información.',
      },
      {
        id: 'q5', type: 'multi', label: '¿Cómo resuelves actualmente ese problema?',
        options: ['Con papel o anotaciones.', 'Con Excel o planillas.', 'Con WhatsApp, correo electrónico u otras aplicaciones.', 'Con un programa que ya utilizo.', 'Lo hago manualmente y me lleva mucho tiempo.', 'Todavía no tengo un proceso definido.', 'Otro'],
        detailFor: ['Otro'], detailLabel: '¿Cómo?',
      },
      { id: 'q6', type: 'textarea', label: '¿Qué te gustaría conseguir cuando el proyecto esté terminado?' },
    ],
  },
  {
    id: 'usuarios',
    title: 'Quién utilizará la solución',
    questions: [
      { id: 'q7', type: 'multi', label: '¿Quiénes utilizarán el sistema?', help: 'Puedes marcar varias opciones.', options: Object.values(Q7) },
      {
        id: 'q8', type: 'textarea', label: '¿Qué debería poder hacer cada tipo de usuario?',
        help: 'Por ejemplo: un administrador puede gestionar todo, un empleado solamente puede consultar sus tareas y un cliente puede ver sus pedidos.',
        showIf: severalUserTypes,
      },
      {
        id: 'q9', type: 'single', label: '¿Necesitas que cada persona tenga su propia cuenta para ingresar?',
        options: ['Sí, con usuario y contraseña.', 'Sí, pero prefiero que ingresen con Google u otro servicio.', 'No, la información será pública.', 'Algunas personas necesitarán ingresar y otras no.', 'No lo sé.'],
        showIf: (a) => notOnlyPublic(a) && !isOnlyWeb(a),
      },
      { id: 'q10', type: 'multi', label: '¿Desde dónde se utilizará principalmente?', options: ['Celular.', 'Computadora.', 'Tablet.', 'Desde cualquier dispositivo.'] },
      { id: 'q11', type: 'textarea', label: '¿Quiénes podrán ver o modificar la información?', showIf: (a) => severalUserTypes(a) && !isOnlyWeb(a) },
    ],
  },
  {
    id: 'web',
    title: 'Tu página web',
    intro: 'Unas preguntas sobre la parte que verá cualquier persona.',
    showIf: wantsWebOrShop,
    questions: [
      {
        id: 'web_sections', type: 'multi', label: '¿Qué secciones te gustaría que tenga?',
        options: ['Inicio.', 'Quiénes somos.', 'Servicios.', 'Productos o catálogo.', 'Galería de fotos o trabajos.', 'Opiniones de clientes.', 'Preguntas frecuentes.', 'Novedades o blog.', 'Contacto.', 'Otra'],
        detailFor: ['Otra'], detailLabel: '¿Cuáles?',
      },
      {
        id: 'web_update', type: 'single', label: '¿Quieres poder cambiar tú mismo textos, fotos o precios?',
        options: ['Sí, seguido.', 'De vez en cuando.', 'No, prefiero pedir los cambios.'],
      },
    ],
  },
  {
    id: 'ventas',
    title: 'Ventas, pedidos o reservas',
    showIf: sellsOrBooks,
    questions: [
      { id: 'shop_what', type: 'textarea', label: '¿Qué vendes, qué te piden o qué reservan tus clientes?', placeholder: 'Ej: ropa en 3 talles, turnos de 30 minutos, mesas para eventos…' },
      { id: 'shop_delivery', type: 'multi', label: '¿Cómo entregas o das el servicio?', options: ['Envío a domicilio.', 'Retiro en el local.', 'Es digital o a distancia.', 'Lo presto en mi local o en el de mi cliente.', 'No aplica.'] },
      {
        id: 'shop_pay', type: 'multi', label: '¿Cómo te gustaría cobrar?',
        options: ['Online con tarjeta o Mercado Pago.', 'Una seña y el resto después.', 'Transferencia.', 'En efectivo al entregar.', 'Una cuota mensual o suscripción.', 'No necesito cobrar por la web.'],
      },
    ],
  },
  {
    id: 'funciones',
    title: 'Funcionalidades que necesitas',
    questions: [
      { id: 'q12', type: 'multi', label: '¿Qué tareas te gustaría poder realizar con el sistema?', help: 'Marca todas las que correspondan.', options: Object.values(Q12), detailFor: [Q12.other], detailLabel: '¿Cuál?' },
      { id: 'q13', type: 'top3', label: 'Describe las tres cosas más importantes que debería poder hacer el sistema.' },
      {
        id: 'q14', type: 'textarea', label: '¿Qué debería suceder cuando una persona realiza una acción?',
        help: 'Por ejemplo: cuando un cliente realiza un pedido, quieres recibir un aviso, guardar el pedido y actualizar el estado de la compra.',
        showIf: (a) => !isOnlyWeb(a),
      },
      {
        id: 'q15', type: 'single', label: '¿Necesitas diferentes estados o etapas para gestionar algo?',
        help: 'Por ejemplo: pedido recibido, en preparación, enviado y entregado; o cliente nuevo, contactado y convertido en cliente.',
        options: YES_NO, detailFor: ['Sí.'], detailLabel: '¿Cuáles?', showIf: (a) => !isOnlyWeb(a),
      },
      {
        id: 'q16', type: 'single', label: '¿Necesitas que el sistema calcule automáticamente importes, porcentajes, comisiones, estadísticas u otros valores?',
        options: YES_NO, detailFor: ['Sí.'], detailLabel: 'Explica qué cálculos necesitas', showIf: (a) => !isOnlyWeb(a),
      },
      {
        id: 'q17', type: 'single', label: '¿Necesitas que el sistema genere documentos?',
        help: 'Por ejemplo: presupuestos, comprobantes, informes, contratos, etiquetas o archivos para descargar.',
        options: YES_NO, detailFor: ['Sí.'], detailLabel: '¿Cuáles?', showIf: (a) => !isOnlyWeb(a),
      },
      { id: 'q18', type: 'multi', label: '¿Necesitas que el sistema envíe notificaciones?', options: Object.values(Q18) },
      {
        id: 'q18_when', type: 'textarea', label: '¿En qué situaciones deberían enviarse?',
        showIf: (a) => arr(a, 'q18').some((x) => x !== Q18.none && x !== Q18.unsure),
      },
    ],
  },
  {
    id: 'informacion',
    title: 'Información y funcionamiento',
    showIf: (a) => !isOnlyWeb(a),
    questions: [
      {
        id: 'q19', type: 'textarea', label: '¿Qué información necesitas guardar?',
        help: 'Por ejemplo: nombres, teléfonos, direcciones, fotografías, documentos, historial de compras, pagos o información de servicios.',
      },
      {
        id: 'q20', type: 'multi', label: '¿Ya tienes esa información guardada en algún lugar?',
        options: ['En Excel o planillas.', 'En otro programa.', 'En documentos o archivos.', 'En papel.', 'En varias herramientas diferentes.', 'Todavía no tengo datos.', 'Otro'],
        detailFor: ['Otro'], detailLabel: '¿Dónde?',
      },
      {
        id: 'q21', type: 'single', label: 'Si ya tienes información guardada, ¿quieres pasarla al nuevo sistema?',
        options: ['Sí, toda.', 'Sí, solamente una parte.', 'No, comenzaré desde cero.', 'No lo sé.'],
        showIf: (a) => arr(a, 'q20').length > 0 && !has(a, 'q20', 'Todavía no tengo datos.'),
      },
      {
        id: 'q22', type: 'textarea', label: '¿Necesitas buscar, filtrar, ordenar o exportar la información?',
        help: 'Por ejemplo: buscar clientes por nombre, ver ventas de un mes o descargar un informe en Excel.',
      },
    ],
  },
  {
    id: 'conexiones',
    title: 'Conexión con otras herramientas',
    questions: [
      {
        id: 'q23', type: 'single', label: '¿Necesitas que el sistema se conecte con herramientas que ya utilizas?',
        help: 'Por ejemplo: WhatsApp, Google Calendar, Mercado Pago, facturación electrónica, Excel u otro programa.',
        options: YES_NO, detailFor: ['Sí.'], detailLabel: '¿Cuáles y para qué?',
      },
    ],
  },
  {
    id: 'diseno',
    title: 'Diseño y experiencia de uso',
    questions: [
      {
        id: 'q24', type: 'multi', label: '¿Cómo te gustaría que se viera el proyecto?',
        options: ['Sencillo y práctico.', 'Profesional y corporativo.', 'Moderno y visual.', 'Elegante o exclusivo.', 'Dinámico, con animaciones.', 'Similar a una página o aplicación que ya conozco.'],
      },
      {
        id: 'q25', type: 'single', label: '¿Tienes un logotipo, colores, fotografías o una imagen de referencia?',
        options: ['Sí, tengo logo, colores y fotos.', 'Tengo logo, pero no el resto.', 'No tengo nada todavía.'],
        detailFor: ['Sí, tengo logo, colores y fotos.', 'Tengo logo, pero no el resto.'], detailLabel: 'Cuéntanos qué tienes (puedes enviarlo después)',
      },
      { id: 'q26', type: 'textarea', label: '¿Hay alguna página web o aplicación cuyo diseño o funcionamiento te guste?', help: 'Indica cuál y qué te gustaría tomar como referencia.' },
      {
        id: 'q27', type: 'single', label: '¿Qué tan importante es que sea fácil de utilizar desde el celular?',
        options: ['Es fundamental.', 'Es importante, pero también se usará en computadora.', 'Se utilizará principalmente en computadora.', 'No lo sé.'],
      },
    ],
  },
  {
    id: 'crecimiento',
    title: 'Cantidad de usuarios y crecimiento',
    questions: [
      { id: 'q28', type: 'text', label: '¿Cuántas personas crees que utilizarán el sistema al principio?', placeholder: 'Respuesta aproximada', showIf: (a) => !isOnlyWeb(a) },
      { id: 'q29', type: 'text', label: '¿Cuántos clientes, productos, registros o elementos necesitas gestionar?', placeholder: 'Respuesta aproximada', showIf: (a) => !isOnlyWeb(a) || has(a, 'q3', Q3.shop) },
      {
        id: 'q30', type: 'single', label: '¿Crees que el proyecto crecerá en el futuro?',
        help: 'Por ejemplo: más empleados, más clientes, nuevas sucursales o nuevas funcionalidades.',
        options: ['Sí, probablemente.', 'No, será algo pequeño y estable.', 'Todavía no lo sé.'],
      },
      {
        id: 'q31', type: 'single', label: '¿Necesitas gestionar varias empresas, sucursales o negocios desde el mismo sistema?',
        options: YES_NO, detailFor: ['Sí.'], detailLabel: '¿Cuántas y cómo se relacionan?',
        showIf: (a) => !isOnlyWeb(a) && (str(a, 'q30').startsWith('Sí') || has(a, 'q7', Q7.staff) || has(a, 'q7', Q7.roles)),
      },
    ],
  },
  {
    id: 'seguridad',
    title: 'Seguridad, control y continuidad',
    showIf: (a) => !isOnlyWeb(a),
    questions: [
      { id: 'q32', type: 'textarea', label: '¿Hay información que deba ser privada o visible solamente para determinadas personas?' },
      { id: 'q33', type: 'single', label: '¿Necesitas guardar un historial de los cambios realizados?', help: 'Por ejemplo: saber quién modificó un precio, eliminó un registro o cambió el estado de un pedido.', options: YES_NO },
      { id: 'q34', type: 'single', label: '¿Qué tan grave sería que el sistema dejara de funcionar durante unas horas?', options: ['Sería una molestia menor.', 'Me impediría trabajar con normalidad.', 'Me ocasionaría pérdidas importantes.', 'No lo sé.'] },
      { id: 'q35', type: 'single', label: '¿Necesitas conservar copias de seguridad de la información?', options: ['Sí, automáticamente.', 'Sí, pero no necesito automatización.', 'No lo sé.'] },
    ],
  },
  {
    id: 'plazos',
    title: 'Plazos y presupuesto',
    questions: [
      {
        id: 'q36', type: 'single', label: '¿Cuándo te gustaría tener el proyecto funcionando?',
        options: ['Lo antes posible.', 'Dentro de un mes.', 'Dentro de dos o tres meses.', 'Dentro de seis meses.', 'Tengo una fecha concreta', 'No tengo una fecha definida.'],
        detailFor: ['Tengo una fecha concreta'], detailLabel: '¿Cuál?',
      },
      { id: 'q37', type: 'textarea', label: '¿Hay alguna fecha importante que debamos respetar?', help: 'Por ejemplo: lanzamiento comercial, apertura del negocio, temporada de ventas o presentación a un cliente.' },
      {
        id: 'q38', type: 'single', label: '¿Tienes un presupuesto aproximado para desarrollar el proyecto?',
        options: ['Menos de USD 300.', 'Entre USD 300 y USD 1.000.', 'Entre USD 1.000 y USD 3.000.', 'Entre USD 3.000 y USD 7.000.', 'Más de USD 7.000.', 'No tengo un presupuesto definido y necesito orientación.', 'Otro importe o moneda'],
        detailFor: ['Otro importe o moneda'], detailLabel: '¿Cuánto?',
      },
      {
        id: 'q39', type: 'multi', label: 'Después de la entrega, ¿qué tipo de ayuda necesitarás?',
        options: ['Solamente quiero el proyecto terminado.', 'Necesito capacitación para utilizarlo.', 'Necesito soporte si aparecen problemas.', 'Quiero que se mantenga y actualice periódicamente.', 'Quiero seguir agregando funcionalidades en el futuro.', 'No lo sé.'],
      },
    ],
  },
  {
    id: 'cierre',
    title: 'Para cerrar',
    questions: [
      { id: 'q40', type: 'textarea', label: 'Si tuvieras que elegir una sola cosa que el proyecto debe hacer perfectamente, ¿cuál sería?' },
      { id: 'q41', type: 'textarea', label: '¿Hay algo importante que no te hayamos preguntado?' },
      {
        id: 'q42', type: 'textarea', label: '¿Tienes ejemplos, archivos, fotografías, planillas o documentos que nos ayuden a entender mejor tu idea?',
        help: 'Cuéntanos qué tienes. Puedes enviarlos después por correo o WhatsApp.',
      },
    ],
  },
];

export const visibleSections = (a: BriefAnswers) =>
  SECTIONS.filter((s) => !s.showIf || s.showIf(a))
    .map((s) => ({ ...s, questions: s.questions.filter((q) => !q.showIf || q.showIf(a)) }))
    .filter((s) => s.questions.length > 0);

const isAnswered = (a: BriefAnswers, q: Question) => {
  const v = a[q.id];
  if (q.type === 'top3') return [1, 2, 3].some((i) => str(a, `${q.id}_${i}`).trim());
  return Array.isArray(v) ? v.length > 0 : !!v && String(v).trim().length > 0;
};

export function progress(a: BriefAnswers) {
  const qs = visibleSections(a).flatMap((s) => s.questions);
  const done = qs.filter((q) => isAnswered(a, q)).length;
  return { done, total: qs.length, pct: qs.length ? Math.round((done / qs.length) * 100) : 0 };
}

/** Respuestas como texto legible, para el panel y para copiar. */
export function briefAsText(a: BriefAnswers): string {
  const out: string[] = [];
  for (const s of visibleSections(a)) {
    out.push(`## ${s.title}`);
    for (const q of s.questions) {
      let v: string;
      if (q.type === 'top3') v = [1, 2, 3].map((i) => str(a, `${q.id}_${i}`)).filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n');
      else v = str(a, q.id);
      const d = str(a, `${q.id}_detail`);
      if (d) v += ` — ${d}`;
      out.push(`${q.label}\n${v || '(sin respuesta)'}\n`);
    }
  }
  return out.join('\n');
}
