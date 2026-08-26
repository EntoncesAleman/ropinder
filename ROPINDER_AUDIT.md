# ROPINDER_AUDIT.md

Auditoría real del proyecto contra las 46 fases del spec "ROPINDER V2 — LOOP MAESTRO DEFINITIVO", hecha leyendo código (`prisma/schema.prisma`, rutas API, componentes), no de memoria de conversaciones anteriores. Nada se modificó durante esta fase.

Clasificación: **REAL** (funciona, sin mocks) · **PARCIAL** (existe pero incompleto/hardcodeado) · **MOCK** (simulado, no real) · **ROTO** · **OBSOLETO** · **NO EXISTE**.

## Modelos de datos existentes (`prisma/schema.prisma`, 332 líneas)

`User, ClothingItem, Auction, Bid, Swipe, Match, Message, Transaction, Report, Rating, VerificationCode, Favorite, Notification, PushToken, BlockedEmail, LoginAttempt, Offer, Question`.

**No existen**: `Store`, `Wallet`, `Ledger`, `Operation`, `Dispute`, `Config`, `ChatQuestion`/`ChatTemplate`, ni ningún modelo de roles granulares. `User.role` es un string libre usado únicamente como `"USER" | "ADMIN"` — no hay `MODERADOR`/`SOPORTE` en ningún lado del código (verificado, cero resultados).

## Fase 2 — Sistema de cuentas: **PARCIAL**
Solo `USER`/`ADMIN`. No hay tipo `TIENDA` (no existe `CUIT`, `accountType`, ni ningún campo de comercio en `User` ni modelo separado). No hay `MODERADOR`/`SOPORTE`.

## Fase 3 — Signup: **PARCIAL, solo Persona**
`/signup` es un único flujo (nombre, usuario, email, contraseña, dirección confirmada por Nominatim, teléfono). No hay selector Persona/Tienda, no hay onboarding de tienda, no hay campo DNI.

## Fase 4 — Perfiles: **PARCIAL**
Perfil de persona real: avatar, bio, ubicación, reputación (`ratingAvg`/`ratingCount`), balance, créditos. No existe perfil de tienda (catálogo/colecciones/stock/analytics/verificación comercial) porque no existe el concepto de tienda.

## Fase 5 — Publicaciones: **REAL**
`ClothingItem.listingType`: `VENTA | INTERCAMBIO | SUBASTA`. Fotos (1, vía `imageUrl`, no múltiples ni video), marca, categoría, talle (`size`), condición, color no existe como campo separado, descripción, ubicación (lat/lng), precio, `archived`/`soldAt`. Etiquetas libres no existen (hay `category`/`style` fijos vía `lib/catalog.ts`).

## Fase 6 — Subastas: **REAL**
`Auction`: `startingPrice`, `minIncrement`, `currentPrice`, `startsAt`, `endsAt`, `status` (SCHEDULED/ACTIVE/ENDED/CANCELLED), `winnerId`, `Bid[]`. Pujas con concurrencia atómica (`prisma.updateMany` condicional, testeado en `tests/auction.test.ts`). Chat se desbloquea recién al liberar el escrow (no específicamente "al finalizar subasta" sino al pago, mismo mecanismo que venta directa) — ver Fase 20.

## Fase 7-8 — Wallet / Ledger: **NO EXISTE como tal, PARCIAL como Transaction**
No hay modelo `Wallet` ni "Ropinder Cash" como nombre/entidad. Lo que existe:
- `User.credits` (Int) — moneda de swipes/bumps, sin relación con dinero real.
- `User.balance` (Float) — saldo en pesos de ventas cobradas, sí es dinero real de custodia.
- `Transaction` — sí es un ledger inmutable (nunca se hace UPDATE de montos, solo se crean filas nuevas: `ESCROW_HOLD`, `ESCROW_RELEASE`, `WITHDRAWAL`, `CREDIT_PURCHASE`, `PREMIUM_BUMP`, `MANUAL_CREDIT_GRANT`), pero le faltan campos del spec: no tiene `provider_account`, no distingue `pending_balance`/`locked_balance`/`withdrawable_balance` como campos explícitos (se derivan calculando sobre `availableAt`/`withdrawnAt` en cada request, ver `lib/withdrawal.ts`).
- **"1 Ropinder Cash = 1 peso" ya es cierto de hecho** (`balance` está en pesos, no hay conversión) — falta el renombrado/branding, no la lógica.

## Fase 9-10 — Comisiones / Commission Engine: **PARCIAL, hardcodeado**
`app/api/transactions/release/route.ts`: `PLATFORM_COMMISSION_RATE = 0.08` / `PREMIUM_COMMISSION_RATE = 0.05` como constantes en el archivo. No hay motor separado, no hay matriz saldo/combinación/externo (ese concepto no existe — hoy todo pago es "externo" simulado vía checkout o balance interno, nunca mezclados en una sola operación), no es configurable desde admin, no versiona cambios históricos.

## Fase 11 — Retiros: **REAL, con intervención manual**
`app/api/transactions/withdraw/route.ts`: usuario pide retiro con destino (CBU/alias), sistema calcula bruto/comisión/neto (`lib/withdrawal.ts`, testeado), reserva fondos. Pero el pago en sí es manual: un admin transfiere por fuera y marca `COMPLETED`/`REJECTED` desde `/admin/transacciones`. Costo de servicio (`WITHDRAWAL_FEE_RATE`) es constante en código, no configurable desde admin.

## Fase 12 — Beneficio de saldo: **NO EXISTE**
No hay ningún mensaje ni cálculo de "ahorro por usar saldo" — no aplica todavía porque no existe pago combinado saldo+externo (Fase 13).

## Fase 13 — Pago combinado: **NO EXISTE**
Cada compra es 100% con un método (tarjeta simulada, transferencia bancaria manual, o créditos internos para bump/premium) — no hay combinación saldo+dinero externo en una misma operación.

## Fase 14 — Cashflow interno: **PARCIAL**
El dinero de una venta sí queda en `balance` (no sale automáticamente), y desde ahí puede retirarse — pero no puede "usarse para comprar" otra prenda todavía (no existe "pagar con saldo" al comprar, ver Fase 13).

## Fase 15 — Proveedor financiero: **NO EXISTE**
No hay ningún adapter. `POST /api/checkout` con `paymentMethod !== "bank_transfer"` simula un cobro con tarjeta (`await new Promise(r => setTimeout(r, 300))`) y acredita gratis — **no hay ningún gateway de pago real conectado, ni MercadoPago ni Stripe**, ni credenciales en `.env`. Bank transfer es 100% manual (comprobante + aprobación admin). Ya lo confirmamos en la conversación anterior a este mensaje.

## Fase 16 — Estados financieros: **PARCIAL**
`Transaction.status` usa `PENDING`/`COMPLETED`/`REJECTED` — no los 10 estados del spec (`AUTHORIZED`, `PROCESSING`, `DISPUTED`, etc.), porque no hay proveedor real ni disputas que los necesiten todavía.

## Fase 17-22 — Chat guiado + banco de preguntas admin-editable: **NO EXISTE**
`Message` es texto libre 1:1 dentro de un `Match`. Hay un filtro real de moderación pre-pago (`lib/chatFilter.ts`, ver abajo) pero **no hay ningún flujo guiado por botones, ni banco de preguntas, ni plantillas, ni editor admin de chat**. Esto es la brecha más grande del spec — 6 fases enteras (17 a 22) parten de cero.

## Fase 23 — Moderación del chat: **REAL, parcial**
`lib/chatFilter.ts` detecta email, teléfono, menciones de WhatsApp/"transferencia directa"/"por afuera" antes de que se libere el escrow del match, y bloquea el envío con un mensaje explicativo (testeado en `tests/chatFilter.test.ts`). No detecta específicamente Instagram/TikTok/Facebook/alias/CBU/CVU/MercadoPago por nombre — el regex de keywords es más genérico. No hay registro de intentos bloqueados ni panel admin para revisarlos.

## Fase 24-26 — Operations / Historial / Disputas: **NO EXISTE como entidad unificada**
No hay modelo `Operation` que una comprador+vendedor+publicación+chat+pago+entrega+disputa en un solo lugar — hoy esa información vive repartida entre `Match`, `Offer`, `Transaction`, `ClothingItem`. `/history` (existe) muestra compras/ventas del usuario a partir de `Transaction`, no de una entidad `Operation`. **No hay centro de disputas, ni modelo `Dispute`, ni flujo de reembolso/liberación/escalamiento** — un `Report` puede disparar un reembolso manual (`app/api/admin/reports/[id]/refund`) pero es un caso puntual, no un sistema de disputas.

## Fase 27 — Reembolsos: **PARCIAL**
Existe `POST /api/admin/reports/[id]/refund` — genera una transacción inversa real (no edita `balance` directamente sin ledger), pero solo aplica al flujo de reporte-de-match, no es un sistema general de reembolsos con motivo/evidencia/proveedor.

## Fase 28 — Búsqueda con radio: **REAL**
`app/api/clothes/route.ts`: radio configurable por query param, filtro real por distancia haversine. Premium no amplía el radio automáticamente (el cliente controla el valor) — la ampliación "premium = más radio" no está gateada server-side.

## Fase 29 — Favoritos: **REAL, solo prendas**
`Favorite` (usuario↔item). No hay favoritos de tienda (no hay tiendas), ni de subastas específicamente, ni alertas de búsquedas guardadas.

## Fase 30 — Notificaciones: **REAL**
`Notification` + `notify()` (`lib/notify.ts`) + push vía Firebase (`lib/push.ts`, `firebase-messaging-sw.js`). Cubre match, oferta, venta, reportes — no cubre específicamente "disputa" o "retiro" como tipos dedicados todavía (no existen esas entidades).

## Fase 31 — Planes: **REAL para precios, PARCIAL para el resto** (actualizado Ciclo 6)
`lib/pricing.ts`: `PACKS` sigue siendo la estructura base (créditos/premium/verified/días), pero el `price` de cada pack ahora se resuelve vía `getEffectivePacks()`, que sobreescribe con `Config` (`pricing.<packId>`) si un admin lo editó desde `/admin/precios`. `POST /api/checkout` y la página `/premium` leen ambos del mismo `/api/pricing` — ya no hay precios hardcodeados duplicados en el frontend. Sigue sin existir plan `STORE` ni tabla de planes formal (créditos/premium siguen siendo un enum de IDs fijo, no filas editables en cantidad).

## Fase 32-39 — Admin: **REAL para lo que existe, ausente para lo que no existe** (actualizado Ciclo 6)
El rediseño reciente (backoffice con rutas reales, sidebar izquierdo con separadores, topbar, tablas) cubre Dashboard/Usuarios/Publicaciones/Transacciones/Ofertas/Subastas/Reportes/Herramientas/SEO/Comisiones/Chat/Precios/Auditoría — todo real, sin mocks. Ciclo 6 agregó `AdminAuditLog` (`lib/auditLog.ts`, `logAdminAction()`) llamado fire-and-forget desde toda acción sensible (ban/delete/promote/blacklist/grant-premium/grant-credits/reset-password/comisiones/precios/aprobar-rechazar transacción/refund/promo), visible en `/admin/logs`. **Siguen sin existir**: Admin Wallet dedicado (hoy se ve balance por usuario en su detalle + ledger completo en Transacciones, evaluado y descartado — ver `ROPINDER_ROADMAP.md`), Admin Tiendas, Admin Disputas, Admin Roles granulares.

## Fase 40 — Configuración: **PARCIAL** (actualizado Ciclo 6)
`Config` (key/value genérico, `lib/config.ts`) existe desde Ciclo 1 y ahora cubre comisiones, fee de retiro y precios de todos los packs (Ciclo 6, `lib/pricing.ts`). El radio de búsqueda sigue siendo una constante por plan (`lib/geo.ts`), no una fila de `Config` — no hubo necesidad todavía de que un admin lo ajuste sin redeploy.

## Fase 41-42 — Responsive / PWA: **REAL**
Mobile-first con rail desktop aparte (`AppNav.tsx`), admin desktop-first con su propio shell. PWA: `manifest.webmanifest`, dos service workers reales (`sw-offline.js` incondicional, `firebase-messaging-sw.js` condicional a push), sin precache de `_next/static` (deliberado, evita el bug clásico de PWA rota post-deploy).

## Fase 43 — Seguridad: **REAL en lo implementado**
Todas las rutas admin usan `requireAdmin()` server-side, `getSession()` deriva el usuario del JWT/cookie (no de payloads del cliente), rate limiting existe (`lib/ratelimit.ts`, `LoginAttempt`), concurrencia atómica en dinero/pujas. No hay webhooks (no hay proveedor de pago real que los dispare) ni idempotencia de webhooks porque no aplica todavía.

## Fase 44 — Tests: **PARCIAL**
`tests/`: `auction.test.ts`, `chatFilter.test.ts`, `haversine.test.ts`, `pricing.test.ts`, `withdrawal.test.ts` — 24 tests, todos pasan. Cubren pujas, filtro de chat, distancia, precios de packs, cálculo de retiro. No hay tests de admin, de responsive, ni (obviamente) de wallet/disputas/chat guiado porque no existen.

## Corrección post-Ciclo 1 (tras leer `ROPINDER_BIBLE/`)

El paquete Bible (00-ROPINDER-BIBLE.md + 5 loops) formaliza en inglés el mismo spec, con una precisión que cambia el diagnóstico de Fase 9:

- **La matriz de comisión de la Bible es por MÉTODO DE FONDEO** (100% Ropinder Cash = 10%, combinación = 15%, 100% externo = 20%), no por si el vendedor es Premium. Lo que se hizo configurable en Ciclo 1 (`commission.standard`/`commission.premium`) es la lógica PREEXISTENTE del código (8%/5% según si el vendedor es Premium) — un eje real y válido del producto, pero **no es la matriz de la Bible**. Quedan como dos configuraciones distintas que en algún momento deben convivir o reconciliarse; no se pisan entre sí hoy.
- **Hallazgo más importante, no documentado antes**: rastreando `app/api/matches/[id]/pay/route.ts` hasta el final, **el comprador no paga nada en el momento de comprar** — se crea el `ESCROW_HOLD` sin ningún cargo real ni descuento de `balance` ni de método externo. Hoy cualquiera puede "comprar" gratis y el vendedor cobra igual al liberarse. Esto es más grave que "checkout simulado": no hay ninguna fuente de fondeo todavía, ni interna ni externa. **La matriz 10/15/20 de la Bible no se puede implementar honestamente hasta que exista ese descuento del lado comprador** — es un prerequisito nuevo, no estaba en el roadmap anterior.

## Resumen para decidir el plan

El spec asume una plataforma con wallet unificada, motor de comisiones configurable, chat guiado con CMS, tiendas, y centro de disputas — **ninguna de esas 5 piezas existe hoy**, y son la base de la que dependen ~20 de las 46 fases (comisiones combinadas, admin wallet, admin chat, admin tiendas, admin disputas, cashflow, beneficio de saldo, pago combinado, operaciones unificadas). Construir eso bien (con tests, sin mocks, con el mismo rigor que exige la "regla final" del propio spec) es semanas de trabajo real, no una sesión.

Ver `ROPINDER_ROADMAP.md` para el orden de implementación elegido y por qué.
