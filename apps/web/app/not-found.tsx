import Link from 'next/link';

import { buttonVariants } from '@repo/ui/components/button';

import { Container } from './_components/common';

export default function NotFound() {
  return (
    <Container className="py-18 text-center">
      <h1 className="font-serif text-3xl">Không tìm thấy trang</h1>
      <p className="mt-3 mb-6 text-muted-foreground">
        Liên kết thiệp mời có thể không đúng. Vui lòng kiểm tra lại.
      </p>
      <Link className={buttonVariants({ size: 'lg' })} href="/">
        Về trang chủ
      </Link>
    </Container>
  );
}
