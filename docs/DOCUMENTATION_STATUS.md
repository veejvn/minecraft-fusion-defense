# Tình trạng tài liệu — Minecraft Fusion Defense

## 1. Thông tin kiểm tra

- **Thời điểm kiểm tra:** 2026-11-03T19:57:55+07:00 (Asia/Bangkok).
- **Repository:** `D:\Code\game\minecraft-fusion-defense`.
- **Nguồn Notion:** [Minecraft Fusion Defense — Tài liệu dự án](https://app.notion.com/p/40c62d2ce36e81df88f3df6e4c398381).
- **Báo cáo Notion:** [Tình trạng tài liệu](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d).
- **Phạm vi:** `docs/**/*.md` và `README.md`, tính cả báo cáo này; bỏ qua `.agents/`, `.gitkeep` và metadata Git.
- **Cơ sở cập nhật lần này:** truy xuất mới 11 trang vừa cleanup, Decision Baseline và 10 trang chuyên môn còn lại; so sánh section/bảng/checklist/metadata, chỉ nhập khác biệt hợp lệ.
- **Nguồn baseline:** Notion, không tạo file Local riêng vì chưa có Local Path được chỉ định. Baseline là tài liệu quyết định tham chiếu, không thay thế tài liệu chuyên môn và không được tính thành file thứ 23.
- **Chiều đồng bộ:** Notion sources + baseline → Local đã chuẩn hóa; cập nhật báo cáo Local → trang báo cáo Notion hiện có. Không sửa các trang thiết kế nguồn hoặc baseline, không tạo trang trạng thái mới.
- **Synced:** nội dung hiện hành Local đã đối chiếu nguồn chuyên môn và baseline; giữ metadata/Local hợp lệ/Draft/TBD. Không phải text mirror các đoạn nguồn bị baseline thay thế; xem 5.7.
- **Approval:** Synced không đồng nghĩa Approved cho toàn tài liệu. Giữ Draft/Proposed/Prototype/TBD cho những phần chưa được chủ dự án xác nhận.
- **Bảo vệ Local:** bắt đầu ở main, HEAD 224deb3, working tree sạch. Patch theo ngữ cảnh; Git index không đổi, không commit/push/PR.
- **Phạm vi thực tế:** đối chiếu 11 tài liệu yêu cầu; audit 22 Markdown. Sửa 5 tài liệu + báo cáo, giữ 6/11 đã tương đương; không cần sửa tài liệu ngoài danh sách.
- **Thời điểm và tính chất:** đây là ảnh chụp trạng thái của lần sync hiện tại, không phải cơ chế tự động; các trang Notion và baseline đã được truy xuất mới, kiểm tra không đổi trong quá trình xử lý.

## 2. Thống kê sau hợp nhất

| Phạm vi | Tổng Markdown | Có nội dung | Trống |
| --- | --- | --- | --- |
| `docs/` (gồm báo cáo) | 21 | 21 | 0 |
| `README.md` | 1 | 1 | 0 |
| Tổng | 22 | 22 | 0 |

| Sync Status | Số file | Giải thích |
| --- | --- | --- |
| Synced | 22 | 11 tài liệu so sánh mới (5 sửa, 6 giữ); 10 tài liệu khác audit; 1 báo cáo hai nguồn |
| Partially Synced | 0 | Không có phần sync bị bỏ dở |
| Blocked | 0 | Không có blocker truy cập hoặc quyết định Confirmed không xác định được |
| Not Updated | 0 | Tất cả file đã được kiểm tra |

Không còn Markdown trống trong danh mục hiện tại. Synced là trạng thái đồng bộ theo quyết định hiện hành, không phê duyệt gameplay implementation, các trị số chưa chốt hoặc chất lượng build.

## 3. Trạng thái từng tài liệu

| File | Local Status | Notion Status | Sync Status | Size (byte) | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/CODING_STANDARDS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81bfa8a9fbeaea7e38b6?pvs=204) | Synced | 4233 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/architecture/DATA_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b?pvs=204) | Synced | 8544 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b?pvs=204) | Synced | 14590 | Sửa tối thiểu theo cleanup; xem 5.7. |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be?pvs=204) | Synced | 9978 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/assets/ASSET_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8138bbfeeb4825fd4018?pvs=204) | Synced | 3246 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/assets/AUDIO_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81debb6cd2600b4e3ade?pvs=204) | Synced | 2980 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/assets/SPRITE_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f88288e05a9a15b0bb?pvs=204) | Synced | 3104 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/development/AI_AGENT_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832?pvs=204) | Synced | 9748 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/development/DEPLOYMENT.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ad88b2cfed46fbfd03?pvs=204) | Synced | 4575 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/development/DEVELOPMENT_WORKFLOW.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123?pvs=204) | Synced | 4045 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `docs/development/TESTING_STRATEGY.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885?pvs=204) | Synced | 6850 | Sửa tối thiểu theo cleanup; xem 5.7. |
| `docs/DOCUMENTATION_STATUS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d) | Synced | 31652 | Báo cáo hai nguồn, cùng timestamp, lịch sử được bảo toàn. |
| `docs/game-design/ABILITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c?pvs=204) | Synced | 20504 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/game-design/ENTITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951?pvs=204) | Synced | 8568 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/game-design/FUSION_RECIPES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41?pvs=204) | Synced | 10114 | Sửa tối thiểu theo cleanup; xem 5.7. |
| `docs/game-design/GAME_BALANCING.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0?pvs=204) | Synced | 22231 | Sửa tối thiểu theo cleanup; xem 5.7. |
| `docs/game-design/LEVEL_DESIGN.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca?pvs=204) | Synced | 21794 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/product/GAMEPLAY_MECHANICS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660?pvs=204) | Synced | 50386 | Sửa tối thiểu theo cleanup; xem 5.7. |
| `docs/product/GDD.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a?pvs=204) | Synced | 32675 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/product/MVP_SCOPE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb?pvs=204) | Synced | 10811 | Nguồn cleanup đã đối chiếu; nội dung hiện hành tương đương, giữ nguyên. |
| `docs/product/ROADMAP.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d?pvs=204) | Synced | 5714 | Truy xuất lại nguồn và audit Local; giữ nguyên. |
| `README.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b1935fd31fef35ed41?pvs=204) | Synced | 5593 | Truy xuất lại nguồn và audit Local; giữ nguyên. |

## 4. Tài liệu còn thiếu

Không còn tài liệu Markdown trống hoặc thiếu trang Notion tương ứng trong danh mục 22 file hiện tại.

| Nhóm | Tình trạng |
| --- | --- |
| Product | GDD, Gameplay Mechanics, MVP Scope và Roadmap đều có nội dung, Synced |
| Architecture | Technical, Game Engine, Data Architecture và Coding Standards đều có nội dung, Synced |
| Game Design | Năm catalog/tài liệu thiết kế đều có nội dung, Synced |
| Assets | Asset, Sprite và Audio Guidelines đều có nội dung, Synced |
| Development | Workflow, Testing, Deployment và AI Agent Guidelines đều có nội dung, Synced |
| README / Other | README và báo cáo đều có nội dung, Synced |

`docs/decisions/ADR/` vẫn chỉ có `.gitkeep`, chưa có ADR; không tự tạo ADR và không tính thư mục này là một file Markdown còn thiếu. Có nội dung không đồng nghĩa mọi phần đã được duyệt hoặc đã triển khai.

## 5. Các vấn đề và lịch sử xử lý

### 5.1. Bốn Conflict đồng bộ đã giải quyết

**Lịch sử:** mô tả việc đã thực hiện trước baseline 03/11/2026. Các quyết định mới được liệt kê ở mục 5.6 thay thế các quy tắc cũ; không dùng lịch sử này làm override baseline.

- **Trước hợp nhất:** GDD, Gameplay Mechanics, Entity Catalog và Fusion Recipes khác Notion, đang có thay đổi chưa commit; lần đồng bộ một chiều trước đã giữ nguyên Local và báo Conflict.
- **Cơ sở giải quyết:** chủ dự án phê duyệt báo cáo Diff. Quyết định Confirmed ngày 02/11/2026 được giữ theo nguồn quyết định cụ thể, không vì Local mới hơn.
- **GDD / Gameplay Mechanics:** giữ bản Local đã hợp nhất Fusion miễn phí (0 Energy, 0 Power Crystal), không giới hạn khoảng cách/Lane, Output tại Target Cell, Tier-1 + Tier-1 → Tier-2, 5 Base Defenders, 6 Recipes. Bổ sung ghi chú đối chiếu các nguồn chưa thống nhất; không tự chọn phương án thiết kế.
- **Entity Catalog / Fusion Recipes:** giữ nguyên toàn bộ Local; đưa metadata, ngày quyết định, nhãn Confirmed/Proposed/TBD và cảnh báo Prototype lên Notion. Không thay ID, công thức, JSON hoặc số liệu mẫu.
- **Nội dung Notion đã thay thế:** kiểm tra/trừ Energy cho Fusion và lỗi thiếu Energy; công thức Zombie Golem/Frost Creeper; ví dụ Ice Archer; Frozen World gắn roster cũ; câu hỏi Pending về những cơ chế đã có quyết định Confirmed; các cảnh báo Draft chưa dọn và bảng quyết định lặp.
- **Bảo toàn phần chưa chốt:** không loại bỏ phát biểu nguồn chưa có quyết định thay thế. Enemy Reward trên Notion và Local được lưu cùng nhau trong ghi chú chờ xác nhận của GDD.
- Các quy tắc đã bị thay thế không được khôi phục làm cơ chế hoạt động. Chưa có thay đổi Game Balancing hoặc source code.

### 5.2. Các câu hỏi thiết kế vẫn cần chủ dự án xác nhận

Các câu hỏi từng được ghi nhận ở các lần sync trước được giữ lại theo trạng thái hiện hành:

| Chủ đề / lịch sử | Trạng thái sau baseline 03/11/2026 |
| --- | --- |
| Enemy Reward trước đây chưa rõ Energy hay TBD | Resolved — Zombie 50/0, Husk 100/0, Spider 150/1, Pillager 200/1; Energy direct/Crystal Item |
| Resource cap/overflow trước đây mâu thuẫn | Resolved — Energy Unlimited; Crystal cap 5; Pending Wave Reward manual partial claim; Item đầy cap không collect, không reset timer |
| Pack Frenzy / Blizzard scope giữa các Draft | Product scope của Ability có trong MVP; effect/area/targeting cụ thể vẫn Coding Planning TBD |
| 0-based indexing, Loading/Ready status | Baseline không xác nhận các lựa chọn kỹ thuật này; giữ Draft/TBD |
| Ability spend/Commit/Rollback | Coding Planning TBD; không suy từ Item collection rules |
| Prototype Frost Guardian / Flame Fang | Vẫn chưa là balance chính thức; Output HP initialization/status/readiness đã Confirmed, không còn Proposed |
| Attack Speed/Range/Move Speed units | Giữ Confirmed: attacks/second, Cells, Cells/second; combat values chưa chốt |
| JSON placeholder minh họa | Giữ cảnh báo không dùng làm Runtime Config; chỉ cập nhật field có giá trị Confirmed, ví dụ initialEnergy = 0 |
| Blanket Defeat priority cũ / Game Engine để priority TBD | Resolved — simultaneous calculation, Event Queue insertion sequence, first resolved terminal event wins |
| Ability danh mục / ID-name labels | Giữ danh mục MVP, stable IDs và nhãn nguồn chưa được baseline thay thế; không tự nâng effects/names/technical contracts thành Approved |

**Product Design TBD:** initial unlocked Base Defenders; initial unlocked Fusion Recipes; Achievement/Challenge criteria, rewards và unlock mapping; Fusion có bắt buộc để thắng Grassland hay không.

**Coding Planning TBD:** HP/Damage/Attack Speed/Range/Move Speed/Summon Cost và combat details; Wave composition/timing/reward amounts; Energy Item amount/spawn rate; Ability effects/area/cost/cooldown/spend/commit/rollback; detailed deterministic event generation ordering và edge cases; Save & Resume storage/schema/triggers/validation; UI implementation; sprite dimensions/frames; tests/cases/coverage/harness/browser matrix. Các quy ước code/Git/CI chưa được duyệt vẫn giữ Proposed/TBD.

Không cần hỏi lại toàn bộ TBD. Chỉ hỏi chủ dự án khi coding planning gặp material blocker. Không có quyết định mới nào được AI tự phê duyệt.

### 5.3. Kết quả xác minh và phê duyệt — lịch sử lần trước

- Đã đọc toàn bộ 21 file Local, 21 trang chuyên môn Notion, baseline, hướng dẫn AI/Development Workflow và hai bản báo cáo. Notion được truy xuất trực tiếp, không dùng cache cũ làm bằng chứng.
- Đã so sánh section/bảng/checklist, xác định phần Confirmed mới, giữ phần chưa chốt và lịch sử metadata. Không có nội dung Local mới ngoài lần sync trước bị ghi đè.
- Đã kiểm tra nhất quán trên toàn bộ `docs/` và README: không còn active hard Tier ceiling, Fusion HP/status Proposed, Energy/Crystal cap TBD, Enemy Reward TBD, Save/progression ngoài MVP, audio/online deployment bắt buộc hoặc blanket Defeat priority.
- Markdown headings/tables/fences đạt; 3 JSON examples parse được. Đã kiểm tra 123 link trước cập nhật báo cáo (không có relative Markdown link trong tập này); các Notion target nằm trong các trang đã đọc. Các code paths được bảo toàn. Bổ sung link baseline ở tài liệu chuẩn hóa.
- `git diff --check` đạt (exit 0); chỉ có cảnh báo LF → CRLF từ cấu hình Git Windows, không sửa Git config. Không cần chạy gameplay tests vì không sửa source code; không tuyên bố build/gameplay đã đạt.
- Sau khi cập nhật báo cáo, đọc lại Local và trang Notion, đối chiếu cùng timestamp, bảng 22 file, file sizes, status, remaining TBDs và validation.
- Không tạo file trùng lặp, package/module hoặc baseline Markdown mới; không sửa source code, cấu trúc monorepo, Git index; không commit/push/PR. Chỉ cập nhật balance values được chủ dự án Confirmed trong tài liệu, không tạo gameplay config.

### 5.4. Năm tài liệu nền tảng đã đồng bộ

| Local File | Nguồn Notion | Kết quả |
| --- | --- | --- |
| `docs/product/MVP_SCOPE.md` | [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/DATA_ARCHITECTURE.md` | [Data Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/development/AI_AGENT_GUIDELINES.md` | [AI Agent Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |

Đây là đồng bộ tài liệu, không phải triển khai code. Mọi lựa chọn còn TBD/Proposed vẫn cần xác nhận theo đúng phạm vi công việc tiếp theo.

### 5.5. Chín tài liệu còn lại vừa đồng bộ

| Local File | Nguồn Notion | Kết quả |
| --- | --- | --- |
| `docs/architecture/CODING_STANDARDS.md` | [Coding Standards — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81bfa8a9fbeaea7e38b6?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/development/DEVELOPMENT_WORKFLOW.md` | [Development Workflow — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/development/TESTING_STRATEGY.md` | [Testing Strategy — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/development/DEPLOYMENT.md` | [Deployment — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81ad88b2cfed46fbfd03?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/assets/ASSET_GUIDELINES.md` | [Asset Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8138bbfeeb4825fd4018?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/assets/SPRITE_GUIDELINES.md` | [Sprite Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81f88288e05a9a15b0bb?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/assets/AUDIO_GUIDELINES.md` | [Audio Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81debb6cd2600b4e3ade?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `docs/product/ROADMAP.md` | [Roadmap — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |
| `README.md` | [README — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b1935fd31fef35ed41?pvs=204) | Synced — nhập từ file trống; đối chiếu đầy đủ |

Không chỉnh sửa 9 trang nguồn; không tự đưa lệnh setup vào README, cấu hình lint/CI/deploy hoặc giá trị assets/gameplay khi nguồn còn TBD.

### 5.6. Functional MVP baseline — lịch sử lần đồng bộ 03:02:56+07:00

**Nguồn quyết định:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773), các trang chuyên môn mới nhất và checklist chủ dự án trong task.

| Nhóm quyết định đã được hợp nhất | Local sections chính | Kết quả |
| --- | --- | --- |
| Functional MVP, English-only, beginner-friendly, Local/internal only, navigation/instructions, visual/no-audio acceptance | MVP Scope 1–5; GDD 1/10/12–14; README; Testing/Deployment/Assets | Confirmed đã vào section, không chỉ append cuối file |
| Save & Resume và persistent progression/Achievements/replay | MVP Scope 2.3/5; GDD 10–12; Gameplay 10/18; Game Engine/Data; Testing/Roadmap | Confirmed scope; implementation/initial unlocks vẫn TBD |
| Fusion full own Max HP/no inherited statuses/attack-ready; generic engine Tier vs six approved recipes | GDD 6; Gameplay 8/14/15; Entity/Fusion/Balancing; Game Engine/Data | Không còn engine-wide Tier-1 gate hoặc Output HP/status Proposed |
| Initial/passive Energy, Unlimited cap, Crystal initial/cap, 10s Game Time lifetimes | Gameplay 4–5; Game Balancing 7–8; Level 8; MVP scope | Confirmed values; không tự điền combat stats |
| Enemy direct Energy/Crystal drop rewards | GDD 5.3/8; Gameplay 5/6; Entity 4; Game Balancing 6 | Zombie 50/0, Husk 100/0, Spider 150/1, Pillager 200/1 |
| Pending Wave Reward, full-storage Item behavior, random Crystal attempts/cells/overlap/oldest-first collection | Gameplay 5; Game Balancing 8; Level 8 | Confirmed rules; Wave Reward amounts còn TBD |
| Simultaneous attack/movement, insertion sequence + increasing sequence numbers, first terminal event wins | Gameplay 6/10/12/14; GDD 10–11; Game Engine/Data; Ability/Level/Fusion/Testing | Thay blanket Defeat priority; generation ordering edge cases vẫn TBD |

**Đã sửa 19 tài liệu:** `docs/development/TESTING_STRATEGY.md`, `docs/development/DEPLOYMENT.md`, `docs/assets/ASSET_GUIDELINES.md`, `docs/assets/SPRITE_GUIDELINES.md`, `docs/assets/AUDIO_GUIDELINES.md`, `docs/product/ROADMAP.md`, `README.md`, `docs/product/MVP_SCOPE.md`, `docs/architecture/TECHNICAL_ARCHITECTURE.md`, `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`, `docs/architecture/DATA_ARCHITECTURE.md`, `docs/development/AI_AGENT_GUIDELINES.md`, `docs/product/GDD.md`, `docs/product/GAMEPLAY_MECHANICS.md`, `docs/game-design/ENTITY_CATALOG.md`, `docs/game-design/FUSION_RECIPES.md`, `docs/game-design/ABILITY_CATALOG.md`, `docs/game-design/LEVEL_DESIGN.md`, `docs/game-design/GAME_BALANCING.md`. Coding Standards và Development Workflow đã phù hợp nên giữ nguyên. Báo cáo là file thay đổi thứ 20.

**Raw-source caveat:** một số trang Notion chuyên môn còn giữ các đoạn Draft/superseded. Local đã xử lý theo baseline có thẩm quyền, không mirror những mâu thuẫn đó. Không sửa trang thiết kế nguồn vì nhiệm vụ là Notion → Local; trang trạng thái này lưu cách chuẩn hóa để agent sau không khôi phục nội dung cũ.

### 5.7. Đồng bộ sau Notion cleanup — 2026-11-03T19:57:55+07:00

**Overall Status:** Completed. Đọc trực tiếp mới 11/11 trang, baseline, trang báo cáo và 10 trang chuyên môn khác; đọc Local và so sánh theo section/bảng/checklist/metadata. Nguồn chuyên môn cung cấp nội dung; baseline dùng phân biệt Confirmed và đoạn cũ. Không dùng cache lần trước.

| File | Khác biệt / xử lý | Sync Status |
| --- | --- | --- |
| `docs/product/GDD.md` | Giữ — rewards/resources/output/Event Queue/scope đã hiện hành. | Synced |
| `docs/product/GAMEPLAY_MECHANICS.md` | Sửa 5.3 — nhập conceptual Ability flow mới, spend/commit/rollback TBD. | Synced |
| `docs/product/MVP_SCOPE.md` | Giữ — scope, Save/progression/resources đã đúng section. | Synced |
| `docs/game-design/GAME_BALANCING.md` | Sửa bảng 6 — Energy Reward (direct), Crystal Reward (Item); không đổi trị số. | Synced |
| `docs/game-design/LEVEL_DESIGN.md` | Giữ — resources/Event Queue đã đúng; giữ initialEnergy=0 thay vì null cũ. | Synced |
| `docs/game-design/ABILITY_CATALOG.md` | Giữ — caps/lifetimes/Event Queue Confirmed; effects/transaction Draft/TBD. | Synced |
| `docs/game-design/FUSION_RECIPES.md` | Sửa Status key: output HP/status/readiness Confirmed; mục 2 nêu Recipe approved/enabled/unlocked như mục 5. | Synced |
| `docs/game-design/ENTITY_CATALOG.md` | Giữ — roster/rewards/output đã đúng; không thay Prototype stats. | Synced |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | Sửa 7.2 — approved/enabled/unlocked Recipe; Output Tier theo Recipe, initial sáu Recipe vẫn Tier-2. | Synced |
| `docs/architecture/DATA_ARCHITECTURE.md` | Giữ — engine Tier/resource/output/event semantics đúng; schema/contracts Proposed/TBD. | Synced |
| `docs/development/TESTING_STRATEGY.md` | Sửa bảng 3 — expected resource values cụ thể; không chốt coverage/harness. | Synced |

**Thực tế sửa:** năm file ghi Sửa trong bảng và `docs/DOCUMENTATION_STATUS.md` (6 file). Không sửa trang Notion thiết kế hoặc baseline; chỉ cập nhật trang báo cáo có sẵn. Không tạo tài liệu mới, không sửa code/config/package/Git index, không commit/push/PR. Không có chỉnh sửa Local chưa commit lúc bắt đầu.

**Resolved:** bỏ metadata output-state proposal lỗi thời; Game Engine Output Tier theo Recipe thay vì cố định Tier-2; luồng Gameplay Ability không áp đặt thời điểm trừ tài nguyên chưa duyệt. Giữ Fusion miễn phí/mọi Lane-distance/Target Cell, full own Max HP/no statuses/attack-ready, 5 Base Defenders/6 Recipes, rewards 50/0, 100/0, 150/1, 200/1.

**Đoạn Notion còn cũ, không nhập lại (baseline đã phân giải):**

- GDD 6.2 bước 4 còn Tier-1 gate; 13.3 audio bắt buộc, 14.1 save “nếu cần”; block Confirmed cuối trang/baseline thay thế. Giữ Local no Tier ceiling, no required audio, Save & Resume bắt buộc.
- Gameplay 8.4/8.5 còn Tier-1-only validation; clarification cuối trang đã supersede. Giữ validation theo approved Recipe.
- Ability Catalog 13 còn Crystal cap/tần suất Item TBD; section 2/baseline chốt cap 5/random 30–60s. Không mở lại quyết định này.
- Fusion Recipes 5/7 và Data Architecture 5 còn Tier-1 input; chỉ áp dụng initial content, không là engine ceiling.
- Game Engine 5 còn same-tick priority TBD; mục 10/baseline chốt insertion sequence, chỉ generation details TBD.
- Testing Strategy 2 còn Manual/Visual Proposed; acceptance cuối trang/baseline yêu cầu manual playthrough. Giữ Local manual required.
- Checklist nguồn được tick do cập nhật văn bản không chứng minh gameplay đã chạy; giữ checklist gameplay Local chưa tick.

Không cần chủ dự án quyết định lại các nội dung đã Confirmed. Không có Conflict Local mới hoặc blocker đồng bộ. Ability Catalog mục 6/checklist/UX giữ mô tả Draft giao dịch và cảnh báo; không tự chốt spend/commit/refund. Product TBD: starter Defenders/Recipes, Achievement criteria/rewards/unlock mapping, Fusion có bắt buộc để thắng. Coding TBD: combat stats/costs, Wave composition/timing/rewards, Energy Item amount/rate, Ability effects/area/cost/cooldown/transaction, exact event generation/tick, Save storage/schema/triggers, UI/assets/test cases/coverage/harness. Chi tiết giữ ở 5.2.

**Validation:** 22 Markdown có nội dung; headings/tables/fences đạt, 3 JSON blocks parse, 125 liên kết được kiểm tra trước cập nhật báo cáo (0 relative Markdown link), 5 Base và 6 Recipe input pair không trùng; rewards/resource values khớp baseline. Audit toàn docs/ và README không thấy active rule trái các Confirmed decisions trong phạm vi. `git diff --check` exit 0; cảnh báo LF→CRLF không phải lỗi. Không chạy gameplay tests/build vì chỉ sửa tài liệu. Kích thước từng file đo lại filesystem; index SHA-256 không đổi.

**Đối chiếu:** đọc lại Local và Notion sau ghi, cùng timestamp mục 1 và bảng 22 Synced / 0 Partially Synced / 0 Blocked / 0 Not Updated. Synced là tương đương nội dung hiện hành có chuẩn hóa, không phải nguyên văn hay Approved toàn tài liệu. Không tuyên bố GitHub được cập nhật.

**Lịch sử Notion cleanup:** snapshot dưới đây là trước lần sync này; Partially Synced/bước tiếp theo đã được giải quyết, không phải trạng thái hiện hành.

#### Snapshot lịch sử — Notion source cleanup (03/11/2026)

**Loại thao tác:** Dọn dẹp trực tiếp 11 trang tài liệu chuyên môn trên Notion theo các quyết định đã Confirmed ngày 03/11/2026. Không tạo trang thay thế; giữ nguyên các Product Design và Coding Planning TBD chưa được phê duyệt.

**Trạng thái đồng bộ mới nhất:** **Partially Synced — Local/GitHub cần đồng bộ lại.** Báo cáo 22/22 Synced trong các mục bên dưới là **snapshot lịch sử của lần đồng bộ trước**, không phải xác nhận bản Markdown Local/GitHub đã nhận các chỉnh sửa Notion mới nhất. Không có thao tác nào trên filesystem Local hoặc GitHub trong lần dọn dẹp này.

| Trạng thái tính theo snapshot mới nhất | Số file | Ghi chú |
| --- | --- | --- |
| Synced từ lần kiểm tra trước, không sửa nguồn Notion lần này | 10 | Chưa cần resync do đợt cleanup |
| Partially Synced / Needs Resync | 12 | 11 file chuyên môn đã thay đổi Notion và chính `docs/DOCUMENTATION_STATUS.md` do báo cáo Notion thay đổi |
| Blocked | 0 | Không có blocker cho việc làm sạch Notion |
| Tổng | 22 | Dựa trên danh mục Markdown của lần sync trước |

**11 trang nguồn Notion đã chỉnh sửa:** GDD, Gameplay Mechanics, Game Balancing, Level Design, Ability Catalog, Fusion Recipes, Entity Catalog, MVP Scope, Game Engine Architecture, Data Architecture, Testing Strategy.

**Những mâu thuẫn đã sửa tại section chính:** Enemy death rewards; Energy Unlimited / Crystal cap 5 / Item lifetime 10s; passive Energy +50 tại t=0 và mỗi 3s; Pending Wave Reward; Fusion output 100% own Max HP/no inherited statuses/attack-ready; Fusion engine không hard Tier ceiling; Victory/Defeat cùng tick theo Event Queue insertion sequence thay vì Defeat priority mặc định; các bảng open decisions không còn coi những mục này là TBD.

**Vẫn TBD:** initial unlocked Defenders/Recipes, Achievement criteria/rewards, Fusion có bắt buộc để thắng hay không; combat stats, Wave composition/timing/rewards, Ability effects/costs/spend/commit/rollback, Energy Item amount/spawn rate, event-generation details, Save & Resume implementation specifics.

**Bước tiếp theo:** AI Coding Agent đồng bộ lại 11 trang chuyên môn vào file Markdown tương ứng, kiểm tra consistency và git diff; cập nhật `docs/DOCUMENTATION_STATUS.md`; đối chiếu và cập nhật lại trạng thái Synced tại trang Notion này. **Chỉ khi hoàn tất ở Local mới được đánh dấu 22/22 Synced trở lại.**


## 6. Công việc tiếp theo cần xác nhận

1. Chọn lát cắt coding và chỉ hỏi các Product Design/Coding Planning TBD thực sự chặn lát cắt đó.
2. Không mở lại các quyết định resource, Fusion output, Save/progression scope hoặc event resolution đã Confirmed.
3. Không tự phê duyệt starter roster, Achievement criteria, higher-tier content, combat numbers, Wave Config hoặc Ability parameters.
4. Không suy diễn file tài liệu Synced là game đã build, tests đã chạy hoặc toàn bộ kiến trúc đã Approved.
