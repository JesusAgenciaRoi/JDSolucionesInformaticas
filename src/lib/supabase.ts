import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// La URL y la clave publicable son públicas por diseño (van en el navegador de todos los visitantes):
// lo que protege los datos son las reglas de seguridad por filas de la base. Se pueden pisar con
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; con "off" el sitio funciona sin backend.
const DEFAULT_URL = 'https://vsnqqbpxdivcbplhqqpv.supabase.co';
const DEFAULT_KEY = 'sb_publishable_qW8117Ch4rQx3U0Yft_ULg_Y8f5fgfP';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

/** Cliente de Supabase, o null si se desactivó con VITE_SUPABASE_URL=off. */
export const supabase: SupabaseClient | null = url === 'off' ? null : createClient(url, key);

export const PORTFOLIO_BUCKET = 'portfolio';
