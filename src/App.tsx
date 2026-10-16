import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import ProjectPage from './pages/ProjectPage';
import NotFound from './pages/NotFound';

const Admin = lazy(() => import('./pages/Admin'));
const BriefPage = lazy(() => import('./pages/BriefPage'));
const EngagementPage = lazy(() => import('./pages/EngagementPage'));

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/cuestionario') || pathname.startsWith('/proyecto/');
  return (
    <>
      {!isAdmin && <Nav />}
      <main>
        <Suspense fallback={<div className="page-loading container">Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/proyectos/:slug" element={<ProjectPage />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/cuestionario/:token" element={<BriefPage />} />
            <Route path="/proyecto/:token" element={<EngagementPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}
