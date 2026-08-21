# ARCHITECTURE.md — Ropinder

Arquitectura objetivo del producto, adaptada a lo que ya existe (ver `AUDIT.md`). No se duplican rutas que ya tienen equivalente.

## 1. Mapa de producto (adaptado a rutas reales)

```
ROPINDER
├── Usuario (mobile-first, capa desktop-usuario se agrega sobre las mismas rutas)
│   ├── /                    Descubrir (swipe) — ya existe
│   ├── /buscar               Búsqueda con filtros — ya existe, se extiende con filtro de modalidad
│   ├── /item/[id]            Página de prenda — ya existe, se extiende por modalidad (ver §3)
│   ├── /profile/upload       Publicar — ya existe, se extiende con selector de modalidad
│   ├── /ropero                Armario — ya existe
│   ├── /favorites             Favoritos — ya existe
│   ├── /matches, /matches/[id] Mensajes + intercambio/venta — ya existe
│   ├── /notifications          Notificaciones — ya existe
│   ├── /history                 Compras/transacciones — ya existe
│   ├── /seller/[id]              Perfil vendedor — ya existe
│   └── /subastas/[id]             NUEVO — página de subasta con pujas en vivo
│
└── Admin (/admin, hoy una sola página con tabs — se mantiene esa base, no se duplica)
    ├── Resumen (tab existente)      = Dashboard
    ├── Reportes (tab existente)      = Moderación
    ├── Usuarios (tab existente)       = Usuarios
    ├── Transacciones (tab existente)   = Ventas (ya incluye retiros/transferencias)
    ├── Herramientas (tab existente)     = Configuración
    └── Subastas (tab NUEVO)              = Admin de subastas (Fase 22)
```

No se crean rutas paralelas para "Intercambio" ni "Canje": ambos ya viven dentro de `/matches/[id]` como parte del mismo flujo de chat+oferta, que es el patrón correcto (la operación ocurre *dentro* de la conversación, no en una pantalla aparte). Subasta es la única modalidad que necesita una pantalla propia porque **no depende de un match** — cualquiera puede pujar sin haber hecho swipe primero.

## 2. Modalidades — decisión de implementación

| Modalidad | Mecanismo | Dónde vive |
|---|---|---|
| Venta | `ClothingItem.price` + `Offer` (dinero) + escrow | `/matches/[id]` (ya existe) |
| Intercambio | `Offer.offeredItemId` (prenda por prenda) | `/matches/[id]` (ya existe, antes llamado "canje" en el código — ver AUDIT §6) |
| Canje (crédito) | Fuera de alcance de este ciclo — ver AUDIT §6 | — |
| **Subasta** | **Nuevo modelo `Auction` + `Bid`**, cierre server-authoritative | `/item/[id]` (badge + redirect) y `/subastas/[id]` (pantalla de puja) |

Una prenda puede tener precio Y estar en subasta simultáneamente no tiene sentido de negocio (son dos formas de fijar el mismo valor); una prenda puede ser Venta O Subasta O Intercambio — se modela con un campo `listingType` en `ClothingItem`, no con checkboxes múltiples, para no crear estados contradictorios (ej. "vendida" mientras su subasta sigue activa). Esto es una simplificación intencional de la Fase 7 del pedido original (que sugería multi-modalidad libre): multi-modalidad simultánea real (ej. "vendible Y subastable a la vez") requeriría resolver qué pasa si se vende mientras hay pujas activas — una fuente de bugs de concurrencia que no vale la pena abrir sin un caso de uso concreto que lo pida.

## 3. Sistema de diseño (fundación, no migración completa)

`globals.css` no tenía tokens. Se agregan variables CSS mínimas para que el código **nuevo** (Subasta, y cualquier trabajo desktop futuro) no repita valores arbitrarios. Las 20 páginas existentes seguirán usando sus clases Tailwind directas — **no se migran en este ciclo** ("no reescribir partes sanas sin motivo"); la migración gradual queda documentada como trabajo del próximo ciclo cuando se aborde Desktop Usuario/Admin.

Tokens agregados: color de acento (rose, ya usado en toda la app), color de estado de subasta (ámbar — pujas activas / urgencia), radios y sombras ya consistentes con lo que Tailwind por defecto usa en el resto del código (no se inventan nuevos).

## 4. PWA — qué se agrega en este ciclo

- `public/manifest.webmanifest`: nombre, iconos (se generan a partir del isotipo existente — la camisa/`Shirt` de lucide-react usada como logo en toda la UI, ver `app/signup/page.tsx`, `SwipeScreen.tsx` — no hay un archivo de logo real en el repo, así que se genera un ícono simple consistente con esa identidad), `display: standalone`, `theme_color`/`background_color` acorde a la marca (rose-500).
- `app/layout.tsx`: `metadata.manifest`, `metadata.appleWebApp`, `viewport` con `themeColor`.
- **No se agrega** service worker de caching/offline en este ciclo: la app ya tiene un SW real (`firebase-messaging-sw.js`) para push; sumarle responsabilidad de cache offline es un cambio de mayor riesgo (invalidación, versión de assets) que merece su propio ciclo con testing dedicado, no algo para colar junto con Subasta. Queda como próximo paso explícito.
- Esto es suficiente para que el navegador ofrezca "Agregar a pantalla de inicio / Instalar app" y para que, cuando más adelante se empaquete con Capacitor (ya vendorizado en `/android` e `/ios`), el manifest ya esté alineado.

## 5. Subasta — modelo de datos

Nuevos modelos Prisma:

```
model Auction {
  id            String   @id
  itemId        String   @unique        // 1 prenda = máximo 1 subasta activa
  sellerId      String
  startingPrice Float
  minIncrement  Float
  currentPrice  Float                    // desnormalizado, siempre = mayor puja o startingPrice
  startsAt      DateTime
  endsAt        DateTime
  status        String   // SCHEDULED | ACTIVE | ENDED | CANCELLED
  winnerId      String?
  bids          Bid[]
}

model Bid {
  id         String   @id
  auctionId  String
  bidderId   String
  amount     Float
  createdAt  DateTime
}
```

`ClothingItem` gana `listingType String @default("VENTA")` (`VENTA | INTERCAMBIO | SUBASTA` — un canje siempre es posible sobre cualquier ítem via `Offer.offeredItemId` independientemente de `listingType`, así que no necesita su propio tipo).

### Reglas de autoridad del servidor (Fase 12, literal)

- Toda puja se valida server-side: `amount >= currentPrice + minIncrement`, la subasta debe estar `ACTIVE` y no vencida.
- La actualización de `currentPrice` + inserción del `Bid` es una única transacción de Prisma con un `updateMany` condicionado (`WHERE currentPrice = <valor leído>`) para que dos pujas concurrentes por el mismo monto no puedan ganar ambas — el mismo patrón de "check-then-act atómico" ya usado para créditos en `/api/swipe`.
- El cierre (`ENDED` + `winnerId`) lo decide un cron (`/api/cron/close-auctions`, mismo patrón que `monthly-reset`), nunca el cliente. El conteo regresivo en la UI es solo presentación, como pide la Fase 12.

## 6. Lo que queda fuera de este ciclo (documentado, no oculto)

- Rediseño de Desktop Usuario y Desktop Admin (Fases 5 y 6 completas) — requiere el sistema de tokens maduro primero.
- Canje por crédito (Fase 10) — ver AUDIT §6.
- Service worker con cache offline (Fase 4, parte avanzada).
- Generación de íconos de app en todas las resoluciones (192/512/maskable) — se deja un ícono base; el set completo es trabajo de diseño, no de arquitectura.
