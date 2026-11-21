# T-07 — Enemy Movement, Combat & Targeting: Implementation Plan v1.0

**Project:** Minecraft Fusion Defense  
**Status:** **IMPLEMENTED AT `7b7c37d` — 19/20 GATES LOCAL PASS, AC-20 REMOTE CI PENDING PUSH (D-25–D-38 = A; Production Combat Data Remains TBD)**  
**Scope:** Headless `packages/game` Enemy spawn hook, lane movement, Enemy–Defender interaction, Defender targeting/attack, HP/damage/death, Base breach → Defeat notification; see [T-07 Final Acceptance Report](../reports/T-07-FINAL-ACCEPTANCE.md).  
**Dependency:** [T-05 acceptance](../reports/T-05-FINAL-ACCEPTANCE.md), [T-06 acceptance](../reports/T-06-FINAL-ACCEPTANCE.md), T-04 simulation contracts.  
**Authority:** [Documentation Policy](../DOCUMENTATION_POLICY.md); [Gameplay Mechanics](../product/GAMEPLAY_MECHANICS.md) §6–§7, §12, §14.4; [Entity Catalog](../game-design/ENTITY_CATALOG.md); [Game Balancing](../game-design/GAME_BALANCING.md) §4–§6, §15; [Game Engine Architecture](../architecture/GAME_ENGINE_ARCHITECTURE.md); PGD-02 G06/G07 and the [G07 terminal-priority Owner decision](../decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md).

## 1. Objective and scope

Extend the accepted T-05/T-06 headless runtime with deterministic **Enemy movement along lanes**, **data-driven Enemy interaction behavior**, **per-Defender targeting**, **attack cooldowns**, **HP, damage and death**, and **Base breach → Defeat** notification. Reuse T-04 `SimulationClock`, `TransactionEngine`, `EventQueue`, `EventScheduler` and T-06 reward hooks; no second engine or mutable backdoor.

**In scope (proposed):** internal `spawn-enemy` command (hook for T-09), movement, `STOP_AND_ATTACK` / `IGNORE_DEFENDER` behavior, Defender and Enemy attacks, targeting strategies, HP/death, Enemy-death → T-06 `enemy-reward`, Defender-death → cell release, breach → `terminal: defeat` via queue.

**Out of scope:** Wave orchestration and Victory detection (T-09), Fusion (T-08), Special Abilities (T-10), Save & Resume (T-11), Phaser/React rendering, animations and HUD (T-12), production balance values, new dependencies, public host APIs.

## 2. Confirmed gameplay invariants (must be preserved)

- Battlefield 5 rows × 9 columns; Enemies spawn on the right, move right → left, stay in their lane unless a special mechanic applies (GM §6.1–6.2).
- Enemy interaction behavior is **per Enemy type**; never one global attack/ignore rule (GM §6.3, Entity Catalog §4).
- Each Defender has its **own Targeting Strategy**; no universal policy (GM §7.3, confirmed 02/11/2026).
- Units: Attack Speed = **attacks/second**, Attack Range = **cells**, Move Speed = **cells/second** (Balancing §4.1, §15-A).
- Any Enemy crossing the Base Boundary generates Defeat; no Base HP/Lives (GM §6.4).
- **Confirmed 03/11/2026:** Defender attack and Enemy movement are computed **simultaneously each simulation tick**, then the Event Queue resolves by insertion sequence; detailed event-generation ordering is Coding Planning TBD.
- G07: first **valid resolved** terminal event wins; later terminal events cannot change it.
- Enemy death rewards (Zombie 50/0, Husk 100/0, Vindicator 150/1, Pillager 200/1) are delivered through the T-06 hook at the death position.
- Fusion Output starts at 100% own Max HP, no inherited statuses, attack-ready (relevant for T-08 integration).

## 3. Owner-approved technical decisions (2026-11-21)

All **14 decisions D-25 through D-38** are approved as **Option A**:

| ID | Topic | Approved choice |
| --- | --- | --- |
| **D-25** | Per-tick simulation phase | **A:** Add an additive `TransactionEngine.executePhase(tick, mutator)` staged transaction that runs **before** `EventScheduler.runTick(tick)`; it computes movement + attacks and enqueues resulting events for the same tick (T-04 additive extension approved). |
| **D-26** | Simultaneity semantics | **A:** All movement and attack intents are computed from the **start-of-tick state**, then applied together; deaths/breaches are enqueued in ascending Entity ID order. |
| **D-27** | Lane coordinate & Base Boundary | **A:** Continuous lane coordinate `x` in cells; column `c` spans `[c, c+1)`; Base Boundary is `x < 0`; spawn `x` comes from validated session config (fixture only until approved). |
| **D-28** | Enemy behavior set | **A:** Implement `STOP_AND_ATTACK` and `IGNORE_DEFENDER`; `SPECIAL` fails closed until defined. Per-Enemy assignment injected via session (fixtures only). |
| **D-29** | Encounter / blocking rule | **A:** A `STOP_AND_ATTACK` Enemy stops when the nearest same-lane Defender ahead (to its left) is within the Enemy's attack range measured from the Defender cell's right edge; resumes moving after the target dies. |
| **D-30** | Targeting strategies implemented | **A:** `CLOSEST_TO_BASE`, `CLOSEST_TO_DEFENDER`, `HIGHEST_HP`, `LOWEST_HP`, `FASTEST`, `FIRST_VALID`; `HIGHEST_THREAT` blocked until defined. Tie-break: lower Entity ID. (Per-Defender assignment remains TBD.) |
| **D-31** | Defender range & lane | **A:** Same lane only; forward-only (Enemies at `x ≥` Defender cell left edge); distance from Defender cell center to Enemy `x` ≤ range. Multi-lane attacks deferred to Abilities. |
| **D-32** | Attack model in T-07 | **A:** Instant-hit for all attack types; projectile travel entity deferred. |
| **D-33** | Cooldown timing | **A:** Attack-ready on first valid target; next attack at first tick ≥ previous attack + `1/attackSpeed` s (D-08 style absolute deadline). |
| **D-34** | Status effects (Slow/Freeze/Burn/Stun/Vulnerable) | **A:** Out of T-07; leave a modifier hook (stacking rules remain TBD). |
| **D-35** | Damage & HP | **A:** `Final Damage = Base Damage` (no modifiers in T-07); finite non-negative numbers; HP ≤ 0 ⇒ dead; one damage application per attack. |
| **D-36** | Death handling | **A:** Enemy death removes the entity and enqueues T-06 `enemy-reward` with death `{lane, x}`; Defender death removes entity and frees its cell; Items on the cell are untouched. |
| **D-37** | Breach | **A:** Enemy with `x < 0` after movement enqueues `terminal: defeat` in the same tick; resolved via queue (G07). |
| **D-38** | Combat session input | **A:** Extend the immutable validated session (T-06 D-24 pattern) with Defender combat stats + targeting and Enemy stats + behavior; missing values fail closed; no `@mfd/game-data` schema change in T-07. |

## 4. Implementation slices (approved scope; coding awaits separate authorization)

| Slice | Work | Exit evidence |
| --- | --- | --- |
| **T-07.1 — Combat session & state** | Validated combat definitions, Enemy runtime state (HP, x, behavior state), Defender HP/cooldown state | Fail-closed validation, snapshot isolation tests |
| **T-07.2 — Tick phase** | D-25 phase transaction, start-of-tick intent computation, rollback | Phase ordering, rollback, Pause, T-04 regression tests |
| **T-07.3 — Spawn & movement** | `spawn-enemy` command, lane movement, breach detection | Movement at fractional tick rates, breach → Defeat, no lane change |
| **T-07.4 — Enemy interaction** | `STOP_AND_ATTACK` / `IGNORE_DEFENDER`, Enemy attacks on Defenders | Stop/resume, ignore-pass-through, Defender death frees cell |
| **T-07.5 — Defender targeting & attack** | Strategies, range, cooldown, damage, Enemy death → reward hook | Per-strategy tests, tie-breaks, overkill/multi-hit same tick |
| **T-07.6 — Regression & evidence** | Full T-04/T-05/T-06 regression, typecheck, build, acceptance report | Gate matrix with evidence and CI result |

## 5. Acceptance gates — 20 gates (19/20 local PASS, AC-20 remote CI pending push — see [Acceptance Report](../reports/T-07-FINAL-ACCEPTANCE.md))

| Gate | Requirement |
| --- | --- |
| **AC-01** | Combat definitions validated; missing stats/behavior/targeting fail closed; no production defaults |
| **AC-02** | `spawn-enemy` creates an Enemy in a valid lane at configured spawn `x`; invalid lane/definition rejected without mutation |
| **AC-03** | Enemy moves right → left at `moveSpeed` cells/s Game Time, frame-split independent, no lane change |
| **AC-04** | Pause freezes movement, attacks and cooldowns |
| **AC-05** | Movement and attacks are computed from start-of-tick state, then queue events resolve by insertion sequence |
| **AC-06** | `STOP_AND_ATTACK` Enemy stops at a same-lane Defender, attacks per its cooldown, resumes after the Defender dies |
| **AC-07** | `IGNORE_DEFENDER` Enemy passes Defenders without stopping or attacking |
| **AC-08** | Enemies never attack Defenders in other lanes |
| **AC-09** | Defender attacks only valid, living, in-range, same-lane Enemies |
| **AC-10** | Each implemented Targeting Strategy selects correctly; deterministic tie-break |
| **AC-11** | Target re-evaluation when target dies, leaves range or becomes invalid |
| **AC-12** | Attack cooldown follows attacks/second with absolute deadlines; attack-ready on first valid target |
| **AC-13** | HP updates exactly; multiple simultaneous hits kill once; no damage from dead entities |
| **AC-14** | Enemy death removes it from combat and grants T-06 reward exactly once at death position |
| **AC-15** | Defender death frees its cell and leaves Items intact |
| **AC-16** | Breach (`x < 0`) enqueues Defeat; first valid terminal wins; no simulation after terminal |
| **AC-17** | Failed transaction rolls back positions, HP, cooldowns, entities, counters and staged events |
| **AC-18** | Identical config, seed and inputs replay identically |
| **AC-19** | T-04/T-05/T-06 regressions, 250 events/tick, queue 4096, causal depth 32 preserved |
| **AC-20** | Game/Game Data tests, typecheck, build pass; CI PASS only after a real run |

## 6. Production-data blockers (not permission to invent values)

- HP, Damage, Attack Speed, Attack Range for 5 Base + 7 Fusion Defenders; per-Defender Targeting Strategy and Attack Type (Balancing §4–§5).
- HP, Damage, Attack Speed, Attack Range, Move Speed and Interaction Behavior for Zombie, Husk, Vindicator, Pillager (Balancing §6, §15-C).
- Enemy spawn offset, Base Boundary visual mapping, `SPECIAL` behaviors (if any for Vindicator/Pillager), `HIGHEST_THREAT` definition, status-effect stacking.

Headless engine work may proceed with explicitly labeled test fixtures only after separate Owner coding authorization.

## 7. Stop conditions

Stop and ask the Owner before: changing T-04/T-05/T-06 contracts beyond approved D-25; assigning behavior/targeting to a named Entity; inventing stats; adding Victory detection or Wave orchestration; adding public APIs, dependencies, Phaser/React changes or persistence.
