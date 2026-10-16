/** Seguimiento de proyectos: tipos y cálculos compartidos entre el panel del cliente y el tuyo. */

export type StageStatus = 'pendiente' | 'en_curso' | 'revision' | 'aprobada';
export type Stage = { id: string; title: string; status: StageStatus; rounds_used: number; approved_at?: string | null };
export type Payment = { id: string; label: string; amount: number; paid: boolean; paid_at?: string | null };
export type Todo = { id: string; label: string; done: boolean };
export type ChangeStatus = 'nuevo' | 'incluido' | 'adicional' | 'aprobado' | 'rechazado' | 'descartado';
export type Change = {
  id: string; body: string; status: ChangeStatus; hours: number | null; price: number | null; days: number | null;
  admin_note: string; created_at: string; answered_at?: string | null; stage_id?: string | null;
};
export type Update = { id: string; body: string; link: string | null; created_at: string };

/** Lo que ve el cliente (sale de la función get_engagement). */
export type PublicEngagement = {
  client_name: string; title: string; scope: string[]; base_price: number; revision_rounds: number;
  stages: Stage[]; payments: Payment[]; client_todos: Todo[]; preview_url: string | null; status: string; created_at: string;
  updates: Update[]; changes: Change[];
};

/** Fila completa para tu panel. */
export type Engagement = Omit<PublicEngagement, 'updates' | 'changes'> & { id: string; token: string; quote_id: string | null; hourly_rate: number };

export const STAGE_LABEL: Record<StageStatus, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  revision: 'Esperando tu aprobación',
  aprobada: 'Aprobada',
};

export const CHANGE_LABEL: Record<ChangeStatus, string> = {
  nuevo: 'En revisión',
  incluido: 'Incluido en lo acordado',
  adicional: 'Adicional: espera tu aprobación',
  aprobado: 'Adicional aprobado',
  rechazado: 'No se hace',
  descartado: 'Descartado',
};

export const DEFAULT_STAGES = ['Definición y diseño', 'Desarrollo', 'Pruebas y ajustes', 'Publicación'];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const usd = (n: number) => `USD ${Math.round(n).toLocaleString('es-UY')}`;

/** Avance: cada etapa aprobada suma completa, la que está en curso o en revisión suma media. */
export function progressPct(stages: Stage[]): number {
  if (!stages.length) return 0;
  const pts = stages.reduce((acc, s) => acc + (s.status === 'aprobada' ? 1 : s.status === 'revision' ? 0.8 : s.status === 'en_curso' ? 0.4 : 0), 0);
  return Math.round((pts / stages.length) * 100);
}

export function totals(base: number, changes: Change[], payments: Payment[]) {
  const extras = changes.filter((c) => c.status === 'aprobado').reduce((acc, c) => acc + (Number(c.price) || 0), 0);
  const total = base + extras;
  const paid = payments.filter((p) => p.paid).reduce((acc, p) => acc + Number(p.amount || 0), 0);
  return { extras, total, paid, pending: Math.max(0, total - paid) };
}

/** Días de calendario que suma un adicional, según tus horas libres por semana. */
export const extraDays = (hours: number, hoursPerWeek: number) => Math.max(1, Math.ceil((hours / Math.max(1, hoursPerWeek)) * 7));

export const roundsLeft = (stage: Stage | undefined, total: number) => (stage ? Math.max(0, total - (stage.rounds_used || 0)) : total);

export const currentStage = (stages: Stage[]) => stages.find((s) => s.status === 'en_curso' || s.status === 'revision') ?? stages.find((s) => s.status === 'pendiente');
