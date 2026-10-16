# JD Soluciones Informáticas

Sitio de servicios y portafolio de JD Soluciones: webs, apps a medida, dashboards, integraciones y soporte.

- **Identidad "Nodo":** modo oscuro *Noche* (azul noche + celeste) y modo claro *Río* (azul profundo + amarillo sol). Sigue el tema del dispositivo y tiene un botón para cambiarlo.
- **Frontend:** React + TypeScript + Vite. Sitio estático para Cloudflare Pages.
- **Backend:** Supabase (proyectos del portafolio, consultas del formulario y fotos).

La conexión con Supabase viene incluida en `src/lib/supabase.ts` (la URL y la clave publicable son públicas por diseño; lo que protege los datos es la seguridad por filas). Las variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` son opcionales y la pisan.

---

## 1. Correrlo en tu PC

Requisitos: Node.js 20.19 o superior.

```bash
npm install
npm run dev
```

Abrí <http://localhost:5173>.

| Comando | Qué hace |
|---|---|
| `npm run build` | Chequeo de tipos + build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` |

## 2. Qué tiene

| Ruta | Contenido |
|---|---|
| `/` | Inicio con red de nodos interactiva, servicios, proyectos, cómo trabajo y contacto |
| `/proyectos/:slug` | Página de cada proyecto (caso de estudio) |
| `/admin` | Panel privado: cargar, editar y borrar proyectos con fotos, y ver las consultas que llegan |

Animaciones: red de nodos que sigue al puntero (hero y casos), palabra que se escribe sola, cinta de tecnologías, entradas al hacer scroll, tarjetas con brillo e inclinación 3D, línea de pasos que se completa con el scroll y logo que se dibuja al cargar. Todo respeta "reducir movimiento" del sistema.

## 3. Conectar Supabase

1. Creá un proyecto nuevo en <https://supabase.com> (por ejemplo `jd-soluciones`).
2. En **SQL Editor**, pegá y ejecutá `supabase/migrations/20261015120000_portfolio.sql`. Crea las tablas `projects`, `leads` y `admins`, la seguridad por filas, el bucket de fotos `portfolio` y carga Team Valkyria.
3. **Tu usuario de administrador:** Authentication → Users → *Add user* → *Create new user* con tu correo y una contraseña, marcando *Auto Confirm User*. Después, en el SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'jesusagenciaroi@gmail.com';
   ```
4. **Desactivá el registro público:** Authentication → Sign In / Providers → "Allow new users to sign up" desactivado.
5. Creá el archivo `.env` (copiá `.env.example`) con la URL y la *publishable/anon key* de Project Settings → API:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

Seguridad:

| Tabla | Quién lee | Quién escribe |
|---|---|---|
| `projects` | Cualquiera, solo los publicados (el admin ve también los borradores) | Solo admin |
| `leads` | Solo admin | Cualquiera puede **crear** una consulta; solo admin la cambia o borra |
| `admins` | Cada uno ve si es admin | Solo desde el SQL Editor |
| Storage `portfolio` | Público por URL | Solo admin |

## 4. Publicar en Cloudflare

El proyecto se publica como Worker con archivos estáticos (`wrangler.jsonc`).

1. Cloudflare → Workers & Pages → *Create* → *Import a repository* → elegí `JDSolucionesInformaticas`.
2. Configuración:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
3. En *Settings → Build → Variables and secrets* (variables **de build**, porque Vite las mete en el sitio al compilar): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `NODE_VERSION=22`.
4. Cuando tengas el dominio (por ejemplo `jdsoluciones.uy`), agregalo en *Settings → Domains & Routes*.

`"not_found_handling": "single-page-application"` en `wrangler.jsonc` hace que las rutas como `/proyectos/team-valkyria` o `/admin` funcionen al recargar.

## 5. Personalizar

- **Correo y WhatsApp:** `src/lib/brand.ts`. Poné tu número en `whatsapp` (formato `598XXXXXXXX`) y aparece el botón de WhatsApp en contacto.
- **Servicios:** `src/components/Services.tsx`.
- **Pasos de trabajo:** `src/components/Process.tsx`.
- **Tecnologías de la cinta:** `src/components/Marquee.tsx`.
- **Colores y tipografías:** tokens al principio de `src/styles.css`.

## 6. Agregar un proyecto nuevo

Entrá a `/admin`, iniciá sesión y tocá **Nuevo proyecto**. Completá título, cliente, resumen, descripción, etiquetas, enlace, portada y capturas, y marcá **Publicado**. Aparece en el sitio al instante, sin volver a publicar.

En la descripción, una línea que empieza con `## ` es un subtítulo y una con `- ` es un punto de lista.

## 7. Cuestionario y cotizador

### Cuestionario para el cliente
Cuando un cliente te contacta, en `/admin` → **Cotizador** creás un cuestionario con su nombre (o desde **Consultas** → *Enviar cuestionario*). Se genera un enlace único (`/cuestionario/<código>`) y un mensaje listo para mandar por WhatsApp o correo.

- El cliente lo completa desde el celular, por secciones, con barra de progreso.
- **Se adapta a sus respuestas:** si solo quiere una web de presentación, se saltean las preguntas de datos y seguridad; si vende o recibe reservas, aparecen preguntas de entrega y cobro; si quiere mejorar algo existente, pregunta qué tiene y si tiene los accesos; los "¿Cuáles?" se abren solo al marcar "Sí".
- **Se guarda solo** mientras escribe: puede seguir otro día con el mismo enlace. Al enviarlo ya no se puede modificar.
- El enlace es secreto y solo da acceso a ese cuestionario (funciones `get_brief` y `save_brief`).
- Las preguntas están en `src/lib/brief.ts`: podés cambiar textos u opciones ahí.

### Cotizador
En la lista de cuestionarios tocás **Cotizar**, o **Completarlo yo en una llamada** si preferís hacerlo hablando.

1. Las respuestas se traducen en **bloques de trabajo** con horas: cuentas de usuario, permisos, información a gestionar, pedidos, cobros, avisos por canal, conexiones, diseño, migración de datos, seguridad, etc. Cada bloque dice de qué respuesta sale.
2. Podés **apagar bloques, cambiar sus horas o agregar ítems** que el cuestionario no cubre.
3. Se suman reuniones y gestión, pruebas, y un margen según cuántas respuestas quedaron en "no lo sé".
4. A la derecha: **Piso / Recomendado / Techo** en USD, plazo según tus horas por semana, mantenimiento mensual, el presupuesto que indicó el cliente y avisos (presupuesto por debajo de tu piso, urgencia, WhatsApp, proyecto grande…).
5. **Propuesta** lista para copiar, con el alcance en lenguaje del cliente, precio, plazo y forma de pago.
6. **Guardar cotización** y, al terminar el proyecto, cargar las **horas reales** para ver si estás estimando bien.

**Mis tarifas y supuestos:** valores sugeridos USD 15 / 22 / 32 la hora (piso, objetivo, alta), por debajo de la referencia de un freelance en Uruguay (USD 25–45) para conseguir los primeros clientes.

Tablas y funciones: `supabase/migrations/20261016120000_quotes.sql`.

## 8. Pendiente

- **Aviso de consultas nuevas por correo o push:** hoy las consultas quedan en `/admin` → Consultas. El siguiente paso es una Edge Function que te mande un mail (con Resend) y una notificación push cada vez que entra una.
- **Capturas de Team Valkyria:** subilas desde el panel para reemplazar el logo como portada.
