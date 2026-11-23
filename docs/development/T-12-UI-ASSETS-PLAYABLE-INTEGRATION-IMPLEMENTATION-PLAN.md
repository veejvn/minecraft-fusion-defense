**Repository path:** `docs/development/T-12-UI-ASSETS-PLAYABLE-INTEGRATION-IMPLEMENTATION-PLAN.md`  
**Project:** Minecraft Fusion Defense  
**Task:** `T-12` — UI, Assets & Playable Integration (Main Menu, Level Selection, Settings, Defender Collection, Achievements, Save/Resume Continue Flow, Pixel-Art Assets & 5×9 Grassland Battlefield Integration)  
**Status:** Approved v1.0 — Owner confirmed `D-86`–`D-95` = Phương án A, all 47 PNG assets verified, and full 15 Fusion Recipes / 20 Special Abilities (`ABILITY_CATALOG.md v2.2`) approved (`2026-11-23`)  
**Date:** `2026-11-23`  
**Authority:** [Documentation Policy](../DOCUMENTATION_POLICY.md), [Roadmap §2 & §3A](../product/ROADMAP.md), [MVP Scope](../product/MVP_SCOPE.md), [GDD §11–§15](../game-design/GDD.md), [Gameplay Mechanics](../game-design/GAMEPLAY_MECHANICS.md), [Entity Catalog](../game-design/ENTITY_CATALOG.md), [Fusion Recipes v2.0](../game-design/FUSION_RECIPES.md), [Ability Catalog v2.2](../game-design/ABILITY_CATALOG.md), [Asset Guidelines](../assets/ASSET_GUIDELINES.md), [Sprite Guidelines](../assets/SPRITE_GUIDELINES.md), [T-11 Save/Resume & Progression Plan](T-11-SAVE-RESUME-PROGRESSION-IMPLEMENTATION-PLAN.md).

---

## 1. Mục tiêu và Phạm vi (`T-12`)

`T-12` kết nối toàn bộ phần lõi simulation/runtime đã nghiệm thu ở `T-04`..`T-11` (`BattleRuntime`, Summon/Resources, Combat/Targeting, Fusion, Grassland 5 Waves, **20 Special Abilities v2.2**, **15 Tier-2 Fusion Recipes**, Save/Resume Checkpoint & Persistent Progression) với giao diện người chơi (React UI screens + Phaser 5×9 Grassland Battlefield Scene) và bộ **47 Minecraft-style Pixel-Art Assets** theo đúng phạm vi Functional MVP:

1. **Kiểm kê & Chuẩn hóa Asset Pipeline (Tách riêng cho Phiên Tạo Asset của Owner):**
   - Kiểm kê toàn bộ asset đã tạo ở phiên trước (`apps/web/public/playtest-preview/` và `packages/game/src/playtest/procedural-pixel-art.ts`).
   - Lập **Asset Production Manifest & Prompt/Spec Checklist** chi tiết (theo đúng chuẩn `create-game-assets` skill: `64×64` transparent RGBA PNG, nearest-neighbor `pixelArt: true`, bảng màu Minecraft-inspired nhất quán, rõ silhouette) để Owner chạy ở phiên chuyên tạo asset mà không bị lệch key, đường dẫn hoặc kích thước.
2. **Hệ thống Màn hình UI (English-only UI, Beginner-friendly, Desktop Web Local):**
   - `Main Menu` (Play / Level Selection, Continue Saved Battle khi có checkpoint `mfd.active_battle.v1`, Defender Collection, Achievements, Settings & How to Play).
   - `Level Selection` (Grassland Level — 5 Rows × 9 Columns, 5 Waves, hiển thị trạng thái tiến độ và nút Start New Battle / Continue).
   - `Defender Collection` (hiển thị 5 Base Defenders + 15 Tier-2 Fusion Defenders + 15 Fusion Recipes + 20 Special Abilities cùng trạng thái Unlocked/Locked từ `ProgressionStore`).
   - `Achievements & Progression` (hiển thị các mốc unlock Confirmed: Starter gồm Iron Golem, Skeleton & 3 Recipes `Skeleton Sniper`, `Steel Guardian`, `Iron Ranger`; First Grassland Victory → Snow Golem & các Recipe có Snow Golem; 50 Cumulative Enemy Kills across Victories → Wolf & các Recipe có Wolf; 5 Cumulative Grassland Victories → Blaze & các Recipe có Blaze).
   - `Settings & Basic In-Game Instructions` (Audio toggles placeholder không chặn MVP, Reset Progression / Clear Saved Battle có xác nhận, và bảng hướng dẫn ngắn gọn bằng tiếng Anh: Summon, Energy/Crystal Click Collection, Drag-and-Drop Fusion, Drag-and-Drop Power Crystal Special Ability).
3. **5×9 Grassland Playable Battlefield & Gameplay HUD (`Phaser` + `React`):**
   - Kết nối trực tiếp `BattleRuntime` (headless deterministic tick) với `GrasslandBattleScene` (Phaser) và `BattleHudOverlay` (React event-driven HUD).
   - Hỗ trợ đầy đủ thao tác chuột/pointer trên sân đấu 5×9:
     - Click thu thập `Energy Item` và `Power Crystal Item` (ưu tiên nhặt Item trước khi chọn Defender nếu trùng ô theo `GAMEPLAY_MECHANICS.md` §18).
     - Chọn hoặc kéo-thả Base Defender đã mở khóa từ HUD Selection Bar xuống ô trống để `Summon`.
     - Kéo-thả `Source Defender` (Tier-1) đè lên `Target Defender` (Tier-1) trên Grid 5×9 để thực hiện `Fusion` miễn phí không giới hạn khoảng cách (`T-08`), đặt Tier-2 tại `Target Cell`.
     - Kéo-thả `Power Crystal` từ HUD lên một Defender đang sống trên Grid để kích hoạt `Special Ability` (`T-10` / v2.2) với đầy đủ **20 hiệu ứng kỹ năng** và thông báo lỗi tiếng Anh rõ ràng khi bị từ chối (`Insufficient Crystals`, `No Valid Target`, v.v.).
   - Tích hợp `Pause Overlay`, `Pending Wave Reward Claim` khi kho Crystal đầy (`5/5`), `Victory Screen` (cập nhật `ProgressionStore`, hiển thị Defender/Recipe vừa mở khóa, xóa active checkpoint) và `Defeat Screen` (không cộng progression, xóa active checkpoint, cho phép Retry hoặc về Main Menu).
   - Tự động lưu checkpoint (`CheckpointManager`) sau mỗi command hợp lệ, mỗi khi chuyển Wave và khi Pause/Unload để hỗ trợ **Save & Resume** sau khi reload trình duyệt.

---

## 2. Báo cáo Kiểm kê Asset Hiện Có trong Dự Án (Asset Audit)

Qua kiểm tra toàn bộ cây thư mục `apps/web/public/` và `packages/game/src/`, trạng thái asset hiện tại của dự án như sau:

### 2.1. Asset PNG `64×64` đã tạo ở phiên trước (`apps/web/public/playtest-preview/`)

Hiện có **10 file PNG (`64×64` pixel-art, đã commit ở `1ed50b4`)** đặt tại `apps/web/public/playtest-preview/`:

| STT | Nhóm | Entity / Tile ID | Đường dẫn file hiện có | Kích thước / Dung lượng | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | Base Defender (1/5) | `iron_golem` | `apps/web/public/playtest-preview/ai-iron-golem-64.png` | `64×64` PNG (3,960 B) | **Đã có** (Static sprite) |
| 2 | Base Defender (2/5) | `snow_golem` | `apps/web/public/playtest-preview/ai-snow-golem-64.png` | `64×64` PNG (2,518 B) | **Đã có** (Static sprite) |
| 3 | Base Defender (3/5) | `skeleton` | `apps/web/public/playtest-preview/ai-skeleton-64.png` | `64×64` PNG (3,246 B) | **Đã có** (Static sprite) |
| 4 | Base Defender (4/5) | `wolf` | `apps/web/public/playtest-preview/ai-wolf-64.png` | `64×64` PNG (4,279 B) | **Đã có** (Static sprite) |
| 5 | Base Defender (5/5) | `blaze` | `apps/web/public/playtest-preview/ai-blaze-64.png` | `64×64` PNG (3,807 B) | **Đã có** (Static sprite) |
| 6 | Enemy (1/4) | `zombie` | `apps/web/public/playtest-preview/ai-zombie-64.png` | `64×64` PNG (2,136 B) | **Đã có** (Static sprite) |
| 7 | Enemy (2/4) | `husk` | `apps/web/public/playtest-preview/ai-husk-64.png` | `64×64` PNG (2,653 B) | **Đã có** (Static sprite) |
| 8 | Enemy (3/4) | `vindicator` | `apps/web/public/playtest-preview/ai-vindicator-64.png` | `64×64` PNG (3,382 B) | **Đã có** (Static sprite) |
| 9 | Enemy (4/4) | `pillager` | `apps/web/public/playtest-preview/ai-pillager-64.png` | `64×64` PNG (2,795 B) | **Đã có** (Static sprite) |
| 10 | Map Tile (1) | `grassland_tile` | `apps/web/public/playtest-preview/ai-grassland-tile-64.png` | `64×64` PNG (7,879 B) | **Đã có** (Grassland tile) |

### 2.2. Procedural Pixel-Art Textures bằng code (`packages/game/src/playtest/procedural-pixel-art.ts`)

Trong `packages/game/src/playtest/procedural-pixel-art.ts`, dự án đã có bộ sinh `CanvasTexture` nearest-neighbor (`registerPlaytestPixelTextures`) cho 6 texture dự phòng/cơ bản:
- `mfd-px-iron-golem` (`32×32`)
- `mfd-px-zombie` (`32×32`)
- `mfd-px-grass-even` (`32×32`) & `mfd-px-grass-odd` (`32×32`)
- `mfd-px-energy` (`16×16` — Energy Orb vàng cam)
- `mfd-px-crystal` (`16×16` — Power Crystal xanh lam)

Cùng với đó, `packages/game/src/scenes/playtest-scene.ts` đã có sẵn các hiệu ứng VFX vẽ bằng Phaser Graphics/Tweens cho đạn bắn, vùng băng (`glacial_fortress`), khiên bảo vệ (`iron_bastion`), mưa tên lửa (`meteor_arrow_rain`), bão tuyết (`blizzard`/`absolute_zero`), động đất (`earthquake`) và lướt lửa (`wildfire_rush`).

### 2.3. Thư mục Asset Chính Thức (`apps/web/public/assets/`)

Hiện tại cả 5 thư mục con trong `apps/web/public/assets/` chỉ mới chứa `.gitkeep` (chưa có file):
- `apps/web/public/assets/sprites/` (0 file)
- `apps/web/public/assets/effects/` (0 file)
- `apps/web/public/assets/maps/` (0 file)
- `apps/web/public/assets/animations/` (0 file)
- `apps/web/public/assets/sounds/` (0 file — không bắt buộc cho MVP)

---

## 3. Kế hoạch Sản xuất Asset cho Phiên Chuyên Tạo Asset (Asset Creation Plan & Manifest)

Phần này được thiết kế độc lập theo quy trình của skill `create-game-assets` để Owner có thể copy trực tiếp sang **phiên chuyên tạo asset**.

### 3.1. Quy chuẩn Kỹ thuật Chung (Style Bible & Normalization Rules)

- **Góc nhìn & Phong cách:** 2D Side-View Tactical Tower Defense, Minecraft-inspired blocky voxel/pixel-art aesthetic, viền tối rõ nét (`#0F172A` / `#1E293B`), đổ bóng bậc thang rõ silhouette trên nền cỏ xanh.
- **Hướng nhìn (Facing Direction):**
  - **Defenders (5 Base + 7 Fusion):** Quay mặt sang **PHẢI** (nhìn về phía Enemy đi từ phải sang trái).
  - **Enemies (4 Enemies):** Quay mặt sang **TRÁI** (di chuyển từ phải sang trái về phía Base).
- **Kích thước & Định dạng chuẩn:**
  - **Unit Sprites (Defenders & Enemies) & Map Tiles:** `64×64` px, PNG 32-bit RGBA **nền trong suốt hoàn toàn (transparent background)** (riêng tile nền `grassland` phủ kín `64×64` opaque).
  - **Collectibles, Projectiles & Ability Icons:** `32×32` hoặc `64×64` px, PNG RGBA nền trong suốt.
  - **Pivot / Căn lề nhân vật:** Chân nhân vật chạm đường baseline ở `y = 58..60` (chừa `4..6` px dưới đáy), căn giữa theo chiều ngang (`x = 32`), nhân vật chiếm khoảng `75%–85%` chiều cao khung `64×64` để đồng nhất với 9 sprite đã tạo trong `playtest-preview/`.

### 3.2. Danh mục Asset Cần Tạo Mới / Chuẩn Hóa (4 Batches theo Độ Ưu Tiên)

#### Batch A — BẮT BUỘC (Priority 1): 7 Tier-2 Fusion Defenders (`64×64` transparent PNG)

Hiện tại 5 Base Defenders và 4 Enemies đều đã có file `64×64` PNG, nhưng **7 Tier-2 Fusion Defenders chưa có file PNG nào**. Đây là hạng mục quan trọng nhất cần tạo trong phiên asset để đáp ứng tiêu chí `ROADMAP.md` §2 (*"basic Minecraft-style Pixel Art cho Base Defender, Enemy, Fusion Defender và battlefield Grassland; Placeholder-only không đáp ứng tiêu chí hình ảnh cuối Functional MVP"*):

| STT | Entity ID | Tên hiển thị | Công thức Fusion | Đường dẫn đích chuẩn (`apps/web/public/...`) | Mô tả hình ảnh / Prompt gợi ý (Side-view, facing RIGHT, 64×64 transparent pixel art) |
| --- | --- | --- | --- | --- | --- |
| A1 | `steel_guardian` | **Steel Guardian** | `iron_golem + iron_golem` | `/assets/sprites/defenders/steel_guardian.png` | Blocky Minecraft mega-armored Iron Golem, heavy polished steel plates, golden shoulder trim & glowing cyan/gold core chest emblem, tower-shield arms, facing right, 64×64 pixel art, transparent background. |
| A2 | `frost_guardian` | **Frost Guardian** | `iron_golem + snow_golem` | `/assets/sprites/defenders/frost_guardian.png` | Blocky Minecraft Iron Golem fused with glacial ice armor, frost crystal pauldrons, glowing ice-blue eyes, frozen snow crest, facing right, 64×64 pixel art, transparent background. |
| A3 | `ice_golem` | **Ice Golem** | `snow_golem + snow_golem` | `/assets/sprites/defenders/ice_golem.png` | Blocky Minecraft carved permafrost Ice Golem, translucent cyan-blue ice blocks, icicle crown and雙 frost cannon arms launching ice shards, facing right, 64×64 pixel art, transparent background. |
| A4 | `skeleton_sniper` | **Skeleton Sniper** | `skeleton + skeleton` | `/assets/sprites/defenders/skeleton_sniper.png` | Blocky Minecraft elite skeleton marksman wearing dark ranger hood/cloak, holding a long reinforced heavy longbow drawn with a glowing piercing arrow, facing right, 64×64 pixel art, transparent background. |
| A5 | `inferno_archer` | **Inferno Archer** | `blaze + skeleton` | `/assets/sprites/defenders/inferno_archer.png` | Blocky Minecraft skeleton archer infused with Blaze fire, molten orange-gold bone armor, floating blaze rods around shoulders, drawing a flaming bow with a fiery arrow, facing right, 64×64 pixel art, transparent background. |
| A6 | `flame_fang` | **Flame Fang** | `blaze + wolf` | `/assets/sprites/defenders/flame_fang.png` | Blocky Minecraft ferocious elemental fire wolf, dark charcoal fur with glowing magma cracks, flaming mane and tail, blazing amber eyes and fiery fangs, facing right, 64×64 pixel art, transparent background. |
| A7 | `alpha_wolf` | **Alpha Wolf** | `wolf + wolf` | `/assets/sprites/defenders/alpha_wolf.png` | Blocky Minecraft large pack-leader dire wolf, silver-white and dark slate fur, battle scar, glowing cyan/gold alpha collar and aura, crouching ready to pounce, facing right, 64×64 pixel art, transparent background. |

#### Batch A2 — ĐÃ CHỐT NGOẠI HÌNH (`2026-11-23`, Priority 1): 8 Tier-2 Fusion Defenders còn lại (`64×64` transparent PNG)

| STT | Entity ID | Tên hiển thị | Công thức Fusion | Đường dẫn đích chuẩn (`apps/web/public/...`) | Mô tả hình ảnh đã chốt (Side-view, facing RIGHT, 64×64 transparent pixel art) |
| --- | --- | --- | --- | --- | --- |
| A8 | `iron_ranger` | **Iron Ranger** | `iron_golem + skeleton` | `/assets/sprites/defenders/iron_ranger.png` | Blocky Minecraft armored skeleton heavy marksman wearing thick iron-golem plate armor on shoulders/chest, wielding a heavy mechanical steel crossbow/longbow loaded with a heavy steel bolt, archer silhouette (not bulky golem), iron-gray + bone-white + dark outline, facing right, 64×64 pixel art, transparent background. |
| A9 | `ironfang_guardian` | **Ironfang Guardian** | `iron_golem + wolf` | `/assets/sprites/defenders/ironfang_guardian.png` | Blocky Minecraft muscular four-legged armored guardian wolf covered in forged iron-golem steel plates on shoulders, chest and spine, gleaming metallic fangs and claws, steel-gray and brown/gray fur, facing right, 64×64 pixel art, transparent background. |
| A10 | `magma_colossus` | **Magma Colossus** | `iron_golem + blaze` | `/assets/sprites/defenders/magma_colossus.png` | Blocky Minecraft massive grounded Iron Golem with glowing orange-red molten lava cracks running through dark iron armor, blazing magma chest core and giant molten fists, sturdy grounded stance, facing right, 64×64 pixel art, transparent background. |
| A11 | `frostbite_ranger` | **Frostbite Ranger** | `snow_golem + skeleton` | `/assets/sprites/defenders/frostbite_ranger.png` | Blocky Minecraft frost-coated skeleton archer with crystalline ice armor on shoulders, forearms and ribs, drawing a glowing cyan ice bow loaded with a single sharp glacial crystal arrow, snow-white + ice-blue + bone-gray palette, facing right, 64×64 pixel art, transparent background. |
| A12 | `frostfang` | **Frostfang** | `snow_golem + wolf` | `/assets/sprites/defenders/frostfang.png` | Blocky Minecraft agile four-legged frost wolf (sleeker than Ironfang Guardian) with snow-white and ice-blue fur, sharp frost crystals along spine and shoulders, icy mist around muzzle and glowing ice-blue fangs/claws, facing right, 64×64 pixel art, transparent background. |
| A13 | `steam_warden` | **Steam Warden** | `snow_golem + blaze` | `/assets/sprites/defenders/steam_warden.png` | Blocky Minecraft elemental humanoid guardian with split frost-ice blue armor on one side and glowing fiery-orange armor on the other, pressurized iron/brass steam vents and pale white-gray steam plumes around a central thermal pressure core, facing right, 64×64 pixel art, transparent background. |
| A14 | `bonefang_hunter` | **Bonefang Hunter** | `skeleton + wolf` | `/assets/sprites/defenders/bonefang_hunter.png` | Blocky Minecraft lean swift predatory skeletal wolf with dark fur, exposed pale bone ribcage and jaw, spiked bone spine ridge and faint glowing eyes, low hunting stance, facing right, 64×64 pixel art, transparent background. |
| A15 | `infernal_archon` | **Infernal Archon** | `blaze + blaze` | `/assets/sprites/defenders/infernal_archon.png` | Blocky Minecraft levitating humanoid fire archon with twin radiant white-gold solar cores on chest, orbiting golden-orange blaze rods and fiery wing-like aura, intense orange-red-gold flame palette, facing right, 64×64 pixel art, transparent background. |

#### Batch B — CHUẨN HÓA (Priority 2): Promote 10 Asset `playtest-preview` sang `/assets/` + Variant Tile Cỏ

Copy/promote 10 file PNG đã có từ `apps/web/public/playtest-preview/` sang cấu trúc thư mục chính thức `apps/web/public/assets/` (giữ nguyên bản cũ ở `playtest-preview/` hoặc dùng chung qua manifest để không làm gãy `/playtest`):

| STT | ID | Nguồn hiện có (`playtest-preview/`) | Đường dẫn đích chuẩn (`apps/web/public/assets/...`) | Ghi chú cho phiên Asset |
| --- | --- | --- | --- | --- |
| B1 | `iron_golem` | `ai-iron-golem-64.png` | `/assets/sprites/defenders/iron_golem.png` | Đã có — copy/chuẩn hóa sang `/assets/sprites/defenders/`. |
| B2 | `snow_golem` | `ai-snow-golem-64.png` | `/assets/sprites/defenders/snow_golem.png` | Đã có — copy/chuẩn hóa sang `/assets/sprites/defenders/`. |
| B3 | `skeleton` | `ai-skeleton-64.png` | `/assets/sprites/defenders/skeleton.png` | Đã có — copy/chuẩn hóa sang `/assets/sprites/defenders/`. |
| B4 | `wolf` | `ai-wolf-64.png` | `/assets/sprites/defenders/wolf.png` | Đã có — copy/chuẩn hóa sang `/assets/sprites/defenders/`. |
| B5 | `blaze` | `ai-blaze-64.png` | `/assets/sprites/defenders/blaze.png` | Đã có — copy/chuẩn hóa sang `/assets/sprites/defenders/`. |
| B6 | `zombie` | `ai-zombie-64.png` | `/assets/sprites/enemies/zombie.png` | Đã có — kiểm tra hướng mặt sang TRÁI, copy sang `/assets/sprites/enemies/`. |
| B7 | `husk` | `ai-husk-64.png` | `/assets/sprites/enemies/husk.png` | Đã có — kiểm tra hướng mặt sang TRÁI, copy sang `/assets/sprites/enemies/`. |
| B8 | `vindicator` | `ai-vindicator-64.png` | `/assets/sprites/enemies/vindicator.png` | Đã có — kiểm tra hướng mặt sang TRÁI, copy sang `/assets/sprites/enemies/`. |
| B9 | `pillager` | `ai-pillager-64.png` | `/assets/sprites/enemies/pillager.png` | Đã có — kiểm tra hướng mặt sang TRÁI, copy sang `/assets/sprites/enemies/`. |
| B10 | `grassland_tile_light` | `ai-grassland-tile-64.png` | `/assets/maps/grassland_tile_light.png` | Đã có — dùng cho ô chẵn `(row + col) % 2 === 0`. |
| B11 | `grassland_tile_dark` | *(Tạo mới hoặc biến thể tông đậm hơn)* | `/assets/maps/grassland_tile_dark.png` | **Tùy chọn tạo thêm 1 tile `64×64`** cỏ xanh đậm hơn một chút cho ô lẻ `(row + col) % 2 === 1` để bàn cờ 5×9 dễ nhìn ranh giới ô. |

#### Batch C — VẬT PHẨM & ĐẠN / HIỆU ỨNG (Priority 3): Collectibles & Projectiles (`32×32` hoặc `64×64` transparent PNG)

*(Lưu ý: Nếu phiên tạo asset chưa tạo kịp một vài file trong Batch C, runtime vẫn có fallback sắc nét từ `procedural-pixel-art.ts` và Phaser Graphics; nhưng tạo đủ Batch C sẽ giúp mặt hình ảnh MVP đồng bộ 100%).*

| STT | Asset ID | Đường dẫn đích chuẩn (`apps/web/public/assets/...`) | Kích thước | Mô tả hình ảnh |
| --- | --- | --- | --- | --- |
| C1 | `energy_orb` | `/assets/sprites/items/energy_orb.png` | `64×64` | Glowing golden-amber Minecraft XP/Energy orb with bright core and pixel sparkles, transparent background. |
| C2 | `power_crystal` | `/assets/sprites/items/power_crystal.png` | `64×64` | Faceted cyan-blue Minecraft Power Crystal / diamond shard with bright magic glow, transparent background. |
| C3 | `proj_arrow` | `/assets/effects/proj_arrow.png` | `32×32` | Pixel-art wooden arrow with flint tip pointing right (rotated in Phaser for Pillager), transparent background. |
| C4 | `proj_piercing_arrow` | `/assets/effects/proj_piercing_arrow.png` | `32×32` | Heavy glowing cyan/gold sniper arrow pointing right (`piercing_barrage`), transparent background. |
| C5 | `proj_fireball` | `/assets/effects/proj_fireball.png` | `32×32` | Minecraft Blaze fireball / flaming arrow projectile pointing right, transparent background. |
| C6 | `proj_snowball` | `/assets/effects/proj_snowball.png` | `32×32` | Pixel-art packed snowball / frost shard projectile, transparent background. |
| C7 | `vfx_frost_shield` | `/assets/effects/vfx_frost_shield.png` | `64×64` | Translucent pixel-art ice barrier / frost crystal ring overlay (`glacial_fortress`), transparent background. |
| C8 | `vfx_iron_bastion` | `/assets/effects/vfx_iron_bastion.png` | `64×64` | Translucent golden-steel hexagonal aegis shield overlay (`iron_bastion`), transparent background. |
| C9 | `proj_iron_wolf` | `/assets/effects/proj_iron_wolf.png` | `64×64` | **Sói sắt xung kích (`guardian_charge` của Ironfang Guardian):** Blocky Minecraft charging/leaping compact iron-armored wolf mid-sprint facing RIGHT, glowing steel fangs and subtle metallic dash trail, side-view, 64×64 pixel art, transparent background. *(Đã tạo)* |
| C10 | `proj_frost_pierce_arrow` | `/assets/effects/proj_frost_pierce_arrow.png` | `32×32` | **Mũi tên băng xuyên thấu (`glacier_barrage` của Frostbite Ranger):** Sharp elongated crystalline cyan-white glacial ice arrow pointing RIGHT with icy frost shimmer trail, 32×32 pixel art, transparent background. *(Đã tạo)* |
| C11 | `proj_fire_wolf` | `/assets/effects/proj_fire_wolf.png` | `64×64` | **Sói lửa nhảy vồ (`wildfire_rush` của Flame Fang — 5 sói lửa vồ 5 lane):** Blocky Minecraft fiery elemental wolf mid-leap pouncing toward the RIGHT, blazing orange-gold flames along mane/tail and glowing magma jaws, side-view, 64×64 pixel art, transparent background. |
| C12 | `proj_steel_bolt` | `/assets/effects/proj_steel_bolt.png` | `32×32` | **Chốt thép hạng nặng (`siege_volley` & đòn thường của Iron Ranger):** Heavy thick forged-steel crossbow/siege bolt with reinforced armor-piercing tip and metallic sheen pointing RIGHT, 32×32 pixel art, transparent background. |
| C13 | `proj_meteor_arrow` | `/assets/effects/proj_meteor_arrow.png` | `32×32` | **Mũi tên thiên thạch (`meteor_arrow_rain` của Inferno Archer):** Blazing meteor fire arrow angled downward-right (45°) with molten orange-yellow flame head and ember trail, 32×32 pixel art, transparent background. |
| C14 | `vfx_predator_mark` | `/assets/effects/vfx_predator_mark.png` | `32×32` | **Dấu Ấn Săn Mồi (`predator_mark` của Bonefang Hunter — icon trên đầu Enemy bị `Vulnerable +40%`):** Crisp pixel-art crimson-red glowing wolf fang/claw hunter target mark icon with dark outline, centered, 32×32 pixel art, transparent background. |
| C15 | `vfx_frost_claw` | `/assets/effects/vfx_frost_claw.png` | `64×64` | **Vệt vuốt băng (`winter_pounce` của Frostfang — quét 3 ô phía trước):** Sharp triple crystalline ice-blue and white claw slash arc sweeping toward the RIGHT with tiny frost shards, 64×64 pixel art, transparent background. |
| C16 | `vfx_steam_burst` | `/assets/effects/vfx_steam_burst.png` | `64×64` | **Nổ hơi nước áp suất (`thermal_collapse` của Steam Warden — vùng `3×3`):** Pressurized circular burst of pale white-cyan pixel steam clouds with subtle orange-blue thermal shock sparks radiating outward, 64×64 pixel art, transparent background. |
| C17 | `vfx_ice_block` | `/assets/effects/vfx_ice_block.png` | `64×64` | **Khối băng đóng cứng (`absolute_zero`, `glacier_barrage`, trạng thái `Freeze`):** Semi-transparent blocky Minecraft crystalline ice cube overlay with crisp light-blue highlights and frost cracks to wrap frozen enemies, 64×64 pixel art, transparent background. |
| C18 | `vfx_earth_crack` | `/assets/effects/vfx_earth_crack.png` | `64×64` | **Nứt đất chấn động (`earthquake` của Iron Golem & `eruption` của Magma Colossus):** Pixel-art jagged rocky ground fissure/shockwave crater with flying stone pebbles (top-down/isometric ground decal), 64×64 pixel art, transparent background. |
| C19 | `vfx_howl_ring` | `/assets/effects/vfx_howl_ring.png` | `64×64` | **Vòng sóng hú cường hóa (`pack_frenzy` & `alpha_howl` — vùng buff `3×3`):** Pixel-art radiant golden-cyan concentric sonic buff ring with small upward energy sparks, 64×64 pixel art, transparent background. |

#### Batch D — KHUNG CẢNH SÂN ĐẤU (Priority 4 — Optional Polish):

| STT | Asset ID | Đường dẫn đích chuẩn (`apps/web/public/assets/...`) | Kích thước | Mô tả hình ảnh |
| --- | --- | --- | --- | --- |
| D1 | `base_gate_tile` | `/assets/maps/base_gate_tile.png` | `64×64` | Minecraft cobblestone/oak fortress wall & gate segment for the left-side Player Base defense line (`col < 0`). |
| D2 | `spawn_portal_tile` | `/assets/maps/spawn_portal_tile.png` | `64×64` | Dark ominous stone/nether-style raid spawn marker for the right-side Enemy Spawn border (`col = 9`). |

---

## 4. Các Quyết định Kỹ thuật Đã Chốt (`D-86` đến `D-95` = Phương án A, `2026-11-23`)

Toàn bộ 10 quyết định kỹ thuật `D-86`..`D-95` đã được Owner chốt theo **Phương án A**:

### `D-86` — Chuẩn thư mục Asset, Manifest và Cơ chế Fallback an toàn
- **Phương án A (Khuyến nghị):**
  - Định nghĩa một module manifest tập trung tại `packages/game/src/assets/asset-manifest.ts` ánh xạ toàn bộ **20 `DefenderDefinitionId`** (5 Base + 15 Tier-2 Fusion), 4 `EnemyDefinitionId`, `grassland` tiles, `energy_orb`, `power_crystal` và `effects` (bao gồm `proj_iron_wolf`, `proj_frost_pierce_arrow`) tới đường dẫn chuẩn dưới `/assets/...` (với fallback tự động sang `/playtest-preview/ai-*-64.png` nếu file mới chưa copy sang `/assets/`, và fallback cấp 2 sang `procedural-pixel-art.ts` CanvasTexture nếu một file optional VFX chưa tồn tại).
  - Nhờ đó, quá trình code UI/Battlefield và quá trình tạo asset của Owner hoàn toàn không chặn nhau; ngay khi Owner thả file PNG mới vào `apps/web/public/assets/...`, game tự động hiển thị sprite mới mà không cần sửa logic scene.
- **Phương án B:** Hardcode đường dẫn `/assets/...` và báo lỗi crash scene nếu thiếu bất kỳ file PNG nào.

### `D-87` — Chính sách Render Pixel Art và Simple Animations trong Phaser
- **Phương án A (Khuyến nghị):**
  - Bật `render: { pixelArt: true, antialias: false, roundPixels: true }` trong cấu hình Phaser Game để toàn bộ sprite `64×64` hiển thị sắc nét (nearest-neighbor).
  - Hỗ trợ **Simple Animations** kết hợp:
    1. Nếu asset là single-frame `64×64` PNG (như bộ `ai-*-64.png` hiện tại): Phaser Scene tự động áp dụng deterministic visual tweens/states tách biệt khỏi simulation tick gồm: *Idle breathing/floating bob* (đặc biệt cho `blaze` và `inferno_archer`), *Attack recoil/lunge*, *Damage hit white/red tint flash*, *Status overlays* (`Freeze` băng xanh đứng yên, `Slow` phủ sương lam, `Stun` sao choáng, `Burn` lửa cháy, `Shield` vòng khiên), và *Fusion burst animation* khi ghép 2 Tier-1 thành Tier-2.
    2. Nếu Owner cung cấp thêm horizontal spritesheet (`128×64` 2-frame hoặc `256×64` 4-frame `idle/attack`), asset loader tự động nhận diện theo chiều rộng (`width > 64 && width % 64 === 0`) để tạo Phaser Sprite Animation.
- **Phương án B:** Bắt buộc mọi thực thể phải có spritesheet nhiều frame mới hiển thị chuyển động.

### `D-88` — Kiến trúc Điều hướng Màn hình (`Screen Stack` tại route chính `/`)
- **Phương án A (Khuyến nghị):**
  - Nâng cấp trang chủ `/` (`apps/web/app/page.tsx`) thành ứng dụng hoàn chỉnh của Functional MVP (trong khi vẫn giữ nguyên route `/playtest` cho nhu cầu test cân bằng 1-lane của Owner).
  - Áp dụng mô hình **Screen/Menu State Stack** (theo skill `game-ui-ux`):
    - Các màn hình cấp cao (React): `MAIN_MENU` → `LEVEL_SELECT` → `BATTLE` (chứa Phaser Host + React Gameplay HUD) | `DEFENDER_COLLECTION` | `ACHIEVEMENTS` | `SETTINGS`.
    - Các lớp phủ modal (Overlays trên màn hình hiện tại): `PAUSE_MODAL`, `HOW_TO_PLAY_MODAL`, `VICTORY_MODAL`, `DEFEAT_MODAL`.
  - Giữ nguyên hợp đồng vòng đời `createPhaserHostLifecycle` (`T-02`) để Phaser instance được khởi tạo sạch khi vào `BATTLE` và hủy sạch (`destroy(true)`) khi thoát ra menu, không rò rỉ canvas hay listener.
- **Phương án B:** Tạo từng route Next.js riêng lẻ (`/menu`, `/level-select`, `/collection`, `/achievements`, `/settings`, `/battle`) khiến việc chuyển màn hình phải mount/unmount trang nhiều lần.

### `D-89` — Luồng Save & Resume (`Continue Saved Battle`) và Mở khóa Tiến độ (`ProgressionStore`)
- **Phương án A (Khuyến nghị):**
  - Khi mở `Main Menu` và `Level Selection`, hệ thống đọc `CheckpointManager.hasActiveCheckpoint()` (`mfd.active_battle.v1`) và `ProgressionStore.load()` (`mfd.progression.v1`) qua `BrowserLocalStorageAdapter` (`T-11`):
    - Nếu có trận đang lưu dở (`status === 'in_progress'`), hiển thị nổi bật nút **"Continue Saved Battle (Wave X/5)"** bên cạnh nút **"Start New Battle"**.
    - Nếu chọn **Start New Battle**, khởi tạo `BattleRuntime` với trạng thái unlock từ `ProgressionStore.applyProgressionUnlocks()` (mặc định ban đầu mở `iron_golem`, `skeleton` và 3 recipe `fusion_skeleton_sniper`, `fusion_steel_guardian`, `fusion_iron_ranger`) và ghi checkpoint ban đầu.
    - Trong trận đấu, `CheckpointManager.saveFromRuntime(runtime)` được gọi tự động sau mỗi player command thành công (`summon`, `fuse`, `activateAbility`, `collectItem`, `claimPendingWaveReward`), tại mỗi đầu Wave mới, và khi bấm `Pause` hoặc `beforeunload`.
    - Khi trận đấu kết thúc ở `Victory`, gọi `ProgressionStore.recordVictory({ enemyKills })` + `CheckpointManager.clear()`, đồng thời hiển thị danh sách Defender & Fusion Recipe vừa được mở khóa ngay trên `Victory Modal`.
    - Khi trận đấu kết thúc ở `Defeat`, gọi `CheckpointManager.clear()` (không cộng tiến độ unlock theo đúng luật `ROADMAP.md` §2).
- **Phương án B:** Chỉ lưu trận khi người chơi chủ động bấm nút "Save Game" trong menu Pause.

### `D-90` — Thiết kế Tương tác Chuột / Kéo-Thả trên Sân đấu 5×9 (`Battlefield Input UX`)
- **Phương án A (Khuyến nghị):**
  - Hỗ trợ đồng thời **Drag-and-Drop** và **Click-to-Select / Click-to-Apply** (tương tự trải nghiệm mượt đã kiểm chứng ở `/playtest` nhưng mở rộng chuẩn cho sân 5×9 Campaign):
    1. **Collectibles Priority (`GAMEPLAY_MECHANICS.md` §18):** Khi click vào một vị trí trên sân có `Energy Item` hoặc `Power Crystal Item` đang nằm đè lên ô có Defender, **ưu tiên nhặt Item trước**, không kích hoạt chọn/kéo Defender.
    2. **Summon Base Defender:** Người chơi click chọn một Base Defender trên thanh HUD (hoặc kéo từ thẻ HUD) rồi click/thả vào một ô trống `(row: 0..4, col: 0..8)`. Các Defender chưa mở khóa hiển thị ổ khóa (`Locked` + điều kiện mở), các Defender không đủ Energy hoặc đang Cooldown hiển thị rõ trạng thái.
    3. **Free Unlimited-Distance Fusion (`T-08`):** Kéo một Tier-1 Defender đang đứng trên sân (`Source Cell`) thả đè lên một Tier-1 Defender khác ở bất kỳ ô nào trên sân 5×9 (`Target Cell`). Khi đang kéo, highlight màu xanh lá/vàng các ô chứa `Target Defender` có công thức Fusion hợp lệ & đã unlock, và hiển thị preview tên Tier-2 kết quả; khi thả chuột, gọi `runtime.fuse({ sourceCell, targetCell })` đặt Tier-2 tại `Target Cell` và giải phóng `Source Cell`.
    4. **Power Crystal Special Ability (`T-10`):** Kéo biểu tượng **Power Crystal** từ thanh HUD (hoặc chọn công cụ Crystal rồi click) thả lên một Defender trên sân 5×9 để gọi `runtime.activateAbility({ cell })` (tốn `1` Power Crystal, `0s` cooldown).
    5. **Shovel / Remove Defender (Tùy chọn tiện ích hoặc giữ chuẩn GDD):** Chỉ cho phép thao tác hợp lệ theo `BattleRuntime`; mọi thao tác bị từ chối đều hiển thị toast tiếng Anh ngắn gọn (`Insufficient Energy`, `Defender on Cooldown`, `Recipe Locked`, `No Valid Ability Target`, v.v.).
- **Phương án B:** Chỉ hỗ trợ click 2 bước, bỏ thao tác kéo-thả trực quan trên canvas.

### `D-91` — Kiến trúc Cập nhật HUD theo Sự kiện (`Event-Driven HUD Snapshot`)
- **Phương án A (Khuyến nghị):**
  - Tuân thủ skill `game-ui-ux`: React HUD **không** poll toàn bộ danh sách entity 60 lần/giây.
  - Phaser Scene chạy vòng lặp render 60fps mượt mà cho chuyển động liên tục của Enemy, đạn và hiệu ứng; còn React HUD (`Energy`, `Power Crystals x/5`, `Claim Pending Reward`, `Wave x/5`, `Enemy Remaining`, `Defender Cooldowns`, `Toast Message`) chỉ cập nhật khi `SimulationClock` bước qua tick mới hoặc khi người chơi vừa thực thi một command.
- **Phương án B:** Đồng bộ toàn bộ React state ở mỗi frame `requestAnimationFrame` 60Hz.

### `D-92` — Bộ dữ liệu Cân bằng Mặc định cho Chiến dịch Grassland 5 Waves (`Campaign Production Preset`)
- **Phương án A (Khuyến nghị):**
  - Đóng gói cấu hình chiến dịch Grassland 5×9 (5 Waves) chuẩn từ bộ thông số đã được Owner duyệt trong `ABILITY_CATALOG.md v2.0` và thử nghiệm tại `T-10B` thành `GRASSLAND_CAMPAIGN_CONFIG` trong `@mfd/game`:
    - Grid `5×9`, Starting Energy `150`, Starting Power Crystals `1` (Max `5`), Periodic Energy spawn định kỳ trên sân.
    - 5 Waves tăng dần độ khó trên 5 hàng ngang (`Wave 1`: Zombie; `Wave 2`: Zombie + Husk; `Wave 3`: Zombie + Husk + Pillager; `Wave 4`: Husk + Vindicator + Pillager; `Wave 5`: Đợt tổng tấn công 5 làn gồm Zombie, Husk, Vindicator, Pillager), kèm phần thưởng `Power Crystal` sau mỗi Wave.
    - Giữ kiến trúc data-driven sạch sẽ để sau khi hoàn thành `T-12`, Owner có thể tinh chỉnh lại các con số cân bằng (như đã thống nhất: *"sau khi hoàn chỉnh hết sẽ quay lại cân bằng game"*) chỉ bằng cách sửa một bảng thông số duy nhất.
- **Phương án B:** Dùng dữ liệu test fixture tối giản (1–2 enemy mỗi wave) không phản ánh đủ 4 loại Enemy trên 5 làn.

### `D-93` — Màn hình `Defender Collection` & `Achievements`
- **Phương án A (Khuyến nghị):**
  - **`Defender Collection`:** Chia 3 tab trực quan bằng tiếng Anh:
    1. *Base Defenders (5)* — Hiển thị sprite pixel-art `64×64`, Role, Energy Cost, Stats, Special Ability (`1 Crystal`) và trạng thái `Unlocked` / `Locked (Requirement)`.
    2. *Fusion Defenders (15)* — Hiển thị sprite pixel-art `64×64` của 15 Tier-2 Defenders, công thức `Ingredient A + Ingredient B = Result`, Stats và Special Ability.
    3. *Fusion Recipes Matrix (15)* — Bảng tra cứu nhanh 15 công thức ghép để người chơi mới dễ nắm bắt.
  - **`Achievements & Milestones`:** Hiển thị thẻ thống kê `Total Grassland Victories`, `Cumulative Enemy Kills (in Victories)` và 5 mốc tiến độ có thanh progress bar rõ ràng:
    1. *First Line of Defense* (Unlocked at start: Iron Golem, Skeleton, Steel Guardian, Skeleton Sniper, Iron Ranger).
    2. *First Grassland Victory* (`1 / 1 Victory` → Unlocks **Snow Golem**, **Ice Golem**, **Frost Guardian**, **Frostbite Ranger**).
    3. *Wolf Pack Hunter* (`50 / 50 Cumulative Enemy Kills in Victories` → Unlocks **Wolf**, **Alpha Wolf**, **Ironfang Guardian**, **Bonefang Hunter**).
    4. *Blazing Veteran* (`5 / 5 Grassland Victories` → Unlocks **Blaze**, **Infernal Archon**, **Magma Colossus**, **Inferno Archer**, **Flame Fang**).
    5. *Master of Fusion* (Unlock all 5 Base Defenders & 15 Fusion Recipes, bao gồm **Frostfang** và **Steam Warden**).
- **Phương án B:** Chỉ hiển thị danh sách chữ đơn giản không có sprite preview hay công thức Fusion.

### `D-94` — Màn hình `Settings` & `Basic In-Game Instructions`
- **Phương án A (Khuyến nghị):**
  - Cung cấp modal/screen **How to Play (Basic Instructions)** bằng tiếng Anh ngắn gọn, trực quan (4 thẻ minh họa: *1. Collect Energy & Summon*, *2. Drag-and-Drop Fusion (Any Distance, Free)*, *3. Drag Power Crystal for Special Abilities*, *4. Defend 5 Waves & Unlock New Units*).
  - Cung cấp **Settings**:
    - Tuỳ chọn hiển thị (*Visual Style*: `Pixel Art 64×64 (Default)` / `Procedural Pixel Fallback`, *Show Grid Coordinates*).
    - Tuỳ chọn âm thanh placeholder (*SFX / Music Mute toggles* — ghi chú rõ `Audio optional in MVP`).
    - Quản lý dữ liệu local (*Clear Active Saved Battle*, *Reset All Unlock Progression* kèm hộp thoại xác nhận).
    - Nút mở nhanh **Developer Sandbox (`/playtest`)** hoặc **Unlock All Units (Testing Toggle)** tùy chọn trong mục Developer/Internal Testing để Owner tiện kiểm thử cả luồng cày cuốc chuẩn lẫn luồng mở full 20 Defenders.
- **Phương án B:** Chỉ có màn hình Settings trống với một nút Back.

### `D-95` — Chiến lược Kiểm thử Tự động cho `T-12` (Vitest + Playwright E2E)
- **Phương án A (Khuyến nghị):**
  - **Vitest (`packages/game/tests/`):**
    - Kiểm thử `asset-manifest.test.ts` (đảm bảo toàn bộ 12 Defenders, 4 Enemies, Items, Tiles đều có mapping hợp lệ và cơ chế fallback hoạt động đúng).
    - Kiểm thử `campaign-controller.test.ts` (luồng tạo trận mới với `ProgressionStore`, Summon/Fuse/Ability/Collect trên sân 5×9, lưu/khôi phục `CheckpointManager`, xử lý `Victory` cập nhật unlock và `Defeat` xóa checkpoint).
  - **Playwright E2E (`apps/web/tests/e2e/`):**
    - Giữ xanh toàn bộ 6 test lifecycle hiện có (`phaser-host.spec.cjs`).
    - Bổ sung kiểm thử E2E cho các màn hình MVP (`Main Menu`, `Defender Collection`, `Achievements`, `Settings`, vào trận `Grassland 5×9`, và khôi phục `Continue Saved Battle` sau reload).
- **Phương án B:** Chỉ test thủ công bằng mắt, không viết thêm test cho `T-12`.

---

## 5. Các Lát cắt Triển khai Code (`T-12.1` đến `T-12.6` — Thực thi sau khi chốt Plan & Asset)

1. **Slice `T-12.1` — Asset Manifest & Procedural/PNG Loader (`packages/game/src/assets/`):**
   - Tạo `asset-manifest.ts` chuẩn hóa toàn bộ texture keys và URLs (`/assets/sprites/defenders/*.png`, `/assets/sprites/enemies/*.png`, `/assets/sprites/items/*.png`, `/assets/maps/*.png`, `/assets/effects/*.png`) kèm fallback sang `/playtest-preview/ai-*-64.png` và `procedural-pixel-art.ts` (bổ sung thêm procedural fallback cho các Tier-2 Fusion Defenders trong trường hợp một sprite nào đó chưa kịp render xong).
2. **Slice `T-12.2` — Grassland 5×9 Campaign Preset & Controller (`packages/game/src/campaign/`):**
   - Xây dựng `grassland-campaign-config.ts` và `campaign-controller.ts` kết nối `BattleRuntime` (`T-05`..`T-10`) với `CheckpointManager` và `ProgressionStore` (`T-11`).
3. **Slice `T-12.3` — Phaser 5×9 Grassland Battle Scene (`packages/game/src/scenes/grassland-battle-scene.ts`):**
   - Render bàn cờ Grassland 5×9 với sprite `64×64` (`pixelArt: true`), Base Wall bên trái, Spawn Zone bên phải, thanh máu, hiệu ứng trạng thái (`Slow`, `Freeze`, `Stun`, `Burn`, `Shield`), đạn bắn và VFX cho cả 12 Special Abilities.
   - Xử lý input trên sân 5×9: Click nhặt Item (ưu tiên cao nhất), Click/Drag Summon, Drag-and-Drop Fusion (kèm highlight mục tiêu hợp lệ), Drag-and-Drop Power Crystal để tung kỹ năng.
4. **Slice `T-12.4` — React Screen Stack & Menus (`apps/web/components/screens/`):**
   - Xây dựng `MainMenuScreen`, `LevelSelectScreen`, `DefenderCollectionScreen`, `AchievementsScreen`, `SettingsModal`, `HowToPlayModal` (English-only, Minecraft pixel/blocky UI theme).
5. **Slice `T-12.5` — React Gameplay HUD & Terminal Overlays (`apps/web/components/battle/`):**
   - Xây dựng `BattleHudOverlay` (Energy, Power Crystal orb kéo-thả được + nút `Claim Pending Wave Crystal`, Wave Progress `Wave X/5`, Base Defender Selection Bar hiển thị Cooldown/Cost/Lock state, Speed `1×/2×`, nút `Pause`), `PauseModal`, `VictoryModal` (hiển thị unlock mới), `DefeatModal`.
6. **Slice `T-12.6` — Automated Tests & Verification (`packages/game/tests/` & `apps/web/tests/e2e/`):**
   - Viết unit/integration tests cho Asset Manifest & Campaign Controller, cập nhật Playwright E2E tests, chạy toàn bộ `test`, `typecheck`, `build`, `test:e2e`.

---

## 6. Bộ 20 Tiêu chí Nghiệm thu (`AC-01` đến `AC-20`)

| Gate | Mô tả tiêu chí nghiệm thu |
| --- | --- |
| `AC-01` | `asset-manifest.ts` ánh xạ đầy đủ 5 Base Defenders, 7 Fusion Defenders, 4 Enemies, Grassland tiles, Energy/Crystal items và VFX với fallback an toàn. |
| `AC-02` | Phaser Game bật `pixelArt: true` / nearest-neighbor filtering; hiển thị đúng bộ sprite pixel-art `64×64` trên sân đấu 5×9 mà không bị mờ nhoè. |
| `AC-03` | Có hiệu ứng hình ảnh/chuyển động (simple animations/tweens & VFX) cho Idle, Attack, Hit, Fusion, Status Effects (`Slow`, `Freeze`, `Stun`, `Burn`, `Shield`) và 12 Special Abilities. |
| `AC-04` | `Main Menu` hiển thị đầy đủ bằng tiếng Anh: Play / Level Select, Continue Saved Battle (khi có checkpoint), Defender Collection, Achievements, Settings & How to Play. |
| `AC-05` | `Level Selection` hiển thị Grassland Level (5 Rows × 9 Columns, 5 Waves), trạng thái tiến độ và cho phép bắt đầu trận mới hoặc tiếp tục trận đang lưu. |
| `AC-06` | `Defender Collection` hiển thị đầy đủ 5 Base Defenders, 7 Fusion Defenders và 7 Fusion Recipes cùng thông số, kỹ năng và trạng thái Unlocked/Locked thực tế từ `ProgressionStore`. |
| `AC-07` | `Achievements` hiển thị chính xác `totalVictories`, `totalVictoryEnemyKills` và tiến độ các mốc mở khóa Confirmed (`Snow Golem`, `Wolf`, `Blaze` và các Fusion Recipes tương ứng). |
| `AC-08` | `Settings` & `How to Play` cung cấp hướng dẫn chơi cơ bản bằng tiếng Anh (không cần interactive tutorial), tuỳ chọn hiển thị/âm thanh placeholder và nút Reset dữ liệu local có xác nhận. |
| `AC-09` | Sân đấu Grassland hiển thị đúng lưới **5 Hàng × 9 Cột**; click vào `Energy Item` hoặc `Power Crystal Item` thu thập đúng tài nguyên và ưu tiên nhặt Item trước khi chọn Defender cùng ô. |
| `AC-10` | Thanh chọn Base Defender trên HUD cho phép Summon Defender đã mở khóa vào ô trống hợp lệ, trừ đúng Energy, hiển thị Cooldown và chặn các Defender đang bị khóa (`Locked`). |
| `AC-11` | Kéo-thả một Tier-1 `Source Defender` lên một Tier-1 `Target Defender` ở bất kỳ khoảng cách/hàng nào trên sân 5×9 thực hiện `Fusion` miễn phí (`0 Energy`), đặt Tier-2 tại `Target Cell` và giải phóng `Source Cell`. |
| `AC-12` | Kéo-thả `Power Crystal` từ HUD lên một Defender trên sân 5×9 kích hoạt đúng `Special Ability` của Defender đó (`1 Crystal`, `0s` cooldown) và hiển thị thông báo tiếng Anh rõ ràng nếu bị từ chối. |
| `AC-13` | Khi kho Power Crystal đầy (`5/5`) ở cuối Wave, HUD hiển thị rõ `Pending Wave Reward` và cho phép người chơi bấm `Claim` sau khi đã tiêu bớt Crystal. |
| `AC-14` | HUD hỗ trợ `Pause / Resume` trận đấu; khi `Paused`, simulation dừng hoàn toàn và chặn mọi thao tác đặt quân/ghép quân/dùng kỹ năng theo đúng luật gameplay. |
| `AC-15` | `Save & Resume` hoạt động end-to-end trên trình duyệt: trạng thái trận đấu tự động lưu vào `localStorage` (`mfd.active_battle.v1`) và khôi phục chính xác Wave, Grid, HP, Energy, Crystals, Cooldowns khi reload trang và bấm `Continue Saved Battle`. |
| `AC-16` | Khi thắng cả 5 Waves (`Victory`), màn hình `Victory` hiển thị thống kê trận đấu, ghi nhận tiến độ vào `ProgressionStore` (`mfd.progression.v1`), thông báo các Defender/Recipe vừa mở khóa và xóa active battle checkpoint. |
| `AC-17` | Khi có bất kỳ Enemy nào vượt qua biên trái (`Defeat`), màn hình `Defeat` hiển thị rõ kết quả, không cộng tiến độ mở khóa và xóa active battle checkpoint. |
| `AC-18` | Giữ nguyên và không làm hỏng route `/playtest` (`T-10B`) cũng như hợp đồng dọn dẹp tài nguyên `createPhaserHostLifecycle` (`T-02`). |
| `AC-19` | Toàn bộ văn bản giao diện người chơi, thông báo lỗi và hướng dẫn trong MVP đều bằng **tiếng Anh (English-only)** theo đúng `ROADMAP.md` §2. |
| `AC-20` | Toàn bộ Vitest unit/integration tests (`@mfd/game`, `@mfd/game-data`), `pnpm typecheck`, `pnpm build` và Playwright E2E tests (`@mfd/web`) đều PASS. |
