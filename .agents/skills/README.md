# Minecraft Fusion Defense — Project Skills

Bộ ba Project Skills dành cho AI coding agents, được biên soạn từ `GDD.md` và các quyết định gameplay đã xác nhận trong project conversation.

## Cấu trúc

```text
.agents/
└── skills/
    ├── minecraft-gameplay-rules/
    │   └── SKILL.md
    ├── minecraft-fusion-system/
    │   └── SKILL.md
    └── minecraft-gameplay-testing/
        └── SKILL.md
```

## Vai trò

| Skill | Dùng khi |
|---|---|
| `minecraft-gameplay-rules` | Thay đổi hoặc rà soát bất kỳ luật gameplay nào; xử lý tài nguyên, Enemy, Defender, targeting, Wave, Victory/Defeat. |
| `minecraft-fusion-system` | Xây dựng hoặc sửa Fusion, recipe lookup, drag-and-drop, validation, Grid mutation và Fusion result. |
| `minecraft-gameplay-testing` | Viết/chạy unit, integration và E2E tests cho gameplay. |

## Cài đặt vào repository

Giải nén/copy thư mục `.agents/` trong gói này vào root repository của game. Nếu repository đã có `.agents/skills/`, chỉ cần copy ba thư mục skill vào đó; không ghi đè các skill hiện có.

Các file có thể được dùng trực tiếp bởi agent hỗ trợ định dạng Agent Skills. Với công cụ chỉ tìm skill trong thư mục khác, cần cấu hình/copy theo quy ước của công cụ đó.

## Quy tắc về nguồn sự thật

1. Quyết định gameplay được project owner xác nhận.
2. GDD và tài liệu thiết kế chi tiết không bị quyết định mới ghi đè.
3. Code/tests hiện tại là bằng chứng implementation, không tự động là thiết kế đúng.
4. Không tự suy diễn luật còn thiếu. Báo xung đột và hỏi khi cần quyết định có ảnh hưởng gameplay.

## Các điểm cố ý để mở

- Tên chính thức thay thế `Plant Food` chưa được chọn. Skills dùng `Ability Resource` làm thuật ngữ trung lập trong code/tài liệu kỹ thuật.
- Quy tắc target priority chi tiết chưa được tái hiện đầy đủ trong nguồn hiện có. Không tự đặt nearest/first/strongest/random làm luật.
- Chưa có mapping được xác nhận cho biết từng Enemy cụ thể sẽ attack hay ignore Defender.
- Các thông số cân bằng, Fusion costs, cooldowns và nguồn cung Ability Resource cần lấy từ tài liệu được duyệt hoặc quyết định mới.
- GDD có mâu thuẫn giữa roster Defender ban đầu và Fusion recipes (Zombie/Creeper là input recipe nhưng không có trong roster triệu hồi ban đầu). Skills yêu cầu flag thay vì tự sửa.

## Nguồn

- `GDD.md` — Draft v1.0, đặc biệt các phần Battlefield, Entities, Fusion, Ability/Resource, Wave, Level Completion, Technical Direction, MVP Scope và Open Design Decisions.
- Các quyết định gameplay đã xác nhận trong project conversation: Enemy-specific attack/ignore behavior; Energy Items xuất hiện ngẫu nhiên trên chiến trường; yêu cầu đổi tên tài nguyên kích hoạt Ability.
