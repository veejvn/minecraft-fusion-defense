**Đường dẫn trong repository:** `docs/game-design/GAME_BALANCING.md`  
**Dự án:** Minecraft Fusion Defense  
**Phiên bản:** Draft v1.0 — Chưa chốt thông số  
**Ngôn ngữ:** Tiếng Việt; giữ nguyên tên riêng và định danh kỹ thuật bằng tiếng Anh.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục đích

Tài liệu quản lý toàn bộ thông số Game Balancing của MVP, cách đánh giá và quy trình phê duyệt. **Theo yêu cầu của chủ dự án, mọi giá trị chưa được xác nhận đều giữ `TBD`; không tự chọn số liệu, kể cả khi đã có Prototype hoặc ví dụ từ bản nháp cũ.**

Tài liệu này không thay thế các quy tắc gameplay đã xác nhận trong `GDD.md` và `GAMEPLAY_MECHANICS.md`.

### 1.1. Quy ước trạng thái

- **Confirmed:** Quy tắc hoặc thông số đã được chủ dự án xác nhận.
- **TBD:** Chưa được xác nhận; không có giá trị chính thức.
- **Draft:** Phương án thiết kế cần duyệt, không được coi là quyết định.
- **Prototype:** Số liệu thử nghiệm cũ, không được tự động chuyển thành Confirmed.
- **N/A:** Không áp dụng theo thiết kế; chỉ sử dụng khi có cơ sở xác nhận.

**Quy tắc quản trị:** Không tự điền giá trị số cho `TBD`. Không dùng `0`, `null` hoặc giá trị mặc định để ngầm thay thế quyết định chưa chốt. Không xuất file cấu hình Runtime từ các bảng chưa hoàn chỉnh.

## 2. Phạm vi và cơ chế đã xác nhận

| Hạng mục | Giá trị / Quy tắc | Trạng thái |
| --- | --- | --- |
| Level MVP | 1 Grassland Level | Confirmed |
| Grid | 5 Rows × 9 Columns | Confirmed |
| Số Waves | 5 | Confirmed |
| Base Defenders | 5 | Confirmed |
| Fusion Defenders | 6 | Confirmed |
| Enemy Types | 4 | Confirmed |
| Hướng Enemy | Spawn từ Right, di chuyển về Left | Confirmed |
| Defeat | Enemy xâm nhập căn cứ là thua ngay | Confirmed |
| Base HP / Lives | Không sử dụng | Confirmed |
| Victory | Hoàn thành 5 Waves và không còn Enemy | Confirmed |
| Energy | Tự sinh theo thời gian; thu thập Energy Items; dùng để Summon | Confirmed |
| Power Crystal | Nhận từ Wave Rewards và Power Crystal Items; dùng cho Special Ability | Confirmed |
| Fusion Cost | 0 Energy, 0 Power Crystal | Confirmed |
| Fusion Range / Lane | Không giới hạn khoảng cách hoặc Lane | Confirmed |
| Fusion Output | Target Cell; Source trống; tiêu thụ hai input; 100% own Max HP, no inherited statuses, attack ngay khi valid target | Confirmed |
| Fusion Tier | Engine không có fixed Tier ceiling; chỉ sáu approved Tier-1 + Tier-1 → Tier-2 Recipes cho initial content | Confirmed |
| Pause | Đóng băng gameplay simulation và timers | Confirmed |

Các cơ chế Confirmed là ràng buộc thiết kế, **không phải các giá trị để tối ưu bằng Balance**.

## 3. Nguyên tắc và quy trình phê duyệt Balance

1. Tập hợp thông số cần thiết, giữ `TBD` nếu chưa được xác nhận.
2. Chủ dự án quyết định giá trị hoặc cho phép tạo phương án Prototype cụ thể.
3. Ghi nhận người xác nhận, ngày xác nhận, lý do và tài liệu liên quan.
4. Chỉ khi đã Confirmed mới cập nhật cấu hình Balance chính thức.
5. Playtest và ghi nhận kết quả; nếu cần thay đổi, mở đề xuất mới thay vì âm thầm sửa giá trị.

**Mẫu Decision Log:**

| Decision ID | Hạng mục | Giá trị được duyệt | Trạng thái | Người duyệt | Ngày |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | Chưa duyệt | TBD | TBD |

Không ghi giá trị giả vào Decision Log.

## 4. Base Defender Balancing

### 4.1. Thông số cần xác nhận

| Defender | HP | Damage | Attack Speed | Attack Range | Energy Cost | Summon Cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| Snow Golem | TBD | TBD | TBD | TBD | TBD | TBD |
| Iron Golem | TBD | TBD | TBD | TBD | TBD | TBD |
| Skeleton | TBD | TBD | TBD | TBD | TBD | TBD |
| Wolf | TBD | TBD | TBD | TBD | TBD | TBD |
| Blaze | TBD | TBD | TBD | TBD | TBD | TBD |

**Đơn vị cần thống nhất trước khi chốt:** HP và Damage theo đơn vị Game; Attack Speed theo **attacks/second (đòn đánh mỗi giây) — Confirmed**; Attack Range theo **Cells (số ô) — Confirmed**; Summon Cooldown theo seconds/milliseconds.

### 4.2. Targeting và Attack Behavior

| Defender | Targeting Strategy | Attack Type | Projectile / Hit Rules | Trạng thái |
| --- | --- | --- | --- | --- |
| Snow Golem | TBD | TBD | TBD | TBD |
| Iron Golem | TBD | TBD | TBD | TBD |
| Skeleton | TBD | TBD | TBD | TBD |
| Wolf | TBD | TBD | TBD | TBD |
| Blaze | TBD | TBD | TBD | TBD |

**Lưu ý:** Các Targeting Strategy và số liệu trong tài liệu Prototype trước đây không tự động trở thành giá trị chính thức.

## 5. Fusion Defender Balancing

### 5.1. Các công thức đã xác nhận

| Inputs | Fusion Output | Fusion Cost |
| --- | --- | --- |
| Skeleton + Skeleton | Skeleton Sniper | 0 |
| Snow Golem + Snow Golem | Ice Golem | 0 |
| Iron Golem + Snow Golem | Frost Guardian | 0 |
| Blaze + Wolf | Flame Fang | 0 |
| Blaze + Skeleton | Inferno Archer | 0 |
| Wolf + Wolf | Alpha Wolf | 0 |

Thứ tự Inputs không ảnh hưởng Recipe. Fusion được phép giữa hai Defender ở bất kỳ Cell/Lane hợp lệ nào.

### 5.2. Chỉ số Fusion

| Fusion Defender | HP | Damage | Attack Speed | Attack Range | Targeting | Attack Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Skeleton Sniper | TBD | TBD | TBD | TBD | TBD | TBD |
| Ice Golem | TBD | TBD | TBD | TBD | TBD | TBD |
| Frost Guardian | TBD | TBD | TBD | TBD | TBD | TBD |
| Flame Fang | TBD | TBD | TBD | TBD | TBD | TBD |
| Inferno Archer | TBD | TBD | TBD | TBD | TBD | TBD |
| Alpha Wolf | TBD | TBD | TBD | TBD | TBD | TBD |

**Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

HP amount, Damage, Attack Speed/Range, Targeting và Attack Rules cụ thể vẫn TBD; không dùng Prototype làm thông số chính thức.

### 5.3. Cân bằng giá trị Fusion

Fusion không tiêu Energy/Power Crystal nhưng tiêu thụ **hai Defender đang có trên sân**, và chỉ giữ lại một Fusion Defender tại Target Cell. Đây là chi phí cơ hội chiến thuật đã xác nhận từ cơ chế tiêu thụ hai Inputs.

Cần đánh giá qua Playtest: sức mạnh Output so với hai Inputs; khả năng mất phòng thủ ở Source Cell; thời điểm Fusion; vai trò chiến thuật của từng Recipe. **Không đặt trước tỷ lệ sức mạnh, hệ số nâng cấp hoặc công thức cộng chỉ số.**

## 6. Enemy Balancing

| Enemy | HP | Damage | Attack Speed | Attack Range | Move Speed | Energy Reward | Crystal Reward | Behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zombie | TBD | TBD | TBD | TBD | TBD | 50 | 0 | TBD |
| Husk | TBD | TBD | TBD | TBD | TBD | 100 | 0 | TBD |
| Spider | TBD | TBD | TBD | TBD | TBD | 150 | 1 | TBD |
| Pillager | TBD | TBD | TBD | TBD | TBD | 200 | 1 | TBD |

**Confirmed — 03/11/2026:** Energy reward cộng trực tiếp; mỗi Crystal reward tạo Item tại vị trí Enemy chết kể cả khi storage đầy. Item lifetime 10 giây Game Time, không collect trong Pause. Reward fields là integer không âm cấu hình riêng trong Enemy Definition.

Combat numbers và behavior còn TBD. Move Speed dùng Cells/second; Attack Speed dùng attacks/second, Range dùng Cells.

## 7. Energy Economy

| Thông số | Giá trị | Trạng thái |
| --- | --- | --- |
| `initialEnergy` | 0 | Confirmed |
| Energy tại gameplay t=0 | +50 direct credit ngay lập tức | Confirmed |
| Passive Energy | +50 mỗi 3 giây Game Time sau t=0 | Confirmed |
| `maxEnergy` | Unlimited | Confirmed |
| `energyItemAmount` | TBD | Chưa chốt |
| `energyItemSpawnRate` | TBD | Chưa chốt |
| `energyItemLifetimeMs` | 10000 | Confirmed — 10 giây Game Time |
| Vị trí Energy Item | Ngẫu nhiên hợp lệ, không bắt buộc snap Grid | Theo thiết kế hiện có; phân phối chi tiết TBD |
| Summon Cost / Cooldown từng Base Defender | TBD | Chưa chốt |
| Fusion Energy Cost | 0 | Confirmed |

Passive Energy cộng trực tiếp, không spawn Item. Pause dừng timer và cấm collect. Không có Energy cap/overflow policy cần chốt cho Functional MVP. Tên field/rate representation và scheduler implementation vẫn Coding Planning TBD.

## 8. Power Crystal Economy

| Thông số | Giá trị | Trạng thái |
| --- | --- | --- |
| `initialPowerCrystal` | 0 | Confirmed |
| `maxPowerCrystal` | 5 | Confirmed |
| Random Power Crystal Item Amount | 1 Crystal/Item | Confirmed |
| Random spawn interval | First attempt 30–60 giây Game Time, các attempt tiếp theo cách 30–60 giây ngẫu nhiên | Confirmed |
| `powerCrystalItemLifetimeMs` | 10000 | Confirmed |
| Wave 1–5 Reward Amount | TBD theo từng Wave | Chưa chốt |
| Fusion Power Crystal Cost | 0 | Confirmed |

**Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.

**Confirmed:** random Power Crystal spawn độc lập: attempt đầu sau ngẫu nhiên 30–60 giây Game Time; mỗi attempt kế tiếp cách ngẫu nhiên 30–60 giây. Mỗi attempt thành công tạo một Item trị giá 1 Crystal tại cell ngẫu nhiên không có Defender; không có cell hợp lệ thì bỏ qua attempt. Không có cap riêng cho số Item cùng tồn tại; nhiều Item được phép trùng cell. Summon lên cell có Item được phép: auto-collect oldest-first đến giới hạn storage, Item dư giữ timer gốc; Item còn lại sau khi Defender bị loại bỏ. Click Item được ưu tiên hơn click Defender.

Không tự đặt Ability Cost, Wave Reward amounts hoặc thuật toán chọn phân phối ngẫu nhiên ngoài khoảng thời gian/cell rules đã xác nhận.

## 9. Special Ability Balancing

| Defender | Ability ID | Power Crystal Cost | Cooldown | Damage / Effect Amount | Duration / Range |
| --- | --- | --- | --- | --- | --- |
| Snow Golem | `blizzard` | TBD | TBD | TBD | TBD |
| Iron Golem | `earthquake` | TBD | TBD | TBD | TBD |
| Skeleton | `arrow_storm` | TBD | TBD | TBD | TBD |
| Wolf | `pack_frenzy` | TBD | TBD | TBD | TBD |
| Blaze | `inferno` | TBD | TBD | TBD | TBD |
| Skeleton Sniper | `piercing_barrage` | TBD | TBD | TBD | TBD |
| Ice Golem | `absolute_zero` | TBD | TBD | TBD | TBD |
| Frost Guardian | `glacial_fortress` | TBD | TBD | TBD | TBD |
| Flame Fang | `wildfire_rush` | TBD | TBD | TBD | TBD |
| Inferno Archer | `meteor_arrow_rain` | TBD | TBD | TBD | TBD |
| Alpha Wolf | `alpha_howl` | TBD | TBD | TBD | TBD |

Tên Ability và liên kết Defender lấy từ `ABILITY_CATALOG.md`. Ý tưởng Effect trong tài liệu đó vẫn là **Draft**, không được tự xem là cơ chế đã duyệt.

**Chưa chốt:** Có Cooldown riêng cho từng Ability hay không; hình dạng AOE; phạm vi xuyên Lane; hiệu ứng Slow/Freeze/Burn/Shield/Buff; quy tắc cộng dồn, miễn nhiễm, làm mới; Targeting UX.

## 10. Wave Difficulty và Spawn Balancing

### 10.1. Bảng 5 Waves

| Wave | Enemy Composition | Enemy Count | Allowed Rows | Spawn Interval | Initial Delay | Next Wave Delay | Power Crystal Reward |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| 2 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| 3 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| 4 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| 5 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

**Confirmed:** Có 5 Waves, sử dụng 4 Enemy Types trong phạm vi MVP. **Chưa xác nhận** thứ tự xuất hiện từng loại Enemy, số lượng, thời điểm Spawn, Lane và Reward. Bảng tiến trình ở `LEVEL_DESIGN.md` chỉ là **Draft**, không được tự chép thành cấu hình chính thức.

### 10.2. Các yếu tố cần đánh giá

- Mật độ Enemy theo thời gian và số Lane bị gây áp lực.
- Tương quan tốc độ Enemy với Attack Range và Damage của Defender.
- Khả năng tích lũy Energy trước khi Wave tăng độ khó.
- Khả năng sử dụng Fusion và Special Ability khi áp lực tăng.
- Khoảng nghỉ giữa Waves, nếu được duyệt.
- Khả năng chiến thắng bằng nhiều chiến thuật hợp lệ.

Đây là **danh sách tiêu chí đánh giá**, không phải quyết định về hệ số hoặc mức độ khó.

## 11. Công thức và chỉ số phân tích (chưa phê duyệt làm quy tắc Game)

Các chỉ số dưới đây là công cụ **phân tích Playtest**, không bắt buộc dùng trong Runtime và không tự xác lập giá trị cân bằng:

- **DPS lý thuyết:** `Damage × AttacksPerSecond`, chỉ có ý nghĩa với đòn đánh gây sát thương đều, chưa tính Armor, AOE, Miss, Status Effects hoặc thời gian không có mục tiêu.
- **Time To Defeat Enemy:** thời gian từ lúc Enemy vào vùng có thể tấn công đến khi bị loại; đo bằng Playtest hoặc mô phỏng.
- **Energy Affordability Time:** thời gian cần để người chơi tích lũy đủ Energy Summon một Defender.
- **Wave Clear Time:** thời gian từ bắt đầu Wave đến khi Spawn Groups hoàn tất và không còn Enemy.
- **Base Breach Rate:** tỷ lệ lần thử có ít nhất một Enemy vượt Base Boundary.
- **Ability Usage Rate:** số lần Ability được kích hoạt hợp lệ theo Wave.
- **Fusion Usage Rate:** số Fusion hợp lệ theo Wave/Session.

**Chưa chốt:** Ngưỡng mục tiêu của các Metrics, tỷ lệ thắng mong muốn, thời lượng Level và tiêu chuẩn độ khó.

## 12. Kế hoạch Playtest và thu thập dữ liệu

### 12.1. Dữ liệu cần ghi nhận

| Metric | Định nghĩa | Target |
| --- | --- | --- |
| Victory Rate | Số trận Victory / tổng trận hợp lệ | TBD |
| Average Level Duration | Thời gian Simulation trung bình mỗi trận | TBD |
| Wave Clear Time | Thời gian hoàn thành mỗi Wave | TBD |
| Base Breach Rate | Tỷ lệ trận kết thúc do Enemy vượt căn cứ | TBD |
| Energy Income / Spend | Energy thu và chi theo Wave | TBD |
| Power Crystal Income / Spend | Power Crystal thu và chi theo Wave | TBD |
| Defender Pick Rate | Tần suất Summon từng Defender | TBD |
| Fusion Recipe Usage | Số lần sử dụng từng Recipe | TBD |
| Ability Usage | Số lần kích hoạt từng Ability | TBD |
| Enemy Damage / Kills | Hiệu quả chiến đấu theo Entity | TBD |

### 12.2. Mẫu ghi nhận Playtest

| Session ID | Build | Wave Reached | Result | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD |

**Đề xuất quy trình:** Chạy cùng một bộ cấu hình đã được duyệt; ghi nhận Replay/Seed nếu Game Engine hỗ trợ; tổng hợp số liệu; chỉ đề xuất điều chỉnh sau khi xác định nguyên nhân; xin xác nhận trước khi sửa Balance.

## 13. Data-driven Balance và Validation

### 13.1. Cấu trúc dữ liệu

Các thông số sau khi được xác nhận nên được quản lý qua Definition/Configuration có Schema Validation: `defenders`, `fusionDefenders`, `enemies`, `abilities`, `resources`, `waves`, `level`.

**Không tạo JSON Runtime chứa các giá trị giả.** `TBD` trong tài liệu là trạng thái quản trị thiết kế, không phải một kiểu giá trị được Game Engine tự hiểu.

### 13.2. Kiểm tra trước khi triển khai

- Tất cả Entity/Ability/Recipe IDs phải tham chiếu hợp lệ.
- Các thông số bắt buộc phải được chủ dự án xác nhận trước khi dùng làm cấu hình Balance chính thức.
- Các giá trị như HP, Damage, Duration, Cooldown, Count và Reward phải có kiểu dữ liệu/đơn vị hợp lệ theo Schema đã duyệt.
- Không dùng số âm ở Field chỉ chấp nhận số không âm.
- Không thêm điều kiện Fusion Cost/Range/Lane trái với quyết định đã xác nhận.
- Không thêm Base HP hoặc Lives.
- Không tự thay `TBD` bằng 0 hoặc Default.

## 14. Edge Cases và rủi ro Balance

- Fusion có thể làm trống Source Cell ở Lane khác, tạo lỗ hổng phòng thủ.
- Spider hoặc Enemy có hành vi đặc biệt có thể làm thay đổi giá trị Tank/Range; hành vi cụ thể vẫn TBD.
- Enemy tầm xa có thể thay đổi tương quan Defender, cần kiểm tra sau khi chốt hành vi Pillager.
- Energy Item xuất hiện ngẫu nhiên có thể tạo khác biệt giữa các lượt chơi.
- Wave Reward Power Crystal và Item Spawn có thể tạo lượng Ability Usage không đồng đều.
- Buff/Slow/Freeze/Burn/Shield có thể gây tương tác khó dự đoán nếu chưa chốt quy tắc cộng dồn.
- Khi Enemy vượt Base Boundary, Defeat xảy ra ngay; không cân bằng bằng cách bổ sung Base HP.

Các mục này là **rủi ro cần kiểm thử**, không phải cơ chế mới được phê duyệt.

## 15. Danh sách quyết định cần chủ dự án chốt

### Nhóm A — Đơn vị và mô hình chiến đấu

1. **Đã chốt:** Attack Speed biểu diễn bằng **attacks/second**; không còn là câu hỏi mở.
2. **Đã chốt:** Attack Range dùng **Cells**; Move Speed dùng **Cells/second**. Giá trị từng Entity vẫn TBD.
3. Targeting Strategy, Attack Type và Behavior chính thức của từng Entity?
4. Có Armor/Resistance hoặc Damage Type ngoài các Effect đã mô tả không?

### Nhóm B — Defender và Fusion

5. HP, Damage, Attack Speed, Range, Summon Energy Cost, Summon Cooldown của 5 Base Defenders?
6. HP, Damage, Attack Speed, Range và Attack Rules của 6 Fusion Defenders?
7. HP Output = 100% own Max HP, không inherited statuses và có thể attack ngay khi valid target đã Confirmed. Fusion interaction cooldown/animation và chi tiết implementation còn TBD.

### Nhóm C — Enemy

8. HP, Damage, Attack Speed, Range, Move Speed của 4 Enemies? Death rewards đã Confirmed ở mục 6.
9. Enemy Interaction Behavior chính thức của Zombie, Husk, Spider và Pillager?

### Nhóm D — Resources

10. Energy Item Amount/Spawn Rate và chi tiết implementation? Initial/passive Energy, lifetime và Unlimited cap đã Confirmed ở mục 7.
11. Chi tiết implementation resource chưa chốt? Initial Crystal/cap, random interval/amount/lifetime và Pending Wave Reward đã Confirmed ở mục 8.
12. Power Crystal Reward amount của từng Wave? Overflow delivery đã Confirmed; không tự đặt amount.

### Nhóm E — Special Abilities

13. Power Crystal Cost và Cooldown cho từng Ability?
14. Hiệu ứng, Damage, Duration, Targeting/Area và Status Stacking của từng Ability?

### Nhóm F — Level và độ khó

15. Enemy Composition, Count, Allowed Rows và Spawn Schedule cho 5 Waves?
16. Thời gian nghỉ giữa Waves, thời lượng Level mục tiêu và độ khó mong muốn?
17. Ngưỡng đánh giá Playtest: Victory Rate, Wave Clear Time, Base Breach Rate?

**Không cần chốt toàn bộ ngay.** Có thể phê duyệt theo từng nhóm; mọi mục còn lại tiếp tục giữ TBD.

## 16. Acceptance Criteria cho tài liệu Balance

- [ ] Tất cả 5 Base Defenders có dòng thông số rõ ràng.
- [ ] Tất cả 6 Fusion Defenders có dòng thông số rõ ràng.
- [ ] Tất cả 4 Enemies có dòng thông số rõ ràng.
- [ ] Tất cả 11 Special Abilities có dòng Cost/Cooldown/Effect.
- [ ] Cả 5 Waves có bảng Composition/Spawn/Reward.
- [ ] Các thông số chưa được xác nhận đều là TBD.
- [ ] Không sử dụng số Prototype như thông số chính thức.
- [ ] Quy tắc Fusion miễn phí, không giới hạn Lane/Distance, Output tại Target Cell được giữ nguyên.
- [ ] Không bổ sung Base HP/Lives.
- [ ] Energy và Power Crystal được quản lý độc lập.
- [ ] Có Decision Log và danh sách nội dung cần chủ dự án duyệt.
- [ ] Không xuất cấu hình Runtime khi các Field bắt buộc vẫn TBD.

## 17. Tài liệu liên quan

- `docs/product/GDD.md`
- `docs/product/GAMEPLAY_MECHANICS.md`
- `docs/game-design/ENTITY_CATALOG.md`
- `docs/game-design/FUSION_RECIPES.md`
- `docs/game-design/ABILITY_CATALOG.md`
- `docs/game-design/LEVEL_DESIGN.md`
- `docs/architecture/DATA_ARCHITECTURE.md`
- `docs/development/TESTING_STRATEGY.md`

---

**Kết thúc tài liệu — `GAME_BALANCING.md` — Draft v1.0 (chưa chốt thông số)**
