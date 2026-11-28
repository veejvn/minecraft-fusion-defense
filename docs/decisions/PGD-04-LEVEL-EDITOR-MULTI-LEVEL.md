# PGD-04 — Trình tạo màn chơi (`/editor`) & Hệ thống nhiều màn Campaign

**Source file:** `docs/decisions/PGD-04-LEVEL-EDITOR-MULTI-LEVEL.md`  
**Status:** Confirmed v1.0 — Approved by Owner (`2026-11-28`)  
**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md)

> [!IMPORTANT]
> Toàn bộ 5 quyết định thiết kế (`D1–D5`) cho **Dev Stage Studio (`/editor`)**, **Multi-Level Campaign**, **Đơn vị đặt sẵn đầu màn (`startingDefenders`)** và **Giới hạn Defender được phép dùng (`allowedBaseDefenderIds`)** đã được Chủ dự án xác nhận (`Confirmed — 2026-11-28`) để làm cơ sở triển khai theo [T-15 Implementation Plan](../development/T-15-LEVEL-EDITOR-AND-MULTI-LEVEL-PLAN.md).

---

## 1. Bối cảnh & Mục tiêu

Mở rộng hệ thống từ 1 màn Grassland cố định thành nền tảng **Multi-Level Campaign** hướng dữ liệu (data-driven), cho phép Chủ dự án tự thiết kế, tinh chỉnh Wave timeline, thử nghiệm trực tiếp theo từng Wave và lưu thành màn chơi Campaign chính thức mà không cần sửa code thủ công cho từng màn mới.

---

## 2. Các Quyết định đã xác nhận (`Confirmed — 2026-11-28`)

### D1 — Phạm vi tính năng: **Phương án A — Dev Stage Studio + Multi-Level Campaign**
- Tập trung vào công cụ sản xuất màn chơi Campaign chính thức trong môi trường dev cục bộ (`packages/game-data/levels/`).
- Các màn chơi đã lưu tự động xuất hiện trong màn hình **Level Selection** tại `/` theo đúng thứ tự (`order`) và điều kiện mở khóa (`unlockRequirement`).
- Tính năng Custom Level phía người chơi cuối (`localStorage` + chia sẻ từ Main Menu) tạm hoãn ngoài phạm vi T-15.

### D2 — Đường dẫn chuyên sâu: **Trang riêng `/editor`**
- Tạo Next.js App Router page riêng `apps/web/app/editor/page.tsx` tách biệt với `/playtest` (cân bằng chỉ số thực thể) và `/` (Campaign runtime).
- Tích hợp:
  1. **Wave Timeline 5 Lane trực quan (`L1–L5`):** Trục thời gian `0s → cuối Wave`, hiển thị marker Enemy theo từng nhóm spawn (`fixed` / `sequential` / `random`), tổng số Enemy, tổng HP của Wave, và công cụ thêm / xóa / nhân bản / sắp xếp Wave linh hoạt (`1..20` Waves mỗi màn).
  2. **Lưới 5×10 đặt đơn vị sẵn (`startingDefenders`)** & bộ lọc giới hạn Defender (`allowedBaseDefenderIds`).
  3. **Form Kinh tế & Metadata màn chơi:** Emerald khởi đầu (`initialEmeralds`), Passive Energy toggle, Rương Tiếp Tế Làng (`villageChest`), hồi chiêu Fusion Glove, `waveCrystals[]`, `seed`, `difficulty`, `theme`, `unlockRequirement`.
  4. **Test Play tại chỗ:** Hỗ trợ chạy thử toàn màn hoặc **Start from Wave N** (kèm Emerald giả lập tùy chọn để kiểm tra thẳng các Wave cuối).
  5. **Bảo mật môi trường production:** API đọc/ghi màn chơi `/api/dev/levels` chỉ hoạt động khi `process.env.NODE_ENV === 'development'` và trả về HTTP `403` ở production build.

### D3 — Phạm vi dữ liệu mỗi màn chơi (v1)
1. **Metadata màn chơi:**
   - `id` (`^[a-z][a-z0-9_]*$`), `order` (số nguyên dương để sắp xếp hiển thị), `name`, `description`, `difficulty` (`'easy' | 'normal' | 'hard' | 'expert'`), `theme` (`'grassland'`, mở rộng dần cho tile biome tương lai), `seed`, `unlockRequirement` (`{ kind: 'always' }` hoặc `{ kind: 'clear-level'; levelId: string }`).
2. **Wave linh hoạt (`1..20` Waves):** Không khóa cứng 5 Wave như bản Prototype ban đầu; `waveCrystals.length` phải khớp đúng `waves.length`.
3. **Đơn vị đặt sẵn đầu màn (`startingDefenders`):**
   - Mảng tùy chọn `{ definitionId: string; row: 0..4; column: 0..9 }[]`.
   - Hỗ trợ cả Tier-1 Base Defender lẫn Tier-2 Fusion Defender; không trùng tọa độ `(row, column)`.
   - Khi trận đấu khởi tạo ở tick `0`, mọi `startingDefenders` được đặt miễn phí lên lưới (không tốn Emerald, không kích hoạt cooldown mua thẻ); nếu là đơn vị kinh tế (`villager` / `master_trader`) thì chu kỳ `defender-produce` được kích hoạt ngay từ tick `0`.
4. **Giới hạn Defender được phép dùng (`allowedBaseDefenderIds`):**
   - Mảng tùy chọn (khác rỗng) các Tier-1 Base Defender ID được phép mua trong màn chơi, kèm cờ `ignoreUnlockRestrictions?: boolean` (tùy chọn cho màn thử thách/showcase).
   - Khi bỏ trống (`undefined`), màn chơi dùng tiến trình mở khóa bình thường của người chơi (`ProgressionStore`).
   - Khi thiết lập, chỉ các Base Defender nằm trong danh sách được phép triệu hồi từ thanh bài (giao với tiến trình mở khóa nếu `ignoreUnlockRestrictions !== true`). Fusion Recipe vẫn hoạt động bình thường cho mọi cặp Defender đang hiện diện trên lưới (kể cả từ `startingDefenders`).

### D4 — Lưu trữ dữ liệu & Đóng gói Next.js (`@mfd/game-data`)
- Lưu danh sách các màn Campaign chính thức trong `packages/game-data/levels/campaign-levels.json` (được import tĩnh trong `packages/game-data/src/mvp-dataset.ts` để đảm bảo Next.js Turbopack/webpack bundle tĩnh khi build và HMR tức thì khi dev).
- Luôn giữ màn `grassland` làm Stage #1 (không được phép xóa qua API), và đồng bộ hai chiều với `packages/game-data/levels/grassland.json` + alias `MVP_GAME_DATA.grasslandLevel` để giữ tương thích 100% với nút **Save to Game JSON (Dev)** ở `/playtest` và toàn bộ bộ test hiện tại.
- Cho phép Export/Import JSON từng màn riêng lẻ trong `/editor` để sao lưu hoặc chia sẻ preset màn chơi.

### D5 — Tương thích Save/Resume & Tiến trình (`ProgressionStore`)
- `BattleCheckpointEnvelope` / `BattleState` lưu thêm `levelId?: string` (mặc định là `'grassland'` khi khôi phục các file save cũ không có trường này).
- `ProgressionProfile` lưu thêm `clearedLevelIds?: string[]` (mặc định `[]` với save cũ, cập nhật đơn điệu khi Victory theo từng `levelId`). Các mốc mở khóa theo tổng số Victory và Victory Kills (`snow_golem`, `wolf`, `blaze`) tiếp tục tích lũy trên mọi màn Campaign.

---

## 3. Tài liệu liên quan

- [T-15 Implementation Plan](../development/T-15-LEVEL-EDITOR-AND-MULTI-LEVEL-PLAN.md)
- [PGD-03 Emerald & Villager Economy](PGD-03-EMERALD-VILLAGER-ECONOMY.md)
- [LEVEL_DESIGN.md](../game-design/LEVEL_DESIGN.md)
- [ROADMAP.md](../product/ROADMAP.md)
