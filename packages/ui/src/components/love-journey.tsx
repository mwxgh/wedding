'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AnimatePresence,
  type MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

export interface LoveJourneyProps {
  /**
   * One caption per chapter, shown as the page is scrolled. The last one is
   * the thank-you shown at the very end of the page.
   */
  milestones?: string[];
  /** Small name tags under the figures. */
  groomName?: string;
  brideName?: string;
}

const DEFAULT_MILESTONES = [
  'Ngày ấy, hai đứa trẻ lớn lên ở hai nơi…',
  'Rồi một ngày, chúng mình gặp nhau',
  'Cùng nhau đi qua bao năm tháng',
  'Và về chung một nhà ♥',
  'Cảm ơn bạn đã đến chung vui ♥',
];

/*
 * Everything inside the figures is driven by one "story" value t in [0, 1]:
 *   0    → 0.9   walking along the page while growing up
 *   0.9  → 1     the finale (scrolling through the space after the page):
 *                hold hands, zoom to the centre of the screen, say thanks
 */
const HOLD = [0.9, 0.94] as const;
const ZOOM = [0.92, 0.985] as const;
const THANKS_AT = 0.985;
/** Extra scroll space after the page in which the finale plays. */
const FINALE_SPACE = 'h-[130vh]';

const SKIN = '#f3d4bf';

/** Fades a layer in (or out when `reverse`) over a slice of the scroll. */
function useFade(
  p: MotionValue<number>,
  from: number,
  to: number,
  reverse?: boolean,
) {
  return useTransform(p, [from, to], reverse ? [1, 0] : [0, 1]);
}

function Groom({ p }: { p: MotionValue<number> }) {
  const kid = useFade(p, 0.22, 0.34, true);
  const adult = useFade(p, 0.22, 0.34);
  const arm = useTransform(p, [...HOLD], [0, -40]);
  return (
    <svg viewBox="0 0 48 96" className="h-full w-auto overflow-visible">
      {/* kid: t-shirt and shorts */}
      <motion.g style={{ opacity: kid }}>
        <rect x="17" y="66" width="6" height="24" rx="2" fill={SKIN} />
        <rect x="25" y="66" width="6" height="24" rx="2" fill={SKIN} />
        <path d="M14 58h20l1 12H13z" fill="#5a6b84" />
        <path d="M13 40q11-6 22 0l1 20H12z" fill="#8fb3d9" />
        <rect x="8" y="42" width="5" height="16" rx="2.5" fill={SKIN} />
        <rect x="35" y="42" width="5" height="16" rx="2.5" fill={SKIN} />
      </motion.g>
      {/* adult: suit with bow tie */}
      <motion.g style={{ opacity: adult }}>
        <rect x="17" y="64" width="6.5" height="28" rx="2" fill="#2b221f" />
        <rect x="24.5" y="64" width="6.5" height="28" rx="2" fill="#2b221f" />
        <path d="M12 40q12-7 24 0l2 28H10z" fill="#3b2f2a" />
        <path d="M20 38l4 12 4-12z" fill="#fff" />
        <path d="M20 40l4 2-4 2zM28 40l-4 2 4 2z" fill="#b5838d" />
        <rect x="7" y="41" width="5.5" height="22" rx="2.5" fill="#3b2f2a" />
      </motion.g>
      {/* right arm swings out to hold the bride's hand */}
      <motion.g
        style={{ opacity: adult, rotate: arm, originX: 0.5, originY: 0 }}
      >
        <rect x="35.5" y="41" width="5.5" height="22" rx="2.5" fill="#3b2f2a" />
        <circle cx="38.25" cy="64" r="2.6" fill={SKIN} />
      </motion.g>
      <ellipse cx="20" cy="92.5" rx="4.5" ry="2" fill="#1f1816" />
      <ellipse cx="28" cy="92.5" rx="4.5" ry="2" fill="#1f1816" />
      {/* head */}
      <rect x="21" y="31" width="6" height="7" rx="2" fill={SKIN} />
      <circle cx="24" cy="22" r="11" fill={SKIN} />
      <path
        d="M13 21q1-12 12-12 10 0 11 11-4-5-11-5-7 0-12 6z"
        fill="#2b221f"
      />
      <circle cx="21" cy="23" r="1.2" fill="#3b2f2a" />
      <circle cx="28" cy="23" r="1.2" fill="#3b2f2a" />
      <path
        d="M21.5 27.5q3 2.2 6 0"
        stroke="#8e5b66"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Bride({ p }: { p: MotionValue<number> }) {
  const kid = useFade(p, 0.22, 0.34, true);
  const adult = useFade(p, 0.22, 0.34);
  const wedding = useFade(p, 0.86, 0.95);
  const arm = useTransform(p, [...HOLD], [0, 46]);
  return (
    <svg viewBox="0 0 48 96" className="h-full w-auto overflow-visible">
      {/* veil, behind everything */}
      <motion.path
        style={{ opacity: wedding }}
        d="M14 14q10-10 20 0l9 70q-19 6-38 0z"
        fill="#ffffff"
        fillOpacity="0.7"
        stroke="#f1e0d6"
      />
      {/* long hair */}
      <path d="M12 22q0-14 12-14t12 14v20q-12 5-24 0z" fill="#5b3a2e" />
      {/* kid: short pink dress */}
      <motion.g style={{ opacity: kid }}>
        <rect x="18" y="68" width="5" height="22" rx="2" fill={SKIN} />
        <rect x="25" y="68" width="5" height="22" rx="2" fill={SKIN} />
        <path d="M16 40q8-5 16 0l6 30H10z" fill="#f4a7b9" />
        <rect x="8" y="42" width="5" height="16" rx="2.5" fill={SKIN} />
        <rect x="35" y="42" width="5" height="16" rx="2.5" fill={SKIN} />
      </motion.g>
      {/* adult: white gown */}
      <motion.g style={{ opacity: adult }}>
        <path d="M16 40q8-6 16 0l9 52H7z" fill="#fff" stroke="#e8c4c4" />
        <path d="M17 52q7 3 14 0" stroke="#e8c4c4" fill="none" />
        <rect x="35" y="41" width="5" height="20" rx="2.5" fill={SKIN} />
      </motion.g>
      {/* left arm swings out to hold the groom's hand */}
      <motion.g
        style={{ opacity: adult, rotate: arm, originX: 0.5, originY: 0 }}
      >
        <rect x="8" y="41" width="5" height="20" rx="2.5" fill={SKIN} />
        <circle cx="10.5" cy="61.5" r="2.5" fill={SKIN} />
      </motion.g>
      <ellipse cx="20" cy="92.5" rx="4" ry="1.8" fill="#b5838d" />
      <ellipse cx="28" cy="92.5" rx="4" ry="1.8" fill="#b5838d" />
      {/* bouquet in the outer hand */}
      <motion.g style={{ opacity: wedding }}>
        <circle cx="38" cy="62" r="3.2" fill="#b5838d" />
        <circle cx="34.5" cy="60" r="3" fill="#f4c2c2" />
        <circle cx="36" cy="64.5" r="2.8" fill="#c9a96e" />
      </motion.g>
      {/* head */}
      <rect x="21" y="31" width="6" height="7" rx="2" fill={SKIN} />
      <circle cx="24" cy="22" r="11" fill={SKIN} />
      <path d="M13 21q0-12 11-12t11 12q-3-6-11-6t-11 6z" fill="#5b3a2e" />
      <circle cx="20.5" cy="23" r="1.2" fill="#3b2f2a" />
      <circle cx="27.5" cy="23" r="1.2" fill="#3b2f2a" />
      <circle cx="18.5" cy="26.5" r="1.6" fill="#f4a7b9" opacity="0.6" />
      <circle cx="29.5" cy="26.5" r="1.6" fill="#f4a7b9" opacity="0.6" />
      <path
        d="M21 27.5q3 2.2 6 0"
        stroke="#8e5b66"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* flower crown on the wedding day */}
      <motion.g style={{ opacity: wedding }}>
        <circle cx="16" cy="13" r="2" fill="#f4c2c2" />
        <circle cx="20" cy="10.5" r="2" fill="#c9a96e" />
        <circle cx="24" cy="9.5" r="2" fill="#b5838d" />
        <circle cx="28" cy="10.5" r="2" fill="#c9a96e" />
        <circle cx="32" cy="13" r="2" fill="#f4c2c2" />
      </motion.g>
    </svg>
  );
}

/**
 * Scroll-driven story: the groom and bride start as kids in the bottom
 * corners, grow up while walking toward each other as the page scrolls, then
 * in a finale after the page content they hold hands, grow to fill the
 * screen and thank the guests.
 *
 * Renders a fixed overlay plus an in-flow spacer, so place it last on the page.
 */
export function LoveJourney({
  milestones = DEFAULT_MILESTONES,
  groomName,
  brideName,
}: LoveJourneyProps) {
  const finaleRef = useRef<HTMLDivElement>(null);
  const groomRef = useRef<HTMLDivElement>(null);
  const brideRef = useRef<HTMLDivElement>(null);
  const spring = { stiffness: 120, damping: 24, mass: 0.4 };

  // Walking: page scroll until the finale space starts.
  // Finale: from there to the very end of the page.
  const { scrollY } = useScroll();

  // Layout numbers, measured from untransformed boxes so they fit any screen
  const layout = useRef({
    walkEnd: 1,
    end: 2,
    groom: 0,
    bride: 0,
    zoom: 3,
    lift: 0,
  });
  useEffect(() => {
    const measure = () => {
      const g = groomRef.current;
      const b = brideRef.current;
      const finale = finaleRef.current;
      if (!g || !b || !finale) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mid = vw / 2;
      layout.current = {
        // scrollY at which the finale space touches the bottom of the screen
        walkEnd: Math.max(1, finale.offsetTop - vh),
        end: document.documentElement.scrollHeight - vh,
        groom: mid - g.offsetLeft - g.offsetWidth - 4,
        bride: b.offsetLeft - mid - 4,
        // the couple grows to ~55% of the screen height
        zoom: Math.min(4.5, (vh * 0.55) / g.offsetHeight),
        // and stands on a line 14% above the bottom edge
        lift: vh * 0.14 - 40,
      };
    };
    measure();
    window.addEventListener('resize', measure);
    // page height changes as images and fonts load
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const walkRaw = useTransform(scrollY, (y) =>
    clamp01(y / layout.current.walkEnd),
  );
  const finaleRaw = useTransform(scrollY, (y) => {
    const { walkEnd, end } = layout.current;
    return clamp01((y - walkEnd) / Math.max(1, end - walkEnd));
  });
  const walk = useSpring(walkRaw, spring);
  const finale = useSpring(finaleRaw, spring);
  const t = useTransform([walk, finale], ([w, f]) =>
    (f as number) > 0 ? 0.9 + (f as number) * 0.1 : (w as number) * 0.9,
  );

  const step = (v: number) => clamp01((v - 0.04) / 0.86);
  const groomX = useTransform(t, (v) => step(v) * layout.current.groom);
  const brideX = useTransform(t, (v) => -step(v) * layout.current.bride);
  const grow = useTransform(t, [0, 0.4], [0.62, 1]);
  const hop = useTransform(t, (v) =>
    v > 0.04 && v < 0.9 ? -Math.abs(Math.sin(v * Math.PI * 36)) * 4 : 0,
  );

  // Finale: the stage (both figures + heart) zooms up from the bottom centre
  const zoomIn = useTransform(t, [...ZOOM], [0, 1]);
  const stageScale = useTransform(
    zoomIn,
    (z) => 1 + z * (layout.current.zoom - 1),
  );
  const stageY = useTransform(zoomIn, (z) => -z * layout.current.lift);
  const backdrop = useTransform(t, [0.9, 0.95], [0, 0.97]);
  const stripFade = useTransform(t, [0.89, 0.92], [1, 0]);
  const heartScale = useTransform(t, [0.9, 0.95], [0, 1]);
  const nameOpacity = useTransform(t, [0, 0.15], [1, 0]);

  const [chapter, setChapter] = useState(0);
  const [thanking, setThanking] = useState(false);
  useMotionValueEvent(t, 'change', (v) => {
    const story = milestones.length - 1; // the last one is the thank-you
    const next = Math.min(story - 1, Math.floor((v / 0.9) * story));
    setChapter((c) => (c === next ? c : next));
    setThanking(v >= THANKS_AT);
  });

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      >
        {/* finale backdrop */}
        <motion.div
          className={`absolute inset-0 bg-background
            bg-[radial-gradient(circle_at_50%_60%,rgb(244_194_194/0.35),transparent_60%)]`}
          style={{ opacity: backdrop }}
        />

        {/* bottom strip: fade behind the walkers, the path and the captions */}
        <motion.div
          className={`absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t
            from-background via-background/80 to-transparent sm:h-44`}
          style={{ opacity: stripFade }}
        >
          <div
            className={`absolute inset-x-6 bottom-10 border-t border-dashed
              border-primary/30`}
          />
          <AnimatePresence mode="wait">
            <motion.p
              key={chapter}
              className={`absolute bottom-1.5 left-1/2 max-w-[calc(100%-2rem)]
                -translate-x-1/2 rounded-full bg-background/85 px-4 py-0.5
                text-center font-script text-lg whitespace-nowrap text-rose-deep
                shadow-soft backdrop-blur sm:text-2xl`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              {milestones[chapter]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* finale title */}
        <AnimatePresence>
          {thanking && (
            <motion.div
              className="absolute inset-x-0 top-[5%] px-4 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <p className="font-script text-4xl text-rose-deep sm:text-6xl">
                {milestones[milestones.length - 1]}
              </p>
              {groomName && brideName && (
                <p className="mt-2 font-serif text-lg text-muted-foreground">
                  {groomName} &amp; {brideName}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* the stage: both figures and the heart, zoomed as one */}
        <motion.div
          className="absolute inset-x-0 bottom-10 h-20 sm:h-24"
          style={{
            scale: stageScale,
            y: stageY,
            originX: 0.5,
            originY: 1,
          }}
        >
          <motion.div
            ref={groomRef}
            className="absolute bottom-0 left-3 h-full origin-bottom sm:left-6"
            style={{ x: groomX, y: hop, scale: grow }}
          >
            <Groom p={t} />
            {groomName && (
              <motion.span
                style={{ opacity: nameOpacity }}
                className={`absolute top-full left-1/2 -translate-x-1/2
                text-[10px] whitespace-nowrap text-muted-foreground`}
              >
                {groomName}
              </motion.span>
            )}
          </motion.div>

          <motion.div
            ref={brideRef}
            className={`absolute right-3 bottom-0 h-full origin-bottom
              sm:right-6`}
            style={{ x: brideX, y: hop, scale: grow }}
          >
            <Bride p={t} />
            {brideName && (
              <motion.span
                style={{ opacity: nameOpacity }}
                className={`absolute top-full left-1/2 -translate-x-1/2
                text-[10px] whitespace-nowrap text-muted-foreground`}
              >
                {brideName}
              </motion.span>
            )}
          </motion.div>

          {/* they meet: a heart pops above them */}
          <motion.span
            className={`absolute bottom-[92%] left-1/2 -translate-x-1/2 text-sm
              text-primary`}
            style={{ scale: heartScale }}
          >
            ♥
          </motion.span>
        </motion.div>
      </div>

      {/* scroll space for the finale, after the page content */}
      <div ref={finaleRef} aria-hidden className={FINALE_SPACE} />
    </>
  );
}
