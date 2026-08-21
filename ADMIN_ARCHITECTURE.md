# ADMIN_ARCHITECTURE.md — Ropinder Admin

Arquitectura objetivo del backoffice, adaptada a lo real (ver `ADMIN_AUDIT.md`).

## 1. Navegación — agrupada, rail derecho, sin duplicado

```
GENERAL
  Resumen

MARKETPLACE
  Publicaciones   ← nuevo
  Subastas

OPERACIONES
  Ofertas          ← nuevo (unifica Venta/Intercambio, ver AUDIT §3)
  Transacciones

USUARIOS
  Usuarios
  Reportes

SISTEMA
  Herramientas
  SEO
```

El `AppNav` global deja de renderizarse en `/admin/**` — el admin ya tiene su propia navegación completa; mostrar además el rail de 2 items de la app de usuario es la duplicación que el screenshot mostraba, no una funcionalidad a preservar.

## 2. Layout de shell

```
┌──────────────────────────────────────────────────────┬─────────┐
│  Resumen                              🔔  Admin ▾     │ MENÚ    │
│  ─────────────────────────────────────────────────    │ (grupos)│
│  [stats compactas en una fila]                        │         │
│  ┌─────────────────────────┐  ┌──────────────────┐    │         │
│  │ Actividad reciente       │  │ Requiere atención │    │         │
│  │ (feed, ancho)            │  │ (lista accionable)│    │         │
│  └─────────────────────────┘  └──────────────────┘    │         │
└──────────────────────────────────────────────────────┴─────────┘
```

Reemplaza el "12 cards y nada más" del screenshot. Todo con datos reales — "Actividad reciente" y "Requiere atención" son consultas nuevas sobre tablas que ya existen (`Report`, `Transaction`, `Auction`, `User`, `ClothingItem`), no una capa mock.

## 3. Publicaciones (nuevo)

`GET /api/admin/items` — tabla con imagen, título, vendedor, modalidad (Venta/Intercambio/Subasta vía `listingType`), precio, estado (archivada/activa), reportes asociados, fecha. Filtro por modalidad y estado, búsqueda por título/vendedor. Acción: ocultar (archivar) / restaurar — reutiliza `ClothingItem.archived`, no un estado nuevo paralelo.

## 4. Ofertas (nuevo, unifica Intercambio)

`GET /api/admin/offers` — todas las `Offer` (dinero y trueque), con comprador, vendedor, prenda, monto o prenda ofrecida, estado. Solo lectura en este ciclo (no hay acción administrativa clara sobre una oferta entre dos usuarios más allá de mirarla).

## 5. Lo que queda fuera de este ciclo (ver ADMIN_ROADMAP.md)

Roles granulares, audit log, categorías/inventario como módulos dedicados, marketing/CMS, gráficos de series temporales. Cada uno documentado con su motivo puntual en `ADMIN_AUDIT.md` §3, no omitido en silencio.

## 6. Ciclo 2 — de pestañas de JS a rutas reales (ver ADMIN_AUDIT.md §5)

### Shell (`app/admin/layout.tsx`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ☰  Dashboard / Publicaciones      [ Buscar... ]        🔔  Tom ▾  │  ← topbar, full-bleed
├────────────────────────────────────────────────────────┬─────────┤
│                                                          │ Admin.  │
│                                                          │ GENERAL │
│              <children> (cada ruta abajo)                │ Dashb.  │
│                                                          │ MARKET. │  ← sidebar,
│                                                          │ Public. │     sticky,
│                                                          │ Subast. │     colapsable
│                                                          │  ...    │
└──────────────────────────────────────────────────────────┴─────────┘
```

`ADMIN_NAV` en `lib/adminNav.ts` es la única fuente de verdad para el sidebar Y el breadcrumb — un href nuevo ahí aparece en ambos automáticamente, no hay una segunda lista que se pueda desincronizar.

### Rutas

| Ruta | Contenido | Reemplaza (Ciclo 1) |
|---|---|---|
| `/admin` | Dashboard: 6 stat cards + Actividad reciente + Requiere atención | `tab === "resumen"` |
| `/admin/publicaciones` | Tabla + filtros + selección múltiple + ocultar/restaurar | `tab === "publicaciones"` |
| `/admin/subastas` | Tabla + tabs de estado (Activas/Programadas/Finalizadas/Canceladas) + cancelar | `tab === "subastas"` |
| `/admin/ofertas` | Tabla, solo lectura | `tab === "ofertas"` |
| `/admin/transacciones` | Tabla + filtro "por aprobar" + aprobar/rechazar | `tab === "transacciones"` |
| `/admin/usuarios` | Tabla (Usuario/Estado/Publicaciones/Operaciones/Reputación/Registro/Acciones) | `tab === "usuarios"` |
| `/admin/reportes` | Bandeja de trabajo (pendientes/resueltos), sin cambios de fondo | `tab === "reportes"` |
| `/admin/herramientas` | Igual que antes, restyled | `tab === "herramientas"` |
| `/admin/seo` | Igual que antes, restyled | `tab === "seo"` |
| `/admin/users/[id]` | Detalle de usuario, ahora dentro del shell, con tabs (Perfil/Prendas/Transacciones) | Página aislada sin sidebar/topbar |

### Piezas compartidas nuevas

- `components/admin/ui.tsx` — `PageHeader`, `Toolbar`, `SearchInput`, `FilterSelect`, `Panel`, `StatCard`, `Badge`, `EmptyState`, `TableWrap`/`Th`/`Td`, `ActionMenu`. Un solo lugar para el lenguaje visual (radios, bordes, tonos) — cambiarlo ahí cambia todo el admin.
- `components/admin/BreadcrumbContext.tsx` — permite que una página de detalle (ej. `/admin/users/[id]`) inyecte el nombre real en el breadcrumb del layout sin prop drilling.
- `components/admin/AdminSearch.tsx` + `GET /api/admin/search` — buscador global real (usuarios + publicaciones, sin resultados fabricados).
- `GET /api/admin/items/export` — faltaba (Publicaciones no tenía export propio, usaba por error el de usuarios en un borrador de esta misma rama).
