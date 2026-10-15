import { supabase } from './supabase';

export type Project = {
  id: string;
  slug: string;
  title: string;
  client: string;
  summary: string;
  /** Texto largo; párrafos separados por una línea en blanco. Una línea que empieza con "## " es un subtítulo y con "- " un punto de lista. */
  body: string;
  tags: string[];
  url: string | null;
  cover_url: string | null;
  gallery: string[];
  year: number | null;
  featured: boolean;
  published: boolean;
  sort: number;
};

/** Proyectos de respaldo: se muestran si no hay Supabase configurado o si la consulta falla. */
export const SEED_PROJECTS: Project[] = [
  {
    id: 'seed-team-valkyria',
    slug: 'team-valkyria',
    title: 'Team Valkyria',
    client: 'Mariana Ayala · entrenadora personal',
    summary:
      'App web para una entrenadora personal y sus clientas: rutinas con ejercicios animados, dieta y macros, recetario propio, seguimiento semanal y cobros mensuales.',
    body: `## El desafío
Maru llevaba las rutinas, las dietas y el seguimiento de sus clientas entre planillas, PDFs y mensajes de WhatsApp. Necesitaba un solo lugar para armar los planes, ver cómo entrena cada clienta y que ellas tuvieran todo a mano en el celular.

## La solución
Una app web instalable, con su marca, en dos versiones: la de la entrenadora y la de cada clienta.
- La entrenadora da de alta a una clienta con nombre y correo, y le llega una invitación por email.
- Rutinas con series, repeticiones, peso, descanso y hasta dos variaciones por ejercicio por si la máquina está ocupada.
- Biblioteca de más de 1.500 ejercicios animados en español, más los ejercicios propios de la entrenadora con video.
- Recetario con 200 recetas originales con ingredientes del mercado uruguayo, filtros y modo cocina paso a paso.
- Dieta de referencia, macros diarios y seguimiento semanal de sesiones, peso y fuerza.
- Notificaciones push, cobros mensuales y modo claro u oscuro.

## Tecnología
React y TypeScript en el frontend, publicado en Cloudflare Pages. Supabase como backend: base de datos Postgres con seguridad por filas, autenticación por invitación, almacenamiento de videos y fotos, y funciones en el servidor para invitaciones y notificaciones.`,
    tags: ['App web', 'React', 'TypeScript', 'Supabase', 'Notificaciones push'],
    url: 'https://maru-ayala.com',
    cover_url: '/proyectos/team-valkyria/logo.webp',
    gallery: [],
    year: 2026,
    featured: true,
    published: true,
    sort: 0,
  },
];

const COLUMNS = 'id,slug,title,client,summary,body,tags,url,cover_url,gallery,year,featured,published,sort';

export async function listProjects(): Promise<Project[]> {
  if (!supabase) return SEED_PROJECTS;
  const { data, error } = await supabase
    .from('projects')
    .select(COLUMNS)
    .eq('published', true)
    .order('featured', { ascending: false })
    .order('sort', { ascending: true })
    .order('year', { ascending: false });
  if (error || !data || data.length === 0) return SEED_PROJECTS;
  return data as Project[];
}

export async function getProject(slug: string): Promise<Project | null> {
  if (supabase) {
    const { data } = await supabase.from('projects').select(COLUMNS).eq('slug', slug).eq('published', true).maybeSingle();
    if (data) return data as Project;
  }
  return SEED_PROJECTS.find((p) => p.slug === slug) ?? null;
}

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
