# Gaming Odyssey

A responsive, browser-based arcade with three original games:

- **Pro Striker 2D** — local two-player arcade football.
- **Aero Dodge** — a touch-friendly endless flier with a persistent best score.
- **Voxel Builder 3D** — a first-person voxel sandbox with mining and building.

## Run locally

Open `index.html` with a local web server (for example, VS Code Live Server). The games are loaded inside the hub’s player, so running the project from its root folder keeps all paths working.

## Project structure

```text
index.html                 Hub markup
css/main.css               Hub styles
js/main.js                 Navigation, games catalogue, theme, game player
games/2D-Football/         Canvas football game
games/Flappy-Bird/         Aero Dodge canvas game
games/Minecraft-3D/        Three.js voxel sandbox
```

## Controls

| Game | Controls |
| --- | --- |
| Pro Striker 2D | Player 1: WASD + Space. Player 2: Arrows + Enter. |
| Aero Dodge | Click, tap, or Space to flap. |
| Voxel Builder 3D | WASD, Space, left-click mine, right-click place, 1–5 choose blocks. |

## Notes for contributors

- Add hub games in `js/main.js` inside the `GAMES` catalogue.
- The selected theme and Aero Dodge best score use `localStorage`.
- Voxel Builder renders exposed blocks as instanced meshes, keeping draw calls low while preserving mining, placement, and collisions.
- The contact form is presentation-only until it is connected to a form service or backend endpoint.
