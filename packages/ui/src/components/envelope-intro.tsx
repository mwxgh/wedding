'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type Stage = 'closed' | 'opening' | 'done';

export interface EnvelopeIntroProps {
  /** Text on the wax seal, e.g. the couple's initials. */
  seal?: ReactNode;
  /** Line above the recipient, e.g. "Trân trọng kính mời". */
  greeting?: ReactNode;
  /** Who the invitation is for. */
  recipient?: ReactNode;
  /** Content of the card that slides out of the envelope. */
  card?: ReactNode;
  /** Label of the open button. */
  openLabel?: string;
  /** Called right when the guest taps to open (still a user gesture). */
  onOpenStart?: () => void;
  /** Called once the envelope has opened and the overlay is gone. */
  onOpened?: () => void;
}

// Timeline (seconds) of the opening sequence
const T = { seal: 0.35, flap: 0.7, card: 0.8, fade: 0.7 };

/**
 * Full-screen wedding envelope shown on every visit (and reload). Tapping it
 * breaks the wax seal, opens the flap, slides the card up, then fades out to
 * the page, which always starts from the top.
 */
export function EnvelopeIntro({
  seal = '♥',
  greeting,
  recipient,
  card,
  openLabel = 'Mở thiệp',
  onOpenStart,
  onOpened,
}: EnvelopeIntroProps) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>('closed');

  // Start from the top: browsers restore the old scroll position on reload,
  // which would land the guest mid-page once the envelope opens
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  // Lock page scroll while the envelope covers it (the root element is the
  // one that scrolls, so lock it as well as the body)
  useEffect(() => {
    if (stage === 'done') return;
    const targets = [document.documentElement, document.body];
    const previous = targets.map((el) => el.style.overflow);
    targets.forEach((el) => (el.style.overflow = 'hidden'));
    return () => {
      targets.forEach((el, i) => (el.style.overflow = previous[i] ?? ''));
    };
  }, [stage]);

  const open = () => {
    if (stage !== 'closed') return;
    onOpenStart?.();
    setStage('opening');
    const total = reduceMotion ? 0.3 : T.seal + T.flap + T.card + 0.4;
    window.setTimeout(() => setStage('done'), total * 1000);
  };

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
          className={`fixed inset-0 z-[60] flex flex-col items-center
          justify-center gap-8 overflow-hidden bg-background
          bg-[radial-gradient(circle_at_30%_20%,rgb(201_169_110/0.22),transparent_50%),radial-gradient(circle_at_70%_80%,rgb(181_131_141/0.25),transparent_55%)]
          px-4`}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: d(T.fade), ease: 'easeInOut' }}
        >
          <motion.button
            type="button"
            onClick={open}
            aria-label={openLabel}
            className={`relative aspect-[3/2] w-[min(88vw,440px)] cursor-pointer
            outline-none [perspective:1200px]`}
            initial={{ y: 30, opacity: 0 }}
            animate={
              opening ? { y: 80, opacity: 1 } : { y: [0, -6, 0], opacity: 1 }
            }
            transition={
              opening
                ? { delay: d(T.seal + T.flap), duration: d(T.card) }
                : {
                    y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 0.6 },
                  }
            }
          >
            {/* Back of the envelope */}
            <div
              className={`absolute inset-0 rounded-md bg-[#e9d3c7]
              shadow-[0_30px_60px_-20px_rgb(142_91_102/0.45)]`}
            />

            {/* The card inside */}
            <motion.div
              className={`absolute inset-x-[6%] top-[6%] bottom-[6%] z-10 flex
              flex-col items-center justify-center rounded-sm bg-card px-4
              text-center shadow-md`}
              animate={opening ? { y: '-68%' } : { y: 0 }}
              transition={{
                delay: d(T.seal + T.flap),
                duration: d(T.card),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {card}
            </motion.div>

            {/* Front pocket: left, right and bottom folds */}
            <div
              className={`absolute inset-0 z-20 rounded-md bg-[#f1e0d6]
              [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)]`}
            />
            <div
              className={`absolute inset-0 z-20 rounded-md bg-[#ead5ca]
              [clip-path:polygon(0_100%,50%_48%,100%_100%)]`}
            />

            {/* Top flap, hinged on the top edge */}
            <motion.div
              className="absolute inset-x-0 top-0 h-[58%] origin-top"
              style={{ zIndex: opening ? 5 : 30 }}
              animate={{ rotateX: opening ? 180 : 0 }}
              transition={{
                delay: d(T.seal),
                duration: d(T.flap),
                ease: 'easeInOut',
              }}
            >
              {/* One face: rotating 180° about the top edge flips it upward */}
              <div
                className={`absolute inset-0 bg-[#e4c9bc]
                drop-shadow-[0_4px_6px_rgb(142_91_102/0.25)]
                [clip-path:polygon(0_0,100%_0,50%_100%)]`}
              />
            </motion.div>

            {/* Wax seal */}
            <motion.span
              className={`absolute top-[58%] left-1/2 z-40 flex size-16
              -translate-x-1/2 -translate-y-1/2 items-center justify-center
              rounded-full bg-rose-deep font-script text-2xl text-white
              shadow-[inset_0_-4px_8px_rgb(0_0_0/0.25),0_6px_14px_rgb(142_91_102/0.45)]
              ring-4 ring-rose-deep/30`}
              animate={
                opening
                  ? { scale: 1.6, opacity: 0, rotate: 25 }
                  : { scale: [1, 1.06, 1] }
              }
              transition={
                opening
                  ? { duration: d(T.seal) }
                  : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              {seal}
            </motion.span>
          </motion.button>

          <motion.div
            className="text-center"
            animate={{ opacity: opening ? 0 : 1, y: opening ? 10 : 0 }}
            transition={{ duration: d(0.4) }}
          >
            {greeting && <p className="text-muted-foreground">{greeting}</p>}
            {recipient && (
              <p className="mt-1 font-serif text-2xl text-rose-deep">
                {recipient}
              </p>
            )}
            <button
              type="button"
              onClick={open}
              className={`mt-5 inline-flex cursor-pointer items-center gap-2
              rounded-full bg-primary px-6 py-2.5 text-sm font-medium
              text-primary-foreground shadow-soft transition-colors
              hover:bg-rose-deep`}
            >
              {openLabel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
