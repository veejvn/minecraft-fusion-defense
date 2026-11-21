**Repository path:** `docs/product/ROADMAP.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Mục tiêu

Lập các nhóm công việc để đi từ tài liệu thiết kế đến MVP Desktop Web chơi được. **Workstream categories remain Proposed; the technical dependency sequence in §3A is Owner-approved.** This is not a sprint schedule, deadline or release commitment.

## 2. Phạm vi MVP đã xác nhận

- 2D Pixel Art, side-view, single-player Desktop Web.
- Một Grassland Level, Battlefield 5 Rows × 9 Columns, 5 Waves.
- 5 Base Defenders, 4 Enemies, 7 Fusion Recipes, 7 Fusion Defenders, 12 required Special Abilities (11 existing draft IDs; Steel Guardian `iron_bastion` (effects TBD)).
- Energy dùng Summon; Power Crystal dùng Special Abilities.
- Fusion miễn phí, không giới hạn Lane/khoảng cách; Tier-1 + Tier-1 → Tier-2; Output tại Target Cell.
- Pause, Victory và Defeat theo Gameplay Mechanics.

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

**Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.

## 3. Workstreams (categories; execution sequence approved in §3A)

| Workstream | Kết quả mong đợi | Điều kiện / phụ thuộc |
| --- | --- | --- |
| Project Foundation | Workspace, tooling và kiểm tra codebase | Package layout, scripts TBD |
| Data Foundation | Definitions, IDs và validation | Schemas, balance values TBD |
| Game Runtime | Grid, Entities, simulation, lifecycle | Tick/order/bridge TBD |
| Core Gameplay | Summon, Resources, Combat, Fusion | Gameplay rules Confirmed; thông số còn TBD |
| Level & Abilities | Grassland, 5 Waves, 12 required Abilities | Wave/Ability config cần duyệt |
| UI & Assets | HUD, controls, sprites, audio | Asset specifications TBD |
| QA & Local acceptance | Manual playthrough + core automated tests, measured performance, Local-only internal testing | Test details TBD; không có online deployment requirement |
| Persistence & progression | Save/Resume, persistent Victory-based unlocks, Achievements/Collection | Storage/schema/tracking TBD; unlock mapping Confirmed |

Các workstreams có thể thực hiện song song hoặc chia nhỏ theo dependency gates tại §3A; không tự gán ngày, mức ưu tiên hoặc người phụ trách.

## 3A. Owner-approved technical execution sequence (2026-11-21)

**Status: OWNER-APPROVED TECHNICAL DEPENDENCY SEQUENCE.** This section supersedes the earlier "workstreams have no agreed order" statement for technical dependency planning only. The workstreams above remain useful categories; this is not a sprint schedule or release commitment. **T-05 was separately authorized, implemented and technically accepted on 2026-11-21. T-06 was implemented at `147e8bd` and technically accepted by the Owner across all 26 acceptance gates on 2026-11-21 (using explicit test fixtures; production data remains TBD).** No new MVP gameplay content is approved by this roadmap.

| Task | Planned deliverable | Dependency / approval gate |
| --- | --- | --- |
| T-02 | Phaser/React host foundation | Existing implementation; retain prior acceptance evidence |
| T-03 | Game Data foundation | Existing implementation; production definitions still subject to approval |
| T-04 | Core simulation foundation | Owner-accepted; preserve existing contracts |
| CI improvement | Add `@mfd/game-data` Vitest step to workspace CI | Implemented in `.github/workflows/ci.yml`; verified passing in CI runs `44846418049` and `44850790552` |
| **T-05 — TECHNICALLY ACCEPTED** | **Battlefield 5×9, Defender occupancy, Entity Registry, deterministic IDs, headless runtime integration** | Implemented at `3ee3d30`; 14/14 acceptance gates Owner-accepted; [acceptance report](../reports/T-05-FINAL-ACCEPTANCE.md); [CI success](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44846418049) |
| **T-06 — TECHNICALLY ACCEPTED** | **Summon, placement, Energy/Power Crystal resources, collectible lifecycle, deterministic random spawn and Pending Wave Rewards** | Implemented at `147e8bd` (+ test supplement); 26/26 acceptance gates Owner-accepted; [acceptance report](../reports/T-06-FINAL-ACCEPTANCE.md); [CI success](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44850790552); production data still TBD |
| **T-07 — TECHNICALLY ACCEPTED** | **Enemy movement, combat, targeting** | Implemented at `7b7c37d` (D-25–D-38 = A); 20/20 acceptance gates PASS; [acceptance report](../reports/T-07-FINAL-ACCEPTANCE.md); [CI success](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44877738893); combat stats/behaviors still TBD |
| **T-08 — IMPLEMENTED / LOCAL 19/20 PASS (REMOTE CI PENDING)** | **Fusion mechanics** | Implemented locally in `packages/game` (`D-39`–`D-48 = A`); `AC-01`–`AC-19` & local checks of `AC-20` pass (`110/110` game tests, `25/25` game-data tests, typecheck, build); remote CI run pending commit & push; [acceptance report](../reports/T-08-FINAL-ACCEPTANCE.md); Fusion Defender combat stats still TBD |
| **T-09 — IMPLEMENTED / LOCAL 19/20 PASS (REMOTE CI PENDING)** | **Grassland five waves, victory/defeat** | Implemented locally in `packages/game` (`D-49`–`D-58 = A`); `AC-01`–`AC-19` & local checks of `AC-20` pass (`126/126` game tests, `25/25` game-data tests, typecheck, build); remote CI run pending commit & push; [acceptance report](../reports/T-09-FINAL-ACCEPTANCE.md); Wave 1–5 spawn & reward data still TBD |
| T-10 | Special abilities | T-07 and explicitly approved executable ability/effect contracts |
| T-11 | Save & Resume, progression | Stable runtime snapshot contract and terminal/progression semantics |
| T-12 | UI, assets and playable integration | Incremental parallel work allowed once its interfaces are approved |
| T-13 | MVP QA and local acceptance | Integrated required gameplay, automated checks and manual 5-wave playthrough |

Dependencies are minimum planning gates, not a claim that all implementation decisions are closed. T-06/T-07/T-08 may be partially parallel after T-05 contracts stabilize. T-12 may progress incrementally. The Owner must approve each task's actual scope before coding.

### T-05 approved design choices and execution boundary

- **D-01 A:** Deterministic entity ID counter stored in transactional Battle State; rollback must not consume IDs.
- **D-02 A:** Headless-first TypeScript runtime; do not change Phaser Hello Scene or React Host.
- **D-03 A:** Internal test/runtime commands only; do not expose a new public React/Phaser command API.
- Full plan and fourteen acceptance gates: [T-05 Battlefield & Runtime Integration Implementation Plan](../development/T-05-BATTLEFIELD-RUNTIME-INTEGRATION-IMPLEMENTATION-PLAN.md).
- T-05 is **OWNER-ACCEPTED TECHNICALLY (2026-11-21)**, not merely planned: implementation commit [`3ee3d30`](https://github.com/veejvn/minecraft-fusion-defense/commit/3ee3d30fe455624ae52f35e00cb31744ce6639f6), [14-gate acceptance report](../reports/T-05-FINAL-ACCEPTANCE.md) and [successful CI run 44846418049](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44846418049). This does **not** mean the gameplay MVP is complete.
- **T-06 is OWNER-ACCEPTED TECHNICALLY (2026-11-21):** implementation commit [`147e8bd`](https://github.com/veejvn/minecraft-fusion-defense/commit/147e8bde209bf1f99e2ba341732c874a05913d65), **21 decisions D-04–D-24** (**D-08=B; all other D-04–D-24=A**), [26-gate acceptance report](../reports/T-06-FINAL-ACCEPTANCE.md) (26/26 PASS) and [successful CI run 44850790552](https://github.com/veejvn/minecraft-fusion-defense/actions/runs/44850790552). See [plan and readiness specification](../development/T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md). Production data still TBD: Base Defender summon costs/cooldowns, Energy Item rate/amount/position distribution and interactive region, Wave 1–5 rewards. This does **not** approve production balance values or downstream T-07–T-13 coding.

### Planning constraints

Preserve Confirmed MVP gameplay and the [Documentation Policy](../DOCUMENTATION_POLICY.md). Draft, Proposed, Prototype and TBD game values remain unapproved. In particular, do not bypass Game Data runtime validation to invent production Ability effects. G07 terminal priority for future implementation follows the explicit [2026-11-20 Owner decision](../decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md): first valid resolved terminal event wins; historical source provenance remains separately pending. Full G03–G05 checkpoint/recovery and persistence are not part of T-05.

## 4. MVP Completion Criteria

Đối chiếu với [MVP Scope — Minecraft Fusion Defense](MVP_SCOPE.md) và [Testing Strategy — Minecraft Fusion Defense](../development/TESTING_STRATEGY.md). Không tuyên bố hoàn thành nếu gameplay, tests hoặc thông số chính thức chưa được kiểm chứng.

## 5. Open Decisions

- Thứ tự phụ thuộc kỹ thuật T-05–T-13: **Owner-approved 2026-11-21 (§3A)**; milestones, timeline và release date: **TBD**.
- Phụ thuộc kỹ thuật đã được duyệt (§3A); ưu tiên sprint và phân công: **TBD**.
- Gameplay balance, Wave Composition, Ability Costs và Cooldowns: **TBD**.
- Tiêu chí release, CI/CD, hosting và performance benchmark: **TBD**.
- Các ý tưởng ngoài MVP không tự đưa vào Roadmap.

## 6. Tham chiếu

- [MVP Scope — Minecraft Fusion Defense](MVP_SCOPE.md)
- [Development Workflow — Minecraft Fusion Defense](../development/DEVELOPMENT_WORKFLOW.md)
- [Documentation Policy](../DOCUMENTATION_POLICY.md)
