# Tình trạng tài liệu — Minecraft Fusion Defense

## 1. Thông tin kiểm tra

- **Thời điểm kiểm tra:** 2026-11-03T03:02:56+07:00 (Asia/Bangkok).
- **Repository:** `D:\Code\game\minecraft-fusion-defense`.
- **Nguồn Notion:** [Minecraft Fusion Defense — Tài liệu dự án](https://app.notion.com/p/40c62d2ce36e81df88f3df6e4c398381).
- **Báo cáo Notion:** [Tình trạng tài liệu](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d).
- **Phạm vi:** `docs/**/*.md` và `README.md`, tính cả báo cáo này; bỏ qua `.agents/`, `.gitkeep` và metadata Git.
- **Cơ sở cập nhật lần này:** đồng bộ/chuẩn hóa toàn bộ tài liệu theo các trang Notion chuyên môn hiện tại, [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773) và yêu cầu trực tiếp trong task. Baseline chỉ thay thế những quyết định được liệt kê; các giá trị khác không tự được phê duyệt.
- **Nguồn baseline:** Notion, không tạo file Local riêng vì chưa có Local Path được chỉ định. Baseline là tài liệu quyết định tham chiếu, không thay thế tài liệu chuyên môn và không được tính thành file thứ 23.
- **Chiều đồng bộ:** Notion sources + baseline → Local đã chuẩn hóa; cập nhật báo cáo Local → trang báo cáo Notion hiện có. Không sửa các trang thiết kế nguồn hoặc baseline, không tạo trang trạng thái mới.
- **Synced:** quyết định hiện hành và nội dung liên quan đã được đưa vào đúng section Local, kiểm tra theo bộ nguồn Notion + baseline. Với 19 tài liệu được chuẩn hóa, đây không phải cam kết text Local giống nguyên văn trang Notion chuyên môn còn đoạn cũ. Lần sync sau phải áp dụng baseline trước, không khôi phục các câu đã superseded.
- **Approval:** Synced không đồng nghĩa Approved cho toàn tài liệu. Giữ Draft/Proposed/Prototype/TBD cho những phần chưa được chủ dự án xác nhận.
- **Bảo vệ Local:** mọi tài liệu đang staged (A), chưa có HEAD; đã đọc và xác nhận không có nội dung Local mới khác lần sync đã kiểm chứng trước. Dùng patch có ngữ cảnh, bảo toàn metadata/lịch sử và các phần không liên quan, không thay Git index hoặc xóa thay đổi ngoài phạm vi.
- **Phạm vi thực tế:** 21 tài liệu dự án + báo cáo trong `docs/**/*.md` và `README.md`; bỏ qua `.agents/`, `.gitkeep`, metadata Git. 19 tài liệu nội dung và báo cáo được sửa; Coding Standards/Development Workflow đã phù hợp, giữ nguyên.
- **Thời điểm và tính chất:** đây là ảnh chụp trạng thái của lần sync hiện tại, không phải cơ chế tự động; các trang Notion và baseline đã được truy xuất mới, kiểm tra không đổi trong quá trình xử lý.

## 2. Thống kê sau hợp nhất

| Phạm vi | Tổng Markdown | Có nội dung | Trống |
| --- | --- | --- | --- |
| `docs/` (gồm báo cáo) | 21 | 21 | 0 |
| `README.md` | 1 | 1 | 0 |
| Tổng | 22 | 22 | 0 |

| Sync Status | Số file | Giải thích |
| --- | --- | --- |
| Synced | 22 | 19 tài liệu đã chuẩn hóa theo nguồn + baseline; 2 tài liệu giữ nguyên đã đối chiếu; 1 báo cáo Local/Notion |
| Partially Synced | 0 | Không có phần sync bị bỏ dở |
| Blocked | 0 | Không có blocker truy cập hoặc quyết định Confirmed không xác định được |
| Not Updated | 0 | Tất cả file đã được kiểm tra |

Không còn Markdown trống trong danh mục hiện tại. Synced là trạng thái đồng bộ theo quyết định hiện hành, không phê duyệt gameplay implementation, các trị số chưa chốt hoặc chất lượng build.

## 3. Trạng thái từng tài liệu

| File | Local Status | Notion Status | Sync Status | Size (byte) | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/CODING_STANDARDS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81bfa8a9fbeaea7e38b6?pvs=204) | Synced | 4233 | Đã đọc lại và đối chiếu; giữ nguyên nội dung. |
| `docs/architecture/DATA_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b?pvs=204) | Synced | 8544 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b?pvs=204) | Synced | 14444 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be?pvs=204) | Synced | 9978 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/assets/ASSET_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8138bbfeeb4825fd4018?pvs=204) | Synced | 3246 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/assets/AUDIO_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81debb6cd2600b4e3ade?pvs=204) | Synced | 2980 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/assets/SPRITE_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f88288e05a9a15b0bb?pvs=204) | Synced | 3104 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/development/AI_AGENT_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832?pvs=204) | Synced | 9748 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/development/DEPLOYMENT.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ad88b2cfed46fbfd03?pvs=204) | Synced | 4575 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/development/DEVELOPMENT_WORKFLOW.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123?pvs=204) | Synced | 4045 | Đã đọc lại và đối chiếu; giữ nguyên nội dung. |
| `docs/development/TESTING_STRATEGY.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885?pvs=204) | Synced | 6777 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/DOCUMENTATION_STATUS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d) | Synced | 24989 | Báo cáo hai nguồn được đọc lại và đối chiếu cùng lần sync. |
| `docs/game-design/ABILITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c?pvs=204) | Synced | 20504 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/game-design/ENTITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951?pvs=204) | Synced | 8568 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/game-design/FUSION_RECIPES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41?pvs=204) | Synced | 9985 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/game-design/GAME_BALANCING.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0?pvs=204) | Synced | 22215 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/game-design/LEVEL_DESIGN.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca?pvs=204) | Synced | 21794 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/product/GAMEPLAY_MECHANICS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660?pvs=204) | Synced | 50168 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/product/GDD.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a?pvs=204) | Synced | 32675 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/product/MVP_SCOPE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb?pvs=204) | Synced | 10811 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `docs/product/ROADMAP.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d?pvs=204) | Synced | 5714 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |
| `README.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b1935fd31fef35ed41?pvs=204) | Synced | 5593 | Chuẩn hóa section/bảng/checklist theo Notion + baseline 03/11; không copy nguyên văn các đoạn superseded. |

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

### 5.3. Kết quả xác minh và phê duyệt

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

### 5.6. Functional MVP baseline — đồng bộ lần hiện tại

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

## 6. Công việc tiếp theo cần xác nhận

1. Chọn lát cắt coding và chỉ hỏi các Product Design/Coding Planning TBD thực sự chặn lát cắt đó.
2. Không mở lại các quyết định resource, Fusion output, Save/progression scope hoặc event resolution đã Confirmed.
3. Không tự phê duyệt starter roster, Achievement criteria, higher-tier content, combat numbers, Wave Config hoặc Ability parameters.
4. Không suy diễn file tài liệu Synced là game đã build, tests đã chạy hoặc toàn bộ kiến trúc đã Approved.
