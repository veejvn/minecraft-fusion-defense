# Steel Guardian / Iron Bastion — PGD-02 G09 Addendum

**Authorization:** PGD-02.DOC-11 A (2026-11-20), additive document only.  
**Status:** DOCUMENTATION ADDENDUM — later G09 conversation-derived details, **Confirmed — Source Pending Verification** for original individual approvals. Not a new Owner gameplay approval or implementation verification.  
**Historical baseline preserved:** [PGD-01 Steel Guardian](../../PGD-01-STEEL-GUARDIAN.md).  
**Companion:** [Ability Catalog G09 Addendum](ABILITY-CATALOG-G09-ADDENDUM-2026-11-20.md).  
**Proposal:** [DOC-10 Sync Proposal](../proposals/DOCSYNC-ABILITY-STEEL-GUARDIAN-PROPOSAL-2026-11-20.md).

## PGD-01 directly confirmed identity (repository evidence)

| Property | Value |
|---|---|
| Defender | Steel Guardian |
| Entity ID | `steel_guardian` |
| Tier/class | Tier 2 Fusion Defender |
| Fusion inputs | `iron_golem + iron_golem` |
| Recipe ID | `fusion_steel_guardian` |
| Recipe unlock | Unlocked at start |
| Gameplay identity | Crowd Control Guardian |
| Normal attack | Crushing Strike |
| Special Ability | Iron Bastion |
| Ability ID | `iron_bastion` |

PGD-01 explicitly says these identities **are not executable effect definitions**. Its Iron Bastion mechanics and combat parameters were TBD when written.

## Later G09 Iron Bastion effect transcription — Source Pending Verification

1. **Activation:** valid Crystal activation follows G09 common rule (one Crystal, immediate, no cooldown). Self-Shield does not require an Enemy.
2. **Shield:** on activation, self Shield equals **100% current Max HP**, snapshotted then. Shield persists until broken; its lifetime is **not limited to the 8-second protection duration**.
3. **Protection:** dynamic 3×3 area around Steel Guardian protects eligible allied Defenders for **8 seconds**. Eligible allies moving into/out of area are determined dynamically; do not treat the initial recipient set as a fixed snapshot.
4. **Redirect:** **50% of ally Damage after Armor/Resistance** is redirected to Steel Guardian. Guardian does not apply its own Armor/Resistance a second time to the redirected portion.
5. **Absorption:** redirected Damage goes to Guardian Shield, then HP; the ally's remaining portion goes through the ally Shield, then HP. Shield-piercing properties persist on both redirected and retained shares.
6. **Multiple Guardians:** nearest eligible Guardian by **Manhattan distance**, tie broken by **stable Entity ID**; do not arbitrarily stack multiple redirects.
7. **Reactivation:** same-source recast resets Shield amount and 8-second protection without stacking. G09 technical contract says Shield reset preserves Shield Instance ID and Creation Order.
8. **Lifecycle:** Guardian death/Fusion ends protection and its Shield. Redirect can kill Guardian; excess redirected Damage does **not** overflow back to ally.
9. **Ordering:** Armor/Resistance → Redirect → Shield → HP; follow atomic Hit Claim/Damage and State/Event Queue contracts.

These are the later G09 transcription, not individually source-verified approvals. The original per-ability decision IDs and Owner messages were not recovered.

## Explicitly unresolved — do not fill by inference

- **Crushing Strike:** exact Stun/Knockback/Slow behavior, conditions, range, Damage, timing and target selection remain **TBD**. Iron Bastion's Shield/redirect does not establish Crushing Strike's normal-attack effects.
- Steel Guardian's base Max HP, Attack Damage, Attack Speed, Attack Range, and normal-attack targeting remain TBD in PGD-01.
- Animation/VFX, UI implementation and exact serialization/API names not established by these sources.
- Original G09 approval traceability still pending; no runtime tests run.

## Documentation status and precedence

- PGD-01's **identity** is directly repository-confirmed and preserved.
- PGD-01's **historical TBD effect section** remains unchanged. This addendum documents the **later G09 source-pending specification**, not a retroactive alteration of PGD-01.
- [Ability Catalog Draft](../../../game-design/ABILITY_CATALOG.md) remains unchanged; its Iron Bastion effect is marked TBD in that earlier document.
- **DOCSYNC-02:** ADDENDUM CREATED; in-place synchronization remains **OPEN** pending a separate Owner decision.
- No new gameplay mechanics are invented; no `Design Complete` or `Implementation Verified` status is claimed.

**Preservation:** only a new file; no existing file edited or overwritten.
