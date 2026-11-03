**Repository path:** `README.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Giới thiệu

**Minecraft Fusion Defense** là dự án game Tower Defense 2D Pixel Art side-view, single-player dành cho Desktop Web, lấy cảm hứng từ Minecraft và Plants vs. Zombies. Người chơi triệu hồi Defenders, thu thập tài nguyên, kết hợp Defenders bằng Fusion và chống lại các đợt Enemy.

**Project status:** tài liệu đang được đồng bộ theo Confirmed Decision Baseline 03/11/2026; không suy diễn game đã có build chạy được.

## 2. MVP Overview

- Một Grassland Level, Grid 5 Rows × 9 Columns, 5 Waves.
- 5 Base Defenders, 7 Fusion Defenders, 4 Enemy Types.
- 7 Fusion Recipes, 12 required Special Abilities (11 existing draft IDs; Steel Guardian Ability TBD).
- Energy dùng Summon; Power Crystal dùng Abilities.
- Initial content bảy Tier-1 + Tier-1 → Tier-2 Recipes; engine không có Tier ceiling. Fusion miễn phí, mọi Lane/distance, Output tại Target Cell; full own HP/no inherited statuses/attack-ready.
- Pause, Victory và Defeat theo gameplay rules đã xác nhận.

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

**Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.

## 3. Tech Stack

pnpm, Turborepo, Next.js, React, Phaser 3, TypeScript, Tailwind CSS, shadcn/ui, Zod, Vitest, Playwright; Tiled và Aseprite cho level/pixel art.

Không có backend trong phạm vi MVP hiện tại. Chi tiết cấu trúc packages còn Proposed/TBD.

## 4. Getting Started

**TBD — chưa xác minh codebase thực tế, phiên bản Node/pnpm và scripts.** AI Coding Agent cần kiểm tra `package.json`, workspace config và README hiện có trước khi điền lệnh install/dev/build/test. Không tự tuyên bố rằng các lệnh đã chạy thành công.

## 5. Tài liệu dự án

- [GDD — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a)
- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Development Workflow — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123)
- [Testing Strategy — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885)
- [Tình trạng tài liệu — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d)

Notion là nguồn tài liệu chính; Markdown trong repository là bản đồng bộ. `Synced` không đồng nghĩa `Approved`.

## 6. Trạng thái và quyết định chưa chốt

Gameplay balance, Ability/Wave configs, schema, project structure, asset specifications, deployment và testing policies vẫn có phần TBD/Proposed. AI Agent phải hỏi chủ dự án trước khi chốt các lựa chọn này.

## 7. Open Decisions

- Local setup instructions và scripts đã kiểm chứng: TBD.
- Licensing, contribution policy và release channel: TBD.
- Link demo, screenshots và production URL: chưa có thông tin xác nhận.
