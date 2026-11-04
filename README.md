# wedding

Turborepo monorepo (pnpm) gồm 2 app: `api` (NestJS) và `web` (Next.js). Cấu trúc theo cùng khuôn với `turbo-base`.

## Cấu trúc

```text
.
├── apps/
│   ├── api/                    # NestJS 12 API (ESM, cổng 3001)
│   └── web/                    # Next.js 16 app (cổng 3000)
├── packages/
│   ├── db/                     # @repo/db – Prisma schema, migration, seed, client; ./nest: PrismaModule/Service/Filter
│   ├── nest-common/            # @repo/nest-common – decorator field (class-validator) cho DTO của Nest
│   ├── types/                  # @repo/types – interface + enum cho FE (sinh từ Prisma) + request/response viết tay
│   ├── ui/                     # @repo/ui – component React/shadcn, globals.css
│   ├── utils/                  # @repo/utils – hàm thuần dùng chung api ↔ web (lịch cưới, giờ VN)
│   └── tooling/
│       ├── eslint-config/      # @repo/eslint-config – base, next, react, nest
│       └── typescript-config/  # @repo/typescript-config – base, nextjs, nestjs, react-library
├── deploy/                     # Dockerfile cho từng app + docker-compose hạ tầng
├── turbo.json                  # pipeline task của Turborepo
└── pnpm-workspace.yaml         # workspace + catalog phiên bản dùng chung
```

Quy ước:

- `apps/*` là thứ chạy và deploy được. App không import lẫn nhau.
- `packages/*` là thư viện nội bộ `@repo/<tên>`, khai báo bằng `"workspace:*"`. Cấu hình dùng chung nằm trong `packages/tooling/*`.
- Package có `build` (db, nest-common, utils) xuất ra `dist/`. `types` và `ui` export thẳng source TypeScript (web transpile qua `transpilePackages`).
- `api` chỉ được `import type` từ `@repo/types` (Node không chạy được file `.ts` trong package). Enum lúc runtime ở api lấy từ `@repo/db`.
- Phiên bản dùng chung khai báo một lần trong `catalog:` của `pnpm-workspace.yaml`, package tham chiếu bằng `"catalog:"`.

```text
web ──► types, utils, ui
api ──► db, db/nest, nest-common, utils   (+ type-only: types)
```

## Bắt đầu

Yêu cầu Node >= 24 và pnpm 11.

```sh
pnpm install
cp deploy/.env.example deploy/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env

pnpm infra:up       # MySQL, phpMyAdmin, Redis, RustFS
pnpm db:migrate     # áp migration + generate client và types
pnpm db:seed
pnpm dev            # chạy api + web
```

## Lệnh thường dùng

| Lệnh                               | Việc                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| `pnpm dev` / `dev:api` / `dev:web` | Chạy dev mọi app hoặc một app                                 |
| `pnpm build`                       | Build mọi app và package                                      |
| `pnpm lint` / `pnpm check-types`   | Lint và kiểm tra kiểu                                         |
| `pnpm test`                        | Chạy test                                                     |
| `pnpm db:generate`                 | Sinh Prisma client cho api (`packages/db/src/generated`)      |
| `pnpm db:types`                    | Sinh interface + enum cho FE (`packages/types/src/generated`) |
| `pnpm db:migrate` / `db:push`      | Migration hoặc đẩy schema thẳng vào DB (kèm generate)         |
| `pnpm db:check`                    | Kiểm tra DB có khớp schema không                              |
| `pnpm db:studio`                   | Mở Prisma Studio                                              |
| `pnpm infra:up` / `infra:down`     | Bật/tắt hạ tầng Docker                                        |

## Kiểu dữ liệu cho FE

Prisma schema là nguồn duy nhất cho hình dạng model.

```text
packages/db/prisma/schema.prisma
  ├─ generator client  → packages/db/src/generated     (PrismaClient cho api, không commit, chạy trong build)
  └─ generator types   → packages/types/src/generated  (interface JSON + enum cho web, có commit)
```

- Generator `types` nằm ở `packages/db/prisma/generators/types.ts`. Nó sinh interface theo dạng JSON mà api gửi: `DateTime` và `BigInt` thành `string`, quan hệ là field optional.
- Đổi schema thì chạy `pnpm db:migrate` (hoặc `pnpm db:types`) rồi commit `packages/types/src/generated`. Không sửa tay file sinh ra.
- Response cho web viết trong `packages/types/src/responses.ts` bằng model sinh ra, ví dụ `With<Event, { tables: Table[] }>`.
- Api giữ object `include`/`select` của Prisma và kiểu `*Data` trong `apps/api/src/common/responses.ts`. Cuối file có phép kiểm tra lúc biên dịch: nếu dữ liệu api trả về không khớp kiểu của web thì `check-types` báo lỗi.

## Thêm package nội bộ mới

1. Tạo `packages/<tên>/package.json` với `"name": "@repo/<tên>"` và các script `build`, `lint`, `check-types`.
2. Kế thừa tsconfig từ `@repo/typescript-config` và eslint từ `@repo/eslint-config`. Phiên bản thư viện dùng `"catalog:"`.
3. Thêm `"@repo/<tên>": "workspace:*"` vào app cần dùng, rồi `pnpm install`.

## Docker

Mỗi app có một Dockerfile trong `deploy/`, dùng `turbo prune` để chỉ cài phụ thuộc của app đó. Build từ root:

```sh
docker build -f deploy/api.Dockerfile -t wedding-api .
docker build -f deploy/web.Dockerfile -t wedding-web .
```
