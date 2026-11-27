**Đường dẫn trong repository:** `docs/game-design/ABILITY_CATALOG.md`  
**Dự án:** Minecraft Fusion Defense  
**Trạng thái:** Confirmed v2.2 — Đã được Owner xác nhận chính thức ngày `2026-11-21` và hoàn tất đợt rà soát/refactor toàn bộ **20 Special Abilities** ngày `2026-11-23` (5 Base Defenders + 15 Tier-2 Fusion Defenders; chỉ giữ lại VFX/Animation/UI Events thuộc phạm vi `T-12` ở trạng thái `TBD`)  
**Phạm vi:** MVP Desktop Web; chiến trường 5 × 9; 5 Base Defenders; 15 Fusion Defenders; 4 Enemy (`zombie`, `husk`, `vindicator`, `pillager`); 5 Waves tại Grassland.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Mục đích

Tài liệu định nghĩa danh mục **12 Special Abilities đã xác nhận của MVP** (5 Base Defenders + 7 Fusion Defenders, bao gồm Steel Guardian `iron_bastion`), quy tắc kích hoạt, hiệu ứng, cấu trúc dữ liệu `AbilityDefinition`, mã từ chối chuẩn, tình huống đặc biệt và tiêu chí nghiệm thu cho MVP. Cần đọc cùng [GDD.md](../product/GDD.md), [GAMEPLAY_MECHANICS.md](../product/GAMEPLAY_MECHANICS.md), [ENTITY_CATALOG.md](ENTITY_CATALOG.md), [FUSION_RECIPES.md](FUSION_RECIPES.md) và [T-10 Implementation Plan](../development/T-10-SPECIAL-ABILITIES-IMPLEMENTATION-PLAN.md).

**Nhãn quyết định:** **Confirmed** = đã được Owner xác nhận (`2026-11-21`); **TBD** = chưa quyết định (chỉ còn các mục trình diễn UI/VFX/Audio thuộc phạm vi `T-12`). Các chỉ số gốc (`baseMaxHp`, `baseAttackDamage`, `armor`, `fireResistancePct`, `freezeImmune`) thuộc `ENTITY_CATALOG.md` / `GAME_BALANCING.md` và có thể được Owner tinh chỉnh sau đợt chơi thử thực nghiệm.

## 2. Quy tắc hệ thống đã xác nhận (`Confirmed`)

1. **Power Crystal** là tài nguyên độc lập với **Energy**. Power Crystal dùng để kích hoạt Special Ability của Defender, không dùng cho Fusion thông thường.
2. **Kinh tế Power Crystal:** Initial `0` / cap tối đa `5`, lifetime `10` giây Game Time, random attempt mỗi `30–60` giây sinh `1` Crystal. Ngoài ra đến từ Enemy death Items và Wave Rewards (phần dư vượt cap `5` lưu vào `Pending Wave Reward`).
3. Mỗi Base Defender và Fusion Defender trong MVP có đúng **một** Special Ability được định nghĩa (`12` Abilities tổng cộng).
4. **Chi phí & Cooldown mặc định đã xác nhận:**
   - **Chi phí:** `1` **Power Crystal** cho mỗi lần kích hoạt hợp lệ (áp dụng đồng nhất cho cả 12 Abilities; số nguyên cấu hình qua `powerCrystalCost` trong data).
   - **Cooldown:** `0` giây (**không có cooldown**; trường `cooldownSeconds` vẫn hỗ trợ cấu hình `>= 0` ở mức engine nhưng cấu hình MVP hiện tại là `0`).
5. **Điều kiện kích hoạt:** Chỉ cho phép khi Game State là `PLAYING`, Defender sở hữu còn sống trên Grid và không bị vô hiệu hóa (`stun`/`freeze` trừ khi cấu hình cho phép), đủ Power Crystal, hết Cooldown (nếu cấu hình `> 0`), và có mục tiêu hợp lệ nếu cấu hình bật `requiresTarget: true`.
6. **Targeting & Phạm vi (`Updated 2026-11-26`):** Theo quyết định của Owner ngày `2026-11-26`, **toàn bộ 20 Special Abilities của MVP đều đặt `requiresTarget: false`** để người chơi luôn kích hoạt được kỹ năng ngay cả khi chưa có Enemy trên Lane hoặc trên sân (các kỹ năng bắn/thả cầu lửa vẫn xả đạn dọc Lane hoặc rơi phía trước ô đứng của Defender; engine vẫn giữ hỗ trợ cờ `requiresTarget: true` ở cấp hợp đồng dữ liệu). Không mặc định lan xuyên Lane ngoài phạm vi đã khai báo.
7. **Pause & Terminal:** `PAUSED` đóng băng toàn bộ Game Time (cooldown, status duration, Burn tick, multihit cadence, projectile, redirect aura); mọi yêu cầu kích hoạt khi `PAUSED` hoặc `VICTORY`/`DEFEAT` bị từ chối ngay tại cổng `enqueue`. Defender attack và Enemy movement tính đồng thời theo tick cố định. Terminal Priority theo quyết định Owner [G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md](../decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md): *first valid resolved terminal event wins*.
8. **Tương tác Fusion:** Fusion tốn `0` Energy / `0` Power Crystal, mọi Lane/khoảng cách, Output tại Target Cell ở `100%` own Max HP, **không kế thừa** bất kỳ buff/shield/redirect/cooldown nào của nguyên liệu và không tự kích hoạt Special Ability.

## 3. Danh mục 20 Special Abilities trong MVP (`Confirmed 2026-11-21, 2026-11-23 & 2026-11-26`)

| Ability ID | Tên Ability | Defender sở hữu | Loại | Cần mục tiêu (`requiresTarget`) | Chi phí / Cooldown | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `blizzard` | Blizzard | `snow_golem` | Base | Không (`false`, quét `same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `earthquake` | Earthquake | `iron_golem` | Base | Không (`false`, quét `same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `arrow_storm` | Arrow Storm | `skeleton` | Base | Không (`false`, bắn dọc Lane) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `pack_frenzy` | Pack Frenzy | `wolf` | Base | Không (`self`) | `1` Crystal / `0s` | **Confirmed** |
| `inferno` | Inferno | `blaze` | Base | Không (`false`, lobbed arc dọc Lane) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `piercing_barrage` | Piercing Barrage | `skeleton_sniper` | Fusion | Không (`same-lane` proactive) | `1` Crystal / `0s` | **Confirmed** |
| `absolute_zero` | Absolute Zero | `ice_golem` | Fusion | Không (`false`, quét `all-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `glacial_fortress` | Glacial Fortress | `frost_guardian` | Fusion | Không (`self` + front tile) | `1` Crystal / `0s` | **Confirmed** |
| `wildfire_rush` | Wildfire Rush | `flame_fang` | Fusion | Không (`false`, first per lane) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `meteor_arrow_rain` | Meteor Arrow Rain | `inferno_archer` | Fusion | Không (`false`, area 3×3) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `alpha_howl` | Alpha Howl | `alpha_wolf` | Fusion | Không (`ally-3x3`) | `1` Crystal / `0s` | **Confirmed** |
| `iron_bastion` | Iron Bastion | `steel_guardian` | Fusion | Không (`self` + `ally-3x3`) | `1` Crystal / `0s` | **Confirmed** |
| `siege_volley` | Siege Volley | `iron_ranger` | Fusion | Không (`false`, bắn dọc Lane) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `guardian_charge` | Guardian Charge | `ironfang_guardian` | Fusion | Không (`same-lane` proactive) | `1` Crystal / `0s` | **Confirmed (2026-11-23)** |
| `eruption` | Eruption | `magma_colossus` | Fusion | Không (`false`, quét `same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `glacier_barrage` | Glacier Barrage | `frostbite_ranger` | Fusion | Không (`same-lane` proactive) | `1` Crystal / `0s` | **Confirmed (2026-11-23)** |
| `winter_pounce` | Winter Pounce | `frostfang` | Fusion | Không (`false`, quét `front-3-cells`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `thermal_collapse` | Thermal Collapse | `steam_warden` | Fusion | Không (`false`, quét `area-3x3-self`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `predator_mark` | Predator Mark | `bonefang_hunter` | Fusion | Không (`false`, tìm `same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |
| `solar_cataclysm` | Solar Cataclysm | `infernal_archon` | Fusion | Không (`false`, quét `all-enemies`) | `1` Crystal / `0s` | **Confirmed (2026-11-26)** |

## 4. Special Abilities của 5 Base Defenders (`Confirmed`)

### 4.1. Blizzard — Snow Golem (`blizzard`, Updated `2026-11-23`)

- **Mục tiêu thiết kế:** Khống chế đám đông bằng băng kèm sát thương băng nhẹ trên cùng Lane.
- **Hiệu ứng xác nhận:** Gây ngay **`1× Attack Damage` hệ Ice** và áp dụng **Slow `-50%` tốc độ di chuyển trong `5` giây** lên toàn bộ Enemy đang có mặt trên **cùng Lane** tại thời điểm kích hoạt.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (từ chối `no-target` nếu không có Enemy trên Lane). Cùng nguồn làm mới thời gian (`FR1`); nhiều Slow chồng nhau chỉ lấy mức làm chậm mạnh nhất (`strongest wins`). Slow đã gắn tiếp tục tồn tại nếu mục tiêu đổi Lane hoặc Owner chết/Fusion.

### 4.2. Earthquake — Iron Golem (`earthquake`, Updated `2026-11-26`)

- **Mục tiêu thiết kế:** Gây sát thương vật lý tức thời và làm choáng tuyến địch **phía trước mặt** trên cùng Lane.
- **Hiệu ứng xác nhận:** Gây ngay **`3× Attack Damage` sát thương vật lý** (giảm bởi Armor) và **Stun `2` giây** lên toàn bộ Enemy đang đứng **từ ô của Iron Golem đến hết mép phải trên cùng Lane (`same-lane-enemies-ahead`, `position >= col`)**; hiệu ứng vết nứt đất trải dài suốt phần Lane phía trước mặt. **Không đánh kẻ địch đã vượt ra sau lưng (`position < col`) và không có Knockback.**
- **Điều kiện & Quy tắc:** `requiresTarget: false`. Stun chặn di chuyển, đòn đánh thường, kỹ năng và tạm dừng chuỗi multihit chưa bắn (`FR3`). Cùng nguồn làm mới; khác nguồn độc lập.

### 4.3. Arrow Storm — Skeleton (`arrow_storm`, Updated `2026-11-26`)

- **Mục tiêu thiết kế:** Xả loạt mũi tên liên tiếp cường độ cao dọc theo Lane.
- **Hiệu ứng xác nhận:** Bắn chuỗi **`16` mũi tên** cách nhau **`0.15` giây** (mũi đầu bắn ngay tại tick kích hoạt), mỗi mũi gây **`100% Attack Damage`** (snapshot lúc bắn mỗi phát), tốc độ đạn thường, không xuyên mục tiêu (`pierce: false`).
- **Điều kiện & Quy tắc:** `requiresTarget: false` (bắn được cả khi Lane trống). Mỗi lần bắn chọn lại mục tiêu; nếu Skeleton bị Stun/Freeze giữa chuỗi thì tạm dừng cadence giữ nguyên thời gian chờ còn lại (`FR3`, không xả dồn khi hết choáng). Chết/Fusion hủy các phát chưa bắn; mũi tên đã bắn tiếp tục bay độc lập.

### 4.4. Pack Frenzy — Wolf (`pack_frenzy`)

- **Mục tiêu thiết kế:** Bùng nổ tốc độ đánh và sát thương cận chiến cho bản thân Wolf.
- **Hiệu ứng xác nhận:** Tự buff **`+100% Attack Speed` và `+50% Attack Damage` trong `8` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: false` (kích hoạt được khi không có Enemy). Cùng nguồn làm mới không cộng dồn; cộng dồn **tuyến tính trên chỉ số gốc** (`additive base`) với các Buff khác nguồn (như `alpha_howl`). Stun vẫn chặn tấn công thường nhưng không đóng băng bộ đếm thời gian Buff. Wolf chết hoặc bị tiêu thụ cho Fusion thì tự mất Buff.

### 4.5. Inferno — Blaze (`inferno`, Updated `2026-11-26`)

- **Mục tiêu thiết kế:** Pháo kích lửa theo quỹ đạo **đường cong (lobbed arc)** từ vị trí Blaze tới mục tiêu — đồng nhất với đòn đánh thường bắn cầu lửa đường cong có Burn của Blaze.
- **Hiệu ứng xác nhận:** Phóng chuỗi **`8` cầu lửa theo quỹ đạo đường cong (lobbed arc)** từ vị trí của Blaze cách nhau **`0.18` giây** nhắm vào Enemy trên **cùng Lane** (nếu Lane trống thì ném về phía trước `(row, col + 3)`), thời gian bay parabol `0.45` giây. Mỗi cầu lửa gây **`125% Attack Damage` hệ Fire** (`armorPiercing: true`, chịu `Fire Resistance`) và gắn **Burn `25% Attack Damage/giây` trong `5` giây** (`1 tick/giây`, `damageType: 'fire'`) cho toàn bộ Enemy nằm trong ô rơi.
- **Điều kiện & Quy tắc:** `requiresTarget: false` (`same-lane-enemies`). Đòn đánh thường của Blaze cũng mang hệ Fire và tự gắn **Burn `20% AD/giây` trong `3` giây** (tương tự đòn đánh thường của Snow Golem gắn **Slow `-35%` trong `2.5` giây**). Cầu lửa đã phóng tiếp tục bay theo đường cong tới ô đích nếu Blaze chết/Fusion; các phát chưa phóng bị hủy nếu Blaze chết/Fusion; Stun/Freeze tạm dừng cadence (`FR3`). Sát thương Burn snapshot Attack Damage lúc phát đạn; Burn tồn tại độc lập sau khi Blaze chết/Fusion.

## 5. Special Abilities của 15 Fusion Defenders (`Confirmed`)

### 5.1. Piercing Barrage — Skeleton Sniper (`piercing_barrage`)

- **Mục tiêu thiết kế:** Mũi tên hợp nhất xuyên thủng toàn bộ hàng Enemy trên cùng Lane.
- **Hiệu ứng xác nhận:** Bắn **`1` mũi tên hợp nhất** gây **`600% Attack Damage`** (snapshot lúc bắn), tốc độ **`2×`**, xuyên không giới hạn dọc **cùng Lane** (`pierce: true`, không suy giảm sát thương theo số mục tiêu).
- **Điều kiện & Quy tắc:** `requiresTarget: false` (có thể bắn khi không có Enemy). Mỗi Enemy chỉ trúng tối đa `1` lần bởi cùng một mũi tên (`hitEnemyIds`); Enemy miễn nhiễm vẫn tính là đã hit để mũi tên bay tiếp cho tới khi ra khỏi biên cột `9`. Mũi tên đã bắn tiếp tục bay nếu Skeleton Sniper chết hoặc Fusion.

### 5.2. Absolute Zero — Ice Golem (`absolute_zero`)

- **Mục tiêu thiết kế:** Đóng băng toàn bộ chiến trường trong thời gian giới hạn.
- **Hiệu ứng xác nhận:** **Freeze trong `4` giây** toàn bộ Enemy đang có mặt trên **cả `5` Lane**.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (cần ít nhất `1` Enemy sống trên sân). Freeze chặn di chuyển, tấn công và kỹ năng; tôn trọng `freezeImmune` (bỏ qua) và `freezeResistancePct` (giảm thời lượng tỷ lệ thuận lúc gắn/làm mới). Cùng nguồn làm mới; khác nguồn độc lập; đồng tồn tại với `Slow` và `Stun`; tiếp tục duy trì sau khi Ice Golem chết/Fusion hoặc mục tiêu đổi Lane.

### 5.3. Glacial Fortress — Frost Guardian (`glacial_fortress`)

- **Mục tiêu thiết kế:** Tạo lá chắn hấp thụ sát thương kết hợp vùng làm chậm ngay trước mặt tuyến phòng thủ.
- **Hiệu ứng xác nhận:** Tự tạo **Shield bằng `50% Max HP`** tồn tại đến khi bị đánh vỡ. Chừng nào Shield còn tồn tại (`amount > 0`), duy trì vùng **`1` ô ngay phía trước `(row, col + 1)`** áp dụng **Slow `-50%`** cho mọi Enemy đang ở trong ô.
- **Điều kiện & Quy tắc:** `requiresTarget: false`.
  - Enemy rời ô `(row, col + 1)` khi Shield vẫn còn thì mất ngay Slow từ vùng.
  - Khi Shield bị phá vỡ (`amount === 0`), các Enemy đang bị làm chậm trong vùng chuyển sang giữ **residual Slow `5` giây**.
  - Kích hoạt lại khi Shield cũ chưa vỡ sẽ đặt lại lượng Shield về `50% Max HP` mới mà **giữ nguyên `shieldId` và thứ tự tạo (`creationOrder`)** (`FR2`).
  - Shield hấp thụ trước HP (kể cả sát thương xuyên Armor, trừ cờ `shieldPiercing`). Nếu Frost Guardian chết hoặc Fusion thì Shield và vùng biến mất, nhưng residual Slow đã chuyển/đang gắn trên Enemy giữ nguyên đến hết hạn.

### 5.4. Wildfire Rush — Flame Fang (`wildfire_rush`, Refactored `2026-11-23`)

- **Mục tiêu thiết kế:** Triệu hồi bầy `5` sói lửa nhảy vồ vào kẻ địch đi đầu của cả `5` Lane và gây thiêu đốt dữ dội.
- **Hiệu ứng xác nhận:** Triệu hồi tối đa **`5` con sói lửa** (mỗi Lane `1` con nếu Lane đó đang có Enemy sống) nhảy thẳng tới cắn **kẻ địch đầu tiên (gần căn cứ nhất) trên mỗi Lane (`0..4`)**. Mỗi cú cắn gây **`250% Attack Damage` hệ Fire** (`armorPiercing: true`, snapshot lúc kích hoạt) và gắn **Thiêu Đốt Dữ Dội — Burn `50% Attack Damage/giây` trong `6` giây** (`1 tick/giây`, `damageType: 'fire'`).
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`all-enemies` — yêu cầu ít nhất `1` Enemy sống trên toàn sân; chỉ triệu hồi sói lửa tại các Lane có Enemy, không lãng phí trên Lane trống). Sói lửa đã triệu hồi hoàn thành cú vồ và Burn giữ nguyên hết `6` giây ngay cả khi Flame Fang chết hoặc Fusion.

### 5.5. Meteor Arrow Rain — Inferno Archer (`meteor_arrow_rain`)

- **Mục tiêu thiết kế:** Trút mưa tên lửa xuống khu vực cố định 3×3 quanh tuyến đầu Enemy.
- **Hiệu ứng xác nhận:** Bắn **`8` mũi tên lửa rơi** cách nhau **`0.2` giây** vào **vùng cố định `3×3` lấy tâm là Enemy gần căn cứ nhất tại thời điểm kích hoạt**. Mỗi phát chọn lại mục tiêu trong vùng khóa (hoặc rơi xuống ô tâm nếu không còn Enemy trong vùng nhưng vẫn còn Enemy trên sân), khóa ô rơi, gây **`100% Attack Damage`** (hệ Fire, snapshot lúc phát tên) và gắn **Burn `25% Attack Damage/giây` trong `5` giây** cho toàn bộ Enemy nằm trong ô rơi.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (yêu cầu ít nhất `1` Enemy trên sân). Các mũi tên đang rơi tiếp tục hoàn thành đường rơi sau khi Inferno Archer chết/Fusion; các phát chưa bắn bị hủy nếu Inferno Archer chết/Fusion hoặc không còn bất kỳ Enemy nào trên sân; Stun tạm dừng các phát chưa bắn (`FR3`). Burn tồn tại độc lập sau khi source chết/Fusion.

### 5.6. Alpha Howl — Alpha Wolf (`alpha_howl`)

- **Mục tiêu thiết kế:** Cường hóa đồng loạt bản thân và các Defender xung quanh trong phạm vi 3×3.
- **Hiệu ứng xác nhận:** Tại thời điểm kích hoạt, snapshot toàn bộ Defender sống trong vùng **`3×3`** (bao gồm chính Alpha Wolf) để cấp **`+100% Attack Speed` và `+50% Attack Damage` trong `8` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: false`.
  - Đồng minh đã nhận Buff tiếp tục giữ Buff hết `8` giây dù rời vùng hoặc Alpha Wolf chết/Fusion sau đó; riêng Buff trên chính Alpha Wolf kết thúc ngay khi Alpha Wolf chết/Fusion.
  - Đồng minh nào chết hoặc bị tiêu thụ làm nguyên liệu Fusion sẽ mất Buff của mình (không kế thừa sang Fusion Output).
  - Cùng nguồn làm mới; các Alpha Wolf khác nhau và `pack_frenzy` cộng dồn tuyến tính trên chỉ số gốc (`additive base`).
  - Stun không chặn kích hoạt hay đóng băng thời gian Buff; Defender không có đòn tấn công thường vẫn nhận trạng thái Buff mà không tự sinh ra đòn đánh mới.

### 5.7. Iron Bastion — Steel Guardian (`iron_bastion`)

- **Mục tiêu thiết kế:** Lá chắn sinh tồn tối đa và lá chắn che chở chuyển hướng sát thương cho đồng minh 3×3 (danh tính xác nhận tại [PGD-01](../decisions/PGD-01-STEEL-GUARDIAN.md), thông số cơ chế chốt ngày `2026-11-21`).
- **Hiệu ứng xác nhận:**
  1. Tự tạo **Shield bằng `100%` Max HP hiện tại** (snapshot lúc kích hoạt), **tồn tại cho đến khi bị đánh vỡ** (không tự biến mất sau `8` giây).
  2. Kích hoạt vùng bảo vệ đồng minh **`3×3` động trong `8` giây**, chuyển hướng **`50%` sát thương sau Armor/Resistance** của các Defender đồng minh trong vùng về Steel Guardian.
- **Điều kiện & Quy tắc:** `requiresTarget: false`.
  - Phần sát thương chuyển hướng đi thẳng vào **Shield rồi HP** của Steel Guardian mà **không tính lại Armor/Resistance của Guardian lần thứ hai**; phần `50%` còn lại đi qua Shield rồi HP của đồng minh.
  - Nếu có nhiều Steel Guardian che phủ cùng đồng minh, chọn **Guardian gần nhất theo khoảng cách Manhattan**, hòa chọn **Entity ID nhỏ hơn** (không cộng dồn nhiều Redirect cho cùng 1 đòn đánh).
  - Sát thương có cờ `shieldPiercing` giữ nguyên tính xuyên Shield trên cả phần chuyển hướng lẫn phần giữ lại.
  - Kích hoạt lại khi hiệu ứng cũ chưa hết sẽ đặt lại Shield (`FR2` giữ nguyên `shieldId`/`creationOrder`) và đặt lại đồng hồ `8` giây mà không cộng dồn.
  - Sát thương chuyển hướng có thể hạ gục Steel Guardian (khi Guardian chết, phần sát thương dư **không tràn ngược lại đồng minh**). Guardian chết hoặc Fusion sẽ chấm dứt ngay vùng bảo vệ `3×3` và Shield của nó.

### 5.8. Siege Volley — Iron Ranger (`siege_volley`, Refactored `2026-11-23`)

- **Mục tiêu thiết kế:** Xạ thủ sát thương hạng nặng bắn chậm nhưng sát thương đơn mục tiêu cực lớn, chuyên kết liễu kẻ địch máu nhiều (như Husk) và yếu trước kẻ địch tốc độ cao (như Vindicator).
- **Hiệu ứng xác nhận:** Bắn **`1` chốt thép hạng nặng xuyên giáp cực đại** (`projectile`, `armorPiercing: true`, `pierce: false`, tốc độ `1.4×`) trúng **mục tiêu đầu tiên** trên **cùng Lane**, gây **`450% Attack Damage` vật lý cộng thêm `+20% Max HP` của mục tiêu** và gây **Stun `1` giây** lên mục tiêu trúng đòn.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`same-lane-enemy-in-range`). Không xuyên qua mục tiêu đầu tiên (dễ bị kẻ địch nhanh/máu giấy đứng trước chặn đòn nếu không bảo vệ). Chốt thép đã bắn tiếp tục bay nếu Iron Ranger chết/Fusion.

### 5.9. Guardian Charge — Ironfang Guardian (`guardian_charge`, Confirmed `2026-11-23`)

- **Mục tiêu thiết kế:** Thả chó sói sắt lao cắn xuyên suốt hết Lane bắt đầu từ vị trí của Ironfang Guardian.
- **Hiệu ứng xác nhận:** Phóng **`1` chó sói sắt xung kích** (`projectile`, `pierce: true`, tốc độ `1.6×`) chạy dọc từ vị trí của Ironfang Guardian cho tới hết biên cột `9` trên **cùng Lane**, cắn xuyên qua toàn bộ Enemy trên đường chạy gây **`350% Attack Damage`** vật lý và **Stun `1.5` giây** cho từng Enemy trúng phải.
- **Điều kiện & Quy tắc:** `requiresTarget: false` (chủ động thả chạy hết Lane). Mỗi Enemy chỉ trúng tối đa `1` lần (`hitEnemyIds`); chó sói đã thả tiếp tục chạy hết Lane ngay cả khi Ironfang Guardian chết/Fusion.

### 5.10. Eruption — Magma Colossus (`eruption`, Confirmed `2026-11-23`)

- **Mục tiêu thiết kế:** Phun trào dung nham diện rộng dọc cùng Lane kết hợp lá chắn chịu đòn.
- **Hiệu ứng xác nhận:** Gây ngay **`3.5× Attack Damage` hệ Fire** (`armorPiercing: true`) + gắn **Burn `30% Attack Damage/giây` trong `5` giây** (`1 tick/giây`) lên toàn bộ Enemy trên **cùng Lane**, đồng thời tự tạo **Shield bằng `30% Max HP`**.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`same-lane-enemies`). Burn giữ nguyên khi Owner chết/Fusion; Shield kết thúc khi bị đánh vỡ hoặc Owner chết/Fusion.

### 5.11. Glacier Barrage — Frostbite Ranger (`glacier_barrage`, Confirmed `2026-11-23`)

- **Mục tiêu thiết kế:** Bắn một mũi tên băng duy nhất xuyên hết cả hàng địch, đóng băng và làm chậm toàn bộ tuyến.
- **Hiệu ứng xác nhận:** Bắn **`1` mũi tên băng duy nhất** (`projectile`, `pierce: true`, tốc độ `1.8×`, `damageType: 'ice'`) bay suốt dọc **cùng Lane**, xuyên không giới hạn qua mọi Enemy, gây **`300% Attack Damage`** hệ Ice, gắn **Freeze `2.5` giây** (tôn trọng `freezeImmune`/`freezeResistancePct`) và **Slow `-50%` trong `5` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: false` (chủ động bắn hết Lane). Mỗi Enemy trúng tối đa `1` lần; mũi tên đã bắn tiếp tục bay nếu Owner chết/Fusion.

### 5.12. Winter Pounce — Frostfang (`winter_pounce`, Confirmed `2026-11-23`)

- **Mục tiêu thiết kế:** Đòn vồ băng tầm `3` ô phía trước, khuếch đại sát thương mạnh lên mục tiêu đang bị đóng băng hoặc làm chậm.
- **Hiệu ứng xác nhận:** Quét sát thương băng trong phạm vi **`3` ô phía trước** (`col` đến `col + 3` trên **cùng Lane**, `front-3-cells`), gây **`250% Attack Damage`** hệ Ice — và **tăng thêm `+60%` sát thương (tổng `400% Attack Damage`)** lên bất kỳ Enemy nào đang chịu hiệu ứng băng giá (`slow` hoặc `freeze`), đồng thời gắn **Slow `-50%` trong `4` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`front-3-cells` — cần ít nhất `1` Enemy trong phạm vi `3` ô phía trước trên cùng Lane).

### 5.13. Thermal Collapse — Steam Warden (`thermal_collapse`, Refactored `2026-11-23`)

- **Mục tiêu thiết kế:** Vụ nổ áp suất hơi nước bao phủ khu vực `3×3` xung quanh chính Steam Warden, kích hoạt hiệu ứng **Sốc Nhiệt (Thermal Shock)** lên kẻ địch đang bị thiêu đốt hoặc đóng băng.
- **Hiệu ứng xác nhận:** Kích nổ hơi nước trong vùng **`3×3` lấy tâm là chính Steam Warden** (`area-3x3-self`, `|row - ownerRow| <= 1` và `|col - ownerCol| <= 1`), gây **`250% Attack Damage` hệ Fire** (`armorPiercing: true`) — và **gây Sốc Nhiệt tăng thêm `+60%` sát thương (tổng `400% Attack Damage`)** lên bất kỳ Enemy nào trong vùng đang chịu **`Burn`** hoặc **`Freeze`**, đồng thời gắn **Slow `-50%` trong `5` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`area-3x3-self` — cần ít nhất `1` Enemy trong vùng `3×3` quanh Steam Warden).

### 5.14. Predator Mark — Bonefang Hunter (`predator_mark`, Refactored `2026-11-23`)

- **Mục tiêu thiết kế:** Đánh dấu con mồi quan trọng nhất trên Lane làm mục tiêu suy yếu (nhận thêm sát thương từ mọi nguồn), kết hợp cú cào xương xuyên giáp dồn sát thương.
- **Hiệu ứng xác nhận:** Chọn **mục tiêu ưu tiên trên cùng Lane** (Enemy máu cao nhất, hòa chọn gần căn cứ nhất) để gắn **Dấu Ấn Săn Mồi (`vulnerable` / `mark`) khiến mục tiêu nhận thêm `+40%` sát thương từ mọi nguồn trong `6` giây**, đồng thời Bonefang Hunter tự buff **`+50%` Attack Speed trong `6` giây** và tung ngay **`1` đòn cào xương xuyên giáp** gây **`250% Attack Damage`** vật lý lên mục tiêu bị đánh dấu (nếu mục tiêu ở trong tầm đánh của Bonefang Hunter, hoặc gây trực tiếp khi nhảy cào xuyên giáp trong tầm Lane).
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`same-lane-enemies`). Hiệu ứng `vulnerable` (`+40%` sát thương nhận vào) áp dụng sau Armor/Resistance trong Damage Pipeline (cùng nguồn làm mới thời lượng; nhiều dấu ấn lấy mức mạnh nhất `strongest wins`). Dấu Ấn trên Enemy giữ nguyên hết `6` giây ngay cả khi Bonefang Hunter chết/Fusion.

### 5.15. Solar Cataclysm — Infernal Archon (`solar_cataclysm`, Confirmed `2026-11-23`)

- **Mục tiêu thiết kế:** Đòn đại họa lửa bao trùm toàn bộ chiến trường `5` Lane, đối xứng với `Absolute Zero`.
- **Hiệu ứng xác nhận:** Gây ngay **`2.5× Attack Damage` hệ Fire** (`armorPiercing: true`) và gắn **Burn `30% Attack Damage/giây` trong `5` giây** (`1 tick/giây`) lên toàn bộ Enemy đang có mặt trên **cả `5` Lane (`all-enemies`)**.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (`all-enemies` — cần ít nhất `1` Enemy sống trên sân).

## 6. Quy trình kích hoạt Ability (`Confirmed`)

1. Trận đấu ở trạng thái `PLAYING`.
2. Người chơi **kéo-thả `1` Power Crystal lên một Defender sống hợp lệ** trên Grid (không dừng simulation khi chọn/kéo).
3. Hệ thống tuần tự hóa lệnh `activate-ability` qua Unified Event Queue và TransactionEngine (`D-60`).
4. Kiểm tra trong giao dịch nguyên tử: Game State `PLAYING`, Defender tồn tại & còn sống, có `AbilityDefinition`, không bị `stun`/`freeze` (nếu không được phép), hết Cooldown, đủ `Power Crystal`, hợp lệ `targetCell` (nếu có) và thỏa điều kiện mục tiêu (`requiresTarget`).
5. **Commit nguyên tử:** trừ `powerCrystalCost` Power Crystal, đặt `cooldownRemainingTicks` (nếu `> 0`), thực thi hiệu ứng tức thời / phát bắn đầu tiên ở `t = 0` và xếp lịch cadence/projectile, sau đó trả kết quả `outcome.status = 'APPLIED'`.
6. Nếu bước kiểm tra thất bại, ghi nhận `outcome = { status: 'REJECTED', reason }` mà **không tiêu tốn Power Crystal, không bắt đầu Cooldown và không làm hỏng trạng thái trận đấu**.

## 7. Validation và Rejection Codes (Đồng bộ T-10 Contract)

Khớp trực tiếp với `AbilityValidationReason` trong [ability-state.ts](../../packages/game/src/abilities/ability-state.ts) và cổng `enqueue` của [battle-runtime.ts](../../packages/game/src/systems/battle-runtime.ts):

| Reason / Guard | Điều kiện kích hoạt từ chối | Tác động tài nguyên |
| --- | --- | --- |
| `paused` *(ở `enqueue`)* | Trận đấu đang `PAUSED` | Không xếp hàng, không tốn Crystal |
| `terminal` *(ở `enqueue`)* | Trận đấu đã kết thúc (`VICTORY` / `DEFEAT`) | Không xếp hàng, không tốn Crystal |
| `invalid-owner` | `defenderId` không tồn tại hoặc không phải Defender | `REJECTED`, không tốn Crystal |
| `owner-dead` | Defender sở hữu có `hp <= 0` | `REJECTED`, không tốn Crystal |
| `ability-unavailable` | Không tìm thấy `AbilityDefinition` gắn với Defender | `REJECTED`, không tốn Crystal |
| `owner-disabled` | Defender đang chịu `stun` hoặc `freeze` (khi `!allowWhileDisabled`) | `REJECTED`, không tốn Crystal |
| `on-cooldown` | Cooldown còn lại `> 0` | `REJECTED`, không tốn Crystal |
| `insufficient-crystals` | `crystals < powerCrystalCost` | `REJECTED`, không tốn Crystal |
| `invalid-target-cell` | `targetCell` truyền vào nằm ngoài Grid `5 × 9` | `REJECTED`, không tốn Crystal |
| `no-target` | Ability có `requiresTarget: true` nhưng không có Enemy hợp lệ | `REJECTED`, không tốn Crystal |

## 8. Quy tắc Status Effect & Thứ tự Xử lý Sát thương (`Confirmed`)

- **Pipeline sát thương (`D-62`):** Mọi sát thương qua `applyDamagePipeline` tuân theo thứ tự nghiêm ngặt:
  **`Armor / Fire Resistance` → `Vulnerable / Mark (+% Damage Taken)` → `Redirect (Iron Bastion)` → `Shield (Oldest-First)` → `HP`**
  - Cờ `armorPiercing: true` bỏ qua `Armor`; `shieldPiercing: true` bỏ qua `Shield`.
  - Đòn hợp lệ có sát thương sau giảm trừ bằng `0` vẫn trả về `hitConfirmed = true` để các hiệu ứng on-hit (như `Burn`) vẫn gắn bình thường.
- **Status Identity & Làm mới (`FR1`):** Khóa định danh `(targetEntityId, sourceEntityId, abilityId, kind)`. Tái áp dụng cùng khóa giữ nguyên `statusId`, tăng `version++` và làm mới thời lượng (kèm snapshot mới với `Burn`).
- **Chồng hiệu ứng (`D-63`):**
  - `slow`: lấy mức mạnh nhất (`max(slowPct)`).
  - `vulnerable` (`mark` từ `predator_mark`): lấy mức tăng sát thương nhận vào mạnh nhất (`max(damageTakenBonusPct)`).
  - `stun` / `freeze`: hiệu lực khi còn ít nhất `1` instance hoạt động; `freeze` kiểm tra `freezeImmune` và rút ngắn theo `1 - freezeResistancePct`.
  - `burn`: nhảy sát thương hệ Fire mỗi `1.0s` Game Time; các nguồn khác nhau nhảy độc lập.
  - `buff`: các nguồn khác nhau (`pack_frenzy`, từng `alpha_howl`, `predator_mark`) cộng dồn tuyến tính trên chỉ số gốc (`baseDamage`, `baseAttackSpeed`).
- **Thứ tự mỗi Tick (`D-66`):** `Phase A0` (giảm Cooldown, chạy Multihit Cadence, cập nhật Projectile, đồng bộ Glacial Slow Zone, chạy Status & Burn tick, giảm Redirect timer, xử lý chết Phase A0) → `Phase A` (Enemy di chuyển + swept projectile crossing) → `Phase B` (tấn công cơ bản qua Damage Pipeline) → `Phase C` (xử lý chết, trao T-06 reward, kiểm tra Wave/Victory T-09).

## 9. Data-driven Schema (Đồng bộ `AbilityDefinition` T-10)

Khớp với [ability-session.ts](../../packages/game/src/abilities/ability-session.ts) (việc ánh xạ từ `@mfd/game-data` khi mở khóa dữ liệu cân bằng entity sẽ dùng chung cấu trúc hợp đồng này):

| Field | Type | Mô tả |
| --- | --- | --- |
| `id` | string | Ability ID duy nhất (`/^[a-z][a-z0-9_]*$/`) |
| `ownerDefenderId` | string | ID Defender sở hữu hợp lệ trong `CombatSession` |
| `powerCrystalCost` | integer | Số nguyên `>= 0` (`1` cho toàn bộ 12 Abilities MVP) |
| `cooldownSeconds` | number | Số hữu hạn `>= 0` (`0` cho toàn bộ 12 Abilities MVP) |
| `requiresTarget` | boolean | `true` nếu cần mục tiêu hợp lệ tại thời điểm kích hoạt |
| `targetScope` | AbilityTargetScope | `'self' \| 'same-lane-enemies' \| 'same-lane-enemy-in-range' \| 'all-enemies' \| 'melee-enemy' \| 'area-3x3-closest-enemy' \| 'ally-3x3'` |
| `allowWhileDisabled` | boolean? | Tùy chọn cho phép kích hoạt khi đang `stun`/`freeze` (mặc định `false`) |
| `effects` | AbilityEffectDefinition[] | Mảng hiệu ứng xác nhận (`instant-damage`, `status`, `shield`, `redirect`, `projectile`, `multihit-projectile`, `multihit-melee`, `multihit-falling-area`) |

Ví dụ JSON chuẩn hóa cho `glacial_fortress` theo đúng thông số G09 đã xác nhận:

```json
{
  "id": "glacial_fortress",
  "ownerDefenderId": "frost_guardian",
  "powerCrystalCost": 1,
  "cooldownSeconds": 0,
  "requiresTarget": false,
  "targetScope": "self",
  "effects": [
    {
      "kind": "shield",
      "shieldMaxHpPct": 0.5,
      "frontSlowZone": {
        "slowPct": 0.5,
        "residualDurationSeconds": 5
      }
    }
  ]
}
```

## 10. Tích hợp với các Game Systems

- **Resource System:** Dùng `Power Crystal` (`initial 0 / cap 5`, sinh mỗi `30–60s`, lifetime `10s`, cộng thêm từ Enemy death & Wave Reward).
- **Entity & Fusion System:** Xác thực Defender sở hữu sống; Fusion/tử trận gọi `cleanupEntityAbilityState` xóa buff bản thân, shield, redirect, slow zone, cooldown và cadence chưa bắn; không tự kích hoạt Ability khi Fusion.
- **Combat & Wave System:** Tái sử dụng targeting và Damage Pipeline; Enemy chết do Ability/Burn/Projectile trao T-06 `enemy-reward` và kích hoạt kiểm tra T-09 Wave completion / Victory.
- **UI & Event Bus Presentation (Phạm vi T-12 — `TBD`):** Tên event hiển thị UI (`ability:requested`, `ability:activated`, `ability:failed`, v.v.), chỉ báo preview vùng, animation, particle và âm thanh sẽ chốt ở giai đoạn `T-12`.

## 11. Edge Cases đã chốt (`Confirmed`)

- **Power Crystal vừa đủ chi phí:** Kích hoạt thành công và số dư trừ về `0`.
- **Hai request kích hoạt liên tiếp trong cùng tick:** Xếp hàng tuần tự; mỗi lần hợp lệ trừ `1` Crystal (hết Crystal ở request thứ hai thì request sau trả `insufficient-crystals`).
- **Owner chết trước Commit:** Từ chối `invalid-owner` / `owner-dead`, không tốn Power Crystal.
- **Owner chết hoặc bị Fusion sau Commit:**
  - `blizzard`, `earthquake`, `inferno`, `absolute_zero`, `wildfire_rush` burn: status đã gắn lên Enemy giữ nguyên hết thời hạn.
  - `arrow_storm`, `piercing_barrage`, `meteor_arrow_rain`: đạn đã bắn / mũi tên đang rơi tiếp tục hoàn thành đường bay; phát chưa bắn bị hủy.
  - `alpha_howl`: buff trên đồng minh `3×3` giữ nguyên; buff trên chính Alpha Wolf kết thúc.
  - `pack_frenzy`, `glacial_fortress` Shield/vùng, `iron_bastion` Shield/Redirect: kết thúc ngay (riêng residual Slow đã gắn của Glacial Fortress giữ nguyên).
- **Mất mục tiêu giữa Multihit Cadence:** `arrow_storm`, `wildfire_rush` và `meteor_arrow_rain` (khi `0` Enemy trên sân) hủy sạch các phát chưa bắn; không hoàn lại Crystal đã dùng cho phát đầu tiên.
- **Pause giữa Effect:** Đóng băng toàn bộ Game Time (`D-67`); Resume nối tiếp chính xác phần thời gian còn lại mà không bỏ bước hoặc xả dồn.
- **Terminal events cùng tick:** Event resolved trước trong Unified Event Queue thắng (`G07 Decision B`), hủy mọi hành động tiếp theo.

## 12. Acceptance Criteria của MVP (`T-10 Headless Verified`)

- [x] Có đúng `12` Ability definitions tham chiếu tới `12` Defender (bao gồm Steel Guardian `iron_bastion`) trong MVP.
- [x] Mỗi Defender có đúng một Special Ability được định nghĩa và xác nhận.
- [x] Power Crystal độc lập với Energy (`1` Crystal / kích hoạt, `0s` Cooldown).
- [x] Kích hoạt Ability yêu cầu đủ Power Crystal và đúng điều kiện `requiresTarget`.
- [x] Power Crystal chỉ bị trừ một lần sau khi Transaction Commit thành công.
- [x] Cooldown cấu hình (`>= 0`) hoạt động độc lập với Power Crystal Cost và chặn tái kích hoạt khi chưa hết hạn.
- [x] Kích hoạt thất bại không tiêu tài nguyên hoặc bắt đầu Cooldown.
- [x] Targeting và quy tắc xuyên Lane được khai báo rõ theo từng Ability (`AC-03`, `AC-04`).
- [x] Pause đóng băng toàn bộ Ability Timers, Cadences, Projectiles, Redirects và Statuses (`AC-15`).
- [x] Không thể kích hoạt Ability trong `VICTORY` / `DEFEAT` (`AC-15`).
- [x] Hai request trùng/liên tiếp được tuần tự hóa nguyên tử, không tạo hiệu ứng lậu (`AC-02`).
- [x] Fusion không tiêu Power Crystal, không kế thừa Buff/Shield và không tự kích hoạt Ability (`AC-13`).
- [x] Đủ `22` unit & integration tests bao phủ `AC-01`–`AC-17` trong `packages/game/tests/battle-abilities.test.ts` (đã nghiệm thu cục bộ `AC-01`–`AC-19` PASS).
- [ ] Tích hợp UI kéo-thả Power Crystal, VFX, Animation và trải nghiệm thực tế trên UI *(thuộc phạm vi `T-12` / bản chơi thử 1-lane)*.

## 13. Trạng thái Quyết định (Decision Status)

| Chủ đề | Trạng thái | Ghi chú |
| --- | --- | --- |
| Power Crystal Cost chính xác của 12 Abilities | **Confirmed (`2026-11-21`)** | `1` Power Crystal / kích hoạt hợp lệ |
| Cooldown theo Ability | **Confirmed (`2026-11-21`)** | `0` giây (không cooldown; hỗ trợ cấu hình `>= 0` ở engine) |
| UX chọn mục tiêu & kích hoạt Ability | **Confirmed (`2026-11-21`)** | Kéo-thả `1` Power Crystal lên Defender khi `PLAYING` |
| Hình dạng Area và phạm vi xuyên Lane | **Confirmed (`2026-11-21`)** | Quy định rõ theo từng Ability ở §3–§5 |
| Damage, Duration, số lần đánh và Multipliers | **Confirmed (`2026-11-21`)** | Theo thông số tương đối `× AD`, `% Max HP`, `0.2s` / `1s` / `2s` / `4s` / `5s` / `8s` ở §4–§5 *(có thể điều chỉnh sau playtest)* |
| Quy tắc cộng dồn / làm mới / miễn nhiễm Status Effect | **Confirmed (`2026-11-21`)** | §8 (`FR1–FR3`, pipeline `Armor/Res → Redirect → Shield → HP`) |
| Giới hạn Power Crystal tối đa | **Confirmed** | Cap `5` |
| Random Power Crystal Item | **Confirmed** | Attempt mỗi `30–60s` Game Time, `1` Crystal/Item, lifetime `10s` |
| Effect tồn tại sau khi Owner chết / Fusion | **Confirmed (`2026-11-21`)** | §11 (đạn đã bắn & Enemy status giữ; cadence chưa bắn hủy; Shield/Redirect/self-buff xóa; ally `alpha_howl` giữ) |
| VFX, Audio, thời điểm Animation & UI Bus Events | **TBD (Phạm vi T-12)** | Chờ tích hợp UI/Assets ở T-12 (Audio không phải blocker MVP) |

## 14. Tài liệu liên quan

- [GDD.md](../product/GDD.md)
- [GAMEPLAY_MECHANICS.md](../product/GAMEPLAY_MECHANICS.md)
- [ENTITY_CATALOG.md](ENTITY_CATALOG.md)
- [FUSION_RECIPES.md](FUSION_RECIPES.md)
- [GAME_BALANCING.md](GAME_BALANCING.md)
- [DATA_ARCHITECTURE.md](../architecture/DATA_ARCHITECTURE.md)
- [T-10 Implementation Plan](../development/T-10-SPECIAL-ABILITIES-IMPLEMENTATION-PLAN.md)
- [T-10 Acceptance Report](../reports/T-10-FINAL-ACCEPTANCE.md)

---

**Kết thúc tài liệu — `ABILITY_CATALOG.md` — Confirmed v2.0 (2026-11-21)**
