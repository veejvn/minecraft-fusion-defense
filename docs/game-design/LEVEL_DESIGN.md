**Đường dẫn trong repository:** `docs/game-design/LEVEL_DESIGN.md`  
**Dự án:** Minecraft Fusion Defense  
**Phiên bản:** Draft v1.0  
**Phạm vi:** MVP — 1 Level Grassland, 5 Waves, chiến trường 5 Rows × 9 Columns.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục đích và phạm vi

Tài liệu mô tả cấu trúc Level, bố cục chiến trường, tổ chức Waves, Enemy Spawning, tài nguyên, tiến trình độ khó, điều kiện Victory/Defeat, cấu hình dữ liệu và Acceptance Criteria. Đây là tài liệu thiết kế để AI Agent triển khai sau khi các thông số chưa chốt được xác nhận.

**Nhãn quyết định:** **Confirmed** = đã xác nhận trong tài liệu dự án; **Draft** = đề xuất thiết kế; **TBD** = chưa quyết định. Không coi số liệu minh họa hoặc lịch Spawn đề xuất là Balance chính thức.

## 2. Tổng quan Grassland Level

| Thuộc tính | Giá trị | Trạng thái |
| --- | --- | --- |
| `levelId` | `grassland_01` | Draft ID |
| Biome | Grassland | Confirmed |
| Battlefield | 5 Rows × 9 Columns | Confirmed |
| Enemy Spawn Side | Right | Confirmed |
| Base / Defense Side | Left | Confirmed |
| Số Waves | 5 | Confirmed |
| Enemy Types | Zombie, Husk, Spider, Pillager | Confirmed |
| Base Defenders | Snow Golem, Iron Golem, Skeleton, Wolf, Blaze | Confirmed |
| Fusion Defenders | Skeleton Sniper, Ice Golem, Frost Guardian, Flame Fang, Inferno Archer, Alpha Wolf | Confirmed |
| Điều kiện Victory | Hoàn thành 5 Waves và loại bỏ mọi Enemy còn lại | Confirmed |
| Điều kiện Defeat | Bất kỳ Enemy nào xâm nhập căn cứ | Confirmed |
| Base HP / Lives | Không sử dụng | Confirmed |

Grassland là Campaign duy nhất của Functional MVP: Local Desktop Web/internal testing, beginner-friendly, English-only.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker. Các chi tiết về Background, Tilemap, địa hình trang trí, màu sắc, âm thanh và animation cần tuân theo Asset Guidelines; chưa có dữ liệu xác nhận về chướng ngại vật, ô cấm đặt Defender hoặc địa hình làm thay đổi tốc độ.

## 3. Bố cục chiến trường

### 3.1. Hệ tọa độ

- Grid có 5 Rows (Lane) và 9 Columns; dùng tọa độ logic `row = 0..4`, `col = 0..8` (quy ước index từ 0 là **Draft kỹ thuật**).
- Defender chiếm một Cell hợp lệ; Enemy xuất hiện phía Right và di chuyển về phía Left theo Lane.
- `baseBoundaryX` và `spawnOffsetX` phải được cấu hình theo đơn vị tọa độ của Game Engine; giá trị số là TBD.
- Không tự thêm Base Health hoặc cơ chế mất mạng. Enemy vượt Base Boundary dẫn đến Defeat ngay.

### 3.2. Sơ đồ logic (không theo tỷ lệ)

```txt
BASE / LEFT                                   RIGHT / SPAWN
    |                                            |
R0  [ ][ ][ ][ ][ ][ ][ ][ ][ ]  <--- Enemy
R1  [ ][ ][ ][ ][ ][ ][ ][ ][ ]  <--- Enemy
R2  [ ][ ][ ][ ][ ][ ][ ][ ][ ]  <--- Enemy
R3  [ ][ ][ ][ ][ ][ ][ ][ ][ ]  <--- Enemy
R4  [ ][ ][ ][ ][ ][ ][ ][ ][ ]  <--- Enemy
    |                                            |
    +-- Base Boundary                            +-- Spawn Offset
```

### 3.3. Fusion và bố trí Defender

- Fusion thực hiện bằng cách kéo Source lên Target; Source và Target có thể ở bất kỳ Lane hoặc khoảng cách nào.
- Fusion miễn phí: 0 Energy, 0 Power Crystal.
- Hai Defender đầu vào bị tiêu thụ; Fusion Output xuất hiện tại **Target Cell**, Source Cell trở thành trống.
- Initial content chỉ sáu approved Tier-1 + Tier-1 → Tier-2 Recipes; engine không có Tier ceiling, future content cần phê duyệt.
- **Confirmed:** Fusion Output bắt đầu ở 100% Max HP của chính nó, không kế thừa status effects tích cực hoặc tiêu cực từ input, có thể tấn công ngay khi có target hợp lệ. Không cộng chỉ số hai input.
- Không được thêm quy tắc Fusion cùng Lane, liền kề hoặc tiêu Energy vào Level Config.

## 4. Mục tiêu trải nghiệm và nhịp độ Level

**Mục tiêu thiết kế (Draft):** Giúp người chơi học Summon, Energy Collection, Targeting, Fusion và Special Ability qua độ khó tăng dần; tạo cảm giác thử thách nhưng không buộc phải biết trước mọi Recipe.

**Đề xuất tiến trình:**

1. **Wave 1 — Làm quen:** Nhấn mạnh đặt Defender và bảo vệ một vài Lane; dùng Zombie làm Enemy cơ bản.
2. **Wave 2 — Phân bổ phòng thủ:** Mở rộng áp lực sang nhiều Lane; giới thiệu Husk hoặc tăng số Zombie.
3. **Wave 3 — Phản ứng nhanh:** Giới thiệu Spider để kiểm tra khả năng ứng phó Enemy nhanh hoặc có hành vi đặc biệt.
4. **Wave 4 — Đối phó tầm xa:** Giới thiệu Pillager; khuyến khích phối hợp Tank, Ranged Defender và Special Ability.
5. **Wave 5 — Tổng hợp:** Kết hợp các Enemy đã giới thiệu và tăng áp lực đa Lane; khuyến khích sử dụng Fusion hợp lý.

**Quan trọng:** Thứ tự giới thiệu Enemy, mức tăng độ khó, số Lane bị tấn công và việc bắt buộc sử dụng Fusion/Ability đều là **Draft**, chưa được xác nhận. Không được biến gợi ý trên thành quy tắc cứng khi chưa playtest.

## 5. Cấu trúc Wave

Mỗi Wave được cấu hình theo dữ liệu, không Hardcode:

| Field | Ý nghĩa | Trạng thái |
| --- | --- | --- |
| `id` | Định danh Wave | Confirmed về khái niệm |
| `spawnGroups` | Danh sách nhóm Enemy | Confirmed |
| `initialDelayMs` | Độ trễ trước lần Spawn đầu tiên | Draft tên Field |
| `spawnIntervalMs` | Khoảng cách giữa các lần Spawn | Confirmed về khái niệm |
| `delayBeforeNextWaveMs` | Độ trễ trước Wave tiếp theo | Confirmed về khái niệm |
| `reward` | Phần thưởng khi hoàn thành Wave | Confirmed về khái niệm |
| `completionCondition` | Điều kiện hoàn thành | Confirmed về khái niệm |

### 5.1. Spawn Group

Spawn Group mô tả loại Enemy, số lượng, Lane được phép Spawn, khoảng cách thời gian và các tham số điều phối. Các Field sau là **đề xuất schema**:

- `enemyId`: tham chiếu một trong 4 Enemy MVP.
- `count`: số Enemy cần Spawn, nguyên không âm; với nhóm đang hoạt động nên lớn hơn 0.
- `allowedRows`: các Row hợp lệ trong khoảng 0..4.
- `intervalMs`: thời gian giữa các Enemy trong nhóm.
- `startOffsetMs`: thời điểm bắt đầu tương đối so với Wave.
- `spawnOffsetX`: vị trí Spawn ngoài cạnh Right.
- `selectionMode`: chọn Lane cố định, tuần tự hoặc ngẫu nhiên có Seed (Draft).

Không tự suy ra rằng mọi Enemy có thể đổi Lane; Enemy Behavior do Entity Definition quy định.

### 5.2. Quy trình Spawn

1. Bắt đầu Wave khi Game State là `PLAYING` và đạt điều kiện chuyển Wave.
2. Chờ `initialDelayMs` theo simulation time.
3. Xử lý Spawn Groups theo lịch đã cấu hình.
4. Tạo Enemy với đúng `enemyId`, Row hợp lệ và Spawn Offset phía Right.
5. Cập nhật tiến độ Spawn; mỗi Enemy được tạo đúng một lần.
6. Khi hết lịch Spawn, tiếp tục Combat cho đến khi không còn Enemy sống trên chiến trường.

**Tính xác định:** Nếu chọn Lane ngẫu nhiên, nên dùng Seed để tái hiện trận đấu khi Test. Đây là đề xuất kỹ thuật, không phải quyết định gameplay đã xác nhận.

## 6. Thiết kế 5 Waves (Draft)

| Wave | Mục tiêu trải nghiệm | Enemy đề xuất | Áp lực chính | Phần thưởng |
| --- | --- | --- | --- | --- |
| 1 | Học phòng thủ cơ bản | Zombie | Nhẹ, ít Lane | Power Crystal: TBD |
| 2 | Phân bổ Defender | Zombie, Husk | Enemy bền hơn | Power Crystal: TBD |
| 3 | Ứng phó Enemy nhanh | Zombie, Spider | Tốc độ, nhiều Lane | Power Crystal: TBD |
| 4 | Xử lý Enemy tầm xa | Husk, Spider, Pillager | Phối hợp tấn công | Power Crystal: TBD |
| 5 | Kiểm tra toàn bộ cơ chế | Zombie, Husk, Spider, Pillager | Áp lực tổng hợp | Power Crystal: TBD |

**Tất cả thành phần trong bảng, trừ số lượng 5 Waves và danh sách 4 Enemy, là đề xuất.** Chưa xác nhận số Enemy, tỷ lệ Spawn, thời điểm Spawn, Lane, số Power Crystal thưởng hoặc thời lượng Wave.

### 6.1. Nguyên tắc cân bằng sơ bộ (Draft)

- Tăng độ khó thông qua số lượng Enemy, độ bền, tốc độ, số Lane và phối hợp Enemy; không tăng mọi yếu tố cùng lúc.
- Wave đầu cần đủ thời gian để người chơi học cách dùng Energy và Summon.
- Wave sau có thể khuyến khích Fusion nhưng không bắt buộc mọi người chơi phải Fusion một công thức cố định.
- Tránh tạo tình huống không thể phòng thủ do thiếu Energy hoặc do Spawn quá sớm.
- Không quyết định số liệu chính thức trước khi kiểm tra bằng `GAME_BALANCING.md` và Playtest.

## 7. Wave Progression và Completion

Một Wave được xem là hoàn thành khi đồng thời:

1. Tất cả Spawn Groups của Wave đã xử lý xong.
2. Không còn Enemy sống trên Battlefield.
3. Không xảy ra Defeat.

Sau khi Wave hoàn thành:

- Cập nhật Wave Progress.
- Cấp Wave Reward đúng một lần.
- Nếu còn Wave, chờ `delayBeforeNextWaveMs` rồi bắt đầu Wave tiếp theo.
- Nếu đây là Wave thứ 5, chuyển sang Victory khi tất cả điều kiện chiến thắng đã thỏa mãn.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Terminal result đã resolve không bị event sau thay đổi.

## 8. Tài nguyên trong Level

### 8.1. Energy

**Confirmed:** initial Energy 0, +50 direct credit ngay t=0, sau đó +50 mỗi 3 giây Game Time; Unlimited cap. Enemy death Energy rewards cộng trực tiếp theo Game Balancing.

Energy Items click-to-collect, lifetime 10 giây Game Time; ngẫu nhiên hợp lệ không bắt buộc snap Grid, amount/spawn rate còn TBD. Pause dừng timers và cấm collect. Energy dùng Summon, không dùng Fusion.

### 8.2. Power Crystal

**Confirmed:** Power Crystal bắt đầu 0, storage cap 5. Wave Reward vượt sức chứa vào Pending Wave Reward không có cap riêng; claim thủ công từng phần khi có chỗ, không claim trong Pause, pending bị hủy khi Victory/Defeat. Crystal Item có lifetime 10 giây Game Time; khi storage đầy, không collect Item và timer không bị reset. Item vẫn được tạo khi storage đầy.

**Confirmed:** random Power Crystal spawn độc lập: attempt đầu sau ngẫu nhiên 30–60 giây Game Time; mỗi attempt kế tiếp cách ngẫu nhiên 30–60 giây. Mỗi attempt thành công tạo một Item trị giá 1 Crystal tại cell ngẫu nhiên không có Defender; không có cell hợp lệ thì bỏ qua attempt. Không có cap riêng cho số Item cùng tồn tại; nhiều Item được phép trùng cell. Summon lên cell có Item được phép: auto-collect oldest-first đến giới hạn storage, Item dư giữ timer gốc; Item còn lại sau khi Defender bị loại bỏ. Click Item được ưu tiên hơn click Defender.

Enemy Crystal drops và Wave Rewards theo Gameplay Mechanics/Game Balancing; Wave Reward amounts còn TBD.

### 8.3. Quy tắc cấp thưởng

Wave Reward chỉ cấp đúng một lần sau completion hợp lệ. Crystal overflow vào Pending Wave Reward không có pending cap; manual partial claim khi Playing và còn sức chứa; hủy pending khi Victory/Defeat.

**Confirmed:** cả Base Defenders và Fusion Recipes có unlock qua Achievements/Challenges; bộ Defender ban đầu nhỏ, phần lớn Recipe bị khóa. Chỉ ghi nhận Achievement khi Victory; Defeat không tạo unlock mới và giữ unlock đã có. Grassland được replay nhưng sau lần hoàn thành đầu, replay không tạo thêm permanent unlock progress. Starter roster, Recipe mở sẵn, điều kiện/phần thưởng Achievement và Fusion có bắt buộc để thắng hay không vẫn TBD.

Không tự thiết kế Achievement criteria/rewards hoặc Wave Reward amounts.

## 9. Game States và thời gian

| Game State | Wave Spawn | Combat / Timer | Tương tác |
| --- | --- | --- | --- |
| `PLAYING` | Hoạt động theo lịch | Hoạt động | Cho phép thao tác hợp lệ |
| `PAUSED` | Dừng | Đóng băng | Không cho thao tác gameplay thay đổi trạng thái |
| `VICTORY` | Dừng | Dừng | Hiển thị kết quả |
| `DEFEAT` | Dừng | Dừng | Hiển thị kết quả |

Các State bổ sung như `LOADING`, `READY`, `WAVE_TRANSITION` là **đề xuất kỹ thuật** và cần đồng bộ với Game Engine Architecture trước khi triển khai.

Pause phải đóng băng: Enemy Movement, Attack Cooldown, Wave Spawn Timers, Energy Item Lifetime, Power Crystal Item Lifetime, Ability Cooldown và Status Effect Timers. Khi Resume, tiếp tục từ thời gian simulation đã lưu, không cộng dồn thời gian thực đã Pause.

## 10. Điều kiện Victory và Defeat

### Victory — Confirmed

Hoàn thành đủ 5 Waves và không còn Enemy tạo Victory event.

### Defeat — Confirmed

Enemy vượt Base Boundary tạo Defeat event; không có Base HP/Lives.

**Confirmed — 03/11/2026:** Defender attack và Enemy movement được tính đồng thời mỗi simulation tick, sau đó xử lý Event Queue theo insertion sequence với sequence number tăng dần. Khi Victory và Defeat cùng phát sinh trong một tick, terminal event được resolve trước quyết định kết quả; không có ưu tiên cố định cho Victory hoặc Defeat. Thứ tự sinh event chi tiết và edge cases là Coding Planning TBD.

Khi terminal result được resolve: dừng Spawn/Combat, khóa gameplay, hiển thị kết quả và hủy Pending Wave Reward. Không đổi terminal result đã chốt. Chi tiết generation ordering còn Coding Planning TBD.

## 11. Data-driven Level Schema (đề xuất)

```json
{
  "id": "grassland_01",
  "biome": "grassland",
  "grid": { "rows": 5, "columns": 9 },
  "enemySpawnSide": "RIGHT",
  "baseSide": "LEFT",
  "waveCount": 5,
  "waves": [
    {
      "id": "grassland_wave_01",
      "initialDelayMs": null,
      "spawnGroups": [
        {
          "enemyId": "zombie",
          "count": null,
          "allowedRows": [0, 1, 2, 3, 4],
          "startOffsetMs": null,
          "intervalMs": null
        }
      ],
      "delayBeforeNextWaveMs": null,
      "reward": { "powerCrystal": null }
    }
  ],
  "resources": {
    "initialEnergy": 0,
    "energyPassiveRate": null,
    "energyItemSpawnRate": null,
    "powerCrystalItemSpawnRate": null
  }
}
```

**Chú ý:** JSON trên chỉ minh họa cấu trúc; `waves` mới chứa một Wave mẫu, không phải Level Config hoàn chỉnh. `null` biểu thị thông số chưa chốt và **không phải giá trị Runtime hợp lệ**. Trước khi đưa vào Game Engine, AI Agent phải xây dựng đủ 5 Wave Definitions và yêu cầu xác nhận các thông số TBD.

### 11.1. Quy tắc kiểm tra dữ liệu

- `grid.rows === 5`, `grid.columns === 9` trong MVP.
- `waveCount === waves.length === 5` ở dữ liệu hoàn chỉnh.
- Mọi `enemyId` phải tồn tại trong Entity Catalog.
- `allowedRows` chỉ chứa Row hợp lệ, không rỗng khi Spawn Group cần chọn Lane.
- Count, Delay, Interval, Reward phải là số hợp lệ, không âm; Count của nhóm Spawn phải lớn hơn 0.
- Không chấp nhận `null` hoặc TBD Placeholder khi chạy Runtime.
- Các tham chiếu Asset, Ability và Reward cần được kiểm tra trước khi Load Level.

## 12. Edge Cases

- **Pause khi đang Spawn:** Dừng lịch; Resume không Spawn trùng hoặc bỏ qua Enemy.
- **Enemy bị tiêu diệt trước khi nhóm Spawn kết thúc:** Không hoàn thành Wave sớm.
- **Spawn Group hoàn tất nhưng Enemy vẫn còn:** Tiếp tục Combat, chưa cấp Reward.
- **Enemy vượt Base Boundary đúng lúc Enemy cuối bị hạ:** terminal event resolve trước theo Event Queue insertion sequence quyết định kết quả.
- **Wave Reward Event bị gửi lại:** Không cấp Power Crystal lần thứ hai.
- **Click cùng một Resource Item nhiều lần:** Chỉ cộng tài nguyên một lần.
- **Item hết Lifetime đúng lúc Click:** Xử lý theo thứ tự Event xác định; không nhận hai lần.
- **Enemy Spawn ngoài vùng hiển thị:** Spawn Offset vẫn phải cho phép Enemy đi vào đúng Lane.
- **Game kết thúc trong lúc đang chờ Wave tiếp theo:** Hủy toàn bộ lịch Spawn và Reward chưa được xác nhận.
- **Fusion giữa hai Lane trong Wave bất kỳ:** Hợp lệ nếu thỏa điều kiện Fusion chung, không phụ thuộc Level.
- **Wave Config lỗi hoặc thiếu dữ liệu:** Báo lỗi Validation, không tự bịa Spawn Count hay Reward.

## 13. Acceptance Criteria

- [ ] Grassland Level có đúng 5 Rows × 9 Columns.
- [ ] Enemy Spawn từ Right và tiến về Base ở Left.
- [ ] Có đúng 5 Wave Definitions hợp lệ trong Level Config hoàn chỉnh.
- [ ] Mỗi Spawn Group tạo đúng loại, số lượng và Lane Enemy theo cấu hình.
- [ ] Wave chỉ hoàn thành khi hết Spawn Groups và không còn Enemy.
- [ ] Wave Reward chỉ cấp đúng một lần sau khi hoàn thành hợp lệ.
- [ ] Energy tự sinh và Energy Items có thể được Click thu thập.
- [ ] Power Crystal đến từ Wave Rewards và Power Crystal Items.
- [ ] Fusion không tiêu Energy/Power Crystal, không giới hạn Lane hoặc khoảng cách.
- [ ] Special Ability tiêu Power Crystal theo cấu hình.
- [ ] Pause đóng băng Spawn, Combat, Items, Cooldown và Effects.
- [ ] Victory chỉ xảy ra sau khi hoàn thành đủ 5 Waves và không còn Enemy.
- [ ] Enemy vượt Base Boundary gây Defeat ngay.
- [ ] Terminal event resolve trước trong Event Queue quyết định Victory/Defeat cùng tick.
- [ ] Không dùng Base HP/Lives.
- [ ] Dữ liệu thiếu hoặc sai được báo rõ trước khi bắt đầu Level.
- [ ] Save & Resume sau reload/close và permanent progression riêng được kiểm chứng.
- [ ] Achievements chỉ ghi nhận Victory; replay sau completion đầu không tăng unlock progress.
- [ ] Manual playthrough và core automated tests có bằng chứng.

## 14. Open Design Decisions

| Chủ đề | Trạng thái |
| --- | --- |
| Số Enemy và tỷ lệ Enemy theo Wave | TBD |
| Spawn Interval, Initial Delay, Wave Delay | TBD |
| Allowed Rows và Lane Selection Policy | TBD |
| Thời lượng mục tiêu của từng Wave | TBD |
| Energy Item Amount/Spawn Rate | TBD; initial/passive, Unlimited cap và lifetime đã Confirmed |
| Power Crystal implementation | Coding Planning TBD; initial 0/cap 5, random 30–60 giây, amount 1/lifetime 10 giây đã Confirmed |
| Power Crystal Reward theo từng Wave | TBD |
| Resource Caps | Confirmed: Energy Unlimited, Crystal cap 5; Pending Wave Reward manual partial claim |
| Thứ tự giới thiệu Husk/Spider/Pillager | Draft, chưa xác nhận |
| Spawn Offset và Base Boundary tọa độ chính xác | TBD |
| Background, Decoration, Tilemap, VFX/Audio | TBD |
| Tutorial/Onboarding | Confirmed: basic English in-game instructions, không interactive tutorial; UI details TBD |
| Progression/Save/Replay | Save & Resume và permanent unlocks Confirmed; initial unlocks/Achievement mapping/UI details TBD |

## 15. Tài liệu liên quan

- `docs/product/GDD.md`
- `docs/product/GAMEPLAY_MECHANICS.md`
- `docs/game-design/ENTITY_CATALOG.md`
- `docs/game-design/FUSION_RECIPES.md`
- `docs/game-design/ABILITY_CATALOG.md`
- `docs/game-design/GAME_BALANCING.md`
- `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`
- `docs/architecture/DATA_ARCHITECTURE.md`
- `docs/assets/ASSET_GUIDELINES.md`

---

**Kết thúc tài liệu — `LEVEL_DESIGN.md` — Draft v1.0**
