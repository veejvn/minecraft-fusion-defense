# Tình trạng tài liệu — Minecraft Fusion Defense

## Current Documentation Status — Notion Source Cleanup

**Revision timestamp:** 2026-11-03T21:50:56+07:00. R1 là snapshot validation đã được Approve; checkpoint xuất bản bên dưới cập nhật trạng thái hiện hành. Đây là phần trạng thái hiện hành duy nhất; các mục 5.x và khối Product Design Update nhúng đều là lịch sử superseded.

| Loại trạng thái | Kết quả hiện hành | Phạm vi / bằng chứng |
| --- | --- | --- |
| Documentation Content Sync | Completed | Local đã phản ánh Product Design Confirmed Baseline; 7 Recipe pairs, 7 Fusion outputs, unlock/replay/optional được kiểm tra lại bên dưới. Không có nghĩa raw Notion text đã sạch hoặc mọi TBD được duyệt |
| Notion Source Consistency | Resolved on Source — Verified (3 tracked pages) | Testing Strategy, AI Agent Guidelines và Roadmap đã cleanup, đọc lại xác minh; không là cam kết audit toàn workspace |
| GitHub Publication | Product Design published; cleanup checkpoint uncommitted | Product Design + R1 tại b5856a4 đã xác minh trước; HEAD Local lúc bắt đầu cleanup 37940ff3723b07faecf49127178cc06989ee4fd5. Không commit/push trong cleanup task |
| Notion Documentation Status | Status Sync Completed | Checkpoint Local/Notion cùng SHA và timestamp sau đọc lại; lịch sử R1 không ghi Notion được giữ như lịch sử |

**Revision 1 scope — historical:** chỉ sửa `docs/DOCUMENTATION_STATUS.md`. 17 Markdown modifications đã tồn tại trước R1, không có staged changes. R1 không sửa 16 tài liệu còn lại, source/config/dependencies, index, file patch cũ hoặc bất kỳ trang Notion nào. Cumulative patch vẫn có 17 modified files; không có added/deleted project files.

### GitHub Publication — Product Design Documentation Sync (historical checkpoint)

- **GitHub Publication:** Published — Verified cho commit Product Design + R1.
- **Verified SHA:** [b5856a4f25b802c3da8b694a0d175a7f911ab35c](https://github.com/veejvn/minecraft-fusion-defense/commit/b5856a4f25b802c3da8b694a0d175a7f911ab35c).
- **Branch / remote:** main / origin, https://github.com/veejvn/minecraft-fusion-defense.
- **Parent:** 1bd5c4fdef031e416b86cb4acb4ba9686c34fc6f.
- **Commit timestamp:** 2026-11-03T21:59:25+07:00 (không phải timestamp push).
- **Push/remote verification timestamp:** 2026-11-03T22:00:48+07:00 (Asia/Bangkok). Push exit 0; GitHub API main và commit endpoint xác nhận SHA/parent/timestamp/file list/stats; không suy từ local tracking ref.
- **Commit message:** docs: sync confirmed product design and fusion progression.
- **Published scope:** 17 Markdown, +290/-126 dòng. Staged diff khớp byte với approved R1 patch (SHA-256 68cd0436407ed3e1571f2660967417198b550d2b44e6fe4e13a7d541ceb51cb7).
- **Published files:** `README.md`, `docs/DOCUMENTATION_STATUS.md`, `docs/architecture/DATA_ARCHITECTURE.md`, `docs/architecture/GAME_ENGINE_ARCHITECTURE.md`, `docs/assets/ASSET_GUIDELINES.md`, `docs/assets/SPRITE_GUIDELINES.md`, `docs/development/AI_AGENT_GUIDELINES.md`, `docs/development/TESTING_STRATEGY.md`, `docs/game-design/ABILITY_CATALOG.md`, `docs/game-design/ENTITY_CATALOG.md`, `docs/game-design/FUSION_RECIPES.md`, `docs/game-design/GAME_BALANCING.md`, `docs/game-design/LEVEL_DESIGN.md`, `docs/product/GAMEPLAY_MECHANICS.md`, `docs/product/GDD.md`, `docs/product/MVP_SCOPE.md`, `docs/product/ROADMAP.md`.
- **Preflight evidence:** final rerun 12 validation checks PASS; 22 Markdown, 7 unique Recipes (4 same/3 cross), 5 Base/7 Fusion/4 Enemies, 12 required Abilities, 2 starter Base/2 starter Recipes; unlock/replay/Fusion optional đúng baseline. Steel Guardian IDs/Ability/stats giữ TBD. Git diff/cached checks đạt trước commit. Không đổi source/runtime config/balance/Waves hoặc TBD.
- **Documentation Content Sync:** Completed theo Confirmed Baseline; **Notion Source Consistency:** Cleanup Pending (Testing Strategy, AI Agent Guidelines, Roadmap). Không sửa các trang source/baseline trong task.
- **Checkpoint state:** Local updated; Notion report updated và đọc lại đối chiếu SHA/timestamp/status. Checkpoint này tạo thay đổi mới chỉ ở `docs/DOCUMENTATION_STATUS.md`, chưa staged/commit/push; không thuộc commit b5856a4. Không tạo commit thứ hai.
- **Remaining TBD:** Steel Guardian Entity/Recipe/Ability IDs/name/effects/stats, combat balance, Wave Config, Ability cost/cooldown/transactions, Save schema/triggers và detailed event generation vẫn chưa được tự phê duyệt.

### Notion Source Cleanup — Resolved on Source / Verified

**Cleanup timestamp:** 2026-11-03T22:25:02+07:00. Owner authorization: “cho phép task Notion Source Cleanup”. Đã đọc mới ba trang, Decision Baseline và báo cáo trước sửa; chỉ thay đoạn cũ có quyết định Confirmed rõ ràng. Không sửa Decision Baseline hoặc thêm quyết định gameplay.

| Source | Section / thay đổi đã xác minh sau ghi | Status |
| --- | --- | --- |
| [Testing Strategy](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885) | Confirmed MVP test acceptance: replay Victories cộng tiến độ, Defeat không cộng, persistent/idempotent unlocks; mapping 2 starter Base/2 starter Recipes và 5 auto Recipes; Fusion optional. Bảng 2 Manual playthrough Required — Confirmed, implementation/benchmark TBD | Resolved on Source — Verified |
| [AI Agent Guidelines](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832) | Confirmed AI Coding Agent handoff: 7 Recipes gồm Steel Guardian, initial unlocks và Achievement mapping Confirmed, replay Victory hợp lệ; 12 Ability definitions với 11 existing draft IDs và Steel Guardian Ability/technical IDs TBD | Resolved on Source — Verified |
| [Roadmap](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d) | Confirmed MVP roadmap scope: mapping đã Confirmed, chỉ balance/UI/tracking/Steel Guardian details TBD. Workstream Level & Abilities: 12 required definitions thay 11 | Resolved on Source — Verified |

**Current scope:** ba nguồn cleanup đã xác minh, không suy rộng rằng mọi đoạn của mọi trang Notion đều đã audit. Local specialist Markdown đã phản ánh các quyết định này từ Product Design Sync, nên giữ nguyên. Chỉ báo cáo Local thay đổi, báo cáo Notion cập nhật cùng lượt và được đọc lại đối chiếu. Các trạng thái Cleanup Pending bên dưới thuộc snapshot lịch sử tại thời điểm cũ.

**TBD preserved:** combat balance, Wave Config, Ability parameters/cost/cooldown/spend/commit/rollback, Steel Guardian Entity/Recipe/Ability IDs/name/effects/stats, Save implementation, event-generation ordering, testing coverage/harness/browser/CI vẫn chưa được tự chốt. Không thay resource rewards, runtime code hoặc balance data.

**Verification:** targeted replacements đọc lại đều có nội dung mới; không còn ba phát biểu cũ trong các section đang hoạt động. Không sửa đoạn nguồn khác ngoài các replacement được liệt kê. Git index không đổi; chỉ Local Documentation Status modified; không stage/commit/push/PR. Checkpoint cleanup mới chưa xuất bản GitHub.

### Historical Snapshot — Superseded: Notion Source Cleanup Pending — Non-blocking Documentation Debt

Decision Baseline Confirmed ưu tiên các đoạn nguồn cũ: [Decision Baseline](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773), đọc trực tiếp lại trong R1. Đây là nợ tài liệu nguồn, không tạo gameplay decision mới.

| Notion source | Section / bằng chứng ngắn được đọc lại | Kết quả |
| --- | --- | --- |
| [Testing Strategy](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885) | Confirmed MVP test acceptance — 03/11/2026: “no additional progress on replay after first completion” | Cleanup Pending — Reverified; source last edited 2026-11-03T14:22:17.681Z |
| [AI Agent Guidelines](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832) | Confirmed AI Coding Agent handoff — 03/11/2026: “initial content includes only six recipes”; tiếp tục gọi initial unlocks/achievements cần approval | Cleanup Pending — Reverified; source last edited 2026-11-03T14:22:22.557Z |
| [Roadmap](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d) | Confirmed MVP roadmap scope — 03/11/2026: “Exact achievement mapping and balance TBD.” Mapping đã Confirmed; balance vẫn TBD | Cleanup Pending — Reverified; source last edited 2026-11-03T14:22:20.527Z |

Các trang chỉ được đọc, không được sửa trong R1. Không tuyên bố source cleanup hoàn tất. Notion report cũng chỉ được đọc; snapshot trước R1 còn ghi Completed và 22 Synced, cần được hiểu theo bằng chứng và giới hạn của lần đó.

### Validation Evidence — Revision 1

Script và kết quả độc lập lưu ngoài repository, thư mục `revision-1` trong artifact workspace: `validate.py`, `validation-evidence.json`, `initial-state.json`. Chạy từ repo root: `python <absolute-path-to-revision-1/validate.py>`. Script đọc toàn bộ 22 Markdown, không ghi repository; so hash với initial-state để phát hiện sửa ngoài phạm vi. JSON chứa actual rows, IDs, mapping, line references/TBD excerpts và command results.

| Check | Result | Evidence |
| --- | --- | --- |
| Markdown file count / missing / empty | PASS | 22 files; actual inventory bằng danh mục 22 unique paths, không thiếu/trống |
| Fusion Recipe count / unordered duplicates | PASS | FUSION_RECIPES §3: 7 rows, 7 unique pairs, 4 same-type + 3 cross-type |
| Fusion Defender / Base / Enemy count | PASS | ENTITY_CATALOG §2–4: 7 Tier-2 rows, 5 Base rows; Zombie/Husk/Spider/Pillager |
| Initial unlock mapping | PASS | FUSION_RECIPES §3 unlock tables: 2 starter Base Iron Golem/Skeleton, 2 starter Recipes Skeleton Sniper/Steel Guardian; Snow first Victory, Wolf 50 Victory-battle kills, Blaze 5 Victories; five auto-unlock mappings checked |
| Achievement replay rules | PASS | GAMEPLAY_MECHANICS §18: Replay Victory cộng tiến độ; Defeat không cộng; unlock persistent, reward idempotent |
| Fusion optional | PASS | GAMEPLAY_MECHANICS §18, LEVEL_DESIGN §8.3, MVP_SCOPE §2.3; không thêm Fusion count prerequisite |
| Required Abilities / duplicate IDs | PASS | ABILITY_CATALOG §3: 12 rows = 11 unique draft IDs + 1 TBD placeholder; không coi repeated TBD là runtime ID |
| Steel Guardian TBD preservation | PASS | FUSION_RECIPES §3/ENTITY_CATALOG §3/ABILITY_CATALOG §5.7: Entity/Recipe/Ability IDs, Ability name/effects và combat stats TBD; không có invented steel_guardian identifiers |
| Other TBD / Draft preservation | PASS for R1 scope | Hashes chứng minh không sửa gameplay docs trong R1. JSON evidence liệt kê TBD dòng cụ thể của balance/Wave/Ability/Save/Event Queue; không coi Draft/Prototype là approved |
| Markdown integrity / JSON / links | PASS | 22 files parsed; tables/fences/headings checked; 3 JSON examples parse; relative path existence checked. External links chỉ kiểm tra cú pháp, không exhaustive HTTP availability |
| Git diff check | PASS | git diff --check exit 0; LF→CRLF warnings không là lỗi whitespace |
| Notion source consistency | Pending — Verified | Ba nguồn còn mâu thuẫn, section/excerpt/source edited time ở bảng cleanup |
| Unexpected R1 changes / Git index | PASS | File hashes so với initial-state; chỉ Documentation Status được phép khác, index SHA-256 unchanged |

**Not Executed:** full gameplay tests/build, Markdown linter riêng (không có cấu hình/tool chuyên biệt được xác nhận), exhaustive external HTTP link checks, live GitHub branch verification; không cần cho correction-only và không tuyên bố các mục này PASS. Custom structural validator đã chạy thực tế, không thay thế lint chuẩn nếu sau này có.

**Remaining TBD:** Steel Guardian Entity/Recipe IDs, Ability ID/name/effect/cost/cooldown và combat identity/stats/targeting; Wave composition/timing/rewards; Ability transactions; Save schema/triggers; detailed Event Queue generation/fixed timestep. Không có TBD mới được tự phê duyệt. Initial unlock mapping/replay progression/Fusion optional đã Confirmed, không phải TBD.

**Next Action — R1 historical:** reviewer xem cumulative `product-design-documentation-review-r1.patch` và evidence bên ngoài repository. Một task riêng cần cho phép cleanup ba Notion sources và cập nhật Notion report; chỉ commit/push sau phê duyệt rõ ràng. R1 không thực hiện các bước đó.

---

## 1. Metadata lần Product Design Sync trước R1

- **Dấu mốc xuất bản GitHub đã kiểm chứng trước đây (historical):** Final Sync đã xuất bản tại `0812d3a`; kiểm chứng 2026-11-03T20:50:35+07:00. Bản ghi dấu mốc mới chưa commit/push; xem 5.9.
- **Thời điểm kiểm tra:** 2026-11-03T21:36:01+07:00 (Asia/Bangkok).
- **Repository:** `D:\Code\game\minecraft-fusion-defense`.
- **Nguồn Notion:** [Minecraft Fusion Defense — Tài liệu dự án](https://app.notion.com/p/40c62d2ce36e81df88f3df6e4c398381).
- **Báo cáo Notion:** [Tình trạng tài liệu](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d).
- **Phạm vi:** `docs/**/*.md` và `README.md`, tính cả báo cáo này; bỏ qua `.agents/`, `.gitkeep` và metadata Git.
- **Cơ sở cập nhật lần này:** Product Design Sync: 14 nguồn chuyên môn + baseline mới + báo cáo được fetch trực tiếp, đầy đủ; 22 Markdown audited. Xem 5.10.
- **Nguồn baseline:** Notion, không tạo file Local riêng vì chưa có Local Path được chỉ định. Baseline là tài liệu quyết định tham chiếu, không thay thế tài liệu chuyên môn và không được tính thành file thứ 23.
- **Chiều đồng bộ:** Notion sources + baseline → Local đã chuẩn hóa; cập nhật báo cáo Local → trang báo cáo Notion hiện có. Không sửa các trang thiết kế nguồn hoặc baseline, không tạo trang trạng thái mới.
- **Synced:** nội dung hiện hành Local đã đối chiếu nguồn chuyên môn và baseline; giữ metadata/Local hợp lệ/Draft/TBD. Không phải text mirror các đoạn nguồn bị baseline thay thế; xem 5.7.
- **Approval:** Synced không đồng nghĩa Approved cho toàn tài liệu. Giữ Draft/Proposed/Prototype/TBD cho những phần chưa được chủ dự án xác nhận.
- **Bảo vệ Local:** main, HEAD 1bd5c4fdef031e416b86cb4acb4ba9686c34fc6f; working tree/index sạch lúc bắt đầu. Không git add/commit/push/PR, không thay index.
- **Phạm vi thực tế:** 14 nguồn chuyên môn Updated + 2 file Asset/Sprite Guidelines ngoài danh sách để sửa counts + báo cáo = 17 Markdown modified; 5 file còn lại No Change Required.
- **Thời điểm và tính chất:** đây là ảnh chụp trạng thái của lần sync hiện tại, không phải cơ chế tự động; các trang Notion và baseline đã được truy xuất mới, kiểm tra không đổi trong quá trình xử lý.

## 2. Thống kê Local — Revision 1

| Phạm vi | Tổng Markdown | Có nội dung | Trống |
| --- | --- | --- | --- |
| `docs/` (gồm báo cáo) | 21 | 21 | 0 |
| `README.md` | 1 | 1 | 0 |
| Tổng | 22 | 22 | 0 |

| Sync Status | Số file | Giải thích |
| --- | --- | --- |
| Synced | 22 | Nội dung chuyên môn Local theo Confirmed Baseline + báo cáo Local/Notion; raw source cleanup vẫn Pending |
| Partially Synced | 0 | Báo cáo R1 và checkpoint đã được đồng bộ trong publication task được cho phép |
| Blocked | 0 | Không có blocker truy cập hoặc quyết định Confirmed không xác định được |
| Not Updated | 0 | Tất cả file đã được kiểm tra |

Không còn Markdown trống trong danh mục hiện tại. Synced là trạng thái đồng bộ theo quyết định hiện hành, không phê duyệt gameplay implementation, các trị số chưa chốt hoặc chất lượng build.

## 3. Trạng thái từng tài liệu — Local / Confirmed Baseline

| File | Local Status | Notion Status | Sync Status | Size (byte) | Notes |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/CODING_STANDARDS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81bfa8a9fbeaea7e38b6?pvs=204) | Synced | 4233 | No Change Required sau audit Product Design. |
| `docs/architecture/DATA_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b?pvs=204) | Synced | 9029 | Product Design Synced — Updated; xem 5.10. |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b?pvs=204) | Synced | 15160 | Product Design Synced — Updated; xem 5.10. |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be?pvs=204) | Synced | 9978 | No Change Required sau audit Product Design. |
| `docs/assets/ASSET_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8138bbfeeb4825fd4018?pvs=204) | Synced | 3307 | Product Design Synced — Updated; xem 5.10. |
| `docs/assets/AUDIO_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81debb6cd2600b4e3ade?pvs=204) | Synced | 2980 | No Change Required sau audit Product Design. |
| `docs/assets/SPRITE_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f88288e05a9a15b0bb?pvs=204) | Synced | 3120 | Product Design Synced — Updated; xem 5.10. |
| `docs/development/AI_AGENT_GUIDELINES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832?pvs=204) | Synced | 10350 | Product Design Synced — Updated; xem 5.10. |
| `docs/development/DEPLOYMENT.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ad88b2cfed46fbfd03?pvs=204) | Synced | 4575 | No Change Required sau audit Product Design. |
| `docs/development/DEVELOPMENT_WORKFLOW.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81ccb23dea79a85f7123?pvs=204) | Synced | 4045 | No Change Required sau audit Product Design. |
| `docs/development/TESTING_STRATEGY.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885?pvs=204) | Synced | 7499 | Product Design Synced — Updated; xem 5.10. |
| `docs/DOCUMENTATION_STATUS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d) | Synced | 59879 | Publication checkpoint Local/Notion; bản ghi mới chưa commit. |
| `docs/game-design/ABILITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c?pvs=204) | Synced | 20997 | Product Design Synced — Updated; xem 5.10. |
| `docs/game-design/ENTITY_CATALOG.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951?pvs=204) | Synced | 8984 | Product Design Synced — Updated; xem 5.10. |
| `docs/game-design/FUSION_RECIPES.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41?pvs=204) | Synced | 11897 | Product Design Synced — Updated; xem 5.10. |
| `docs/game-design/GAME_BALANCING.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0?pvs=204) | Synced | 22446 | Product Design Synced — Updated; xem 5.10. |
| `docs/game-design/LEVEL_DESIGN.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca?pvs=204) | Synced | 22073 | Product Design Synced — Updated; xem 5.10. |
| `docs/product/GAMEPLAY_MECHANICS.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660?pvs=204) | Synced | 49691 | Product Design Synced — Updated; xem 5.10. |
| `docs/product/GDD.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a?pvs=204) | Synced | 32655 | Product Design Synced — Updated; xem 5.10. |
| `docs/product/MVP_SCOPE.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb?pvs=204) | Synced | 11234 | Product Design Synced — Updated; xem 5.10. |
| `docs/product/ROADMAP.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d?pvs=204) | Synced | 6054 | Product Design Synced — Updated; xem 5.10. |
| `README.md` | Có nội dung | [Có trang](https://app.notion.com/p/40c62d2ce36e81b1935fd31fef35ed41?pvs=204) | Synced | 5924 | Product Design Synced — Updated; xem 5.10. |

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

## 5. Historical Snapshot — Superseded

Mọi mục 5.1–5.10, bảng và trạng thái nhúng bên dưới là snapshot lịch sử. Timestamp, SHA, kết quả audit và số liệu được giữ theo thời điểm gốc; không thay thế Current Documentation Status — Revision 1 ở đầu tài liệu.

### 5.1. Bốn Conflict đồng bộ đã giải quyết — Historical Snapshot — Superseded

**Lịch sử:** mô tả việc đã thực hiện trước baseline 03/11/2026. Các quyết định mới được liệt kê ở mục 5.6 thay thế các quy tắc cũ; không dùng lịch sử này làm override baseline.

- **Trước hợp nhất:** GDD, Gameplay Mechanics, Entity Catalog và Fusion Recipes khác Notion, đang có thay đổi chưa commit; lần đồng bộ một chiều trước đã giữ nguyên Local và báo Conflict.
- **Cơ sở giải quyết:** chủ dự án phê duyệt báo cáo Diff. Quyết định Confirmed ngày 02/11/2026 được giữ theo nguồn quyết định cụ thể, không vì Local mới hơn.
- **GDD / Gameplay Mechanics:** giữ bản Local đã hợp nhất Fusion miễn phí (0 Energy, 0 Power Crystal), không giới hạn khoảng cách/Lane, Output tại Target Cell, Tier-1 + Tier-1 → Tier-2, 5 Base Defenders, 6 Recipes. Bổ sung ghi chú đối chiếu các nguồn chưa thống nhất; không tự chọn phương án thiết kế.
- **Entity Catalog / Fusion Recipes:** giữ nguyên toàn bộ Local; đưa metadata, ngày quyết định, nhãn Confirmed/Proposed/TBD và cảnh báo Prototype lên Notion. Không thay ID, công thức, JSON hoặc số liệu mẫu.
- **Nội dung Notion đã thay thế:** kiểm tra/trừ Energy cho Fusion và lỗi thiếu Energy; công thức Zombie Golem/Frost Creeper; ví dụ Ice Archer; Frozen World gắn roster cũ; câu hỏi Pending về những cơ chế đã có quyết định Confirmed; các cảnh báo Draft chưa dọn và bảng quyết định lặp.
- **Bảo toàn phần chưa chốt:** không loại bỏ phát biểu nguồn chưa có quyết định thay thế. Enemy Reward trên Notion và Local được lưu cùng nhau trong ghi chú chờ xác nhận của GDD.
- Các quy tắc đã bị thay thế không được khôi phục làm cơ chế hoạt động. Chưa có thay đổi Game Balancing hoặc source code.

### 5.2. Các câu hỏi thiết kế — lịch sử trước Product Design 5.10 — Historical Snapshot — Superseded

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

### 5.3. Kết quả xác minh và phê duyệt — lịch sử lần trước — Historical Snapshot — Superseded

- Đã đọc toàn bộ 21 file Local, 21 trang chuyên môn Notion, baseline, hướng dẫn AI/Development Workflow và hai bản báo cáo. Notion được truy xuất trực tiếp, không dùng cache cũ làm bằng chứng.
- Đã so sánh section/bảng/checklist, xác định phần Confirmed mới, giữ phần chưa chốt và lịch sử metadata. Không có nội dung Local mới ngoài lần sync trước bị ghi đè.
- Đã kiểm tra nhất quán trên toàn bộ `docs/` và README: không còn active hard Tier ceiling, Fusion HP/status Proposed, Energy/Crystal cap TBD, Enemy Reward TBD, Save/progression ngoài MVP, audio/online deployment bắt buộc hoặc blanket Defeat priority.
- Markdown headings/tables/fences đạt; 3 JSON examples parse được. Đã kiểm tra 123 link trước cập nhật báo cáo (không có relative Markdown link trong tập này); các Notion target nằm trong các trang đã đọc. Các code paths được bảo toàn. Bổ sung link baseline ở tài liệu chuẩn hóa.
- `git diff --check` đạt (exit 0); chỉ có cảnh báo LF → CRLF từ cấu hình Git Windows, không sửa Git config. Không cần chạy gameplay tests vì không sửa source code; không tuyên bố build/gameplay đã đạt.
- Sau khi cập nhật báo cáo, đọc lại Local và trang Notion, đối chiếu cùng timestamp, bảng 22 file, file sizes, status, remaining TBDs và validation.
- Không tạo file trùng lặp, package/module hoặc baseline Markdown mới; không sửa source code, cấu trúc monorepo, Git index; không commit/push/PR. Chỉ cập nhật balance values được chủ dự án Confirmed trong tài liệu, không tạo gameplay config.

### 5.4. Năm tài liệu nền tảng đã đồng bộ — Historical Snapshot — Superseded

| Local File | Nguồn Notion | Kết quả |
| --- | --- | --- |
| `docs/product/MVP_SCOPE.md` | [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/TECHNICAL_ARCHITECTURE.md` | [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/architecture/DATA_ARCHITECTURE.md` | [Data Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |
| `docs/development/AI_AGENT_GUIDELINES.md` | [AI Agent Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832?pvs=204) | Synced — nhập từ file trống, đã đọc lại đầy đủ |

Đây là đồng bộ tài liệu, không phải triển khai code. Mọi lựa chọn còn TBD/Proposed vẫn cần xác nhận theo đúng phạm vi công việc tiếp theo.

### 5.5. Chín tài liệu còn lại vừa đồng bộ — Historical Snapshot — Superseded

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

### 5.6. Functional MVP baseline — lịch sử lần đồng bộ 03:02:56+07:00 — Historical Snapshot — Superseded

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

### 5.7. Đồng bộ sau Notion cleanup — 2026-11-03T19:57:55+07:00 — Historical Snapshot — Superseded

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

**Historical Snapshot — Superseded: trạng thái tại thời điểm ghi nhận:** **Partially Synced — Local/GitHub cần đồng bộ lại.** Báo cáo 22/22 Synced trong các mục bên dưới là **snapshot lịch sử của lần đồng bộ trước**, không phải xác nhận bản Markdown Local/GitHub đã nhận các chỉnh sửa Notion mới nhất. Không có thao tác nào trên filesystem Local hoặc GitHub trong lần dọn dẹp này.

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


### 5.8. Final Documentation Sync — 2026-11-03T20:25:26+07:00 — Historical Snapshot — Superseded

- **Documentation Content Sync:** Completed.
- **Git Working Tree:** Uncommitted Changes (4 Markdown modified).
- **GitHub Published:** Pending Owner Approval. Không có commit/push/PR trong task; không xác nhận GitHub đã nhận bản Local mới.
- **Repository ban đầu:** main, HEAD acb7bc0, working tree sạch. Index không thay đổi.

| Nguồn Notion / Local | Kết quả | Diff tối thiểu |
| --- | --- | --- |
| GDD — `docs/product/GDD.md` | Synced — Updated | 13.3 khôi phục 9 audio cues hữu ích, đúng nhãn Proposed cho giai đoạn sau; audio không là acceptance blocker |
| Gameplay Mechanics — `docs/product/GAMEPLAY_MECHANICS.md` | Synced — Updated | 8.7 failure yêu cầu approved/enabled/unlocked Recipe, IDs/Tiers khớp; không engine-wide Tier-1 rejection |
| Game Engine Architecture — `docs/architecture/GAME_ENGINE_ARCHITECTURE.md` | Synced — Updated | 5 ghi rõ terminal state đã resolve không chuyển sang terminal state khác trong cùng trận |

**Verified — No Change Required tại các phần đã đúng:** GDD 6.2 Fusion input IDs/Tiers theo approved Recipe, 14 Save & Resume/permanent progression bắt buộc; Gameplay 8.4 đã validate approved/enabled/unlocked Recipe và không fixed Tier ceiling; Engine 5/6 đã có simultaneous attack/movement, insertion sequence, first resolved terminal event wins. Không sửa lại cách diễn đạt những phần này. Sáu initial Recipes/5 Base Defenders, miễn phí, mọi Lane/distance và Target Cell giữ nguyên. Không tạo higher-tier content.

**Nguồn:** ba trang có link trong bảng 3 được fetch trực tiếp mới, cùng Decision Baseline (chỉ đọc). Không sửa trang thiết kế Notion hoặc baseline. Các cảnh báo GDD/Gameplay/Engine còn cũ ở lịch sử 5.7 là snapshot trước cleanup mới; không áp dụng như trạng thái hiện hành.

**Conflicts:** không có Local conflict hoặc blocker cần chủ dự án chọn. Các quy tắc Confirmed liên quan đã đồng nhất về nội dung, không yêu cầu text mirror. Không có file ngoài 3 tài liệu và báo cáo bị sửa.

**TBD bảo toàn:** enum/Loading-Ready/full transitions, command policies chưa chốt, detailed event generation/fixed timestep; Save storage/schema/triggers/validation; combat balance, Ability cost/effects/transaction, Wave config/rewards, starter roster/Recipe/Achievement mapping. Draft/Proposed/Prototype không được nâng thành Confirmed. Các mô tả giao dịch Ability Draft được giữ với cảnh báo, chưa tự chốt contract.

**Audit/validation:** toàn bộ 22 Markdown có nội dung; headings/tables/fences, internal links/relative paths đạt; 3 JSON examples parse, code blocks và nguồn Notion được giữ. Không thêm section trùng vào tài liệu chuyên môn. Không thấy active rule trái Confirmed trong các nhóm Tier/audio/Save/progression/Event Queue/resource caps/Enemy rewards/Fusion output. `git diff --check` đạt. Repository không có Markdown lint chuyên biệt; không cài dependency, không chạy gameplay suite/build vì không sửa source code. Đọc lại báo cáo Local và Notion cùng timestamp, 22 Synced/0 Partially Synced/0 Blocked/0 Not Updated; kích thước đo lại filesystem. Git index SHA-256 không đổi.

**Git Diff để review:** 3 tài liệu chuyên môn có 6 dòng thêm/2 dòng xóa trước cập nhật báo cáo. Báo cáo là file thứ 4. Toàn bộ thay đổi giữ ở working tree, xem `git diff -- docs/product/GDD.md docs/product/GAMEPLAY_MECHANICS.md docs/architecture/GAME_ENGINE_ARCHITECTURE.md docs/DOCUMENTATION_STATUS.md`.

### 5.9. Dấu mốc xuất bản GitHub — 2026-11-03T20:50:35+07:00 — Historical Snapshot — Superseded

- **GitHub Published — Final Documentation Sync:** Completed, xác minh trực tiếp GitHub API: nhánh `main` trỏ tới [0812d3a08127e21d0fc03a57fa52b392f266eb2b](https://github.com/veejvn/minecraft-fusion-defense/commit/0812d3a08127e21d0fc03a57fa52b392f266eb2b).
- **Commit:** `feat: update documentation for final sync and gameplay mechanics adjustments`; commit timestamp 2026-11-03T20:45:43+07:00. Đây là thời điểm commit, không phải thời điểm push (chưa có bằng chứng thời điểm push chính xác).
- **Phạm vi đã xuất bản:** GDD, Gameplay Mechanics, Game Engine Architecture và Documentation Status; commit có 4 file thay đổi, +40/-11 dòng, parent `acb7bc0b84e8ffdd67689e772209251b4a3f208f`.
- **Bằng chứng:** [GitHub main](https://github.com/veejvn/minecraft-fusion-defense/tree/main), GitHub API `GET /repos/veejvn/minecraft-fusion-defense/branches/main`; HEAD Local và GitHub main cùng SHA khi kiểm tra. Working tree sạch trước lần cập nhật dấu mốc này.
- **Documentation Content Sync:** Completed theo lần đồng bộ đã xác minh ở 5.8; dấu mốc này được đồng bộ Local/Notion, không thay đổi thiết kế hoặc phê duyệt TBD.
- **Git Working Tree sau cập nhật dấu mốc:** Uncommitted Changes — chỉ `docs/DOCUMENTATION_STATUS.md`.
- **Xuất bản chính bản ghi dấu mốc này:** Pending Owner Approval; bản ghi mới chưa nằm trong commit 0812d3a. Không thực hiện git add/commit/push/PR hoặc thay đổi index trong tác vụ này.
- Trạng thái Pending Owner Approval tại 5.7/5.8 là snapshot lịch sử trước xuất bản, được dấu mốc 5.9 này cập nhật; giữ nguyên lịch sử.

### 5.10. Product Design Documentation Sync — 2026-11-03T21:36:01+07:00 — Historical Snapshot — Superseded

**Documentation Content Sync:** Completed. **Git Working Tree:** Uncommitted Changes (17 Markdown). **GitHub Published — thay đổi mới:** Pending Owner Approval. Dấu mốc 0812d3a ở 5.9 giữ lịch sử; không khẳng định nội dung Product Design mới đã được push. HEAD ban đầu 1bd5c4f.

| Local / Notion source | Kết quả |
| --- | --- |
| [`docs/product/GDD.md`](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a) | Synced — Updated |
| [`docs/product/GAMEPLAY_MECHANICS.md`](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660) | Synced — Updated |
| [`docs/product/MVP_SCOPE.md`](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb) | Synced — Updated |
| [`docs/game-design/FUSION_RECIPES.md`](https://app.notion.com/p/40c62d2ce36e8192bfd8c49172bbed41) | Synced — Updated |
| [`docs/game-design/ENTITY_CATALOG.md`](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951) | Synced — Updated |
| [`docs/game-design/GAME_BALANCING.md`](https://app.notion.com/p/40c62d2ce36e81f6b406c7a1b62087d0) | Synced — Updated |
| [`docs/game-design/ABILITY_CATALOG.md`](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c) | Synced — Updated |
| [`docs/game-design/LEVEL_DESIGN.md`](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca) | Synced — Updated |
| [`docs/architecture/GAME_ENGINE_ARCHITECTURE.md`](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b) | Synced — Updated |
| [`docs/architecture/DATA_ARCHITECTURE.md`](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b) | Synced — Updated |
| [`docs/development/TESTING_STRATEGY.md`](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885) | Synced — Updated |
| [`docs/product/ROADMAP.md`](https://app.notion.com/p/40c62d2ce36e814498a8e4bbc24d246d) | Synced — Updated |
| [`docs/development/AI_AGENT_GUIDELINES.md`](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832) | Synced — Updated |
| [`README.md`](https://app.notion.com/p/40c62d2ce36e81b1935fd31fef35ed41) | Synced — Updated |
| `docs/DOCUMENTATION_STATUS.md` | Synced — Updated, hai nguồn đọc lại cùng timestamp |

**Ngoài 15 file:** Asset Guidelines sửa 5 Base + 7 Fusion/12 required Abilities; Sprite Guidelines thêm Steel Guardian và count 7. Không đổi sprite specifications. No Change Required: Technical Architecture, Coding Standards, Development Workflow, Deployment, Audio Guidelines. Không có Blocked hoặc khác biệt hợp lệ bị bỏ lại.

**Confirmed mới:** Iron Golem/Skeleton mở đầu; Snow Golem first Grassland Victory; Wolf cumulative 50 Enemy kills trong các trận Victory; Blaze cumulative 5 Grassland Victories. Replay Victory cộng tiến độ, Defeat không cộng; unlock persistent/idempotent. Skeleton Sniper/Steel Guardian Recipes mở đầu, năm Recipe còn lại auto-unlock theo Base inputs (mapping đầy đủ tại Fusion Recipes). Fusion optional, Victory không cần Fusion count. 7 Recipes/7 Tier-2 outputs, 4 same-type/3 cross-type, 5 Base/4 Enemies, 1 Grassland/5 Waves. Mỗi Defender cần Ability riêng: 12 definitions, 11 draft IDs cũ giữ nguyên.

**Steel Guardian:** Iron Golem + Iron Golem, Tier 2, mở đầu, miễn phí, tuân theo output full own HP/no inherited statuses/attack-ready, Target Cell/Source trống. Recipe ID/Entity ID/Ability ID/name/effects/cost/cooldown/combat identity/stats/targeting đều TBD; bảng dùng placeholder `TBD`, không tạo identifier mới.

**Remaining TBD:** combat balancing, Wave configs/rewards, Energy Item amount/rate; Ability effects/costs/cooldowns/spend/commit/rollback; Save storage/schema/triggers; exact event generation/fixed timestep; Achievement UI/technical tracking. Không nâng draft concepts hoặc Prototype thành Confirmed.

**Conflicts resolved:** thay counts 6/11, starter/mapping/Fusion requirement TBD và replay-no-progress bằng Product Design Confirmed mới. Các đoạn lịch sử 5.1–5.9 không phải current rules. Một số raw Notion source vẫn còn đoạn cũ: Testing acceptance nói replay không cộng tiến độ, AI Guidelines handoff còn six recipes/initial unlock TBD, Roadmap cuối trang còn achievement mapping TBD. Local giữ đúng baseline mới và yêu cầu hiện tại; không sửa trang thiết kế Notion. Không có mâu thuẫn chưa có quyết định cần hỏi chủ dự án.

**Validation:** 22 Markdown audited; headings/tables/fences/links/relative paths đạt; 3 JSON examples giữ nguyên và parse; 7 unique unordered Recipe pairs (4 same/3 cross), 7 outputs, 5 Base/4 Enemies; đúng 2 starter Base/2 starter Recipes theo mapping; 12 Ability definitions required với Ability Steel Guardian TBD. Không đổi combat stats/Prototype, Enemy rewards hoặc resource values. Không thêm section trùng. Git diff check đạt, index SHA-256 không đổi. Không chạy gameplay tests/build hoặc cài dependencies. File sizes đo lại filesystem; hai báo cáo đọc lại so khớp sau ghi.

**Review artifact:** `product-design-documentation-review.patch` chứa đầy đủ diff task, bao gồm báo cáo; không staged. Không có pre-existing staged/unstaged changes. Không commit/push/PR; chỉ xuất patch, không áp dụng patch để thay đổi thêm file.

**Lịch sử Notion Product Design update trước sync (đã giải quyết):**

#### Historical Snapshot — Superseded: Product Design Update 03/11/2026 (Notion → Local/GitHub pending)

**Historical Snapshot — Superseded: Partially Synced — Needs Resync.** At the time of that Notion update, this was the latest synchronization status for the 22 Markdown files. Older tables and 22/22 Synced statements below are **historical snapshots** from completed earlier synchronizations, not a claim that Local or GitHub has received this new Product Design update.

| Historical Markdown sync status | Count | Reason |
| --- | --- | --- |
| Synced / unchanged by this Notion update | 7 | Corresponding Notion sources were not changed in this update |
| Partially Synced / Needs Resync | 15 | 14 corresponding Markdown source files changed on Notion plus `docs/DOCUMENTATION_STATUS.md` |
| Blocked | 0 | No blocker for documentation update; unresolved game implementation details remain TBD |
| Total Markdown files | 22 | 21 in docs/ (including status) and [README.md](http://README.md) |

**Notion source pages updated directly (14 matching Markdown files):** GDD, Gameplay Mechanics, MVP Scope, Fusion Recipes, Entity Catalog, Game Balancing, Ability Catalog, Level Design, Game Engine Architecture, Data Architecture, Testing Strategy, Roadmap, AI Agent Guidelines, README. The [Notion](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773) was also updated as the authoritative Confirmed reference; it has no Local Markdown counterpart. This existing Documentation Status page has been updated as the fifteenth Notion page with a Markdown counterpart.

**Product Design Confirmed:** Initially unlocked Base Defenders = Iron Golem and Skeleton. Snow Golem unlocks after first Grassland Victory; Wolf after cumulative 50 Enemy kills across victorious battles; Blaze after 5 cumulative Grassland Victories. Initially unlocked Fusion Recipes = Skeleton + Skeleton → Skeleton Sniper and Iron Golem + Iron Golem → Steel Guardian. MVP now has **7 Tier-2 Fusion Defenders and 7 Fusion Recipes** (4 same-type, 3 cross-type); five remaining Recipes auto-unlock when all their input Base Defenders unlock. Replayed Grassland Victories DO contribute to cumulative achievement progress; Defeat does not. This supersedes the earlier 'no permanent unlock progress after first Victory' rule. Fusion is optional for Grassland Victory; Base Defenders alone can win.

**Confirmed scope vs TBD:** Every Defender must have an Ability, hence MVP requires 12 Ability definitions. Steel Guardian output name, Iron Golem + Iron Golem inputs, Tier-2, inclusion in MVP and initial unlock are Confirmed; its technical Entity ID/Recipe ID, Special Ability name/ID/effects, HP/Damage/Range/Speed and detailed combat identity are **TBD**. Existing 11 Ability IDs/behavior proposals are not automatically approved. Wave composition/timing/rewards, other combat balancing, Ability costs/cooldowns/spend/commit/rollback, persistence schemas/triggers and detailed event-generation ordering remain TBD.

**Local and GitHub:** Neither was edited, committed or pushed during this Notion task. The previously published GitHub commit and publication milestone remain historical and valid for the earlier documentation version. Do **not** claim 22/22 Synced again until an AI Coding Agent pulls the 14 newly changed specialist/general pages and this status page to Local, validates content and then publishes to GitHub with owner approval.

---



## 6. Công việc tiếp theo cần xác nhận

Chủ dự án có thể review và phê duyệt xuất bản riêng checkpoint cleanup mới. Ba nguồn tracked đã cleanup; chỉ mở task cleanup khác khi có phát hiện cụ thể mới.


1. Chọn lát cắt coding và chỉ hỏi các Product Design/Coding Planning TBD thực sự chặn lát cắt đó.
2. Không mở lại các quyết định resource, Fusion output, Save/progression scope hoặc event resolution đã Confirmed.
3. Initial unlocks/Achievement mapping/Fusion optional đã Confirmed ở 5.10. Không tự phê duyệt higher-tier content, combat numbers, Wave Config hoặc Ability parameters.
4. Không suy diễn file tài liệu Synced là game đã build, tests đã chạy hoặc toàn bộ kiến trúc đã Approved.
