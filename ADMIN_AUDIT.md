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
