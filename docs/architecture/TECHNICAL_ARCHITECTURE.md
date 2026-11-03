**Repository path:** `docs/architecture/TECHNICAL_ARCHITECTURE.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — Tech Stack và nguyên tắc kiến trúc đã nêu trong GDD là Confirmed; cấu trúc thư mục/package minh họa là Proposed, chưa được phê duyệt.  
**Scope:** Kiến trúc kỹ thuật cấp cao cho MVP Desktop Web. Chi tiết Game Systems và Data Schemas thuộc tài liệu riêng.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

Xác định các thành phần công nghệ, trách nhiệm và ranh giới tích hợp để AI Agent có thể chuẩn bị codebase MVP mà không tự quyết định Gameplay hoặc Game Balancing.

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

## 2. Tech Stack

| Nhóm | Công nghệ | Trạng thái |
| --- | --- | --- |
| Package Manager | pnpm | Confirmed |
| Monorepo | Turborepo | Confirmed |
| Web Framework | Next.js | Confirmed |
| UI | React | Confirmed |
| Styling | Tailwind CSS; shadcn/ui cho UI Components | Confirmed theo định hướng dự án |
| Game Engine | Phaser 3 | Confirmed |
| Language | TypeScript | Confirmed |
| Schema Validation | Zod | Confirmed |
| Unit Testing | Vitest | Confirmed |
| E2E Testing | Playwright | Confirmed |
| Level Editor | Tiled | Confirmed |
| Pixel Art Tool | Aseprite | Confirmed |

Không thêm framework, backend, database hoặc state management library mới nếu chưa có nhu cầu được phê duyệt.

## 3. Ranh giới trách nhiệm

| Thành phần | Trách nhiệm | Không chịu trách nhiệm |
| --- | --- | --- |
| Next.js / React | App shell, điều hướng, menu, HUD, các màn hình ngoài gameplay và tương tác UI | Simulation, cập nhật vị trí Entity mỗi frame |
| Phaser 3 | Render chiến trường, nhận input trong game, quản lý gameplay runtime và simulation | Điều hướng ứng dụng và layout UI ngoài game |
| Shared Types / Contracts | Định nghĩa kiểu dữ liệu trao đổi giữa UI, Engine và Game Data | Tự đặt giá trị Balance |
| Game Data / Validation | Định nghĩa Defender, Enemy, Fusion, Ability, Level/Wave; kiểm tra schema | Tự suy diễn thông số còn TBD |

**Nguyên tắc:** Phaser sở hữu trạng thái gameplay runtime. React nhận các snapshot/event cần thiết để cập nhật HUD; không đồng bộ vị trí của mọi Entity vào React mỗi frame.

## 4. Luồng tương tác cấp cao

```txt
Player
  ├── React UI (menu, HUD, summon/ability controls)
  │     └── UI commands ──────────────┐
  └── Phaser input (battlefield, drag, click)
                                      ▼
                             Game Runtime (Phaser)
                             ├── Game State / Simulation
                             ├── Grid / Entities / Combat
                             ├── Fusion / Resources / Abilities
                             └── Waves / Victory / Defeat
                                      │
                            Events / UI snapshots
                                      ▼
                                 React HUD

Game Definitions (data-driven)
         │
      Zod validation
         ▼
     Game Runtime
```

Tên event, command, payload và cơ chế giao tiếp cụ thể: **TBD**, định nghĩa ở `GAME_ENGINE_ARCHITECTURE.md` và `DATA_ARCHITECTURE.md`.

## 5. Tổ chức Monorepo (Proposed)

Đây là **gợi ý phân tách trách nhiệm**, không phải cấu trúc đã xác nhận và không yêu cầu AI Agent tự tạo package nếu chưa duyệt.

```txt
apps/
  web/                 # Next.js app shell, React UI, tích hợp Phaser
packages/
  game/                # Phaser runtime và gameplay systems
  game-data/           # Definitions, validation, config
  shared/              # Shared types/contracts, utilities chung
docs/                  # Markdown đồng bộ từ Notion
```

- Tên package, alias, import boundary và vị trí assets: **TBD**.
- Nếu repository đã có cấu trúc khác, phải kiểm tra thực tế và trình bày Diff/đề xuất trước khi tái cấu trúc.
- Không tự thay đổi hoặc di chuyển file hiện có theo sơ đồ Proposed.

## 6. Runtime và Simulation

- Hướng triển khai: fixed timestep simulation; mục tiêu hiển thị 60 FPS.
- Pause phải dừng simulation và gameplay timers; Resume tiếp tục từ trạng thái đã tạm dừng.
- Game State, Entity, Combat, Fusion, Wave và Resource Systems nằm phía Phaser.
- Data-driven: định nghĩa gameplay đọc từ dữ liệu, không Hardcode Balance/Wave Composition trong logic.
- Phải xử lý Victory khi hoàn thành 5 Waves và loại bỏ mọi Enemy; Defeat ngay khi Enemy vượt Base Boundary.
- **Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.
- Save & Resume sau browser reload/close và persistent unlocks là scope Confirmed. Tick rate, scheduler, event generation details, collision, save storage/schema và lifecycle implementation vẫn TBD.

## 7. Data Contracts và Validation

- Game Data bao gồm Defender, Enemy, Fusion Recipe, Special Ability, Level/Wave và các thông số tài nguyên.
- TypeScript biểu diễn contract; Zod kiểm tra dữ liệu trước khi đưa vào runtime.
- Đơn vị đã xác nhận: Attack Speed = `attacks/second`, Attack Range = `Cells`, Move Speed = `Cells/second`.
- Các giá trị Prototype/placeholder chỉ là minh họa; không tự chuyển thành Runtime Defaults.
- Cấu trúc schema, ID mapping, file format, loading và versioning: **TBD** trong `DATA_ARCHITECTURE.md`.

## 8. Chất lượng và kiểm thử

- Vitest cho logic có thể kiểm thử độc lập, ví dụ recipe matching và validation.
- Playwright cho các luồng Desktop Web quan trọng.
- Mục tiêu 60 FPS là định hướng hiệu năng, chưa phải cam kết đã benchmark.
- Không đưa ra coverage %, browser matrix, CI/CD hoặc release policy khi chưa có quyết định; các nội dung này thuộc `TESTING_STRATEGY.md` và `DEPLOYMENT.md`.

## 9. Ngoài phạm vi tài liệu

- Thuật toán chi tiết của Game Systems.
- Định nghĩa đầy đủ các TypeScript Interfaces và Zod Schemas.
- Giá trị HP/Damage/Cost/Cooldown, thông số Wave hoặc Ability chưa chốt.
- Backend, tài khoản người dùng, multiplayer, database, cloud save.
- Online deployment/hosting không bắt buộc trong Local-only Functional MVP; lựa chọn môi trường tương lai chưa được phê duyệt.

## 10. Open Decisions

| Vấn đề | Trạng thái | Tài liệu quyết định |
| --- | --- | --- |
| Cấu trúc thực tế của apps/packages và package names | Proposed / TBD | Technical Architecture |
| Cơ chế UI ↔ Phaser communication, event/command contracts | TBD | Game Engine Architecture |
| Chi tiết fixed timestep và game lifecycle | TBD | Game Engine Architecture |
| Data file format, schema, loading và validation boundaries | TBD | Data Architecture |
| Assets directory và loading pipeline | TBD | Asset Guidelines |
| Local build/scripts và future CI/CD/hosting | Implementation TBD; online deployment không bắt buộc trong MVP | Development Workflow / Deployment |

AI Agent phải kiểm tra codebase hiện tại trước khi đề xuất các quyết định kỹ thuật trên; không mặc định rằng sơ đồ Proposed đã được triển khai.

## 11. Tài liệu liên quan

- [GDD — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a)
- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Gameplay Mechanics — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660)
- [Tình trạng tài liệu — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d)
