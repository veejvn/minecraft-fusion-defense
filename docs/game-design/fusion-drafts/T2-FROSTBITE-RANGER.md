# Frostbite Ranger — Tier 2 Fusion Defender (Draft)

**Project:** Minecraft Fusion Defense  
**Document ID:** T2-FROSTBITE-RANGER  
**Entity ID đề xuất:** frostbite_ranger  
**Recipe ID đề xuất:** fusion_frostbite_ranger  
**Tier:** 2 (đề xuất cho công thức tương lai)  
**Status:** **DRAFT — CHƯA ĐƯỢC OWNER PHÊ DUYỆT**  
**Tên Defender:** Giữ nguyên theo quyết định Owner.  
**Phạm vi:** Hồ sơ ý tưởng thiết kế; không phải nội dung MVP đã duyệt, không phải đặc tả triển khai.

> **Ranh giới phê duyệt:** Owner đã yêu cầu giữ tám công thức mới ở trạng thái Draft và giữ tên Defender. Việc có hồ sơ này trong repository không biến công thức, Entity ID, Recipe ID, vai trò, đòn đánh hay Ability thành nội dung Confirmed. MVP hiện tại vẫn có đúng 7 Fusion Recipes Tier 2 đã được phê duyệt. Không tự thêm hồ sơ này vào roster, recipe catalog, Ability Catalog hoặc Production Game Dataset.

## 1. Thông tin định danh

| Trường | Giá trị | Trạng thái |
|---|---|---|
| Tên hiển thị | Frostbite Ranger | Tên được Owner giữ lại cho bản Draft |
| Entity ID | frostbite_ranger | Proposed |
| Recipe ID | fusion_frostbite_ranger | Proposed |
| Tier | 2 | Draft concept |
| Nguyên liệu | Snow Golem (snow_golem) + Skeleton (skeleton) | Draft recipe |
| Combat role | Ranged Damage / Slow Control — xạ thủ gây áp lực tầm xa và có định hướng làm chậm. | Proposed |
| Normal attack | Frozen Arrow | Proposed |
| Special Ability | Glacier Barrage | Proposed |
| Ability ID đề xuất | glacier_barrage | Proposed |

## 2. Công thức Fusion

**Công thức đề xuất:** Snow Golem (snow_golem) + Skeleton (skeleton) → **Frostbite Ranger**

- Công thức này thuộc nhóm 8 công thức Tier 2 đang Draft.
- Không nằm trong danh sách 7 Fusion Recipes MVP đã xác nhận.
- Chưa có quyết định về unlock condition, recipe enablement hoặc thời điểm đưa vào game.
- Thứ tự hai nguyên liệu không làm thay đổi ý tưởng output; quy tắc vận hành cuối cùng vẫn cần tuân theo Fusion system khi được phê duyệt.

## 3. Ý tưởng thiết kế và chủ đề kết hợp

Một cung thủ bộ xương được phủ băng tuyết, kết hợp khả năng khống chế lạnh của Snow Golem với kỹ năng bắn xa của Skeleton.

**Design pillar:** Defender cần thể hiện được cả hai nguồn nguyên liệu trong cùng một bản sắc mới, thay vì chỉ là một Base Defender được tăng kích thước hoặc chỉ số.

## 4. Ngoại hình và đặc điểm nhận diện

Khung xương phủ lớp băng mỏng ở vai, cẳng tay và xương sườn; cung băng có dây cung phát sáng lạnh; đầu tên tạo hình tinh thể. Tông trắng tuyết, xanh băng và xám xương.

**Yêu cầu đọc hình ảnh:**
- Nhận diện được ngay ở kích thước sprite gameplay.
- Có ít nhất một đặc điểm thị giác đại diện cho mỗi nguyên liệu.
- Silhouette không gây nhầm lẫn với các Fusion Defender đã có.
- Các chi tiết trang trí không được ngụ ý một gameplay mechanic chưa được phê duyệt.

## 5. Vai trò chiến đấu

**Vai trò đề xuất:** Ranged Damage / Slow Control — xạ thủ gây áp lực tầm xa và có định hướng làm chậm.

Đây là định hướng để tạo chỗ đứng riêng trong đội hình, không phải xác nhận về chỉ số hoặc hiệu quả chiến đấu. Cần so sánh với các Defender Tier 1 và Tier 2 hiện hành trước khi chốt vai trò cuối.

## 6. Đòn đánh thường

Frozen Arrow — bắn mũi tên băng. Ý tưởng gắn Slow là đề xuất; mức Slow, thời gian và điều kiện áp dụng TBD.

Các thuộc tính chưa được quyết định:
- Damage value và damage type.
- Attack speed, attack range và projectile speed (nếu có).
- Targeting strategy và cách xử lý khi có nhiều mục tiêu.
- Có áp dụng status effect hoặc tương tác đặc biệt hay không.

**Trạng thái:** Proposed concept; toàn bộ thông số thực thi TBD.

## 7. Kỹ năng đặc biệt

Glacier Barrage — bắn loạt tên băng xuống hoặc dọc theo tuyến địch. Số đạn, cadence, phạm vi và việc có thể đánh nhiều mục tiêu TBD.

**Ability ID đề xuất:** glacier_barrage

Tên và ý tưởng trên chỉ là bản nháp. Đây chưa phải Ability Definition và chưa được thêm vào danh mục 12 Special Abilities MVP đã xác nhận.

Các trường cần Owner duyệt trước khi đặc tả:
- powerCrystalCost, cooldownSeconds.
- requiresTarget, targetScope.
- Loại Effect, damage/status/shield/buff nếu có.
- Phạm vi, duration, cadence, stacking/refresh và lifecycle.
- Điều kiện từ chối kích hoạt và hành vi khi Owner chết hoặc bị Fusion.

## 8. Điểm mạnh dự kiến

Kết hợp rõ ràng giữa bắn xa và kiểm soát bằng băng; tạo lựa chọn kiểm soát từ xa bên cạnh Ice Golem và Frost Guardian.

## 9. Điểm yếu và giới hạn cần giữ

Dễ trùng chức năng Slow của Snow Golem/Ice Golem hoặc loạt đạn của Skeleton Sniper; cần xác định trade-off và điểm độc đáo.

Điểm yếu cần có ý nghĩa gameplay thực tế, không chỉ là mô tả trang trí. Không tự gán nhược điểm như chi phí cao, cooldown dài hoặc tốc độ chậm khi chưa có thông số được duyệt.

## 10. Tương tác với hệ thống gameplay

Không tự mặc định Freeze, Slow mạnh hoặc xuyên Lane. Nếu có status, phải tuân theo quy tắc status hiện hành và được định nghĩa cụ thể trong Ability Catalog sau khi Owner duyệt. Fusion Output theo quy tắc chung.

**Các nguyên tắc đã có của dự án vẫn được giữ nguyên:**
- Grid MVP là 5 Lane × 9 Columns.
- Mỗi Defender chiếm một Grid Cell; targeting được cấu hình theo từng Defender.
- Fusion miễn phí, không tiêu Energy hoặc Power Crystal.
- Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effect tích cực/tiêu cực từ hai nguyên liệu và có thể tấn công khi có target hợp lệ.
- Không có Tier ceiling cố định trong engine, nhưng mọi Recipe mới cần Owner phê duyệt trước khi trở thành nội dung game.

Các nguyên tắc trên không có nghĩa công thức Draft này đã được bật hoặc được thêm vào MVP.

## 11. Thông số TBD và quyết định cần Owner xác nhận

Frozen Arrow có Slow mỗi hit hay chỉ khi proc; Glacier Barrage là projectile hay falling-area; có nhắm mục tiêu đơn hay cả Lane; khác gì Blizzard và Absolute Zero; sát thương có thấp hơn xạ thủ khác để đổi lấy control không.

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

**Câu hỏi thiết kế đang mở:** Frozen Arrow có Slow mỗi hit hay chỉ khi proc; Glacier Barrage là projectile hay falling-area; có nhắm mục tiêu đơn hay cả Lane; khác gì Blizzard và Absolute Zero; sát thương có thấp hơn xạ thủ khác để đổi lấy control không.

**Tài liệu liên quan:** [Entity Catalog](../ENTITY_CATALOG.md) · [Fusion Recipes](../FUSION_RECIPES.md) · [Ability Catalog](../ABILITY_CATALOG.md)

---

**Kết thúc hồ sơ — Frostbite Ranger — DRAFT / NOT APPROVED**
