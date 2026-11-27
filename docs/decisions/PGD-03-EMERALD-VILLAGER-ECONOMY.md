# PGD-03 — Tái thiết kế Kinh tế: Emerald (Ngọc lục bảo) & Villager (Dân làng)

**Source file:** `docs/decisions/PGD-03-EMERALD-VILLAGER-ECONOMY.md`  
**Status:** Confirmed v1.0 — Approved by Owner (`2026-11-27`)  
**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md)

> [!IMPORTANT]
> Toàn bộ 6 quyết định kinh tế (`D1–D6`) và bộ thông số khởi điểm cho **Village Supply Chest**, **Villager**, **Master Trader**, **Emerald Harvest** và **Grand Caravan** trong tài liệu này đã được Chủ dự án **xác nhận (`Confirmed — 2026-11-27`)**, sẵn sàng triển khai theo [T-14 Plan](../development/T-14-EMERALD-VILLAGER-ECONOMY-PLAN.md). Các thông số số học vẫn có thể tiếp tục tinh chỉnh cân bằng trong `/playtest` ở bước playtest sau triển khai.

---

## 1. Bối cảnh & Mục tiêu

Chuyển đổi toàn bộ nền kinh tế triệu hồi Defender từ nguồn thụ động sang mô hình chủ động gắn liền chủ đề Minecraft:
1. **Đổi tên & hình ảnh tài nguyên triệu hồi** từ **Energy (`EN`)** sang **Emerald (`EM` — Ngọc lục bảo)**.
2. **Thêm Base Economy Defender — `villager` (Dân làng):** sản sinh Ngọc lục bảo định kỳ trên chiến trường (tương tự *Sunflower* trong *Plants vs. Zombies*), mở khóa sẵn từ đầu.
3. **Thêm Tier-2 Fusion Economy Defender — `master_trader` (Thương nhân Bậc thầy):** tạo thành từ **`villager + villager`** (`fusion_master_trader`, 0 EM, mở khóa sẵn từ đầu).
4. **Loại bỏ 2 nguồn thu nhập thụ động cũ:**
   - **Tắt** tự động cộng `+50` mỗi `3s` Game Time.
   - **Tắt** thưởng trực tiếp Energy/Emerald khi Enemy chết (`energyReward = 0`; chỉ giữ lại **`crystalDropChance` 0%–100%** để rớt Power Crystal).

---

## 2. Giá trị chiến thuật (Game Design Rationale)

- **Lore Minecraft thống nhất:** *Villager* & *Master Trader* tạo *Emerald*; *Iron Golem* & các Defender khác bảo vệ làng trước *Zombie*, *Husk*, *Vindicator*, *Pillager*; hậu phương có **Rương Tiếp Tế Làng (Village Supply Chest)**.
- **Chiều sâu chiến thuật (*Greedy vs. Safe*):** Mỗi ô đặt Villager đánh đổi 1 ô hỏa lực, tạo rủi ro trước *Pillager* tầm xa và *Vindicator* tốc độ cao.
- **Tối ưu giá trị công cụ hỗ trợ:** **Shovel** dùng để dọn Villager ở cuối trận nhường ô cho Defender chiến đấu; **Fusion Glove** dùng để di chuyển cứu Villager hoặc gom 2 Villager thành 1 `Master Trader`.

---

## 3. Đặc tả đã xác nhận (`Confirmed — 2026-11-27`)

### 3.1. Chống Soft-Lock: **Village Supply Chest (Rương Tiếp Tế Làng)** & Mở màn
- **Vị trí & Giao diện:** Đặt tại rìa trái Căn cứ (phía sau Cột 0). Sử dụng 2 sprite đóng/mở (`village_chest_closed.png` và `village_chest_open.png`).
- **Cơ chế hoạt động:**
  - Cứ mỗi **`10s` Game Time** (đóng băng khi `PAUSED`), nếu rương chưa sẵn sàng thì rương chuyển sang trạng thái **Sẵn sàng (Ready)** với hiệu ứng phát sáng nổi bật (ở trạng thái rương đóng `village_chest_closed.png`).
  - Khi người chơi **bấm vào Rương**, rương mở nắp (`village_chest_open.png` hiển thị ~`1.2s` kèm hiệu ứng Ngọc lục bảo văng ra), cộng ngay **`+25 Emerald`**, sau đó đóng lại và bắt đầu đếm ngược chu kỳ `10s` tiếp theo.
  - **Giới hạn tích trữ rương:** Tối đa `1` lượt tiếp tế chờ mở tại một thời điểm (không cộng dồn nhiều lượt nếu người chơi quên bấm — vừa chống soft-lock 100% khi mất hết Villager, vừa giữ nhịp tương tác chủ động).
- **Emerald khởi đầu (`t = 0`):** **`100 Emerald`**.
- **Wave 1 `initialDelaySeconds`:** **`8s` Game Time** (cho phép người chơi dựng 1–2 Villager và thu lứa Ngọc đầu tiên trước khi Wave 1 ập vào).

### 3.2. Thông số `villager` & `master_trader`

| Thuộc tính | `villager` (Base — Tier 1) | `master_trader` (Fusion — Tier 2) |
| --- | --- | --- |
| ID / Tên | `villager` / **Villager** | `master_trader` / **Master Trader** |
| Mở khóa | Mở từ đầu | Mở từ đầu (`villager + villager`) |
| Chi phí triệu hồi | `50 Emerald` | `0 Emerald` (Fusion từ 2 Villager) |
| Hồi chiêu thẻ | `5s` Game Time | `0s` |
| Máu (`maxHp`) | `150` | `300` |
| Sát thương / Tầm đánh / Giáp | `0` / `0` / `0` | `0` / `0` / `0` |
| Sản xuất đầu tiên (`initialDelaySeconds`) | `4s` sau khi đặt | `4s` sau khi hợp nhất |
| Chu kỳ sản xuất (`intervalSeconds`) | `8s` Game Time | `8s` Game Time |
| Sản lượng mỗi chu kỳ | `1 × 25 = 25 Emerald` | `2 × 25 = 50 Emerald` |
| Hình thức nhận | Thả `1` Collectible Emerald Item quanh ô | Thả `2` Collectible Emerald Item quanh ô |
| Special Ability (1 Crystal, 0s CD) | `emerald_harvest` (**+150 Emerald**) | `grand_caravan` (**+250 Emerald**) |

### 3.3. Cơ chế thu thập Collectible Emerald Item
- Mọi viên Emerald do `villager` / `master_trader` tạo ra là **Collectible Item** tồn tại **`10s` Game Time** (đóng băng timer khi `PAUSED`, vị trí lệch nhẹ xác định theo `ResourceRng` có seed).
- Hỗ trợ **cả 2 thao tác thu thập:**
  1. **Click / Tap** trực tiếp vào viên Ngọc.
  2. **Hover-collect** (rê chuột lướt qua viên Ngọc khi không đang kéo thẻ Defender/Tool) để nhặt nhanh liên hoàn không mỏi tay.
- Không mất khi đặt Defender lên ô có Item (giữ quy tắc auto-collect của `battle-resources.ts`).

### 3.4. Special Abilities mới (1 Power Crystal, 0s Cooldown, `requiresTarget: false`)
1. **`emerald_harvest` (Villager — Emerald Harvest):** Khi kích hoạt, Villager tung ra **`150 Emerald`** (`6` viên × `25 EM` tỏa quanh ô đứng hoặc cộng/rơi tức thì kèm VFX ngọc lục bảo).
2. **`grand_caravan` (Master Trader — Grand Caravan):** Khi kích hoạt, Master Trader tung ra **`250 Emerald`** (`10` viên × `25 EM` tỏa quanh ô đứng kèm VFX thương đoàn).

### 3.5. Danh mục 5 Sprite mới (`64×64` PNG, nền trong suốt, Minecraft 2D Pixel Art)

| Asset ID | Đường dẫn đích (`apps/web/public/assets/...`) | Kích thước | Mục đích |
| --- | --- | --- | --- |
| `emerald` | `/assets/sprites/items/emerald.png` | `64×64` | Ngọc lục bảo (HUD icon + Collectible Item thay thế/nâng cấp từ `energy_orb.png`) |
| `villager` | `/assets/sprites/defenders/villager.png` | `64×64` | Base Economy Defender (Dân làng áo nâu chắp tay, side-view nhìn sang phải) |
| `master_trader` | `/assets/sprites/defenders/master_trader.png` | `64×64` | Tier-2 Economy Fusion Defender (Thương nhân áo xanh viền vàng đeo túi ngọc) |
| `village_chest_closed` | `/assets/sprites/items/village_chest_closed.png` | `64×64` | Rương tiếp tế làng ở trạng thái đóng (hiển thị lúc chờ & lúc sẵn sàng mở) |
| `village_chest_open` | `/assets/sprites/items/village_chest_open.png` | `64×64` | Rương tiếp tế làng ở trạng thái mở nắp phát sáng xanh lục (hiển thị khi vừa bấm nhận ngọc) |

---

## 4. Tương thích kỹ thuật & Save/Resume

- **Biến nội bộ trong Simulation & Checkpoint:** Giữ tên field kỹ thuật nội bộ `energy` / `energyReward` ở tầng Engine & `snapshot-codec.ts` để bảo toàn khả năng tương thích schema Save/Checkpoint hiện tại; đồng thời **đổi 100% hiển thị UI, nhãn (`EM` / `Emerald`), icon và tài liệu sang Emerald**.
- **Enemy Rewards Campaign:** `energyReward = 0` cho 4 Enemy (`zombie`, `husk`, `vindicator`, `pillager`); cơ chế **`crystalDropChance` (`0%–100%`)** giữ nguyên không đổi (`0%`, `10%`, `35%`, `40%`).

---

## 5. Bảng Quyết định đã chốt (`Confirmed — 2026-11-27`)

| ID | Hạng mục | Quyết định của Owner | Trạng thái |
| --- | --- | --- | --- |
| **D1** | Chống soft-lock kinh tế | **Phương án 2 — Village Supply Chest** ở rìa trái căn cứ (`+25 EM / 10s`, bấm mở rương đóng/mở để nhận, tối đa 1 lượt chờ) | **Confirmed (`2026-11-27`)** |
| **D2** | Fusion cho Villager | **Phương án A:** `Villager + Villager → Master Trader` (`master_trader`, Tier 2, `300 HP`, `2 × 25 = 50 EM / 8s`, lứa đầu `4s`, `grand_caravan +250 EM`) | **Confirmed (`2026-11-27`)** |
| **D3** | Thu thập Ngọc lục bảo | Rơi thành **Collectible Item** quanh ô đứng (lifetime `10s`, hỗ trợ **Click + Hover-collect**) | **Confirmed (`2026-11-27`)** |
| **D4** | Special Abilities | `emerald_harvest` (`+150 EM`, 1 Crystal) cho Villager & `grand_caravan` (`+250 EM`, 1 Crystal) cho Master Trader | **Confirmed (`2026-11-27`)** |
| **D5** | Thông số mở màn | Khởi đầu **`100 EM`**; Villager **`50 EM / 5s CD`**, lứa đầu `4s`, sau đó `25 EM / 8s`; Wave 1 delay **`8s`** | **Confirmed (`2026-11-27`)** |
| **D6** | Asset & UI Rebrand | Tạo 5 sprite (`emerald`, `villager`, `master_trader`, `village_chest_closed`, `village_chest_open`); đổi 100% UI/Docs sang **Emerald (`EM`)** | **Confirmed (`2026-11-27`)** |

---

## 6. Tài liệu liên quan

- [T-14 Technical Implementation Plan](../development/T-14-EMERALD-VILLAGER-ECONOMY-PLAN.md)
- [ENTITY_CATALOG.md](../game-design/ENTITY_CATALOG.md)
- [GAME_BALANCING.md](../game-design/GAME_BALANCING.md)
- [ABILITY_CATALOG.md](../game-design/ABILITY_CATALOG.md)
- [FUSION_RECIPES.md](../game-design/FUSION_RECIPES.md)
