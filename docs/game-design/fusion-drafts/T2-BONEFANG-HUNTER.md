# Bonefang Hunter — Tier 2 Fusion Defender (Confirmed)

**Project:** Minecraft Fusion Defense  
**Document ID:** T2-BONEFANG-HUNTER  
**Entity ID:** `bonefang_hunter`  
**Recipe ID:** `fusion_bonefang_hunter`  
**Tier:** 2 (MVP Confirmed)  
**Status:** **CONFIRMED — ĐÃ ĐƯỢC OWNER PHÊ DUYỆT (2026-11-23)**  
**Tên Defender:** Bonefang Hunter  
**Phạm vi:** Nội dung MVP chính thức (1 trong 15 Tier-2 Fusion Defenders đã xác nhận).

> **Quyết định Owner (2026-11-23):** Đã nâng cấp lên chính thức theo cơ chế Predator Mark đã chốt. Tự động unlock khi **Wolf** unlock (`50` Enemy kills tích lũy trong các trận Victory).

## 1. Thông tin định danh

| Trường | Giá trị | Trạng thái |
|---|---|---|
| Tên hiển thị | Bonefang Hunter | **Confirmed** |
| Entity ID | `bonefang_hunter` | **Confirmed** |
| Recipe ID | `fusion_bonefang_hunter` | **Confirmed** |
| Tier | 2 | **Confirmed** |
| Nguyên liệu | Skeleton (`skeleton`) + Wolf (`wolf`) | **Confirmed** |
| Unlock rule | Tự động mở khi Wolf unlock (Skeleton mở từ đầu) | **Confirmed** |
| Combat role | Agile Melee / Hunter — cận chiến cơ động tốc độ đánh rất nhanh, xuyên giáp mục tiêu đơn. | **Confirmed** |
| Normal attack | Bone Claw | **Confirmed** |
| Special Ability | Predator Mark (`1` Power Crystal, `0s` cooldown, `melee-enemy`: tự buff `+100%` Attack Speed & `+50%` Attack Damage trong `6s` và tung ngay `4` đòn cào xương xuyên giáp cách nhau `0.2s`, mỗi đòn `110%` Attack Damage) | **Confirmed** |
| Ability ID | `predator_mark` | **Confirmed** |

## 2. Công thức Fusion

**Công thức đề xuất:** Skeleton (skeleton) + Wolf (wolf) → **Bonefang Hunter**

- Công thức này thuộc nhóm 8 công thức Tier 2 đang Draft.
- Không nằm trong danh sách 7 Fusion Recipes MVP đã xác nhận.
- Chưa có quyết định về unlock condition, recipe enablement hoặc thời điểm đưa vào game.
- Thứ tự hai nguyên liệu không làm thay đổi ý tưởng output; quy tắc vận hành cuối cùng vẫn cần tuân theo Fusion system khi được phê duyệt.

## 3. Ý tưởng thiết kế và chủ đề kết hợp

Một thợ săn dạng sói mang cấu trúc xương lộ rõ, kết hợp bản năng truy đuổi của Wolf với hình ảnh xương và vũ khí của Skeleton.

**Design pillar:** Defender cần thể hiện được cả hai nguồn nguyên liệu trong cùng một bản sắc mới, thay vì chỉ là một Base Defender được tăng kích thước hoặc chỉ số.

## 4. Ngoại hình và đặc điểm nhận diện

Sói gầy nhanh nhẹn, một phần xương sườn và hàm lộ ra, có mảnh giáp/xương nhọn dọc lưng; mắt phát sáng nhẹ. Có thể mang dấu hiệu cung thủ như mũi tên gãy hoặc ống tên, nhưng hình dáng chính vẫn là thú săn bốn chân.

**Yêu cầu đọc hình ảnh:**
- Nhận diện được ngay ở kích thước sprite gameplay.
- Có ít nhất một đặc điểm thị giác đại diện cho mỗi nguyên liệu.
- Silhouette không gây nhầm lẫn với các Fusion Defender đã có.
- Các chi tiết trang trí không được ngụ ý một gameplay mechanic chưa được phê duyệt.

## 5. Vai trò chiến đấu

**Vai trò đề xuất:** Agile Melee / Hunter — cận chiến cơ động, ưu tiên truy đuổi hoặc đánh dấu mục tiêu.

Đây là định hướng để tạo chỗ đứng riêng trong đội hình, không phải xác nhận về chỉ số hoặc hiệu quả chiến đấu. Cần so sánh với các Defender Tier 1 và Tier 2 hiện hành trước khi chốt vai trò cuối.

## 6. Đòn đánh thường

Bone Claw — vồ/cào mục tiêu bằng móng xương. Hiệu ứng bleed/mark chưa được chốt và không mặc định tồn tại.

Các thuộc tính chưa được quyết định:
- Damage value và damage type.
- Attack speed, attack range và projectile speed (nếu có).
- Targeting strategy và cách xử lý khi có nhiều mục tiêu.
- Có áp dụng status effect hoặc tương tác đặc biệt hay không.

**Trạng thái:** Proposed concept; toàn bộ thông số thực thi TBD.

## 7. Kỹ năng đặc biệt

Predator Mark — đánh dấu một Enemy để tạo lợi thế săn đuổi. Cần quyết định mark chỉ hiển thị, tăng sát thương nhận vào, ưu tiên targeting hay một hiệu ứng khác.

**Ability ID đề xuất:** predator_mark

Tên và ý tưởng trên chỉ là bản nháp. Đây chưa phải Ability Definition và chưa được thêm vào danh mục 12 Special Abilities MVP đã xác nhận.

Các trường cần Owner duyệt trước khi đặc tả:
- powerCrystalCost, cooldownSeconds.
- requiresTarget, targetScope.
- Loại Effect, damage/status/shield/buff nếu có.
- Phạm vi, duration, cadence, stacking/refresh và lifecycle.
- Điều kiện từ chối kích hoạt và hành vi khi Owner chết hoặc bị Fusion.

## 8. Điểm mạnh dự kiến

Kết hợp hình ảnh Skeleton + Wolf rõ; có thể có vai trò săn mục tiêu đơn, khác với hỗ trợ đồng minh của Alpha Wolf.

## 9. Điểm yếu và giới hạn cần giữ

Nguy cơ trùng Alpha Wolf, Flame Fang và Frostfang ở melee; khái niệm mark có thể làm tăng độ phức tạp targeting.

Điểm yếu cần có ý nghĩa gameplay thực tế, không chỉ là mô tả trang trí. Không tự gán nhược điểm như chi phí cao, cooldown dài hoặc tốc độ chậm khi chưa có thông số được duyệt.

## 10. Tương tác với hệ thống gameplay

Nếu Predator Mark thay đổi ưu tiên target hoặc damage received, cần định nghĩa rõ thời hạn, refresh/stack và tương tác với target strategy. Không tự giả định Wolf có thể đổi Lane hoặc đuổi mục tiêu ngoài phạm vi. Fusion Output theo quy tắc chung.

**Các nguyên tắc đã có của dự án vẫn được giữ nguyên:**
- Grid MVP là 5 Lane × 9 Columns.
- Mỗi Defender chiếm một Grid Cell; targeting được cấu hình theo từng Defender.
- Fusion miễn phí, không tiêu Energy hoặc Power Crystal.
- Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effect tích cực/tiêu cực từ hai nguyên liệu và có thể tấn công khi có target hợp lệ.
- Không có Tier ceiling cố định trong engine, nhưng mọi Recipe mới cần Owner phê duyệt trước khi trở thành nội dung game.

Các nguyên tắc trên không có nghĩa công thức Draft này đã được bật hoặc được thêm vào MVP.

## 11. Thông số TBD và quyết định cần Owner xác nhận

Mark là debuff hay chỉ đổi targeting; mark có tăng damage không; Bonefang đánh một mục tiêu hay chuyển mục tiêu nhanh; khác Alpha Wolf ở DPS cá nhân hay utility; có cần hiệu ứng xương/bleed không.

| Hạng mục | Trạng thái |
|---|---|
| Max HP | TBD |
| Attack Damage | TBD |
| Attack Speed | TBD |
| Attack Range | TBD |
| Targeting strategy | TBD |
| Summon Energy cost (nếu có cách mở/sử dụng trong tương lai) | TBD |
| Normal attack effect | Proposed |
| Special Ability effect | Proposed |
| Power Crystal cost / cooldown | TBD |
| Unlock condition | TBD |
| Sprite dimensions / animation frames / VFX | TBD |
| Có thuộc MVP hay không | Chưa được phê duyệt |

Không được suy ra hoặc điền giá trị từ Defender khác. Khi có xung đột với quyết định hiện hành, dừng và hỏi Owner.

## 12. Tiêu chí hoàn thiện hồ sơ và tài liệu liên quan

- [ ] Owner phê duyệt công thức Fusion và trạng thái roster.
- [ ] Owner phê duyệt vai trò và trade-off gameplay.
- [ ] Ngoại hình có silhouette/visual brief đủ rõ để tạo concept art.
- [ ] Normal attack có targeting, damage type và quy tắc hit được xác định.
- [ ] Special Ability có Effect Definition tương thích Ability system.
- [ ] Tất cả thông số cần thiết được quyết định hoặc tiếp tục ghi TBD một cách có chủ đích.
- [ ] Đánh giá trùng lặp vai trò với các Defender đã duyệt.
- [ ] Chỉ sau khi có phê duyệt riêng mới đồng bộ vào catalog, recipe data, ability data, progression, tests hoặc MVP scope.

**Câu hỏi thiết kế đang mở:** Mark là debuff hay chỉ đổi targeting; mark có tăng damage không; Bonefang đánh một mục tiêu hay chuyển mục tiêu nhanh; khác Alpha Wolf ở DPS cá nhân hay utility; có cần hiệu ứng xương/bleed không.

**Tài liệu liên quan:** [Entity Catalog](../ENTITY_CATALOG.md) · [Fusion Recipes](../FUSION_RECIPES.md) · [Ability Catalog](../ABILITY_CATALOG.md)

---

**Kết thúc hồ sơ — Bonefang Hunter — DRAFT / NOT APPROVED**
