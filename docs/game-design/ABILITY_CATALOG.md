**Đường dẫn trong repository:** `docs/game-design/ABILITY_CATALOG.md`  
**Dự án:** Minecraft Fusion Defense  
**Trạng thái:** Confirmed v2.0 — Đã được Owner xác nhận chính thức ngày `2026-11-21` (đồng bộ quy tắc G09 từ `PGD-02` và hợp đồng runtime T-10; chỉ giữ lại VFX/Animation/UI Events thuộc phạm vi `T-12` ở trạng thái `TBD`)  
**Phạm vi:** MVP Desktop Web; chiến trường 5 × 9; 5 Base Defenders; 7 Fusion Defenders; 4 Enemy (`zombie`, `husk`, `vindicator`, `pillager`); 5 Waves tại Grassland.

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
5. **Điều kiện kích hoạt:** Chỉ cho phép khi Game State là `PLAYING`, Defender sở hữu còn sống trên Grid và không bị vô hiệu hóa (`stun`/`freeze` trừ khi cấu hình cho phép), đủ Power Crystal, hết Cooldown (nếu cấu hình `> 0`), và có mục tiêu hợp lệ đối với các Ability yêu cầu mục tiêu (`requiresTarget: true`).
6. **Targeting & Phạm vi:** Ability khai báo rõ `targetScope` và `requiresTarget`. Kỹ năng tự thân/đồng minh/chủ động (`pack_frenzy`, `piercing_barrage`, `glacial_fortress`, `alpha_howl`, `iron_bastion`) được phép kích hoạt khi không có Enemy trên sân. Không mặc định lan xuyên Lane ngoài phạm vi đã khai báo.
7. **Pause & Terminal:** `PAUSED` đóng băng toàn bộ Game Time (cooldown, status duration, Burn tick, multihit cadence, projectile, redirect aura); mọi yêu cầu kích hoạt khi `PAUSED` hoặc `VICTORY`/`DEFEAT` bị từ chối ngay tại cổng `enqueue`. Defender attack và Enemy movement tính đồng thời theo tick cố định. Terminal Priority theo quyết định Owner [G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md](../decisions/PGD-02/owner-decisions/G07-TERMINAL-PRIORITY-OWNER-2026-11-20.md): *first valid resolved terminal event wins*.
8. **Tương tác Fusion:** Fusion tốn `0` Energy / `0` Power Crystal, mọi Lane/khoảng cách, Output tại Target Cell ở `100%` own Max HP, **không kế thừa** bất kỳ buff/shield/redirect/cooldown nào của nguyên liệu và không tự kích hoạt Special Ability.

## 3. Danh mục 12 Special Abilities trong MVP (`Confirmed 2026-11-21`)

| Ability ID | Tên Ability | Defender sở hữu | Loại | Cần mục tiêu (`requiresTarget`) | Chi phí / Cooldown | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| `blizzard` | Blizzard | `snow_golem` | Base | Có (`same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed** |
| `earthquake` | Earthquake | `iron_golem` | Base | Có (`same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed** |
| `arrow_storm` | Arrow Storm | `skeleton` | Base | Có (`same-lane-enemy-in-range`) | `1` Crystal / `0s` | **Confirmed** |
| `pack_frenzy` | Pack Frenzy | `wolf` | Base | Không (`self`) | `1` Crystal / `0s` | **Confirmed** |
| `inferno` | Inferno | `blaze` | Base | Có (`same-lane-enemies`) | `1` Crystal / `0s` | **Confirmed** |
| `piercing_barrage` | Piercing Barrage | `skeleton_sniper` | Fusion | Không (`same-lane` proactive) | `1` Crystal / `0s` | **Confirmed** |
| `absolute_zero` | Absolute Zero | `ice_golem` | Fusion | Có (`all-enemies`) | `1` Crystal / `0s` | **Confirmed** |
| `glacial_fortress` | Glacial Fortress | `frost_guardian` | Fusion | Không (`self` + front tile) | `1` Crystal / `0s` | **Confirmed** |
| `wildfire_rush` | Wildfire Rush | `flame_fang` | Fusion | Có (`melee-enemy`) | `1` Crystal / `0s` | **Confirmed** |
| `meteor_arrow_rain` | Meteor Arrow Rain | `inferno_archer` | Fusion | Có (`area-3x3-closest-enemy`) | `1` Crystal / `0s` | **Confirmed** |
| `alpha_howl` | Alpha Howl | `alpha_wolf` | Fusion | Không (`ally-3x3`) | `1` Crystal / `0s` | **Confirmed** |
| `iron_bastion` | Iron Bastion | `steel_guardian` | Fusion | Không (`self` + `ally-3x3`) | `1` Crystal / `0s` | **Confirmed** |

## 4. Special Abilities của 5 Base Defenders (`Confirmed`)

### 4.1. Blizzard — Snow Golem (`blizzard`)

- **Mục tiêu thiết kế:** Khống chế đám đông bằng băng trên cùng Lane.
- **Hiệu ứng xác nhận:** Áp dụng **Slow `-50%` tốc độ di chuyển trong `5` giây** lên toàn bộ Enemy đang có mặt trên **cùng Lane** tại thời điểm kích hoạt.
- **Điều kiện & Quy tắc:** `requiresTarget: true` (từ chối `no-target` nếu không có Enemy trên Lane). Cùng nguồn làm mới thời gian (`FR1`); nhiều Slow chồng nhau chỉ lấy mức làm chậm mạnh nhất (`strongest wins`). Slow đã gắn tiếp tục tồn tại nếu mục tiêu đổi Lane hoặc Owner chết/Fusion.

### 4.2. Earthquake — Iron Golem (`earthquake`)

- **Mục tiêu thiết kế:** Gây sát thương vật lý tức thời và làm choáng tuyến trước trên cùng Lane.
- **Hiệu ứng xác nhận:** Gây ngay **`3× Attack Damage` sát thương vật lý** (giảm bởi Armor) và **Stun `2` giây** lên toàn bộ Enemy đang có mặt trên **cùng Lane**. **Không có Knockback.**
- **Điều kiện & Quy tắc:** `requiresTarget: true`. Stun chặn di chuyển, đòn đánh thường, kỹ năng và tạm dừng chuỗi multihit chưa bắn (`FR3`). Cùng nguồn làm mới; khác nguồn độc lập.

### 4.3. Arrow Storm — Skeleton (`arrow_storm`)

- **Mục tiêu thiết kế:** Xả loạt mũi tên liên tiếp cường độ cao dọc theo Lane.
- **Hiệu ứng xác nhận:** Bắn chuỗi **`8` mũi tên** cách nhau **`0.2` giây** (mũi đầu bắn ngay tại tick kích hoạt), mỗi mũi gây **`100% Attack Damage`** (snapshot lúc bắn mỗi phát), tốc độ đạn thường, không xuyên mục tiêu (`pierce: false`).
- **Điều kiện & Quy tắc:** `requiresTarget: true` (yêu cầu Enemy hợp lệ trong tầm trên cùng Lane). Mỗi lần bắn chọn lại mục tiêu; nếu Skeleton bị Stun/Freeze giữa chuỗi thì tạm dừng cadence giữ nguyên thời gian chờ còn lại (`FR3`, không xả dồn khi hết choáng). Chết/Fusion hoặc hết mục tiêu hủy các phát chưa bắn; mũi tên đã bắn tiếp tục bay độc lập và có thể trúng Enemy hợp lệ khác nếu mục tiêu cũ chết.

### 4.4. Pack Frenzy — Wolf (`pack_frenzy`)

- **Mục tiêu thiết kế:** Bùng nổ tốc độ đánh và sát thương cận chiến cho bản thân Wolf.
- **Hiệu ứng xác nhận:** Tự buff **`+100% Attack Speed` và `+50% Attack Damage` trong `8` giây**.
- **Điều kiện & Quy tắc:** `requiresTarget: false` (kích hoạt được khi không có Enemy). Cùng nguồn làm mới không cộng dồn; cộng dồn **tuyến tính trên chỉ số gốc** (`additive base`) với các Buff khác nguồn (như `alpha_howl`). Stun vẫn chặn tấn công thường nhưng không đóng băng bộ đếm thời gian Buff. Wolf chết hoặc bị tiêu thụ cho Fusion thì tự mất Buff.

### 4.5. Inferno — Blaze (`inferno`)

- **Mục tiêu thiết kế:** Sát thương lửa diện rộng xuyên giáp cùng Lane kết hợp thiêu đốt theo thời gian.
- **Hiệu ứng xác nhận:** Gây ngay **`3× Attack Damage` hệ Fire** (`armorPiercing: true`, chịu `Fire Resistance`) và gắn **Burn `25% Attack Damage/giây` trong `5` giây** (`1 tick/giây`, `damageType: 'fire'`) cho toàn bộ Enemy đang có mặt trên **cùng Lane**.
- **Điều kiện & Quy tắc:** `requiresTarget: true`. Sát thương Burn snapshot Attack Damage hiện tại của Blaze lúc gắn/làm mới; đòn hit hợp lệ có sát thương sau giảm trừ bằng `0` vẫn confirm hit và gắn Burn. Cùng nguồn làm mới thời gian/tick; khác nguồn nhảy sát thương độc lập. Burn tiếp tục tồn tại sau khi Blaze chết/Fusion hoặc mục tiêu đổi Lane.

## 5. Special Abilities của 7 Fusion Defenders (`Confirmed`)

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

### 5.4. Wildfire Rush — Flame Fang (`wildfire_rush`)

- **Mục tiêu thiết kế:** Xả chuỗi đòn cận chiến nhanh tại chỗ và thiêu đốt mục tiêu.
- **Hiệu ứng xác nhận:** Thực hiện **`5` đòn cận chiến đứng tại chỗ** (**chốt không lao tới / không dash**) cách nhau **`0.2` giây** trong tầm cận chiến. Mỗi đòn gây **`100%` Attack Damage hiện tại** (sát thương vật lý, snapshot tại thời điểm tung đòn) và khi trúng mục tiêu sẽ gắn **Burn `25% Attack Damage/giây` trong `5` giây** (`1 tick/giây`, hệ Fire).
- **Điều kiện & Quy tắc:** `requiresTarget: true` (yêu cầu Enemy trong tầm cận chiến). Mỗi nhịp đánh retarget lại mục tiêu hợp lệ; Stun tạm dừng cadence giữ nguyên thời gian chờ còn lại (`FR3`); chết/Fusion hoặc hết mục tiêu trong tầm sẽ hủy các đòn chưa tung.

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
  **`Armor / Fire Resistance` → `Redirect (Iron Bastion)` → `Shield (Oldest-First)` → `HP`**
  - Cờ `armorPiercing: true` bỏ qua `Armor`; `shieldPiercing: true` bỏ qua `Shield`.
  - Đòn hợp lệ có sát thương sau giảm trừ bằng `0` vẫn trả về `hitConfirmed = true` để các hiệu ứng on-hit (như `Burn`) vẫn gắn bình thường.
- **Status Identity & Làm mới (`FR1`):** Khóa định danh `(targetEntityId, sourceEntityId, abilityId, kind)`. Tái áp dụng cùng khóa giữ nguyên `statusId`, tăng `version++` và làm mới thời lượng (kèm snapshot mới với `Burn`).
- **Chồng hiệu ứng (`D-63`):**
  - `slow`: lấy mức mạnh nhất (`max(slowPct)`).
  - `stun` / `freeze`: hiệu lực khi còn ít nhất `1` instance hoạt động; `freeze` kiểm tra `freezeImmune` và rút ngắn theo `1 - freezeResistancePct`.
  - `burn`: nhảy sát thương hệ Fire mỗi `1.0s` Game Time; các nguồn khác nhau nhảy độc lập.
  - `buff`: các nguồn khác nhau (`pack_frenzy`, từng `alpha_howl`) cộng dồn tuyến tính trên chỉ số gốc (`baseDamage`, `baseAttackSpeed`).
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
