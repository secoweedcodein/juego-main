# FASE 0 — Planificación técnica

**Juego:** NEON CIRCUIT (título temporal) — juego de peleas 3D 1v1 online, estética cyberpunk urbana oscura.
**Objetivo de la fase:** definir arquitectura, sistemas, roadmap y estrategia de red. Sin contenido de juego todavía.

## Motor y stack (adaptación obligatoria)

Unreal Engine 5 no es ejecutable en este entorno. El equivalente funcional es un juego 3D web:

- Render/escena: React Three Fiber + Three.js (cámara lateral 3D, luces, niebla, post-proceso ligero)
- Lógica de juego: TypeScript puro, desacoplada del render (permite correrla también en servidor)
- Backend (Lovable Cloud): cuentas, perfiles, estadísticas, matchmaking y sincronización en tiempo real
- Autoridad: servidor autoritativo sobre vida, stamina, daño, rounds y resultado

Todo lo demás del documento (fases, sistemas, data-driven, placeholders, originalidad) se mantiene igual.

## Estructura de carpetas

```text
src/
  routes/            menu, auth, characters, profile, play, match
  game/
    core/            loop determinista, tick fijo, RNG con semilla
    combat/          ataques, hitbox/hurtbox, stun, knockback, combos
    systems/         health, stamina, round, match, input, hazards, weapons
    data/            character defs, move lists, stage defs (data-driven)
    net/             cliente de sala, snapshots, reconciliación
    render/          Canvas, escenas, cámara, VFX, modelos
    audio/           música y SFX
  components/hud/    barras, timer, combo counter, resultado
  lib/               utils, cliente backend
```

## Sistemas principales y dependencias

| Sistema | Responsabilidad | Depende de |
|---|---|---|
| Core Loop | tick fijo 60Hz, delta clamp, estado del combate | — |
| Input | teclado → intents (W/S/A/D, Space, Shift, Ctrl, ataques) | Core |
| Combat | startup/active/recovery, daño, stun, cancel windows | Core, Data |
| Hitbox/Hurtbox | volúmenes por frame, i-frames | Combat |
| Health / Stamina | recursos, regeneración, costes | Combat |
| Combo | cadenas por personaje, ventanas, hit confirm | Combat, Data |
| Round / Match | best of 3, timer, KO, victoria | Health, Net |
| Weapon / Props | recoger, lanzar, romper | Combat |
| Stage Hazard | avisos visuales/sonoros, ring-out en Dock | Match |
| Camera | lateral, zoom dinámico, límites, shake | Core |
| Net | sala, autoridad servidor, snapshots + input | Backend |
| Account / Profile | registro, login, stats | Backend |
| UI / HUD | menús, select, HUD, resultado | Match |
| Audio | música por mapa, SFX de impacto | Core |

## Modelo de red

- El servidor mantiene el estado autoritativo del combate por sala; los clientes envían **intents** (no daño ni posiciones).
- Cliente aplica predicción local del propio luchador y reconcilia con el snapshot del servidor.
- Rival se muestra con interpolación de snapshots (buffer corto ~100 ms).
- Frecuencia objetivo: simulación 60 Hz, snapshots 20 Hz, delta-compresión de campos.
- Desconexión: 10 s de gracia, luego victoria por abandono.

## Data-driven

Cada personaje y mapa es un objeto de datos tipado (no lógica duplicada):
`{ id, nombre, stats {power, speed, range, defense, tech}, moves[{startup, active, recovery, damage, stun, knockback, staminaCost, cancels[]}], combos[], specials[], ultimate }`.
Añadir un personaje o mapa = añadir un archivo de datos.

## Generación de assets con IA

Concept art y texturas: generador de imágenes integrado. Modelos: kits CC0 game-ready (Kenney / Quaternius / poly.pizza) para humanoides riggeados; animaciones desde esos kits o clips genéricos. Audio: pistas y SFX generados o CC0. Todo lo que falte entra como **placeholder documentado** en `ASSETS_TODO.md`, nunca bloquea el desarrollo.

## Roadmap por fases

- F1 Core: escena, cámara lateral, luchador, movimiento, input
- F2 Combat: ligero/pesado/patada/agarre, defensa, esquiva, stamina, hitbox, combos, impacto
- F3 Rounds: timer, KO, best of 3, resultado local
- F4 Personajes: base + Boxer, Kickboxer, Grappler, Street Fighter (data-driven)
- F5 Mapas: Neon District, Iron Yard, Blackwater Docks
- F6 Interacción: objetos, armas improvisadas, hazards, ring-out
- F7 Online: Cloud, salas, autoridad servidor, replicación, sincronía de rounds
- F8 Cuentas: registro/login/perfil/estadísticas
- F9 Matchmaking: play online → searching → match found → mapa aleatorio → fight → result
- F10 Polish: UI, VFX, audio, iluminación
- F11 Optimización: draw calls <100, triángulos <100k, pixel ratio limitado, 60 FPS en gama media

## Cómo se prueba cada fase

Cada fase termina con: captura del navegador que demuestra la funcionalidad, consola limpia, y una lista corta de pasos manuales (mover, golpear, bloquear, KO, reconectar). Nada se da por funcionando sin verificarlo en ejecución.

## Riesgos conocidos

- Netcode competitivo con rollback completo queda fuera del MVP; se usa predicción + reconciliación.
- Calidad de animaciones limitada a lo que ofrezcan los kits CC0 riggeados.
- No hay build ejecutable de Windows: la entrega es web (jugable en PC vía navegador).

## Siguiente tarea propuesta

FASE 1 — Core: escena base cyberpunk de prueba, cámara lateral con zoom dinámico, un luchador placeholder con movimiento (aceleración, salto, agachado, esquiva) e input mapeado.
