# T-10B — One-Lane Ability & Balance Playtest Sandbox Implementation Plan

Status: APPROVED v1.0 — OWNER DECISIONS D-69–D-75 CONFIRMED (OPTION A); READY FOR IMPLEMENTATION
Last Updated: 2026-11-21
Related Tasks: `T-06`–`T-10` (Headless Gameplay Engine Complete), `ABILITY_CATALOG.md` (Confirmed v2.0), Pre-`GAME_BALANCING.md` / `T-12` Interactive Verification

---

## 1. Objective & Scope

Following the completion of `T-10 (Special Abilities)` and the promotion of `docs/game-design/ABILITY_CATALOG.md` to **Confirmed v2.0**, the Owner requested an interactive **One-Lane Playtest Sandbox (`Phaser + React` at `/playtest`)** to experience all 12 Defenders, 7 Fusion Recipes, 12 Special Abilities, and 4 Enemy types in real time across wave spawns, and to tune base entity/wave numbers empirically before locking production balance in `docs/game-design/GAME_BALANCING.md` and `ENTITY_CATALOG.md`.

### Core Goals
1. **Isolated Playtest Route (`/playtest`):** Provide a rich Phaser + React playtest environment at `apps/web/app/playtest/page.tsx` while keeping `/` (`HomePage` + `PhaserHost` + `HelloScene`) 100% untouched so existing `T-02` Playwright E2E and production tests (`pnpm --filter @mfd/web test:e2e`, `test:production`) continue to pass without regression.
2. **Authentic `BattleRuntime` Execution (`T-04`–`T-10`):** Drive all movement, combat, targeting, Energy/Power Crystal items, Fusion, Wave spawning, and all 12 G09 Special Abilities directly through the verified deterministic `BattleRuntime` engine — zero fake or duplicate gameplay rules in the UI layer.
3. **1-Lane Focus (`Row 0`, 9 Columns) + Neighbor-Lane Toggle:** Default to a prominent single horizontal lane (`Row 0`, Columns `0..8`) where Enemy waves enter from the right (`x = 9 → 0`), with an optional toggle to reveal adjacent lanes (`3×3` / `5×9`) when testing cross-lane abilities (`Absolute Zero` 5 lanes, `Meteor Arrow Rain` 3×3, `Alpha Howl` 3×3 ally buff, `Iron Bastion` 3×3 ally redirect).
4. **Dual Placement & Fusion Workflow (Owner Confirmed Choice #3):**
   - **Normal Flow:** Summon Base Defenders (Tier-1) using Energy and drag-and-drop Source onto Target to fuse into Tier-2 Fusion Defenders (`T-08`).
   - **Fast Sandbox Flow:** Directly place any of the 5 Base Defenders or 7 Tier-2 Fusion Defenders onto any cell for immediate ability testing.
5. **Authentic Power Crystal Ability Activation:** Support both **dragging a Power Crystal onto a Defender** on the Phaser canvas (confirmed G09 UX) and clicking an instant **"Cast Ability"** action on a selected Defender, plus quick sandbox buttons (`+500 Energy`, `+5 Power Crystals`, `Reset Cooldowns/Clear Lane`).
6. **Live Balance Tuning & JSON Export:** Allow the Owner to edit Defender & Enemy stats (`maxHp`, `damage`, `attackSpeed`, `attackRange`, `moveSpeed`, `armor`, `fireResistancePct`, `freezeResistancePct`, `freezeImmune`) and Wave spawn parameters live in the browser, apply them immediately to the running/restarted playtest, and export/copy the tuned JSON preset.

---

## 2. Confirmed Technical Decisions (`D-69` – `D-75` = Option A)

### `D-69` — Route & Lifecycle Isolation (`/playtest` vs `/`) (**CONFIRMED: Option A**)
- **Option A (Confirmed — Matches Owner Choice #2):** Keep `apps/web/app/page.tsx`, `apps/web/components/game/phaser-host.tsx`, and `packages/game/src/scenes/hello-scene.ts` untouched. Add a new Next.js route `apps/web/app/playtest/page.tsx` hosting `apps/web/components/game/playtest-host.tsx`, which mounts `createPlaytestGame(host, options)` from `@mfd/game` using the exact `T-02` `lifecycle-adapter.ts` (`claimHost`, `attachCleanupAdapter`, `requestDestroy`) for leak-free mount/unmount.
- **Option B:** Replace `HelloScene` on `/` directly (would break existing `T-02` Playwright fixture and production tests).

### `D-70` — 1-Lane Battlefield Layout & Cross-Lane Testing Support (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Use `BattleRuntime`'s canonical 5×9 Grid under the hood with **Lane 0 (`row = 0`, 9 cells `col 0..8`)** as the active horizontal lane where wave Enemies spawn by default. Render Lane 0 large and centered in the Phaser canvas (`1280×720`), and provide a 1-click **"Show Auxiliary Lanes (3-Lane / 5-Lane)"** toggle that visually expands rows `1..4` (and optionally spawns test enemies on adjacent lanes) so 3×3 (`alpha_howl`, `iron_bastion`, `meteor_arrow_rain`) and 5-lane (`absolute_zero`) mechanics can also be verified visually.
- **Option B:** Hard-restrict the canvas to row 0 only, preventing 3×3 neighbor-row placement for `alpha_howl` / `iron_bastion`.

### `D-71` — Dual Defender Placement & Fusion UX (Owner Choice #3) (**CONFIRMED: Option A**)
- **Option A (Confirmed — Matches Owner Choice #3):** Support both placement modes seamlessly:
  1. **Standard Gameplay Mode (`Summon + Drag Fusion`):** Selecting a Base Defender enqueues `summon` (spending Energy); dragging one Tier-1 Defender onto another Tier-1 Defender on the Phaser canvas enqueues `fuse` (`T-08`), creating the Tier-2 output at the Target cell.
  2. **Sandbox Direct Placement Mode (`Free Place T1 & T2`):** A toggleable palette mode (enabled by default in Playtest) allowing the user to click any of the **12 Defenders (5 Base + 7 Fusion)** and place it directly onto an empty cell (via internal `add` command at 0 Energy cost) to test any Tier-2 ability immediately.
- **Option B:** Only allow Tier-1 summon + Fusion.

### `D-72` — Ability Activation & Canvas Input Actions (`input-systems` Alignment) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Abstract pointer/keyboard interactions into named playtest actions:
  - **Drag Power Crystal onto Defender:** Dragging the Crystal icon from the top Phaser bar (or React HUD) and dropping it onto a living Defender cell enqueues `{ type: 'activate-ability', defenderId }`.
  - **Quick Cast:** Clicking a placed Defender selects it in the inspector panel (showing live HP, Shield, Buffs, and its Confirmed v2.0 Ability description) with a **"Cast Special Ability (1 Crystal)"** button (and hotkey `Space` / `E`).
  - **Collectible Click:** Clicking spawned Energy or Power Crystal items on the Phaser canvas enqueues `{ type: 'collect', id }`.
  - **Remove Defender:** Right-clicking a Defender cell (or clicking with the Shovel/Remove tool) enqueues `{ type: 'remove', id }`.
- **Option B:** Trigger abilities only from an external HTML dropdown without canvas interaction.

### `D-73` — Wave Spawning & Simulation Playback Controls (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Provide two wave modes in the Playtest HUD:
  1. **Custom Wave Burst / Single Mob Spawner:** 1-click buttons to spawn `Zombie`, `Husk`, `Vindicator`, or `Pillager` individually or in a configurable wave batch (e.g., `"Spawn Wave: 5 Enemies, interval 1.5s"`) on the active lane.
  2. **5-Wave Grassland Sequence (`T-09`):** Run the full 5-Wave state machine (`spawning` → `active` → `between-waves` → `victory`/`defeat`) on Lane 0 (or all unlocked lanes).
  - Include simulation playback controls: **`Pause / Resume`**, **Speed multiplier (`0.5×`, `1×`, `2×`, `4×`)**, **`Step +1 Tick (50ms)`** (for frame-by-frame ability inspection!), and **`Reset Battlefield`**.
- **Option B:** Only run a fixed non-configurable loop.

### `D-74` — Visual Rendering in `PlaytestScene` (`phaser-core` & `game-ui-ux` Alignment) (**CONFIRMED: Option A**)
- **Option A (Confirmed):** Render clear, high-contrast procedural pixel/geometric visuals in `PlaytestScene` (`1280×720`, `Phaser.Scale.FIT`):
  - **Grid & Lane:** Crisp tile borders, column labels (`Col 0` Base → `Col 8` Front), base defense line at `x = 0`, enemy entry zone at `x = 9`.
  - **Units:** Distinct color-coded blocks + recognizable icons/labels for all 12 Defenders and 4 Enemies, live **HP bar** (green/amber/red), **Shield bar** (cyan for `glacial_fortress`, silver-gold for `iron_bastion`), and floating status pills (`SLOW`, `STUN`, `FREEZE`, `BURN`, `BUFF`).
  - **Abilities & Projectiles:**
    - `glacial_fortress`: translucent ice overlay on `(row, col + 1)`.
    - `iron_bastion`: 3×3 golden protection border + tether lines to protected allies.
    - `arrow_storm` / `piercing_barrage`: moving arrow projectiles along the lane.
    - `meteor_arrow_rain`: 3×3 red target box + falling flame projectiles.
    - Instant ability flashes (`blizzard`, `earthquake`, `inferno`, `absolute_zero`, `wildfire_rush`) and an on-screen **Combat & Ability Outcome Log** showing applied effects and structured rejection reasons (`no-target`, `insufficient-crystals`, `owner-disabled`, etc.).
- **Option B:** Minimal text-only rendering on canvas.

### `D-75` — Live Stat Tuning Panel & Authority Boundary Preservation (**CONFIRMED: Option A**)
- **Option A (Confirmed):**
  - Keep all playtest numbers in `packages/game/src/playtest/playtest-presets.ts` explicitly labeled:
    `// Test-only playtest presets for Owner balance evaluation. Not approved production defaults.`
  - Provide a collapsible **"Balance Tuning Inspector"** in the React sidebar where the Owner can adjust Defender (`maxHp`, `damage`, `attackSpeed`, `attackRange`, `armor`), Enemy (`maxHp`, `moveSpeed`, `damage`, `attackSpeed`, `armor`, `fireResistancePct`, `freezeResistancePct`, `freezeImmune`), and Ability parameters live, click **"Apply & Restart"** (or apply to newly spawned units), and click **"Copy Tuned JSON"** to share chosen numbers back in chat for promotion into `ENTITY_CATALOG.md` / `GAME_BALANCING.md`.
  - Do NOT modify `@mfd/game-data` fail-closed validators or existing `T-02`–`T-10` test suites.
- **Option B:** Hardcode stats in the scene with no UI editor.

---

## 3. Planned File Structure & Implementation Slices

| Slice | File(s) | Responsibility |
| --- | --- | --- |
| **T-10B.1** | `packages/game/src/playtest/playtest-presets.ts` | Default test-only 1-lane playtest dataset for all 12 Defenders, 4 Enemies (`zombie`, `husk`, `vindicator`, `pillager`), 7 Fusion Recipes, Confirmed v2.0 12 Special Abilities, and 5 sample 1-lane Waves + deep-clone/validation helpers |
| **T-10B.2** | `packages/game/src/playtest/playtest-controller.ts` | Headless-to-UI bridge wrapping `BattleRuntime` (`ticksPerSecond = 20`), driving tick accumulation, exposing named playtest actions (`placeDefender`, `summonDefender`, `fuseDefenders`, `activateAbility`, `removeDefender`, `spawnEnemy`, `collectItem`, `grantResources`, `setPaused`, `setSpeed`, `stepTick`, `reset`), and emitting event-driven HUD/scene snapshots |
| **T-10B.3** | `packages/game/src/scenes/playtest-scene.ts` & `packages/game/src/create-playtest-game.ts` & `packages/game/src/index.ts` | Phaser 3.90 `PlaytestScene` (`1280×720`) rendering the 1-lane (and toggleable 3/5-lane) grid, units, HP/Shield bars, status badges, slow zones, redirect auras, projectiles, drag-and-drop Fusion, drag-and-drop Power Crystal, and `createPlaytestGame()` using `lifecycle-adapter.ts` |
| **T-10B.4** | `apps/web/components/game/playtest-host.tsx` & `apps/web/app/playtest/page.tsx` | React Client Host for `/playtest`: top resource/wave bar, 12-Defender palette (Base + Fusion, Summon vs Free Place toggle), Selected Unit & Ability card, Wave Spawner controls, Playback controls (`Pause`, `0.5×–4×`, `Step +1 Tick`), Live Balance Tuning editor + JSON export |
| **T-10B.5** | `packages/game/tests/playtest-controller.test.ts` | Focused unit tests verifying `PlaytestController` actions (1-lane wave progression, direct T1/T2 placement, drag-fusion dispatch, ability activation, live stat re-application, and cleanup) + full workspace verification (`test`, `typecheck`, `build`) |

---

## 4. Verification Criteria

1. `pnpm --filter @mfd/game test` — All existing 148 tests + new `playtest-controller.test.ts` tests **PASS**.
2. `pnpm --filter @mfd/game-data test` — 25/25 **PASS** (`@mfd/game-data` untouched).
3. `pnpm typecheck` — 3/3 packages (`@mfd/game`, `@mfd/game-data`, `@mfd/web`) **PASS**.
4. `pnpm build` — Next.js production build succeeds with both `/` and `/playtest` routes compiled cleanly.
5. Interactive check at `http://localhost:3000/playtest`: Owner can spawn Enemy waves along the 1 horizontal lane, place/fuse all 12 Defenders, trigger all 12 Special Abilities, inspect visual feedback, and tune stats live.
