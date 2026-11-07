'use client';

import { useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';

import { PauseIcon, PlayIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

import type { PublicPhoto } from '@repo/types';
import { cn } from '@repo/ui/lib/utils';

/**
 * Swipeable photo carousel: the centred photo is full size, its neighbours
 * shrink and fade. Scroll-snap does the swiping; dots jump to a photo.
 * Fallback for the WebGL album.
 */
function SnapCarousel({ photos }: { photos: PublicPhoto[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // the photo whose centre is nearest the scroller's centre is the active one
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = root.getBoundingClientRect().left + root.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      root.querySelectorAll('figure').forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [photos.length]);

  const go = (i: number) =>
    scroller.current?.querySelectorAll('figure')[i]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });

  return (
    // same height as the WebGL album box, so switching modes does not jump
    <div
      className={`flex min-h-[max(24rem,62svh)] flex-col justify-center
        lg:min-h-[78vh]`}
    >
      <div
        ref={scroller}
        role="region"
        aria-label="Album ảnh cưới"
        tabIndex={0}
        // side padding lets the first and last photo sit in the centre
        className={`-mx-5 flex snap-x snap-mandatory [scrollbar-width:none]
          gap-3 overflow-x-auto scroll-smooth px-[calc(50%-35vw)] pt-2 pb-6
          outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:-mx-8
          sm:gap-5 sm:px-[calc(50%-21vw)] lg:px-[calc(50%-12rem)]
          [&::-webkit-scrollbar]:hidden`}
      >
        {photos.map((p, i) => (
          <figure
            key={p.id}
            data-index={i}
            className={cn(
              `w-[70vw] shrink-0 snap-center overflow-hidden rounded-xl bg-muted
              shadow-lift transition-[scale,opacity] duration-500 ease-out
              sm:w-[42vw] lg:w-[24rem]`,
              i === active ? 'scale-100' : 'scale-[0.88] opacity-55',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote upload URL */}
            <img
              src={p.url}
              alt={p.caption ?? `Ảnh cưới ${i + 1}`}
              loading={i < 2 ? 'eager' : 'lazy'}
              decoding="async"
              width={600}
              height={800}
              className="aspect-[3/4] w-full object-cover"
            />
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === active}
              className={`flex size-8 items-center justify-center rounded-full
              outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === active ? 'w-5 bg-primary' : 'w-1.5 bg-primary/25',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// WebGL album, loaded only when it will actually be used
const FlexCarousel = dynamic(
  () => import('@repo/ui/components/reactbits/flex-carousel'),
  { ssr: false },
);

/**
 * Photos probed before trusting the WebGL album (they share one host, so one
 * tells whether it sends CORS headers), and how long to wait for it before
 * showing the plain carousel instead of an empty box.
 */
const PROBE = 1;
const PROBE_TIMEOUT_MS = 4_000;

/**
 * True when this browser can run the WebGL album: WebGL2 is available and the
 * photos load with CORS (textures need it — a bucket without CORS headers
 * would leave the cards blank).
 */
async function canUseWebGl(photos: PublicPhoto[]): Promise<boolean> {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return false;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const probes = photos.slice(0, PROBE).map(
    (p) =>
      new Promise<boolean>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = p.url;
      }),
  );
  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), PROBE_TIMEOUT_MS),
  );
  return Promise.race([
    Promise.all(probes).then((ok) => ok.every(Boolean)),
    timeout,
  ]);
}

/**
 * Wedding album: the React Bits Flex Carousel (photos flowing through liquid
 * glass at the edges) when the browser and photo host allow it, otherwise a
 * scroll-snap carousel.
 */
export function Gallery({ photos }: { photos: PublicPhoto[] }) {
  const [mode, setMode] = useState<'checking' | 'webgl' | 'basic'>('checking');
  // autoplay needs a visible pause control (WCAG 2.2.2); reduced motion
  // already stops it inside the carousel
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    void canUseWebGl(photos).then((ok) => {
      if (alive) setMode(ok ? 'webgl' : 'basic');
    });
    return () => {
      alive = false;
    };
  }, [photos]);

  if (mode === 'basic') return <SnapCarousel photos={photos} />;

  return (
    // full-bleed; same box while checking, so the page does not jump
    <div
      className={
        'relative mx-[calc(50%-50vw)] h-[max(24rem,62svh)] lg:h-[78vh]'
      }
    >
      {mode === 'webgl' && !reduce && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={
            paused ? 'Tiếp tục tự chuyển ảnh' : 'Tạm dừng tự chuyển ảnh'
          }
          className={`absolute right-4 bottom-4 z-10 grid size-11
          place-items-center rounded-full border border-border/70 bg-card/80
          text-rose-deep shadow-soft backdrop-blur-md outline-none
          focus-visible:ring-3 focus-visible:ring-ring/50`}
        >
          {paused ? (
            <PlayIcon aria-hidden className="size-4" />
          ) : (
            <PauseIcon aria-hidden className="size-4" />
          )}
        </button>
      )}
      {mode === 'webgl' && (
        <FlexCarousel
          items={photos.map((p, i) => ({
            src: p.url,
            alt: p.caption ?? `Ảnh cưới ${i + 1}`,
            title: p.caption ?? undefined,
          }))}
          ariaLabel="Album ảnh cưới"
          preset="liquid"
          dispersion={0.25}
          autoplay={!paused}
          interval={4.5}
          captureWheel={false}
          className="text-rose-deep"
        />
      )}
    </div>
  );
}
