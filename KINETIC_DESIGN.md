# AFA LAUNCH kinetic design release

The public entrance is now a scroll-driven editorial sequence rather than a static dashboard promotion. The dark green/graphite palette, pale lime actions, Red/Blue identities and consistent triangular mark extend across landing, authentication and the game.

## Motion

- A locally generated chrome torus-knot sculpture, segmented orbital shell, illuminated rings and particles use Three.js. Pointer input changes orientation. Scroll changes camera/scene composition without trapping normal scrolling. No external model or image download is required.
- Desktop hero pins for a short scroll passage; text moves/fades as the sculpture advances. Mobile uses a natural stacked layout without pinned scrolling.
- Header section buttons scroll to real sections without changing the hash router. A progress line tracks document movement. A moving signal strip leads into Red/Blue previews.
- Team previews are accessible pressed-state buttons and explicitly do not enroll the visitor. Hover, orbit and selected treatments explain the two perspectives.
- Phase 1 reveal includes a CSS architectural sculpture, scan line and floating movement. Later phases remain locked.
- Section reveals, magnetic primary links, route crossfades, game-view entry transitions, modal entry, button feedback and countdown rings make the flow cohesive.

## Restraint and fallback

System reduced-motion preferences disable the continuous CSS animation, long pinned sequence and custom 3D movement; the static WebGL scene redraws only when necessary. Hidden/offscreen scenes skip rendering; pixel ratio is bounded at 1.5. Small scenes target at most 30 FPS, larger scenes 60. Geometry, shared materials, environment textures, observers and listeners are disposed on unmount. WebGL-unavailable/context-loss states retain a CSS orbital fallback. No audio, forced scroll hijacking or new external dependencies were added.

## Verification — 24 October 2026

37 unit tests and 81 local full-game integration assertions passed. Final TypeScript and Vite production build passed. Browser review verified desktop rendering, scroll-driven DOM transforms, section navigation, Blue preview selection, login navigation, real local student sign-in, live countdown, bank opening, incident briefing and investigation navigation. Worker-browser console had no errors during these flows.

Narrow-view reviews used same-origin Vite review frames with real internal viewport widths (320px and 390px outer frame widths). Landing and login had no document horizontal overflow; the compact login displayed its brand and usable form. The ignored qa/ harness is not in the production build or GitHub. Production CSP was not relaxed for testing.

Backend endpoints, game rules, transaction logic, accounts and permissions were not changed by this design release. The earlier hosted five-account rehearsal remains documented separately in HOSTED_REHEARSAL.md; it was not repeated against production for these visual changes. No 100–200-player load test or formal cross-browser certification is claimed.
