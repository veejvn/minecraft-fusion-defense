**Đường dẫn trong repository:** `docs/game-design/ABILITY_CATALOG.md`  
**Dự án:** Minecraft Fusion Defense  
**Trạng thái:** Draft v1.0 — Bản tiếng Việt  
**Phạm vi:** MVP Desktop Web; chiến trường 5 × 9; 5 Base Defenders; 6 Fusion Defenders; 4 Enemy; 5 Waves tại Grassland.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục đích

Tài liệu định nghĩa danh mục 11 **Special Abilities**, quy tắc kích hoạt, hiệu ứng, cấu trúc dữ liệu, tình huống đặc biệt và tiêu chí nghiệm thu cho MVP. Cần đọc cùng `GDD.md`, `GAMEPLAY_MECHANICS.md`, `ENTITY_CATALOG.md` và `FUSION_RECIPES.md`.

**Nhãn quyết định:** **Confirmed** = đã xác nhận; **Draft** = đề xuất thiết kế; **TBD** = chưa quyết định. Không được xem cơ chế hoặc thông số Draft là đã chốt.

## 2. Quy tắc hệ thống đã xác nhận

1. **Power Crystal** là tài nguyên độc lập với **Energy**. Power Crystal dùng để kích hoạt Special Ability của Defender, không dùng cho Fusion thông thường.
2. Power Crystal đến từ Wave Rewards, Enemy death Items và independent random Items. Initial 0/cap 5, lifetime 10 giây Game Time, random attempt mỗi 30–60 giây/1 Crystal đã Confirmed. Wave Reward amount và Ability Cost vẫn TBD; chi tiết collection/Pending theo Gameplay Mechanics.
3. Mỗi Base Defender và Fusion Defender trong MVP có một Special Ability được định nghĩa.
4. Chỉ cho phép kích hoạt khi Game State là `PLAYING`, Defender sở hữu kỹ năng còn sống và hợp lệ, Ability khả dụng, đủ Power Crystal và mục tiêu hợp lệ nếu Ability yêu cầu mục tiêu.
5. Ability có thể có Cooldown cấu hình riêng; việc từng Ability có Cooldown hay không và thời lượng cụ thể vẫn là TBD. Cooldown và Power Crystal Cost là hai cơ chế độc lập.
6. Ability có thể dùng Targeting Strategy khác với đòn đánh thường. Hiệu ứng xuyên Lane hoặc toàn chiến trường phải được khai báo rõ, không mặc định áp dụng cho mọi đòn đánh.
7. Pause dừng gameplay timers/Cooldown. Defender attack và Enemy movement tính đồng thời; Event Queue resolve theo insertion sequence với sequence number tăng dần. Victory/Defeat cùng tick theo terminal event resolve trước, không blanket Defeat priority.
8. Fusion tốn 0 Energy/Crystal, mọi Lane/khoảng cách, Output tại Target Cell; 100% own Max HP, không inherited statuses, attack-ready với valid target. Engine không có Tier ceiling; initial sáu approved Recipes. Fusion không tự kích hoạt Special Ability.

## 3. Danh mục Special Abilities trong MVP

| Ability ID | Tên Ability | Defender sở hữu | Vai trò | Trạng thái |
| --- | --- | --- | --- | --- |
| `blizzard` | Blizzard | `snow_golem` | Khống chế diện rộng | Draft |
| `earthquake` | Earthquake | `iron_golem` | Sát thương tuyến trước / gián đoạn | Draft |
| `arrow_storm` | Arrow Storm | `skeleton` | Sát thương tầm xa diện rộng | Draft |
| `pack_frenzy` | Pack Frenzy | `wolf` | Bùng nổ cận chiến / Buff | Draft |
| `inferno` | Inferno | `blaze` | Sát thương lửa diện rộng / Burn | Draft |
| `piercing_barrage` | Piercing Barrage | `skeleton_sniper` | Sát thương xuyên mục tiêu tầm xa | Draft |
| `absolute_zero` | Absolute Zero | `ice_golem` | Freeze diện rộng mạnh | Draft |
| `glacial_fortress` | Glacial Fortress | `frost_guardian` | Shield / Slow | Draft |
| `wildfire_rush` | Wildfire Rush | `flame_fang` | Bùng nổ cận chiến nhanh / Burn | Draft |
| `meteor_arrow_rain` | Meteor Arrow Rain | `inferno_archer` | Sát thương lửa tầm xa diện rộng | Draft |
| `alpha_howl` | Alpha Howl | `alpha_wolf` | Hỗ trợ đồng minh / Buff | Draft |

Tên kỹ năng và ý tưởng hiệu ứng trong bảng vẫn ở trạng thái **Draft**, chưa phải cơ chế hoàn toàn được xác nhận.

## 4. Special Abilities của Base Defenders

### 4.1. Blizzard — Snow Golem

- **Mục tiêu thiết kế:** Khống chế đám đông bằng băng, tạo khoảng thời gian chiến thuật để các Defender khác tấn công.
- **Hiệu ứng đề xuất:** Áp dụng Slow lên Enemy hợp lệ trong một vùng xác định; có thể gây thêm một lượng nhỏ sát thương băng.
- **Targeting:** Chọn vùng ảnh hưởng; vùng quanh bản thân hay vùng do người chơi chọn vẫn TBD.
- **Ảnh hưởng khác Lane:** TBD; không được mặc định cho phép.
- **Thông số:** `radiusCells`, `slowPercent`, `durationMs`, `damage` — tất cả TBD.
- **Đánh đổi chiến thuật:** Hữu ích khi đối phó Enemy nhanh nhưng có thể gây ít sát thương trực tiếp.

### 4.2. Earthquake — Iron Golem

- **Mục tiêu thiết kế:** Tạo thời điểm gây áp lực và gián đoạn Enemy cho Tank tuyến trước.
- **Hiệu ứng đề xuất:** Gây sát thương diện rộng lên Enemy gần đó; có thể thêm Stun ngắn hoặc Knockback, chờ xác nhận thiết kế.
- **Targeting:** Vùng xung quanh Defender sở hữu, đề xuất.
- **Thông số:** `radiusCells`, `damage`, `stunDurationMs` hoặc `knockbackCells` — TBD.
- **Lưu ý:** Knockback không được đẩy Enemy ra khỏi Lane hợp lệ hoặc gây lỗi xử lý va chạm.

### 4.3. Arrow Storm — Skeleton

- **Mục tiêu thiết kế:** Tạm thời biến Defender bắn đơn mục tiêu thành nguồn sát thương nhiều mục tiêu.
- **Hiệu ứng đề xuất:** Bắn một loạt mũi tên vào các Enemy hợp lệ trong Lane hoặc vùng đã cấu hình.
- **Targeting:** Đề xuất ban đầu là Lane của Defender; phương án chọn mục tiêu khác vẫn TBD.
- **Thông số:** `projectileCount`, `damagePerHit`, `targetCount`, `intervalMs` — TBD.
- **Lưu ý:** Cần xác định một Enemy có thể trúng nhiều mũi tên trong cùng lần kích hoạt hay không.

### 4.4. Pack Frenzy — Wolf

- **Mục tiêu thiết kế:** Tạo đợt bùng nổ sát thương cận chiến trong thời gian ngắn cho Defender tốc độ cao.
- **Hiệu ứng đề xuất:** Tạm tăng Attack Speed và/hoặc Damage cho chính Wolf; không mặc định Buff đồng minh.
- **Targeting:** Bản thân Defender.
- **Thông số:** `attackSpeedMultiplier`, `damageMultiplier`, `durationMs` — TBD.
- **Lưu ý:** Cần xác định Buff có ảnh hưởng tới đòn đánh đang thực hiện hay không.

### 4.5. Inferno — Blaze

- **Mục tiêu thiết kế:** Gây áp lực bằng lửa trên diện rộng và duy trì Burn.
- **Hiệu ứng đề xuất:** Gây sát thương lửa và áp dụng Burn lên Enemy hợp lệ trong vùng ảnh hưởng.
- **Targeting:** Đề xuất vùng theo hướng tấn công; Lane và hình dạng vùng ảnh hưởng TBD.
- **Thông số:** `damage`, `burnDamagePerTick`, `burnTickMs`, `burnDurationMs`, `radiusCells` — TBD.
- **Lưu ý:** Cần quy định Burn cộng dồn hay làm mới thời gian tồn tại.

## 5. Special Abilities của Fusion Defenders

### 5.1. Piercing Barrage — Skeleton Sniper

- **Mục tiêu thiết kế:** Thưởng cho khả năng bắn chính xác tầm xa bằng sát thương xuyên nhiều Enemy.
- **Hiệu ứng đề xuất:** Bắn một hoặc nhiều Projectile xuyên qua các mục tiêu hợp lệ theo đường bay cấu hình.
- **Targeting:** Đề xuất đường thẳng hoặc đường bay hướng đến mục tiêu đã chọn.
- **Thông số:** `projectileCount`, `damage`, `pierceLimit`, `rangeCells` — TBD.
- **Lưu ý:** Cần xác định thời gian tồn tại Projectile và thứ tự xử lý va chạm.

### 5.2. Absolute Zero — Ice Golem

- **Mục tiêu thiết kế:** Tạo hiệu ứng khống chế mạnh hơn Blizzard nhưng có giới hạn rõ về thời gian và phạm vi.
- **Hiệu ứng đề xuất:** Freeze tạm thời các Enemy trong vùng xác định; sát thương băng bổ sung vẫn TBD.
- **Targeting:** Vùng quanh Defender hoặc vùng do người chơi chọn — TBD.
- **Thông số:** `radiusCells`, `freezeDurationMs`, `damage` — TBD.
- **Lưu ý:** Thứ tự ưu tiên Freeze/Slow, khả năng miễn nhiễm và áp dụng lại hiệu ứng vẫn TBD.

### 5.3. Glacial Fortress — Frost Guardian

- **Mục tiêu thiết kế:** Tăng khả năng trụ vững tuyến trước đồng thời làm chậm Enemy gần đó.
- **Hiệu ứng đề xuất:** Cấp Shield tạm thời cho Frost Guardian và áp dụng Slow trong vùng xung quanh.
- **Targeting:** Bản thân Defender và Enemy trong vùng lân cận.
- **Thông số:** `shieldAmount`, `shieldDurationMs`, `slowPercent`, `slowDurationMs`, `radiusCells` — TBD.
- **Lưu ý:** Thứ tự hấp thụ sát thương và quy tắc cộng dồn Shield vẫn TBD.

### 5.4. Wildfire Rush — Flame Fang

- **Mục tiêu thiết kế:** Tạo khoảng thời gian gây sát thương cận chiến nhanh, kết hợp áp lực Burn.
- **Hiệu ứng đề xuất:** Thực hiện chuỗi đòn đánh cận chiến liên tiếp vào mục tiêu hợp lệ và áp dụng Burn.
- **Targeting:** Enemy trong tầm cận chiến; có đổi mục tiêu giữa chuỗi đánh hay không vẫn TBD.
- **Thông số:** `hitCount`, `damagePerHit`, `intervalMs`, `burnDurationMs` — TBD.
- **Lưu ý:** Cơ chế lao tới hoặc di chuyển nhanh **chưa được xác nhận**; không tự suy diễn từ từ “Rush”.

### 5.5. Meteor Arrow Rain — Inferno Archer

- **Mục tiêu thiết kế:** Tạo sát thương diện rộng tầm xa kết hợp Burn.
- **Hiệu ứng đề xuất:** Bắn mưa tên lửa vào vùng xác định, gây sát thương và áp dụng Burn lên Enemy hợp lệ.
- **Targeting:** Vùng do người chơi chọn hoặc Lane của Defender — TBD.
- **Thông số:** `arrowCount`, `damagePerArrow`, `radiusCells`, `burnDurationMs` — TBD.
- **Lưu ý:** Phải khai báo rõ vùng ảnh hưởng có bao gồm các Lane khác hay không.

### 5.6. Alpha Howl — Alpha Wolf

- **Mục tiêu thiết kế:** Biến Defender cận chiến mạnh thành đơn vị hỗ trợ đội hình trong thời gian ngắn.
- **Hiệu ứng đề xuất:** Tăng Attack Speed và/hoặc Damage cho Defender đồng minh gần đó.
- **Targeting:** Đồng minh trong vùng cấu hình; Alpha Wolf có tự nhận Buff hay không vẫn TBD.
- **Thông số:** `radiusCells`, `attackSpeedMultiplier`, `damageMultiplier`, `durationMs` — TBD.
- **Lưu ý:** Quy tắc cộng dồn Buff và việc áp dụng lên Fusion Defender vẫn TBD.

## 6. Quy trình kích hoạt Ability

1. Người chơi chọn một Defender hoặc Fusion Defender còn sống.
2. UI hiển thị Special Ability, số Power Crystal hiện có và trạng thái khả dụng.
3. Người chơi bắt đầu kích hoạt và chọn mục tiêu nếu Ability yêu cầu.
4. Kiểm tra `PLAYING`, Entity còn tồn tại và sống, Ability Definition, trạng thái khả dụng, Cooldown, Power Crystal và mục tiêu.
5. Khóa hoặc tuần tự hóa thao tác kích hoạt để tránh request trùng lặp.
6. Trừ Power Crystal theo cấu hình và tạo hiệu ứng như một giao dịch logic nguyên tử; nếu tạo hiệu ứng thất bại thì không tiêu tài nguyên hoặc bắt đầu Cooldown.
7. Bắt đầu Cooldown nếu được cấu hình, phát Activation Event và chạy Animation/VFX.
8. Nếu thất bại, hiển thị lý do mà không thay đổi Power Crystal hoặc Cooldown.

**UX chưa xác nhận:** Kích hoạt bằng cách chọn Defender rồi nhấn Ability, Hotkey hay thao tác khác; có Pause simulation khi chọn mục tiêu không; thời điểm tiêu Power Crystal là khi chọn hay khi thực thi hiệu ứng.

**Mặc định đề xuất:** Chỉ tiêu Power Crystal khi hiệu ứng được tạo thành công.

## 7. Validation và Failure Codes

| Code | Điều kiện |
| --- | --- |
| `INVALID_GAME_STATE` | Game không ở trạng thái PLAYING |
| `INVALID_OWNER` | Defender sở hữu không tồn tại, đã chết hoặc không hợp lệ |
| `ABILITY_NOT_FOUND` | Ability Definition thiếu hoặc không hợp lệ |
| `ABILITY_UNAVAILABLE` | Ability bị vô hiệu hóa hoặc không khả dụng |
| `INSUFFICIENT_POWER_CRYSTAL` | Power Crystal thấp hơn chi phí cấu hình |
| `ABILITY_ON_COOLDOWN` | Cooldown chưa hoàn tất |
| `INVALID_TARGET` | Mục tiêu bắt buộc không hợp lệ |
| `DUPLICATE_ACTIVATION` | Request đang được xử lý trùng lặp |
| `EFFECT_CREATION_FAILED` | Không thể hoàn tất việc tạo hiệu ứng |

Các Code trên là **đề xuất tên API**, chưa phải hợp đồng kỹ thuật đã xác nhận.

## 8. Các loại hiệu ứng và quy tắc Status Effect

**Effect Primitives đề xuất:** `DAMAGE`, `AREA_DAMAGE`, `APPLY_SLOW`, `APPLY_FREEZE`, `APPLY_BURN`, `APPLY_SHIELD`, `APPLY_BUFF`, `SPAWN_PROJECTILES`, `MULTI_HIT`, `STUN`.

Mỗi Effect nên định nghĩa: cách chọn mục tiêu, loại Entity hợp lệ, phạm vi Lane, hình dạng vùng tác động, giá trị hiệu ứng, thời lượng, quy tắc cộng dồn/làm mới, chu kỳ Tick nếu cần và thứ tự xử lý xác định.

**Quy tắc chung chưa chốt:** Giới hạn Slow; thứ tự ưu tiên Slow và Freeze; Burn cộng dồn hay làm mới; Shield cộng dồn và hết hạn; Buff cộng dồn; miễn nhiễm/kháng hiệu ứng; quy trách nhiệm sát thương sau khi Owner chết; mục tiêu chết giữa chuỗi Multi-hit; Projectile tồn tại sau khi Owner bị loại; hành vi khi Pause hoặc kết thúc trận đấu.

Không tự triển khai Targeting xuyên mọi Lane chỉ vì một số Ability có Area Effect.

## 9. Data-driven Schema (đề xuất)

| Field | Type | Mô tả |
| --- | --- | --- |
| `id` | string | Ability ID duy nhất và ổn định |
| `ownerEntityId` | string | ID Base/Fusion Defender hợp lệ |
| `name` | string | Tên hiển thị |
| `enabled` | boolean | Cờ bật/tắt Ability |
| `powerCrystalCost` | integer | Không âm; **TBD theo từng Ability** |
| `cooldownMs` | integer | Không âm, có thể cấu hình; **TBD** |
| `targeting` | object | Loại mục tiêu, phạm vi Lane, hình dạng vùng |
| `effects` | array | Danh sách Effect theo thứ tự xử lý |
| `animationId` | string | Tham chiếu VFX nếu có |
| `description` | string | Mô tả trên UI |

Ví dụ JSON **chỉ minh họa cấu trúc**, không phải thông số đã cân bằng hoặc xác nhận:

```json
{
  "id": "glacial_fortress",
  "ownerEntityId": "frost_guardian",
  "name": "Glacial Fortress",
  "enabled": true,
  "powerCrystalCost": 1,
  "cooldownMs": 0,
  "targeting": {
    "type": "SELF_AND_NEARBY_ENEMIES",
    "laneScope": "CONFIGURED_AREA"
  },
  "effects": [
    { "type": "APPLY_SHIELD", "amount": 100, "durationMs": 3000 },
    { "type": "APPLY_SLOW", "slowPercent": 30, "durationMs": 2000, "radiusCells": 1 }
  ]
}
```

**Cảnh báo:** Tất cả giá trị số trong ví dụ chỉ là Placeholder minh họa Schema, **không phải** Power Crystal Cost, Cooldown, Shield, Duration hay Slow đã được duyệt. Không sao chép vào dữ liệu cân bằng chính thức khi chưa được xác nhận.

## 10. Tích hợp với các Game Systems

- **Resource System:** Ability dùng Power Crystal, initial 0/cap 5. Wave overflow vào Pending Wave Reward; Item giữ timer khi không collect được. Gameplay Mechanics quy định values/spawn/lifetimes; Ability Cost/commit/rollback vẫn TBD.
- **Entity System:** Owner ID và tham chiếu Special Ability phải hợp lệ; xóa hoặc Fusion Owner không tự kích hoạt Ability.
- **Combat System:** Tái sử dụng Targeting, Damage, Projectile, Status Effect và Collision có thứ tự xử lý xác định.
- **Game State:** Không kích hoạt khi `PAUSED`, `VICTORY` hoặc `DEFEAT`; Cooldown và Timers dừng khi Pause.
- **UI:** Hiển thị Icon/Name, Cost, Availability, Targeting Preview và phản hồi thất bại.
- **Event System (đề xuất):** `ability:requested`, `ability:activated`, `ability:failed`, `ability:cooldown_started`, `ability:cooldown_finished`.
- **Data Architecture:** Kiểm tra Schema và tham chiếu; ưu tiên cấu hình Data-driven thay vì Hardcode theo từng Entity.

## 11. Edge Cases

- **Power Crystal vừa đủ chi phí:** Có thể kích hoạt và số dư trở về 0.
- **Hai request kích hoạt liên tiếp quá nhanh:** Chỉ một lần Commit cho mỗi yêu cầu hợp lệ; không tiêu tài nguyên hoặc tạo hiệu ứng trùng.
- **Owner chết trước Commit:** Từ chối và không tiêu Power Crystal.
- **Owner chết sau Commit:** Effect/Projectile tiếp tục tồn tại theo chính sách riêng của Effect (TBD).
- **Target chết trước Commit:** Từ chối hoặc chọn lại mục tiêu chỉ khi có cấu hình.
- **Pause giữa Effect:** Dừng thời gian simulation; Resume không làm mất tiến trình đã trôi qua.
- **Terminal events trong cùng tick:** Event Queue insertion sequence quyết định; terminal event resolve trước chốt kết quả, không blanket Defeat priority. Chi tiết generation vẫn TBD.
- **Fusion khi đang chọn Target cho Ability:** Hủy lựa chọn nếu Owner bị tiêu thụ; không tự chuyển lựa chọn sang Fusion Output.
- **Cost/Cooldown bằng 0 hoặc âm:** Chỉ cho phép 0 nếu cấu hình hỗ trợ rõ; giá trị âm không hợp lệ.
- **Thiếu Power Crystal:** Không tạo Effect, không bắt đầu Cooldown, không tiêu tài nguyên.

## 12. Acceptance Criteria của MVP

- [ ] Có đúng 11 Ability ID tham chiếu tới 11 Defender trong MVP.
- [ ] Mỗi Defender có đúng một Special Ability được định nghĩa.
- [ ] Power Crystal độc lập với Energy.
- [ ] Kích hoạt Ability yêu cầu đủ Power Crystal.
- [ ] Power Crystal chỉ bị trừ một lần sau khi Effect Commit thành công.
- [ ] Cooldown, nếu được cấu hình, ngăn kích hoạt cho đến khi kết thúc.
- [ ] Kích hoạt thất bại không tiêu tài nguyên hoặc bắt đầu Cooldown.
- [ ] Targeting và quy tắc xuyên Lane được khai báo rõ theo từng Ability.
- [ ] Pause đóng băng Ability Timers và Effects.
- [ ] Không thể kích hoạt Ability trong VICTORY/DEFEAT.
- [ ] Request trùng lặp không được tạo Effect hoặc chi phí trùng.
- [ ] Fusion không tiêu Power Crystal hoặc tự kích hoạt Ability.
- [ ] Các Effect Type và Status Rules có thể kiểm thử độc lập.

## 13. Open Design Decisions

| Chủ đề | Trạng thái |
| --- | --- |
| Power Crystal Cost chính xác của từng Ability | TBD |
| Có Cooldown hay không và thời lượng theo Ability | TBD |
| UX chọn mục tiêu cho Ability | TBD |
| Hình dạng Area và phạm vi xuyên Lane | TBD |
| Damage, Duration, số lần đánh và Multipliers | TBD |
| Quy tắc cộng dồn/làm mới/miễn nhiễm Status Effect | TBD |
| Giới hạn Power Crystal tối đa | Confirmed: 5; không còn TBD |
| Random Power Crystal Item | Confirmed: attempt mỗi 30–60 giây Game Time, 1 Crystal/Item, lifetime 10 giây |
| VFX, Audio và thời điểm Animation | TBD |
| Effect tiếp tục tồn tại sau khi Owner chết/Fusion | TBD |

## 14. Tài liệu liên quan

- `docs/product/GDD.md`
- `docs/product/GAMEPLAY_MECHANICS.md`
- `docs/game-design/ENTITY_CATALOG.md`
- `docs/game-design/FUSION_RECIPES.md`
- `docs/game-design/GAME_BALANCING.md`
- `docs/architecture/DATA_ARCHITECTURE.md`

---

**Kết thúc tài liệu — `ABILITY_CATALOG.md` — Draft v1.0 (Tiếng Việt)**
