**Repository path:** `docs/architecture/DATA_ARCHITECTURE.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — các danh mục và luật Confirmed lấy từ tài liệu thiết kế; mô hình dữ liệu và cấu trúc file là Proposed/TBD.  
**Scope:** Nền tảng dữ liệu cho MVP; không phải schema code cuối cùng hoặc Runtime Config đã phê duyệt.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

Xác định các nhóm Game Data, ranh giới giữa dữ liệu tĩnh và trạng thái runtime, cách tham chiếu bằng ID và nguyên tắc validation. Không tự điền thông số cân bằng còn TBD.

## 2. Nguyên tắc dữ liệu

- **Data-driven:** Entity, Fusion, Ability, Level/Wave và tài nguyên được định nghĩa qua dữ liệu, không Hardcode giá trị cân bằng trong logic.
- **TypeScript + Zod:** dùng TypeScript cho types/contracts, Zod để validate dữ liệu trước khi đưa vào runtime.
- **IDs ổn định:** tham chiếu giữa definitions bằng technical IDs từ các catalog; không tự đổi tên hoặc tạo ID mới.
- **Phân biệt trạng thái:** Confirmed là quyết định đã chốt; Draft, Proposed, Prototype và TBD không phải cấu hình sản xuất.
- **Không trộn definitions và runtime state:** cấu hình mô tả loại Entity; runtime state mô tả instance đang chơi.
- **Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.
- Save snapshot trận và persistent unlock progression là hai nhóm dữ liệu riêng; không tự chọn storage backend/schema hoặc save triggers.
- **Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

## 3. Nhóm dữ liệu MVP

| Nhóm | Mục đích | Nguồn thiết kế |
| --- | --- | --- |
| Defender Definition | Base/Fusion Defender identity, tier, summon cost, combat stats, ability reference | Entity Catalog, Game Balancing |
| Enemy Definition | Enemy identity, stats, behavior, reward reference | Entity Catalog, Game Balancing |
| Fusion Recipe | Hai input Defender IDs và output Defender ID | Fusion Recipes |
| Ability Definition | Ability ID, owner, effect parameters, Power Crystal cost/cooldown | Ability Catalog |
| Level Definition | Grassland, Grid 5×9, resource settings, wave references | Level Design |
| Wave Definition | 5 Waves, spawn entries, timing, rewards | Level Design |
| Resource Configuration | Energy generation/items, Power Crystal items/rewards, caps | Gameplay Mechanics, Game Balancing |

MVP có 5 Base Defenders, 7 Fusion Defenders, 4 Enemy Types, 7 Recipes và 12 required Ability definitions (11 existing IDs + Steel Guardian Ability TBD). Không tự mở rộng các danh mục này.

**Confirmed content / TBD IDs:** Steel Guardian (Iron Golem + Iron Golem, Tier 2) thuộc 7 outputs. Entity ID, Recipe ID và Ability ID/name đều `TBD`, không tự đặt identifier hoặc schema. 12 required Ability definitions gồm 11 existing draft IDs và một Steel Guardian Ability TBD. Unlock mapping đọc theo Fusion Recipes; replay Victory cộng tiến độ, Fusion không là Victory prerequisite.

## 4. Definition và Runtime State

**Definitions (dữ liệu tĩnh):** các thuộc tính cấu hình dùng để tạo Entity/Ability/Wave.  
**Runtime State (dữ liệu thay đổi):** HP hiện tại, vị trí, Grid occupancy, Energy, Power Crystal, cooldowns, Wave progress, game state.

**Proposed:** tách dữ liệu definition khỏi runtime state để validation và unit testing dễ hơn. Tên interface, ownership, serialization và lifetime: TBD.

## 5. Relationships cấp cao

```txt
Level Definition
  ├── Grid / Resource Settings
  └── Wave Definitions
        └── Enemy Definition IDs

Defender Definition
  └── Ability ID → Ability Definition

Fusion Recipe
  ├── Input Defender ID A
  ├── Input Defender ID B
  └── Output Defender ID
```

- Recipe matching **không phụ thuộc thứ tự** input.
- Initial content chỉ bảy approved Tier-1 + Tier-1 → Tier-2 Recipes. Engine không có Tier ceiling, chỉ validate Recipe được duyệt; không tự tạo higher-tier content.
- Fusion không tiêu Energy hoặc Power Crystal; Source và Target không bị giới hạn Lane/khoảng cách.
- Output xuất hiện tại Target Cell; Source Cell trống.
- Không thêm trường `fusionEnergyCost` bắt buộc hoặc điều kiện cùng Lane/adjacent.

## 6. Validation Boundaries (Proposed)

1. Nạp definitions từ nguồn dữ liệu được chọn.
2. Validate cấu trúc dữ liệu bằng Zod.
3. Kiểm tra tính toàn vẹn tham chiếu: Defender IDs, Enemy IDs, Ability IDs, Recipe outputs và Wave spawn references.
4. Chỉ cung cấp dữ liệu hợp lệ cho Phaser runtime.
5. Báo lỗi rõ ràng nếu dữ liệu thiếu, tham chiếu sai hoặc chứa giá trị chưa được phê duyệt.

**TBD:** JSON/TS modules hay format khác; đường dẫn file; schema shape; default values; xử lý lỗi validation và build-time/runtime validation. Không tự chốt lựa chọn trong tài liệu này.

## 7. Quy ước đơn vị và dữ liệu mẫu

| Thuộc tính | Đơn vị / quy tắc |
| --- | --- |
| Attack Speed | attacks/second — Confirmed |
| Attack Range | Cells — Confirmed |
| Move Speed | Cells/second — Confirmed |
| HP, Damage, Costs, Cooldowns, Durations | Giá trị cụ thể TBD nếu chưa được phê duyệt |
| Wave Composition / Spawn Timing | TBD, không dùng bảng Draft làm Runtime Config chính thức |

Ví dụ JSON, số Prototype và `null` minh họa trong tài liệu thiết kế không phải dữ liệu runtime đã duyệt. Không tự tạo fallback balance values.

## 8. Các kiểm tra cần có

- References trỏ đến IDs tồn tại.
- Không có recipe trùng khi đảo thứ tự input.
- Bảy Recipe initial content có input Tier-1/output Tier-2 hợp lệ. Engine không dùng hard Tier ceiling, có thể đọc future approved Recipes qua dữ liệu.
- Ability owner tham chiếu Defender hợp lệ.
- Wave chỉ tham chiếu Enemy trong danh mục MVP.
- Level MVP có 5 Waves và Grid 5×9.
- Dữ liệu thiếu hoặc chưa được phê duyệt được báo rõ; không im lặng gán giá trị.

Các test cụ thể và cách xử lý trường hợp không hợp lệ thuộc `TESTING_STRATEGY.md`.

## 9. Open Decisions

| Vấn đề | Trạng thái |
| --- | --- |
| Định dạng và vị trí file definitions | TBD |
| Schema shape, optional/required fields, versioning | TBD |
| Phân tách definitions và save/runtime snapshots | Proposed / TBD |
| Validation tại build-time hay runtime | TBD |
| Ability cost/commit timing | TBD; caps, Enemy reward values/delivery đã Confirmed theo Gameplay Mechanics / Game Balancing |
| Fusion targeting / interaction cooldown | TBD; Output 100% own Max HP, no inherited statuses, attack-ready đã Confirmed |
| Thông số Balance và Wave Config chính thức | TBD |

AI Agent phải hỏi chủ dự án khi một quyết định chưa chốt ảnh hưởng trực tiếp tới code cần viết.

## 10. Tài liệu liên quan

- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
- [Entity Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951)
- [Fusion Recipes — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41)
- [Ability Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c)
- [Level Design — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca)
- [Game Balancing — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0)
