# Minecraft Fusion Defense — Skills Usage Guide

**Scope:** Agent-facing guide for skills in `.agents/skills/`. This README routes skill usage and does not create gameplay decisions. Three `minecraft-*` Project Skills are maintained for this project; all other skills are general-purpose and remain unchanged.

## 1. Authority and conflict resolution

Before using any skill, read the current task, `AGENTS.md`, `docs/DOCUMENTATION_POLICY.md`, and the applicable approved design/technical contracts.

Use the following precedence **for implementation decisions**:

1. **Explicit current Owner-approved task scope and decisions** (including a plan that accurately records them); a plan does not authorize inventing new rules or overriding an unrelated confirmed Owner decision.
2. **Current authoritative repository documentation under `docs/`**, including newer explicit Owner decisions, approved catalogs, and relevant technical contracts. Follow the documentation policy to resolve authority and supersession; a newer timestamp alone is not proof of approval.
3. **Skill instructions and reference examples**, as technical guidance only where compatible with items 1–2.
4. **Existing code/tests**, as evidence of current implementation, not automatic authority over gameplay rules.
5. General engine/genre conventions and examples are illustrative, not approved game behavior.

If a skill contradicts a confirmed decision or the current approved implementation plan, **follow the approved decision/plan within its scope** and record the discrepancy in the agent's chat report. **Do not edit the skill** or silently rewrite project rules. If two confirmed Owner decisions genuinely conflict, or the plan itself contradicts an authoritative approved rule, stop only the affected implementation and ask the Owner; do not automatically treat every plan as superior to every document.

Draft, Proposed, Prototype, TBD and example values never become approved defaults by appearing in a skill. Do not use archival Notion pages as an independent current source of truth.

## 2. Installed skill catalog and routing

The repository currently contains **18 skill directories**:

| Skill | Use when relevant |
|---|---|
| `minecraft-gameplay-rules` | Cross-system gameplay constraints; check against current catalogs and Owner decisions |
| `minecraft-fusion-system` | Fusion input validation, recipes, placement and atomic mutations |
| `minecraft-gameplay-testing` | Vitest/Playwright gameplay tests, deterministic and regression coverage |
| `phaser-core` | Phaser scenes, lifecycle, rendering and engine integration |
| `phaser-arcade-physics` | Arcade bodies/collisions **only when approved gameplay needs this physics system** |
| `tower-defense` | General genre architecture; do not import generic tower/targeting/upgrade rules |
| `performance-optimization` | Profiling and measurement; never replace approved event budgets with generic FPS heuristics |
| `save-systems` | Serialization/persistence patterns, subordinate to G02–G05 checkpoint/recovery contracts |
| `prototype-fast` | Explicitly authorized prototype/spike work, not default production task workflow |
| `game-ai` | Enemy AI and movement when in scope; do not invent pathfinding or Enemy behaviors |
| `input-systems` | Approved battlefield input and command validation |
| `level-design` | Level/wave layout when authorized; no new levels/waves by default |
| `game-ui-ux` | UI/HUD interaction and accessibility within the approved product scope |
| `game-feel` | Presentation feedback after gameplay behavior is approved |
| `audio-design` | Audio implementation only when requested; audio is not a mandatory MVP blocker |
| `create-game-assets` | Authorized art/asset production, technical fit and provenance |
| `procedural-gen` | Seeded randomness/generation when approved; not permission for procedural levels |
| `shader-programming` | Approved shader/effect tasks, not default core-simulation work |

**Skills are task-specific.** Do not apply all 18 indiscriminately. Read the relevant `SKILL.md` and any referenced material needed for the task. Do not invent or install missing skills without authorization.

## 3. Historical conflicts now addressed in maintained Project Skills

The three maintained Project Skills have been aligned with the repository-approved MVP as of this update. The following are **historical compatibility notes**; recheck current authoritative sources if future decisions change:

- Earlier versions of `minecraft-gameplay-rules/SKILL.md` and this README said the Ability resource name was unresolved or suggested `Ability Resource`. The current approved resource name is **Power Crystal**; follow current `docs/product/GAMEPLAY_MECHANICS.md` and G09 contracts.
- Earlier versions of `minecraft-fusion-system/SKILL.md` presented **six historical GDD recipes**, including Zombie Golem and Frost Creeper. Do **not** treat that table as the current approved MVP recipe registry. Consult `docs/game-design/FUSION_RECIPES.md`, `docs/game-design/ENTITY_CATALOG.md`, `docs/decisions/PGD-01-STEEL-GUARDIAN.md` and relevant Owner decisions.
- Earlier versions of `minecraft-gameplay-testing/SKILL.md` likewise referenced tests for six historical recipes. Generate test expectations from **approved current data**, not the historical examples.
- Generic `tower-defense`, `game-ai`, `phaser-arcade-physics`, `level-design`, and `prototype-fast` examples must not add targeting priorities, tower upgrades, Enemy behavior, physics, levels, balance values or branching workflows without task authorization.
- Generic `phaser-core` and performance examples using frame delta or 60 FPS are **not** authorization to tie gameplay time to render frames or set a fixed tick rate.
- Generic `save-systems` autosave/checkpoint examples must not override G02–G05 timing, storage, snapshot, or recovery requirements.

When source provenance is still pending, implement only sufficiently specified and testable approved portions; do not claim overall Design Complete or Implementation Verified without evidence.

## 4. T-04 Core Simulation skill selection

For `docs/development/T-04-CORE-SIMULATION-IMPLEMENTATION-PLAN.md`:

**Read/apply as relevant:** `minecraft-gameplay-testing`, `phaser-core`, `performance-optimization`, and `minecraft-gameplay-rules` for cross-system invariants. `save-systems` may inform snapshot interfaces, but **full checkpoint storage/recovery is outside T-04**. `tower-defense` is optional architecture background; it must not introduce gameplay.

**Approved T-04 specifics:**

- Configurable tick rate and fixed simulation timestep; rendering is independent, catch-up bounded.
- Unified Event Queue ordered by original Scheduled Tick + Insertion Sequence, with deferred FIFO.
- Maximum **250 executed events per tick**, **4,096 queued events**, causal depth **32**.
- Atomic speculative transactions, no partial commits; defer transactions that cannot fit remaining tick budget; transactions requiring more than 250 executed events fail-stop and signal Recovery.
- Transactional state, RNG, IDs, and sequence allocation; deterministic regression tests.
- Do not implement full G03–G05 recovery, Defender gameplay, Fusion, abilities, new balance or UI as part of T-04.

**Execution workflow for T-04:** Work on the **local `main` working tree** only. Do not create/switch branches, merge the earlier experimental `feature/t-04-core-simulation` branch, commit or push unless separately authorized. Preserve local changes and report tests and blockers in chat. Do not create GitHub audit reports.

## 5. Skill maintenance policy

- The Owner authorizes maintenance of exactly three project-specific skill files: `minecraft-gameplay-rules/SKILL.md`, `minecraft-fusion-system/SKILL.md`, and `minecraft-gameplay-testing/SKILL.md`, to align with approved current design.
- **Do not modify the other 15 general-purpose skills**, including their `SKILL.md`, reference files or scripts. These are reusable external/general skills; apply current approved project rules instead of rewriting them.
- Changes to the three Project Skills must be source-grounded and must not promote Draft/Proposed/TBD concepts to approved rules.
- This README may document skill selection, precedence, and compatibility warnings. It must not silently change game rules.
- Do not copy skill files into new paths or add unrelated assets/dependencies.
- When a skill appears stale, identify its exact statement and the current approved source. If a material conflict remains unresolved, ask the Owner.
