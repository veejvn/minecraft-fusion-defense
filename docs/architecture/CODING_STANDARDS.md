**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — hướng dẫn nền tảng; mọi quy ước chưa được chủ dự án duyệt được ghi Proposed/TBD.  
**Scope:** MVP Desktop Web, không mở rộng gameplay hay kiến trúc.

**Repository path:** `docs/architecture/CODING_STANDARDS.md`

## 1. Mục tiêu

Giữ code TypeScript/React/Phaser dễ đọc, dễ kiểm thử và nhất quán với tài liệu thiết kế. Đây không phải quyết định về package layout, linter config hoặc code style cuối cùng.

## 2. Công nghệ và nguyên tắc Confirmed

- pnpm, Turborepo, Next.js, React, Phaser 3, TypeScript, Tailwind CSS/shadcn, Zod, Vitest và Playwright theo Technical Architecture.
- React phụ trách UI/HUD; Phaser phụ trách gameplay runtime và rendering. Không chuyển vị trí mọi Entity vào React state mỗi frame.
- Gameplay hướng data-driven; không hardcode Balance, Wave Config hoặc giá trị Prototype làm defaults.
- Simulation hướng fixed timestep; mục tiêu 60 FPS, tick rate còn TBD.
- Dùng đúng IDs, tên Ability, Fusion Recipes và đơn vị trong các catalog; Attack Speed = attacks/second, Range = Cells, Move Speed = Cells/second.

## 3. Tổ chức code (Proposed)

- Giữ trách nhiệm UI, Game Runtime, Game Definitions và Shared Contracts tách biệt về mặt logic.
- Ưu tiên functions/modules có trách nhiệm rõ ràng, hạn chế logic gameplay ẩn trong React components.
- Không tự tạo `apps/web`, `packages/game`, `packages/game-data`, `packages/shared`: sơ đồ Monorepo là Proposed.
- Đọc repository thực tế trước khi đề xuất file structure, imports, aliases hoặc refactor.

## 4. TypeScript và Data Contracts (Proposed)

- Khai báo types/contracts rõ ràng tại ranh giới UI ↔ Game và Data ↔ Runtime.
- Validate dữ liệu đầu vào bằng Zod theo Data Architecture; không giả định input luôn hợp lệ.
- Dùng stable IDs theo Entity/Ability/Fusion catalogs, không tự đặt IDs mới.
- Tránh số “magic” cho balance; giá trị chưa được duyệt phải được ghi blocker/TBD.
- Không tạo API, schema field bắt buộc, default hoặc event payload khi chưa được xác nhận.

## 5. React / Phaser Boundaries

- React: menu, app shell, HUD, controls ngoài battlefield.
- Phaser: input battlefield, Entity lifecycle, Grid, Combat, Fusion, Resource, Ability, Wave, Victory/Defeat.
- Giao tiếp qua commands/events/snapshots ở mức nguyên tắc; tên và shape Bridge Contract: TBD.
- Pause phải đóng băng gameplay simulation và timers; không dùng rendering frame làm nguồn thời gian gameplay.

## 6. Quy tắc chất lượng

- Thay đổi nhỏ, có phạm vi, tránh refactor không liên quan.
- Ưu tiên logic có thể unit test độc lập, đặc biệt Fusion matching, validation và resource rules.
- Không sửa GDD/Notion để hợp thức hóa hành vi code khác thiết kế.
- Giữ nguyên thay đổi chưa commit; không reset/clean/commit/push nếu chưa được yêu cầu.
- Chỉ chạy lint/typecheck/test đã có; nếu thiếu scripts/config, báo lại thay vì tự cài dependency.

## 7. Open Decisions

| Quyết định | Trạng thái |
| --- | --- |
| ESLint/Prettier config, formatting, import ordering | TBD |
| Naming conventions chi tiết, file naming | TBD |
| Path aliases, package boundaries | TBD |
| Error-handling/logging conventions | TBD |
| UI–Game Bridge contract và schema conventions | TBD |
| Quy định code review và coverage threshold | TBD |

Không tự chọn phương án mặc định khi việc triển khai phụ thuộc các quyết định này.

## 8. Tài liệu tham chiếu

- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
- [Data Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b)
- [AI Agent Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832)
