# web

Next.js 16 app (App Router, cổng 3000).

```sh
pnpm --filter web dev      # http://localhost:3000
pnpm --filter web build
pnpm --filter web start
```

- `app/_components`, `app/_lib`: component và helper riêng của app.
- Component dùng chung lấy từ `@repo/ui`, kiểu dữ liệu API lấy từ `@repo/contracts`.
- Biến môi trường: xem `.env.example` (`NEXT_PUBLIC_API_URL`, ...).
