import { supabase } from './supabase';

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

export const SERVICE_OPTIONS = ['Página web', 'App a medida', 'Dashboard', 'Integración', 'Soporte', 'Otro / no sé todavía'];

/** Guarda la consulta en Supabase. Devuelve false si no hay backend o falla, para ofrecer el correo como alternativa. */
export async function sendLead(lead: LeadInput): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('leads').insert({
    name: lead.name.trim(),
    email: lead.email.trim(),
    phone: lead.phone.trim() || null,
    service: lead.service,
    message: lead.message.trim(),
  });
  return !error;
}
