**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — hướng dẫn nền tảng; mọi quy ước chưa được chủ dự án duyệt được ghi Proposed/TBD.  
**Scope:** MVP Desktop Web, không mở rộng gameplay hay kiến trúc.

**Repository path:** `docs/development/DEVELOPMENT_WORKFLOW.md`

## 1. Mục tiêu

Mô tả vòng đời một task coding và đồng bộ tài liệu, không áp đặt Git branching/CI/CD policy chưa được phê duyệt.

## 2. Nguồn sự thật và phạm vi

- Notion là nguồn tài liệu chính; Markdown Local được đồng bộ để AI Agent coding.
- `Confirmed` có thể dùng để triển khai trong phạm vi; `Draft`, `Proposed`, `Prototype`, `TBD` cần xác nhận khi ảnh hưởng quyết định.
- `Synced` không đồng nghĩa `Approved`.
- Chỉ làm đúng task được giao, không mở rộng gameplay hoặc tự thêm package/dependency.

## 3. Quy trình cho một task

1. **Nhận yêu cầu:** xác định mục tiêu, phạm vi và tiêu chí hoàn thành.
2. **Kiểm tra:** đọc Git status, file liên quan và các tài liệu Confirmed.
3. **Phát hiện blockers:** so sánh nguồn; phân biệt Conflict đồng bộ và Open Decision thiết kế.
4. **Lập kế hoạch ngắn:** liệt kê file dự kiến sửa, test dự kiến chạy và câu hỏi cần chủ dự án chọn.
5. **Triển khai:** chỉ thực hiện phần không bị TBD/Conflict chặn; giữ nguyên thay đổi ngoài phạm vi.
6. **Xác minh:** chạy test/lint/typecheck có sẵn, kiểm tra gameplay rules liên quan.
7. **Báo cáo:** file sửa, kết quả kiểm chứng, hạn chế và câu hỏi còn mở.

Không tự commit, push, reset hoặc clean.

## 4. Quy trình tài liệu Notion ↔ Local

- Trước sync, đọc cả hai bản và so sánh đầy đủ.
- Local trống: nhập từ Notion và xác minh.
- Hai bản tương đương: giữ nguyên, đánh dấu Synced.
- Hai bản khác: báo Diff/Conflict; không tự merge hoặc ghi đè.
- Sau sync, cập nhật `docs/DOCUMENTATION_STATUS.md` và trang báo cáo Notion khi được giao; xác minh kết quả.
- Không tự nâng `Draft/Proposed/TBD` thành `Confirmed`.

## 5. Thực hiện gameplay theo lát cắt nhỏ (Proposed)

- Ưu tiên một phạm vi có thể kiểm chứng, ví dụ Grid, validation, Fusion hoặc Pause, sau khi các quyết định phụ thuộc đã được duyệt.
- Trước khi làm một hệ thống, kiểm tra dữ liệu và điều kiện đầu vào chính thức.
- Không tự thêm balance defaults hoặc placeholder runtime để vượt blocker.
- Bảo vệ các quy tắc MVP: Grid 5×9, Fusion miễn phí và không giới hạn Lane/khoảng cách, Energy dùng Summon, Power Crystal dùng Ability, Pause đóng băng simulation, Victory/Defeat theo tài liệu.

Đây là cách tổ chức công việc được đề xuất, không phải roadmap hay thứ tự sprint đã chốt.

## 6. Xử lý vấn đề và thay đổi

- **TBD:** nêu lựa chọn, ảnh hưởng và hỏi chủ dự án.
- **Conflict:** nêu nguồn và Diff, chờ phê duyệt hợp nhất.
- **Bug:** mô tả bước tái hiện, expected vs actual và kết quả test.
- **Scope change:** không tự triển khai; yêu cầu xác nhận.

## 7. Open Decisions

| Chủ đề | Trạng thái |
| --- | --- |
| Git branch strategy, commit conventions | TBD |
| Pull Request/review policy | TBD |
| CI workflow, release gates | TBD |
| Sprint cadence, issue tracking | TBD |
| Definition of Done chi tiết | TBD |
| Cách phê duyệt và ghi ADR | TBD |

## 8. Tài liệu tham chiếu

- [AI Agent Guidelines — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e8178b14edef36999a832)
- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Tình trạng tài liệu — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81aab0cdf6dc190b711d)
