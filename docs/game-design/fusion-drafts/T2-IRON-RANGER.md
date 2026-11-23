# Iron Ranger — Tier 2 Fusion Defender (Confirmed)

**Project:** Minecraft Fusion Defense  
**Document ID:** T2-IRON-RANGER  
**Entity ID:** `iron_ranger`  
**Recipe ID:** `fusion_iron_ranger`  
**Tier:** 2 (MVP Confirmed)  
**Status:** **CONFIRMED — ĐÃ ĐƯỢC OWNER PHÊ DUYỆT (2026-11-23)**  
**Tên Defender:** Iron Ranger  
**Phạm vi:** Nội dung MVP chính thức (1 trong 15 Tier-2 Fusion Defenders đã xác nhận).

> **Quyết định Owner (2026-11-23):** Đã nâng cấp lên chính thức: *Iron Ranger là xạ thủ sát thương hạng nặng, bắn chậm nhưng sát thương rất lớn, phù hợp kết liễu nhanh chóng kẻ địch máu nhiều (như Husk), nhưng yếu trước kẻ địch có tốc độ di chuyển cao (như Vindicator).* Unlock ngay từ đầu (`iron_golem + skeleton`).

## 1. Thông tin định danh

| Trường | Giá trị | Trạng thái |
|---|---|---|
| Tên hiển thị | Iron Ranger | **Confirmed** |
| Entity ID | `iron_ranger` | **Confirmed** |
| Recipe ID | `fusion_iron_ranger` | **Confirmed** |
| Tier | 2 | **Confirmed** |
| Nguyên liệu | Iron Golem (`iron_golem`) + Skeleton (`skeleton`) | **Confirmed** |
| Unlock rule | Unlocked at the start (cả Iron Golem và Skeleton mở từ đầu) | **Confirmed** |
| Combat role | Heavy Ranged Marksman — xạ thủ sát thương hạng nặng, bắn chậm nhưng sát thương lớn, chuyên trị kẻ địch máu cao, sợ kẻ địch tốc độ cao. | **Confirmed** |
| Normal attack | Steel Bolt (bắn chậm, sát thương đơn mục tiêu rất lớn) | **Confirmed** |
| Special Ability | Siege Volley (`1` Power Crystal, `0s` cooldown, `same-lane-enemy-in-range`: bắn loạt `3` chốt thép xuyên giáp nặng cách nhau `0.3s`, mỗi chốt gây `200%` Attack Damage) | **Confirmed** |
| Ability ID | `siege_volley` | **Confirmed** |

## 2. Công thức Fusion

**Công thức đề xuất:** Iron Golem (iron_golem) + Skeleton (skeleton) → **Iron Ranger**

- Công thức này thuộc nhóm 8 công thức Tier 2 đang Draft.
- Không nằm trong danh sách 7 Fusion Recipes MVP đã xác nhận.
- Chưa có quyết định về unlock condition, recipe enablement hoặc thời điểm đưa vào game.
- Thứ tự hai nguyên liệu không làm thay đổi ý tưởng output; quy tắc vận hành cuối cùng vẫn cần tuân theo Fusion system khi được phê duyệt.

## 3. Ý tưởng thiết kế và chủ đề kết hợp

Một xạ thủ bộ xương được gia cố bằng giáp và cấu kiện sắt của Iron Golem.

**Design pillar:** Defender cần thể hiện được cả hai nguồn nguyên liệu trong cùng một bản sắc mới, thay vì chỉ là một Base Defender được tăng kích thước hoặc chỉ số.

## 4. Ngoại hình và đặc điểm nhận diện

Khung xương mảnh của Skeleton nằm trong bộ giáp sắt ghép tấm; vai và ngực có mảng giáp dày, cung cơ khí được gia cố bằng kim loại. Silhouette ưu tiên dáng cung thủ, không biến thành một Golem cồng kềnh. Bảng màu dự kiến: xám sắt, trắng xương và điểm nhấn tối.

**Yêu cầu đọc hình ảnh:**
- Nhận diện được ngay ở kích thước sprite gameplay.
- Có ít nhất một đặc điểm thị giác đại diện cho mỗi nguyên liệu.
- Silhouette không gây nhầm lẫn với các Fusion Defender đã có.
- Các chi tiết trang trí không được ngụ ý một gameplay mechanic chưa được phê duyệt.

## 5. Vai trò chiến đấu

**Vai trò đề xuất:** Armored Ranged Damage — xạ thủ tầm xa có hình ảnh bền bỉ hơn Skeleton, tập trung vào phát bắn chính xác.

Đây là định hướng để tạo chỗ đứng riêng trong đội hình, không phải xác nhận về chỉ số hoặc hiệu quả chiến đấu. Cần so sánh với các Defender Tier 1 và Tier 2 hiện hành trước khi chốt vai trò cuối.

## 6. Đòn đánh thường

Steel Bolt — bắn một mũi tên hoặc chốt kim loại theo hướng mục tiêu. Tên đòn đánh và ý tưởng đạn xuyên giáp là đề xuất; chưa chốt xuyên mục tiêu, loại sát thương hay hệ số.

Các thuộc tính chưa được quyết định:
- Damage value và damage type.
- Attack speed, attack range và projectile speed (nếu có).
- Targeting strategy và cách xử lý khi có nhiều mục tiêu.
- Có áp dụng status effect hoặc tương tác đặc biệt hay không.

**Trạng thái:** Proposed concept; toàn bộ thông số thực thi TBD.

## 7. Kỹ năng đặc biệt

Siege Volley — phóng một loạt chốt thép vào tuyến địch. Đây là ý tưởng kỹ năng diện rộng/tập trung hỏa lực; số đạn, nhịp bắn, phạm vi, cách chọn mục tiêu và hiệu ứng phụ đều TBD.

**Ability ID đề xuất:** siege_volley

Tên và ý tưởng trên chỉ là bản nháp. Đây chưa phải Ability Definition và chưa được thêm vào danh mục 12 Special Abilities MVP đã xác nhận.

Các trường cần Owner duyệt trước khi đặc tả:
- powerCrystalCost, cooldownSeconds.
- requiresTarget, targetScope.
- Loại Effect, damage/status/shield/buff nếu có.
- Phạm vi, duration, cadence, stacking/refresh và lifecycle.
- Điều kiện từ chối kích hoạt và hành vi khi Owner chết hoặc bị Fusion.

## 8. Điểm mạnh dự kiến

Hình ảnh thể hiện rõ sự kết hợp Skeleton + Iron Golem; định vị xạ thủ có giáp, tạo khác biệt với Skeleton Sniper và Inferno Archer.

## 9. Điểm yếu và giới hạn cần giữ

Có nguy cơ trùng vai trò với các Defender đánh xa Tier 2 hiện có; cần xác định lợi thế riêng thay vì chỉ tăng sát thương hoặc độ bền.

Điểm yếu cần có ý nghĩa gameplay thực tế, không chỉ là mô tả trang trí. Không tự gán nhược điểm như chi phí cao, cooldown dài hoặc tốc độ chậm khi chưa có thông số được duyệt.

## 10. Tương tác với hệ thống gameplay

Dự kiến hoạt động theo quy tắc Defender trên Grid 5 × 9, chọn mục tiêu theo cấu hình riêng của Defender. Không giả định bắn xuyên Lane, xuyên giáp hoặc xuyên nhiều Enemy nếu chưa được duyệt. Khi Fusion, Output phải tuân thủ quy tắc chung: 100% Max HP của chính nó, không kế thừa status effect từ nguyên liệu và sẵn sàng tấn công khi có mục tiêu hợp lệ.

**Các nguyên tắc đã có của dự án vẫn được giữ nguyên:**
- Grid MVP là 5 Lane × 9 Columns.
- Mỗi Defender chiếm một Grid Cell; targeting được cấu hình theo từng Defender.
- Fusion miễn phí, không tiêu Energy hoặc Power Crystal.
- Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effect tích cực/tiêu cực từ hai nguyên liệu và có thể tấn công khi có target hợp lệ.
- Không có Tier ceiling cố định trong engine, nhưng mọi Recipe mới cần Owner phê duyệt trước khi trở thành nội dung game.

Các nguyên tắc trên không có nghĩa công thức Draft này đã được bật hoặc được thêm vào MVP.

## 11. Thông số TBD và quyết định cần Owner xác nhận

Chốt đây là xạ thủ đơn mục tiêu hay bắn nhiều mục tiêu; cơ chế xuyên giáp có cần thiết không; tầm đánh và tốc độ đạn; mức độ chống chịu so với Skeleton Sniper; Ability có cần mục tiêu hợp lệ hay kích hoạt chủ động được.

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

**Câu hỏi thiết kế đang mở:** Chốt đây là xạ thủ đơn mục tiêu hay bắn nhiều mục tiêu; cơ chế xuyên giáp có cần thiết không; tầm đánh và tốc độ đạn; mức độ chống chịu so với Skeleton Sniper; Ability có cần mục tiêu hợp lệ hay kích hoạt chủ động được.

**Tài liệu liên quan:** [Entity Catalog](../ENTITY_CATALOG.md) · [Fusion Recipes](../FUSION_RECIPES.md) · [Ability Catalog](../ABILITY_CATALOG.md)

---

**Kết thúc hồ sơ — Iron Ranger — DRAFT / NOT APPROVED**
