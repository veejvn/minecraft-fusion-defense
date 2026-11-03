# Game Design Document (GDD)

# Minecraft Fusion Defense

**Document status:** Draft v1.0  
**Project name:** Minecraft Fusion Defense  
**Genre:** Tower Defense / Strategy  
**Platform:** Desktop Web  
**Game mode:** Single-player  
**Visual style:** 2D Pixel Art  
**Perspective:** Side-view  
**Target resolution:** 16:9  
**Primary language:** English-only UI, instructions and messages — Confirmed 03/11/2026

**Source:** [GDD — Notion](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a)  
**Confirmed decisions:** 02/11/2026  
**Decision status:** Confirmed = quyết định được chủ dự án xác nhận; ưu tiên baseline 03/11/2026 cho các điểm được thay thế; Proposed = đề xuất chưa được phê duyệt; TBD = chưa xác định. Trạng thái Draft của tài liệu không làm thay đổi các quyết định Confirmed.

---

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Game Overview

### 1.1. Game Concept

Minecraft Fusion Defense là một trò chơi Tower Defense 2D Pixel Art, lấy cảm hứng từ cơ chế phòng thủ theo làn của Plants vs. Zombies 2 và phong cách thế giới voxel của Minecraft.

Người chơi xây dựng hệ thống phòng thủ bằng cách triệu hồi các Defender lên chiến trường, kết hợp những Defender để tạo ra các đơn vị Fusion mạnh hơn, sử dụng Power Crystal để kích hoạt kỹ năng đặc biệt và ngăn chặn các đợt Enemy tiến đến căn cứ.

Điểm khác biệt cốt lõi của trò chơi là **Fusion System**: người chơi không chỉ bố trí Defender mà còn phải suy nghĩ về cách kết hợp chúng để tạo ra chiến thuật phù hợp với từng tình huống.


**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

### 1.2. Core Pillars

Trò chơi được xây dựng xoay quanh ba trụ cột chính:

**1. Strategic Defense**

- Bố trí Defender hợp lý trên chiến trường.
- Quản lý tài nguyên Energy.
- Lựa chọn thời điểm triệu hồi và nâng cấp lực lượng.
- Đối phó với các loại Enemy và từng đợt tấn công.

**2. Creative Fusion**

- Kết hợp hai Defender để tạo ra một Defender mới.
- Hỗ trợ Fusion giữa hai đơn vị cùng loại hoặc khác loại.
- Mỗi công thức Fusion tạo ra một đơn vị có đặc điểm và vai trò riêng.
- Khuyến khích người chơi khám phá và thử nghiệm các công thức kết hợp.

**3. Powerful Abilities**

- Mỗi Defender có Special Ability riêng.
- Special Ability tạo ra những hiệu ứng mạnh có thể thay đổi cục diện chiến đấu.
- Người chơi cần lựa chọn thời điểm sử dụng kỹ năng thay vì kích hoạt tùy ý.

---

## 2. Target Experience

### 2.1. Target Audience

- Người chơi yêu thích thể loại Tower Defense.
- Người yêu thích phong cách đồ họa Pixel Art và thế giới voxel.
- Người thích thử nghiệm, khám phá và kết hợp các đơn vị chiến đấu.
- Người chơi casual muốn có trải nghiệm dễ tiếp cận nhưng vẫn có chiều sâu chiến thuật.

### 2.2. Desired Player Experience

Người chơi cần cảm nhận được:

- **Easy to Learn:** Dễ hiểu cách triệu hồi và bố trí Defender.
- **Fun to Experiment:** Thích thú khi khám phá những công thức Fusion.
- **Strategic Depth:** Có nhiều lựa chọn chiến thuật thay vì chỉ triệu hồi đơn vị mạnh nhất.
- **Rewarding Progression:** Cảm thấy thỏa mãn khi vượt qua từng Wave và mở khóa nội dung mới.

---

## 3. Core Gameplay Loop

Vòng lặp gameplay chính:

1. Quan sát chiến trường và Enemy.
2. Thu thập Energy từ hệ thống tài nguyên.
3. Triệu hồi Defender vào các ô trên Grid.
4. Kết hợp hai Defender để tạo Fusion.
5. Sử dụng Power Crystal để kích hoạt Special Ability.
6. Đánh bại Enemy và hoàn thành Wave.
7. Tiếp tục chuẩn bị cho Wave tiếp theo.
8. Hoàn thành Level hoặc thất bại nếu căn cứ bị Enemy xâm nhập.

### 3.1. Gameplay Flow

```txt
       START LEVEL
            |
            v
      INITIAL SETUP
            |
            v
      COLLECT ENERGY
            |
            v
     SUMMON DEFENDER
            |
            v
      FUSION SYSTEM
            |
            v
     DEFEND AGAINST
          ENEMIES
            |
            v
      USE POWER CRYSTAL
            |
            v
      WAVE COMPLETED?
         /       \
       NO         YES
       |           |
       |           v
       |      NEXT WAVE
       |           |
       +-----------+
                   |
                   v
             LEVEL RESULT
              /       \
          VICTORY     DEFEAT
```

---

## 4. Battlefield Design

### 4.1. Battlefield Layout

Chiến trường sử dụng góc nhìn Side-view với Grid gồm 5 hàng và 9 cột.

- Tổng số ô: 45.
- Defender được đặt trên các ô Grid.
- Enemy xuất hiện từ phía bên phải.
- Enemy di chuyển từ phải sang trái.
- Mỗi Enemy thuộc một Lane.
- Defender có thể tấn công Enemy trong phạm vi và điều kiện mục tiêu phù hợp.

### 4.2. Grid Structure

| Property | Value |
| --- | --- |
| Rows | 5 |
| Columns | 9 |
| Total cells | 45 |
| Perspective | Side-view |
| Movement direction | Right to Left |
| Defender placement | Grid-based |
| Enemy movement | Lane-based |

### 4.3. Battlefield Interaction

- Người chơi chọn Defender từ khu vực lựa chọn.
- Người chơi đặt Defender vào ô Grid hợp lệ.
- Người chơi có thể kéo một Defender lên Defender khác để thực hiện Fusion.
- Hệ thống kiểm tra công thức Fusion và tính hợp lệ của hai Defender. Fusion không tiêu hao Energy hoặc Power Crystal, không giới hạn khoảng cách hay Lane.
- Các thao tác không hợp lệ phải có phản hồi rõ ràng.

---

## 5. Game Entities

Trò chơi có hai nhóm thực thể chiến đấu chính: Defender và Enemy.

### 5.1. Defender

Defender là các đơn vị do người chơi triệu hồi để bảo vệ căn cứ.

Mỗi Defender có các thuộc tính cơ bản:

| Attribute | Description |
| --- | --- |
| ID | Định danh duy nhất |
| Name | Tên đơn vị |
| HP | Điểm sinh lực |
| Damage | Sát thương |
| Attack Speed | Tốc độ tấn công |
| Range | Phạm vi tấn công |
| Energy Cost | Chi phí triệu hồi |
| Role | Vai trò chiến đấu |
| Fusion Tier | Cấp độ Fusion |
| Special Ability | Kỹ năng đặc biệt |

Các vai trò Defender có thể bao gồm:

- Damage Dealer: Gây sát thương.
- Tank: Chịu sát thương.
- Support: Hỗ trợ các Defender khác.
- Control: Làm chậm hoặc khống chế Enemy.
- Special: Có cơ chế chiến đấu đặc biệt.

### 5.2. Initial Defender Roster

**Confirmed — 02/11/2026:** MVP có đúng 5 Base Defenders dưới đây. Vai trò và attack identity là **Proposed**; chỉ số và targeting cụ thể là **TBD** theo `ENTITY_CATALOG.md`.

| Defender | Role | Gameplay Identity |
| --- | --- | --- |
| Snow Golem | Control | Tấn công bằng băng và làm chậm Enemy |
| Iron Golem | Tank | Chịu sát thương và tấn công cận chiến |
| Skeleton | Damage Dealer | Tấn công tầm xa bằng cung |
| Wolf | Damage Dealer | Tấn công nhanh và có khả năng hỗ trợ theo nhóm |
| Blaze | Damage Dealer / Special | Tấn công bằng lửa và gây sát thương diện rộng |

Danh sách trên là roster khởi đầu. Chỉ số chi tiết và cơ chế đặc biệt sẽ được định nghĩa trong `ENTITY_CATALOG.md`.

### 5.3. Enemy

Enemy là các đơn vị xuất hiện theo từng Wave và di chuyển về phía căn cứ.

Mỗi Enemy có các thuộc tính:

| Attribute | Description |
| --- | --- |
| ID | Định danh |
| Name | Tên Enemy |
| HP | Điểm sinh lực |
| Movement Speed | Tốc độ di chuyển |
| Damage | Sát thương |
| Attack Type | Kiểu tấn công |
| Reward | Confirmed — direct Energy / Crystal Item theo bảng reward dưới đây |
| Special Ability | Khả năng đặc biệt |

**Confirmed — 03/11/2026:**

| Enemy | Energy khi chết (cộng trực tiếp) | Power Crystal khi chết (tạo Item) |
| --- | --- | --- |
| Zombie | 50 | 0 |
| Husk | 100 | 0 |
| Spider | 150 | 1 |
| Pillager | 200 | 1 |

**Confirmed:** Crystal reward tạo Item tại vị trí Enemy chết, kể cả khi storage đã đầy; mỗi Crystal được thưởng tạo một collectible Item. Các reward là integer không âm được cấu hình riêng trong Enemy Definition.

HP, Damage, Move Speed, targeting và behavior vẫn TBD.

### 5.4. Initial Enemy Roster

| Enemy | Gameplay Identity |
| --- | --- |
| Zombie | Enemy cơ bản, cân bằng |
| Husk | Enemy có khả năng chịu đòn tốt |
| Spider | Enemy di chuyển nhanh |
| Pillager | Enemy tấn công từ xa |

**Confirmed:** MVP có 4 Enemy types trên. Mô tả gameplay identity là **Proposed**; hành vi tương tác được cấu hình riêng theo từng Enemy, không áp dụng một hành vi toàn cục. Thông số và hành vi chi tiết là **TBD** trong `ENTITY_CATALOG.md`.

---

## 6. Fusion System

### 6.1. Overview

Fusion là cơ chế kết hợp hai Defender theo Recipe data-driven, hỗ trợ same-type và cross-type.

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

### 6.2. Fusion Rules

1. Người chơi chọn Defender A làm đơn vị nguồn (Source).
2. Người chơi kéo Defender A lên Defender B làm đơn vị mục tiêu (Target).
3. Hệ thống kiểm tra hai Defender có công thức Fusion hợp lệ hay không.
4. Hệ thống kiểm tra hai Defender còn sống, là hai instance riêng biệt, không bị Lock, Grid hợp lệ và Tier/IDs khớp Recipe được phê duyệt khi Game State là Playing.
5. Nếu hợp lệ, hai Defender đầu vào được loại khỏi Grid.
6. Defender Fusion mới được tạo tại ô Grid ban đầu của Defender B (Target).
7. Animation Fusion được phát.
8. Người chơi tiếp tục điều khiển chiến trường.

**Confirmed — 02/11/2026:** Fusion miễn phí (0 Energy, 0 Power Crystal), không kiểm tra, trừ hoặc hoàn tài nguyên. Chi phí triệu hồi Defender vẫn sử dụng Energy bình thường. Source và Target có thể ở bất kỳ khoảng cách hoặc Lane nào, kể cả hai góc đối diện Battlefield. Matching không phụ thuộc thứ tự đầu vào.

**Fusion Placement Rule:**

Fusion Defender luôn kế thừa vị trí Grid của Defender được kéo thả lên (Target Defender), không phụ thuộc thứ tự hoặc vị trí của Source Defender.

Ví dụ:

- Iron Golem tại ô (2, 3).
- Snow Golem tại ô (2, 5).
- Người chơi kéo Iron Golem lên Snow Golem.
- Nếu các điều kiện hợp lệ, Frost Guardian xuất hiện tại ô (2, 5).

### 6.3. Fusion Design Principles

- Mỗi Fusion phải có ý nghĩa chiến thuật rõ ràng.
- Fusion không đơn thuần cộng chỉ số của hai đơn vị đầu vào.
- Defender Fusion có chỉ số, vai trò và Ability riêng.
- Fusion mạnh hơn nhưng không được khiến Defender cơ bản trở nên vô dụng.
- Công thức Fusion cần khuyến khích người chơi thử nghiệm.
- Vị trí Fusion phải nhất quán và dễ dự đoán.

**Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.

### 6.4. Initial Fusion Recipes

**Confirmed — 02/11/2026:** đúng 6 công thức dùng 5 Base Defenders, gồm 3 same-type và 3 cross-type.

| Input A | Input B | Fusion Result |
| --- | --- | --- |
| Skeleton | Skeleton | Skeleton Sniper |
| Snow Golem | Snow Golem | Ice Golem |
| Iron Golem | Snow Golem | Frost Guardian |
| Blaze | Wolf | Flame Fang |
| Blaze | Skeleton | Inferno Archer |
| Wolf | Wolf | Alpha Wolf |

Chi tiết ID, matching, validation và execution được định nghĩa trong `FUSION_RECIPES.md`.

---

## 7. Power Crystal System

### 7.1. Overview

Power Crystal là tài nguyên dùng để kích hoạt Special Ability của Defender.

**Confirmed:** mỗi Defender và Fusion Defender trong MVP phải có Special Ability riêng được định nghĩa. Tên, hiệu ứng, chi phí và cooldown cụ thể vẫn là Proposed/TBD.

Power Crystal được quản lý như một loại tài nguyên độc lập với Energy.

### 7.2. Core Rules

- Mỗi Ability có chi phí Power Crystal riêng.
- Người chơi phải có đủ Power Crystal để kích hoạt.
- Ability có thể tác động lên Enemy, Defender hoặc toàn bộ chiến trường tùy thiết kế.
- Một số Ability có thể gây sát thương diện rộng.
- Một số Ability có thể tạo hiệu ứng hỗ trợ hoặc khống chế.

### 7.3. Example Abilities

**Proposed:** tên và hiệu ứng dưới đây là bản thiết kế nháp theo Entity Catalog, chưa phải đặc tả Ability đã chốt.

| Ability | Associated Defender | Effect Concept |
| --- | --- | --- |
| Blizzard | Snow Golem | Làm chậm Enemy trên nhiều Lane |
| Earthquake | Iron Golem | Gây sát thương diện rộng |
| Arrow Storm | Skeleton | Bắn nhiều mũi tên lên chiến trường |
| Pack Frenzy | Wolf | Tăng sức mạnh tấn công của nhóm Wolf |
| Inferno | Blaze | Tạo vùng sát thương lửa |
| Piercing Barrage | Skeleton Sniper | Bắn loạt đạn xuyên nhiều Enemy |
| Absolute Zero | Ice Golem | Đóng băng Enemy trong một khoảng thời gian |
| Glacial Fortress | Frost Guardian | Shield tạm thời và Slow ở gần |
| Wildfire Rush | Flame Fang | Chuỗi tấn công nhanh kèm Burn |
| Meteor Arrow Rain | Inferno Archer | Sát thương lửa tầm xa và Burn |
| Alpha Howl | Alpha Wolf | Hỗ trợ đồng đội |

**Khác biệt Draft cần chủ dự án xác nhận:** GDD mô tả Pack Frenzy là “Tăng sức mạnh tấn công của nhóm Wolf”; Ability Catalog mục 4.4 đề xuất tăng Attack Speed/Damage cho chính Wolf, không mặc định Buff đồng minh. GDD mô tả Blizzard làm chậm trên nhiều Lane, trong khi Ability Catalog mục 4.1 để phạm vi khác Lane là TBD. Giữ nguyên các mô tả nguồn; chưa chọn phạm vi Buff hoặc Lane.

**TBD:** các thông số và hiệu ứng chính thức được định nghĩa trong `ABILITY_CATALOG.md`.

---

## 8. Resource System

MVP sử dụng hai loại tài nguyên chính: Energy và Power Crystal.

### 8.1. Energy

Energy dùng để Summon, không dùng cho Fusion. **Confirmed:** initial Energy 0; cộng trực tiếp +50 ngay tại gameplay t=0, sau đó +50 mỗi 3 giây Game Time; storage Unlimited. Passive Energy không tạo Item. Pause dừng timer và collect.

Energy Item click-to-collect có lifetime 10 giây Game Time; không collect trong Pause. Spawn position ngẫu nhiên hợp lệ và không bắt buộc snap Grid theo thiết kế trước; amount/spawn rate chưa được baseline chốt vẫn TBD.

### 8.2. Power Crystal

**Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.

Nguồn: Wave Rewards, Crystal Items từ Enemy death và random spawn độc lập. Power Crystal dùng cho Special Ability, độc lập với Energy; không dùng cho Fusion.

**Confirmed:** random Power Crystal spawn độc lập: attempt đầu sau ngẫu nhiên 30–60 giây Game Time; mỗi attempt kế tiếp cách ngẫu nhiên 30–60 giây. Mỗi attempt thành công tạo một Item trị giá 1 Crystal tại cell ngẫu nhiên không có Defender; không có cell hợp lệ thì bỏ qua attempt. Không có cap riêng cho số Item cùng tồn tại; nhiều Item được phép trùng cell. Summon lên cell có Item được phép: auto-collect oldest-first đến giới hạn storage, Item dư giữ timer gốc; Item còn lại sau khi Defender bị loại bỏ. Click Item được ưu tiên hơn click Defender.

| Enemy | Energy khi chết (cộng trực tiếp) | Power Crystal khi chết (tạo Item) |
| --- | --- | --- |
| Zombie | 50 | 0 |
| Husk | 100 | 0 |
| Spider | 150 | 1 |
| Pillager | 200 | 1 |

**Confirmed:** Crystal reward tạo Item tại vị trí Enemy chết, kể cả khi storage đã đầy; mỗi Crystal được thưởng tạo một collectible Item. Các reward là integer không âm được cấu hình riêng trong Enemy Definition.

### 8.3. Resource Design Principles

- Người chơi phải có cơ hội đưa ra quyết định về cách sử dụng tài nguyên.
- Energy tự sinh đảm bảo người chơi có nguồn tài nguyên cơ bản để tiếp tục chơi.
- Vật phẩm Energy tạo thêm cơ hội thu thập tài nguyên và khuyến khích người chơi quan sát chiến trường.
- Không để Energy trở nên quá dư thừa hoặc quá khan hiếm.
- Power Crystal phải tạo ra những thời điểm sử dụng kỹ năng có giá trị.
- Tốc độ sinh Energy, giá trị vật phẩm và chi phí Defender sẽ được điều chỉnh thông qua playtesting.

---

## 9. Wave System

### 9.1. Overview

Enemy xuất hiện theo từng Wave.

Mỗi Wave chứa một hoặc nhiều nhóm Enemy với thời điểm spawn, số lượng và loại Enemy khác nhau.

### 9.2. Wave Structure

Một Wave có thể bao gồm:

- Wave ID.
- Spawn Groups.
- Enemy Types.
- Enemy Count.
- Spawn Interval.
- Delay Before Next Wave.
- Wave Completion Condition.

### 9.3. Wave Progression

Độ khó tăng dần thông qua:

- Số lượng Enemy.
- HP của Enemy.
- Movement Speed.
- Sự kết hợp nhiều loại Enemy.
- Thời gian spawn giữa các Enemy.

MVP dự kiến có 5 Wave trong một Level.

---

## 10. Game Modes and Level Design

### 10.1. Game Mode

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** cả Base Defenders và Fusion Recipes có unlock qua Achievements/Challenges; bộ Defender ban đầu nhỏ, phần lớn Recipe bị khóa. Chỉ ghi nhận Achievement khi Victory; Defeat không tạo unlock mới và giữ unlock đã có. Grassland được replay nhưng sau lần hoàn thành đầu, replay không tạo thêm permanent unlock progress. Starter roster, Recipe mở sẵn, điều kiện/phần thưởng Achievement và Fusion có bắt buộc để thắng hay không vẫn TBD.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

### 10.2. MVP World

| Property | Value |
| --- | --- |
| Biome | Grassland |
| Level Count | 1 |
| Wave Count | 5 |
| Game Mode | Single-player |
| Battlefield | 5 × 9 Grid |

### 10.3. Level Completion

Victory: hoàn thành cả 5 Waves và không còn Enemy. Defeat phát sinh khi bất kỳ Enemy nào vượt Base Boundary; không dùng Base HP/Lives.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Không dùng quy tắc cũ “Defeat luôn ưu tiên”. Khi terminal event đã xác định kết quả, trận đấu không chuyển sang kết quả khác.

## 11. Game State and Flow

### 11.1. Main Game States

| State | Description |
| --- | --- |
| Loading / Ready | Khởi tạo/chuẩn bị; tên enum và tách State vẫn Draft kỹ thuật |
| Playing | Gameplay đang chạy |
| Paused | Dừng simulation và Game Time timers, không collect/claim resource |
| Victory / Defeat | Terminal result được xác định qua Event Queue |

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

### 11.2. Entity States

Các Defender và Enemy có thể có những trạng thái:

- Idle
- Moving
- Attacking
- Taking Damage
- Casting
- Dead

Trạng thái cụ thể phụ thuộc vào loại Entity và hành vi của nó.

---

## 12. User Interface

### 12.1. Main Screens

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

Achievements hiển thị objectives/completion/unlock rewards; Defender Collection hiển thị Defender/Recipe locked và unlocked. Có màn hình Gameplay và Victory/Defeat result. UI implementation cụ thể vẫn TBD.

### 12.2. Gameplay HUD

HUD cần cung cấp những thông tin:

- Energy hiện tại.
- Power Crystal hiện tại.
- Wave hiện tại.
- Tiến độ Wave.
- Defender Selection Bar.
- Special Ability Controls.
- Pause Button.
- Game Speed Control (có thể bổ sung sau).

### 12.3. Fusion Interaction

- Người chơi có thể kéo thả Defender.
- Hệ thống cần phản hồi khi Fusion hợp lệ.
- Hệ thống cần phản hồi khi Fusion không hợp lệ.
- Animation cần giúp người chơi nhận biết kết quả Fusion.

---

## 13. Visual and Audio Direction

### 13.1. Visual Style

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

Giữ side-view, silhouette dễ nhận biết, hiệu ứng có tương phản tốt. Kích thước, palette và animation budget chưa được duyệt.

### 13.2. Battlefield Art

Môi trường Grassland dự kiến gồm:

- Nền cỏ.
- Các ô Grid.
- Khu vực căn cứ.
- Khu vực Enemy spawn.
- Hiệu ứng môi trường.
- Hiệu ứng kỹ năng và Fusion.

### 13.3. Audio

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

Nếu chủ dự án phê duyệt audio sau này, SFX/music/ambience và policy theo `AUDIO_GUIDELINES.md`; không là điều kiện hoàn thành Functional MVP.

## 14. MVP Scope

### 14.1. In Scope

Phiên bản MVP tập trung vào:

- Desktop Web.
- Single-player.
- Một biome Grassland.
- Một Level.
- Năm Wave.
- Grid 5 × 9.
- Năm Defender cơ bản.
- Bốn Enemy cơ bản.
- Fusion cùng loại và khác loại.
- Sáu Fusion Recipes và sáu Tier-2 Fusion Defenders, theo mục 6.4.
- Nội dung ban đầu chỉ sáu Recipe Tier-2; engine không có Tier ceiling cố định.
- Special Ability cho các Defender và Fusion Defender được đưa vào MVP.
- Energy System.
- Wave System.
- Combat System.
- Drag and Drop.
- Victory / Defeat.
- Gameplay HUD.
- Save & Resume trận sau browser reload/close và persistent progression bắt buộc.
- Main Menu, Level Selection, Settings, Achievements, Defender Collection; basic instructions.
- English-only, beginner-friendly, Local/internal testing; visual pixel art cơ bản, không bắt buộc audio.
- Manual playthrough + core automated tests.

### 14.2. Out of Scope

Không triển khai trong MVP:

- Multiplayer.
- PvP.
- Online Co-op.
- Backend Account System.
- Cloud Save.
- Leaderboard.
- In-game Shop.
- Gacha.
- Progression phức tạp ngoài Achievement/unlock đã Confirmed; không loại persistent progression khỏi MVP.
- Multiple Biomes.
- Large Campaign.
- Advanced Enemy AI.
- Social Features.
- Mobile-first Optimization.

### 14.3. MVP Success Criteria

MVP được xem là hoàn thành khi:

1. Người chơi có thể bắt đầu và hoàn thành một Level.
2. Defender có thể được triệu hồi và đặt đúng Grid.
3. Enemy có thể spawn, di chuyển, tấn công và bị tiêu diệt.
4. Combat System hoạt động ổn định.
5. Fusion System hoạt động đúng với các công thức đã khai báo.
6. Special Ability có thể được kích hoạt bằng Power Crystal và tạo hiệu ứng chính xác.
7. Energy và Power Crystal được quản lý đúng.
8. Wave System hoạt động từ đầu đến cuối.
9. Victory và Defeat được xác định chính xác.
10. Gameplay có thể chơi ổn định trên Local Desktop Web.
11. Save & Resume, persistent unlocks, các màn hình bắt buộc, visual acceptance, English-only và manual/core automated tests được kiểm chứng.

---

## 15. Technical Direction

### 15.1. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend Framework | Next.js |
| UI | React |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Game Engine | Phaser 3 |
| Programming Language | TypeScript |
| Package Manager | pnpm |
| Monorepo | Turborepo |
| Schema Validation | Zod |
| Unit Testing | Vitest |
| E2E Testing | Playwright |
| Map / Level Editor | Tiled |
| Pixel Art | Aseprite |

### 15.2. Architecture Principles

- Phaser chịu trách nhiệm gameplay và rendering.
- React chịu trách nhiệm UI, HUD và các màn hình bên ngoài game.
- Không sử dụng React để cập nhật trạng thái vị trí Entity theo từng frame.
- Gameplay data được thiết kế theo hướng data-driven.
- Tách biệt Game Systems theo trách nhiệm.
- Ưu tiên code dễ kiểm thử và mở rộng.
- Không xây dựng backend trong MVP.

### 15.3. Future Backend Direction

Backend có thể được bổ sung trong tương lai nếu trò chơi cần:

- User Account.
- Cloud Save.
- Leaderboard.
- Online Features.
- Game Analytics.
- Content Management.

Định hướng công nghệ tương lai:

- NestJS.
- PostgreSQL.
- Object Storage.

Đây không phải yêu cầu của MVP.

---

## 16. Development Principles

Các nguyên tắc phát triển:

1. Documentation-first: Tài liệu thiết kế phải được hoàn thiện trước khi triển khai hệ thống tương ứng.
2. Data-driven: Entity, Fusion Recipes, Ability và Level nên được định nghĩa bằng dữ liệu có cấu trúc.
3. Separation of Concerns: Phân tách UI, Game Engine và Game Systems.
4. Testability: Các logic quan trọng cần có unit tests.
5. Incremental Development: Phát triển từng hệ thống nhỏ, kiểm thử trước khi mở rộng.
6. Performance: Đảm bảo gameplay mượt mà trên Desktop Web.
7. Maintainability: Ưu tiên code rõ ràng, dễ hiểu và dễ thay đổi.

---

## 17. Intellectual Property and Asset Guidelines

Minecraft Fusion Defense chỉ sử dụng Minecraft và Plants vs. Zombies 2 làm nguồn cảm hứng về phong cách và gameplay.

Nếu dự án được phát hành công khai hoặc thương mại:

- Ưu tiên thiết kế nhân vật, sprite, animation, âm thanh và tên gọi riêng.
- Không mặc định sử dụng trực tiếp tài sản đồ họa, âm thanh hoặc thương hiệu thuộc sở hữu của bên thứ ba.
- Kiểm tra quyền sử dụng và giấy phép của mọi asset bên ngoài.
- Đảm bảo tên gọi và nhận diện sản phẩm không gây nhầm lẫn với các thương hiệu hiện có.

---

## 18. Open Design Decisions

| Nhóm | TBD chưa được phê duyệt |
| --- | --- |
| Product Design | Starter roster/Recipes, Achievement conditions/rewards/unlock mapping; Fusion có bắt buộc để thắng |
| Coding Planning | Combat stats, Summon Cost, Enemy behavior/targeting; Wave composition/timing/reward amounts; Energy Item amount/rate |
| Coding Planning | Ability effects/area/cost/cooldown/spend/commit/rollback; Pack Frenzy/Blizzard scope |
| Coding Planning | Fusion interaction cooldown/animation; Save implementation; detailed Event Queue generation/edge cases |
| Coding Planning | UI, sprite sizes/frames, test cases/coverage, 0-based indexing / Loading-Ready approval |

Không còn coi Enemy rewards, caps, passive Energy, Item lifetime hoặc Fusion HP/status/readiness là TBD. Các quyết định Confirmed được đặt ở section chuyên môn.

---

## 19. Related Documents

| Document | Purpose |
| --- | --- |
| `GAMEPLAY_MECHANICS.md` | Chi tiết cơ chế gameplay |
| `MVP_SCOPE.md` | Phạm vi và tiêu chí hoàn thành MVP |
| `ROADMAP.md` | Lộ trình phát triển |
| `ENTITY_CATALOG.md` | Danh mục Defender và Enemy |
| `FUSION_RECIPES.md` | Công thức Fusion |
| `ABILITY_CATALOG.md` | Danh mục Special Ability |
| `LEVEL_DESIGN.md` | Thiết kế Level và Wave |
| `GAME_BALANCING.md` | Cân bằng chỉ số |
| `TECHNICAL_ARCHITECTURE.md` | Kiến trúc tổng thể |
| `GAME_ENGINE_ARCHITECTURE.md` | Kiến trúc Phaser và Game Systems |
| `DATA_ARCHITECTURE.md` | Thiết kế dữ liệu |
| `CODING_STANDARDS.md` | Quy chuẩn code |

---

**End of Document**

**Document:** `GDD.md`  
**Project:** Minecraft Fusion Defense  
**Version:** 1.0
