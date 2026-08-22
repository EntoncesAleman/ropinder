# ADMIN_AUDIT.md — Ropinder

Auditoría del panel admin actual (`app/admin/page.tsx`, 763 líneas, single-page con tabs) antes de rediseñarlo. Todo lo listado abajo es real — verificado leyendo el código y las 23 rutas bajo `app/api/admin/`, no inferido.

## 1. Qué existe hoy, tab por tab

| Tab | Qué hace | Backend real |
|---|---|---|
| **Resumen** | 12 stat cards (usuarios, suspendidos, premium, verificados, prendas, matches, reportes pendientes/resueltos, ventas por custodia, GMV, comisión, ingresos créditos/premium) | `GET /api/admin/stats` — datos reales, no mock |
| **Reportes** | Lista reportes pendientes, resolver/descartar, reembolsar comprador | `GET/PATCH /api/admin/reports`, `POST .../refund`, export CSV |
| **Usuarios** | Búsqueda, ban/reactivar, borrar, otorgar premium/créditos, resetear contraseña, dar/quitar rol admin | `GET /api/admin/users`, acciones inline, export CSV. Detalle en `/admin/users/[id]` |
| **Transacciones** | Ledger completo, aprobar/rechazar transferencias bancarias y retiros pendientes | `GET /api/admin/transactions`, `.../approve`, `.../reject`, export CSV |
| **Subastas** | Lista todas (cualquier estado), cancelar activas/programadas | `GET /api/admin/auctions`, `.../cancel` (agregado en el ciclo anterior) |
| **Herramientas** | Dar/quitar admin por email, resetear contraseña, acreditar créditos manuales, promos, blacklist de emails | Múltiples rutas, todas reales |
| **SEO** | Links a robots.txt/sitemap/llms.txt, contenido de llms.txt, checklist estático | Sin backend propio, es informativo |

## 2. Lo que el screenshot confirma como problema real

- **Nav duplicado**: el `AppNav` global (rail izquierdo, common a toda la app) sigue mostrando "Moderación / Perfil" para el rol admin, AL LADO del nav propio del admin (rail derecho, las 7 tabs de arriba). Dos navegaciones simultáneas, una de ellas casi vacía — esto es lo que más contribuye a la sensación de "espacio desperdiciado" del screenshot, no solo el dashboard.
- **Resumen**: 12 cards en grilla y **nada más** — el 70% inferior de la pantalla queda vacío en desktop. No hay actividad reciente, no hay "qué necesita atención", no hay gráficos.
- **Nav sin agrupar**: 7 items sueltos, sin jerarquía visual (Fase de agrupación pedida explícitamente).
- **No existe una sección de Publicaciones/Prendas** — hoy la única forma de tocar una prenda desde admin es indirectamente vía un Reporte que la referencia. No se puede buscar, ver, ocultar ni moderar el catálogo directamente.

## 3. Lo que NO existe y por qué (decisiones, no descuidos)

- **Intercambios / Canjes como secciones separadas**: en el modelo real ambos son el mismo mecanismo (`Offer.offeredItemId`, ver `ARCHITECTURE.md` §2) — no hay dos sistemas distintos que auditar por separado. Se resuelve con una sección **Ofertas** unificada dentro de Operaciones, filtrable por tipo (dinero vs. trueque), en vez de inventar dos tabs que administrarían la misma tabla.
- **Canje por crédito** (trade-in con la plataforma como comprador): decisión de negocio ya tomada y documentada en `ARCHITECTURE.md` §6 — no existe, no se audita algo que no existe.
- **Roles granulares** (SUPER ADMIN / MODERADOR / SOPORTE / EDITOR): hoy solo hay `USER`/`ADMIN` binario. Implementarlo bien requiere un modelo de permisos nuevo (schema + validación server-side en cada ruta) — es un cambio real de superficie grande, no una casilla de UI. Lo dejo documentado en `ADMIN_ROADMAP.md` como PENDIENTE, no lo finjo con botones ocultos.
- **Audit log**: no existe ningún registro de qué admin hizo qué acción. Gap real, priorizado abajo.
- **Gráficos temporales** (ventas/usuarios en el tiempo): con 10 usuarios y prácticamente sin transacciones reales, un gráfico de serie temporal hoy sería una línea plana o vacía — lo trato como corresponde: un estado vacío explicado, no un gráfico decorativo con datos inventados.
- **Categorías, Inventario, Marketing/CMS, roles**: se documentan como PENDIENTE en `ADMIN_ROADMAP.md`, priorizados por debajo de lo que sí tiene datos reales para mostrar hoy.

## 4. Plan de este ciclo (ver `ADMIN_ARCHITECTURE.md` y `ADMIN_ROADMAP.md`)

Prioridad: arreglar el desperdicio de espacio real (nav duplicado, dashboard vacío) y cerrar el gap más visible (Publicaciones) — no las 40 fases del pedido de una sola vez. Esta vez, además, verificado visualmente contra un deploy de preview real antes de tocar producción (ver rama `admin-backoffice-redesign`), no solo con `tsc`/`eslint`.

## 5. Ciclo 2 (`admin-backoffice-v2`) — por qué el Ciclo 1 no alcanzó

El Ciclo 1 resolvió el nav duplicado y el dashboard vacío, pero dejó intacto el problema real: **una sola página cliente con `tab === "x" && (...)` renderizando listas de cards apiladas**. Eso produce, estructuralmente, la sensación de "pantalla de métricas con contenido alrededor" sin importar cuánto se ajuste el CSS — no hay URLs reales por sección, no hay tablas para gestión densa, no hay breadcrumb real (no hay routing), y cada fila de datos es una card con `shadow-sm rounded-xl`, el mismo lenguaje visual que la app de consumidor.

Diagnóstico confirmado con el screenshot del Ciclo 1 en producción: se ve "generado", no "operado". La causa no era falta de módulos — era la arquitectura de una sola pantalla con pestañas de JS.

### Qué cambia en este ciclo

- **Rutas reales** en vez de `tab` en `useState`: cada sección (`/admin/publicaciones`, `/admin/usuarios`, `/admin/transacciones`, `/admin/ofertas`, `/admin/subastas`, `/admin/reportes`, `/admin/herramientas`, `/admin/seo`) es ahora una página propia bajo un `app/admin/layout.tsx` compartido — back/forward del navegador funciona, cada URL es citable, el breadcrumb del topbar es real (deriva de `usePathname()`, no de estado local).
- **Topbar nuevo** (`app/admin/layout.tsx`): breadcrumb a la izquierda, buscador administrativo global al centro (`/api/admin/search`, real: usuarios + publicaciones), notificaciones y menú de perfil (con logout) a la derecha. La campanita flotante global (`NotificationBell`) se oculta en `/admin/**` — quedaría duplicada con la del topbar.
- **Sidebar**: colapsable (ícono-only + tooltip vía `title`, persistido en `localStorage`), con `sticky` para no scrollear con el contenido, y grupos reorganizados: General / Marketplace / Operaciones / Usuarios / **Moderación** (separada de Usuarios, antes vivían juntas) / Sistema. Vivía a la derecha en este ciclo (requisito explícito de entonces); Ciclo 3 lo movió a la izquierda con separadores reales entre grupos — ver `ADMIN_ARCHITECTURE.md` §7.
- **Tablas reales** reemplazan las listas de cards en Publicaciones, Usuarios, Transacciones, Ofertas y Subastas — `<table>` con `<thead>` fijo, columnas consistentes, badges cuadrados (`rounded`) en vez de píldoras (`rounded-full`). Reportes queda como bandeja de trabajo (cards), no tabla — el contenido es texto libre multilínea (motivo, detalles, partes involucradas), forzarlo a columnas fijas perdería información, y es el mismo formato que el propio pedido usa como ejemplo en FASE 16.
- **Acciones masivas**: checkbox por fila + "ocultar N seleccionadas" en Publicaciones (reusa el endpoint existente por ítem, sin endpoint bulk nuevo).
- **Detalle de usuario** (`/admin/users/[id]`) pasa a vivir dentro del mismo shell (antes era una página aislada sin sidebar/topbar) y gana pestañas (Perfil/Prendas/Transacciones) en vez de todo apilado en una columna angosta — el breadcrumb muestra el nombre real del usuario vía un context (`BreadcrumbContext`) que la página completa al cargar sus datos.
- **Sistema visual**: radios reducidos (`rounded-md`/`rounded-lg`, nunca `rounded-full` salvo avatares), bordes en vez de sombras para separar superficies, color de marca reservado a estado/acción (se sacaron los fondos tintados rosa/ámbar/esmeralda de cada stat card — ahora son blancas con un punto de color solo cuando el tono importa).
- **Dashboard**: de 12 stat cards a 6 (Usuarios, Publicaciones, Ventas por custodia, GMV, Comisión, Créditos/Premium) — el resto de las cifras del Ciclo 1 (Matches, Verificados, Suspendidos, Reportes resueltos) no desaparecieron, están donde corresponden (Usuarios, Reportes) en vez de duplicadas en el dashboard.

### Lo que sigue sin existir, y por qué (sin cambios respecto al Ciclo 1)

Audit log, roles granulares, categorías como módulo administrable, inventario como sección separada, marketing/CMS, gráficos de series temporales, configuración del sistema, logs. Ver `ADMIN_ROADMAP.md` — cada uno requiere modelo de datos nuevo o volumen real que hoy no existe, no son un gap de layout que este ciclo pueda resolver.
