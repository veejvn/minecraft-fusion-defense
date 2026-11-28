# T-15 — Implementation Plan: Dev Stage Studio (`/editor`) & Multi-Level Campaign

**Source file:** `docs/development/T-15-LEVEL-EDITOR-AND-MULTI-LEVEL-PLAN.md`  
**Status:** Confirmed Plan — Ready for Implementation (`2026-11-28`)  
**Authority:** [PGD-04 Confirmed Specifications](../decisions/PGD-04-LEVEL-EDITOR-MULTI-LEVEL.md) · [PGD-03](../decisions/PGD-03-EMERALD-VILLAGER-ECONOMY.md)

---

## Mục tiêu kỹ thuật

Triển khai **Dev Stage Studio (`/editor`)** và kiến trúc **Multi-Level Campaign** end-to-end qua `@mfd/game-data`, `@mfd/game` và `@mfd/web`, bảo đảm:
1. Chủ dự án có thể tạo mới, nhân bản, chỉnh sửa timeline Wave 5 lane, cấu hình kinh tế, đặt sẵn `startingDefenders`, giới hạn `allowedBaseDefenderIds`, chạy thử trực tiếp từ Wave bất kỳ và lưu thẳng xuống JSON Campaign chính thức.
2. Mọi màn chơi mới tự động hiển thị trên `Level Selection` (`/`), hỗ trợ điều kiện mở khóa tuần tự (`clearedLevelIds`) và Save/Resume chuẩn xác theo từng `levelId`.
3. Tuân thủ tính tất định (deterministic tick simulation, atomic rollback, freeze khi Pause) và bảo vệ an toàn file hệ thống ở production (`403` cho `/api/dev/levels`).

---

## Lộ trình thực hiện (6 Phases)

### Phase 1 — Multi-Level Schema & Dataset (`@mfd/game-data`)
1. **File dữ liệu mới `packages/game-data/levels/campaign-levels.json`:**
   - Khởi tạo mảng Campaign Stages bắt đầu bằng dữ liệu hiện tại của `grassland.json` (giữ nguyên mọi thông số Chủ dự án đã cân bằng).
2. **`packages/game-data/src/mvp-dataset.ts` & `src/index.ts`:**
   - Thêm Zod schemas:
     - `startingDefenderSchema`: `{ definitionId: stableIdSchema, row: 0..4, column: 0..8 }`.
     - `levelUnlockRequirementSchema`: `z.discriminatedUnion('kind', [{ kind: 'always' }, { kind: 'clear-level', levelId: stableIdSchema }])`.
     - `levelDifficultySchema`: `'easy' | 'normal' | 'hard' | 'expert'`.
     - `levelThemeSchema`: `'grassland'` (mở rộng được cho tile biome sau này).
     - `mvpCampaignLevelSchema`: kế thừa cấu trúc `mvpGrasslandLevelSchema` (waves `1..20`) + `order`, `name`, `description`, `difficulty`, `theme`, `unlockRequirement`, `startingDefenders?`, `allowedBaseDefenderIds?`, `ignoreUnlockRestrictions?`.
   - Ràng buộc cross-reference trong `mvpDatasetSchema`:
     - ID các màn chơi không trùng nhau; phải tồn tại màn `'grassland'`.
     - Mọi `startingDefenders` có `definitionId` hợp lệ (cả Tier-1 và Tier-2) và không trùng `(row, column)`.
     - Mọi `allowedBaseDefenderIds` (nếu có) phải là Tier-1 Base Defender hợp lệ và khác rỗng.
     - `waveCrystals.length === waves.length`.
     - `unlockRequirement.levelId` trỏ tới màn tồn tại và không tạo vòng lặp (cycle).
   - Export `MVP_GAME_DATA.campaignLevels` và giữ `MVP_GAME_DATA.grasslandLevel` trỏ tới màn `grassland`.
   - Cập nhật `mergePlaytestPresetIntoDataset()` để khi `/playtest` gọi **Save to Game JSON (Dev)** thì cả `grassland.json` lẫn phần tử `grassland` trong `campaign-levels.json` đều được đồng bộ nhất quán.

---

### Phase 2 — Core Runtime, Persistence & Controllers (`@mfd/game`)
1. **Waves & Starting Defenders:**
   - `packages/game/src/waves/wave-session.ts`: giữ `REQUIRED_GRASSLAND_WAVE_COUNT = 5` làm hằng tham chiếu nếu cần, nhưng cho phép `validateWaveSession()` chạy với số Wave bất kỳ (`waves.length >= 1` và `waveCount === waves.length`).
   - `packages/game/src/core/resource-session.ts` & `packages/game/src/systems/battle-runtime.ts`:
     - Bổ sung `startingDefenders?: readonly StartingDefenderPlacement[]` trong khởi tạo `BattleRuntime` / `ResourceSessionInput`.
     - Tại tick `0` khởi tạo trận: đặt từng `startingDefender` lên lưới (tạo entity, đăng ký combat entity và gọi `registerDefenderProducer()` cho đơn vị kinh tế như `villager` / `master_trader`), không trừ Emerald và không bật cooldown thẻ. Đảm bảo Save/Resume và atomic rollback bảo toàn trạng thái hoàn chỉnh.
2. **Persistence (`snapshot-codec.ts` & `progression-store.ts`):**
   - `snapshot-codec.ts`: thêm `levelId?: string` vào checkpoint metadata (mặc định `'grassland'` nếu đọc save cũ không có `levelId`).
   - `progression-store.ts`: thêm `clearedLevelIds?: string[]` (mặc định `[]` cho save cũ), cập nhật đơn điệu trong `recordBattleOutcome()` khi `result === 'victory'` theo `levelId`, và cung cấp helper `isLevelUnlocked(profile, level)`.
3. **Multi-Level Campaign Config & Controller:**
   - Mở rộng `packages/game/src/campaign/grassland-campaign-config.ts` (hoặc tách module `campaign-levels-config.ts` export qua `packages/game/src/index.ts`):
     - Cung cấp `CAMPAIGN_LEVELS`, `getCampaignLevelConfig(levelId)`, và `createCampaignInputs(profile, { levelId, unlockAll, seed })`.
     - Áp dụng `allowedBaseDefenderIds`, `ignoreUnlockRestrictions` và `startingDefenders` vào `resourceInput` / runtime inputs.
   - `packages/game/src/campaign/campaign-controller.ts`:
     - `startNewBattle({ levelId?, unlockAll?, battleId? })` nạp đúng cấu hình màn được chọn.
     - `resumeSavedBattle()` tự động khôi phục đúng `levelId` từ checkpoint đã lưu.
     - Thêm `getCampaignLevelsView()` trả danh sách màn (metadata, trạng thái mở khóa, đã vượt qua, danh sách Enemy/starting units) cho `LevelSelectScreen`.
     - Xuất thêm `levelId`, `levelName`, `allowedBaseDefenderIds` trong `CampaignSnapshot` & `SavedBattleSummary`.
4. **Playtest Sandbox parity & Jump-to-Wave:**
   - `packages/game/src/playtest/playtest-presets.ts` & `playtest-controller.ts`: hỗ trợ `startingDefenders`, `allowedBaseDefenderIds`, và `startWaveIndex?: number` (dùng cho chế độ **Test từ Wave N** trong `/editor` với lượng Emerald khởi điểm tùy chọn).

---

### Phase 3 — Dev Stage Authoring API (`apps/web/app/api/dev/levels/route.ts`)
- Chỉ kích hoạt khi `process.env.NODE_ENV === 'development'` (trả `403` ở production/staging/test builds).
- `GET`: đọc và validate `campaign-levels.json`, trả danh sách màn chơi hiện tại.
- `POST`: nhận payload `{ levels }` hoặc `{ level }` (upsert theo `id` / cập nhật danh sách), chạy `validateMvpDataset()` đầy đủ trước khi ghi xuống `packages/game-data/levels/campaign-levels.json`; nếu cập nhật màn `grassland` thì ghi đồng thời `packages/game-data/levels/grassland.json`.
- `DELETE` (`?id=<levelId>`): chặn xóa `'grassland'`, chặn xóa nếu đang được màn khác tham chiếu trong `unlockRequirement`, validate rồi ghi lại `campaign-levels.json`.

---

### Phase 4 — Trang chuyên sâu `/editor` (`apps/web/app/editor/page.tsx` & `apps/web/components/editor/`)
Tách các component gọn gàng, bám chuẩn CSS pixel tối và vừa khung nhìn Desktop (`1366×768` trở lên):
1. `level-editor-host.tsx`:
   - Thanh công cụ trên cùng: chọn màn, `+ New Stage`, `Duplicate`, `Delete`, `Save to Game JSON (Dev)`, `Import / Export Stage JSON`, `Test Play`, link điều hướng sang `/` và `/playtest`.
   - Cột trái / tab cấu hình Metadata (`id`, `order`, `name`, `description`, `difficulty`, `theme`, `seed`, `unlockRequirement`) & Kinh tế (`initialEmeralds`, `enablePassiveEnergy`, `villageChest`, `fusionGloveCooldownSeconds`, `waveCrystals`).
2. `wave-timeline-panel.tsx`:
   - Thanh chọn Wave (`+ Add Wave`, `Duplicate Wave`, `Move ↑/↓`, `Delete Wave`) + cấu hình `initialDelaySeconds`, `delayBeforeNextWaveSeconds`, `waveCrystals`.
   - **Sơ đồ Timeline 5 Lane (`L1–L5`):** Trục thời gian theo giây (`0s → kết thúc spawn`) vẽ biểu tượng từng Enemy tại đúng thời điểm xuất hiện trên các lane tương ứng theo `laneMode` (`fixed` / `sequential` / `random` preview), hiển thị tổng số lượng Enemy và tổng HP của Wave, bấm trực tiếp vào marker hoặc hàng nhóm để chỉnh SpawnGroup (`enemyId`, `count`, `allowedLanes`, `laneMode`, `startOffsetSeconds`, `intervalSeconds`).
3. `starting-grid-editor.tsx`:
   - Lưới 5×9 trực quan để chọn bất kỳ Tier-1 hoặc Tier-2 Defender đặt/gỡ khỏi ô khởi đầu (`startingDefenders`) kèm tổng quan sức mạnh mở màn.
   - Bảng tick `allowedBaseDefenderIds` (chọn toàn bộ hoặc lọc từng Base Defender được phép dùng) + tùy chọn `ignoreUnlockRestrictions`.
4. `editor-testplay-modal.tsx`:
   - Khởi chạy `PlaytestScene` + `PlaytestController` ngay trên bản nháp đang chỉnh (không cần lưu trước), hỗ trợ chọn **Start from Wave 1..N** và override **Test Emeralds** để kiểm chứng ngay lập tức.

---

### Phase 5 — Giao diện Multi-Level trên `/` (`apps/web/components/`)
1. `apps/web/components/screens/level-select-screen.tsx`:
   - Render động toàn bộ danh sách màn chơi từ `CampaignController.getCampaignLevelsView()`.
   - Hiển thị số thứ tự Stage, tên màn, badge độ khó (`Easy`/`Normal`/`Hard`/`Expert`), số Wave, lực lượng Enemy, huy hiệu `CLEARED` / `LOCKED` (kèm điều kiện mở khóa), thông báo nếu có đơn vị đặt sẵn hoặc giới hạn Defender, nút `Play Stage` / `Continue Saved Battle`.
2. `apps/web/components/battle/battle-hud-overlay.tsx` & `main-menu-screen.tsx`:
   - Hiển thị tên màn chơi hiện tại ở HUD/Pause/Victory/Defeat.
   - Ở thanh thẻ bài: nếu màn chơi giới hạn `allowedBaseDefenderIds`, chỉ hiển thị các thẻ được phép (hoặc đánh dấu khóa rõ ràng lý do giới hạn màn).
   - Bổ sung nút dẫn nhanh sang `/editor` trên Main Menu và `/playtest` chỉ khi `NODE_ENV === 'development'` (ẩn hoàn toàn ở production).

---

### Phase 6 — Kiểm thử & Nghiệm thu (Verification)
1. **Unit & Integration Tests:**
   - `packages/game-data/tests/mvp-dataset.test.ts`: kiểm định schema multi-level, `startingDefenders` hợp lệ/trùng ô/sai ID, `allowedBaseDefenderIds`, cycle `unlockRequirement`, đồng bộ `grassland.json` ↔ `campaign-levels.json`.
   - `packages/game/tests/battle-resources.test.ts` & `battle-persistence.test.ts`: kiểm tra `startingDefenders` (bao gồm `villager` đặt sẵn tạo ngọc tự động từ tick `0`), `levelId` + `clearedLevelIds` qua save/resume và rollback.
   - `packages/game/tests/campaign-controller.test.ts` & `playtest-controller.test.ts`: kiểm tra nhiều màn Campaign, mở khóa tuần tự theo `clearedLevelIds`, giới hạn `allowedBaseDefenderIds`, và `startWaveIndex` khi Test Play.
2. **E2E (`apps/web/tests/e2e/production-home.spec.cjs`):**
   - Kiểm tra `Level Selection` động hiển thị Stage 1 Grassland và mở trận sạch lỗi console.
   - Kiểm tra trang `/editor` render không lỗi runtime, không hiện nút ghi Dev JSON khi chạy production, và API `/api/dev/levels` trả về `403` trên production server.
3. **Full Verification Suite:** Chạy `@mfd/game-data test`, `@mfd/game test`, `pnpm typecheck`, `pnpm build`, `pnpm --filter @mfd/web test:production`.
