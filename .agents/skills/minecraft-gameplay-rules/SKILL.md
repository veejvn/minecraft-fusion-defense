---
name: minecraft-gameplay-rules
description: Apply and protect the confirmed gameplay rules for Minecraft Fusion Defense. Use when implementing, reviewing, refactoring, balancing, or discussing resources, Defender and Enemy behavior, battlefield rules, waves, combat, abilities, victory, or defeat. Prevents agents from inventing or silently changing game rules.
---

# Minecraft Fusion Defense — Gameplay Rules

## Purpose

Act as the project-level authority for gameplay behavior. Before changing gameplay code or design data, identify the relevant rules below, inspect the current project documents and implementation, and preserve confirmed decisions. Do not treat an unspecified value as permission to invent a permanent rule.

## Source-of-truth order

Use this order when sources disagree:

1. Explicit gameplay decisions confirmed by the project owner in conversation.
2. Current project design documents that are not contradicted by a confirmed decision, especially `GDD.md` and the relevant detailed design document.
3. Existing implementation and tests, as evidence of current behavior—not automatic proof that the behavior is intended.
4. Your own assumptions or common Tower Defense conventions, which are never authoritative.

If two authoritative sources conflict, stop before making a consequential design choice. Explain the conflict, identify its impact, and ask for a decision. Do not silently reconcile it.

## Confirmed project context

- Project: Minecraft Fusion Defense (project workspace may refer to it as Minecraft Fusion Defender).
- Genre: 2D side-view Tower Defense / Strategy; single-player; Desktop Web; 16:9; pixel-art direction.
- Battlefield: 5 rows × 9 columns, 45 Grid cells.
- Defender placement is Grid-based.
- Enemy spawn on the right and move from right to left. Each Enemy belongs to a Lane.
- Initial Defender roster in the GDD: Snow Golem, Iron Golem, Skeleton, Wolf, Blaze.
- Initial Enemy roster in the GDD: Zombie, Husk, Spider, Pillager.
- MVP target: one Grassland Level, five Waves, Fusion Tier 1 and Tier 2, six initial Fusion recipes, Energy, combat, drag-and-drop, HUD, Victory and Defeat.
- The game uses two distinct gameplay resources: Energy for summoning Defender and a separate resource for activating Defender Abilities.

## Confirmed gameplay decisions

### Enemy and Defender interaction

When an Enemy encounters a Defender, behavior depends on that Enemy type:

- Some Enemy types attack the Defender.
- Some Enemy types ignore the Defender.
- Do not make all Enemy types automatically stop and attack, nor make all of them automatically ignore Defender.
- Implement the distinction as explicit, data-driven Enemy behavior (for example, an enum or behavior field) once the project's existing schema conventions have been inspected.
- Do not assign a specific attack/ignore behavior to a named Enemy unless that assignment is present in an approved catalog or explicitly confirmed by the project owner.

### Energy Items

- Energy Items appear randomly at positions on the battlefield.
- The player can collect them.
- Do not move Energy Items to a fixed lane, fixed spawn point, enemy-drop-only source, or predetermined schedule unless separately approved.
- The exact random distribution, spawn interval, lifetime, collection radius, and Energy value are not confirmed by this decision. Treat them as configurable/open values, not facts.

### Defender target selection

- Defender target selection follows the project's confirmed per-Defender targeting rules when those rules are available in the current project documents or conversation context.
- Do not replace those rules with a universal nearest-enemy, first-in-lane, highest-HP, or random-target policy.
- If the exact priority rule for a Defender is not available, mark it unresolved and ask for the missing rule before implementing behavior that depends on it.

### Fusion placement

- Source is the Defender being dragged.
- Target is the Defender the Source is dropped onto.
- On successful Fusion, the resulting Fusion Defender occupies the Target Defender's original Grid cell, regardless of the Source's original position.
- Both input Defender are removed from the Grid after a successful Fusion.
- Invalid Fusion must not consume either input or silently mutate the Grid.

### Victory and Defeat

The GDD specifies:

- Victory: all Waves are complete and no active Enemy remains that can threaten the base.
- Defeat: if any Enemy passes the defense line and enters the base, the match immediately transitions to Defeat.
- MVP does not use Base Health or multiple allowed leaks.
- On terminal Victory/Defeat, stop ongoing combat according to the game's terminal-state flow.

If a detailed gameplay document later explicitly revises these conditions, surface the change and its source before implementation.

## Resource naming and semantics

- `Energy` is the summoning resource.
- The ability-activation resource is separate from Energy.
- The current GDD uses `Plant Food`, but the project owner has requested a different in-game name and has not yet confirmed the replacement.
- Until a replacement is approved, use a neutral internal term such as `AbilityResource` / `Ability Resource` in new code, schemas, and technical prose where practical. Do not present `Plant Food` as the final in-game name in player-facing UI, asset text, or marketing copy.
- Keep the current GDD terminology when quoting or referring to the document itself; do not rewrite the GDD's historical wording without an explicit documentation task.
- Each Ability may have its own Ability Resource cost. Ability Resource remains independent of Energy.

## Technical and architectural constraints

- Stack in GDD: Next.js, React, Tailwind CSS, shadcn/ui, Phaser 3, TypeScript, pnpm, Turborepo, Zod, Vitest, Playwright, Tiled, Aseprite.
- Phaser owns gameplay simulation and rendering.
- React owns menus, HUD, and surrounding UI.
- Do not use React state updates to drive per-frame Entity positions.
- Prefer data-driven Entity, Fusion Recipe, Ability, and Level definitions.
- Separate systems by responsibility and keep core gameplay logic testable without rendering where possible.
- MVP has no backend requirement.
- Follow the actual installed Phaser version in the repository. Do not migrate Phaser major versions as part of an unrelated task.

## Open decisions — never invent these

The GDD marks the following as unresolved or not fully specified:

- Exact Energy generation rate, Energy Item values, spawn interval/distribution/lifetime, and Defender costs.
- Ability Resource generation and award rules.
- Fusion Energy costs, if any, per recipe.
- Defender and Enemy numerical stats and balance.
- Exact per-Defender target priorities where not documented.
- Ability cooldowns and exact ability tuning.
- Game speed controls.
- Level progression beyond the MVP Level.
- Exact per-Enemy assignment of attack-Defender versus ignore-Defender behavior, unless documented elsewhere.

The GDD contains an Open Design Decisions table that still labels some topics as unresolved even though later sections state Fusion placement and immediate Defeat behavior. The explicit rules in this skill preserve the project owner's confirmed decisions and the GDD's concrete gameplay sections; if another current approved document conflicts, report the conflict rather than silently choosing.

## Required workflow for gameplay changes

1. Identify the system and the exact rule being changed.
2. Read the relevant GDD section and any focused document (`GAMEPLAY_MECHANICS.md`, `ENTITY_CATALOG.md`, `FUSION_RECIPES.md`, `ABILITY_CATALOG.md`, `LEVEL_DESIGN.md`, `GAME_BALANCING.md`).
3. Separate confirmed rules, documented values, implementation details, and unresolved decisions.
4. If the task depends on an unresolved rule, ask one focused question or implement only the parts that do not depend on it.
5. Put tunable values in data/configuration rather than scattering literals.
6. Add or update tests for the rule and its boundary cases.
7. Report which rules were preserved, which files changed, tests run, and any remaining decisions.

## Hard prohibitions

- Do not import conventional Tower Defense defaults such as Gold, tower selling/upgrading, lives, or multiple leaks unless explicitly approved.
- Do not convert Energy and Ability Resource into one shared currency.
- Do not assume every Enemy attacks every Defender.
- Do not assume every Enemy ignores every Defender.
- Do not invent per-Enemy behavior or per-Defender targeting priorities.
- Do not change the Fusion result cell from the Target's original cell.
- Do not add Base Health or multiple leak tolerance to the MVP.
- Do not silently rename the ability resource to a guessed player-facing name.
- Do not expand MVP scope with multiplayer, accounts, cloud save, shop, gacha, leaderboard, multiple biomes, or advanced Enemy AI without approval.

## Completion checklist

- [ ] Confirmed rules were preserved.
- [ ] Unresolved rules were not guessed.
- [ ] Data and implementation agree.
- [ ] Tests cover normal and invalid/boundary cases.
- [ ] UI terminology does not present the pending resource name as final.
- [ ] Any source conflict or newly required design decision is reported.
