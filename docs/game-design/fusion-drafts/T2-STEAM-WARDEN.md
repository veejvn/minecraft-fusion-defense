# Steam Warden — Tier 2 Fusion Defender (Confirmed)

**Project:** Minecraft Fusion Defense  
**Document ID:** T2-STEAM-WARDEN  
**Entity ID:** `steam_warden`  
**Recipe ID:** `fusion_steam_warden`  
**Tier:** 2 (MVP Confirmed)  
**Status:** **CONFIRMED — ĐÃ ĐƯỢC OWNER PHÊ DUYỆT (2026-11-23)**  
**Tên Defender:** Steam Warden  
**Phạm vi:** Nội dung MVP chính thức (1 trong 15 Tier-2 Fusion Defenders đã xác nhận).

> **Quyết định Owner (2026-11-23):** Đã nâng cấp lên chính thức: *Steam Warden có tầm kỹ năng vùng `3×3` xung quanh chính nó (`area-3x3-self`), tạo vụ nổ hơi nước áp suất cao.* Tự động unlock khi cả **Snow Golem** và **Blaze** unlock.

## 1. Thông tin định danh

| Trường | Giá trị | Trạng thái |
|---|---|---|
| Tên hiển thị | Steam Warden | **Confirmed** |
| Entity ID | `steam_warden` | **Confirmed** |
| Recipe ID | `fusion_steam_warden` | **Confirmed** |
| Tier | 2 | **Confirmed** |
| Nguyên liệu | Snow Golem (`snow_golem`) + Blaze (`blaze`) | **Confirmed** |
| Unlock rule | Tự động mở khi cả Snow Golem và Blaze unlock | **Confirmed** |
| Combat role | Elemental Control — điều khiển nhịp chiến đấu bằng vùng hơi nước áp suất cao `3×3` xung quanh bản thân. | **Confirmed** |
| Normal attack | Thermal Burst | **Confirmed** |
| Special Ability | Thermal Collapse (`1` Power Crystal, `0s` cooldown, `area-3x3-self`: giải phóng vụ nổ hơi nước trong vùng `3×3` xung quanh Steam Warden gây `250%` Attack Damage hệ Fire xuyên giáp — tăng lên `400%` Attack Damage (`+60%` Sốc Nhiệt) nếu địch đang `Burn` hoặc `Freeze`, đồng thời gắn `Slow -50%` trong `5s`) | **Confirmed (v2.2)** |
| Ability ID | `thermal_collapse` | **Confirmed** |

## 2. Công thức Fusion

**Công thức đề xuất:** Snow Golem (snow_golem) + Blaze (blaze) → **Steam Warden**

- Công thức này thuộc nhóm 8 công thức Tier 2 đang Draft.
- Không nằm trong danh sách 7 Fusion Recipes MVP đã xác nhận.
- Chưa có quyết định về unlock condition, recipe enablement hoặc thời điểm đưa vào game.
- Thứ tự hai nguyên liệu không làm thay đổi ý tưởng output; quy tắc vận hành cuối cùng vẫn cần tuân theo Fusion system khi được phê duyệt.

## 3. Ý tưởng thiết kế và chủ đề kết hợp

Một Warden nguyên tố điều hòa hai nguồn nóng/lạnh, tạo hơi nước áp suất cao từ băng của Snow Golem và lửa của Blaze.

**Design pillar:** Defender cần thể hiện được cả hai nguồn nguyên liệu trong cùng một bản sắc mới, thay vì chỉ là một Base Defender được tăng kích thước hoặc chỉ số.

## 4. Ngoại hình và đặc điểm nhận diện

Thân hình humanoid/guardian với một bên giáp phủ băng và một bên phát sáng nóng; ống dẫn hơi nước, van và lõi trung tâm tạo cảm giác áp suất. Màu xanh băng, trắng, cam lửa và hơi nước xám nhạt. Không dùng tên/thiết kế để ngụ ý liên quan đến mob Warden chính thức.

**Yêu cầu đọc hình ảnh:**
- Nhận diện được ngay ở kích thước sprite gameplay.
- Có ít nhất một đặc điểm thị giác đại diện cho mỗi nguyên liệu.
- Silhouette không gây nhầm lẫn với các Fusion Defender đã có.
- Các chi tiết trang trí không được ngụ ý một gameplay mechanic chưa được phê duyệt.

## 5. Vai trò chiến đấu

**Vai trò đề xuất:** Elemental Control — điều khiển nhịp chiến đấu bằng vùng hơi nóng/lạnh; vai trò sát thương hay hỗ trợ chưa chốt.

Đây là định hướng để tạo chỗ đứng riêng trong đội hình, không phải xác nhận về chỉ số hoặc hiệu quả chiến đấu. Cần so sánh với các Defender Tier 1 và Tier 2 hiện hành trước khi chốt vai trò cuối.

## 6. Đòn đánh thường

Thermal Burst — phóng một luồng hơi nước nóng/lạnh. Đây là tên và hướng tấn công đề xuất; damage type, tầm và hiệu ứng TBD.

Các thuộc tính chưa được quyết định:
- Damage value và damage type.
- Attack speed, attack range và projectile speed (nếu có).
- Targeting strategy và cách xử lý khi có nhiều mục tiêu.
- Có áp dụng status effect hoặc tương tác đặc biệt hay không.

**Trạng thái:** Proposed concept; toàn bộ thông số thực thi TBD.

## 7. Kỹ năng đặc biệt

Thermal Collapse — giải phóng chênh lệch nhiệt tạo một vùng bùng nổ hơi nước. Có thể phát triển theo hướng Slow, Burn hoặc hiệu ứng khác, nhưng chưa chọn hiệu ứng nào.

**Ability ID đề xuất:** thermal_collapse

Tên và ý tưởng trên chỉ là bản nháp. Đây chưa phải Ability Definition và chưa được thêm vào danh mục 12 Special Abilities MVP đã xác nhận.

Các trường cần Owner duyệt trước khi đặc tả:
- powerCrystalCost, cooldownSeconds.
- requiresTarget, targetScope.
- Loại Effect, damage/status/shield/buff nếu có.
- Phạm vi, duration, cadence, stacking/refresh và lifecycle.
- Điều kiện từ chối kích hoạt và hành vi khi Owner chết hoặc bị Fusion.

## 8. Điểm mạnh dự kiến

Chủ đề kết hợp độc đáo, không chỉ là Defender lửa hoặc băng; có tiềm năng mang cơ chế điều tiết/khống chế riêng.

## 9. Điểm yếu và giới hạn cần giữ

Khái niệm dễ trở nên quá rộng hoặc sở hữu cùng lúc quá nhiều status. Cần chọn một trục gameplay chính để không lấn át Defender chuyên biệt.

Điểm yếu cần có ý nghĩa gameplay thực tế, không chỉ là mô tả trang trí. Không tự gán nhược điểm như chi phí cao, cooldown dài hoặc tốc độ chậm khi chưa có thông số được duyệt.

## 10. Tương tác với hệ thống gameplay

Không giả định vừa gây Burn vừa Freeze/Slow; không tự đặt miễn nhiễm nguyên tố. Vùng tác động và status phải được chốt rõ, tương thích targetScope và pipeline sát thương/status hiện hành. Fusion Output theo quy tắc chung.

**Các nguyên tắc đã có của dự án vẫn được giữ nguyên:**
- Grid MVP là 5 Lane × 9 Columns.
- Mỗi Defender chiếm một Grid Cell; targeting được cấu hình theo từng Defender.
- Fusion miễn phí, không tiêu Energy hoặc Power Crystal.
- Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effect tích cực/tiêu cực từ hai nguyên liệu và có thể tấn công khi có target hợp lệ.
- Không có Tier ceiling cố định trong engine, nhưng mọi Recipe mới cần Owner phê duyệt trước khi trở thành nội dung game.

Các nguyên tắc trên không có nghĩa công thức Draft này đã được bật hoặc được thêm vào MVP.

## 11. Thông số TBD và quyết định cần Owner xác nhận

Steam Warden là control, support hay damage; Thermal Collapse áp dụng đúng một hiệu ứng hay kết hợp; có tạo vùng tồn tại không; phạm vi cùng Lane hay khu vực; có tương tác đặc biệt với Fire Resistance/freeze immunity không.

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

**Câu hỏi thiết kế đang mở:** Steam Warden là control, support hay damage; Thermal Collapse áp dụng đúng một hiệu ứng hay kết hợp; có tạo vùng tồn tại không; phạm vi cùng Lane hay khu vực; có tương tác đặc biệt với Fire Resistance/freeze immunity không.

**Tài liệu liên quan:** [Entity Catalog](../ENTITY_CATALOG.md) · [Fusion Recipes](../FUSION_RECIPES.md) · [Ability Catalog](../ABILITY_CATALOG.md)

---

**Kết thúc hồ sơ — Steam Warden — DRAFT / NOT APPROVED**
