# Ropinder

Marketplace de ropa usada con cuatro modalidades: **venta** (precio + pago en custodia), **intercambio** (prenda por prenda, dentro del chat de match), y **subasta** (pujas con cierre automático). Descubrís por swipe (venta/intercambio) o desde `/subastas` y `/buscar` (las tres modalidades). Ver `AUDIT.md` y `ARCHITECTURE.md` para el estado completo del proyecto y lo que falta.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Prisma 7** con adaptador libSQL — SQLite local (`dev.db`) en desarrollo, [Turso](https://turso.tech) en producción
- **JWT** en cookie httpOnly para sesión (`lib/auth.ts`)
- **Vercel Blob** para imágenes subidas (con fallback a `public/uploads` en dev sin token)
- **Firebase** (Cloud Messaging) para push notifications
- **Capacitor** para empaquetar el mismo sitio como app Android/iOS

## Setup

```bash
npm install
cp .env.example .env   # completar JWT_SECRET como mínimo para levantar local
npx prisma generate
npm run dev
```

Con solo `JWT_SECRET` seteado ya podés loguearte, publicar prendas y swipear contra el SQLite local. El resto de las variables (`.env.example` las documenta todas) habilitan funcionalidad opcional: Google Sign-In, envío real de mails, subida a Vercel Blob, push notifications.

Sin proveedor de mail configurado, el código de verificación de signup se muestra en pantalla ("modo prueba") en vez de enviarse — pero **solo fuera de `NODE_ENV=production`**.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint |
| `npm run db:seed` | Carga datos de ejemplo (`prisma/seed.ts`) |
| `npm run admin:promote` | Promueve un usuario existente a rol ADMIN (`scripts/make-admin.ts`) |

## Base de datos

El esquema (`prisma/schema.prisma`) apunta a SQLite local en dev. En producción, la base vive en Turso y **los cambios de esquema se aplican a mano** con los scripts `scripts/sync-*-schema-turso.ts` (uno por feature) — no hay `prisma migrate` todavía, así que un cambio de esquema requiere escribir y correr el script correspondiente contra Turso además de actualizar `schema.prisma`.

## Panel de administración

`/admin` (rol `ADMIN` requerido). Ver `ADMIN-INSTRUCTIONS.txt` para cómo entrar, otorgar rol admin, aprobar transferencias/retiros pendientes, y demás herramientas operativas.

## Estado del sistema de pagos

El checkout con tarjeta y el pago en custodia (escrow) de una compra están **simulados** — no hay pasarela de pago real conectada todavía (ver comentarios en `lib/pricing.ts` y `components/PaymentMethodModal.tsx`). La transferencia bancaria y los retiros de saldo sí pasan por aprobación manual de un admin desde `/admin` → pestaña Transacciones.

## Subastas

Modelo `Auction`/`Bid` en `prisma/schema.prisma`. Las pujas se validan y aplican server-side de forma atómica (`app/api/auctions/[id]/bid`, lógica pura en `lib/auction.ts` — ver `tests/auction.test.ts`); el cliente nunca decide si una puja gana. El cierre (activar subastas programadas, determinar ganador al vencer) lo hace `/api/cron/close-auctions`, corrido cada 5 minutos por `vercel.json` — el contador regresivo en la UI es solo presentación.
