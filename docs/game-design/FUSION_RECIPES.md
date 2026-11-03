# Fusion Recipes

# Minecraft Fusion Defense

**Source file:** `docs/game-design/FUSION_RECIPES.md`  
**Status:** Draft v1.2 — core Fusion rules confirmed.

**Source:** [Fusion Recipes — Notion](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41)  
**Confirmed decisions:** 02/11/2026  
**Status key:** Confirmed = approved core mechanics, six recipes and Fusion output HP/status/readiness; Proposed = draft combat/ability concepts; TBD = pending animation/cooldown/UI and unapproved future recipes. Schema, event names and failure codes describe the draft implementation contract, not additional gameplay approvals.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Purpose and scope

Fusion combines two valid living Defender instances by dragging Source onto Target. Both inputs are consumed; Source cell is emptied and output occupies Target's original cell. Initial content is exactly six approved recipes (three same-type, three cross-type).

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

## 2. Confirmed mechanics

- **Fusion costs 0 Energy** and **0 Power Crystal**. No Energy availability check, deduction or refund. Summoning the two inputs still costs Energy normally.
- **No distance limit or lane restriction.** Source and Target may occupy any two distinct valid cells in the 5 × 9 battlefield, including opposite corners and different lanes.
- **Order-independent matching:** A + B yields the same output as B + A. The output's position depends on which instance is Target.
- Source and Target must be distinct, alive, unlocked Defender instances matching an approved, enabled and unlocked Recipe's input IDs and Tiers; game state must be `PLAYING`. Initial six recipes use Tier-1 inputs; this is not an engine-wide Tier ceiling. Exact initial Recipe availability remains Product Design TBD.
- **Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.
- Fusion executes atomically; failed attempts do not delete units or change resources or grid occupancy.

## 3. MVP recipe catalog

| Recipe ID | Input A | Input B | Output ID | Output name | Energy cost |
| --- | --- | --- | --- | --- | --- |
| `fusion_skeleton_sniper` | `skeleton` | `skeleton` | `skeleton_sniper` | Skeleton Sniper | 0 |
| `fusion_ice_golem` | `snow_golem` | `snow_golem` | `ice_golem` | Ice Golem | 0 |
| `fusion_frost_guardian` | `iron_golem` | `snow_golem` | `frost_guardian` | Frost Guardian | 0 |
| `fusion_flame_fang` | `blaze` | `wolf` | `flame_fang` | Flame Fang | 0 |
| `fusion_inferno_archer` | `blaze` | `skeleton` | `inferno_archer` | Inferno Archer | 0 |
| `fusion_alpha_wolf` | `wolf` | `wolf` | `alpha_wolf` | Alpha Wolf | 0 |

Zombie Golem and Frost Creeper were replaced by Frost Guardian and Flame Fang because Zombie and Creeper are not among the five MVP Base Defenders.

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
3. Normalize the input type pair and find an approved, enabled and unlocked recipe; initial unlocked recipes remain Product Design TBD.
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
| `inputA` | string | Existing approved input Defender ID; Tier-1 in the six initial recipes |
| `inputB` | string | Existing approved input Defender ID; Tier-1 in the six initial recipes |
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

- [ ] Six recipes resolve from the five MVP Base Defenders.
- [ ] Same-type and cross-type combinations work.
- [ ] Order-independent matching works.
- [ ] Energy = 0 does not block a valid Fusion.
- [ ] No Energy or Power Crystal is consumed.
- [ ] Cross-lane and maximum-distance Fusion work.
- [ ] Output appears at Target cell; Source cell becomes empty.
- [ ] No duplicate outputs, lost units on failure or inconsistent occupancy.
- [ ] Engine validates approved Recipe data across any Tier; only six Tier-2 output Recipes are approved initially.
- [ ] Output 100% own Max HP, no inherited statuses, attack-ready with valid target.
- [ ] Paused/Defeat/Victory states reject Fusion.

## 11. Pending design decisions

**Product Design TBD:** initial unlocked Base Defenders/Recipes, Achievement conditions/unlock mapping, whether Fusion is required to win Grassland.

**Coding Planning TBD:** Fusion interaction cooldown (if any), animation duration, discovery UI, detailed concurrency/event generation edge cases. Output HP initialization/status inheritance/attack readiness are Confirmed, not pending.

**Confirmed:** cả Base Defenders và Fusion Recipes có unlock qua Achievements/Challenges; bộ Defender ban đầu nhỏ, phần lớn Recipe bị khóa. Chỉ ghi nhận Achievement khi Victory; Defeat không tạo unlock mới và giữ unlock đã có. Grassland được replay nhưng sau lần hoàn thành đầu, replay không tạo thêm permanent unlock progress. Starter roster, Recipe mở sẵn, điều kiện/phần thưởng Achievement và Fusion có bắt buộc để thắng hay không vẫn TBD.

## 12. Related documents

`GDD.md`, `GAMEPLAY_MECHANICS.md`, `ENTITY_CATALOG.md`, `ABILITY_CATALOG.md`, `GAME_BALANCING.md`, `DATA_ARCHITECTURE.md`.
