import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="container notfound">
      <p className="eyebrow mono">404</p>
      <h1>Esta página no existe</h1>
      <p className="lead">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <Link className="btn btn-hot" to="/"><ArrowLeft size={16} /> Volver al inicio</Link>
    </section>
  );
}
