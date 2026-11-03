**Repository path:** `docs/assets/ASSET_GUIDELINES.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current decision baseline:** [MVP Decision Baseline — Confirmed Decisions (2026-11-03)](https://app.notion.com/p/40c62d2ce36e814fa972ec39a79a6773). Các quyết định được liệt kê thay thế mô tả cũ mâu thuẫn; các Draft/Proposed/Prototype/TBD không được baseline liệt kê vẫn chưa được phê duyệt. Lịch sử quyết định ngày 02/11/2026 được giữ trong metadata; quyết định 03/11/2026 ưu tiên khi có thay thế rõ ràng.

## 1. Mục tiêu

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Confirmed:** Functional MVP không bắt buộc SFX hoặc BGM; audio không phải acceptance blocker.

Pixel dimensions, atlas layout, source licensing/attribution policy và pipeline details vẫn Proposed/TBD.

## 2. Asset Categories

| Nhóm | Phạm vi MVP |
| --- | --- |
| Defender sprites | 5 Base + 6 Fusion Defenders |
| Enemy sprites | Zombie, Husk, Spider, Pillager |
| Battlefield | Grassland, 5×9 Grid, background/tiles |
| Effects | Combat, Fusion, 11 Special Abilities |
| UI assets | HUD, Energy, Power Crystal, controls |
| Audio | Optional/deferred; không bắt buộc SFX/BGM cho MVP |

## 3. Nguyên tắc (Proposed)

- Dùng technical IDs nhất quán với Entity, Ability và Fusion Catalogs.
- Tách source files (ví dụ Aseprite/Tiled) khỏi export dùng trong game về mặt quy trình; vị trí thư mục TBD.
- Asset phải có nguồn gốc và quyền sử dụng rõ ràng; không mặc định lấy trực tiếp tài sản Minecraft có bản quyền.
- Pixel Art giữ độ sắc nét khi hiển thị; scale/filtering settings TBD.
- Không tự đặt tên files/atlases hoặc tạo placeholder được coi là bản final.

## 4. Asset Pipeline (Proposed)

1. Xác nhận yêu cầu visual/audio và IDs liên quan.
2. Tạo hoặc nhận source asset.
3. Export theo specification đã duyệt.
4. Kiểm tra kích thước, animation, alignment và tính hợp lệ.
5. Tích hợp vào Phaser/React theo trách nhiệm tương ứng.
6. Ghi nhận trạng thái asset và quyền sử dụng.

## 5. Open Decisions

- Asset directory structure, naming, atlas/packing: TBD.
- Pixel density, reference resolution, palette và animation budget: TBD.
- Source licensing/attribution và acceptance checklist: TBD.
- Asset loading/preloading và fallback policy: TBD.

## 6. Tham chiếu

- [Technical Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81b6893ac6d59454f8be)
- [Entity Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951)
- [Ability Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81968c6cecad6e88290c)
