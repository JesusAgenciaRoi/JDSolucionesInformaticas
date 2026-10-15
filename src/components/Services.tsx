import { useRef } from 'react';
import { Globe, Smartphone, BarChart3, Plug, LifeBuoy } from 'lucide-react';

const SERVICES = [
  {
    icon: Globe,
    title: 'Páginas web',
    text: 'Sitios institucionales, landings y catálogos que cargan rápido, se ven bien en el celular y aparecen en Google.',
    items: ['Diseño a medida, sin plantillas', 'Dominio, hosting y correo', 'Formularios y WhatsApp'],
  },
  {
    icon: Smartphone,
    title: 'Apps a medida',
    text: 'Sistemas para gestionar clientes, turnos, pedidos o stock, con usuarios y permisos, instalables en el celular.',
    items: ['Panel para vos y para tus clientes', 'Funciona en cualquier dispositivo', 'Notificaciones push'],
  },
  {
    icon: BarChart3,
    title: 'Dashboards',
    text: 'Tus ventas, tu publicidad y tus métricas en un solo lugar, actualizadas solas y fáciles de leer.',
    items: ['Meta, Google y TikTok Ads', 'Reportes automáticos', 'Indicadores a tu medida'],
  },
  {
    icon: Plug,
    title: 'Integraciones',
    text: 'Hago que tus sistemas hablen entre sí y automatizo las tareas que hoy hacés a mano.',
    items: ['Cobros con Mercado Pago', 'APIs, planillas y correo', 'Automatizaciones'],
  },
  {
    icon: LifeBuoy,
    title: 'Soporte',
    text: 'Mantengo tu web o tu sistema funcionando, con mejoras, respaldos y arreglos cuando hacen falta.',
    items: ['Mantenimiento mensual', 'Respaldos y seguridad', 'Mejoras continuas'],
  },
];

function ServiceCard({ s, i }: { s: (typeof SERVICES)[number]; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const Icon = s.icon;
  return (
    <article ref={ref} className="service reveal" style={{ ['--d' as string]: `${i * 70}ms` }} onPointerMove={onMove}>
      <div className="service-icon"><Icon size={22} strokeWidth={1.8} /></div>
      <h3>{s.title}</h3>
      <p>{s.text}</p>
      <ul>
        {s.items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </article>
  );
}

export function Services() {
  return (
    <section className="section" id="servicios">
      <div className="container">
        <header className="section-head reveal">
          <p className="eyebrow"><span className="dot" /> Servicios</p>
          <h2>Lo que puedo hacer por tu negocio</h2>
          <p className="lead">Desde una página para mostrar lo que hacés hasta el sistema que ordena todo tu trabajo. Vos me contás el problema y yo lo resuelvo con la tecnología que corresponde.</p>
        </header>
        <div className="services">
          {SERVICES.map((s, i) => <ServiceCard key={s.title} s={s} i={i} />)}
        </div>
      </div>
    </section>
  );
}
