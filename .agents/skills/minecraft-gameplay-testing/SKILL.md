---
name: minecraft-gameplay-testing
description: Create, run, and maintain automated tests for Minecraft Fusion Defense gameplay. Use for Vitest unit/integration tests and Playwright end-to-end tests covering Grid placement, Energy, Enemy behavior, targeting, combat, Fusion, abilities, Waves, Victory, Defeat, and drag-and-drop.
---

# Minecraft Fusion Defense — Gameplay Testing

## Mission

Verify gameplay rules as observable, repeatable behavior. Tests must encode approved design decisions—not assumptions imported from other Tower Defense games. Prefer fast domain tests for logic and a smaller number of Playwright tests for complete player flows.

Before writing tests, apply `minecraft-gameplay-rules` and, for Fusion-specific work, `minecraft-fusion-system`.

## Test stack and architecture constraints

- Unit/integration test framework: Vitest.
- Browser end-to-end framework: Playwright.
- Language: TypeScript.
- Game simulation/rendering: Phaser 3.
- UI/HUD/screens: React.
- Keep core gameplay rules testable without booting Phaser or a browser wherever practical.
- Do not test per-frame Entity position by forcing React to own game simulation state.
- Follow the repository's existing scripts, fixtures, test naming, and folder conventions; inspect `package.json` before assuming commands.

## Test design principles

1. **Rule traceability**: every gameplay assertion must map to current approved repository catalogs/contracts, confirmed Owner decisions or documented bug fixes; historical GDD examples alone do not approve behavior.
2. **No invented expected values**: do not assert guessed HP, damage, costs, cooldowns, spawn intervals, or targeting priorities.
3. **Determinism**: inject seeded/random sources, clocks, and schedulers where possible. Tests for random Energy Item positions should verify allowed behavior and invariants, not a particular random coordinate.
4. **State over pixels**: unit tests should assert domain state; Playwright should assert player-visible outcomes and critical interactions.
5. **Boundary coverage**: include invalid actions, stale entities, terminal states, insufficient resources, and duplicate events.
6. **Small focused tests**: isolate one rule per test and use descriptive names.
7. **No hidden test-only behavior**: test seams must not change production gameplay semantics.

## Confirmed behavior to encode

### Battlefield and Grid

- Grid is 5 rows × 9 columns (45 cells).
- Defender placement is Grid-based.
- Each Enemy belongs to a Lane.
- Enemy enters from the right and moves toward the left/base.
- A cell should not be double-occupied unless an approved rule explicitly permits it.

### Enemy-Defender interaction

- Behavior is Enemy-type-dependent.
- Some Enemy types attack Defender; some ignore Defender.
- Do not write a blanket assertion that all Enemy stop to attack or all Enemy pass through.
- Test only named Enemy behavior assignments that are present in an approved catalog or explicitly confirmed. If no assignment exists, test the generic behavior dispatch using test fixtures without claiming a real roster mapping.

### Energy Items

- Energy Items spawn randomly at battlefield positions and can be collected.
- Do not assert a fixed spawn cell or fixed lane.
- Use an injected random source for deterministic tests.
- Test invariants such as: spawn position is within the valid battlefield bounds; a collected item cannot be collected twice; collection updates Energy once; expired/removed items cannot be collected if lifetime behavior exists.
- Spawn interval, lifetime, amount, and collection radius remain unconfirmed unless specified in approved data. Do not create assertions for guessed values.

### Resources and Abilities

- Energy is used to summon Defender.
- **Power Crystal** is the approved separate resource for Special Abilities. Do not assert historical `Plant Food` / placeholder `Ability Resource` as current names.
- An Ability has its own resource cost when defined by approved data.
- Ability activation must not spend Energy unless an approved rule explicitly says so.
- Ability generation/reward rules and cooldown values must be sourced from approved data; do not assume GDD example sources are final decisions.

### Fusion

- Source is dragged onto Target.
- Successful Fusion creates the result at Target's original Grid cell.
- Both input Defender are removed on success.
- Invalid Fusion must not consume inputs or resources; valid Fusion also costs **0 Energy and 0 Power Crystal**.
- Test all **seven approved MVP recipes** in `docs/game-design/FUSION_RECIPES.md`, including Steel Guardian, Frost Guardian and Flame Fang.
- Confirm order-independent recipe matching (A+B and B+A), while Target determines output placement.
- Zombie is not an MVP Fusion input; Creeper is outside the repository-approved MVP roster. Do not assert historical Zombie Golem/Frost Creeper as approved.

### Waves and terminal states

- MVP has one Grassland Level and five Waves.
- Victory requires all Waves complete and no active Enemy remaining that can threaten the base.
- Any Enemy entering the base after passing the defense line causes immediate Defeat.
- MVP does not use Base Health or multiple allowed leaks.
- Terminal states should stop further combat/state progression according to the implemented terminal-state policy.

## Suggested test matrix

| Area | Vitest coverage | Playwright coverage |
|---|---|---|
| Grid | bounds, cell lookup, occupancy, invalid placement | place a Defender on a valid cell; reject invalid placement |
| Energy | summon cost, insufficient Energy, item collection exactly once | collect Energy Item; summon Defender |
| Enemy behavior | attack-vs-ignore behavior dispatch from data | observe a representative configured Enemy interaction |
| Targeting | per-Defender target selection from approved rules | verify a representative Defender attacks its selected target |
| Combat | damage, attack cadence, defeat/death transitions | combat progresses and Enemy can be defeated |
| Fusion | recipes, validation, atomic mutation, Target-cell placement | drag Source onto Target and observe Fusion result |
| Ability | resource validation, cost, effect dispatch, cooldown if configured | activate an Ability using the approved UI control |
| Waves | spawn schedule, completion condition, next-Wave transition | complete a Wave and observe progression |
| Victory/Defeat | all-Waves/no-threat Victory; immediate base-entry Defeat | show Victory and Defeat screens in separate scenarios |
| Game state | legal transitions; no updates after terminal state | pause/resume and terminal screen behavior if implemented |

Do not force all of these tests into a single E2E scenario. Use focused scenarios and test fixtures.

## High-value detailed cases

### Grid and placement

- First and last valid cells are accepted.
- Out-of-range row/column is rejected.
- Occupied-cell placement is rejected or handled exactly as the approved placement rule states.
- A failed placement leaves the original selection and Grid unchanged as appropriate to the UX contract.

### Energy and collection

- Summoning deducts the configured Energy cost exactly once.
- Insufficient Energy does not create a Defender or alter Grid occupancy.
- Energy Item collection increments Energy exactly once.
- Collecting the same item repeatedly does not duplicate reward.
- Random spawn results remain within valid battlefield bounds.

### Enemy interaction and targeting

- Each configured Enemy interaction policy dispatches correctly.
- An Enemy configured to attack Defender attacks according to its data-defined behavior.
- An Enemy configured to ignore Defender continues its approved movement behavior.
- Targeting tests must use approved target priority definitions. If target priority is missing, do not create a test that canonizes nearest/first/strongest/random targeting.

### Fusion

- All seven approved MVP recipe pairs resolve in either input order; output starts at full own Max HP, inherits no statuses and may attack immediately if a valid target exists.
- Target-cell placement is asserted with Source and Target in different cells.
- Invalid pair, insufficient configured cost, stale entity, same instance, and competing requests do not partially mutate state.
- Resource balances and entity counts are asserted before and after each attempt.

### Abilities

- Insufficient Power Crystal blocks activation when the approved cost requires it.
- Successful activation consumes the approved Power Crystal amount according to the current transaction contract; do not infer unresolved timing.
- Ability effect is applied to the intended scope from approved Ability data.
- Ability activation does not consume Energy by accident.
- Do not assert cooldown duration until it is configured.

### Waves and game result

- Wave completion must not trigger while a relevant active Enemy remains.
- Victory occurs only after the final Wave is complete and no active Enemy threatens the base.
- A base-entry event causes immediate Defeat in the MVP.
- After Victory/Defeat, no new combat actions, spawns, or resource mutations should proceed unless an approved post-game flow allows them.

## Playwright guidance

- Use accessible roles, labels, and stable test IDs; avoid brittle selectors tied to CSS layout.
- Test the real drag-and-drop interaction using the same input path as a player.
- Avoid relying on animation timing; wait for observable state or stable UI conditions.
- Use deterministic fixtures/seeds or test scenarios where available.
- Capture console errors and page errors for critical gameplay flows.
- Keep screenshots/traces for diagnosing failures, but do not make visual snapshots the only correctness signal for gameplay rules.

## Test workflow

1. Inspect `package.json`, Vitest config, Playwright config, existing test folders, and game bootstrap.
2. Read relevant design docs and identify the exact approved rule.
3. Build a traceability note: rule → source → test case.
4. Add pure unit tests first, then integration tests, then only necessary E2E tests.
5. Use fixtures/builders that make entity type, instance ID, lane, Grid cell, resources, and game state explicit.
6. Inject randomness/time rather than waiting for real time or relying on uncontrolled randomness.
7. Run the narrow test file, then the related suite, then typecheck/lint/build as appropriate.
8. Report exact commands and results. Never claim tests passed if they were not run.
9. List unresolved design questions separately from test failures.

## Reporting template

For each test task, report:

- **Rules covered:** concise list and source document/section.
- **Tests added/changed:** filenames and behaviors.
- **Commands run:** exact commands.
- **Result:** passed/failed/skipped, with failure summary.
- **Unresolved decisions:** any missing targeting, cost, timing, or behavior data that prevented a definitive assertion.

## Do not

- Turn assumptions into expected values.
- Use randomness without a controllable seam in deterministic tests.
- Assert that every Enemy attacks or ignores Defender.
- Assert an unapproved targeting priority.
- Reintroduce historical Plant Food / Ability Resource as the current Power Crystal resource name.
- Add Base Health or multi-leak tests to the MVP.
- Treat a successful animation as proof that domain state is correct.
- Claim full coverage based only on a passing happy-path E2E test.
