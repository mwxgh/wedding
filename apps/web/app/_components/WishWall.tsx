'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { HeartIcon, QuoteIcon, XIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import type { PublicGuestbookEntry } from '@repo/types';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';

import { PUBLIC_API_URL } from '../_lib/api';

type Wish = PublicGuestbookEntry & { live?: boolean };

const PAGE = 9;
const SHOW_MS = 6000; // how long a toast stays up
const GAP_MS = 9000; // pause between rotating toasts
const FIRST_MS = 5000; // let the page settle before the first one

/** Approved wishes, kept current over server-sent events. */
function useLiveWishes(initial: PublicGuestbookEntry[]) {
  const [wishes, setWishes] = useState<Wish[]>(initial);
  const [incoming, setIncoming] = useState<Wish | null>(null);

  useEffect(() => {
    const source = new EventSource(`${PUBLIC_API_URL}/public/guestbook/stream`);
    source.addEventListener('wish', (e) => {
      const wish: Wish = {
        ...JSON.parse((e as MessageEvent).data),
        live: true,
      };
      setWishes((prev) =>
        prev.some((w) => w.id === wish.id) ? prev : [wish, ...prev],
      );
      setIncoming(wish);
    });
    // EventSource reconnects on its own after network errors
    return () => source.close();
  }, []);

  return { wishes, incoming };
}

export function WishWall({ initial }: { initial: PublicGuestbookEntry[] }) {
  const { wishes, incoming } = useLiveWishes(initial);
  const [limit, setLimit] = useState(PAGE);
  const reduce = useReducedMotion();

  return (
    <>
      {wishes.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Chưa có lời chúc nào — hãy là người đầu tiên nhé!
        </p>
      ) : (
        <>
          <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            <AnimatePresence initial={false}>
              {wishes.slice(0, limit).map((w) => (
                <motion.li
                  key={w.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-4 break-inside-avoid"
                >
                  <WishCard wish={w} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {wishes.length > limit && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setLimit((n) => n + PAGE)}
              >
                Xem thêm lời chúc ({wishes.length - limit})
              </Button>
            </div>
          )}
        </>
      )}
      <WishToast wishes={wishes} incoming={incoming} />
    </>
  );
}

function WishCard({ wish }: { wish: Wish }) {
  return (
    <Card className="transition-shadow hover:shadow-lift">
      <CardContent className="flex flex-col gap-3">
        <QuoteIcon aria-hidden className="size-5 text-gold" />
        <p className="leading-relaxed whitespace-pre-line text-foreground/90">
          {wish.message}
        </p>
        <p className="font-serif text-base font-medium text-rose-deep">
          — {wish.authorName}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Bottom-right toast: rotates through the wishes (show, hide, next) and jumps
 * straight to a newly approved one. Pauses while hovered or focused; closing
 * it stops the rotation but still lets brand-new wishes through.
 */
function WishToast({
  wishes,
  incoming,
}: {
  wishes: Wish[];
  incoming: Wish | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState<Wish | null>(null);
  const [paused, setPaused] = useState(false);
  const [rotate, setRotate] = useState(true);
  const index = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);

  // Rotation: hidden -> show next after a gap; shown -> hide after SHOW_MS
  useEffect(() => {
    if (paused || wishes.length === 0) return;
    if (current) {
      schedule(() => setCurrent(null), SHOW_MS);
    } else if (rotate) {
      schedule(
        () => {
          setCurrent(wishes[index.current % wishes.length]!);
          index.current += 1;
        },
        index.current === 0 ? FIRST_MS : GAP_MS,
      );
    }
    return () => clearTimeout(timer.current);
  }, [current, paused, rotate, wishes, schedule]);

  // A newly approved wish interrupts whatever is showing
  useEffect(() => {
    if (incoming) setCurrent(incoming);
  }, [incoming]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live={current?.live ? 'polite' : 'off'}
      className={`pointer-events-none fixed inset-x-4
        bottom-[max(1rem,env(safe-area-inset-bottom))] z-[55] flex justify-end
        sm:inset-x-auto sm:right-6 sm:bottom-6`}
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={`pointer-events-auto relative w-full max-w-sm rounded-xl
            border border-gold/40 bg-card/95 p-4 pr-11 shadow-lift
            backdrop-blur-sm`}
          >
            <a
              href="#loi-chuc"
              onClick={() => {
                setPaused(false);
                setCurrent(null);
              }}
              className="flex gap-3 rounded-lg outline-offset-4"
            >
              <span
                aria-hidden
                className={`grid size-9 shrink-0 place-items-center rounded-full
                bg-primary text-primary-foreground`}
              >
                <HeartIcon className="size-4 fill-current" />
              </span>
              <span className="min-w-0">
                <span
                  className={'block text-xs font-medium text-muted-foreground'}
                >
                  {current.live ? 'Lời chúc mới' : 'Lời chúc'} từ{' '}
                  <span className="font-semibold text-rose-deep">
                    {current.authorName}
                  </span>
                </span>
                <span
                  className={`mt-1 line-clamp-3 block text-sm leading-relaxed
                  text-foreground/90`}
                >
                  {current.message}
                </span>
              </span>
            </a>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ẩn lời chúc"
              onClick={() => {
                setRotate(false);
                setPaused(false);
                setCurrent(null);
              }}
              className={`absolute top-1.5 right-1.5 size-9
              text-muted-foreground`}
            >
              <XIcon aria-hidden />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
