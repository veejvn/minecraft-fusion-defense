# Gameplay Mechanics

# Minecraft Fusion Defense

**Document status:** Draft v1.0  
**Project:** Minecraft Fusion Defense  
**Related document:** `GDD.md`

**Source:** [Gameplay Mechanics — Notion](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660)  
**Confirmed decisions:** 02/11/2026  
**Decision status:** Confirmed = quyết định được chủ dự án xác nhận; ưu tiên baseline 03/11/2026 cho các điểm được thay thế; Proposed = đề xuất chưa được phê duyệt; TBD = chưa xác định. Trạng thái Draft của tài liệu không làm thay đổi các quyết định Confirmed.

---

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Overview

### 1.1. Purpose

Tài liệu này định nghĩa các cơ chế gameplay cốt lõi của Minecraft Fusion Defense, bao gồm:

- Battlefield và Grid System.
- Defender Placement.
- Energy System.
- Power Crystal System.
- Enemy Movement.
- Combat System.
- Fusion System.
- Wave System.
- Game State.
- Victory và Defeat Conditions.
- Player Interaction.

Đây là tài liệu tham chiếu cho quá trình triển khai Game Systems bằng Phaser 3 và TypeScript.

### 1.2. Core Gameplay Loop

```txt
             START LEVEL
                  |
                  v
            INITIAL SETUP
                  |
                  v
          ENERGY GENERATION
                  |
                  v
          COLLECT ENERGY ITEMS
                  |
                  v
          SUMMON DEFENDERS
                  |
                  v
            FUSION UNITS
                  |
                  v
            COMBAT PHASE
                  |
                  v
          ACTIVATE SPECIAL ABILITY
                  |
                  v
             WAVE CHECK
              /       \
          ACTIVE     COMPLETED
            |            |
            |            v
            |        NEXT WAVE
            |            |
            +------------+
                  |
                  v
             LEVEL RESULT
              /       \
          VICTORY     DEFEAT
```

---

## 2. Battlefield System

### 2.1. Battlefield Layout

Chiến trường sử dụng góc nhìn Side-view, được chia thành Grid 5 hàng × 9 cột.

| Property | Value |
| --- | --- |
| Rows | 5 |
| Columns | 9 |
| Total Cells | 45 |
| Perspective | Side-view |
| Enemy Spawn Direction | Right |
| Enemy Movement Direction | Right to Left |
| Defender Placement | Grid-based |
| Enemy Movement | Lane-based |

### 2.2. Grid Coordinates

Mỗi ô Grid có một tọa độ duy nhất:

- Row: Từ 0 đến 4.
- Column: Từ 0 đến 8.

Quy ước:

- `(0, 0)` là ô trên cùng bên trái.
- `(4, 8)` là ô dưới cùng bên phải.
- Mỗi ô chỉ được chứa tối đa một Defender.
- Enemy không chiếm Grid Cell như Defender mà di chuyển liên tục theo Lane.

Ví dụ:

```txt
          COLUMN
       0 1 2 3 4 5 6 7 8
     +-------------------+
 R 0 | . . . . . . . . . |
 O 1 | . . . . . . . . . |
 W 2 | . . . . . . . . . |
   3 | . . . . . . . . . |
   4 | . . . . . . . . . |
     +-------------------+

. = Empty Cell
```

**Trạng thái cần xác nhận:** phần này giữ nguyên quy ước index 0-based của Gameplay Mechanics. Level Design mục 3.1 gọi cùng quy ước là Draft kỹ thuật; chưa thống nhất trạng thái phê duyệt, không tạo quy ước tọa độ khác.

### 2.3. Grid Cell States

Mỗi Grid Cell có một trong các trạng thái:

| State | Description |
| --- | --- |
| Empty | Ô trống |
| Occupied | Đang chứa Defender |
| Dragging | Đang được sử dụng trong thao tác kéo thả |
| Fusion Target | Được chọn làm vị trí nhận Fusion |

Các trạng thái tương tác như Dragging và Fusion Target có thể được quản lý riêng với trạng thái chiếm chỗ thực tế của Grid.

### 2.4. Grid Rules

1. Defender chỉ được đặt vào Grid Cell hợp lệ.
2. Không cho phép hai Defender cùng chiếm một ô.
3. Defender không tự động di chuyển giữa các ô.
4. Defender bị loại khỏi Grid khi chết hoặc Fusion thành công.
5. Fusion Defender được đặt vào ô của Target Defender.
6. Khi Defender bị loại bỏ, Grid Cell tương ứng trở thành Empty.

### 2.5. Lane System

Mỗi hàng Grid tương ứng với một Lane.

- Có tổng cộng 5 Lane.
- Enemy chỉ di chuyển trong Lane của nó.
- Defender mặc định chỉ tấn công Enemy cùng Lane.
- Những Ability đặc biệt có thể tác động đến nhiều Lane hoặc toàn bộ chiến trường.

Quy tắc tấn công chéo Lane phải được khai báo rõ trong định nghĩa Ability hoặc Entity, không tự động áp dụng cho mọi Defender.

---

## 3. Defender Placement System

### 3.1. Defender Selection

Người chơi lựa chọn Defender từ Defender Selection Bar.

Mỗi Defender trong danh sách lựa chọn hiển thị:

- Icon hoặc Sprite.
- Tên Defender.
- Energy Cost.
- Trạng thái có thể triệu hồi.
- Thời gian hồi chiêu nếu Defender có Cooldown.

### 3.2. Summoning Rules

Để triệu hồi một Defender:

1. Người chơi chọn Defender.
2. Hệ thống kiểm tra Energy hiện tại.
3. Người chơi chọn một Grid Cell.
4. Hệ thống kiểm tra ô có hợp lệ và đang trống hay không.
5. Hệ thống kiểm tra điều kiện triệu hồi khác nếu có.
6. Nếu hợp lệ, trừ Energy và tạo Defender tại Grid Cell.
7. Phát hiệu ứng triệu hồi.

Nếu không hợp lệ:

- Không trừ Energy.
- Không tạo Defender.
- Hiển thị phản hồi phù hợp.

### 3.3. Summoning Validation

Một yêu cầu triệu hồi chỉ thành công khi:

`IsDefenderAvailable` bao gồm trạng thái unlock/availability. Initial unlocked Base Defenders còn Product Design TBD; không mặc định mở toàn bộ năm loại.

```txt
HasEnoughEnergy
    AND
IsValidGridCell
    AND
IsCellEmpty
    AND
IsDefenderAvailable
```

### 3.4. Defender Lifecycle

```txt
AVAILABLE
    |
    v
SUMMONING
    |
    v
ACTIVE
    |
    +----------+
    |          |
    v          v
FUSION      TAKING DAMAGE
    |          |
    v          v
REMOVED     DEAD / ACTIVE
               |
               v
             REMOVED
```

Defender có thể bị loại khỏi chiến trường khi:

- HP bằng 0.
- Được sử dụng làm đầu vào cho Fusion thành công.
- Bị loại bỏ bởi một cơ chế gameplay đặc biệt trong tương lai.

---

## 4. Energy System

### 4.1. Overview

Energy dùng Summon; Fusion không kiểm tra hoặc tiêu hao Energy/Power Crystal.

**Confirmed — 03/11/2026:**

| Parameter | Giá trị |
| --- | --- |
| Initial Energy | 0 |
| Energy tại gameplay t=0 | +50 ngay lập tức, cộng trực tiếp |
| Passive Energy | +50 mỗi 3 giây Game Time sau t=0, cộng trực tiếp |
| Energy Cap | Unlimited |
| Initial Power Crystal | 0 |
| Power Crystal Cap | 5 |
| Energy Item Lifetime | 10 giây Game Time |
| Power Crystal Item Lifetime | 10 giây Game Time |

Pause dừng các timer Game Time và không cho collect/claim tài nguyên.

Energy còn nhận từ Enemy death trực tiếp và Energy Items click-to-collect. Passive Energy là direct credit, không spawn Item.

### 4.2. Automatic Energy Generation

**Confirmed — 03/11/2026:** initial Energy 0; cộng trực tiếp +50 ngay t=0 khi gameplay bắt đầu, sau đó +50 mỗi 3 giây Game Time. Pause dừng timer, Resume tiếp tục; không sinh tiếp sau terminal result. Energy storage Unlimited.

Tên field, scheduler/tick implementation còn TBD; không tự biến +50 mỗi 3 giây thành giá trị cộng mỗi frame.

### 4.3. Energy Item Collection

Ngoài Energy tự sinh, người chơi có thể thu thập các vật phẩm Energy xuất hiện ngẫu nhiên trên chiến trường.

**Spawn Rules:**

- Energy Item xuất hiện tại các vị trí ngẫu nhiên hợp lệ trên Battlefield.
- Vị trí xuất hiện không bắt buộc phải nằm trên Grid Cell.
- Hệ thống phải đảm bảo vật phẩm không xuất hiện ngoài vùng chơi có thể tương tác.
- Vật phẩm không được xuất hiện tại vị trí gây cản trở nghiêm trọng cho thao tác của người chơi.

**Collection Rules:**

1. Hệ thống tạo Energy Item theo cấu hình Level.
2. Vật phẩm xuất hiện tại một vị trí ngẫu nhiên hợp lệ.
3. Người chơi click vào vật phẩm để thu thập.
4. Hệ thống kiểm tra vật phẩm còn tồn tại và chưa được thu thập.
5. Energy được cộng vào tài nguyên hiện tại.
6. Vật phẩm biến mất sau khi thu thập.

Mỗi Energy Item có thể có các thuộc tính:

| Property | Description |
| --- | --- |
| ID | Định danh vật phẩm |
| Energy Amount | Giá trị Energy |
| Spawn Position | Vị trí xuất hiện |
| Lifetime | 10 giây Game Time — Confirmed |
| Spawn Condition | Điều kiện xuất hiện |

### 4.4. Energy Limit

**Confirmed — 03/11/2026:** Energy Unlimited, không có giới hạn storage trong Functional MVP. Mô tả cũ về Maximum Energy và bỏ Energy vượt cap không còn áp dụng. Không collect Energy Item trong Pause; lifetime 10 giây Game Time và timer dừng khi Pause.

### 4.5. Energy Spending

Energy được sử dụng cho:

- Summoning Defender.

Fusion miễn phí; không có kiểm tra, trừ hoặc hoàn Energy cho Fusion.

Mỗi thao tác tiêu tài nguyên phải được kiểm tra và thực hiện một cách nguyên tử để tránh trường hợp trừ tài nguyên nhiều lần khi có thao tác liên tục.

---

## 5. Power Crystal System

### 5.1. Overview

Power Crystal là tài nguyên sử dụng để kích hoạt Special Ability của Defender.

Mỗi Defender hoặc Fusion Defender được đưa vào MVP phải có một Special Ability được định nghĩa.

### 5.2. Power Crystal Resource

**Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.

Nguồn: Wave Reward, Enemy death Crystal Items và random spawn độc lập.

| Enemy | Energy khi chết (cộng trực tiếp) | Power Crystal khi chết (tạo Item) |
| --- | --- | --- |
| Zombie | 50 | 0 |
| Husk | 100 | 0 |
| Spider | 150 | 1 |
| Pillager | 200 | 1 |

**Confirmed:** Crystal reward tạo Item tại vị trí Enemy chết, kể cả khi storage đã đầy; mỗi Crystal được thưởng tạo một collectible Item. Các reward là integer không âm được cấu hình riêng trong Enemy Definition.

**Confirmed:** random Power Crystal spawn độc lập: attempt đầu sau ngẫu nhiên 30–60 giây Game Time; mỗi attempt kế tiếp cách ngẫu nhiên 30–60 giây. Mỗi attempt thành công tạo một Item trị giá 1 Crystal tại cell ngẫu nhiên không có Defender; không có cell hợp lệ thì bỏ qua attempt. Không có cap riêng cho số Item cùng tồn tại; nhiều Item được phép trùng cell. Summon lên cell có Item được phép: auto-collect oldest-first đến giới hạn storage, Item dư giữ timer gốc; Item còn lại sau khi Defender bị loại bỏ. Click Item được ưu tiên hơn click Defender.

### 5.3. Ability Activation

Quy trình kích hoạt:

1. Người chơi chọn Defender đang hoạt động.
2. Người chơi chọn Special Ability.
3. Hệ thống kiểm tra Defender còn tồn tại.
4. Hệ thống kiểm tra Ability có khả dụng hay không.
5. Hệ thống kiểm tra Power Crystal hiện tại.
6. Nếu hợp lệ, yêu cầu kích hoạt Ability theo transaction contract (Power Crystal spend/commit timing và rollback vẫn TBD, chưa được phê duyệt).
7. Áp dụng Ability Effect khi transaction hợp lệ theo contract đã được duyệt.
8. Phát Animation và VFX tương ứng; không tự suy diễn thời điểm trừ tài nguyên.

**Coding Planning TBD:** Power Crystal spend timing, Effect Commit và rollback/refund chưa được phê duyệt. Sơ đồ kích hoạt ở trên chỉ là thứ tự conceptual, không quy định kỹ thuật trừ tài nguyên hay commit. Ability Catalog mục 6/checklist vẫn giữ mô tả giao dịch Draft; không dùng mô tả đó để tự chốt contract.

### 5.4. Ability Validation

Một Ability chỉ được kích hoạt khi:

```txt
GameState == PLAYING
    AND
Defender.IsAlive
    AND
Ability.IsAvailable
    AND
Player.HasEnoughPowerCrystal
    AND
TargetIsValid
```

`TargetIsValid` chỉ bắt buộc với Ability yêu cầu mục tiêu.

### 5.5. Ability Effects

Ability có thể tạo ra những hiệu ứng:

- Direct Damage.
- Area Damage.
- Damage Over Time.
- Slow.
- Freeze.
- Attack Speed Buff.
- Damage Buff.
- Healing.
- Shield.
- Multi-target Attack.

Không phải Ability nào cũng cần tất cả hiệu ứng trên.

### 5.6. Cooldown

Ability có thể có Cooldown riêng.

Cooldown được cấu hình trong Ability Definition.

Trong thời gian Cooldown:

- Không cho phép kích hoạt Ability.
- UI hiển thị thời gian còn lại.
- Khi Cooldown kết thúc, Ability trở lại trạng thái Available.

Chi phí Power Crystal và Cooldown là hai cơ chế độc lập.

### 5.7. Power Crystal Item Collection

Mỗi Power Crystal Item có ID, amount, spawn position, spawn condition và **lifetime 10 giây Game Time**. Item từ random attempt trị giá 1 Crystal; mỗi Crystal Enemy reward tạo Item tại vị trí Enemy chết.

Quy trình:

1. Tạo Item kể cả khi storage đầy; nhiều Item có thể đồng thời tồn tại/trùng cell.
2. Click Item được ưu tiên hơn click Defender.
3. Chỉ collect khi Playing, Item chưa bị collect/hết hạn và storage còn sức chứa.
4. Storage đầy: Item không được thu, vẫn ở sân và timer không reset.
5. Collect hợp lệ cộng tài nguyên đúng một lần rồi loại Item.
6. Trong Pause, không collect; Game Time timer dừng.
7. Summon trên cell có Item được phép; auto-collect oldest-first trong sức chứa, Item dư giữ timer gốc. Item còn lại sau khi Defender bị loại bỏ.

### 5.8. Power Crystal Resource Rules

**Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.

- Energy và Power Crystal độc lập; không dùng Crystal cho Fusion.
- Không cộng trùng Item hoặc Wave Reward.
- Wave Reward chỉ cộng trực tiếp đến cap 5; phần vượt cap vào Pending Wave Reward, không bị bỏ ngay.
- Người chơi claim pending thủ công từng phần theo sức chứa; pending không có cap riêng, không claim trong Pause.
- Victory/Defeat hủy pending. Chính sách Ability spend/commit/rollback vẫn TBD; không đồng nhất với collect/claim tài nguyên.

---

## 6. Enemy Movement System

### 6.1. Enemy Spawn

Enemy xuất hiện từ phía bên phải của Battlefield.

Mỗi Enemy thuộc một Lane cụ thể.

Spawn Position được xác định dựa trên:

- Lane Index.
- Enemy Spawn Offset.
- Kích thước Battlefield.
- Cấu hình Spawn Group.

### 6.2. Movement Rules

- Enemy di chuyển từ phải sang trái.
- Enemy mặc định giữ nguyên Lane khi di chuyển.
- Movement Speed được xác định bởi Enemy Definition.
- Enemy có thể bị ảnh hưởng bởi Slow, Freeze và các Status Effect khác.
- Enemy không được tự động đi qua ranh giới Lane, trừ khi có Ability hoặc cơ chế đặc biệt.

### 6.3. Enemy-Defender Interaction

Enemy có thể tương tác với Defender khi tiến vào vùng ảnh hưởng của Defender trên cùng Lane.

**Enemy Behavior được xác định theo từng loại Enemy.**

Không phải tất cả Enemy đều phải dừng lại để tấn công Defender.

Các nhóm hành vi chính:

| Behavior | Description |
| --- | --- |
| Stop and Attack | Dừng di chuyển khi gặp Defender và tấn công cho đến khi mục tiêu bị tiêu diệt hoặc điều kiện hành vi thay đổi |
| Ignore Defender | Bỏ qua Defender và tiếp tục di chuyển về phía căn cứ |
| Special Behavior | Sử dụng hành vi riêng được định nghĩa cho từng Enemy |

**Proposed:** ví dụ định hướng, chưa xác nhận hành vi cụ thể:

- Zombie có thể dừng lại và tấn công Defender.
- Spider có thể bỏ qua một số Defender hoặc sử dụng hành vi di chuyển đặc biệt.
- Một số Enemy trong tương lai có thể phá hủy chướng ngại vật, nhảy qua Defender hoặc tấn công từ xa.

Các ví dụ trên chỉ là định hướng thiết kế. Hành vi chính thức của từng Enemy phải được xác nhận trong `ENTITY_CATALOG.md`.

### 6.4. Enemy Breach

Bất kỳ Enemy nào vượt Base Boundary đều phát sinh Defeat event; không dùng Base Health/Lives.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Khi Defeat là terminal event được resolve trước: chuyển Defeat, dừng spawn/combat/resource generation, khóa gameplay và hiển thị kết quả. Không áp dụng blanket Defeat priority khi cùng tick có Victory.

**Confirmed Enemy death rewards:**

| Enemy | Energy khi chết (cộng trực tiếp) | Power Crystal khi chết (tạo Item) |
| --- | --- | --- |
| Zombie | 50 | 0 |
| Husk | 100 | 0 |
| Spider | 150 | 1 |
| Pillager | 200 | 1 |

**Confirmed:** Crystal reward tạo Item tại vị trí Enemy chết, kể cả khi storage đã đầy; mỗi Crystal được thưởng tạo một collectible Item. Các reward là integer không âm được cấu hình riêng trong Enemy Definition.

### 6.5. Movement Status Effects

Enemy có thể chịu các Status Effect:

| Effect | Description |
| --- | --- |
| Slow | Giảm Movement Speed |
| Freeze | Tạm thời ngăn Enemy di chuyển |
| Burn | Gây sát thương theo thời gian |
| Stun | Tạm thời vô hiệu hóa hành động |
| Vulnerable | Nhận thêm sát thương |

Status Effect có thể có Duration, Stack Rule và các thông số riêng.

### 6.6. Enemy Behavior Configuration

Mỗi Enemy cần có thông tin xác định hành vi tương tác với Defender.

Các thuộc tính có thể bao gồm:

| Property | Description |
| --- | --- |
| Interaction Behavior | Kiểu tương tác với Defender |
| Can Attack Defender | Có thể tấn công Defender hay không |
| Can Ignore Defender | Có thể bỏ qua Defender hay không |
| Attack Range | Phạm vi tấn công |
| Attack Cooldown | Khoảng thời gian giữa các lần tấn công |
| Movement Behavior | Quy tắc di chuyển |
| Special Behavior | Hành vi đặc biệt |

Các thuộc tính này phải được thiết kế theo hướng data-driven để có thể mở rộng mà không cần thay đổi logic cốt lõi của Enemy System.

---

## 7. Combat System

### 7.1. Overview

Combat System chịu trách nhiệm xử lý tương tác chiến đấu giữa Defender và Enemy.

Các thành phần chính:

- Target Detection.
- Target Selection.
- Attack Execution.
- Damage Calculation.
- Health Management.
- Status Effects.
- Death Handling.

### 7.2. Defender Attack

Defender có thể tấn công Enemy theo các điều kiện:

1. Defender còn sống.
2. Defender không bị vô hiệu hóa hành động.
3. Có Enemy hợp lệ trong phạm vi.
4. Enemy thuộc Lane hợp lệ, trừ khi có cơ chế tấn công nhiều Lane.
5. Attack Cooldown đã hoàn thành.

### 7.3. Target Selection

**Confirmed — 02/11/2026:** mỗi Defender có Targeting Strategy riêng; lựa chọn cụ thể cho từng Defender vẫn là TBD.

Không áp dụng một quy tắc Target Selection cố định cho toàn bộ Defender.

Các kiểu Target Selection có thể bao gồm:

| Targeting Strategy | Description |
| --- | --- |
| Closest to Base | Ưu tiên Enemy gần căn cứ nhất |
| Closest to Defender | Ưu tiên Enemy gần Defender nhất |
| Highest HP | Ưu tiên Enemy có HP cao nhất |
| Lowest HP | Ưu tiên Enemy có HP thấp nhất |
| Fastest Enemy | Ưu tiên Enemy có Movement Speed cao nhất |
| Highest Threat | Ưu tiên Enemy có mức độ đe dọa cao nhất |
| First Valid Target | Chọn mục tiêu hợp lệ đầu tiên theo thứ tự xác định |

Các chiến lược trên là những lựa chọn có thể sử dụng, không bắt buộc mọi Defender phải có tất cả chiến lược.

### 7.4. Attack Types

Các kiểu tấn công dự kiến:

| Attack Type | Description |
| --- | --- |
| Melee | Tấn công cận chiến |
| Projectile | Bắn đạn hoặc vật thể |
| Area | Gây sát thương trong khu vực |
| Beam | Tấn công theo tia |
| Special | Cơ chế tấn công riêng |

### 7.5. Damage Calculation

Công thức cơ bản:

```txt
Final Damage = Base Damage × Damage Modifiers
```

Các yếu tố có thể ảnh hưởng:

- Defender Damage.
- Enemy Defense.
- Buff.
- Debuff.
- Critical Hit (future feature).
- Ability Modifiers.

MVP có thể sử dụng công thức đơn giản, chưa cần Critical Hit hoặc hệ thống phòng thủ phức tạp.

### 7.6. Attack Speed

Attack Speed xác định khoảng thời gian giữa hai lần tấn công.

```txt
Attack Interval = 1000 / Attack Speed
```

Trong đó:

- Attack Speed: Số lần tấn công mỗi giây.
- Attack Interval: Thời gian giữa hai lần tấn công, tính bằng milliseconds.

Ví dụ: Nếu Attack Speed là 2 attacks/second thì Attack Interval là 500 ms.

### 7.7. Projectile System

Projectile được sử dụng bởi các Defender tấn công tầm xa.

Một Projectile có thể chứa:

- Position.
- Direction.
- Speed.
- Damage.
- Target.
- Collision Radius.
- Hit Effects.

Projectile phải được loại bỏ khi:

- Va chạm mục tiêu.
- Ra khỏi vùng gameplay hợp lệ.
- Hết Lifetime.
- Trận đấu kết thúc.

### 7.8. Enemy Attack

Enemy có thể tấn công Defender khi tiếp cận mục tiêu phù hợp.

Quy tắc mặc định:

- Enemy chỉ tấn công Defender trong cùng Lane.
- Enemy sử dụng Attack Range và Attack Cooldown của chính nó.
- Defender nhận sát thương khi Enemy Attack thành công.
- Defender bị loại khỏi Grid khi HP bằng 0.
- Enemy tiếp tục di chuyển sau khi mục tiêu bị loại bỏ.

Enemy có thể có những kiểu tấn công đặc biệt tùy theo Entity Definition.

### 7.9. Health Management

Mỗi Entity có HP.

Quy tắc:

```txt
Current HP <= 0
        |
        v
Entity State = DEAD
        |
        v
Remove From Combat
        |
        v
Cleanup Entity
```

Khi Enemy chết:

- Ngừng mọi hành động.
- Không tiếp tục gây sát thương.
- Không còn là mục tiêu hợp lệ.
- Phát Death Animation.
- Trao Reward nếu có.
- Loại bỏ khỏi hệ thống sau khi hoàn thành hiệu ứng cần thiết.

Khi Defender chết:

- Ngừng mọi hành động.
- Không còn được sử dụng làm Fusion Input.
- Giải phóng Grid Cell.
- Phát Death Animation.
- Loại bỏ khỏi hệ thống sau khi hoàn thành hiệu ứng cần thiết.

### 7.10. Targeting Rules

Mỗi Defender cần có Targeting Configuration riêng.

Target Selection phải xét đến:

- Enemy còn sống.
- Enemy nằm trong Attack Range.
- Enemy thuộc Lane hoặc vùng tấn công hợp lệ.
- Enemy không bị loại khỏi Combat System.
- Các điều kiện đặc biệt của Defender.

Một số Ability có thể sử dụng Targeting Strategy khác với đòn tấn công thông thường.

### 7.11. Target Re-evaluation

Defender cần đánh giá lại mục tiêu khi:

- Target hiện tại bị tiêu diệt.
- Target rời khỏi Attack Range.
- Target không còn hợp lệ.
- Target chuyển sang trạng thái không thể bị tấn công.
- Có Enemy khác phù hợp hơn theo quy tắc Targeting của Defender.

Không nhất thiết phải tìm lại mục tiêu ở mọi frame. Hệ thống có thể sử dụng sự kiện hoặc khoảng thời gian kiểm tra phù hợp để tối ưu hiệu năng.

---

## 8. Fusion System

### 8.1. Overview

Fusion kết hợp hai Defender còn sống theo Recipe được phê duyệt. MVP ban đầu có đúng 5 Base Defenders và 6 công thức Tier-1 + Tier-1 → Tier-2 trong `ENTITY_CATALOG.md` / `FUSION_RECIPES.md`.

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

Fusion miễn phí: **0 Energy, 0 Power Crystal**. Không kiểm tra, trừ hoặc hoàn tài nguyên. Triệu hồi hai Defender đầu vào vẫn tốn Energy bình thường.

Không giới hạn khoảng cách, kề nhau hoặc Lane. Source và Target có thể nằm ở hai góc đối diện của Battlefield 5 × 9. Đây là cơ chế chiến thuật trọng tâm của trò chơi.

### 8.2. Fusion Interaction

Fusion được thực hiện bằng thao tác Drag and Drop.

Quy trình:

1. Người chơi nhấn vào Defender A.
2. Kéo Defender A đến Defender B.
3. Defender B được xác định là Target.
4. Hệ thống kiểm tra Fusion Recipe.
5. Hệ thống kiểm tra hai instance còn sống, Tier khớp Recipe, không bị Lock và ô Grid hợp lệ.
6. Hệ thống thực hiện Fusion nếu hợp lệ.
7. Tạo Fusion Defender mới tại Grid Cell của Defender B.
8. Phát Fusion Animation.

### 8.3. Source and Target

Hai Defender có vai trò riêng trong quá trình Fusion:

| Role | Description |
| --- | --- |
| Source Defender | Defender được người chơi kéo đi |
| Target Defender | Defender mà Source được thả lên |

**Fusion Placement Rule:**

Fusion Defender luôn xuất hiện tại vị trí ban đầu của Target Defender.

Ví dụ:

```txt
Initial Grid:

Iron Golem              Snow Golem
(2, 3)                  (2, 5)

     DRAG -----------------> DROP
                                  |
                                  v

After Fusion:

                          Frost Guardian
                            (2, 5)
```

Nếu người chơi kéo Snow Golem lên Iron Golem, kết quả vẫn là Frost Guardian và xuất hiện tại ô của Iron Golem.

Vị trí đầu ra phụ thuộc vào Target, không phụ thuộc thứ tự của Recipe.

### 8.4. Fusion Recipe Validation

Hệ thống kiểm tra:

- Game State là Playing.
- Source Defender và Target Defender tồn tại, còn sống và là hai instance riêng biệt.
- Cả hai có Tier/IDs tương thích Recipe được phê duyệt, không bị Lock và đang ở trạng thái cho phép Fusion. Nội dung hiện tại chỉ có sáu Recipe Tier-1 + Tier-1 → Tier-2; engine không có Tier ceiling.
- Có Recipe được phê duyệt, đang bật và đã unlock; nội dung initial là sáu Recipe MVP. Danh sách Recipe unlock sẵn vẫn Product Design TBD.
- Source và Target vẫn chiếm đúng ô Grid hợp lệ.

Không kiểm tra Energy, Power Crystal, khoảng cách, kề nhau hoặc cùng Lane.

### 8.5. Recipe Matching

**Confirmed:** mọi Recipe trong MVP không phân biệt thứ tự đầu vào.

Ví dụ:

```txt
Iron Golem + Snow Golem
Snow Golem + Iron Golem
```

Hai trường hợp trên được xem là cùng một công thức.

Recipe Matching cần sử dụng định danh Entity ổn định thay vì so sánh tên hiển thị.

### 8.6. Fusion Execution

Fusion phải được xử lý như một thao tác logic nguyên tử:

1. Validate Fusion Request và Game State.
2. Lock hai Defender tham gia để tránh thao tác đồng thời.
3. Xác nhận lại Recipe, Tier, trạng thái sống và Grid Occupancy.
4. Lưu ô Grid ban đầu của Target.
5. Loại bỏ hai Defender đầu vào, giải phóng ô Source và tạo Fusion Defender tại ô Target một cách nguyên tử.
6. Đăng ký output vào Combat/Ability Systems, phát `fusion:completed` và Animation.
7. Hoàn thành Fusion và giải phóng Lock; khi thất bại, giữ nguyên hoặc rollback Entity/Grid, phát `fusion:failed` và phản hồi cho người chơi.

Không kiểm tra, trừ hoặc hoàn tài nguyên. Không được tạo output trùng, làm mất Defender khi thất bại, hoặc sử dụng một Defender trong nhiều Fusion cùng lúc.

### 8.7. Fusion Failure

Fusion thất bại khi:

- Không có Recipe phù hợp đã được phê duyệt, đang bật và đã unlock.
- Source hoặc Target không hợp lệ, đã chết, bị Lock hoặc Input IDs/Tiers không khớp Recipe được phê duyệt. Tier-1 là yêu cầu của sáu Recipe ban đầu, không phải hard engine ceiling; higher-tier inputs chỉ hợp lệ khi có Recipe tương ứng được phê duyệt trong tương lai.
- Source và Target là cùng một instance.
- Grid Occupancy không còn hợp lệ.
- Trận đấu không ở trạng thái Playing.

Không có lỗi `INSUFFICIENT_ENERGY` cho Fusion. Energy bằng 0 hoặc khác Lane/khoảng cách xa không làm Fusion thất bại.

Khi thất bại, không tiêu hao Energy/Power Crystal, không xóa Defender và không thay đổi Grid Occupancy; hiển thị phản hồi cho người chơi.

### 8.8. Fusion Output

Fusion Defender có:

- Entity ID riêng.
- HP riêng.
- Damage riêng.
- Attack Speed riêng.
- Range riêng.
- Role riêng.
- Special Ability riêng.
- Fusion Tier riêng.

Không cộng trực tiếp toàn bộ chỉ số của hai Defender đầu vào.

**Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.

### 8.9. Fusion Tier

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

Tier và Recipe matching dùng data definitions; không hardcode điều kiện `inputTier === 1` ở engine cho mọi Recipe. Tier cao hơn không có Recipe được duyệt hiện tại phải bị từ chối vì thiếu approved Recipe, không vì hard Tier ceiling.

---

## 9. Wave System

### 9.1. Overview

Wave System điều khiển quá trình xuất hiện Enemy trong một Level.

Mỗi Level có một danh sách Wave được cấu hình sẵn.

### 9.2. Wave Structure

Một Wave bao gồm:

| Property | Description |
| --- | --- |
| Wave ID | Định danh Wave |
| Spawn Groups | Danh sách nhóm Enemy |
| Enemy Type | Loại Enemy |
| Enemy Count | Số lượng Enemy |
| Spawn Interval | Khoảng cách giữa các lần Spawn |
| Initial Delay | Thời gian chờ trước khi Spawn |
| Reward | Phần thưởng sau Wave |
| Completion Condition | Điều kiện hoàn thành |

### 9.3. Spawn Group

Một Spawn Group mô tả một nhóm Enemy sẽ xuất hiện trong Wave.

Ví dụ:

```txt
Wave 1
  |
  +-- Group 1
  |     +-- Zombie x 3
  |     +-- Spawn Interval: configurable
  |
  +-- Group 2
        +-- Zombie x 2
        +-- Spider x 1
```

### 9.4. Wave Progression

Độ khó tăng dần thông qua:

- Số lượng Enemy.
- HP của Enemy.
- Movement Speed.
- Thành phần Enemy.
- Spawn Interval.
- Sự kết hợp giữa Enemy thông thường và Enemy đặc biệt.

### 9.5. Wave Completion

Một Wave hoàn thành khi:

1. Tất cả Spawn Groups đã được xử lý.
2. Không còn Enemy đang hoạt động trên chiến trường.
3. Không có điều kiện Defeat xảy ra.

Sau khi Wave hoàn thành:

- Trao phần thưởng nếu có.
- Cập nhật Wave Progress.
- Chuyển sang Wave tiếp theo sau thời gian Delay được cấu hình.

### 9.6. Level Completion

Level hoàn thành khi:

- Tất cả Wave đã hoàn thành.
- Không còn Enemy đang hoạt động.
- Chưa có terminal event khác được resolve trước.

Khi đó tạo Victory event; kết quả phụ thuộc terminal event được resolve trước trong Event Queue.

---

## 10. Game State System

### 10.1. Main Game States

| State | Description |
| --- | --- |
| Loading | Tải tài nguyên |
| Ready | Chuẩn bị bắt đầu Level |
| Playing | Gameplay đang diễn ra |
| Paused | Gameplay tạm dừng |
| Victory | Người chơi chiến thắng |
| Defeat | Người chơi thất bại |

**Trạng thái cần xác nhận:** Loading/Ready vẫn Draft kỹ thuật theo Level Design; baseline không chốt tên enum, storage hoặc full transition contract.

### 10.2. State Transitions

```text
Loading/Ready (Draft) -> Playing <-> Paused
                          |
                  Event Queue resolution
                          |
              first terminal event resolved
                    /             \
                 Victory         Defeat
```

Loading/Ready vẫn Draft kỹ thuật; Playing ↔ Paused. Victory/Defeat là terminal results, không quay lại Playing trong cùng phiên.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

Khi terminal result được resolve: dừng simulation và hủy Pending Wave Reward. Save schema, save triggers và resume validation cụ thể vẫn TBD.

### 10.3. Pause Rules

Khi Game State chuyển sang Paused:

- Dừng Enemy Movement.
- Dừng Defender Attack.
- Dừng Projectile Movement.
- Dừng Energy Generation.
- Dừng Wave Spawn.
- Dừng Cooldown.
- Dừng Status Effect Duration.
- Dừng các gameplay timer.

UI bên ngoài game vẫn có thể hoạt động để người chơi tiếp tục hoặc thoát Level.

### 10.4. Game Over Rules

Khi Victory hoặc Defeat:

- Ngừng các gameplay systems.
- Ngừng Resource Generation.
- Ngừng Wave Spawn.
- Ngừng các hành động tương tác với Entity.
- Hiển thị kết quả Level.

Các hiệu ứng kết thúc trận đấu có thể được phép chạy riêng nếu không ảnh hưởng đến logic gameplay.

---

## 11. Player Interaction

### 11.1. Mouse Interaction

Desktop Web là nền tảng ưu tiên.

Các thao tác chính:

| Interaction | Action |
| --- | --- |
| Left Click | Chọn Defender hoặc UI Element |
| Drag and Drop | Đặt Defender hoặc Fusion |
| Click Energy Item | Thu thập Energy |
| Click Ability | Kích hoạt Special Ability bằng Power Crystal |
| Click Pause | Tạm dừng trận đấu |

### 11.2. Drag and Drop Rules

Hệ thống cần phân biệt:

- Drag Defender để Fusion.
- Drag Defender từ Selection Bar để triệu hồi.
- Click Defender để chọn hoặc xem thông tin.

Một thao tác Drag and Drop chỉ được xử lý khi có Source hợp lệ.

### 11.3. Invalid Interaction Feedback

Khi người chơi thực hiện thao tác không hợp lệ, hệ thống cần phản hồi rõ ràng.

Ví dụ:

- Không đủ Energy khi triệu hồi Defender (không áp dụng cho Fusion).
- Ô Grid đã có Defender.
- Không có Fusion Recipe.
- Không đủ Power Crystal.
- Ability đang Cooldown.
- Target không hợp lệ.

Không nên chỉ bỏ qua thao tác mà không có phản hồi.

---

## 12. Gameplay Timing and Performance

### 12.1. Time Management

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Game Time là nguồn thời gian cho movement, attack/cooldown, Wave spawning, Energy generation, resource Item lifetimes và status effects. Pause đóng băng timer và ngăn collect/claim. Không dùng thời gian render hoặc thời gian browser đóng như mặc định simulation time; resume/catch-up policy chưa được phê duyệt.

### 12.2. Fixed Timestep

Gameplay logic nên sử dụng Fixed Timestep để đảm bảo tính nhất quán.

Rendering được thực hiện theo vòng lặp của Phaser.

Không sử dụng tốc độ Rendering làm cơ sở trực tiếp cho mọi phép tính gameplay.

### 12.3. Game Performance

Mục tiêu:

- Rendering mục tiêu 60 FPS trên Desktop Web.
- Gameplay logic ổn định.
- Hạn chế tạo và hủy quá nhiều object không cần thiết.
- Quản lý Projectile và VFX hiệu quả.
- Sử dụng Object Pooling khi số lượng Entity hoặc hiệu ứng đủ lớn để mang lại lợi ích.

---

## 13. Balancing Parameters

Các thông số sau cần được cấu hình và điều chỉnh trong quá trình playtesting.

| Parameter | Description |
| --- | --- |
| Initial Energy | Energy ban đầu |
| Energy Generation Interval | Chu kỳ sinh Energy |
| Energy Generation Amount | Lượng Energy mỗi chu kỳ |
| Maximum Energy | Energy tối đa |
| Energy Item Amount | Giá trị vật phẩm |
| Energy Item Spawn Rate | Tần suất xuất hiện vật phẩm |
| Energy Item Lifetime | Thời gian tồn tại |
| Defender Cost | Chi phí triệu hồi |
| Power Crystal Cost | Chi phí Ability |
| Defender HP | Sinh lực Defender |
| Defender Damage | Sát thương Defender |
| Defender Attack Speed | Tốc độ tấn công |
| Defender Range | Tầm tấn công |
| Enemy HP | Sinh lực Enemy |
| Enemy Damage | Sát thương Enemy |
| Enemy Movement Speed | Tốc độ di chuyển |
| Enemy Spawn Interval | Khoảng cách Spawn |
| Wave Delay | Thời gian giữa các Wave |

Giá trị chính thức được quản lý trong các tài liệu thiết kế và dữ liệu game tương ứng.

---

## 14. Edge Cases and Validation

Các tình huống sau phải được xử lý:

### 14.1. Energy

- Energy tự sinh khi đạt Maximum Energy.
- Người chơi thu thập Energy Item khi đã đạt giới hạn.
- Energy Item hết Lifetime.
- Người chơi thực hiện nhiều thao tác triệu hồi liên tục.
- Game chuyển sang Paused khi Energy đang được tạo.

### 14.2. Grid

- Hai thao tác cùng đặt Defender vào một ô.
- Người chơi thả Defender ra ngoài Grid.
- Grid Cell trở nên không hợp lệ trong lúc Drag.
- Defender chết trong khi người chơi đang thao tác với nó.

### 14.3. Fusion

- Source và Target là cùng một Entity.
- Source hoặc Target chết trong quá trình Fusion.
- Không tồn tại Recipe.
- Energy bằng 0: Fusion vẫn hợp lệ nếu các điều kiện khác đạt.
- Khác Lane hoặc hai góc đối diện: Fusion vẫn hợp lệ nếu các điều kiện khác đạt.
- Tier-2/cao hơn làm input: kiểm tra approved Recipe. Hiện không có Recipe cấp cao được duyệt nên không tạo thêm output.
- Target Cell không còn hợp lệ.
- Game bị Pause trong lúc Drag and Drop.
- Người chơi thực hiện nhiều thao tác Fusion liên tục.

### 14.4. Combat

- Target chết ngay trước khi Projectile va chạm.
- Defender mất mục tiêu.
- Enemy bị tiêu diệt bởi nhiều đòn đánh cùng lúc.
- Enemy nhận nhiều Status Effect.
- Enemy bị Freeze trong khi đang di chuyển.
- Enemy tiến vào vùng căn cứ trong cùng thời điểm Wave hoàn thành.

### 14.5. Game State

- Người chơi Pause khi Wave đang Spawn.
- Người chơi thoát Level khi đang Playing.
- Enemy xâm nhập căn cứ khi đang có Victory condition.
- Ability được kích hoạt cùng thời điểm trận đấu kết thúc.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Terminal result đã resolve không bị terminal event tiếp theo thay đổi.

---

## 15. Acceptance Criteria

Gameplay Mechanics được xem là triển khai đúng khi đáp ứng các điều kiện:

### Battlefield

- [ ] Grid có đúng 5 hàng và 9 cột.
- [ ] Mỗi ô chỉ chứa tối đa một Defender.
- [ ] Enemy di chuyển theo Lane.
- [ ] Enemy xuất hiện từ phía bên phải và di chuyển sang trái.

### Defender

- [ ] Người chơi có thể triệu hồi Defender đã unlock theo điều kiện hợp lệ.
- [ ] Không thể triệu hồi nếu thiếu Energy.
- [ ] Không thể đặt hai Defender vào cùng một ô.
- [ ] Defender được quản lý theo trạng thái sống/chết.

### Energy

- [ ] Energy tự sinh theo thời gian.
- [ ] Energy Generation dừng khi Pause.
- [ ] Người chơi có thể thu thập Energy Item.
- [ ] Energy được cộng chính xác.
- [ ] Không thể sử dụng Energy vượt quá số lượng hiện có.

### Power Crystal

- [ ] Người chơi có thể kích hoạt Ability.
- [ ] Ability yêu cầu đủ Power Crystal.
- [ ] Ability có thể có Cooldown.
- [ ] Ability Effect được thực thi chính xác.
- [ ] Không thể kích hoạt Ability khi trận đấu đã kết thúc.

### Combat

- [ ] Defender có thể phát hiện và tấn công Enemy hợp lệ.
- [ ] Enemy có thể tấn công Defender theo quy tắc.
- [ ] HP được cập nhật chính xác.
- [ ] Entity chết được loại khỏi Combat System.
- [ ] Status Effect hoạt động theo cấu hình.

### Fusion

- [ ] Hỗ trợ Fusion cùng loại.
- [ ] Hỗ trợ Fusion khác loại.
- [ ] Recipe Matching không phụ thuộc thứ tự đầu vào.
- [ ] Fusion Defender xuất hiện tại ô Target Defender.
- [ ] Fusion không kiểm tra hoặc tiêu hao Energy/Power Crystal, kể cả khi Energy bằng 0.
- [ ] Fusion hoạt động xuyên Lane và giữa hai góc đối diện.
- [ ] Đúng sáu approved Recipe dùng năm Base Defenders; engine không có Tier ceiling, không tự thêm higher-tier content.
- [ ] Output 100% own Max HP, không inherited status effects và attack-ready khi có valid target.
- [ ] Fusion thất bại không làm mất Defender, Energy hoặc Power Crystal.
- [ ] Không thể sử dụng cùng một Defender trong nhiều Fusion đồng thời.

### Wave

- [ ] Wave Spawn đúng cấu hình.
- [ ] Wave chỉ hoàn thành khi hết Spawn Group và không còn Enemy.
- [ ] Phần thưởng được trao đúng thời điểm.
- [ ] Wave tiếp theo bắt đầu đúng quy tắc.
- [ ] Level Victory được xác định chính xác.

### Game State

- [ ] Pause dừng toàn bộ gameplay timers.
- [ ] Resume tiếp tục gameplay.
- [ ] Enemy xâm nhập căn cứ khiến người chơi thua ngay lập tức.
- [ ] Victory và Defeat là trạng thái kết thúc.
- [ ] Không thể tiếp tục gameplay sau khi trận đấu kết thúc.

---

## 16. Open Design Decisions

| Product Design / Coding Planning | TBD chưa được phê duyệt |
| --- | --- |
| Product Design | Initial Base Defenders/Recipes, Achievement criteria/rewards/unlock mapping, Fusion có bắt buộc để thắng |
| Coding Planning | HP/Damage/Attack Speed/Range/Move Speed/Summon Cost, Enemy behavior/targeting/collision |
| Coding Planning | Wave composition/count/spawn timing/Wave Reward amounts; Energy Item amount/spawn rate/position distribution |
| Coding Planning | Ability cost/cooldown/effects/area/commit/rollback; Pack Frenzy/Blizzard scope |
| Coding Planning | Tick duration, deterministic event generation ordering/edge cases, Save storage/schema/triggers/resume details |
| Coding Planning | Fusion interaction cooldown/animation/discovery UI; UI implementation, indexing/Loading-Ready approval |

Các tham số resource đã Confirmed ở mục 4/5, output Fusion ở mục 8, và terminal ordering ở mục 10/12 không còn TBD.

---

## 17. Related Documents

| Document | Purpose |
| --- | --- |
| `GDD.md` | Tổng quan thiết kế game |
| `MVP_SCOPE.md` | Phạm vi MVP |
| `ENTITY_CATALOG.md` | Định nghĩa Defender và Enemy |
| `FUSION_RECIPES.md` | Công thức Fusion |
| `ABILITY_CATALOG.md` | Định nghĩa Special Ability |
| `LEVEL_DESIGN.md` | Thiết kế Level và Wave |
| `GAME_BALANCING.md` | Cân bằng chỉ số |
| `TECHNICAL_ARCHITECTURE.md` | Kiến trúc hệ thống |
| `GAME_ENGINE_ARCHITECTURE.md` | Kiến trúc Game Engine |

---

## 18. Updated Design Decisions

Quyết định hiện hành ngày 03/11/2026 đã hợp nhất vào Energy, Power Crystal, Enemy Rewards, Fusion Output/Tier, Game State và Timing. Product scope, progression và persistence:

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

**Confirmed:** cả Base Defenders và Fusion Recipes có unlock qua Achievements/Challenges; bộ Defender ban đầu nhỏ, phần lớn Recipe bị khóa. Chỉ ghi nhận Achievement khi Victory; Defeat không tạo unlock mới và giữ unlock đã có. Grassland được replay nhưng sau lần hoàn thành đầu, replay không tạo thêm permanent unlock progress. Starter roster, Recipe mở sẵn, điều kiện/phần thưởng Achievement và Fusion có bắt buộc để thắng hay không vẫn TBD.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

UI click Item được ưu tiên hơn Defender; basic instructions English-only. Chi tiết UI vẫn TBD. Không coi các checklist nghiệm thu là đã chạy gameplay tests.

---

**End of Document**

**Document:** `GAMEPLAY_MECHANICS.md`  
**Project:** Minecraft Fusion Defense  
**Version:** 1.0
