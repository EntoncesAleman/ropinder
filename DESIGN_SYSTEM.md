# DESIGN_SYSTEM.md — Ropinder

Estado real, no aspiracional. Ver `AUDIT.md` §4 para el contexto de por qué esto es mínimo en este ciclo.

## Paleta (ya en uso, ahora documentada — no inventada)

| Uso | Color | Clase Tailwind |
|---|---|---|
| Acción primaria / marca | Rose 500 | `rose-500` / `#f43f5e` |
| Éxito / intercambio / canje | Emerald 500/600 | `emerald-500`, `emerald-600` |
| Subasta / urgencia / pendiente | Amber 500/700 | `amber-500`, `amber-700` |
| Texto / superficies neutras | Slate 50–900 | `slate-*` |
| Verificación / confianza | Sky 500 | `sky-500` |

## Badges por modalidad (convención fijada en este ciclo)

- **Venta**: precio en `text-slate-900 font-extrabold`, sin badge (es el caso por defecto).
- **Intercambio**: badge `Repeat` ícono, `text-emerald-600`.
- **Subasta**: badge `Gavel` ícono, fondo `bg-amber-500 text-white` (única modalidad con fondo sólido — necesita destacarse porque implica una acción con límite de tiempo).

Aplicado consistente en: `ClothingCard`, `/buscar`, `/item/[id]`, `/seller/[id]`, `/favorites`, `/subastas`.

## PWA

- `public/manifest.webmanifest` + `public/icon.svg` (ícono base único, SVG `any`+`maskable`) — ver `ARCHITECTURE.md` §4 para lo que falta (set de PNG en todas las resoluciones, es trabajo de diseño no de arquitectura).
- `theme_color`/`background_color`: `#f43f5e` / `#fff1f2`.

## Lo que NO existe todavía (pendiente, no ocultar)

- Tokens CSS centralizados (`globals.css` sigue casi vacío). Las clases Tailwind de arriba son la fuente de verdad *de facto* por repetición, no por un archivo de tokens.
- Tipografía: solo `Geist` (default de `create-next-app`), sin escala tipográfica documentada.
- Ningún componente de UI reusable formal (botón, input, card) — cada página repite sus propias clases. Extraer esto es prerequisito real antes de abordar Desktop Usuario/Admin (`ARCHITECTURE.md` §6).
