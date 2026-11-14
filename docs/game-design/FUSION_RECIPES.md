# Fusion Recipes

# Minecraft Fusion Defense

**Source file:** `docs/game-design/FUSION_RECIPES.md`  
**Status:** Draft v1.2 — core Fusion rules confirmed.

**Archival source:** [Fusion Recipes — Notion](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41)
**Confirmed decisions:** 02/11/2026  
**Status key:** Confirmed = approved core mechanics, seven recipes and Fusion output HP/status/readiness; Proposed = draft combat/ability concepts; TBD = pending animation/cooldown/UI and unapproved future recipes. Schema, event names and failure codes describe the draft implementation contract, not additional gameplay approvals.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Purpose and scope

Fusion combines two valid living Defender instances by dragging Source onto Target. Both inputs are consumed; Source cell is emptied and output occupies Target's original cell. Initial content is exactly seven approved recipes (four same-type, three cross-type).

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 7 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

## 2. Confirmed mechanics

- **Fusion costs 0 Energy** and **0 Power Crystal**. No Energy availability check, deduction or refund. Summoning the two inputs still costs Energy normally.
- **No distance limit or lane restriction.** Source and Target may occupy any two distinct valid cells in the 5 × 9 battlefield, including opposite corners and different lanes.
- **Order-independent matching:** A + B yields the same output as B + A. The output's position depends on which instance is Target.
- Source and Target must be distinct, alive, unlocked Defender instances matching an approved, enabled and unlocked Recipe's input IDs and Tiers; game state must be `PLAYING`. Initial seven recipes use Tier-1 inputs; this is not an engine-wide Tier ceiling. Initial Base Defenders: Iron Golem/Skeleton; initial Recipes: Skeleton Sniper/Steel Guardian — Confirmed.
- **Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.
- Fusion executes atomically; failed attempts do not delete units or change resources or grid occupancy.

## 3. MVP recipe catalog

| Recipe ID | Input A | Input B | Output ID | Output name | Energy cost |
| --- | --- | --- | --- | --- | --- |
| `fusion_skeleton_sniper` | `skeleton` | `skeleton` | `skeleton_sniper` | Skeleton Sniper | 0 |
| `fusion_steel_guardian` | `iron_golem` | `iron_golem` | `steel_guardian` | Steel Guardian | 0 |
| `fusion_ice_golem` | `snow_golem` | `snow_golem` | `ice_golem` | Ice Golem | 0 |
| `fusion_frost_guardian` | `iron_golem` | `snow_golem` | `frost_guardian` | Frost Guardian | 0 |
| `fusion_flame_fang` | `blaze` | `wolf` | `flame_fang` | Flame Fang | 0 |
| `fusion_inferno_archer` | `blaze` | `skeleton` | `inferno_archer` | Inferno Archer | 0 |
| `fusion_alpha_wolf` | `wolf` | `wolf` | `alpha_wolf` | Alpha Wolf | 0 |

Zombie Golem and Frost Creeper were replaced by Frost Guardian and Flame Fang because Zombie and Creeper are not among the five MVP Base Defenders.

### Confirmed unlock mapping — 03/11/2026


| Base Defender | Confirmed unlock rule |
| --- | --- |
| Iron Golem | Unlocked at the start |
| Skeleton | Unlocked at the start |
| Snow Golem | First Grassland Victory |
| Wolf | Cumulative 50 Enemy kills across battles ending in Victory; defeated battles add zero progress |
| Blaze | Cumulative 5 Grassland Victories |

### Recipe unlock mapping

| Recipe | Confirmed unlock rule |
| --- | --- |
| Skeleton + Skeleton → Skeleton Sniper | Unlocked at the start |
| Iron Golem + Iron Golem → Steel Guardian | Unlocked at the start; seventh MVP recipe and Tier-2 Fusion Defender |
| Snow Golem + Snow Golem → Ice Golem | Automatically when Snow Golem unlocks |
| Iron Golem + Snow Golem → Frost Guardian | Automatically when both Iron Golem and Snow Golem unlock |
| Wolf + Wolf → Alpha Wolf | Automatically when Wolf unlocks |
| Blaze + Skeleton → Inferno Archer | Automatically when both Blaze and Skeleton unlock |
| Blaze + Wolf → Flame Fang | Automatically when both Blaze and Wolf unlock |


**Steel Guardian — [PGD-01](../decisions/PGD-01-STEEL-GUARDIAN.md):** Recipe/Entity/Ability IDs, Crowd Control Guardian identity, Crushing Strike and Iron Bastion are Confirmed. Attack and Ability effects, HP/Damage/Attack Speed/Range/targeting, Power Crystal cost and cooldown applicability remain TBD.

## 4. Recipe identities and trade-offs

**Proposed:** combat identities, trade-offs, attack effects and Special Ability names below are design drafts. The recipe inputs and outputs remain Confirmed.

### Skeleton Sniper

Two Skeletons become a single long-range high-damage unit; trades two independent firing positions for concentrated ranged power. Special Ability: Piercing Barrage.

### Ice Golem

Two Snow Golems become stronger centralized ice control; trades coverage at two positions for a more powerful Slow/Freeze role. Special Ability: Absolute Zero.

### Frost Guardian

Iron Golem plus Snow Golem creates a frontline Tank/Control with Frozen Slam and Glacial Fortress; trades separate tank and control placements for a combined unit.

### Flame Fang

Blaze plus Wolf creates fast melee Burn damage with Burning Bite and Wildfire Rush; trades Blaze's ranged coverage for high-pressure close combat.

### Inferno Archer

Blaze plus Skeleton creates ranged fire damage and Burn, with Burning Arrow and Meteor Arrow Rain; trades two independent damage sources for concentrated ranged fire.

### Alpha Wolf

Two Wolves become a stronger melee/support unit, with Alpha Bite and Alpha Howl; trades two independent melee positions for a stronger unit with team support.

All attack effects and ability names are drafts pending `ABILITY_CATALOG.md`.

## 5. Validation and execution

1. Receive drag/drop request; confirm `PLAYING`.
2. Resolve Source and Target by instance ID; ensure distinct living Defenders and validate input IDs/Tiers against an approved Recipe.
3. Normalize the input type pair and find an approved, enabled and unlocked recipe; Initial Base Defenders: Iron Golem/Skeleton; initial Recipes: Skeleton Sniper/Steel Guardian — Confirmed.
4. Ensure both instances are not locked and their grid occupancy remains valid.
5. Lock both instances and revalidate.
6. Save Target cell; atomically remove both inputs, free Source cell, and replace Target with output.
7. Register output in combat/ability systems, emit `fusion:completed`, and play animation.
8. On failure, rollback or preserve original entities and grid, emit `fusion:failed`, and show feedback.

Do **not** check Energy, Power Crystal, distance, adjacency or same-lane status.

## 6. Failure codes

`INVALID_GAME_STATE`, `INVALID_SOURCE`, `INVALID_TARGET`, `SAME_INSTANCE`, `ENTITY_DEAD`, `INVALID_TIER`, `RECIPE_NOT_FOUND`, `GRID_CONFLICT`, `ENTITY_LOCKED`.

`INSUFFICIENT_ENERGY` is **not** a Fusion failure code.

## 7. Data-driven schema

| Field | Type | Constraint |
| --- | --- | --- |
| `id` | string | Unique |
| `inputA` | string | Existing approved input Defender ID; Tier-1 in the seven initial recipes |
| `inputB` | string | Existing approved input Defender ID; Tier-1 in the seven initial recipes |
| `output` | string | Existing approved output ID; Tier-2 in initial content |
| `requiredTier` | integer | Proposed field for current same-Tier recipes; value 1 in initial data, not a hard engine ceiling |
| `outputTier` | integer | 2 in initial content; future values require approved recipes |
| `enabled` | boolean | Enable/disable recipe |

No `energyCost` field is required in MVP. Example:

```json
{
  "id": "fusion_frost_guardian",
  "inputA": "iron_golem",
  "inputB": "snow_golem",
  "output": "frost_guardian",
  "requiredTier": 1,
  "outputTier": 2,
  "enabled": true
}
```

Normalize the input pair (for example, lexicographically sorted IDs) and reject duplicate enabled recipes with the same normalized pair.

## 8. UI and feedback

- Drag Source onto any valid Target across lanes/distances.
- Highlight valid Targets; show invalid Recipe feedback.
- Preview output name and icon where available; do not show an Energy price.
- Animation is cosmetic and must not permit duplicate fusion requests.
- On successful Fusion, Source cell is empty and Target cell contains the output.

## 9. Edge cases

- Source or Target dies during drag: reject without deleting the surviving unit.
- Game paused or ended: no Fusion execution.
- Duplicate simultaneous requests: at most one succeeds.
- Enemy breach before Fusion commits: resolve queued events deterministically. If a terminal result is resolved first, no subsequent gameplay commit; simultaneous Victory/Defeat use the first terminal event resolved, without blanket priority.
- Different lanes or opposite corners: valid if all other checks pass.
- Source and Target swapped: same output type but different placement.
- **Confirmed — 03/11/2026:** output starts at 100% own Max HP, inherits no input status effects, and can attack immediately with a valid target.

## 10. Acceptance criteria

- [ ] Seven recipes resolve from the five MVP Base Defenders.
- [ ] Same-type and cross-type combinations work.
- [ ] Order-independent matching works.
- [ ] Energy = 0 does not block a valid Fusion.
- [ ] No Energy or Power Crystal is consumed.
- [ ] Cross-lane and maximum-distance Fusion work.
- [ ] Output appears at Target cell; Source cell becomes empty.
- [ ] No duplicate outputs, lost units on failure or inconsistent occupancy.
- [ ] Engine validates approved Recipe data across any Tier; only seven Tier-2 output Recipes are approved initially.
- [ ] Output 100% own Max HP, no inherited statuses, attack-ready with valid target.
- [ ] Paused/Defeat/Victory states reject Fusion.

## 11. Pending design decisions

**Product Design Confirmed:** initial unlocks/mapping và Fusion optional đã chốt; Steel Guardian IDs, names and design identity follow PGD-01. Detailed combat and Ability mechanics remain TBD.

**Coding Planning TBD:** Fusion interaction cooldown (if any), animation duration, discovery UI, detailed concurrency/event generation edge cases. Output HP initialization/status inheritance/attack readiness are Confirmed, not pending.

**Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.

## 12. Related documents

`GDD.md`, `GAMEPLAY_MECHANICS.md`, `ENTITY_CATALOG.md`, `ABILITY_CATALOG.md`, `GAME_BALANCING.md`, `DATA_ARCHITECTURE.md`.
