**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — hướng dẫn nền tảng; mọi quy ước chưa được chủ dự án duyệt được ghi Proposed/TBD.  
**Scope:** MVP Desktop Web, không mở rộng gameplay hay kiến trúc.

**Repository path:** `docs/development/TESTING_STRATEGY.md`

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

**Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

## 2. Công cụ và phạm vi

| Lớp kiểm thử | Công cụ | Mục đích |
| --- | --- | --- |
| Unit Tests | Vitest — Confirmed | Recipe matching, resource rules, state transitions, data validation |
| Integration Tests | Proposed; công cụ/cách tổ chức TBD | Kết nối Game Systems, UI–Game Bridge và runtime data |
| End-to-End | Playwright — Confirmed | Các luồng chơi chính trên Desktop Web |
| Manual playthrough / visual | Required — Confirmed; cách thực hiện chi tiết TBD | Toàn bộ Grassland 5 Waves, rendering Pixel Art, drag/drop, HUD, Pause, navigation/instructions |

Test files, fixtures, browser versions và commands cụ thể phải đối chiếu repository thực tế.

## 3. Kiểm thử Gameplay Rules ưu tiên

| Nhóm | Các trường hợp cần kiểm chứng |
| --- | --- |
| Grid/Placement | 5×9 cells, đặt Defender hợp lệ, occupancy và Energy Summon |
| Fusion | 6 recipes; đảo thứ tự input vẫn khớp; Tier-1 + Tier-1 → Tier-2 |
| Fusion transaction | 0 cost, mọi Lane/distance, Target Cell/Source trống; Output 100% own Max HP/no inherited statuses/attack-ready; no fixed engine Tier ceiling, chỉ sáu approved initial Recipes |
| Resources | Initial Energy 0, +50 tại t=0 rồi +50 mỗi 3s Game Time, Unlimited cap; Crystal initial 0/cap 5; Item lifetime 10s Game Time; Enemy Energy direct/Crystal Item rewards; Pending Wave Reward và random attempt 30–60s/collect priority theo Confirmed definitions |
| Pause | Đóng băng movement, combat, spawning, resource generation, cooldown và gameplay timers; Resume tiếp tục |
| Combat/Enemies | 4 Enemy Types, di chuyển từ phải sang trái; hành vi chi tiết theo definitions đã duyệt |
| Waves/End State | Một Grassland Level, 5 Waves; Defeat khi base breach; Victory sau tất cả Waves và hết Enemy |
| Abilities | 11 Ability IDs và owner mapping; hiệu ứng, costs, cooldowns chỉ kiểm thử khi đã có cấu hình được phê duyệt |
| Data Integrity | IDs/references/approved Recipes hợp lệ, không trùng unordered input pair, Zod validation |
| Save & Resume | Trận tiếp tục sau reload/close; persistent unlock progression riêng |
| Achievements / replay | Victory-only records; Defeat không cấp unlock mới; replay sau first completion không tăng permanent unlock progress |
| Simulation events | Attack/movement tính đồng thời, sequence number tăng dần; terminal result theo event resolve trước, không blanket priority |

## 4. Kiểm thử Data và trạng thái TBD

- Không sử dụng Prototype/placeholder balance numbers như expected values chính thức.
- Với thiếu definition hoặc reference sai, test phải xác minh lỗi được báo rõ theo contract đã được phê duyệt.
- Với Ability spend/commit/rollback, combat stats, Wave composition, starter unlocks/Achievement mapping hoặc chi tiết Save/Event generation chưa chốt, ghi `Blocked — TBD` thay vì tự đặt expected. Enemy Rewards, caps và Fusion HP/status/readiness đã Confirmed, không còn blocker TBD.
- Không biến mô tả Proposed thành acceptance test bắt buộc khi chưa được duyệt.

## 5. Test Workflow (Proposed)

1. Xác định yêu cầu Confirmed và tài liệu nguồn.
2. Viết test case cho hành vi trong phạm vi task.
3. Chạy test bằng scripts đã có trong repository.
4. Phân biệt Fail thực tế với Blocked do TBD hoặc thiếu config.
5. Báo cáo kết quả, bằng chứng và những phần chưa kiểm chứng.

Không tự thêm testing libraries, snapshots, CI pipelines hoặc browser matrix nếu chưa được yêu cầu.

## 6. Tiêu chí báo cáo

Mỗi task cần nêu: tests đã chạy, Pass/Fail/Blocked/Not Run, môi trường và giới hạn. Không tuyên bố Pass nếu chưa chạy. Mục tiêu 60 FPS chỉ được đánh giá sau khi có phép đo thực tế; chưa có benchmark chính thức.

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

Manual và core automated tests là yêu cầu Confirmed; checklist/cases không chứng minh tests đã chạy hoặc build đạt trong nhiệm vụ tài liệu.

## 7. Open Decisions

| Vấn đề | Trạng thái |
| --- | --- |
| Coverage target và enforcement | TBD |
| Browser/OS matrix | TBD |
| Integration test harness | TBD |
| CI/CD test gates | TBD |
| Performance benchmark scenario và threshold | TBD |
| Visual regression/snapshot policy | TBD |
| Fixture và mock policy cho balance còn TBD | TBD |

## 8. Tài liệu tham chiếu

- [Gameplay Mechanics — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81eeaf62f611c5342660)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
- [Data Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81619d14d2fa505e163b)
- [AI Agent Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832)
