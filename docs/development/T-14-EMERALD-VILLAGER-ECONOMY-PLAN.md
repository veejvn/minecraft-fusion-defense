# T-14 — Implementation Plan: Emerald Economy, Villager, Master Trader & Village Supply Chest

**Source file:** `docs/development/T-14-EMERALD-VILLAGER-ECONOMY-PLAN.md`  
**Status:** Confirmed Plan — Ready for Implementation (`2026-11-27`)  
**Authority:** [PGD-03 Confirmed Specifications](../decisions/PGD-03-EMERALD-VILLAGER-ECONOMY.md)

---

## Mục tiêu kỹ thuật

Triển khai trọn vẹn hệ thống kinh tế **Emerald (`EM`) + Villager + Master Trader + Village Supply Chest** cho cả Campaign (`/`) lẫn Balance Lab (`/playtest`), đảm bảo:
1. Deterministic 100% (mọi timer sản xuất của Villager/Master Trader, Rương Tiếp Tế Làng và `ResourceRng` đi qua `TransactionEngine`).
2. Hỗ trợ Pause (đóng băng mọi timer), Save/Resume qua reload (`snapshot-codec.ts`), và Atomic Rollback khi `QUEUE_OVERFLOW`.
3. Toàn bộ thông số mới (sản lượng/chu kỳ Villager & Master Trader, chu kỳ & lượng Ngọc Rương Làng, Emerald khởi đầu) có thể chỉnh trong `/playtest` Balance Editor và lưu thẳng xuống JSON qua **Save to Game JSON (Dev)**.

---

## Lộ trình thực hiện (6 Phases)

### Phase 1 — Tạo & Đăng ký 5 Pixel-Art Assets (`64×64` PNG)
1. Nhận 5 sprite từ phiên tạo ảnh vào đúng đường dẫn:
   - `apps/web/public/assets/sprites/items/emerald.png`
   - `apps/web/public/assets/sprites/defenders/villager.png`
   - `apps/web/public/assets/sprites/defenders/master_trader.png`
   - `apps/web/public/assets/sprites/items/village_chest_closed.png`
   - `apps/web/public/assets/sprites/items/village_chest_open.png`
2. Khai báo đầy đủ 5 asset trong `packages/game/src/assets/asset-manifest.ts` (`DEFENDER_SPRITE_ASSETS` + `ITEM_SPRITE_ASSETS`), giữ fallback hợp lý nếu chưa có file ảnh khi dev sớm, và cập nhật `packages/game/tests/asset-manifest.test.ts`.

---

### Phase 2 — Schema & Dữ liệu JSON (`@mfd/game-data`)
1. **`packages/game-data/src/mvp-dataset.ts`:**
   - Thêm trường optional `economyProduction?: { itemCount: number; amountPerItem: number; initialDelaySeconds: number; intervalSeconds: number }` vào `mvpDefenderSchema` & `playtestDefenderSyncSchema` (Villager: `1 × 25 EM`, Master Trader: `2 × 25 EM`, `initialDelaySeconds: 4`, `intervalSeconds: 8`).
   - Mở rộng `abilityEffectSchema` thêm `kind: 'resource-burst'` (`amount: positiveIntegerSchema`, `itemCount: positiveIntegerSchema`, `spawnAsItems: z.boolean()`).
   - Mở rộng `mvpGrasslandLevelSchema` / `mvpSandboxLevelSchema` với:
     - `initialEmeralds: nonNegativeIntegerSchema` (`100`)
     - `enablePassiveEnergy: z.boolean()` (`false`)
     - `villageChest: z.strictObject({ enabled: z.boolean(), amount: positiveIntegerSchema, intervalSeconds: positiveNumberSchema })` (`{ enabled: true, amount: 25, intervalSeconds: 10 }`)
   - Cập nhật đếm kiểm định trong `mvpDatasetSchema`: `6` Tier-1 Base (`5` Combat + `villager`), `16` Tier-2 Fusion (`15` cũ + `master_trader`), `16` Recipes (`15` cũ + `fusion_master_trader`), `22` Abilities (`20` cũ + `emerald_harvest` + `grand_caravan`).
   - Cập nhật `mergePlaytestPresetIntoDataset()` để nút **Save to Game JSON (Dev)** đồng bộ mượt các thông số `economyProduction`, `initialEmeralds`, `villageChest`.
2. **Các file JSON trong `packages/game-data/`:**
   - `entities/defenders.json`: thêm `villager` (`50 EM`, `5s CD`, `150 HP`, `economyProduction`) và `master_trader` (`0 EM`, `0s CD`, `300 HP`, `economyProduction`).
   - `entities/enemies.json`: đặt `energyReward: 0` cho 4 Enemy (`zombie`, `husk`, `vindicator`, `pillager`); giữ nguyên `crystalReward: 1` và `crystalDropChance` (`0`, `0.1`, `0.35`, `0.4`).
   - `recipes/fusion-recipes.json`: thêm `fusion_master_trader` (`["villager", "villager"] -> "master_trader"`).
   - `abilities/abilities.json`: thêm `emerald_harvest` (`+150 EM`, `6 × 25`) và `grand_caravan` (`+250 EM`, `10 × 25`).
   - `levels/grassland.json` & `levels/playtest-sandbox.json`: cấu hình `initialEmeralds: 100`, `enablePassiveEnergy: false`, `villageChest: { enabled: true, amount: 25, intervalSeconds: 10 }`, và tăng Wave 1 `initialDelaySeconds` lên `8`.

---

### Phase 3 — Core Simulation Runtime (`@mfd/game/src/core`, `abilities`, `persistence`)
1. **`resource-session.ts` & `battle-resources.ts`:**
   - Hỗ trợ `initialEnergy` (mặc định `50` cho test cũ, Campaign/Playtest truyền `100`) và `enablePassiveEnergy` (mặc định `true` cho test cũ, Campaign/Playtest truyền `false`).
   - Bổ sung **Village Supply Chest** (`villageChest` config + state):
     - Trạng thái trong `ResourceState`: `villageChestReady: boolean`, `villageChestNextTick: number | null`.
     - Lập lịch sự kiện `village-chest-ready` sau `ticksFromSeconds(intervalSeconds, rate)` khi bắt đầu trận (hoặc vừa claim xong).
     - Lệnh mới `{ type: 'claim-village-chest' }`: nếu `villageChestReady === true`, đặt `villageChestReady = false`, cộng `villageChest.amount` (`+25`), và xếp lịch `village-chest-ready` kế tiếp sau `intervalSeconds`. Reject gọn (`'chest-not-ready'`) nếu chưa sẵn sàng; miễn nhiễm hoàn toàn khi `PAUSED` hoặc `terminal`.
   - Bổ sung **Defender Economy Producer** (`economyProduction`):
     - Theo dõi `producerNextTickByEntityId?: Map<EntityId, number>` trong `ResourceState` + sự kiện `defender-produce`.
     - Khi `summon` (hoặc `fuse` ra `master_trader`) hoàn tất, nếu Defender có `economyProduction`, lập lịch `defender-produce` lần đầu sau `initialDelaySeconds` (`4s`).
     - Khi `defender-produce` thực thi: xác minh Defender còn sống; thả `itemCount` viên Emerald Item quanh tọa độ ô Defender (lệch nhẹ ngẫu nhiên bằng `ResourceRng` trong phạm vi ô), rồi lập lịch chu kỳ kế tiếp sau `intervalSeconds` (`8s`). Khi Defender bị xóa (`remove` / Shovel / chết / Fusion làm nguyên liệu), hủy trạng thái producer để timer cũ tự bỏ qua an toàn.
2. **`systems/battle-runtime.ts` & `persistence/snapshot-codec.ts`:**
   - Gắn `BattleRuntime` với các command/event mới (`claim-village-chest`, `village-chest-ready`, `defender-produce`), đóng băng tất cả khi Pause.
   - Mở rộng `snapshot-codec.ts` serialize & validate `villageChestReady`, `villageChestNextTick`, `producerNextTickByEntityId` trong Save/Resume Checkpoint (cùng `QUEUE_OVERFLOW` atomic rollback).
   - `persistence/progression-store.ts`: thêm `villager` vào danh sách mở khóa mặc định và `fusion_master_trader` vào recipe mở khóa mặc định.
3. **`abilities/ability-session.ts` & `abilities/ability-engine.ts`:**
   - Thêm effect `kind: 'resource-burst'` trong `executeImmediateEffect()`: cộng hoặc thả `itemCount` viên Collectible Emerald quanh caster (`emerald_harvest` +150 EM, `grand_caravan` +250 EM), rollback an toàn nếu fail.

---

### Phase 4 — Phaser Scenes, Controller & React HUD (`@mfd/game` + `@mfd/web`)
1. **`campaign-controller.ts` & `playtest-controller.ts`:**
   - Xuất thêm snapshot fields: `villageChest: { enabled: boolean; ready: boolean; remainingSeconds: number; totalSeconds: number; amount: number }` và phương thức `claimVillageChest(): boolean`.
   - Hiển thị đúng 6 thẻ Base Defender trên thanh mua (`Villager 50 EN`, `Iron Golem 50 EM`, `Snow Golem 75 EM`, `Skeleton 100 EM`, `Wolf 150 EM`, `Blaze 200 EM`) và giữ bố cục 1 màn hình vừa vặn `1366×768` không scroll dọc.
2. **`grassland-battle-scene.ts` & `playtest-scene.ts`:**
   - **Village Supply Chest UI trên Canvas:** Render sprite Rương ở rìa trái căn cứ (trước/bên cạnh Base Line). Khi `ready === false` hiện rương đóng kèm thanh/nhãn đếm giây nhỏ; khi `ready === true` hiện `village_chest_closed.png` nhấp nháy viền vàng/xanh lục; khi bấm vào gọi `claimVillageChest()` và chuyển sang `village_chest_open.png` trong ~`1.2s` kèm hiệu ứng `+25 EM` & hạt Ngọc lục bảo bay lên HUD.
   - **Collectible Emerald Item:** dùng texture `emerald.png` với hiệu ứng rơi/nảy nhẹ khi Villager hoặc Master Trader đẻ ngọc. Bổ sung **Hover-collect** (rê con trỏ lướt qua Item khi không kéo thẻ là thu thập tức thì) bên cạnh Click.
3. **Đổi tên hiển thị sang Emerald (`EM`) tại React UI:**
   - Cập nhật nhãn `Energy / EN` → `Emerald / EM`, icon `emerald.png` và màu nhấn `#10B981` / `#34D399` tại:
     - `battle-hud-overlay.tsx`
     - `playtest-host.tsx` (HUD + Balance Editor: thêm chỉnh `Initial Emeralds`, `Village Chest Amount / Interval`, và block `Economy Production` cho Villager / Master Trader, tương thích **Save to Game JSON (Dev)**)
     - `collection-modal.tsx` (hiển thị 6 Base + 16 Fusion + 16 Recipes)
     - `level-select-screen.tsx` & `how-to-play-modal.tsx`

---

### Phase 5 — Kiểm thử tự động & Nghiệm thu (Testing)
1. **Unit Tests (`@mfd/game-data` & `@mfd/game`):**
   - `packages/game-data/tests/mvp-dataset.test.ts`: validate `22` Defenders, `16` Recipes, `22` Abilities, `economyProduction`, `resource-burst`, `villageChest`.
   - `packages/game/tests/battle-resources.test.ts`: test `enablePassiveEnergy: false`, Enemy `energyReward: 0`, Village Chest timer/claim/cap-1/pause-freeze, Villager & Master Trader produce cadence + dọn timer khi chết/Shovel.
   - `packages/game/tests/battle-abilities.test.ts`: test `emerald_harvest` (+150 EM) và `grand_caravan` (+250 EM) trừ 1 Crystal và hỗ trợ rollback.
   - `packages/game/tests/battle-persistence.test.ts`: Save/Resume giữa chu kỳ Rương Làng & Villager Producer + rollback nguyên tử `QUEUE_OVERFLOW`.
   - `packages/game/tests/campaign-controller.test.ts` & `playtest-controller.test.ts`: test vòng đời `villager -> master_trader`, `claimVillageChest()`, 0 EM từ kill quái.
2. **Acceptance Bot (`packages/game/tests/mvp-qa-acceptance.test.ts`):**
   - Cập nhật bot chiến thuật Test 1: ưu tiên đặt `2–3 Villager` ở cột `0–1`, mở `Village Supply Chest` khi sẵn sàng + nhặt Emerald rơi ra, rồi dựng `Skeleton` + `Iron Golem` thắng trọn 5 Wave Grassland.
3. **E2E (`apps/web/tests/e2e/production-home.spec.cjs`):**
   - Cập nhật assertion Collection (`Base Defenders (6)`, `Fusion Defenders (16)`, `Fusion Recipes (16)`), kiểm tra `1366×768` zero scroll với 6 thẻ mua, xác nhận toàn bộ sprite mới tải sạch (`naturalWidth > 0`), và kiểm tra HUD/Playtest.

---

### Phase 6 — Playtest & Tinh chỉnh Balance
1. Chạy `pnpm dev`, mở `/playtest`, test thực chiến 5 Wave (cân đối lại độ bền Villager, tốc độ Wave 1–5, và giá trị Rương Làng nếu cần).
2. Bấm **Save to Game JSON (Dev)** để lưu bộ cân bằng ưng ý nhất xuống `packages/game-data/`.
