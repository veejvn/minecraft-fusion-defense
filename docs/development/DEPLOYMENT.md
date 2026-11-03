**Repository path:** `docs/development/DEPLOYMENT.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

**Confirmed — 03/11/2026:** Functional MVP cho internal testing trên Desktop Web (PC/laptop), chạy Local only; single-player Campaign Grassland duy nhất, 5 Waves, Grid 5 × 9, beginner-friendly và English-only UI/instructions/messages. Không yêu cầu Mobile/Tablet, Endless, Survival, Sandbox/Test mode hoặc online Preview/Staging/Production.

Functional MVP không cần online Preview, Staging hoặc Production deployment. Local build/start validation vẫn cần kiểm chứng thực tế; không chọn hosting hoặc CI/CD.

## 2. Phạm vi đã xác nhận

- Target: Desktop Web, single-player; Next.js/React + Phaser 3 + TypeScript.
- Package Manager pnpm; Turborepo cho Monorepo.
- MVP không có backend bắt buộc theo Technical Architecture.
- Vitest và Playwright là testing tools đã xác nhận.

## 3. Release Flow (Proposed)

1. Kiểm tra repository, dependency versions và scripts thực tế.
2. Xác nhận gameplay configs đã được duyệt; không dùng Prototype/TBD làm production defaults.
3. Chạy các bước validation, typecheck, lint, unit/E2E đã có.
4. Build ứng dụng theo cấu hình được phê duyệt.
5. Kiểm tra game trên Desktop Web và các luồng MVP quan trọng.
6. Chạy và kiểm tra Local Desktop Web cho internal testing; không bắt buộc deploy online trong Functional MVP.
7. Ghi nhận kết quả Local smoke test. Online release/rollback chỉ là future Proposed flow nếu được phê duyệt riêng.

Không coi danh sách này là pipeline CI/CD bắt buộc hoặc các command đã tồn tại.

## 4. Release Checks

- Game khởi chạy Local và hiển thị Grassland 5×9.
- **Confirmed:** Save & Resume trận đang chơi sau browser reload/close; persistent unlock progression giữa các trận là dữ liệu riêng. Cơ chế lưu, schema snapshot, thời điểm ghi và implementation cụ thể vẫn TBD.
- **Confirmed:** manual playthrough toàn bộ Grassland 5 Waves và automated tests cho core gameplay (Fusion, resources, combat, Victory/Defeat, Save & Resume). Coverage, cases/harness/fixtures, browser/OS matrix và CI gates vẫn Coding Planning TBD.
- **Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.
- **Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.
- Summon, Fusion, Resources, Abilities, Pause, Waves, Victory/Defeat đúng theo configs đã duyệt.
- Asset paths, loading và browser compatibility được kiểm chứng.
- Không lộ secrets hoặc đưa dữ liệu nhạy cảm vào client bundle.
- Kết quả tests và performance được báo theo phép đo thực tế; mục tiêu 60 FPS không đồng nghĩa benchmark đã đạt.

## 5. Open Decisions

| Chủ đề | Trạng thái |
| --- | --- |
| Online hosting/platform/domain | Không bắt buộc cho MVP — Confirmed; tương lai chưa phê duyệt |
| Build output mode, Next.js configuration | TBD |
| Environments, secrets và env variables | TBD |
| CI/CD pipeline, release approval, rollback | TBD |
| Browser/OS support matrix | TBD |
| Monitoring, analytics và error reporting | TBD |
| Versioning và release cadence | TBD |

## 6. Tham chiếu

- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Testing Strategy — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81dea9f1ffc88723a885)
- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
