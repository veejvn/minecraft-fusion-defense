# G09 — Individual Decision Register (110 IDs)

**Evidence level:** Conversation-derived summaries; original message-level approvals are **not** independently linked. **Status:** Confirmed — Source Pending Verification. This is a **traceability index**, not an exhaustive verbatim specification. Use system/contract/audit documents for fuller context.

**Important:** CR8 was option **B**, unlike other CR items. TC selected-option letters are not established by the available summary, so no letters are invented. FR21 was option **C**. G07 terminal GAP-01 remains open.

## CR1–CR25

| Decision ID | Selected option | Reported rule | Evidence |
|---|---|---|---|
| G09.CR1 | A | Armor/Resistance → Redirect → Shield → HP | Source Pending Verification |
| G09.CR2 | A | Armor+Shield piercing bypass both | Source Pending Verification |
| G09.CR3 | A | Meteor arrow hits every eligible Enemy in locked tile | Source Pending Verification |
| G09.CR4 | A | Same-tick Damage sequential; recheck target | Source Pending Verification |
| G09.CR5 | A | Guardian death immediately ends protection before later Damage | Source Pending Verification |
| G09.CR6 | A | Burn base snapshot; Fire Resistance recalculated per tick | Source Pending Verification |
| G09.CR7 | A | Freeze and Stun independent; resume when both end | Source Pending Verification |
| G09.CR8 | B | Attack Speed expiry affects next normal attack, not scheduled interval | Source Pending Verification |
| G09.CR9 | A | Different-source Shields oldest-first | Source Pending Verification |
| G09.CR10 | A | Same-tick Crystals sequential; valid activations consume | Source Pending Verification |
| G09.CR11 | A | Same-tick Shield creation queue order, stable ID tie | Source Pending Verification |
| G09.CR12 | A | Attack Damage Buff snapshot at each multihit execution | Source Pending Verification |
| G09.CR13 | A | Freeze Resistance assessed at application/refresh | Source Pending Verification |
| G09.CR14 | A | Different-source Burns tick independently in queue order | Source Pending Verification |
| G09.CR15 | A | Fusion vs pending shot follows queue order | Source Pending Verification |
| G09.CR16 | A | Burn tick vs refresh follows queue order; old event invalidated | Source Pending Verification |
| G09.CR17 | A | Slow persists through Freeze and resumes when Freeze ends | Source Pending Verification |
| G09.CR18 | A | Buff expires during Stun; does not return | Source Pending Verification |
| G09.CR19 | A | Shield break vs Fusion follows queue order | Source Pending Verification |
| G09.CR20 | A | Same-source Alpha Howl sequential refresh, no stack | Source Pending Verification |
| G09.CR21 | A | Damage/heal queue order; no resurrection after death | Source Pending Verification |
| G09.CR22 | A | Zero post-defense Damage still valid hit | Source Pending Verification |
| G09.CR23 | A | Direct and redirected Guardian Damage follow queue order | Source Pending Verification |
| G09.CR24 | A | Enemy death removes statuses; later expiry inert | Source Pending Verification |
| G09.CR25 | A | Crystal activation vs Defender death follows queue order | Source Pending Verification |

## GR1–GR10

| Decision ID | Selected option | Reported rule | Evidence |
|---|---|---|---|
| G09.GR1 | A | Zero-damage confirmed hit may apply Burn | Source Pending Verification |
| G09.GR2 | A | Shield piercing bypasses all Shields | Source Pending Verification |
| G09.GR3 | A | Iron Bastion redirects shield-piercing Damage; both shares retain piercing | Source Pending Verification |
| G09.GR4 | A | Nearest Guardian Manhattan distance; tie by Entity ID | Source Pending Verification |
| G09.GR5 | A | Status refresh increments version; stale events ignored | Source Pending Verification |
| G09.GR6 | A | Max HP increase does not alter existing Shield | Source Pending Verification |
| G09.GR7 | A | Max HP decrease does not alter existing Shield | Source Pending Verification |
| G09.GR8 | A | Max HP decrease clamps current HP to new maximum | Source Pending Verification |
| G09.GR9 | A | Iron Bastion recast resets Shield to current Max HP | Source Pending Verification |
| G09.GR10 | A | Same-tick Max HP change and Bastion activation follow queue order | Source Pending Verification |

## TC1–TC50

| Decision ID | Selected option | Reported rule | Evidence |
|---|---|---|---|
| G09.TC1 | Confirmed (option not recovered) | Common typed primitive contract | Source Pending Verification |
| G09.TC2 | Confirmed (option not recovered) | Ability Executor orchestration | Source Pending Verification |
| G09.TC3 | Confirmed (option not recovered) | Specialized Damage/Status/Shield/Projectile subsystems | Source Pending Verification |
| G09.TC4 | Confirmed (option not recovered) | Validated deterministic atomic state transitions | Source Pending Verification |
| G09.TC5 | Confirmed (option not recovered) | Multihit through Unified Event Queue | Source Pending Verification |
| G09.TC6 | Confirmed (option not recovered) | Battle-unique Effect Instance ID | Source Pending Verification |
| G09.TC7 | Confirmed (option not recovered) | Persistent Source/Ability/Activation provenance | Source Pending Verification |
| G09.TC8 | Confirmed (option not recovered) | Per-effect Damage snapshot | Source Pending Verification |
| G09.TC9 | Confirmed (option not recovered) | Game Tick timing without fixed tick-rate assumption | Source Pending Verification |
| G09.TC10 | Confirmed (option not recovered) | Typed targeting and eligibility recheck | Source Pending Verification |
| G09.TC11 | Confirmed (option not recovered) | Typed Damage Event | Source Pending Verification |
| G09.TC12 | Confirmed (option not recovered) | Damage Type determines defenses | Source Pending Verification |
| G09.TC13 | Confirmed (option not recovered) | Armor/Resistance → Redirect → Shield → HP | Source Pending Verification |
| G09.TC14 | Confirmed (option not recovered) | Redirect retains Damage properties; no second Guardian defense | Source Pending Verification |
| G09.TC15 | Confirmed (option not recovered) | hitConfirmed separate from damageApplied | Source Pending Verification |
| G09.TC16 | Confirmed (option not recovered) | Typed Status Instance identity and payload | Source Pending Verification |
| G09.TC17 | Confirmed (option not recovered) | Same-source status key | Source Pending Verification |
| G09.TC18 | Confirmed (option not recovered) | Refresh retains ID and increments version | Source Pending Verification |
| G09.TC19 | Confirmed (option not recovered) | Periodic/expiry queue and version validation | Source Pending Verification |
| G09.TC20 | Confirmed (option not recovered) | Independent statuses and aggregation policies | Source Pending Verification |
| G09.TC21 | Confirmed (option not recovered) | Typed Shield Instance identity | Source Pending Verification |
| G09.TC22 | Confirmed (option not recovered) | Oldest-first Shield absorption | Source Pending Verification |
| G09.TC23 | Confirmed (option not recovered) | Shield piercing bypass | Source Pending Verification |
| G09.TC24 | Confirmed (option not recovered) | Same-source Shield recast reset | Source Pending Verification |
| G09.TC25 | Confirmed (option not recovered) | Ability-specific death/Fusion cleanup | Source Pending Verification |
| G09.TC26 | Confirmed (option not recovered) | Typed Projectile Instance | Source Pending Verification |
| G09.TC27 | Confirmed (option not recovered) | Per-ability projectile targeting | Source Pending Verification |
| G09.TC28 | Confirmed (option not recovered) | Per-Enemy collision Hit Events | Source Pending Verification |
| G09.TC29 | Confirmed (option not recovered) | Per-projectile target hit registry | Source Pending Verification |
| G09.TC30 | Confirmed (option not recovered) | Fired projectile persistence and unfired cancellation | Source Pending Verification |
| G09.TC31 | Confirmed (option not recovered) | Activation Instance ID and execution state | Source Pending Verification |
| G09.TC32 | Confirmed (option not recovered) | Atomic validation/Crystal spend/Activation creation | Source Pending Verification |
| G09.TC33 | Confirmed (option not recovered) | ACTIVE/PAUSED/COMPLETED/CANCELLED states | Source Pending Verification |
| G09.TC34 | Confirmed (option not recovered) | Per-ability Stun interaction | Source Pending Verification |
| G09.TC35 | Confirmed (option not recovered) | Death/Fusion cancels pending actions | Source Pending Verification |
| G09.TC36 | Confirmed (option not recovered) | Scheduled Tick + Insertion Sequence | Source Pending Verification |
| G09.TC37 | Confirmed (option not recovered) | Checkpoint full gameplay/effect/event/ID state | Source Pending Verification |
| G09.TC38 | Confirmed (option not recovered) | Restore exact progress without restart | Source Pending Verification |
| G09.TC39 | Confirmed (option not recovered) | Identity/version/generation validation | Source Pending Verification |
| G09.TC40 | Confirmed (option not recovered) | Deterministic replay from checkpoint and inputs | Source Pending Verification |
| G09.TC41 | Confirmed (option not recovered) | Schema validation on creation | Source Pending Verification |
| G09.TC42 | Confirmed (option not recovered) | Dynamic eligibility recheck at execution | Source Pending Verification |
| G09.TC43 | Confirmed (option not recovered) | APPLIED/SKIPPED/FAILED and reasons | Source Pending Verification |
| G09.TC44 | Confirmed (option not recovered) | Atomic commit; no partial precommit | Source Pending Verification |
| G09.TC45 | Confirmed (option not recovered) | Gameplay invalidation vs contract violation vs failure | Source Pending Verification |
| G09.TC46 | Confirmed (option not recovered) | Primitive and per-ability test layers | Source Pending Verification |
| G09.TC47 | Confirmed (option not recovered) | CR/GR integration matrix | Source Pending Verification |
| G09.TC48 | Confirmed (option not recovered) | Canonical state and ordered-event comparisons | Source Pending Verification |
| G09.TC49 | Confirmed (option not recovered) | Ability PASS criteria and blocker GAP | Source Pending Verification |
| G09.TC50 | Confirmed (option not recovered) | Design Complete distinct from Implementation Verified | Source Pending Verification |

## FR1–FR25

| Decision ID | Selected option | Reported rule | Evidence |
|---|---|---|---|
| G09.FR1 | A | Comprehensive Final Review | Source Pending Verification |
| G09.FR2 | A | Shield reset preserves ID and original creation order | Source Pending Verification |
| G09.FR3 | A | Stun pauses pending multihit delay | Source Pending Verification |
| G09.FR4 | A | Battle Generation and Effect Version independent | Source Pending Verification |
| G09.FR5 | A | Buff key Target+Type+Source+Ability | Source Pending Verification |
| G09.FR6 | A | Independent Source and Target buff lifecycle | Source Pending Verification |
| G09.FR7 | A | Same-instant collision ordered Stable Entity ID | Source Pending Verification |
| G09.FR8 | A | Atomic Hit Claim + Damage Commit | Source Pending Verification |
| G09.FR9 | A | Atomic State + Event Queue Commit | Source Pending Verification |
| G09.FR10 | A | Checkpoint only at atomic boundary | Source Pending Verification |
| G09.FR11 | A | Restore PAUSED Activation with semantic validation | Source Pending Verification |
| G09.FR12 | A | Restore projectile simulation cursor | Source Pending Verification |
| G09.FR13 | A | Preserve insertion sequence and next counter | Source Pending Verification |
| G09.FR14 | A | Strict Design Closure rules | Source Pending Verification |
| G09.FR15 | A | Cross-system G01–G09 audit | Source Pending Verification |
| G09.FR16 | A | Transactional RNG and ID allocation | Source Pending Verification |
| G09.FR17 | A | Finalize tick then close gameplay on terminal | Source Pending Verification |
| G09.FR18 | A | Terminal commit/recovery boundary | Source Pending Verification |
| G09.FR19 | A | Safe failure isolation or fail-stop | Source Pending Verification |
| G09.FR20 | A | Evidence-based audit | Source Pending Verification |
| G09.FR21 | C | Seek original G07 Owner terminal decision | Source Pending Verification |
| G09.FR22 | A | Hold GAP-01 Pending Evidence | Source Pending Verification |
| G09.FR23 | A | Cancel uncommitted commands on Recovery | Source Pending Verification |
| G09.FR24 | A | Reject gameplay input during RECOVERING | Source Pending Verification |
| G09.FR25 | A | Evidence Hold & Audit Handoff | Source Pending Verification |

## Coverage gaps

- G09 General 13: group summary only; original individual IDs not recovered.
- G09 12 abilities / 216: ability summaries available, individual decision IDs not recovered.
- G01–G08 / 199: system summaries available, individual decision IDs not recovered.
- Original approval links for the 110 rows: still pending; this file does **not** certify source verification.

See [Decision Index](../DECISION_INDEX.md), [Source Register](../SOURCE_REGISTER.md), [G09 Technical Contract](../contracts/G09-TECHNICAL-CONTRACT.md) and [GAP Register](../audits/GAP_REGISTER.md).
