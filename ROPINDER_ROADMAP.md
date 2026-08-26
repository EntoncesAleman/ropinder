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

## Backlog priorizado (ciclos futuros)

| Ítem | Bloqueado por | Motivo |
|---|---|---|
| Conectar MercadoPago real (Fase 15) | Decisión/cuenta del usuario | Ya se conversó — Stripe (única opción del Vercel Marketplace) no soporta payouts a Argentina; MercadoPago requiere que el usuario cree la cuenta comercial y comparta credenciales. Bloqueante para que cualquier cobro con tarjeta deje de ser simulado, y para la matriz de comisión por método de pago (10/15/20). |
| Wallet formal (`Wallet` como modelo con `pending/locked/withdrawable_balance` explícitos) | — | Hoy esos valores se derivan calculando sobre `Transaction` en cada request (correcto, pero no está modelado). Vale la pena solo si el volumen de transacciones lo justifica — con 10 usuarios reales, el cálculo on-the-fly es más simple y no es un cuello de botella. |
| Pago combinado (saldo + externo) + beneficio de saldo (Fases 12-13) | Wallet formal + gateway real + arreglar que hoy el comprador no paga nada (ver `ROPINDER_AUDIT.md`) | Necesita las tres piezas anteriores para no ser una demo sin backend. |
| Cuentas Tienda (Fases 2-4, 37, Loop 02) | Decisión de producto | Requiere definir qué datos/verificación/catálogo distingue a una tienda de una persona vendiendo mucho — no es solo un campo `accountType`, cambia signup, perfil, analytics y admin. |
| Operations unificado + Centro de disputas (Fases 24-27, 39) | Wallet + volumen real | Hoy `Report` ya dispara reembolsos puntuales; un sistema de disputas completo (evidencia, tracking, escalamiento) tiene sentido cuando haya casos reales que lo justifiquen — con 0 disputas hasta ahora, construirlo sería UI sin casos de uso reales detrás. |
| Admin Wallet dedicado (Fase 34) | — | Evaluado y **descartado por ahora**: `/admin/usuarios` (saldo por usuario) + `/admin/transacciones` (ledger completo, todos los tipos, filtrable) + Herramientas (ajustes auditados, nunca edición directa) ya cubren lo que pide la fase. Una página nueva sería duplicar, no agregar. Se reabre si el admin real reporta que algo específico le falta ahí. |
| Roles granulares (Moderador/Soporte/Finance/Analyst) | — | Ya documentado como pendiente en `ADMIN_ROADMAP.md` desde el ciclo del backoffice — requiere modelo de permisos nuevo, no una casilla de UI. |
| Audit log de acciones admin (Fase 33) | — | Mismo gap, mismo motivo, ya documentado en `ADMIN_ROADMAP.md`. |
| Design tokens formales para la app de consumidor | — | El admin ya tiene `components/admin/ui.tsx`; la app de consumidor sigue siendo Tailwind inline por pantalla. No es un bug, pero es inconsistente con lo que pide Loop 05. |
| Contraste de color y navegación por teclado completa | — | No auditado todavía este ciclo — requiere revisión manual/herramienta dedicada, no solo grep. |

## Regla de continuidad

Cada ciclo nuevo debe releer `ROPINDER_AUDIT.md` (o volver a auditar si pasó tiempo) antes de tocar código — el estado real cambia con cada ciclo y el audit debe seguir siendo verdad, no un snapshot viejo.
