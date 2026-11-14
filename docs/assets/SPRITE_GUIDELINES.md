**Repository path:** `docs/assets/SPRITE_GUIDELINES.md`  
**Project:** Minecraft Fusion Defense  
**Status:** Draft v1.0 — nội dung Confirmed kế thừa tài liệu dự án; lịch trình, thông số kỹ thuật và lựa chọn chưa duyệt giữ Proposed/TBD.

**Current authority:** [Repository Documentation Policy](../DOCUMENTATION_POLICY.md). The 2026-11-03 Notion baseline is archival; confirmed decisions preserved in current repository documents remain valid. Draft/Proposed/Prototype/TBD remain unapproved.

## 1. Mục tiêu

**Confirmed:** basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; simple animations được chấp nhận. Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP. Sprite dimensions/frame counts và pipeline cụ thể vẫn TBD.

**Không có sprite dimensions hoặc animation frame counts nào được chốt trong tài liệu này.**

## 2. Sprite Scope

- 5 Base Defenders: Snow Golem, Iron Golem, Skeleton, Wolf, Blaze.
- 7 Fusion Defenders: Steel Guardian, Skeleton Sniper, Ice Golem, Frost Guardian, Flame Fang, Inferno Archer, Alpha Wolf.
- 4 Enemies: Zombie, Husk, Spider, Pillager.
- Grassland battlefield, 5×9 Grid và visual effects cần thiết cho combat/Fusion/Abilities.

## 3. Hướng dẫn hình ảnh (Proposed)

- Duy trì tính nhất quán về tỷ lệ hình ảnh, góc nhìn side-view và Pixel Art style.
- Cân nhắc trạng thái idle, attack, hit, death và effect theo yêu cầu từng Entity; danh sách animation bắt buộc: TBD.
- Tách logic gameplay (range, collision, timing) khỏi sprite frame timing.
- Xác định anchor/origin và cell alignment trước khi export; thông số: TBD.
- Không giả định sprite chiếm đúng một cell theo pixel; occupancy gameplay theo Grid Rules.

## 4. Pipeline (Proposed)

1. Duyệt concept/style và danh mục Entity.
2. Tạo source bằng Aseprite hoặc công cụ được duyệt.
3. Export spritesheets/frames theo format đã duyệt.
4. Kiểm tra alignment, transparency, pixel scaling và animation transitions.
5. Tích hợp và kiểm thử trong Phaser runtime.

## 5. Open Decisions

| Hạng mục | Trạng thái |
| --- | --- |
| Sprite dimensions, tile size, scale factor | TBD |
| Palette, outlines, visual reference | TBD |
| Frame counts, FPS, animation state list | TBD |
| Naming, atlas format, origin/anchor | TBD |
| Hitbox/collision vs visual bounds | TBD |
| Effect sprite specifications | TBD |

## 6. Tham chiếu

- [Entity Catalog — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81828576cf3feaac1951)
- [Level Design — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81079f43ecfa6388d6ca)
- [Game Engine Architecture — Minecraft Fusion Defense](https://app.notion.com/p/40c62d2ce36e81368230c8786623a06b)
