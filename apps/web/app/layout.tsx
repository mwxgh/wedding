import '@repo/ui/globals.css';

import type { Metadata } from 'next';
import {
  Be_Vietnam_Pro,
  Dancing_Script,
  Playfair_Display,
} from 'next/font/google';

import { Toaster } from '@repo/ui/components/sonner';

const sans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-be-vietnam',
});
const serif = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
});
const script = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dancing',
});

export const metadata: Metadata = {
  title: 'Thiệp cưới',
  description: 'Trân trọng kính mời bạn đến chung vui cùng chúng mình',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (e.g. ColorZilla) add attributes to <html>/<body>
    // before React hydrates; ignore those mismatches on these two tags only.
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${sans.variable} ${serif.variable} ${script.variable}
          overflow-x-hidden font-sans leading-relaxed antialiased`}
      >
        {children}
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
