# AUDIT.md — Ropinder

Auditoría base para el loop de evolución a plataforma completa (venta + intercambio + canje + subasta, mobile-app + desktop usuario + desktop admin). Generada antes de tocar código de esta fase. Se actualiza en cada ciclo.

## Estado — Ciclo 1 (cerrado)

Hecho: base PWA (manifest + metadata), Subasta de punta a punta (schema, API con concurrencia server-authoritative verificada, cron de cierre, UI mobile completa: publicar/descubrir/pujar/historial). Ver `ARCHITECTURE.md` §6 para lo que quedó explícitamente fuera (Desktop Usuario, Desktop Admin, Canje por crédito, service worker offline). Próximo ciclo recomendado: sistema de componentes reusable (botón/input/card) como prerequisito de Desktop Usuario — ver `DESIGN_SYSTEM.md`.

## Estado — Ciclo 2 (cerrado)

Hecho, sin tocar la lógica ni el estado de ninguna pantalla existente (solo JSX/clases `lg:` aditivas, mobile sin cambios):
- **Shell responsive real**: `AppNav` pasa de bottom-tab a rail lateral izquierdo en desktop (usuario) — un solo cambio que resuelve "se siente distinto" en toda la app.
- **`/` (Descubrir)**: grilla de marketplace en desktop (hover para like/dislike) en vez del mazo de swipe estirado; mobile sigue siendo el swipe original intacto.
- **`/buscar`**: sidebar de filtros persistente en desktop (sin toggle) en vez del panel colapsable.
- **Admin desktop**: contenedor ancho + navegación de tabs movida a rail **derecho** (pedido explícito), sin nav inferior tipo app. Nueva pestaña **Subastas** (Fase 22 del pedido): admin ve todas las subastas con estado/ganador/pujas y puede cancelarlas (`/api/admin/auctions`, `/api/admin/auctions/[id]/cancel`).
- **Accesibilidad** (Fase 26): barrido completo de botones solo-ícono sin nombre accesible — 7 encontrados y corregidos (`aria-label`) en `MatchModal`, `PaymentMethodModal`, pregunta en `/item/[id]`, editar perfil, favoritos/reportar en `/seller/[id]`, mostrar/ocultar contraseña en `/login`.

Verificado: `tsc`/`eslint` limpios, 24/24 tests. No verificado visualmente (dev server no responde en este sandbox — ver hallazgo previo), por lo que todo el trabajo `lg:` se hizo con clases Tailwind estándar bien entendidas y gateando explícitamente por breakpoint para minimizar riesgo de regresión sin poder verlo renderizado.

## Estado — Ciclo 3 (cerrado)

Terminó el rediseño desktop: las ~15 pantallas restantes (ropero, favoritos, matches, notificaciones, historial, perfil, seller, item/subasta detail, premium, chat) ya tienen composición `lg:` propia — no solo heredan el ancho del rail, cada una tiene grilla o layout de 2 columnas donde correspondía, o un ancho centrado más generoso donde la página es un formulario/settings (login, signup, perfil, publicar) porque angostarlas ahí es la UX correcta, no una carencia.

Se agregó el shell offline (`public/sw-offline.js` + `public/offline.html`, registrado en `components/ServiceWorkerRegister.tsx`) — ver `ARCHITECTURE.md` §4 para el porqué de dos archivos de SW en vez de uno, y por qué deliberadamente no cachea los chunks de Next (el error clásico de PWA que rompe la app después de cada deploy).

**Canje por crédito queda definitivamente fuera**, no por falta de tiempo sino porque no encontré ninguna versión de "entregá tu prenda → recibí crédito → comprá otra" que no sea (a) Ropinder comprando inventario con riesgo financiero real que no puedo autorizar, o (b) una relabeled de Venta/Intercambio que ya existen. Razonamiento completo en `ARCHITECTURE.md` §6.

Verificado: `tsc`/`eslint` limpios, 24/24 tests, sin regresión visual verificable por la misma limitación de entorno de ciclos anteriores.

## 1. Arquitectura actual

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 + adaptador libSQL (SQLite local / Turso en prod) · JWT en cookie httpOnly · Vercel Blob para imágenes · Firebase Cloud Messaging (push) · Capacitor ya vendorizado en `/android` y `/ios` (la app YA se empaqueta como híbrida, ver más abajo).
- **Rutas**: ~40 endpoints bajo `app/api`, 20 de ellos en `/api/admin`. Páginas de usuario bajo `app/*` (una por función: swipe, buscar, ropero, matches, profile, etc.), panel admin en `app/admin`.
- **Auth**: `lib/auth.ts` — JWT, `requireAdmin()` gatea todas las rutas admin. Sólido y consistente.
- **Modalidades existentes hoy**: Venta (precio) e Intercambio/Canje (precio vacío = trueque, implementado en la iteración anterior de este mismo loop: modelo `Offer` con `offeredItemId`/`completedAt`). El pedido actual distingue "Intercambio" y "Canje" como dos conceptos separados — hoy son el mismo mecanismo. Ver sección 6.

## 2. Qué funciona con backend real (no mock)

- Registro/login, JWT, rate limiting de login, verificación de email por código.
- Publicar prenda, subida de imagen (Vercel Blob + magic-byte validation).
- Swipe → match (lógica de doble-like real, créditos con descuento atómico).
- Chat de match, filtro anti-contacto-externo antes de cerrar la venta.
- Ofertas de precio y de canje (propuesta → aceptar/rechazar → completar), con archivado de prendas al concretarse.
- Escrow de venta (hold → confirmar recepción → release con comisión), retiro de saldo con aprobación admin.
- Favoritos, preguntas y respuestas por prenda, reportes, calificación 1-5 post-operación.
- Notificaciones in-app + push (Firebase), panel admin con moderación, usuarios, transacciones, estadísticas, CSV export.

## 3. Qué está simulado (no confundir con "no funciona")

- **Checkout con tarjeta**: `paymentMethod: "card"` en `/api/checkout` aplica el pack al instante sin pasarela real — está **explícitamente rotulado** en la UI ("Pago simulado — demo de pasarela"). Es un placeholder consciente pre-lanzamiento, no un bug oculto.
- La transferencia bancaria y el retiro de saldo SÍ tienen flujo real de aprobación manual por admin (arreglado en el ciclo anterior).

## 4. Deuda técnica y riesgos conocidos

- **Sin `prisma migrate`**: el esquema se sincroniza a mano contra Turso con 14+ scripts `scripts/sync-*-schema-turso.ts`. Alto riesgo de drift — confirmado en este ciclo: la base Turso real está **atrasada respecto al código** (falta la tabla `Offer` completa y las columnas `stylePrefs`/`brandPrefs`). Cualquier fase nueva (subasta incluida) necesita su propio script de sync antes de desplegar.
- **`.env` local apunta a la base de Turso real** (10 usuarios reales) en vez de a `dev.db`. Ya corregido el fallback en `lib/prisma.ts`; para desarrollar/testear localmente hay que forzar `TURSO_DATABASE_URL=`.
- **El dev server (`next dev`) no sirve requests en este entorno sandboxed** (confirmado con Turbopack, webpack, y hasta archivos estáticos — un servidor Node plano en el mismo puerto sí respondía). No es arreglable desde el código de la app; bloquea el testing visual/en-navegador de este ciclo. Cualquier revisión visual de esta fase queda pendiente de un entorno donde el dev server sí levante.
- **Cero diseño responsive**: 20 páginas usan `max-w-sm mx-auto` (o `max-w-lg` en admin) como contenedor raíz — en pantallas grandes el contenido queda como una columna angosta centrada rodeada de espacio vacío. No hay ni un solo breakpoint `md:`/`lg:` en toda la base. Esto es la causa raíz de por qué "no hay experiencia desktop" — no es que falten páginas, es que ninguna página tiene una segunda composición de layout.
- **Cero PWA**: no existe `manifest.json`, no hay iconos de app (solo los placeholders de `create-next-app`: `next.svg`, `vercel.svg`), no hay `theme-color` ni metadata de `apple-web-app` en `layout.tsx`, no hay service worker de app (el único SW existente, `firebase-messaging-sw.js`, es solo para push, no cachea nada ni habilita "Agregar a inicio").
- **`globals.css` está casi vacío** (7 líneas) — no hay tokens de diseño (color, radio, sombra, tipografía) centralizados; cada componente repite clases Tailwind arbitrarias inline. Esto es exactamente lo que hace riesgoso escalar a 3 layouts (mobile/desktop-usuario/desktop-admin) sin antes fijar un sistema de tokens compartido.
- **ESLint/TS**: limpios (0 errores) al cierre del ciclo anterior. Sin tests salvo lógica pura (`tests/`, 16 tests) — nada de UI ni de rutas con DB.

## 5. Reutilizable vs. necesita trabajo nuevo

| Área | Estado |
|---|---|
| Auth, sesión, roles | Reutilizar tal cual |
| Modelo de datos (User, ClothingItem, Match, Offer, Transaction, Rating, Report, Notification) | Reutilizar, **extender** para Subasta |
| Rutas API existentes | Reutilizar; replicar su patrón (auth server-side, nunca confiar en el cliente) para Subasta |
| Componentes de UI (`ClothingCard`, `SwipeScreen`, panel admin) | Reutilizar la lógica; **no** reutilizar el layout de contenedor (`max-w-sm`) para las vistas desktop — necesitan una composición nueva, no un `md:` parche sobre el mismo JSX |
| `AppNav` (bottom nav) | Correcta para mobile; necesita una variante lateral/superior para desktop, no estirarla |
| `globals.css` / design tokens | Crear de cero (no existe) |
| PWA | Crear de cero (no existe) |

## 6. Decisión de producto: Intercambio vs. Canje

El pedido nombra 4 modalidades (Venta, Intercambio, Canje, Subasta) como conceptos distintos, pero el pedido original de "canje" (Fase 10) describe un sistema de **valor/crédito de canje** ("el usuario entrega prenda → recibe valor de canje → elige otra prenda"), mientras que "Intercambio" (Fase 9) describe **prenda por prenda directo** — que es exactamente lo que ya se implementó en el ciclo anterior bajo el nombre "canje" (`Offer.offeredItemId`).

Decisión tomada (sin volver a preguntar, según instrucción): renombrar el concepto ya implementado a **Intercambio** (prenda-por-prenda, es lo que ya existe y funciona) y dejar **Canje-por-crédito** fuera de esta fase — no existe ningún sistema de "valor de canje" hoy y crearlo implica una moneda paralela nueva (créditos ya significan otra cosa: gasto de swipes/bumps). Implementarlo mal sería peor que no implementarlo. Queda documentado como pendiente explícito, no oculto.

## 7. Recomendación de orden (siguiendo la prioridad que fijó el pedido)

1. Estabilidad — ya verificado (tsc/eslint/tests limpios).
2. Arquitectura — este documento + `ARCHITECTURE.md`.
3. Base PWA (manifest, metadata, theme-color) — habilita "instalable" sin tocar ninguna pantalla existente. Bajo riesgo, alto valor, lo hago en este ciclo.
4. Subasta de punta a punta (schema, API con concurrencia segura, UI mínima mobile) — es la única modalidad genuinamente nueva pedida. Lo hago en este ciclo.
5. Desktop usuario y Admin desktop — requieren definir primero los tokens de diseño (Fase 2 del pedido) y luego re-componer layouts por sección; es el trabajo más grande de todo el pedido. Lo dejo planificado en `ARCHITECTURE.md` como próximo ciclo, no lo fuerzo a medias en este.
