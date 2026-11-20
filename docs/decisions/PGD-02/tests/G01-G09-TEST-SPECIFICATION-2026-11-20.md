# PGD-02 — G01–G09 Test Specification (Design Only)

**Task:** PGD-02.DOC-12 A  
**Date:** 2026-11-20  
**Status:** **TEST DESIGN — NOT EXECUTED**. Every case below is `NOT RUN`.  
**Preservation:** New file only; no existing Markdown, source code or tests changed.

## Evidence and scope

Directly reviewed: [G01–G09 summaries](../systems/G01.md), [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md), [G09 Decision Register](../registers/G09-DECISION-REGISTER.md), [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md), [Ability Addendum](../addenda/ABILITY-CATALOG-G09-ADDENDUM-2026-11-20.md), [Steel Guardian Addendum](../addenda/STEEL-GUARDIAN-IRON-BASTION-G09-ADDENDUM-2026-11-20.md), [G07 new Owner Decision B](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md).

- **Owner Confirmed (new):** Terminal Priority B — first valid resolved terminal event wins.
- **Confirmed — Source Pending Verification:** G01–G09 conversation-derived system and ability specifications. Original 199 G01–G08 and 216 ability-specific decision approvals have not been individually recovered.
- **TBD / BLOCKED:** no invented tick rate, queue overflow disposition, checkpoint eviction strategy, precise Crushing Strike effect, or placeholder API schema.
- **No tests executed:** no PASS/FAIL metrics or performance claims; design closure and implementation verification are separate.

## Test harness requirements (proposed, not gameplay decisions)

Use a deterministic test fixture with controllable Game Tick, fixed RNG seed, Stable Entity IDs, scheduled event insertion sequence, Battle Generation, effect versions, snapshot canonicalization, fake workers/monotonic clock, Crystal inventory and configurable Enemy/Defender state. Observe State diff, ordered event trace, Crystal delta, effect/projectile/activation IDs, Shield and HP deltas, checkpoints and failure diagnostics. Keep all timing assertions in **Game Time** except G01 wall-clock watchdog. Convert seconds to ticks only when an approved runtime tick rate is available.

**Test outcome convention:** `NOT RUN` by default. `BLOCKED` means an expected exact result cannot be asserted without a missing design detail; `BENCHMARK` means measurement needed. Case IDs below are **test IDs invented for this specification**, not Owner decision IDs.

## Case index and acceptance checks

### G01 — Runtime Failure

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| RT-01 | Worker task repeatedly fails | Inject repeatable worker exception; invoke retry policy | At most 3 retry attempts; terminal failure isolated; no partial state mutation | G01; TC41–45; FR19 |
| RT-02 | Worker exceeds wall-clock deadline | Hold task beyond 500ms monotonic wall time | Timeout detected independently of Game Tick; cancellation requested | G01 |
| RT-03 | Cancellation grace expires | Worker ignores cancellation beyond 100ms grace | Worker isolated or fail-stop according to recorded failure policy; no leaked gameplay commit | G01; FR19 |
| RT-04 | Paused simulation with worker timeout | Pause Game Time while a worker stalls | Wall-clock timeout still measured; pause does not turn 500ms into Game Tick duration | G01; G07 |

### G02 — Checkpoint Timing

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| CP-01 | Initial battle | Initialize clean battle and reach atomic tick-0 boundary | Immutable checkpoint at tick 0 | G02; FR10 |
| CP-02 | Periodic boundary | Advance from tick 0 through ticks 59, 60, 61, 120 | Periodic checkpoints at 60 and 120; not spuriously at 59/61 | G02 |
| CP-03 | Meaningful gameplay change | Trigger a change classified as meaningful by existing checkpoint policy | Checkpoint created at valid atomic commit boundary; exact change list requires approved source | G02; FR9–10 |
| CP-04 | Mid-transaction capture | Request snapshot while State updated but Queue not yet committed | No accepted checkpoint contains partial transaction | G02; FR9–10 |

### G03 — Snapshot Integrity

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| SN-01 | Canonical replay | Capture same logical state twice using canonical serialization | Canonical bytes/checksum equal for logically identical states | G03; TC37–40 |
| SN-02 | Tampered checksum | Mutate snapshot payload without updating checksum | Reject; no staged partial restore | G03; G05 |
| SN-03 | Unsupported version / semantic corruption | Supply unsupported version or dangling projectile/status reference | Reject rather than auto-repair or silently drop invalid fields | G03; FR11–13 |
| SN-04 | Full state capture | Capture queue, RNG, IDs, statuses, shields, projectile cursor, activations, versions | All deterministic gameplay fields restored; ordered events and next insertion counter match | G03; FR11–13; FR16 |

### G04 — Checkpoint Storage

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| MEM-01 | Checkpoint count | Produce more than three eligible Accepted Checkpoints | Never retain more than 3 Accepted Checkpoints in RAM | G04 |
| MEM-02 | RAM-only persistence | Inspect accepted checkpoint storage during session | No disk persistence assumed by this design contract | G04 |
| MEM-03 | Soft/hard memory boundaries | Instrument snapshot sizes around 16MiB and 32MiB | Collect measurements; threshold handling/eviction behavior is NOT specified and cannot be assigned PASS criteria yet | G04 — BENCHMARK/BLOCKED |

### G05 — Recovery

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| REC-01 | Newest valid checkpoint | Make three Accepted Checkpoints and trigger recovery | Try newest first; atomic staged restore; increment Battle Generation | G05; FR4 |
| REC-02 | Newest invalid checkpoint | Corrupt newest snapshot, retain older valid one | Reject newest and attempt older according to newest-first recovery policy | G05; G03 |
| REC-03 | Recovery while paused | Pause battle, then recover | Eligible paused state preserved; Game Time remains frozen until resumed | G05; G07; FR11 |
| REC-04 | Stale generation event | Restore and inject event from old Battle Generation | Reject stale event; no gameplay mutation | G05; FR4; TC39 |
| REC-05 | Uncommitted Crystal request | Queue but do not commit activation, then recover | Cancel command; no automatic replay, Crystal spend, or Activation Instance | G05; FR23 |
| REC-06 | Input during RECOVERING | Issue Crystal drop and gameplay commands during RECOVERING | Reject without Crystal spend, Activation or deferred gameplay queue | G05; FR24 |
| REC-07 | Atomic failed restore | Cause validation failure during staged restore | Original committed state preserved or explicit safe failure; never half-restored state | G05; TC44 |
| REC-08 | Terminal recovery guard | Commit terminal result then request preterminal checkpoint restore | Cannot revert committed terminal outcome to PLAYING | G05; FR18; G07 Owner B |

### G06 — Unified Event Queue

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| UEQ-01 | Scheduled Tick order | Insert events with different Scheduled Ticks in reverse insertion order | Resolve by Scheduled Tick first, then Insertion Sequence | G06; TC36 |
| UEQ-02 | Same-tick insertion | Insert same-tick events with distinct insertion counters | Resolve in increasing Insertion Sequence, deterministic | G06 |
| UEQ-03 | Deferred FIFO | Generate deferred events while processing current tick | Deferred ordering preserves FIFO and existing queue contract | G06 |
| UEQ-04 | Atomic State+Queue | Inject exception between proposed State and Queue changes | Neither partially commits; APPLIED/SKIPPED/FAILED classified | G06; FR9; FR19 |
| UEQ-05 | Transactional RNG/IDs | Abort a transition that allocated RNG/IDs/sequence numbers | Rollback allocations and RNG advancement with transition | G06; FR16 |
| UEQ-06 | Queue capacity / causal depth | Construct depth 32/33 and queue size 4096/4097 scenarios | Measure behavior and safe failure; exact overflow disposition is NOT established by summary | G06 — PARTIALLY BLOCKED |
| UEQ-07 | Event throughput target | Benchmark sustained 250 events per Game Tick | Report measured performance only; no benchmark PASS claimed in this spec | G06 — BENCHMARK |

### G07 — Game State / Terminal

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| TERM-01 | Victory first | Same Scheduled Tick: valid Victory seq 41, valid Defeat seq 42 | Victory commits; later Defeat cannot override | G07 Owner B; G06 |
| TERM-02 | Defeat first | Same Scheduled Tick: valid Defeat seq 41, valid Victory seq 42 | Defeat commits; later Victory cannot override | G07 Owner B; G06 |
| TERM-03 | Invalid candidate first | Earlier terminal candidate fails validity; later candidate is valid | First valid resolved terminal event wins; invalid candidate does not decide result | G07 Owner B |
| TERM-04 | Pause freezes Game Time | Pause with pending statuses/projectiles/ability cadence | No gameplay timers/events advance until resume | G07; G09 |
| TERM-05 | Terminal closure | Commit terminal during tick and inspect remaining gameplay operations | Honor FR17 tick-finalization/closure boundary; no new post-terminal gameplay actions | G07; FR17 |
| TERM-06 | State transition guards | Attempt illegal input during INITIALIZING/RECOVERING/TERMINAL/FAILED | Rejected according to lifecycle contract, without gameplay mutation | G07; FR24 |
| TERM-07 | Historical G07 provenance | Compare earlier G07 summary and newer Owner decision | New Owner B governs current gameplay; original G07 historical evidence still pending | G07 Owner B; GAP-01 addendum — DOCUMENTATION |

### G08 — Ability Architecture

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| ARCH-01 | Typed primitive validation | Create malformed effect/targeting/provenance payload | Reject schema/contract violations; no partial effect | G08; TC1–10; TC41–45 |
| ARCH-02 | Effect provenance | Activate ability then inspect created effect/status/projectile | Stable battle-unique IDs and Source/Ability/Activation provenance | G08; TC6–8 |
| ARCH-03 | Subsystem orchestration | Activate composite damage+status+projectile ability | Ability Executor delegates typed effects deterministically; no invented primitive API names | G08; TC1–5 |
| ARCH-04 | Activation lifecycle | Stun, resume, kill and Fusion owner during multi-hit | ACTIVE/PAUSED/COMPLETED/CANCELLED follow ability-specific policies | G08; TC31–35 |

### G09 — Shared Activation / Combat Contract

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| CORE-01 | Valid Crystal activation | PLAYING, 1 Crystal, valid owner and required target | Exactly 1 Crystal spent; Activation committed atomically; immediate; no cooldown | G09 General; TC32 |
| CORE-02 | Invalid target / owner | Target-dependent ability with no target, or dead owner | No Crystal spent, no Activation created | G09 General; TC42–45 |
| CORE-03 | Self-buff without Enemy | Activate Pack Frenzy / Alpha Howl / Iron Bastion without Enemy | Valid activation when owner/Crystal otherwise eligible | G09 Ability Register |
| CORE-04 | Same-tick Crystal contention | Two valid requests with only one Crystal | Sequential commit: first valid spends, later insufficient request rejected | G09.CR10; TC32 |
| CORE-05 | Damage pipeline | Apply mixed Armor/Resistance, Redirect, Shield and HP | Apply Armor/Resistance → Redirect → Shield → HP, with typed piercing exceptions | G09.CR1–2; TC11–15 |
| CORE-06 | Zero damage confirmed hit | Defense reduces hit to zero while Burn-on-hit applies | hitConfirmed true, damageApplied zero; eligible Burn still applies | G09.CR22; GR1; TC15 |
| CORE-07 | Same-source status refresh | Reapply same-source Burn/Stun before expiry | Instance ID preserved, version incremented, stale tick/expiry skipped | G09.GR5; TC16–20 |
| CORE-08 | Different-source statuses | Apply Burns/Shields from different sources | Independent Burn tick events in queue order; Shields oldest-first | G09.CR9; CR14; TC20–25 |
| CORE-09 | Shield piercing | Hit target with Shield-piercing and combined Armor/Shield-piercing | Correct bypass semantics; no unintended Shield depletion | G09.GR2–3; CR2 |
| CORE-10 | Projectile same-instant collision | One projectile overlaps multiple Enemies in same instant | Stable Entity ID order; atomic hit claim+damage; no duplicate hit | G09.FR7–8; TC28–29 |
| CORE-11 | Recast Shield identity | Recast same-source Shield with changed Max HP | Reset amount using current Max HP, preserve Shield ID/creation order | G09.FR2; GR9–10 |
| CORE-12 | Freeze+Stun+Slow | Apply all to Enemy, expire in different order | Freeze/Stun independently prevent action; Slow persists and resumes on release | G09.CR7; CR17 |
| CORE-13 | Paused multihit delay | Stun actor mid-cadence then release | Remaining delay preserved; no burst of accumulated hits | G09.FR3; TC34 |
| CORE-14 | Deterministic replay | Restore checkpoint mid-activation/projectile then replay same inputs | Canonical gameplay state and ordered event log match uninterrupted reference | G09.TC37–40; FR11–13 |
| CORE-15 | Atomic failed hit | Cause failure after hit claim before Damage commit | Hit registry and Damage both rollback; no phantom claim | G09.FR8; FR19 |
| CORE-16 | Terminal during active ability | Terminal result commits while ability/projectile events pending | FR17 closure honored; no postterminal gameplay mutations; terminal not reversed | G09.FR17–18; G07 Owner B |

### 12 MVP Special Abilities

| Test ID | Scenario | Setup / Action | Expected result / assertion | Source |
|---|---|---|---|---|
| ABL-01 | Blizzard — Lane scope | Two Enemies in source Lane, one elsewhere | Only same-Lane Enemies get -50% Slow for 5s | Blizzard |
| ABL-02 | Blizzard — refresh/lane change | Refresh same-source Slow, move affected Enemy to another Lane | Duration refresh, no duplicate; Slow persists after move; strongest Slow applies | Blizzard |
| ABL-03 | Earthquake — direct damage | Two same-Lane Enemies, one other Lane | Each same-Lane Enemy receives 3× Attack Damage and 2s Stun; other Lane unaffected | Earthquake |
| ABL-04 | Earthquake — stun sources | Apply two Stuns from distinct sources | Independent lifetimes; movement/attack/skills remain blocked while either active | Earthquake; CR7 |
| ABL-05 | Arrow Storm — cadence | Maintain eligible targets for eight firing actions | Exactly eight nonpiercing arrows at 0.2s cadence, 100% Attack Damage each, retarget each shot | Arrow Storm |
| ABL-06 | Arrow Storm — owner death/Stun | Fire some arrows, Stun then kill/Fusion owner | Fired arrows persist; Stun pauses unfired cadence; death/Fusion cancels unfired actions | Arrow Storm; FR3 |
| ABL-07 | Pack Frenzy — self-buff | Activate with no Enemy, recast before expiry | Self +100% Attack Speed/+50% Attack Damage for 8s; refresh no stack | Pack Frenzy |
| ABL-08 | Pack Frenzy — stun/death | Stun owner, then kill/Fusion | Buff timer continues during Stun; normal attack blocked; buff removed on death/Fusion | Pack Frenzy |
| ABL-09 | Inferno — lane burn | Apply to multiple same-Lane Enemies | 3× Fire Damage each; Burn 25% Attack Damage/s for 5s, one tick/s | Inferno |
| ABL-10 | Inferno — resistance/refresh | Change source Attack Damage after application; refresh Burn; change Fire Resistance | Burn base snapshotted on apply/refresh; Fire Resistance evaluated on each tick; old events invalidated | Inferno; CR6; CR16 |
| ABL-11 | Piercing Barrage — traversal | Line up several Enemies same Lane, including immune Enemy | One arrow at 2× speed; each Enemy hit once for 600% Attack Damage; immune target counts hit; no pierce cap | Piercing Barrage |
| ABL-12 | Piercing Barrage — owner death/no target | Fire without target, then remove owner | Projectile persists to field edge and despawns; damage snapshot at firing | Piercing Barrage |
| ABL-13 | Absolute Zero — global Freeze | Enemies across five Lanes with immune/resistant cases | Freeze eligible Enemies 4s, immunity respected, Resistance scales duration at apply/refresh | Absolute Zero |
| ABL-14 | Absolute Zero — coexistence | Combine Freeze, Slow and Stun; kill source/change Enemy Lane | Freeze independent, Slow/Stun coexist; Freeze persists after source death/Fusion/lane change | Absolute Zero |
| ABL-15 | Glacial Fortress — Shield | Activate and recast at changed Max HP | Shield 50% Max HP, lasts until broken; reset no stacking; Shield before HP | Glacial Fortress |
| ABL-16 | Glacial Fortress — area boundary | Enemy enters/leaves one-tile-front zone, then Shield breaks | Slow -50% for 5s on enter; leaving active area removes area-derived Slow; after break residual Slow persists | Glacial Fortress |
| ABL-17 | Wildfire Rush — cadence | Targets in melee range, target dies between hits | Five stationary hits 0.2s apart, retarget each, 100% current Attack Damage at each hit | Wildfire Rush |
| ABL-18 | Wildfire Rush — Burn/Stun | Stun during cadence, land hit then remove owner | Unfired cadence pauses/cancels per lifecycle; landed Burn 25%/s for 5s persists; direct Damage physical | Wildfire Rush |
| ABL-19 | Meteor Arrow Rain — area lock | Activate near defense line, move Enemy before impact | Fixed 3×3 target area; each of eight arrows retargets at start, locks impact tile; misses possible | Meteor Arrow Rain |
| ABL-20 | Meteor Arrow Rain — impact and death | Multiple Enemies occupy locked impact tile; owner dies after arrows start | Each eligible Enemy in tile hit once per arrow for 100% snapshot Damage and Burn; falling arrows persist, unfired cancel | Meteor Arrow Rain; CR3 |
| ABL-21 | Alpha Howl — recipient snapshot | Allies inside/outside 3×3 at activation; move recipients afterward | Only initial 3×3 including self receive +100% Attack Speed/+50% Attack Damage for 8s; leaving retains Buff | Alpha Howl |
| ABL-22 | Alpha Howl — stacking/lifecycle | Two Alpha Wolves and Pack Frenzy; Fusion a recipient | Different-source buffs additive base; same-source refresh; recipient Fusion loses Buff; source death preserves other recipients | Alpha Howl; FR5–6 |
| ABL-23 | Iron Bastion — Shield | Activate with Max HP N, change Max HP, recast | Initial Shield N snapshot; persists past 8s until broken; recast resets to current Max HP, retains Shield identity/order | Iron Bastion; GR6–10; FR2 |
| ABL-24 | Iron Bastion — dynamic protection | Ally enters/leaves Guardian 3×3 during 8s | Redirect only while eligible/in range; 50% of post-defense ally Damage to Guardian, no second Guardian defenses | Iron Bastion; CR1 |
| ABL-25 | Iron Bastion — multiple guardians | Two eligible Guardians at unequal/equal Manhattan distance | Choose nearest; tie stable Entity ID; no double redirect | Iron Bastion; GR4 |
| ABL-26 | Iron Bastion — piercing/death | Shield-piercing ally hit, Guardian dies from redirected share | Both portions retain piercing; Guardian protection ends immediately; no redirected overflow returns to ally | Iron Bastion; GR3; CR5 |

## Cross-system test campaigns

1. **Activation × Queue × Terminal:** schedule valid Crystal activation, owner death and Victory/Defeat at equal Scheduled Tick with distinct Insertion Sequence; assert atomic spend/creation and **Owner B** terminal precedence. Do not invent event-generation order.
2. **Projectile × Collision × Recovery:** restore midflight cursor, per-target hit registry and next insertion counter; replay and compare ordered Hit Events, Damage, Shield and HP.
3. **Status × Pause × Recovery:** refresh Burn/Slow/Freeze, Pause, checkpoint, recover to PAUSED and resume; ensure no duplicate periodic ticks or stale version effects.
4. **Iron Bastion × Damage × Death:** multiple Guardians, Armor/Resistance, piercing, Shields and death mid-tick; assert nearest-Guardian selection and immediate protection termination after committed death.
5. **Resource × Failure:** Crystal activation failure, worker timeout, transaction rollback, then recovery; assert no phantom Crystal spend, Effect ID, RNG or insertion-sequence consumption.
6. **Determinism:** replay the same canonical checkpoint and ordered inputs at least twice; compare canonical state hashes and ordered event traces. Reproducibility is a proposed acceptance method, not proof of runtime determinism.

## Traceability and coverage

- **System coverage:** G01–G09, G07 new Owner B, G09 TC1–50, CR1–25, GR1–10, FR1–25 by grouped scenarios and cross-system campaigns; **not** a claim of one-to-one coverage for every decision.
- **Ability coverage:** all 12 MVP abilities, with at least two dedicated cases each. Some fine-grained edge cases remain in the full G09 Ability Register and require additional test elaboration.
- **Source evidence:** 110 indexed G09 CR/GR/TC/FR rows remain Source Pending Verification; reported 216 ability-specific decisions have no recovered individual IDs.
- **Known blockers:** G04 memory/eviction exact behavior, G06 capacity overflow exact behavior, Crushing Strike, UI/VFX/API schema names and original decision traceability. G07 gameplay priority is **not** blocked: new Owner decision B resolves it; original historical G07 source remains pending.
- **Performance:** 16MiB/32MiB storage thresholds and 250 events/tick target are **unbenchmarked**; record measurements, do not fabricate PASS.

## Execution protocol for a later authorized implementation phase

1. Confirm approved runtime tick rate and actual test runner/harness before encoding time in tick counts.
2. Translate each case to fixtures and assertions without changing the described game rules.
3. Record result as `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`, with environment, code commit, seed, logs and canonical snapshots.
4. Never mark `PASS` from design text alone; escalate ambiguous expected behavior to Owner instead of selecting it silently.
5. Report implementation coverage separately from source-verification and documentation-sync status.

**This specification introduces no new gameplay rules and modifies no existing file.**
