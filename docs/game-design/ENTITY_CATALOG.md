# Entity Catalog

# Minecraft Fusion Defense

**Source file:** `docs/game-design/ENTITY_CATALOG.md`  
**Status:** Draft v1.1 — approved roster and fusion combinations; numerical stats are prototype proposals.

**Archival source:** [Entity Catalog — Notion](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951)
**Confirmed decisions:** 02/11/2026  
**Status key:** Confirmed = approved rules/roster/recipes; Proposed = unapproved draft concepts or prototype values; TBD = unspecified or awaiting confirmation. Combat/ability concepts below are Proposed; exact stats and targeting remain TBD.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Scope and authoritative rules

Desktop web, side-view 2D pixel art, 5 lanes × 9 columns. Defenders occupy one grid cell each; enemies spawn from the right and move left. Enemy behavior is configured per enemy; defender target selection is configured per defender. Enemy base breach generates Defeat; simultaneous terminal events follow Event Queue insertion order, with the first resolved terminal event deciding the result.

MVP: **5 Base Defenders, 15 Tier-2 Fusion Defenders, 4 Enemy types**, one Grassland level with five waves. Fusion is free, may cross lanes and any distance, and spawns its output at the target's original cell. Output HP/status/readiness follow the Confirmed 03/11/2026 rules in section 3. Power Crystal activates Special Abilities and is obtained from Wave Rewards and collectible Power Crystal Items.

## 2. Base Defender catalog

**Confirmed:** five Base Defender identities and IDs. **Proposed:** roles, attacks and Special Ability names.

| Entity ID | Name | Tier | Combat role | Attack identity | Special Ability |
| --- | --- | --- | --- | --- | --- |
| `snow_golem` | Snow Golem | 1 | Control | Ice projectile, Slow | Blizzard |
| `iron_golem` | Iron Golem | 1 | Tank | Melee impact | Earthquake |
| `skeleton` | Skeleton | 1 | Ranged Damage | Bow projectile | Arrow Storm |
| `wolf` | Wolf | 1 | Melee Damage | Fast bite | Pack Frenzy |
| `blaze` | Blaze | 1 | Fire Damage | Lobbed fire projectile (arc trajectory), Burn | Inferno |

Each Defender Definition must include: stable ID, display name, tier, role, HP, damage, attack speed, attack range, attack type, targeting strategy, summon Energy cost, specialAbilityId, animation/asset references, and optional status effects. **All numerical stats and precise targeting choices remain TBD until balancing.**

## 3. Fusion Defender catalog (15 Confirmed Tier-2 Defenders — 2026-11-23)

**Confirmed:** all 15 pairwise output names/input pairs, Tier 2, combat identities, and Special Ability IDs (updated 2026-11-23 per Owner approval of the 8 remaining pairwise recipes). Exact numerical combat balance stats remain TBD until final balancing.

| Entity ID | Name | Inputs | Tier | Combat role | Special Ability |
| --- | --- | --- | --- | --- | --- |
| `skeleton_sniper` | Skeleton Sniper | Skeleton + Skeleton | 2 | Long-range burst | `piercing_barrage` |
| `steel_guardian` | Steel Guardian | Iron Golem + Iron Golem | 2 | Crowd Control Guardian | `iron_bastion` |
| `iron_ranger` | Iron Ranger | Iron Golem + Skeleton | 2 | Heavy Ranged Marksman (slow fire rate, high single-target damage vs high-HP enemies, weak vs fast enemies) | `siege_volley` |
| `ice_golem` | Ice Golem | Snow Golem + Snow Golem | 2 | Ice Control | `absolute_zero` |
| `frost_guardian` | Frost Guardian | Iron Golem + Snow Golem | 2 | Tank / Control | `glacial_fortress` |
| `frostbite_ranger` | Frostbite Ranger | Snow Golem + Skeleton | 2 | Ranged Freeze Control | `glacier_barrage` |
| `alpha_wolf` | Alpha Wolf | Wolf + Wolf | 2 | Melee Damage / Support | `alpha_howl` |
| `ironfang_guardian` | Ironfang Guardian | Iron Golem + Wolf | 2 | Armored Melee / Disruption | `guardian_charge` |
| `bonefang_hunter` | Bonefang Hunter | Skeleton + Wolf | 2 | Agile Melee / Hunter | `predator_mark` |
| `frostfang` | Frostfang | Snow Golem + Wolf | 2 | Fast Melee / Cryo Executioner | `winter_pounce` |
| `infernal_archon` | Infernal Archon | Blaze + Blaze | 2 | Ranged Fire / Map-Wide Burst | `solar_cataclysm` |
| `magma_colossus` | Magma Colossus | Iron Golem + Blaze | 2 | Heavy Melee / Fire Bruiser | `eruption` |
| `steam_warden` | Steam Warden | Snow Golem + Blaze | 2 | Elemental Control (3×3 around self) | `thermal_collapse` |
| `inferno_archer` | Inferno Archer | Blaze + Skeleton | 2 | Ranged Damage / Burn | `meteor_arrow_rain` |
| `flame_fang` | Flame Fang | Blaze + Wolf | 2 | Melee Damage / Burn | `wildfire_rush` |

### Frost Guardian

- ID: `frost_guardian`; attack concept: Frozen Slam, melee/area attack applying Slow.
- Special Ability: Glacial Fortress, temporary Shield plus nearby Slow.
- **Proposed — prototype-only values:** HP 750, damage 38, attack speed 0.65/s, range 2 cells, targeting `CLOSEST_TO_DEFENDER`. These values are not confirmed.

### Flame Fang

- ID: `flame_fang`; attack concept: Burning Bite, fast melee attack applying Burn.
- Special Ability: Wildfire Rush, burst of rapid attacks with Burn.
- **Proposed — prototype-only values:** HP 360, damage 32, attack speed 1.7/s, range 1 cell, targeting `CLOSEST_TO_DEFENDER`. These values are not confirmed.

Other combat stats, exact attack rules and targeting strategies remain TBD; prototype numbers above are not approved balance. **Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 7 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

## 4. Enemy catalog

**Confirmed:** four Enemy identities. **Proposed/TBD:** roles and per-enemy behavior, as indicated.

| Entity ID | Name | Design role | Behavior status |
| --- | --- | --- | --- |
| `zombie` | Zombie | Basic enemy | Stop-and-attack is a proposal, not yet locked |
| `husk` | Husk | Durable/variant enemy | TBD |
| `vindicator` | Vindicator | Fast/aggressive melee enemy (replaces Spider; Spider moved to future Defender roadmap, outside current MVP) | TBD |
| `pillager` | Pillager | Ranged/special enemy | TBD |

Each Enemy Definition must declare: HP, movement speed, damage, lane behavior, interaction behavior (`STOP_AND_ATTACK`, `IGNORE_DEFENDER`, or `SPECIAL`), attack range/cooldown if applicable, rewards, animations and assets. Do not hardcode one enemy interaction rule globally.

**Confirmed enemy rewards — 03/11/2026:**

| Enemy | Energy khi chết (cộng trực tiếp) | Power Crystal khi chết (tạo Item) |
| --- | --- | --- |
| Zombie | 50 | 0 |
| Husk | 100 | 0 |
| Vindicator | 150 | 1 |
| Pillager | 200 | 1 |

**Confirmed:** Crystal reward tạo Item tại vị trí Enemy chết, kể cả khi storage đã đầy; mỗi Crystal được thưởng tạo một collectible Item. Các reward là integer không âm được cấu hình riêng trong Enemy Definition.

Crystal Item từ Enemy death xuất hiện kể cả khi storage đầy (cap 5), lifetime 10 giây Game Time; không collect trong Pause. Combat stats và Enemy behavior vẫn TBD.

**Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.

## 5. Special Ability references (20 Confirmed Special Abilities — 2026-11-23)

**Confirmed:** all 20 Defender-to-Ability ID mappings (5 Base Defenders + 15 Tier-2 Fusion Defenders). Full mechanics are defined in [ABILITY_CATALOG.md](ABILITY_CATALOG.md) (`Confirmed v2.1`).

| Defender | Ability ID |
| --- | --- |
| Snow Golem | `blizzard` |
| Iron Golem | `earthquake` |
| Skeleton | `arrow_storm` |
| Wolf | `pack_frenzy` |
| Blaze | `inferno` |
| Skeleton Sniper | `piercing_barrage` |
| Steel Guardian | `iron_bastion` |
| Iron Ranger | `siege_volley` |
| Ice Golem | `absolute_zero` |
| Frost Guardian | `glacial_fortress` |
| Frostbite Ranger | `glacier_barrage` |
| Alpha Wolf | `alpha_howl` |
| Ironfang Guardian | `guardian_charge` |
| Bonefang Hunter | `predator_mark` |
| Frostfang | `winter_pounce` |
| Infernal Archon | `solar_cataclysm` |
| Magma Colossus | `eruption` |
| Steam Warden | `thermal_collapse` |
| Inferno Archer | `meteor_arrow_rain` |
| Flame Fang | `wildfire_rush` |

Steel Guardian's normal attack is **Crushing Strike** (Confirmed name and interrupt-oriented melee identity). Exact numerical combat stats remain TBD until balancing.

## 6. Data integrity and acceptance

- All IDs are unique and stable; references resolve to existing entity and ability definitions.
- Exactly five Tier-1 defenders and fifteen Tier-2 fusion defenders (all 15 pairwise combinations).
- Exactly four MVP enemy types.
- Zombie is an enemy, not a Fusion input. Creeper is outside the MVP roster.
- Every initial approved Recipe uses the five Base Defenders. Engine validation follows approved Recipe definitions across any Tier; no fixed Tier ceiling.
- All Defender definitions specify a targeting strategy; all Enemy definitions specify interaction behavior before implementation.
- Keep unconfirmed stats and behavior explicitly marked as TBD/prototype.

## 7. Related documents

`GDD.md`, `GAMEPLAY_MECHANICS.md`, `FUSION_RECIPES.md`, `ABILITY_CATALOG.md`, `GAME_BALANCING.md`, `DATA_ARCHITECTURE.md`.
