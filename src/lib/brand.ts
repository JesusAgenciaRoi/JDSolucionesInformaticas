/** Identidad y datos de contacto: un solo lugar para cambiarlos. */
export const BRAND = {
  name: 'JD Soluciones',
  full: 'JD Soluciones Informáticas',
  email: 'jesusagenciaroi@gmail.com',
  /** WhatsApp en formato internacional, solo dígitos (ej: 59899123456). Vacío = no se muestra. */
  whatsapp: '',
  city: 'Uruguay',
};

export const whatsappUrl = (text = 'Hola! Quiero consultar por un proyecto.') =>
  BRAND.whatsapp ? `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}` : '';
