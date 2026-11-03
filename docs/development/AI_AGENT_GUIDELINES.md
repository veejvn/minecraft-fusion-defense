**Repository path:** `docs/development/AI_AGENT_GUIDELINES.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — hướng dẫn quy trình đề xuất; không tự thay thế chỉ đạo trực tiếp của chủ dự án.  
**Audience:** AI Coding Agents làm việc trong repository.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

Giúp AI Agent triển khai MVP nhất quán với tài liệu đã phê duyệt, tránh tự quyết định gameplay, thay đổi phạm vi hoặc ghi đè nội dung Local/Notion khi chưa có sự đồng ý.

## 2. Nguồn thông tin và trạng thái quyết định

- **Notion:** nguồn tài liệu thiết kế chính; Local Markdown là bản đồng bộ dùng cho coding.
- **Confirmed:** có thể dùng làm yêu cầu triển khai trong đúng phạm vi đã xác nhận.
- **Draft / Proposed / Prototype / TBD:** chưa được phê duyệt; không tự nâng thành Confirmed.
- **Synced:** chỉ chứng minh Local và Notion tương đương, không có nghĩa Approved.
- Nếu hai tài liệu mâu thuẫn hoặc một quyết định thiếu thông tin, **dừng tại phần phụ thuộc**, nêu nguồn và hỏi chủ dự án; không tự chọn.
- Không dựa vào thời gian sửa file mới hơn để kết luận tài liệu có thẩm quyền hơn.

## 3. Quy trình trước khi coding

1. Đọc yêu cầu hiện tại và xác định file/module nằm trong phạm vi.
2. Kiểm tra codebase thực tế, Git status và các thay đổi chưa commit.
3. Đọc `MVP_SCOPE.md`, GDD và các tài liệu liên quan trực tiếp.
4. Phân loại các yêu cầu: Confirmed, Proposed, TBD hoặc Conflict.
5. Trình bày kế hoạch ngắn: file dự kiến sửa, lý do, tiêu chí kiểm chứng và các quyết định cần người dùng xác nhận.
6. Chỉ triển khai những phần không phụ thuộc quyết định còn mở hoặc đã được chủ dự án duyệt.

## 4. Nguyên tắc không tự quyết định

- Không tự chốt combat stats, Summon/Ability Cost/Cooldown, Wave Composition/timing/Wave Reward amounts hoặc nội dung chưa được baseline liệt kê. Enemy Reward và resource values/caps/lifetimes đã Confirmed phải lấy đúng nguồn, không xem là TBD.
- Không tự chọn Tick Rate, System Update Order, Bridge API, schema format hay cấu trúc package khi chúng còn TBD.
- Không tự thêm Defender, Enemy, Recipe, Ability, Level hoặc tính năng ngoài MVP.
- Không dùng Prototype/placeholder như Runtime Defaults đã được phê duyệt.
- Không tự diễn giải các mô tả Draft thành yêu cầu bắt buộc.
- Chỉ hỏi material blocker khi coding planning thực sự phụ thuộc quyết định chưa chốt; không mở lại phỏng vấn TBD diện rộng. Phê duyệt một quyết định không tự phê duyệt mọi implementation detail.

## 5. Gameplay Rules không được làm sai

- Battlefield 5 Rows × 9 Columns; Enemy di chuyển từ phải sang trái theo Lane.
- MVP gồm 5 Base Defenders, 4 Enemies, 7 Fusion Recipes, 7 Fusion Defenders, 12 required Special Abilities (11 existing draft IDs; Steel Guardian Ability TBD), một Grassland Level và 5 Waves.
- Fusion: kéo Source lên Target, order-independent, 0 cost, mọi Lane/distance, Target Cell/Source trống. Output 100% own Max HP, không inherited statuses, attack-ready; engine không fixed Tier ceiling, chỉ bảy approved initial Recipes.
- Energy dùng Summon; Power Crystal dùng Special Abilities.
- Pause đóng băng simulation và gameplay timers.
- Enemy breach tạo Defeat; Victory khi hoàn tất 5 Waves và hết Enemy. Terminal result cùng tick theo Event Queue insertion sequence; không blanket Defeat priority.
- **Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.
- **Confirmed:** Main Menu, Level Selection, Settings, Achievements và Defender Collection; basic in-game instructions, không cần interactive tutorial.
- **Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.
- **Confirmed — Product Design 03/11/2026:** Iron Golem và Skeleton mở từ đầu; Snow Golem mở sau First Grassland Victory; Wolf sau 50 Enemy kills tích lũy qua các trận Victory; Blaze sau 5 Grassland Victories tích lũy. Replay Victory được cộng tiến độ, Defeat không cộng; unlock vĩnh viễn, không cấp reward trùng. Recipe mở từ đầu: Skeleton Sniper và Steel Guardian. Ice Golem mở khi Snow Golem unlock; Frost Guardian khi Iron Golem và Snow Golem unlock; Alpha Wolf khi Wolf unlock; Inferno Archer khi Blaze và Skeleton unlock; Flame Fang khi Blaze và Wolf unlock. Fusion optional cho Grassland Victory: có thể thắng bằng Base Defenders, không thêm Fusion count vào điều kiện thắng. UI/tracking implementation vẫn TBD.
- **Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.
- **Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.
- **Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.
- Không tự thêm Base HP/Lives, Fusion Energy Cost hoặc Recipe ngoài danh mục.

- Steel Guardian: Iron Golem + Iron Golem, Tier 2, Recipe mở đầu — Confirmed. Entity/Recipe technical IDs, combat identity/stats và Ability ID/name/effects/cost/cooldown vẫn TBD; không tự đặt identifier hay nâng draft Ability concepts thành Confirmed.

## 6. Quy tắc kiến trúc

- Next.js/React quản lý app shell, UI/HUD; Phaser 3 quản lý rendering và gameplay runtime.
- Không đẩy vị trí Entity mỗi frame vào React state.
- Gameplay data theo hướng data-driven; TypeScript types và Zod validation.
- Fixed timestep là định hướng; mục tiêu 60 FPS, không tự chốt tick duration.
- Monorepo apps/packages trong Technical Architecture là **Proposed**, không tự tái cấu trúc repository theo sơ đồ đó.
- Chi tiết kỹ thuật chưa có quyết định phải được ghi TBD và xin xác nhận.

## 7. Quy tắc chỉnh sửa code và tài liệu

- Chỉ sửa file thuộc phạm vi task đã được đồng ý.
- Giữ nguyên thay đổi Local chưa commit; không ghi đè hoặc xóa để tiện đồng bộ.
- Không dùng `git reset`, `git clean`, `git commit`, `git push` khi chưa được yêu cầu rõ ràng.
- Không tự sửa GDD hoặc tài liệu nguồn để hợp thức hóa lựa chọn trong code.
- Khi sync Notion → Local, so sánh nội dung trước; nếu khác biệt, báo Diff và xin phê duyệt trước khi merge.
- Khi thay đổi tài liệu, cập nhật `docs/DOCUMENTATION_STATUS.md` theo kết quả thực tế; chỉ tuyên bố Synced sau khi đối chiếu đầy đủ hai nguồn.
- Không tuyên bố đã cập nhật Notion, Local hay chạy test nếu chưa thực hiện và xác minh.

## 8. Kiểm thử và báo cáo

- Chạy các test/lint/typecheck có sẵn và phù hợp phạm vi task; không tự cài dependency nếu chưa được duyệt.
- Với thay đổi gameplay, ưu tiên kiểm chứng các quy tắc Confirmed: Fusion, tài nguyên, Pause, Victory/Defeat.
- Nếu thiếu dữ liệu chính thức khiến test hoặc runtime không thể hoàn tất, báo blocker; không tự tạo balance values.
- Báo cáo cuối task: file đã sửa, hành vi đã làm, test đã chạy và kết quả, vấn đề còn mở, bước tiếp theo cần quyết định.

## 9. Mẫu câu hỏi khi gặp TBD

> **Vấn đề:** \[mô tả quyết định còn thiếu\]  
> **Nguồn:** \[tài liệu, mục\]  
> **Ảnh hưởng:** \[module / test bị chặn\]  
> **Phương án:** \[A/B nếu có, kèm trade-off\]  
> **Cần xác nhận:** \[một câu hỏi cụ thể\]

Không tự chọn phương án mặc định khi người dùng chưa phản hồi.

## 10. Tài liệu phải tham khảo theo task

| Loại công việc | Tài liệu liên quan |
| --- | --- |
| Scope và yêu cầu | MVP Scope, GDD |
| Gameplay | Gameplay Mechanics, Entity Catalog, Fusion Recipes, Ability Catalog |
| Levels/Balance | Level Design, Game Balancing |
| Kiến trúc ứng dụng | Technical Architecture |
| Phaser Game Systems | Game Engine Architecture |
| Data Models/Validation | Data Architecture |
| Đồng bộ và kiểm kê | Documentation Status |

## 11. Tài liệu tham chiếu

- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
- [GDD — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81e4af03d52a246e9a7a)
- [Tình trạng tài liệu — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d)
