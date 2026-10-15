import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, ImagePlus, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase, PORTFOLIO_BUCKET } from '../lib/supabase';
import { slugify, type Project } from '../lib/projects';
import { Logo } from '../components/Logo';

type Lead = { id: string; name: string; email: string; phone: string | null; service: string; message: string; status: string; created_at: string };
type Draft = Omit<Project, 'id'> & { id?: string; tagsText: string };

const blank = (): Draft => ({
  slug: '', title: '', client: '', summary: '', body: '', tags: [], tagsText: '', url: '', cover_url: '', gallery: [],
  year: new Date().getFullYear(), featured: false, published: false, sort: 0,
});

async function upload(file: File): Promise<string> {
  if (!supabase) throw new Error('Sin Supabase');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setErr('El correo o la contraseña no son correctos.');
    setBusy(false);
  };
  return (
    <form className="form admin-login" onSubmit={submit}>
      <h1>Entrar al panel</h1>
      <label className="field"><span>Correo</span><input id="adm-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
      <label className="field"><span>Contraseña</span><input id="adm-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {err && <p className="form-note" role="alert">{err}</p>}
      <button className="btn btn-hot" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

function ProjectForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const onTitle = (v: string) => setD((p) => ({ ...p, title: v, slug: p.id ? p.slug : slugify(v) }));

  const addCover = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr('');
    try { set('cover_url', await upload(f)); } catch { setErr('No se pudo subir la imagen. Probá con un JPG, PNG o WEBP de menos de 8 MB.'); }
    setBusy(false);
  };
  const addGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await upload(f));
      setD((p) => ({ ...p, gallery: [...p.gallery, ...urls] }));
    } catch { setErr('Alguna imagen no se pudo subir. Probá con JPG, PNG o WEBP de menos de 8 MB.'); }
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const row = {
      slug: d.slug || slugify(d.title), title: d.title.trim(), client: d.client.trim(), summary: d.summary.trim(), body: d.body,
      tags: d.tagsText.split(',').map((t) => t.trim()).filter(Boolean), url: d.url?.trim() || null, cover_url: d.cover_url || null,
      gallery: d.gallery, year: d.year || null, featured: d.featured, published: d.published, sort: Number(d.sort) || 0,
    };
    const q = d.id ? supabase!.from('projects').update(row).eq('id', d.id) : supabase!.from('projects').insert(row);
    const { error } = await q;
    setBusy(false);
    if (error) setErr(error.message.includes('duplicate') ? 'Ya existe un proyecto con esa dirección (slug). Cambiala.' : `No se pudo guardar: ${error.message}`);
    else onDone();
  };

  return (
    <form className="form admin-form" onSubmit={save}>
      <div className="admin-form-head">
        <h2>{d.id ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
        <button type="button" className="icon-btn" onClick={onDone} aria-label="Cerrar"><X size={18} /></button>
      </div>
      <div className="field-row">
        <label className="field"><span>Título</span><input id="p-title" required value={d.title} onChange={(e) => onTitle(e.target.value)} maxLength={120} /></label>
        <label className="field"><span>Dirección (slug)</span><input id="p-slug" required value={d.slug} onChange={(e) => set('slug', slugify(e.target.value))} /></label>
      </div>
      <div className="field-row">
        <label className="field"><span>Cliente</span><input id="p-client" value={d.client} onChange={(e) => set('client', e.target.value)} placeholder="Nombre · rubro" /></label>
        <label className="field"><span>Año</span><input id="p-year" type="number" value={d.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)} /></label>
      </div>
      <label className="field"><span>Resumen (se ve en la tarjeta)</span><textarea id="p-summary" rows={2} maxLength={400} value={d.summary} onChange={(e) => set('summary', e.target.value)} /></label>
      <label className="field">
        <span>Descripción completa</span>
        <textarea id="p-body" rows={10} value={d.body} onChange={(e) => set('body', e.target.value)}
          placeholder={'## El desafío\nQué necesitaba el cliente.\n\n## La solución\n- Una función\n- Otra función'} />
        <small>Una línea con "## " es un subtítulo, con "- " es un punto de lista. Dejá una línea vacía entre párrafos.</small>
      </label>
      <div className="field-row">
        <label className="field"><span>Etiquetas (separadas por coma)</span><input id="p-tags" value={d.tagsText} onChange={(e) => set('tagsText', e.target.value)} placeholder="Web, React, Supabase" /></label>
        <label className="field"><span>Enlace al proyecto</span><input id="p-url" type="url" value={d.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></label>
      </div>
      <div className="field-row">
        <div className="field">
          <span>Imagen de portada</span>
          <div className="upload-row">
            {d.cover_url && <img className="thumb" src={d.cover_url} alt="" />}
            <label className="btn btn-ghost sm"><ImagePlus size={16} /> {d.cover_url ? 'Cambiar' : 'Subir'}
              <input type="file" accept="image/*" hidden onChange={(e) => addCover(e.target.files?.[0])} /></label>
          </div>
        </div>
        <div className="field">
          <span>Galería de capturas</span>
          <div className="upload-row">
            {d.gallery.map((g) => (
              <span key={g} className="thumb-wrap">
                <img className="thumb" src={g} alt="" />
                <button type="button" className="thumb-x" aria-label="Quitar captura" onClick={() => set('gallery', d.gallery.filter((x) => x !== g))}><X size={12} /></button>
              </span>
            ))}
            <label className="btn btn-ghost sm"><ImagePlus size={16} /> Agregar
              <input type="file" accept="image/*" multiple hidden onChange={(e) => addGallery(e.target.files)} /></label>
          </div>
        </div>
      </div>
      <div className="checks">
        <label><input type="checkbox" checked={d.published} onChange={(e) => set('published', e.target.checked)} /> Publicado</label>
        <label><input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} /> Destacado (tarjeta grande)</label>
        <label className="inline-num">Orden <input id="p-sort" type="number" value={d.sort} onChange={(e) => set('sort', Number(e.target.value))} /></label>
      </div>
      {err && <p className="form-note" role="alert">{err}</p>}
      <div className="admin-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-hot" disabled={busy}>{busy ? 'Guardando…' : 'Guardar proyecto'}</button>
      </div>
    </form>
  );
}

function Panel({ session }: { session: Session }) {
  const [tab, setTab] = useState<'projects' | 'leads'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const adm = await supabase!.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    setIsAdmin(!!adm.data);
    if (!adm.data) return;
    const [p, l] = await Promise.all([
      supabase!.from('projects').select('*').order('featured', { ascending: false }).order('sort').order('year', { ascending: false }),
      supabase!.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setProjects((p.data ?? []) as Project[]);
    setLeads((l.data ?? []) as Lead[]);
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => { await supabase!.from('projects').delete().eq('id', id); setConfirmDel(null); load(); };
  const setStatus = async (id: string, status: string) => { await supabase!.from('leads').update({ status }).eq('id', id); load(); };
  const newCount = leads.filter((l) => l.status === 'nuevo').length;

  if (isAdmin === false)
    return (
      <div className="admin-empty">
        <p>Tu usuario ({session.user.email}) todavía no es administrador. Agregalo con el SQL del README.</p>
        <button className="btn btn-ghost" onClick={() => supabase!.auth.signOut()}>Salir</button>
      </div>
    );

  return (
    <div className="admin-panel">
      <div className="admin-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'projects'} className={tab === 'projects' ? 'on' : ''} onClick={() => setTab('projects')}>Proyectos ({projects.length})</button>
        <button role="tab" aria-selected={tab === 'leads'} className={tab === 'leads' ? 'on' : ''} onClick={() => setTab('leads')}>
          Consultas {newCount > 0 && <span className="badge">{newCount} nuevas</span>}
        </button>
      </div>

      {tab === 'projects' && (
        <>
          {editing ? (
            <ProjectForm initial={editing} onDone={() => { setEditing(null); load(); }} />
          ) : (
            <button className="btn btn-hot" onClick={() => setEditing(blank())}><Plus size={16} /> Nuevo proyecto</button>
          )}
          <ul className="admin-list">
            {projects.map((p) => (
              <li key={p.id}>
                {p.cover_url ? <img className="thumb" src={p.cover_url} alt="" /> : <span className="thumb" />}
                <div className="admin-list-main">
                  <b>{p.title}</b>
                  <span className="muted">{p.client} {p.year ? `· ${p.year}` : ''}</span>
                </div>
                <span className={`pill ${p.published ? 'ok' : ''}`}>{p.published ? 'Publicado' : 'Borrador'}</span>
                {p.featured && <span className="pill">Destacado</span>}
                <button className="icon-btn" aria-label={`Editar ${p.title}`} onClick={() => setEditing({ ...p, tagsText: p.tags.join(', ') })}><Pencil size={16} /></button>
                {confirmDel === p.id ? (
                  <span className="confirm">¿Borrar? <button className="btn btn-danger sm" onClick={() => del(p.id)}>Sí, borrar</button><button className="btn btn-ghost sm" onClick={() => setConfirmDel(null)}>No</button></span>
                ) : (
                  <button className="icon-btn" aria-label={`Borrar ${p.title}`} onClick={() => setConfirmDel(p.id)}><Trash2 size={16} /></button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'leads' && (
        <ul className="admin-leads">
          {leads.length === 0 && <li className="muted">Todavía no llegaron consultas. Las que entren por el formulario de contacto aparecen acá.</li>}
          {leads.map((l) => (
            <li key={l.id} className={`lead-card lead-${l.status}`}>
              <div className="lead-head">
                <b>{l.name}</b>
                <span className="pill">{l.service}</span>
                <span className="muted mono">{new Date(l.created_at).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <p>{l.message}</p>
              <div className="lead-foot">
                <span className="mono select">{l.email}</span>
                {l.phone && <span className="mono select">{l.phone}</span>}
                {l.phone && <a className="link" href={`https://wa.me/${l.phone.replace(/\D/g, '').replace(/^0/, '598')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                <select aria-label="Estado de la consulta" value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}>
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'Panel · JD Soluciones';
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="admin">
      <header className="admin-bar">
        <Link to="/" className="nav-brand"><Logo compact /></Link>
        <Link to="/" className="link"><ArrowLeft size={14} /> Ver sitio</Link>
        {session && <button className="btn btn-ghost sm" onClick={() => supabase!.auth.signOut()}><LogOut size={14} /> Salir</button>}
      </header>
      <div className="container admin-body">
        {!supabase ? (
          <div className="admin-empty">
            <h1>Falta conectar Supabase</h1>
            <p>Creá el archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver README) y volvé a compilar.</p>
          </div>
        ) : session === undefined ? (
          <p className="muted">Cargando…</p>
        ) : session ? (
          <Panel session={session} />
        ) : (
          <Login />
        )}
      </div>
    </div>
  );
}
