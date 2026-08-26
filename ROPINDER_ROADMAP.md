# ROPINDER_ROADMAP.md

Plan de implementación del spec "ROPINDER V2 — LOOP MAESTRO DEFINITIVO" contra el estado real documentado en `ROPINDER_AUDIT.md`. El spec asume 5 piezas que hoy no existen (Wallet/Ledger formal, Commission Engine configurable, Chat guiado + CMS, Tiendas, Operations/Disputas) y de las que dependen ~20 de las 46 fases — construir todo de una sola vez violaría la propia "regla final" del spec (nunca dar un módulo por terminado sin tests, sin mocks, sin romper lo existente). Se ejecuta en ciclos, cada uno auditado y documentado antes de arrancar el siguiente.

## Ciclo 1 (esta sesión) — Commission Engine configurable + Config genérico

| Ítem | Estado |
|---|---|
| Auditoría completa (`ROPINDER_AUDIT.md`) | COMPLETADO |
| Modelo `Config` (key/value genérico, admin-editable) | COMPLETADO |
| `lib/config.ts` — lectura/escritura tipada, fallback seguro si la key no existe todavía | COMPLETADO |
| `lib/commission.ts` — motor puro (resolución de tasa, split bruto/comisión/neto, clamp al techo de 20%) | COMPLETADO |
| `commission.standard` / `commission.premium` configurables (antes hardcodeadas en `release/route.ts`) | COMPLETADO |
| `withdrawal.feeRate` configurable (antes hardcodeada en `lib/withdrawal.ts`) | COMPLETADO |
| Techo absoluto de 20% en comisión, validado server-side en la API que guarda | COMPLETADO |
| `GET/PATCH /api/admin/config` | COMPLETADO |
| Admin > Finanzas > Comisiones (nuevo grupo de nav) | COMPLETADO |
| Rebautizo de "Monedero"/saldo a **Ropinder Cash** en Ropero, detalle de usuario admin, FAQ de soporte | COMPLETADO |
| Tests nuevos (`tests/commission.test.ts`) + extensión de `tests/withdrawal.test.ts` para tasa configurable | COMPLETADO |
| Sync de schema a Turso (tabla `Config`) | COMPLETADO — autorizado y corrido contra producción, cero pérdida de datos verificada |

### Por qué esto y no otra cosa primero

De las 46 fases, la Fase 9/10 (comisiones) y 40 (config) eran las únicas que se podían resolver **completas, sin inventar entidades nuevas** y sin depender de decisiones de producto todavía no tomadas (tipo de cuenta Tienda, diseño del chat guiado, modelo de disputas). Es además la pieza que más rápido paga: cualquier ajuste de comisión hoy requiere editar código y redeployar; después de este ciclo es un formulario.

**No se tocó**: pago combinado (Fase 13) ni beneficio de saldo (Fase 12) — ambos dependen de que exista una forma de pagar con Ropinder Cash + dinero externo en la misma operación, y hoy cada compra usa un solo método. Implementarlos ahora sería UI sin motor real detrás, exactamente lo que el spec prohíbe.

## Ciclo 2 — Chat Engine (Loop 04)

Implementado y verificado end-to-end contra preview (mensaje guiado real enviado y visible en el hilo) antes de mergear. Ver commit "Add configurable commission engine and guided chat question bank" para el detalle completo. Corrido fuera del orden estricto del Master Orchestrator porque el usuario lo pidió puntualmente — el resto de los loops se retomó en orden después.

**No hecho**: `ChatTemplate`/`ChatFlow`/`ChatSession` como modelos separados (se reutilizó `Match`/`Message`, que ya cumplen ese rol — crear modelos paralelos hubiera sido la "implementación paralela muerta" que el propio spec prohíbe), duplicar/versionar preguntas, gating duro del chat libre antes del milestone (se decidió no tocar una funcionalidad existente que usuarios reales ya usan, sin que fuera un pedido explícito).

## Ciclo 3 — Loop 05 (UX/UI/PWA), auditoría + accesibilidad

Auditado contra `ROPINDER_BIBLE/LOOPS/05-UX-UI-PWA.md` con greps reales, no memoria:

| Ítem | Hallazgo |
|---|---|
| Imágenes vía `next/image` | REAL — único `<img>` crudo en `profile/upload` es un preview local de blob antes de subir, caso legítimo, ya documentado con el comentario de eslint-disable correspondiente |
| Focus states (`outline-none` sin reemplazo) | REAL — los 13 usos de `outline-none` en la app de consumidor van siempre acompañados de `focus:ring`, ninguno remueve el foco sin reemplazo |
| Accesibilidad de botones ícono-only | **Gap real, corregido**: 7 controles sin `aria-label` — los dos botones más críticos de toda la app (Me gusta / No me interesa del swipe, `SwipeScreen.tsx`), el botón de reportar en el chat, 4 botones "volver" (buscar, detalle de prenda, detalle de subasta, chat) y la campanita de notificaciones flotante. Corregido con `aria-label` en los 7. |
| PWA (manifest, service workers) | REAL — ya confirmado en ciclos anteriores de esta sesión |

**No hecho todavía**: auditoría de contraste de color, navegación completa por teclado (tab order, trampas de foco en modales/drawers), un archivo de design tokens formal para la app de consumidor (hoy son clases de Tailwind repetidas por pantalla, no un sistema con nombre — el admin sí tiene `components/admin/ui.tsx` como token layer, la app de consumidor no tiene su equivalente). Se documenta como pendiente, no se inventó un sistema de diseño nuevo sin evidencia de que haga falta.

## Ciclo 4 — Loop 02 (Marketplace), auditoría + radio por plan

Auditado contra `ROPINDER_BIBLE/LOOPS/02-MARKETPLACE.md`:

| Ítem | Hallazgo |
|---|---|
| Venta/Intercambio/Subasta, favoritos, búsqueda | REAL — confirmado en el audit original |
| Radio de búsqueda | **Gap real, corregido**: ya existían tiers (1/5/20/50km, `DistanceSlider`) — no era "un solo radio hardcodeado" como asume la Bible — pero cualquier usuario, gratis o Premium, podía llegar a 50km, y el servidor (`/api/clothes`) confiaba ciegamente en el `radius` que mandaba el cliente. Ahora: gratis tope 20km, Premium tope 50km, **clampeado server-side** (`lib/searchRadius.ts`, testeado) — el cliente ya no es la única barrera. |
| Publicación de persona: una sola foto | **Gap real, no corregido este ciclo**: `ClothingItem.imageUrl` es un string único, no un array — no hay multi-foto ni video. Corregirlo bien implica modelo nuevo (`ClothingItemPhoto[]` o campo array), UI de carga múltiple, reordenar, y migrar publicaciones existentes sin romper nada — alcance propio, no una pasada rápida. |
| Canje con diferencia de dinero (`Offer`: producto + diferencia ↔ producto) | **Gap real, no corregido este ciclo**: `Offer` fuerza `amount: 0` cuando `offeredItemId` está seteado — es o trueque puro o dinero puro, nunca ambos. El schema ya soportaría los dos campos juntos, pero la diferencia de dinero necesitaría entrar al mismo circuito de escrow/comisión que una venta normal para no ser plata fantasma — es un cambio de flujo de pago, no solo de validación, y este ciclo ya tocó bastante dinero (comisiones) como para apurar otro sin una pasada dedicada. |
| Tienda como publicador separado | NO EXISTE — mismo hallazgo que la auditoría original, sigue bloqueado por decisión de producto |
| `Operation` unificada | NO EXISTE — mismo hallazgo que la auditoría original |

## Ciclo 5 — Loop 01 (Fintech), FinancialProviderAdapter

Instrucción explícita: "sacar mercado pago de la ecuación y seguir lo que dice el loop fintech" — el propio Loop 01 §8-9 ya resuelve el bloqueo de "no hay proveedor real todavía": `FinancialProviderAdapter` + `MockFinancialProvider` en desarrollo, proveedor real en producción cuando exista. Se implementó eso, no se siguió esperando a MercadoPago.

- `lib/financialProvider.ts` — interfaz `FinancialProviderAdapter` (`charge`/`payout`/`refund`) + `MockFinancialProvider` (simula éxito siempre, nunca mueve plata real, pero devuelve un `providerRef` real y trazable). Único punto de cambio (`getFinancialProvider()`) cuando se conecte un proveedor de verdad — ningún call site necesita tocarse.
- Los 4 puntos donde se mueve dinero pasan a llamar al adapter en vez de simular inline: `POST /api/checkout` (compra de créditos/premium), `POST /api/matches/[id]/pay` (compra de una prenda — **cierra el hallazgo de "el comprador no paga nada"**: ahora la compra pasa por un `charge()` real y auditable, con manejo de fallo explícito, aunque el Mock hoy siempre lo aprueba), `lib/closeAuction.ts` (el ganador de una subasta ahora también es "cobrado" vía el adapter, con notificación a ambas partes si fallara), y la aprobación de retiro (`payout()`, sigue siendo el admin quien transfiere a mano hasta tener un proveedor real).
- El reembolso (`POST /api/admin/reports/[id]/refund`) ahora llama `refund()` cuando el pago original tiene `providerRef`, y guarda `refundedBy` en su propio `meta` (antes solo quedaba en el `Report` vinculado, indirecto).
- **Deliberadamente no se bloqueó a compradores con $0 de saldo** — el Mock cobra sin tocar `balance` (representa "tarjeta/externo", igual que el checkout ya simulaba), así que el comportamiento visible de compra no cambió para nadie. Cuando haya un proveedor real, esa decisión (¿siempre tarjeta externa, o descontar Ropinder Cash primero?) es la que habilita la matriz 10/15/20 de comisión — sigue pendiente, ahora con la arquitectura correcta debajo en vez de bloqueada por completo.
- Sin cambios de schema — todo lo nuevo vive en los campos `meta` (JSON) que ya existían, no hizo falta sync a Turso.
- Tests nuevos (`tests/financialProvider.test.ts`).

## Ciclo 6 — Loop 03 (Admin), Audit Log + Precios configurables

Instrucción explícita: "hacer loop 3 y pasos de 8=11". Loop 03 (`ROPINDER_BIBLE/LOOPS/03-ADMIN.md`) pide, entre otras cosas, registrar acciones sensibles de admin ("Record sensitive actions") y planes editables sin redeploy.

- **Audit log**: modelo `AdminAuditLog` (append-only, mismo criterio que el ledger financiero: ninguna ruta lo edita ni borra) + `lib/auditLog.ts`'s `logAdminAction(adminId, action, targetType, targetId, meta)`, llamado siempre fire-and-forget (`.catch(() => {})`) para que un fallo de logging nunca bloquee ni deshaga la acción real. Cableado en las 12 rutas admin que ya movían dinero, roles o acceso: ban/unban, delete de usuario, promote/demote, blacklist de email, grant-premium, grant-credits, reset-password, editar comisiones, aprobar/rechazar transacción (transferencia o retiro), refund de reporte, y promo masivo/rifa de créditos. `GET /api/admin/logs` + `/admin/logs` (nueva entrada de nav en "Sistema") lo hacen legible: últimas 300 acciones, buscable por admin/acción/target, sin paginación todavía (alcanza para el volumen actual).
- **Precios configurables**: `lib/pricing.ts` mantiene `PACKS` como base (créditos/premium/verified/días — estructural, no editable), pero el precio real se resuelve con `getEffectivePacks()`, que sobreescribe con `Config` (clave `pricing.<packId>`) igual que ya hacía el motor de comisiones. `POST /api/checkout` pasó a leer de ahí en vez del constante crudo — cierra un gap real: antes el precio cobrado y el precio mostrado en `/premium` podían quedar desincronizados si alguien editaba uno sin el otro. Ahora ambos leen de `GET /api/pricing` (público, sin datos sensibles). Admin edita desde `/admin/precios` (nueva entrada en "Finanzas"), con el mismo audit log (`PACK_PRICE_UPDATED`).
- Sin cambios a estructura de precios (créditos/días/premium/verified siguen fijos en código) — solo el número del precio es editable. Agregar/quitar un pack entero sigue siendo un cambio de código, no de admin.
- Verificación: `tsc --noEmit` limpio, `eslint` limpio sobre los archivos tocados, 45/45 tests (`npm test`) pasando. `next build` local volvió a fallar por el mismo lock cruzado de `.next/lock` en el volumen SMB compartido con la máquina Windows (ya diagnosticado en un ciclo anterior, fuera de control desde este lado) — verificación real de build queda en manos del build remoto de Vercel tras el push.
- Migración Turso: `AdminAuditLog` es tabla nueva, necesita `CREATE TABLE IF NOT EXISTS` en un script `scripts/sync-*-schema-turso.ts` nuevo antes de que el audit log funcione en producción — pendiente, requiere autorización explícita del usuario antes de correr contra la base real (protocolo establecido este ciclo).

## Backlog priorizado (ciclos futuros)

| Ítem | Bloqueado por | Motivo |
|---|---|---|
| Conectar MercadoPago real (Fase 15) | Decisión/cuenta del usuario | Ya se conversó — Stripe (única opción del Vercel Marketplace) no soporta payouts a Argentina; MercadoPago requiere que el usuario cree la cuenta comercial y comparta credenciales. La arquitectura ya está lista (`FinancialProviderAdapter`, Ciclo 5) — conectar el proveedor real es implementar una clase nueva y cambiar `getFinancialProvider()`, no tocar los call sites. Sigue bloqueando la matriz de comisión por método de pago (10/15/20), que necesita plata de verdad entrando para tener sentido. |
| Wallet formal (`Wallet` como modelo con `pending/locked/withdrawable_balance` explícitos) | — | Hoy esos valores se derivan calculando sobre `Transaction` en cada request (correcto, pero no está modelado). Vale la pena solo si el volumen de transacciones lo justifica — con 10 usuarios reales, el cálculo on-the-fly es más simple y no es un cuello de botella. |
| Pago combinado (saldo + externo) + beneficio de saldo (Fases 12-13) | Wallet formal + gateway real + arreglar que hoy el comprador no paga nada (ver `ROPINDER_AUDIT.md`) | Necesita las tres piezas anteriores para no ser una demo sin backend. |
| Cuentas Tienda (Fases 2-4, 37, Loop 02) | Decisión de producto | Requiere definir qué datos/verificación/catálogo distingue a una tienda de una persona vendiendo mucho — no es solo un campo `accountType`, cambia signup, perfil, analytics y admin. |
| Multi-foto / video por publicación (Loop 02) | — | `ClothingItem.imageUrl` es un campo único hoy. Necesita modelo nuevo + UI de carga múltiple + migración de publicaciones existentes. |
| Canje con diferencia de dinero (Loop 02) | Mismo prerequisito que pago combinado | `Offer` ya tiene los dos campos (`amount`, `offeredItemId`) pero se usan de forma excluyente. Habilitarlos juntos implica que la diferencia entre al circuito de escrow/comisión, no solo relajar una validación. |
| Operations unificado + Centro de disputas (Fases 24-27, 39) | Wallet + volumen real | Hoy `Report` ya dispara reembolsos puntuales; un sistema de disputas completo (evidencia, tracking, escalamiento) tiene sentido cuando haya casos reales que lo justifiquen — con 0 disputas hasta ahora, construirlo sería UI sin casos de uso reales detrás. |
| Admin Wallet dedicado (Fase 34) | — | Evaluado y **descartado por ahora**: `/admin/usuarios` (saldo por usuario) + `/admin/transacciones` (ledger completo, todos los tipos, filtrable) + Herramientas (ajustes auditados, nunca edición directa) ya cubren lo que pide la fase. Una página nueva sería duplicar, no agregar. Se reabre si el admin real reporta que algo específico le falta ahí. |
| Roles granulares (Moderador/Soporte/Finance/Analyst) | — | Ya documentado como pendiente en `ADMIN_ROADMAP.md` desde el ciclo del backoffice — requiere modelo de permisos nuevo, no una casilla de UI. |
| Design tokens formales para la app de consumidor | — | El admin ya tiene `components/admin/ui.tsx`; la app de consumidor sigue siendo Tailwind inline por pantalla. No es un bug, pero es inconsistente con lo que pide Loop 05. |
| Contraste de color y navegación por teclado completa | — | No auditado todavía este ciclo — requiere revisión manual/herramienta dedicada, no solo grep. |

## Regla de continuidad

Cada ciclo nuevo debe releer `ROPINDER_AUDIT.md` (o volver a auditar si pasó tiempo) antes de tocar código — el estado real cambia con cada ciclo y el audit debe seguir siendo verdad, no un snapshot viejo.
