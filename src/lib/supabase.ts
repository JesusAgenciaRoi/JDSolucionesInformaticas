import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cliente de Supabase, o null si el sitio corre sin backend (los proyectos salen de seed.ts). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const PORTFOLIO_BUCKET = 'portfolio';
