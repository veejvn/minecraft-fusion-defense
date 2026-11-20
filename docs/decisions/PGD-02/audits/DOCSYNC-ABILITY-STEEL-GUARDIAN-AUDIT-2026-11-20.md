# PGD-02 — Documentation Sync Audit: Ability Catalog & Steel Guardian

**Audit ID:** PGD-02.DOC-09 A  
**Date:** 2026-11-20  
**Scope:** DOCSYNC-01 (Ability Catalog), DOCSYNC-02 (PGD-01 Steel Guardian), and cross-references to G09.  
**Mode:** READ-ONLY COMPARISON + NEW REPORT. No existing document is modified.  
**Status:** Documentation synchronization analysis; **not** a new Owner gameplay decision, **not** Implementation Verified.

## Source register and evidence levels

| Source | Directly inspected | Evidentiary meaning |
|---|---|---|
| [Documentation Policy](../../../DOCUMENTATION_POLICY.md) | Yes | Markdown in `docs/` is authoritative; Draft/Proposed/TBD unapproved; Owner's current explicit request takes priority |
| [Ability Catalog](../../../game-design/ABILITY_CATALOG.md) | Yes | Existing Draft v1.0 baseline: 11 Draft ability effects and Iron Bastion identity confirmed/effects TBD |
| [PGD-01 Steel Guardian](../../PGD-01-STEEL-GUARDIAN.md) | Yes | Original repository Owner-confirmed identity/recipe; mechanics still TBD in that record |
| [G09 Ability Register](../registers/G09-ABILITY-REGISTER.md) | Yes | Later conversation-derived design transcription; original 216 individual decision IDs and approvals **not recovered** |
| [G09 system summary](../systems/G09.md) | Yes | Later conversation-derived common Crystal and 12 ability rules; source verification pending |
| [GAP Register](GAP_REGISTER.md) | Yes | Historical DOCSYNC-01/DOCSYNC-02 tracking |
| [New G07 Owner Decision](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md) | Yes | Explicit new Owner confirmation for terminal rule, unrelated to approval of ability details |

**Authority warning:** Repository presence alone does not upgrade G09 conversation-derived summaries to individually source-verified Owner approvals. Conversely, an older Draft/TBD catalog does not automatically invalidate later confirmed decisions. This audit identifies divergence and the evidence required before synchronization.

## DOCSYNC-01 — Ability Catalog comparison

### A. Shared activation contract

| Topic | Ability Catalog Draft v1.0 | Later PGD-02 G09 summary | Assessment |
|---|---|---|---|
| Ability count | 12 required; 11 Draft effect entries + Steel Guardian identity with effects TBD | 12 ability specifications described | Same count; different approval/detail status |
| Power Crystal cost | Per-ability `powerCrystalCost` TBD; examples explicitly placeholders | One Power Crystal per valid activation | **DOCUMENTATION SYNC + source verification** |
| Cooldown | Per-ability configurable; applicability/duration TBD | Immediate activation, **no cooldown** | **DOCUMENTATION SYNC + source verification** |
| Activation UX | Select Defender/Ability and target; actual UX TBD | Drag/drop Crystal onto Defender | **DOCUMENTATION SYNC + source verification** |
| Commit | Atomic consumption/effect creation proposed; exact commit timing TBD | Atomic consume + activation, invalid action refunds/no spend | More explicit G09 contract; verify original approvals |
| Valid targets | Generic targeting, Lane scope TBD per ability | Per-ability targeting/eligibility and stable Entity ID ties | Specific design details not yet reflected in catalog |
| State restrictions | PLAYING required, Pause blocks activation | G09 recovery explicitly rejects gameplay input; other states governed by game state contract | Supplementary contract; no automatic contradiction |
| Data/API names | Validation codes, primitive list and JSON schema proposed | Typed primitives and execution contract described | Do not promote Draft API names or placeholder numbers to Confirmed |

### B. Per-ability discrepancy matrix

| Defender / Ability | Ability Catalog existing state | Later G09 recorded specification | Sync classification |
|---|---|---|---|
| Snow Golem / Blizzard | Slow region/Lane, radius and values TBD | Same Lane; -50% movement, 5s; refresh/strongest Slow | Draft/TBD → later specified |
| Iron Golem / Earthquake | Area Damage, optional Stun/Knockback, numbers TBD | Same Lane; 3× Attack Damage + 2s Stun | Draft/TBD → later specified; do not infer Knockback |
| Skeleton / Arrow Storm | Projectile count/interval/targets TBD | 8 arrows every 0.2s; 100% Damage each; retarget at firing | Draft/TBD → later specified |
| Wolf / Pack Frenzy | Self Attack Speed/Damage buff values TBD | +100% Attack Speed, +50% Attack Damage, 8s | Draft/TBD → later specified |
| Blaze / Inferno | Fire Damage/Burn values, stacking TBD | 3× Fire Damage, Burn 25% Attack Damage/s for 5s | Draft/TBD → later specified |
| Skeleton Sniper / Piercing Barrage | Projectile count/pierce limit TBD | One merged projectile; 600% Damage, unlimited pierce, 2× speed | Draft/TBD → later specified |
| Ice Golem / Absolute Zero | Freeze scope/duration and immunity TBD | All present Enemies across 5 Lanes; Freeze 4s; immunity/resistance | Draft/TBD → later specified |
| Frost Guardian / Glacial Fortress | Shield/Slow values, area, absorption TBD | Shield 50% Max HP; one-tile-front Slow area -50% for 5s | Draft/TBD → later specified |
| Flame Fang / Wildfire Rush | Hit count, cadence, Burn, mobility not confirmed | Five stationary melee hits 0.2s apart; Burn on hit | Later specifies **stationary**, no dash inferred |
| Inferno Archer / Meteor Arrow Rain | Arrow count, area, target selection TBD | Eight arrows 0.2s apart; fixed 3×3 area; impact tile lock; Burn | Draft/TBD → later specified |
| Alpha Wolf / Alpha Howl | Ally range, self inclusion, buff values TBD | 3×3 including self; +100% Attack Speed/+50% Attack Damage, 8s | Draft/TBD → later specified |
| Steel Guardian / Iron Bastion | Confirmed identity/name/ID only; effects TBD | Shield 100% current Max HP + 8s dynamic 3×3 50% ally Damage redirect | **DOCSYNC-01 and DOCSYNC-02** |

**Source limitation:** G09 Ability Register groups reported design rules by ability but does not provide original individual 216 Decision IDs or message-level approvals. This matrix is **not** a certification that all 216 decisions are independently verified.

### C. Risk of copying obsolete placeholders

The Ability Catalog contains a JSON example for `glacial_fortress` with placeholder Shield `100`, duration `3000ms`, Slow `30%`, duration `2000ms`. These are explicitly **illustrative and not approved values**. Do not transfer them into runtime balance or treat them as conflicts against G09's Shield 50% Max HP / Slow -50% / 5s.

Similarly, proposed API validation codes and primitive lists are not automatically approved runtime interfaces.

## DOCSYNC-02 — Steel Guardian / Iron Bastion

### Identity that PGD-01 actually confirms

- Defender: Steel Guardian, ID `steel_guardian`, Tier 2 Fusion Defender.
- Recipe: `iron_golem` + `iron_golem`, Recipe ID `fusion_steel_guardian`; unlocked at start.
- Gameplay identity: Crowd Control Guardian; normal attack **Crushing Strike**.
- Special Ability: **Iron Bastion**, ID `iron_bastion`; defensive identity.

### Details PGD-01 still marks TBD

PGD-01 does **not** confirm the actual Iron Bastion effect mechanism, area, duration, Crystal cost/cooldown, Damage/Shield contract, or numerical values. It also leaves Crushing Strike's precise control effect, range, damage and combat parameters TBD.

### Later G09 Iron Bastion description

- Self Shield = **100% current Max HP**, snapshotted on activation; persists until broken.
- Dynamic **3×3 ally protection** for **8 seconds**.
- Redirect **50% of ally post-Armor/Resistance Damage** to Guardian, without reapplying Guardian Armor/Resistance.
- Guardian Shield absorbs redirected share before HP; ally Shield processes its remaining share.
- Repeat Crystal activation resets Shield/protection without stacking; Guardian death/Fusion ends effect.
- Nearest eligible Guardian by Manhattan distance, ties by stable Entity ID; shield piercing retained in redirected and remaining shares.

**Assessment:** PGD-01 identity is not contradicted. Its older TBD Iron Bastion effect section is **less complete than the later G09 transcription**. The newer description needs original-decision traceability before an authorized sync can mark individual parameters Source Verified. **Crushing Strike remains TBD**; do not assume Iron Bastion decisions resolve Crushing Strike.

## Terminal Priority note — separate from DOCSYNC-01/02

The G09 Ability Register still contains a historical line saying `G07.GAP-01 PENDING EVIDENCE`. A **later explicit Owner decision**, [PGD-02.G07.TERMINAL-PRIORITY B](../owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md), resolves the **current gameplay rule** in favor of First Resolved Terminal Event Wins. The earlier G07 source provenance remains pending. See [GAP-01 Resolution Addendum](GAP-01-RESOLUTION-ADDENDUM-2026-11-20.md). No earlier file is rewritten in this audit.

## Findings and recommended sync sequence (not performed)

| ID | Finding | Severity for documentation | Suggested next action |
|---|---|---|---|
| DOCSYNC-01A | 11 Draft ability effect entries vs 12 later detailed G09 specs | High | Trace original G09 approvals; then prepare catalog sync proposal |
| DOCSYNC-01B | Crystal activation UX, cost and cooldown differ in detail | High | Verify Owner decisions, define exact supersession of catalog TBD fields |
| DOCSYNC-01C | Catalog's placeholder JSON could be misread as approved balance | Medium | Preserve placeholder warnings and clearly distinguish approved values |
| DOCSYNC-02A | PGD-01 Iron Bastion effects TBD vs later detailed G09 | High | Preserve PGD-01 historical identity and prepare separately approved addendum/sync |
| DOCSYNC-02B | Crushing Strike effect remains TBD | Medium | Keep open; do not infer from Iron Bastion |
| EVIDENCE-01 | 216 individual G09 ability decision IDs not recovered | High for traceability | Recover original approval records before Source Verified labeling |
| VERIFY-01 | No runtime implementation tests | Separate verification track | Develop test specification after contract review |

**No automatic gameplay GAP is declared solely from documentation lag.** No new gameplay mechanics or implementation approval is made by this audit.

## Preservation and closure boundary

- **Only this new report is added.** No edits to Ability Catalog, PGD-01, G09 Register, GDD, Game Engine Architecture, GAP Register or other existing files.
- **DOCSYNC-01 and DOCSYNC-02 remain OPEN** until a separately authorized synchronization or addendum.
- **GAP-01 gameplay rule remains resolved** by the newer Owner decision; original G07 historical provenance remains pending.
- **Global PGD-02 Design Complete is not asserted.**
