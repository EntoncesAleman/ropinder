# ADMIN_ROADMAP.md — Ropinder Admin

## Ciclo 1 (esta rama, `admin-backoffice-redesign`)

| Ítem | Estado |
|---|---|
| Auditoría (`ADMIN_AUDIT.md`) | COMPLETADO |
| Sacar el `AppNav` global duplicado de `/admin/**` | COMPLETADO |
| Agrupar nav derecho en secciones (General/Marketplace/Operaciones/Usuarios/Sistema) | COMPLETADO |
| Dashboard: fila de stats compacta + Actividad reciente + Requiere atención | COMPLETADO |
| Publicaciones (tabla + ocultar/restaurar) | COMPLETADO |
| Ofertas (tabla, solo lectura) | COMPLETADO |
| Verificación visual real contra preview deploy (Playwright) | COMPLETADO |

## Ciclo 2 (rama `admin-backoffice-v2`) — reescritura de composición

| Ítem | Estado |
|---|---|
| Auditoría de por qué el Ciclo 1 no alcanzó (`ADMIN_AUDIT.md` §5) | COMPLETADO |
| Rutas reales por sección (dejar de usar `tab` en `useState`) | COMPLETADO |
| Topbar (breadcrumb real, buscador global, notificaciones, menú de perfil) | COMPLETADO |
| Sidebar derecho colapsable + sticky | COMPLETADO |
| Tablas reales en Publicaciones/Usuarios/Transacciones/Ofertas/Subastas | COMPLETADO |
| Acciones masivas (Publicaciones: ocultar seleccionadas) | COMPLETADO |
| Buscador administrativo global (`/api/admin/search`) | COMPLETADO |
| Detalle de usuario dentro del shell + tabs | COMPLETADO |
| Sistema visual: radios reducidos, bordes en vez de sombras, color reservado a estado | COMPLETADO |
| Dashboard: 12 stat cards → 6, jerarquizadas | COMPLETADO |
| Verificación visual contra preview deploy (Playwright, todas las rutas) | PENDIENTE — ver sección de verificación al pie de este documento cuando se corra |

## Pendiente (próximos ciclos, con motivo — ver AUDIT §3)

| Ítem | Estado | Por qué no en este ciclo |
|---|---|---|
| Audit log de acciones admin | PENDIENTE | Requiere modelo nuevo (`AdminAuditLog`) + instrumentar cada ruta de acción; se hace mejor de una vez, no a medias |
| Roles granulares (Super Admin/Moderador/Soporte/Editor) | PENDIENTE | Cambio de schema + validación server-side en 23 rutas — alcance de un ciclo propio |
| Categorías como módulo (crear/editar/ordenar) | PENDIENTE | Hoy `lib/catalog.ts` es una constante estática; convertirla en administrable es un cambio de arquitectura de datos, no de UI |
| Inventario como módulo dedicado | PENDIENTE | Se puede derivar de Publicaciones con filtros — evaluar si de verdad necesita ser una sección separada antes de duplicar |
| Marketing/CMS (banners, colecciones, campañas) | PENDIENTE | No hay ningún dato ni modelo real detrás todavía — construirlo ahora sería la UI-sin-backend que el pedido explícitamente prohíbe |
| Gráficos de series temporales | BLOQUEADO | No por código — con la base real actual (10 usuarios, prácticamente sin transacciones) cualquier gráfico temporal sería una línea plana. Se prioriza cuando haya volumen real que mostrar |
| Buscador global admin | PENDIENTE | Depende de que Publicaciones/Ofertas ya existan como fuentes buscables (listo en este ciclo) — candidato natural para el próximo |
| Notificaciones admin en vivo | PENDIENTE | El ícono 🔔 del header ya existe pero apunta al sistema de notificaciones de usuario, no a eventos administrativos — necesita su propio canal |
