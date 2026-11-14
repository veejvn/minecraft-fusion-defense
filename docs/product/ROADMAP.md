**Repository path:** `docs/product/ROADMAP.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Mục tiêu

Lập các nhóm công việc để đi từ tài liệu thiết kế đến MVP Desktop Web chơi được. **Đây là Roadmap Proposed**, không phải thứ tự Sprint, deadline hoặc cam kết phát hành.

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

## 3. Workstreams (Proposed, chưa chốt thứ tự)

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

Các workstreams có thể thực hiện song song hoặc chia nhỏ sau khi chủ dự án xác nhận kế hoạch; không tự gán ngày, mức ưu tiên hoặc người phụ trách.

## 4. MVP Completion Criteria

Đối chiếu với [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb) và [Testing Strategy — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885). Không tuyên bố hoàn thành nếu gameplay, tests hoặc thông số chính thức chưa được kiểm chứng.

## 5. Open Decisions

- Thứ tự triển khai, milestones, timeline và release date: **TBD**.
- Ưu tiên các workstreams và phân công: **TBD**.
- Gameplay balance, Wave Composition, Ability Costs và Cooldowns: **TBD**.
- Tiêu chí release, CI/CD, hosting và performance benchmark: **TBD**.
- Các ý tưởng ngoài MVP không tự đưa vào Roadmap.

## 6. Tham chiếu

- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Development Workflow — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123)
- [Tình trạng tài liệu — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d)
