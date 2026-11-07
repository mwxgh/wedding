import '@repo/ui/globals.css';

import type { Metadata } from 'next';
import {
  Be_Vietnam_Pro,
  Cormorant_Garamond,
  Dancing_Script,
  Noto_Serif_TC,
  Playfair_Display,
} from 'next/font/google';

import { Toaster } from '@repo/ui/components/sonner';

const sans = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-be-vietnam',
});
// Admin serif; the invitation swaps it for Cormorant, so don't preload it
const serif = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  preload: false,
});
// Only for the 囍 (song hỷ) glyph: not preloaded, the browser fetches just
// the unicode-range slice that contains it
const han = Noto_Serif_TC({
  weight: '700',
  preload: false,
  variable: '--font-noto-han',
});
// Display serif of the invitation pages (see [data-theme='invite'])
const display = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});
// Only used by the 404 and admin pages: not preloaded on the invitation
const script = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dancing',
  preload: false,
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
          ${han.variable} ${display.variable} min-h-dvh overflow-x-hidden
          font-sans leading-relaxed antialiased selection:bg-primary/15`}
      >
        {children}
        <Toaster theme="light" position="top-center" richColors />
      </body>
    </html>
  );
}
