'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { FloatingHearts } from '#components/floating-hearts';

type Stage = 'closed' | 'opening' | 'done';

export interface EnvelopeIntroProps {
  /** Mark in the round seal at the top of the card (heart, 囍, initials). */
  seal?: ReactNode;
  /** Line above the recipient, e.g. "Trân trọng kính mời". */
  greeting?: ReactNode;
  /** Who the invitation is for. */
  recipient?: ReactNode;
  /** Main content of the cover card (names, date, ornaments). */
  card?: ReactNode;
  /** Label of the open button. */
  openLabel?: string;
  /** Called right when the guest taps to open (still a user gesture). */
  onOpenStart?: () => void;
  /** Called once the envelope has opened and the overlay is gone. */
  onOpened?: () => void;
  /**
   * Open by itself after this many ms (the guest can still tap sooner).
   * `onOpenStart` then runs without a user gesture.
   */
  autoOpenAfter?: number;
}

// Timeline (seconds) of the opening sequence
const T = { press: 0.25, lift: 0.7, fade: 0.6 };

/**
 * Full-screen cover shown on every visit (and reload): an ivory invitation
 * card on a deep burgundy backdrop with drifting hearts. Opening it (tap, or
 * `autoOpenAfter`) presses the seal, lifts the card away and fades to the
 * page, which always starts from the top.
 */
export function EnvelopeIntro({
  seal = '♥',
  greeting,
  recipient,
  card,
  openLabel = 'Mở thiệp',
  onOpenStart,
  onOpened,
  autoOpenAfter,
}: EnvelopeIntroProps) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>('closed');

  // Start from the top: browsers restore the old scroll position on reload,
  // which would land the guest mid-page once the cover opens
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  // Lock page scroll while the cover is up (the root element is the one that
  // scrolls, so lock it as well as the body)
  useEffect(() => {
    if (stage === 'done') return;
    const targets = [document.documentElement, document.body];
    const previous = targets.map((el) => el.style.overflow);
    targets.forEach((el) => (el.style.overflow = 'hidden'));
    return () => {
      targets.forEach((el, i) => (el.style.overflow = previous[i] ?? ''));
    };
  }, [stage]);

  // guards against opening twice (tap racing the auto-open timer)
  const started = useRef(false);
  const open = () => {
    if (started.current) return;
    started.current = true;
    onOpenStart?.();
    setStage('opening');
    const total = reduceMotion ? 0.2 : T.press + T.lift;
    window.setTimeout(() => setStage('done'), total * 1000);
  };

  // latest open() for the timer, without restarting it on every render
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (autoOpenAfter == null) return;
    const id = window.setTimeout(() => openRef.current(), autoOpenAfter);
    return () => window.clearTimeout(id);
  }, [autoOpenAfter]);

  const opening = stage === 'opening';
  const d = (s: number) => (reduceMotion ? 0 : s);

  return (
    <AnimatePresence onExitComplete={onOpened}>
      {stage !== 'done' && (
        <motion.div
          key="envelope-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Thiệp mời"
          className={`fixed inset-0 z-[60] flex items-center justify-center
          overflow-hidden
          bg-[linear-gradient(160deg,color-mix(in_oklch,var(--primary),white_6%),color-mix(in_oklch,var(--primary),black_45%))]
          px-5`}
          exit={{ opacity: 0 }}
          transition={{ duration: d(T.fade), ease: 'easeInOut' }}
        >
          <FloatingHearts />
          <motion.div
            className={`relative w-full max-w-md overflow-hidden rounded-md
            bg-card px-8 pt-8 pb-9 text-center
            shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={
              opening
                ? { opacity: 0, y: -40, scale: 1.03 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={
              opening
                ? {
                    delay: d(T.press),
                    duration: d(T.lift),
                    ease: [0.4, 0, 0.2, 1],
                  }
                : { duration: d(0.8), ease: [0.22, 1, 0.36, 1] }
            }
          >
            <motion.span
              aria-hidden
              className={`mx-auto flex size-14 items-center justify-center
              rounded-full
              bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--primary),white_18%),var(--rose-deep))]
              text-2xl text-primary-foreground
              shadow-[0_8px_20px_-6px_rgb(0_0_0/0.5)]`}
              animate={opening ? { scale: 0.85 } : { scale: [1, 1.05, 1] }}
              transition={
                opening
                  ? { duration: d(T.press) }
                  : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              {seal}
            </motion.span>

            <div className="relative mt-4">{card}</div>

            {(greeting || recipient) && (
              <div className="relative mt-5">
                {greeting && (
                  <p className="font-serif text-lg text-muted-foreground">
                    {greeting}
                  </p>
                )}
                {recipient && (
                  <p className="mt-0.5 font-serif text-2xl text-rose-deep">
                    {recipient}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={open}
              className={`relative mt-7 inline-flex h-12 cursor-pointer
              items-center rounded-full bg-rose-deep px-8 font-serif text-lg
              text-primary-foreground shadow-[0_10px_24px_-10px_rgb(0_0_0/0.6)]
              transition-[background-color,transform] outline-none
              hover:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50
              active:scale-[0.98]`}
            >
              {openLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
