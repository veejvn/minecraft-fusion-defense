# MEMORY_BANK — Minecraft Fusion Defense

**Cập nhật lần cuối:** 2026-11-21T12:34:00+07:00  
**Nhánh Git hiện tại:** `main` (commit `147e8bd` — working tree sạch trước khi tạo file này)

---

## 1. Tổng hợp tài liệu & nguyên tắc dự án

- **Mô tả:** Game Tower Defense 2D Pixel Art side-view, single-player, Desktop Web (local internal testing), lấy cảm hứng từ Minecraft và Plants vs. Zombies.
- **Thẩm quyền tài liệu:** Toàn bộ Markdown trong `docs/` là nguồn tài liệu chính thức duy nhất (`docs/DOCUMENTATION_POLICY.md`). Các link Notion cũ chỉ mang tính lưu trữ lịch sử.
- **Quy tắc bất biến cho Agent:**
  - Mọi nội dung `Draft`, `Proposed`, `Prototype`, `TBD` đều chưa được phê duyệt; không tự ý biến thành giá trị mặc định trong code (đặc biệt các thông số balance, Wave config, Energy Item spawn rate/amount/distribution, Ability effect/cost/cooldown).
  - Các quyết định đã xác nhận cần bảo toàn: `docs/game-design/ENTITY_CATALOG.md`, `docs/game-design/FUSION_RECIPES.md`, `docs/game-design/ABILITY_CATALOG.md`, `docs/decisions/PGD-01-STEEL-GUARDIAN.md`, `docs/decisions/PGD-02/` (bao gồm quyết định G07 terminal priority ngày 2026-11-20: first valid resolved terminal event wins).
  - Giao diện React/Phaser: giữ Phaser browser-only bên trong Client Host (`apps/web/components/game/phaser-host.tsx`), không lộ runtime internals ra public API của `@mfd/web`.
  - Môi trường lệnh: dùng **PowerShell** và `pnpm`. Không tự commit/push khi chưa được yêu cầu.

### Phạm vi MVP đã xác nhận (`docs/product/ROADMAP.md`, `README.md`)
- **Level & Grid:** 1 Grassland Level, Grid 5 Rows × 9 Columns, 5 Waves; English-only UI.
- **Thực thể & Fusion:** 5 Base Defenders, 7 Fusion Defenders, 4 Enemy Types (Zombie, Husk, Spider, Pillager), 7 Fusion Recipes (7 cặp Tier-1 + Tier-1 → Tier-2, Fusion miễn phí mọi lane/khoảng cách, output tại Target Cell), 12 Special Abilities (`iron_bastion` của Steel Guardian đã xác nhận ID ở PGD-01, effects vẫn TBD).
- **Tài nguyên:** Energy dùng để Summon; Power Crystal (cap 5) dùng cho Special Abilities.
- **Tiến độ & Unlock:** Starter Base: Iron Golem, Skeleton; Starter Recipes: Skeleton Sniper, Steel Guardian. Snow Golem (First Grassland Victory), Wolf (50 kills tích lũy trong trận Victory), Blaze (5 Grassland Victories). Replay Victory được cộng tiến độ, Defeat không cộng; Fusion optional cho điều kiện thắng.

---

## 2. Cấu trúc Workspace & Lệnh kiểm tra (PowerShell)

Monorepo sử dụng `pnpm@10.20.0` + Turborepo:
- `apps/web` (`@mfd/web`): Next.js + React Host (`apps/web/components/game/phaser-host.tsx`), Playwright E2E fixtures (`apps/web/tests/e2e`, `apps/web/tests/fixtures`).
- `packages/game` (`@mfd/game`): Phaser runtime & headless simulation engine (`src/core/`, `src/battlefield/`, `src/entities/`, `src/events/`, `src/systems/`, `src/scenes/`), unit tests trong `packages/game/tests/`.
- `packages/game-data` (`@mfd/game-data`): Zod schemas và runtime validation cho Game Data (`src/schemas/`, `tests/validation.test.ts`).
- `packages/config`, `packages/shared`: Hiện mới là scaffold (`.gitkeep`).

**Các lệnh chính (PowerShell):**
- `pnpm --filter @mfd/game test` — Chạy Vitest cho `@mfd/game`.
- `pnpm --filter @mfd/game-data test` — Chạy Vitest cho `@mfd/game-data`.
- `pnpm typecheck` — Chạy `tsc --noEmit` qua Turborepo cho `@mfd/game`, `@mfd/game-data`, `@mfd/web`.
- `pnpm build` — Build production toàn workspace.
- `pnpm --filter @mfd/web test:e2e` / `test:production` — Playwright browser tests.
- *(Lưu ý: Script `lint` ở root tồn tại nhưng chưa có cấu hình lint trong các package.)*

---

## 3. Trạng thái tiến độ theo lộ trình (`docs/product/ROADMAP.md` §3A)

| Task | Nội dung | Trạng thái tài liệu & code thực tế |
| --- | --- | --- |
| **T-02** | Phaser/React host foundation | Hoàn thành, giữ bằng chứng nghiệm thu trước đó (`docs/reports/T-02-*.md`). |
| **T-03** | Game Data foundation | Hoàn thành khung schema/validation (`packages/game-data`); dữ liệu production vẫn chờ duyệt đầy đủ (`docs/reports/T-03-*.md`). |
| **T-04** | Core simulation foundation | Đã nghiệm thu (`SimulationClock`, `TransactionEngine`, `EventQueue`, `EventScheduler`). |
| **T-05** | Battlefield 5×9, occupancy, Entity Registry, `BattleRuntime` | **Owner-accepted kỹ thuật** tại `3ee3d30` (`docs/reports/T-05-FINAL-ACCEPTANCE.md`). |
| **T-06** | Summon, Placement & Resources (Energy, Crystal, RNG, Pending Wave Rewards) | **Cần đồng bộ/nghiệm thu:** Plan v1.0 & Readiness v1.1 (D-04–D-24, 26 gates AC-01–AC-26) đã được duyệt trong `docs/development/T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md` nhưng tài liệu vẫn ghi `NOT CODED` / chưa có `docs/reports/T-06-FINAL-ACCEPTANCE.md`. Thực tế commit `147e8bd` đã cài đặt `battle-resources.ts`, `resource-rng.ts`, `resource-session.ts`, tích hợp `battle-runtime.ts` và 20 tests trong `battle-resources.test.ts`. |
| **T-07** | Enemy movement, combat, targeting | Chưa bắt đầu (phụ thuộc T-05 và combat definitions được duyệt). |
| **T-08** | Fusion mechanics | Chưa bắt đầu (phụ thuộc T-05 và recipes được duyệt). |
| **T-09** | Grassland 5 Waves, Victory/Defeat | Chưa bắt đầu (phụ thuộc T-06–T-07, Wave data và G07 terminal priority). |
| **T-10** | Special abilities | Chưa bắt đầu (phụ thuộc T-07 và executable ability/effect contracts). |
| **T-11** | Save & Resume, persistent progression | Chưa bắt đầu. |
| **T-12** | UI, assets và playable integration | Chưa bắt đầu (có thể làm song song từng phần khi interface ổn định). |
| **T-13** | MVP QA & local acceptance | Chưa bắt đầu. |

---

## 4. Nhật ký thực thi (Execution Log)

### Phiên 2026-11-21
- **Kiểm tra khởi đầu dự án:**
  - Xác nhận chưa có `MEMORY_BANK.md`; kiểm tra cây thư mục, `git status` (sạch tại `147e8bd`) và các tài liệu chính (`README.md`, `ROADMAP.md`, `DOCUMENTATION_POLICY.md`, `T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md`, `T-05-FINAL-ACCEPTANCE.md`).
  - Đọc mã nguồn T-06 vừa commit tại `147e8bd`: `packages/game/src/core/battle-resources.ts`, `resource-rng.ts`, `resource-session.ts`, `packages/game/src/systems/battle-runtime.ts`, `packages/game/tests/battle-resources.test.ts`.
  - Phát hiện khoảng lệch giữa tài liệu và code: tài liệu T-06/Roadmap vẫn ghi trạng thái `NOT AUTHORIZED` / `26/26 gates PENDING`, trong khi code và test cho T-06 đã được commit lên `main` (`147e8bd`).
- **Kết quả kiểm chứng đã chạy trong phiên:**
  - `pnpm --filter @mfd/game test`: **PASS** — 5 test files, **70/70 tests** (`lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 20, `simulation-foundation.test.ts` 27).
  - `pnpm --filter @mfd/game-data test`: **PASS** — 1 test file, **25/25 tests** (`validation.test.ts`).
  - `pnpm typecheck`: **PASS** — 3/3 packages (`@mfd/game-data`, `@mfd/game`, `@mfd/web`, cached Turbo).
  - Chưa chạy trong phiên: `pnpm build`, `@mfd/web` Playwright E2E/production tests.
- **Thay đổi file:**
  - Khởi tạo `MEMORY_BANK.md` theo yêu cầu Owner.
  - Xóa `docs/DOCUMENTATION_STATUS.md` và dọn các liên kết tham chiếu trong 5 file tài liệu hoạt động (`README.md`, `ROADMAP.md`, `DEVELOPMENT_WORKFLOW.md`, `AI_AGENT_GUIDELINES.md`, `TECHNICAL_ARCHITECTURE.md`) chuyển sang `docs/DOCUMENTATION_POLICY.md`; giữ nguyên các hồ sơ lịch sử `docs/decisions/PGD-02/`.

---

## 5. Kế hoạch cho phiên làm việc tiếp theo (Next Session Plan)

1. **Rà soát & đóng cổng nghiệm thu T-06 (ưu tiên trước khi qua T-07):**
   - Đối chiếu từng dòng code trong `battle-resources.ts`, `resource-rng.ts`, `resource-session.ts`, `battle-runtime.ts` và `battle-resources.test.ts` với **21 quyết định D-04–D-24** và **26 acceptance gates (AC-01–AC-26)** trong `docs/development/T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md`.
   - Kiểm tra xem có thiếu edge-case test nào (ví dụ: non-integer tick rate boundaries, rollback RNG khi `applyResourceEvent` fail-stop, Energy Item normalized position & region boundaries, claim/terminal edge cases).
   - Chạy đầy đủ `pnpm --filter @mfd/game test`, `pnpm --filter @mfd/game-data test`, `pnpm typecheck`, `pnpm build`.
   - Nếu Owner yêu cầu, lập báo cáo `docs/reports/T-06-FINAL-ACCEPTANCE.md` và đồng bộ trạng thái trong `docs/product/ROADMAP.md`.
2. **Chuẩn bị cho T-07 (Enemy Movement, Combat, Targeting) / T-08 (Fusion):**
   - Xác định rõ các thông số combat/entity nào còn `TBD` trong `ENTITY_CATALOG.md`, `GAME_BALANCING.md`, `PGD-02/` để hỏi Owner chốt hoặc thiết kế contract inject fixture tương tự T-06 trước khi code.
   - Kiểm tra thêm cải tiến CI được nhắc trong `ROADMAP.md` (thêm bước test `@mfd/game-data` vào `.github/workflows/ci.yml` nếu chưa có).
