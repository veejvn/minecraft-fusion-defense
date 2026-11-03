**Đường dẫn repository:** `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`  
**Dự án:** Minecraft Fusion Defense  
**Trạng thái:** Draft v1.0 — các Gameplay Rules được dẫn từ tài liệu Confirmed; cách chia module, interface và trình tự nội bộ là Proposed/TBD.  
**Phạm vi:** Kiến trúc Phaser 3 cấp cao cho MVP; không mô tả thuật toán chi tiết hay chốt thông số Balance.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

Định nghĩa trách nhiệm của Game Runtime, các Game Systems và luồng giao tiếp với React để AI Agent có cơ sở triển khai từng phần. Runtime phục vụ một Grassland Level, Battlefield 5×9, 5 Waves, 5 Base Defenders, 4 Enemy Types, 7 Fusion Defenders và 12 required Special Abilities (11 existing draft IDs; Steel Guardian Ability TBD).

## 2. Ranh giới Runtime

- **Phaser 3:** rendering, battlefield input, Entity lifecycle, gameplay simulation, gameplay timers và game state.
- **React / Next.js:** app shell, menu, HUD và điều khiển UI ngoài gameplay.
- **Game Data:** definitions được xác thực trước khi đưa vào runtime; TypeScript + Zod theo `DATA_ARCHITECTURE.md`.
- React không cập nhật vị trí Entity theo từng frame; Phaser là nguồn sự thật của gameplay runtime.
- Local Desktop Web/internal testing; không online deployment hoặc backend trong MVP.
- **Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

## 3. Sơ đồ thành phần (Proposed)

```txt
React UI / HUD
     │ Commands            ▲ Events / UI Snapshots
     ▼                     │
  UI–Game Bridge (contract TBD)
             │
             ▼
        Phaser Game Runtime
        ├── Game State / Simulation Clock
        ├── Battlefield / Grid / Lane
        ├── Entity Lifecycle / Placement
        ├── Resource (Energy, Power Crystal)
        ├── Combat / Targeting
        ├── Fusion
        ├── Special Ability
        ├── Wave / Spawning
        └── Victory / Defeat
             ▲
             │ validated definitions
      Game Data + Zod
```

Đây là **sơ đồ trách nhiệm**, không phải danh sách class hoặc file bắt buộc. Có thể gộp hoặc tách module sau khi xem xét codebase thực tế.

## 4. Game Systems và trách nhiệm

| System | Trách nhiệm chính | Quy tắc / giới hạn |
| --- | --- | --- |
| Game State | Quản lý Playing, Pause, Victory, Defeat và lifecycle | Tên/trạng thái Loading, Ready còn Draft kỹ thuật |
| Simulation Clock | Cập nhật gameplay bằng fixed timestep; điều phối gameplay timers | Tick rate và thứ tự update nội bộ TBD |
| Battlefield / Grid | Quản lý 5×9 cells, occupancy của Defender và 5 Lanes | Enemy di chuyển liên tục theo Lane, không chiếm cell như Defender |
| Entity Lifecycle | Tạo, cập nhật, loại bỏ Defender/Enemy và dọn occupancy | Stats và targeting đọc từ definitions |
| Placement | Kiểm tra cell hợp lệ và điều kiện triệu hồi | Triệu hồi tiêu Energy; không tự thêm điều kiện |
| Resource | Energy/Items, Crystal/Items, Wave/Pending Rewards, Enemy rewards, spending | Values/caps/lifetimes đã Confirmed theo Gameplay Mechanics; Ability commit TBD |
| Combat / Targeting | Chọn mục tiêu, tấn công, HP, damage, death và status effects | Enemy behaviors theo từng definition; chi tiết TBD |
| Fusion | Validate approved Recipe data, consume inputs, create output | Không Tier ceiling; initial bảy Recipes; 0 cost, mọi Lane/distance, Target Cell/full HP/no statuses/attack-ready |
| Special Ability | Kích hoạt Ability riêng của từng Defender và áp dụng hiệu ứng | 12 required Ability definitions (11 existing IDs + Steel Guardian Ability TBD); costs/effects/commit timing TBD |
| Wave / Spawning | Đọc Wave Config, spawn Enemy, theo dõi tiến độ 5 Waves | Wave composition/timing TBD |
| Victory / Defeat | Phát hiện thắng/thua và kết thúc simulation | Defeat ngay khi Enemy vượt base; Victory sau 5 Waves và hết Enemy |

## 5. Gameplay State và vòng đời

Các mốc runtime cần hỗ trợ:

1. **Khởi tạo:** tải assets, definitions và kiểm tra dữ liệu trước khi bắt đầu gameplay.
2. **Playing:** nhận lệnh hợp lệ, cập nhật simulation, spawn, combat, resources và các điều kiện kết thúc.
3. **Paused:** đóng băng simulation và gameplay timers; không phát sinh Energy tự động.
4. **Victory:** hoàn tất 5 Waves và không còn Enemy đe dọa.
5. **Defeat:** bất kỳ Enemy nào vượt Base Boundary; không có Base HP hoặc Lives.

**Coding Planning TBD:** tên enum, Loading/Ready, full transition table, command policy ngoài collect/claim đã bị cấm trong Pause.

**Confirmed:** khi terminal state đã được resolve, không chuyển sang terminal state khác trong cùng trận.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.

## 6. Simulation và Rendering

- Gameplay hướng tới **fixed timestep** và mục tiêu hiển thị **60 FPS**.
- Logic gameplay dùng thời gian simulation, không phụ thuộc trực tiếp vào frame rate rendering.
- Pause phải dừng các hệ thống phụ thuộc simulation time: combat, movement, spawn, resource generation, cooldown và gameplay timers.
- Không cập nhật React HUD mỗi frame; chỉ gửi các thay đổi cần thiết hoặc snapshot phù hợp.
- **Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.
- **TBD:** tick duration, accumulator policy, chi tiết event generation/update ordering chưa được baseline chốt, animation/tween pause behavior, time scaling và phép đo hiệu năng.

## 7. Luồng nghiệp vụ chính

### 7.1. Summon Defender

1. Nhận yêu cầu triệu hồi và vị trí đặt.
2. Kiểm tra definition, cell hợp lệ, occupancy và Energy.
3. Nếu hợp lệ, tiêu Energy và tạo Base Defender tại cell.
4. Cập nhật Grid và phát thay đổi trạng thái cho HUD.

Chi tiết cooldown/validation và rollback: theo Gameplay Mechanics, phần chưa chốt vẫn TBD.

### 7.2. Fusion Defender

1. Người chơi kéo **Source** lên **Target**.
2. Kiểm tra hai Defender tồn tại, hợp lệ, Tier/IDs khớp Recipe được phê duyệt, enabled và đã unlock; không hardcode Tier ceiling. Initial content chỉ bảy Tier-1 + Tier-1 → Tier-2 Recipes; input order-independent. Initial Base Defenders: Iron Golem/Skeleton; initial Recipes: Skeleton Sniper/Steel Guardian — Confirmed.
3. **Không** kiểm tra hoặc trừ Energy/Power Crystal; **không** giới hạn khoảng cách hoặc Lane.
4. Khi thành công, tiêu thụ Source và Target, tạo Output Tier theo Recipe tại **Target Cell**, Source Cell thành trống. Bảy Recipe ban đầu cho Tier-2 outputs.
5. Cập nhật Grid, Entities và UI; nếu không hợp lệ, không tiêu thụ hai Defender.

**Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.

Fusion interaction cooldown và detailed event generation/concurrency edge cases vẫn TBD.

### 7.3. Resources và Special Abilities

- Energy tự sinh khi Playing và tăng qua Energy Items có thể click, không bắt buộc nằm đúng cell.
- Power Crystal là tài nguyên độc lập, đến từ Wave Rewards và Power Crystal Items.
- Special Ability chỉ sử dụng Power Crystal theo định nghĩa đã được phê duyệt; không dùng cơ chế Plant Food.
- **Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.
- **Confirmed:** random Power Crystal spawn độc lập: attempt đầu sau ngẫu nhiên 30–60 giây Game Time; mỗi attempt kế tiếp cách ngẫu nhiên 30–60 giây. Mỗi attempt thành công tạo một Item trị giá 1 Crystal tại cell ngẫu nhiên không có Defender; không có cell hợp lệ thì bỏ qua attempt. Không có cap riêng cho số Item cùng tồn tại; nhiều Item được phép trùng cell. Summon lên cell có Item được phép: auto-collect oldest-first đến giới hạn storage, Item dư giữ timer gốc; Item còn lại sau khi Defender bị loại bỏ. Click Item được ưu tiên hơn click Defender.
- **Confirmed — 03/11/2026:**

| Parameter | Giá trị |
| --- | --- |
| Initial Energy | 0 |
| Energy tại gameplay t=0 | +50 ngay lập tức, cộng trực tiếp |
| Passive Energy | +50 mỗi 3 giây Game Time sau t=0, cộng trực tiếp |
| Energy Cap | Unlimited |
| Initial Power Crystal | 0 |
| Power Crystal Cap | 5 |
| Energy Item Lifetime | 10 giây Game Time |
| Power Crystal Item Lifetime | 10 giây Game Time |

Pause dừng các timer Game Time và không cho collect/claim tài nguyên.
- **TBD:** Ability cost/effects/spend/commit/rollback; không còn TBD cho resource values/caps/lifetimes đã chốt.

### 7.4. Waves và kết thúc trận

- Wave System đọc cấu hình 5 Waves, spawn Enemy và theo dõi các đợt còn lại.
- Defeat khi Enemy vượt Base Boundary.
- Victory khi toàn bộ 5 Waves hoàn tất và không còn Enemy đe dọa.
- Không tự Hardcode Wave Composition hoặc reward từ các bảng Draft.

## 8. UI ↔ Phaser Communication (Proposed)

Đề xuất dùng một lớp **UI–Game Bridge** để tránh React phụ thuộc trực tiếp vào các Phaser Scenes/Entities.

| Chiều | Nhóm thông tin | Ví dụ (không phải API đã chốt) |
| --- | --- | --- |
| React → Game | Commands | yêu cầu Summon, Activate Ability, Pause/Resume |
| Phaser Input → Game | Battlefield Actions | chọn cell, click collectible, drag Fusion |
| Game → React | Events / Snapshots | Energy/Crystal thay đổi, Wave tiến độ, Game State, kết quả trận |

- Bridge API, event names, payloads, ownership, subscribe/unsubscribe và error handling: **TBD**.
- Không đưa live Entity position mỗi frame vào React state.
- Cần đảm bảo UI không trực tiếp sửa Game State mà bỏ qua validation của runtime.

## 9. Data và kiểm thử

- Game Runtime đọc definitions đã validate, không sử dụng Prototype hoặc JSON placeholder làm Balance chính thức.
- Attack Speed: `attacks/second`; Attack Range: `Cells`; Move Speed: `Cells/second`.
- Kiểm thử tối thiểu cần bao phủ: Fusion order-independent, Fusion không tiêu tài nguyên, Target Cell placement, Pause đóng băng timers, Victory/Defeat và validation của dữ liệu.
- Framework đã chọn: Vitest cho unit tests, Playwright cho E2E; cách tổ chức test thuộc `TESTING_STRATEGY.md`.

## 10. Open Decisions

| Vấn đề | Trạng thái |
| --- | --- |
| Scene lifecycle và cách phân tách Scenes/Systems | Proposed / TBD |
| Fixed timestep chi tiết và system update order | TBD |
| Game State enum, Loading/Ready, transitions | TBD |
| UI–Game Bridge contracts, command/event schemas | TBD |
| Cơ chế đồng bộ trạng thái, cleanup và error propagation | TBD |
| Collision, targeting, movement và status processing chi tiết | TBD |
| Ability Commit/Power Crystal spend timing | TBD; resource caps/overflow đã Confirmed |
| Detailed event generation/concurrency edge cases | TBD; simultaneous calculation và insertion-sequence resolution đã Confirmed |

Những vấn đề cần lựa chọn phải được trình bày cho chủ dự án trước khi AI Agent triển khai; không tự mặc định giải pháp.

## 11. Tài liệu tham chiếu

- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Gameplay Mechanics — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660)
- [Fusion Recipes — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41)
- [Ability Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c)
- [Level Design — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca)
