import Link from 'next/link';

import { buttonVariants } from '@repo/ui/components/button';

import { Container } from './_components/common';

export default function NotFound() {
  return (
    <Container
      className={`flex min-h-dvh flex-col items-center justify-center py-20
        text-center`}
    >
      <p className="font-script text-3xl text-primary">Ôi, lạc mất rồi</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">
        Không tìm thấy trang
      </h1>
      <p className="mt-4 mb-8 max-w-md text-muted-foreground">
        Liên kết thiệp mời có thể không đúng. Vui lòng kiểm tra lại.
      </p>
      <Link
        className={buttonVariants({
          size: 'lg',
          className: 'rounded-full px-6 max-sm:h-11',
        })}
        href="/"
      >
        Về trang chủ
      </Link>
    </Container>
  );
}
