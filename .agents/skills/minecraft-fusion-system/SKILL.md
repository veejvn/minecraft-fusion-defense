---
name: minecraft-fusion-system
description: Design, implement, debug, or test the Minecraft Fusion Defense Fusion System, including drag-and-drop Source/Target semantics, recipe lookup, validation, resource costs, Grid mutation, result placement, tiers, data definitions, and Fusion feedback.
---

# Minecraft Fusion Defense — Fusion System

## Mission

Implement Fusion as a deterministic, data-driven gameplay system. Preserve the approved recipe and placement rules. Keep input handling, rule validation, state mutation, presentation, and UI feedback separated.

Before coding, also apply the `minecraft-gameplay-rules` Project Skill. That skill is authoritative for cross-system gameplay constraints and unresolved decisions.

## Confirmed Fusion model

### Interaction vocabulary

- **Source**: the Defender the player picks up and drags.
- **Target**: the Defender onto which the Source is dropped.
- A Fusion attempt is `tryFusion(source, target)` (or the repository's equivalent naming).
- The result always occupies the Target's original Grid cell.
- Source position must not determine the result position.

### Successful Fusion sequence

1. Receive Source and Target identities from the input layer.
2. Confirm both entities still exist and are valid Grid occupants.
3. Resolve a recipe for the pair according to the approved recipe data.
4. Validate approved recipe, Tier, unlock, entity state and Grid requirements. Fusion costs **0 Energy and 0 Power Crystal**.
5. If every validation succeeds, remove both input Defender from their original Grid cells/entities.
6. Create exactly one Fusion Defender at the Target's original Grid coordinate.
7. Update authoritative gameplay state atomically so no intermediate duplicate/empty state leaks to other systems.
8. Emit a domain event or presentation command for Fusion feedback/animation.
9. Return a structured success result.

### Invalid Fusion behavior

- Do not remove, damage, move, consume, or replace either input Defender.
- Do not deduct resources.
- Do not leave a Grid cell reserved or partially mutated.
- Return a structured failure reason suitable for UI feedback and tests.
- Invalid drop feedback must be clear but must not alter authoritative gameplay state.

## Current approved MVP recipes

Consult `docs/game-design/FUSION_RECIPES.md` for stable IDs, unlocks and superseding decisions. Seven Tier-1 + Tier-1 -> Tier-2 recipes are currently approved:

| Input A | Input B | Result |
|---|---|---|
| Skeleton | Skeleton | Skeleton Sniper |
| Iron Golem | Iron Golem | Steel Guardian |
| Snow Golem | Snow Golem | Ice Golem |
| Iron Golem | Snow Golem | Frost Guardian |
| Blaze | Wolf | Flame Fang |
| Blaze | Skeleton | Inferno Archer |
| Wolf | Wolf | Alpha Wolf |

Historical GDD Zombie Golem and Frost Creeper recipes are **not** approved MVP recipes. Zombie is an Enemy; Creeper is outside the repository-approved MVP roster. Do not promote later experimental Fusion concepts into MVP without explicit scope approval.

## Recipe direction and pair matching

- Same-type recipes use two instances of the same type.
- Cross-type recipes must follow the approved recipe definition.
- Confirmed MVP recipe matching is order-independent. Drag direction still determines which instance is Target and therefore the output cell.
- Never match recipes using display names if stable IDs are available.
- Prevent accidental duplicate recipes and ambiguous pair resolution at data-validation time.

## Data-driven recipe contract

Inspect the existing repository types before introducing new ones. A conceptual recipe record may include:

- stable recipe ID;
- input Defender IDs;
- output Fusion Defender ID;
- Fusion Tier;
- no Fusion Energy/Power Crystal cost in the approved MVP;
- optional directional/symmetric matching policy if required by design;
- optional unlock/availability metadata only if in approved scope.

Use Zod (if already established in the project) to validate recipe data at load/build boundaries. Keep balance values and recipe definitions out of the core Fusion algorithm.

## Recommended system boundaries

Keep responsibilities distinct; adapt names to existing architecture:

- **Input / Drag Controller**: identifies Source and drop Target; does not decide recipe validity.
- **Recipe Registry**: indexes validated recipe data by stable IDs.
- **Fusion Validator**: checks entity state, pair compatibility, and approved costs/requirements; should be pure where practical.
- **Fusion Service / System**: performs an atomic state transition and emits a result/event.
- **Grid / Entity Store**: owns occupancy and entity identity; enforce one occupant per cell unless the existing design explicitly allows otherwise.
- **Presentation Adapter**: plays animation, particles, sound, and UI feedback after the state result; visuals must not own gameplay truth.

Do not place Fusion rules in React components, Phaser pointer callbacks, sprite classes, or animation completion handlers.

## API shape (illustrative, adapt to repository)

Prefer a typed result rather than booleans or thrown errors for expected invalid attempts:

```ts
type FusionFailureReason =
  | 'same-entity'
  | 'source-not-found'
  | 'target-not-found'
  | 'source-not-on-grid'
  | 'target-not-on-grid'
  | 'no-recipe'
  | 'invalid-entity-state';

type FusionResult =
  | {
      ok: true;
      recipeId: string;
      resultEntityId: string;
      targetCell: GridCell;
    }
  | {
      ok: false;
      reason: FusionFailureReason;
    };
```

This is a design suggestion, not a mandate to duplicate an existing project API. Reuse established domain result conventions if present.

## Atomicity and identity rules

- Validate all preconditions before mutating the Grid; Fusion never changes Energy or Power Crystal.
- Apply Grid/entity replacement atomically, without Fusion resource deduction.
- Ensure Source and Target are distinct entity instances, even for same-type Fusion.
- Use stable entity IDs; do not confuse a Defender type ID with an instance ID.
- Preserve the Target cell captured at the start of a valid attempt. Do not read a potentially changed sprite position after animation begins.
- Prevent two simultaneous Fusion attempts from consuming the same entity instances.
- Keep rendering objects and domain entities distinct if that is the established architecture.

## Fusion tiers

- The Fusion engine has no fixed Tier ceiling. The current MVP approves only seven Tier-1 + Tier-1 -> Tier-2 recipes.
- Each output's tier must come from approved catalog/recipe data.
- Do not infer that every Fusion result can itself be fused, or invent Tier 3 recipes.
- Fusion output begins at **100% of its own Max HP**, inherits no positive/negative statuses, may attack immediately if a valid target exists, and never adds input stats. Other unapproved combat/Ability values remain TBD.

## Required tests

At minimum, cover:

1. Each approved initial recipe resolves correctly.
2. Same-type recipe succeeds for two distinct instances.
3. Cross-type recipe succeeds for the approved pair.
4. Reversed drag direction follows the approved symmetric/directional policy.
5. Result occupies the Target's original cell when Source and Target are in different cells.
6. Source's original cell becomes available after success.
7. Both inputs are removed exactly once.
8. Missing recipe leaves both inputs and resources unchanged.
9. Valid Fusion succeeds with zero Energy and zero Power Crystal and never deducts either resource.
10. Source equals Target is rejected.
11. Missing, stale, dead, or otherwise invalid entities are rejected safely.
12. Two competing attempts cannot fuse the same entity twice.
13. Invalid drop UI feedback does not mutate game state.
14. Recipe data validation catches duplicate or malformed definitions.

Use Vitest for unit/domain tests. Use Playwright for the user-visible drag/drop flow where the application is runnable. Keep most Fusion rule tests independent of Phaser rendering.

## Implementation workflow

1. Read `docs/DOCUMENTATION_POLICY.md`, `docs/game-design/FUSION_RECIPES.md`, `docs/game-design/ENTITY_CATALOG.md`, `docs/product/GAMEPLAY_MECHANICS.md` and relevant Owner decisions. `GDD.md` is historical context.
2. Inspect current recipe schemas, Grid ownership, Entity lifecycle, drag/drop implementation, and test conventions.
3. Follow the approved seven recipes, order-independent matching and free Fusion rules; report only genuinely unresolved conflicts.
4. Define or update typed recipe data and validation.
5. Implement pure matching/validation first.
6. Implement atomic state mutation and target-cell placement.
7. Connect drag/drop and presentation feedback without moving rules into UI code.
8. Add unit and end-to-end tests.
9. Run focused tests, typecheck, lint, and relevant build checks.
10. Summarize changed behavior, tests, and unresolved design decisions.

## Do not

- Change the result placement from Target cell to Source cell or a free/nearest cell.
- Consume one or both inputs on an invalid Fusion attempt.
- Deduct Energy or Power Crystal for Fusion, even when validation succeeds.
- Invent Fusion recipes, output stats, Energy costs, unlock rules, or tier progression.
- Treat animation completion as the authority for committing Fusion.
- Couple domain logic to Phaser sprites or React component state.
- Reintroduce historical Zombie Golem/Frost Creeper as approved MVP recipes.
