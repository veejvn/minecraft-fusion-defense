**Đường dẫn repository:** `docs/product/MVP_SCOPE.md`  
**Dự án:** Minecraft Fusion Defense  
**Trạng thái:** Draft v1.0 — phạm vi Confirmed được kế thừa từ tài liệu nguồn; các mục chưa chốt vẫn TBD.  
**Mục đích:** Xác định ranh giới triển khai MVP để AI Agent bắt đầu coding mà không mở rộng tính năng hoặc tự chốt Game Balancing.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu MVP

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

## 2. In Scope — Phạm vi triển khai

| Hạng mục | Functional MVP | Trạng thái |
| --- | --- | --- |
| Platform | Desktop Web PC/laptop, Local only, internal testing | Confirmed |
| Campaign / difficulty / language | Grassland, 5 Waves, 5 × 9, beginner-friendly, English-only | Confirmed |
| Content | 5 Base Defenders, 4 Enemy types, 6 approved Fusion Defenders/Recipes, 11 Special Abilities | Confirmed scope; chưa phê duyệt Ability effects/parameters |
| Fusion | Miễn phí, mọi Lane/khoảng cách, Output tại Target; 100% own Max HP, no inherited status effects, attack khi có target | Confirmed |
| Resources | Energy/Crystal values và delivery theo Gameplay Mechanics / Game Balancing | Confirmed cho các thông số đã liệt kê |
| Navigation | Main Menu, Level Selection, Settings, Achievements, Defender Collection | Confirmed |
| Instructions | Basic in-game instructions; không interactive tutorial | Confirmed |
| Persistence | Save & Resume trận sau reload/close và permanent unlock progression riêng | Confirmed; implementation TBD |
| Visual / audio | Basic Minecraft-style Pixel Art, simple animations; không yêu cầu SFX/BGM | Confirmed |
| Acceptance | Manual campaign playthrough + core automated tests | Confirmed; chi tiết test TBD |

### 2.1. Sáu Fusion Recipes

| Inputs (không phân biệt thứ tự) | Output |
| --- | --- |
| Skeleton + Skeleton | Skeleton Sniper |
| Snow Golem + Snow Golem | Ice Golem |
| Iron Golem + Snow Golem | Frost Guardian |
| Blaze + Wolf | Flame Fang |
| Blaze + Skeleton | Inferno Archer |
| Wolf + Wolf | Alpha Wolf |

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

### 2.2. Danh mục Special Abilities

| Defender | Ability ID |
| --- | --- |
| Snow Golem | `blizzard` |
| Iron Golem | `earthquake` |
| Skeleton | `arrow_storm` |
| Wolf | `pack_frenzy` |
| Blaze | `inferno` |
| Skeleton Sniper | `piercing_barrage` |
| Ice Golem | `absolute_zero` |
| Frost Guardian | `glacial_fortress` |
| Flame Fang | `wildfire_rush` |
| Inferno Archer | `meteor_arrow_rain` |
| Alpha Wolf | `alpha_howl` |

Danh mục là phạm vi MVP đã xác nhận; không suy diễn rằng mọi giá trị Damage, Duration, Radius, Cost hoặc Cooldown đã được chốt.

### 2.3. Progression và Save & Resume

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

**Confirmed:** cả Base Defenders và Fusion Recipes có unlock qua Achievements/Challenges; bộ Defender ban đầu nhỏ, phần lớn Recipe bị khóa. Chỉ ghi nhận Achievement khi Victory; Defeat không tạo unlock mới và giữ unlock đã có. Grassland được replay nhưng sau lần hoàn thành đầu, replay không tạo thêm permanent unlock progress. Starter roster, Recipe mở sẵn, điều kiện/phần thưởng Achievement và Fusion có bắt buộc để thắng hay không vẫn TBD.

## 3. Out of Scope — Không triển khai trong MVP

- Mobile/Tablet; Endless, Survival, Sandbox/Test mode; nhiều Campaign/Level/Biome ngoài Grassland.
- Online deployment (Preview/Staging/Production), multiplayer và hệ thống online cạnh tranh.
- Interactive tutorial, audio bắt buộc, Base HP/Lives.
- Defender, Enemy, Ability hoặc Recipe ngoài nội dung đã được phê duyệt.

**Confirmed:** engine Fusion data-driven không có Tier ceiling cố định. Nội dung MVP ban đầu chỉ phê duyệt 6 Recipe Tier-1 + Tier-1 → Tier-2; Tier-2/cao hơn chỉ được làm input khi có Recipe tương lai được chủ dự án phê duyệt. Hiện không có nội dung Tier cao hơn được duyệt; không tự thêm Recipe hoặc Entity.

Không tự đưa ý tưởng ngoài MVP vào Roadmap.

## 4. Quy ước kỹ thuật đã xác nhận

- Tech Stack định hướng: pnpm/Turborepo, Next.js + React, Phaser 3, TypeScript, Tailwind/shadcn, Zod, Vitest, Playwright; Tiled và Aseprite cho quy trình asset.
- Thiết kế data-driven; không Hardcode chỉ số cân bằng và Wave Composition vào gameplay logic.
- Attack Speed dùng **attacks/second**.
- Attack Range dùng **Cells**.
- Move Speed dùng **Cells/second**.
- Mục tiêu hiệu năng: 60 FPS; kiến trúc simulation fixed timestep.
- Phân chia package/module và cấu trúc triển khai chi tiết thuộc `TECHNICAL_ARCHITECTURE.md`, `GAME_ENGINE_ARCHITECTURE.md` và `DATA_ARCHITECTURE.md`, chưa tự chốt tại đây.

## 5. MVP Acceptance Criteria

**Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.

**Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.

- [ ] Local Desktop Web chạy được Campaign Grassland 5 × 9, 5 Waves.
- [ ] Summon, combat, resources, 6 Fusion Recipes và 11 Ability theo cấu hình được duyệt.
- [ ] Event Queue / terminal result theo Gameplay Mechanics.
- [ ] Achievements/unlocks chỉ ghi nhận khi Victory; replay không cấp thêm permanent unlock progress sau completion đầu.
- [ ] Save & Resume sau browser reload/close và persistent progression được kiểm chứng.
- [ ] UI/instructions/messages English-only; có basic instructions.
- [ ] Basic pixel art đạt yêu cầu; không dùng placeholder-only làm visual final.
- [ ] Manual playthrough và core automated tests có bằng chứng.

Checklist là tiêu chí chưa được kiểm chứng bằng gameplay trong nhiệm vụ sync tài liệu; không chứng minh build hoặc test đã đạt.

## 6. Open Decisions / Blockers

| Nhóm | Nội dung chưa chốt |
| --- | --- |
| Product Design | Starter Base Defenders/Recipes; Achievement criteria/rewards/unlock mapping; Fusion có bắt buộc để thắng |
| Coding Planning | Combat stats/costs; Wave composition/timing/reward amounts; Energy Item amount/spawn rate; Ability effects/area/cost/cooldown/commit/rollback |
| Coding Planning | Save schema/storage/autosave/resume details; UI; exact event generation order/edge cases; tick/update details không được baseline chốt |
| Coding Planning | Sprite dimensions/frames; test cases/coverage/harness; 0-based indexing và Loading/Ready approval status |

Energy/Crystal caps, passive Energy, Enemy rewards, Item lifetimes và Fusion output HP/status/readiness đã Confirmed, không còn TBD. Chi tiết implementation vẫn chưa được tự phê duyệt.

## 7. Nguyên tắc triển khai

1. **Notion là nguồn tài liệu thiết kế chính**; Local Markdown được đồng bộ và kiểm tra riêng.
2. Chỉ coi nội dung có nhãn **Confirmed** là quyết định đã chốt; **Draft/Proposed/Prototype/TBD** không được tự nâng cấp.
3. Nếu tính năng phụ thuộc vào một quyết định chưa chốt, AI Agent phải nêu câu hỏi rõ ràng và chờ chủ dự án xác nhận.
4. Không mở rộng MVP chỉ vì Tech Stack hoặc thư viện hỗ trợ sẵn.
5. Tài liệu này xác định **phạm vi**, không thay thế GDD, Gameplay Mechanics, Entity Catalog, Fusion Recipes, Ability Catalog, Level Design hay Game Balancing.

## 8. Tài liệu tham chiếu

- [GDD — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a)
- [Gameplay Mechanics — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660)
- [Entity Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951)
- [Fusion Recipes — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41)
- [Ability Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c)
- [Level Design — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca)
- [Game Balancing — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0)
