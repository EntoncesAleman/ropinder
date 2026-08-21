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
