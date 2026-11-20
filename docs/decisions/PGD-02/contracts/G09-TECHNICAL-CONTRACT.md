# G09 — Technical Contract TC1–TC50

**Evidence:** Confirmed — Source Pending Verification. **Implementation:** NOT VERIFIED.

| IDs | Contract summary |
|---|---|
| TC1–TC5 | Typed primitives; Ability Executor and specialized subsystems; deterministic atomic transitions; Unified Event Queue |
| TC6–TC10 | Battle-unique Effect ID; persistent source/ability/activation provenance; snapshots; Game Tick; typed eligibility |
| TC11–TC15 | Typed Damage Event; Armor/Resistance → Redirect → Shield → HP; piercing; hitConfirmed distinct from damageApplied |
| TC16–TC20 | Status identity and source key; refresh preserves ID/increments version; periodic/expiry events; independent stacking policies |
| TC21–TC25 | Shield identity; oldest-first; piercing bypass; same-source reset; death/Fusion cleanup |
| TC26–TC30 | Projectile identity; targeting; collisions; per-target hit registry; fired/unfired lifecycle |
| TC31–TC35 | Activation ID and ACTIVE/PAUSED/COMPLETED/CANCELLED; atomic Crystal spend; Stun/death/Fusion |
| TC36–TC40 | Scheduled Tick+Insertion Sequence; checkpoint/restore; generation/version checks; deterministic replay |
| TC41–TC45 | Schema validation and execution rechecks; APPLIED/SKIPPED/FAILED; atomic transition; diagnostics |
| TC46–TC50 | Primitive/ability test matrix; CR1–CR25, GR1–GR10; canonical comparisons; separate design and implementation verification |

## FR constraints

FR2: shield reset preserves identity/creation order. FR3: Stun preserves multihit remaining delay. FR4: Battle Generation and Effect Version independent. FR5–FR6: Buff source/target lifecycle and key. FR7–FR8: collision ordering and atomic hit claim. FR9–FR10: atomic queue/state and checkpoint boundary. FR11–FR13: restore paused activation, projectile cursor and insertion sequences. FR16: transactional RNG/IDs. FR17–FR19: terminal boundary and safe failure handling. FR23–FR24: cancel uncommitted input; reject input during RECOVERING.

**G07 Terminal Priority remains GAP-01 PENDING EVIDENCE.** This contract does not choose the winner or certify runtime tests.
