**Repository path:** `docs/assets/AUDIO_GUIDELINES.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

Các phần dưới là hướng dẫn Proposed nếu audio được phê duyệt sau này, không là điều kiện hoàn thành MVP. Danh mục cues, format và volume mix chưa được phê duyệt.

## 2. Audio Categories (Proposed)

| Nhóm | Ví dụ nhu cầu, không phải danh mục đã duyệt |
| --- | --- |
| UI SFX | Button, summon, collect Energy/Power Crystal |
| Gameplay SFX | Attack, hit, death, Fusion, Special Ability |
| Feedback | Wave start/end, Victory, Defeat |
| Music/Ambience | Grassland background music/ambience nếu được duyệt |

## 3. Nguyên tắc tích hợp (Proposed)

- Audio phản hồi sự kiện gameplay, không quyết định thời điểm combat hoặc simulation.
- Pause đóng băng gameplay timers; chính sách pause/mute audio và UI feedback còn TBD.
- Không tự thêm soundtrack hoặc SFX bên ngoài scope được duyệt.
- Chỉ sử dụng audio có quyền sử dụng phù hợp; ghi nhận nguồn và attribution khi cần.
- Phải cân nhắc browser autoplay restrictions trong Desktop Web; UX kích hoạt âm thanh TBD.

## 4. Quy trình (Proposed)

1. Xác nhận audio cue và event tương ứng.
2. Chọn/tạo asset có nguồn gốc hợp lệ.
3. Kiểm tra định dạng, độ dài, mức âm lượng và playback behavior.
4. Tích hợp với Phaser/React theo ranh giới trách nhiệm đã duyệt.
5. Kiểm tra các trạng thái Playing, Paused, Victory và Defeat.

## 5. Open Decisions

- Requirement audio cho Functional MVP đã Confirmed: không bắt buộc SFX hoặc BGM. Audio tùy chọn trong tương lai cần phê duyệt riêng.
- Format, bitrate, loudness target và looping: TBD.
- Volume controls, mute, autoplay/user gesture policy: TBD.
- Concurrent SFX limits, spatial audio và asset naming: TBD.
- Audio behavior khi Pause/Resume: TBD.

## 6. Tham chiếu

- [MVP Scope — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81abac99c4d6af32cbdb)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
