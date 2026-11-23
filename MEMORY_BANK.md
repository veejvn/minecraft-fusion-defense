# MEMORY_BANK — Minecraft Fusion Defense

**Cập nhật lần cuối:** 2026-11-23T09:47:00+07:00  
**Nhánh Git hiện tại:** `main` (commit `03c18ae` cho `T-11`; vừa lập kế hoạch `T-12` Draft v0.1 tại `docs/development/T-12-UI-ASSETS-PLAYABLE-INTEGRATION-IMPLEMENTATION-PLAN.md`)

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
- **Thực thể & Fusion:** 5 Base Defenders, **15 Tier-2 Fusion Defenders** (mở rộng chính thức từ 7 lên toàn bộ 15 cặp ghép ngày `2026-11-23`), 4 Enemy Types (Zombie, Husk, Vindicator, Pillager — Owner đổi Spider sang Vindicator ngày 2026-11-21), **15 Fusion Recipes** (Fusion miễn phí mọi lane/khoảng cách, output tại Target Cell), **20 Special Abilities** (`ABILITY_CATALOG.md` Confirmed v2.2 — đã hoàn tất rà soát/refactor 6 kỹ năng `blizzard`, `inferno` lobbed arc, `wildfire_rush` 5 sói lửa 5 lane, `siege_volley`, `thermal_collapse` Sốc Nhiệt, `predator_mark` Vulnerable `+40%`).
- **Tài nguyên:** Energy dùng để Summon; Power Crystal (cap 5) dùng cho Special Abilities (`1` Crystal, `0s` cooldown).
- **Tiến độ & Unlock:** Starter Base: Iron Golem, Skeleton; Starter Recipes (3): Skeleton Sniper, Steel Guardian, Iron Ranger. Snow Golem (First Grassland Victory), Wolf (50 kills tích lũy trong trận Victory), Blaze (5 Grassland Victories); mọi Fusion Recipe tự mở khi cả 2 Base nguyên liệu mở. Replay Victory được cộng tiến độ, Defeat không cộng; Fusion optional cho điều kiện thắng.

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
| **T-06** | Summon, Placement & Resources (Energy, Crystal, RNG, Pending Wave Rewards) | **Owner-accepted kỹ thuật (26/26 gates PASS):** Commit `147e8bd` (+ bổ sung test `battle-resources.test.ts` 21 tests), CI run `44850790552` **success**; báo cáo nghiệm thu `docs/reports/T-06-FINAL-ACCEPTANCE.md` và đã cập nhật `ROADMAP.md`. Production data (summon cost/cooldown, Energy item rate/amount/distribution, Wave 1–5 reward) vẫn giữ `TBD`. |
| **T-07** | Enemy movement, combat, targeting | **Owner-accepted kỹ thuật (20/20 gates PASS):** Code tại `7b7c37d` (push via `6b0ee0b`), CI run `44877738893` **success**; báo cáo nghiệm thu `docs/reports/T-07-FINAL-ACCEPTANCE.md` và đã cập nhật `ROADMAP.md`. Combat stats/behaviors vẫn `TBD` (dùng test fixtures). |
| **T-08** | Fusion mechanics | **Đã code & commit local tại `061d2ee`, nghiệm thu kỹ thuật local 19/20 PASS + AC-20 chờ push CI:** `docs/reports/T-08-FINAL-ACCEPTANCE.md`; 110/110 game tests (25 tests `battle-fusion.test.ts`), 25/25 game-data tests, typecheck & build PASS; chưa push lên GitHub nên AC-20 remote CI đang pending. Chỉ số combat của 7 Fusion Defenders vẫn `TBD` (dùng test fixtures). |
| **T-09** | Grassland 5 Waves, Victory/Defeat | **Đã code & commit local tại `3378dd7`, nghiệm thu kỹ thuật local 19/20 PASS + AC-20 chờ push CI:** `docs/reports/T-09-FINAL-ACCEPTANCE.md`; 126/126 game tests (16 tests `battle-waves.test.ts`), 25/25 game-data tests, typecheck & build PASS; chưa push lên GitHub nên AC-20 remote CI đang pending. Dữ liệu Wave 1–5 và reward vẫn `TBD` (dùng test fixtures). |
| **T-10** | Special abilities | **Đã code & commit local tại `0040ac5`, nghiệm thu kỹ thuật local 19/20 PASS + AC-20 chờ push CI; `ABILITY_CATALOG.md` đã nâng cấp Confirmed v2.0 (2026-11-21); đã hoàn tất `T-10B` 1-Lane Playtest Sandbox (`/playtest`):** `playtest-presets.ts`, `playtest-controller.ts`, `PlaytestScene`, `createPlaytestGame`, `PlaytestHost`, `/playtest`, `playtest-controller.test.ts`; phục vụ Owner chơi thử & tinh chỉnh chỉ số thực tế trước khi chốt `GAME_BALANCING.md` / `T-11`. |
| **T-11** | Save & Resume, persistent progression | **Đã code & commit tại `03c18ae`, nghiệm thu kỹ thuật local 19/20 PASS + AC-20 chờ push CI:** Kế hoạch v1.0 (`D-76`–`D-85 = A`), báo cáo nghiệm thu `docs/reports/T-11-FINAL-ACCEPTANCE.md`; 174/174 game tests (19 tests `battle-persistence.test.ts`), 25/25 game-data tests, typecheck, build & 6/6 E2E tests PASS. |
| **T-12** | UI, assets và playable integration | **Đã kiểm kê asset hiện có & lập kế hoạch Draft v0.1 (`docs/development/T-12-UI-ASSETS-PLAYABLE-INTEGRATION-IMPLEMENTATION-PLAN.md`):** Đã có 10 file `64×64` PNG trong `apps/web/public/playtest-preview/` (5 Base Defenders, 4 Enemies, 1 Grassland tile) + procedural pixel-art (`procedural-pixel-art.ts`). Cần tạo thêm 7 Tier-2 Fusion Defenders (Batch A) + chuẩn hóa sang `/assets/` (Batch B/C/D) ở phiên tạo asset, và chờ Owner chốt `D-86`–`D-95`. |
| **T-13** | MVP QA & local acceptance | Chưa bắt đầu. |

---

## 4. Nhật ký thực thi (Execution Log)

### Phiên 2026-11-21..2026-11-23
- **Kiểm tra khởi đầu dự án:**
  - Xác nhận chưa có `MEMORY_BANK.md`; kiểm tra cây thư mục, `git status` (sạch tại `147e8bd`) và các tài liệu chính (`README.md`, `ROADMAP.md`, `DOCUMENTATION_POLICY.md`, `T-06-SUMMON-PLACEMENT-RESOURCES-IMPLEMENTATION-PLAN.md`, `T-05-FINAL-ACCEPTANCE.md`).
  - Đọc mã nguồn T-06 vừa commit tại `147e8bd`: `packages/game/src/core/battle-resources.ts`, `resource-rng.ts`, `resource-session.ts`, `packages/game/src/systems/battle-runtime.ts`, `packages/game/tests/battle-resources.test.ts`.
  - Phát hiện khoảng lệch giữa tài liệu và code: tài liệu T-06/Roadmap vẫn ghi trạng thái `NOT AUTHORIZED` / `26/26 gates PENDING`, trong khi code và test cho T-06 đã được commit lên `main` (`147e8bd`).
- **Kết quả kiểm chứng đã chạy trong phiên:**
  - `pnpm --filter @mfd/game test`: **PASS** — 8 test files, **126/126 tests** (`lifecycle-adapter.test.ts` 7, `create-game.test.ts` 4, `battle-fusion.test.ts` 25, `battle-combat.test.ts` 12, `battle-runtime.test.ts` 12, `battle-resources.test.ts` 21, `battle-waves.test.ts` 16, `simulation-foundation.test.ts` 29).
  - `pnpm --filter @mfd/game-data test`: **PASS** — 1 test file, **25/25 tests** (`validation.test.ts`).
  - `pnpm typecheck`: **PASS** — 3/3 packages (`@mfd/game-data`, `@mfd/game`, `@mfd/web`).
  - `pnpm build`: **PASS** — `@mfd/web` Next.js production build (`0 cached`).
  - Remote CI (`gh run list`): run `44877738893` trên `6b0ee0b` (T-07) đạt **success**; T-08 (`061d2ee`) và T-09 (working tree local) chưa push lên GitHub nên chưa có remote CI run.
  - Chưa chạy trong phiên: `@mfd/web` Playwright E2E/production tests (`apps/web` không thay đổi trong T-06–T-09).
- **Thay đổi file:**
  - Khởi tạo `MEMORY_BANK.md` theo yêu cầu Owner (commit `93e429e`, cập nhật tiếp trong phiên).
  - Xóa `docs/DOCUMENTATION_STATUS.md` và dọn liên kết trong 5 tài liệu hoạt động (commit `68d5142`).
  - Nghiệm thu T-06 (`docs/reports/T-06-FINAL-ACCEPTANCE.md`, commit `87507f0`).
  - Cập nhật đồng bộ đội hình Enemy MVP từ `Spider` sang `Vindicator` (reward `150/1`; Spider chuyển sang định hướng Defender tương lai, ngoài MVP) trên `docs/` và `.agents/skills/minecraft-gameplay-rules/SKILL.md` (commit `593d2a5`).
  - Lập kế hoạch T-07 v1.0 (`D-25`–`D-38 = A`), triển khai T-07 trong `packages/game` (commit `7b7c37d`), đẩy lên `main` (`6b0ee0b`) và đóng 20/20 gates PASS trong `docs/reports/T-07-FINAL-ACCEPTANCE.md` + `ROADMAP.md` sau khi CI run `44877738893` thành công.
  - Lập kế hoạch T-08 v1.0 (`D-39`–`D-48 = A`, commit `9751435` cho Draft v0.1), điều phối 4 subagents triển khai & kiểm toán độc lập T-08 (`packages/game/src/fusion/*`, `battle-state.ts`, `battle-runtime.ts`, `battle-fusion.test.ts`), và lập báo cáo nghiệm thu `docs/reports/T-08-FINAL-ACCEPTANCE.md` + đồng bộ `ROADMAP.md` (commit local `061d2ee`, chưa push).
  - Lập kế hoạch T-09 v1.0 (`D-49`–`D-58 = A`, commit `e276e21`), điều phối 4 subagents triển khai & kiểm toán độc lập T-09 (`packages/game/src/waves/*`, `battle-state.ts`, `battle-runtime.ts`, `battle-waves.test.ts`), và lập báo cáo nghiệm thu `docs/reports/T-09-FINAL-ACCEPTANCE.md` + đồng bộ `ROADMAP.md` (commit local `3378dd7`, chưa push).
  - Rà soát `docs/game-design/ABILITY_CATALOG.md`, `docs/decisions/PGD-01-STEEL-GUARDIAN.md`, `docs/decisions/PGD-02/systems/G08.md`, `G09.md`, `docs/decisions/PGD-02/contracts/G09-TECHNICAL-CONTRACT.md` và các phụ lục G09; lập và nâng cấp kế hoạch **T-10 Approved v1.0** tại `docs/development/T-10-SPECIAL-ABILITIES-IMPLEMENTATION-PLAN.md` (commit `ddd6d4f`).
  - Điều phối 4 subagents triển khai & kiểm toán độc lập **T-10** (`packages/game/src/abilities/*`, tích hợp `battle-state.ts`, `combat-*`, `fusion-engine.ts`, `battle-runtime.ts`, `packages/game/tests/battle-abilities.test.ts`), chạy kiểm chứng (`148/148` `@mfd/game`, `25/25` `@mfd/game-data`, `pnpm typecheck`, `pnpm build` PASS) và lập báo cáo nghiệm thu `docs/reports/T-10-FINAL-ACCEPTANCE.md` + đồng bộ `docs/product/ROADMAP.md` (đang ở working tree local, chưa commit/push).
  - Theo xác nhận trực tiếp của Owner (`2026-11-21`), nâng cấp `docs/game-design/ABILITY_CATALOG.md` lên **Confirmed v2.0** (chốt 1 Power Crystal, 0s cooldown, UX kéo-thả Crystal, cơ chế 12 Special Abilities theo G09, mã lỗi & schema T-10; chỉ giữ VFX/Animation/UI Events ở T-12 là TBD) và đánh dấu **`DOCSYNC-01` RESOLVED** trong `docs/decisions/PGD-02/audits/GAP_REGISTER.md` (commit `0040ac5`).
  - Lập kế hoạch & triển khai **T-10B (One-Lane Playtest Sandbox tại `/playtest`)** (`D-69`–`D-75 = A`, `PlaytestController`, `PlaytestScene`, `PlaytestHost` với bố cục full-width & modal ẩn/hiện).
  - Lập kế hoạch **T-11 Approved v1.0** (`D-76`–`D-85 = A`) tại `docs/development/T-11-SAVE-RESUME-PROGRESSION-IMPLEMENTATION-PLAN.md`, điều phối 4 subagents triển khai & kiểm toán độc lập `packages/game/src/persistence/*`, tích hợp `BattleRuntime` (sửa lỗi đồng bộ `EventScheduler.lastTick` khi khôi phục), viết 19 tests `packages/game/tests/battle-persistence.test.ts` (`174/174` `@mfd/game`, `25/25` `@mfd/game-data`, `typecheck` 3/3, `next build`, `6/6` Playwright E2E PASS), lập báo cáo nghiệm thu `docs/reports/T-11-FINAL-ACCEPTANCE.md` + đồng bộ `docs/product/ROADMAP.md` và commit tại `03c18ae`.
  - Kiểm kê toàn bộ asset hiện có trong repo (`apps/web/public/playtest-preview/*.png`, `packages/game/src/playtest/procedural-pixel-art.ts`, `apps/web/public/assets/`) và lập kế hoạch **T-12 Draft v0.1** tại `docs/development/T-12-UI-ASSETS-PLAYABLE-INTEGRATION-IMPLEMENTATION-PLAN.md` (tách riêng **Asset Production Manifest** theo 4 Batches A/B/C/D cho phiên chuyên tạo asset của Owner và **6 Slices tích hợp UI & 5×9 Playable Battlefield** kèm 10 quyết định kỹ thuật `D-86`–`D-95`).

---

## 5. Kế hoạch cho phiên làm việc tiếp theo (Next Session Plan)

1. **Thực thi tạo Asset (ở phiên chuyên tạo Asset của Owner theo Mục 3 của Plan T-12):**
   - Tạo **Batch A (7 Tier-2 Fusion Defenders `64×64` transparent PNG)**: `steel_guardian`, `frost_guardian`, `ice_golem`, `skeleton_sniper`, `inferno_archer`, `flame_fang`, `alpha_wolf` vào `apps/web/public/assets/sprites/defenders/`.
   - Chuẩn hóa **Batch B** (promote 5 Base Defenders, 4 Enemies, Grassland tile từ `playtest-preview/` sang `apps/web/public/assets/`) và tùy chọn **Batch C/D** (`energy_orb`, `power_crystal`, projectiles, shield overlays, base gate/spawn tiles).
2. **Chốt `D-86`–`D-95` và triển khai code `T-12` (`T-12.1`..`T-12.6`):**
   - Xây dựng `asset-manifest.ts`, `GrasslandCampaignConfig` + `CampaignController`, `GrasslandBattleScene` (5×9 Grid), các màn hình `Main Menu`, `Level Selection`, `Defender Collection`, `Achievements`, `Settings & How to Play`, `BattleHudOverlay`, `Save/Resume Continue flow` và bộ test Vitest + Playwright E2E.
3. **T-13 (MVP QA) & Tinh chỉnh cân bằng cuối cùng (`GAME_BALANCING.md` / `ENTITY_CATALOG.md`):**
   - Sau khi hoàn chỉnh giao diện playable (T-12) và QA (T-13), quay lại cân bằng thực tế trên sandbox/level để chốt số liệu chính thức.
4. **Đóng cổng AC-20 trên Remote CI:**
   - Sau khi push `main` lên GitHub, kiểm tra workflow CI thực tế cho T-08–T-12.
