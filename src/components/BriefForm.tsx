import { Check } from 'lucide-react';
import { str, arr, type BriefAnswers, type Question, type Section } from '../lib/brief';

type Props = {
  sections: Section[];
  answers: BriefAnswers;
  onChange: (next: BriefAnswers) => void;
  disabled?: boolean;
};

function QuestionField({ q, a, set, disabled }: { q: Question; a: BriefAnswers; set: (id: string, v: string | string[]) => void; disabled?: boolean }) {
  const fid = `b-${q.id}`;
  const showDetail = q.detailFor?.some((o) => arr(a, q.id).includes(o));

  return (
    <fieldset className="bq" disabled={disabled}>
      <legend className="bq-label">{q.label}</legend>
      {q.help && <p className="bq-help">{q.help}</p>}

      {q.type === 'text' && <input id={fid} value={str(a, q.id)} placeholder={q.placeholder} onChange={(e) => set(q.id, e.target.value)} maxLength={300} />}
      {q.type === 'textarea' && <textarea id={fid} rows={3} value={str(a, q.id)} placeholder={q.placeholder ?? 'Respuesta'} onChange={(e) => set(q.id, e.target.value)} maxLength={3000} />}

      {q.type === 'top3' && (
        <div className="bq-top3">
          {[1, 2, 3].map((i) => (
            <label key={i} className="bq-top3-row">
              <span className="mono">{i}</span>
              <input id={`${fid}-${i}`} value={str(a, `${q.id}_${i}`)} onChange={(e) => set(`${q.id}_${i}`, e.target.value)} maxLength={300} />
            </label>
          ))}
        </div>
      )}

      {(q.type === 'single' || q.type === 'multi') && (
        <div className="bq-options" role={q.type === 'single' ? 'radiogroup' : 'group'}>
          {q.options!.map((o) => {
            const sel = arr(a, q.id);
            const on = sel.includes(o);
            const toggle = () => {
              if (q.type === 'single') set(q.id, on ? '' : o);
              else set(q.id, on ? sel.filter((x) => x !== o) : [...sel, o]);
            };
            return (
              <button key={o} type="button" role={q.type === 'single' ? 'radio' : 'checkbox'} aria-checked={on}
                className={`bq-opt ${q.type}${on ? ' on' : ''}`} onClick={toggle}>
                <span className="bq-mark">{on && <Check size={13} strokeWidth={3} />}</span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
      )}

      {showDetail && (
        <label className="field bq-detail">
          <span>{q.detailLabel ?? 'Detalle'}</span>
          <input id={`${fid}-detail`} value={str(a, `${q.id}_detail`)} onChange={(e) => set(`${q.id}_detail`, e.target.value)} maxLength={500} />
        </label>
      )}
    </fieldset>
  );
}

/** Dibuja las secciones que se le pasan; quien lo usa decide si van todas juntas o de a una. */
export function BriefForm({ sections, answers, onChange, disabled }: Props) {
  const set = (id: string, v: string | string[]) => onChange({ ...answers, [id]: v });
  return (
    <div className="brief-form">
      {sections.map((s) => (
        <section key={s.id} className="bs">
          <h2>{s.title}</h2>
          {s.intro && <p className="bq-help">{s.intro}</p>}
          {s.questions.map((q) => <QuestionField key={q.id} q={q} a={answers} set={set} disabled={disabled} />)}
        </section>
      ))}
    </div>
  );
}
