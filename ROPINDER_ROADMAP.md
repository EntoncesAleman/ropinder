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
| Sync de schema a Turso (tabla `Config`) | PENDIENTE — requiere autorización explícita antes de tocar producción, mismo protocolo que ciclos anteriores |

### Por qué esto y no otra cosa primero

De las 46 fases, la Fase 9/10 (comisiones) y 40 (config) eran las únicas que se podían resolver **completas, sin inventar entidades nuevas** y sin depender de decisiones de producto todavía no tomadas (tipo de cuenta Tienda, diseño del chat guiado, modelo de disputas). Es además la pieza que más rápido paga: cualquier ajuste de comisión hoy requiere editar código y redeployar; después de este ciclo es un formulario.

**No se tocó**: pago combinado (Fase 13) ni beneficio de saldo (Fase 12) — ambos dependen de que exista una forma de pagar con Ropinder Cash + dinero externo en la misma operación, y hoy cada compra usa un solo método. Implementarlos ahora sería UI sin motor real detrás, exactamente lo que el spec prohíbe.

## Backlog priorizado (ciclos futuros)

| Ítem | Bloqueado por | Motivo |
|---|---|---|
| Conectar MercadoPago real (Fase 15) | Decisión/cuenta del usuario | Ya se conversó — Stripe (única opción del Vercel Marketplace) no soporta payouts a Argentina; MercadoPago requiere que el usuario cree la cuenta comercial y comparta credenciales. Bloqueante para que cualquier cobro con tarjeta deje de ser simulado. |
| Wallet formal (`Wallet` como modelo con `pending/locked/withdrawable_balance` explícitos) | — | Hoy esos valores se derivan calculando sobre `Transaction` en cada request (correcto, pero no está modelado). Vale la pena solo si el volumen de transacciones lo justifica — con 10 usuarios reales, el cálculo on-the-fly es más simple y no es un cuello de botella. |
| Pago combinado (saldo + externo) + beneficio de saldo (Fases 12-13) | Wallet formal + gateway real | Necesita las dos piezas anteriores para no ser una demo sin backend. |
| Chat guiado + banco de preguntas + editor admin (Fases 17-22, 36) | Decisión de producto | Es un subsistema completo nuevo (modelos `ChatQuestion`/`ChatTemplate`/`ChatAnswer`, UI de botones en el chat, editor drag-and-drop en admin con versionado). No depende de wallet ni pagos — candidato fuerte para el próximo ciclo si se prioriza por sobre Tiendas. |
| Cuentas Tienda (Fases 2-4, 37) | Decisión de producto | Requiere definir qué datos/verificación/catálogo distingue a una tienda de una persona vendiendo mucho — no es solo un campo `accountType`, cambia signup, perfil, analytics y admin. |
| Operations unificado + Centro de disputas (Fases 24-27, 39) | Wallet + volumen real | Hoy `Report` ya dispara reembolsos puntuales; un sistema de disputas completo (evidencia, tracking, escalamiento) tiene sentido cuando haya casos reales que lo justifiquen — con 0 disputas hasta ahora, construirlo sería UI sin casos de uso reales detrás. |
| Admin Wallet dedicado (Fase 34) | — | Evaluado y **descartado por ahora**: `/admin/usuarios` (saldo por usuario) + `/admin/transacciones` (ledger completo, todos los tipos, filtrable) + Herramientas (ajustes auditados, nunca edición directa) ya cubren lo que pide la fase. Una página nueva sería duplicar, no agregar — el propio spec pide eliminar duplicados (Fase 45). Se reabre si el admin real (el usuario) reporta que algo específico le falta ahí. |
| Roles granulares (Moderador/Soporte) | — | Ya documentado como pendiente en `ADMIN_ROADMAP.md` desde el ciclo del backoffice — requiere modelo de permisos nuevo, no una casilla de UI. |
| Audit log de acciones admin (Fase 33) | — | Mismo gap, mismo motivo, ya documentado en `ADMIN_ROADMAP.md`. |

## Regla de continuidad

Cada ciclo nuevo debe releer `ROPINDER_AUDIT.md` (o volver a auditar si pasó tiempo) antes de tocar código — el estado real cambia con cada ciclo y el audit debe seguir siendo verdad, no un snapshot viejo.
