'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { motion, useReducedMotion } from 'motion/react';

import { EnvelopeIntro } from '@repo/ui/components/envelope-intro';
import BlurText from '@repo/ui/components/reactbits/blur-text';
import { requestSoundPlay } from '@repo/ui/components/sound-toggle';

import { dateParts } from '../_lib/format';
import { FlowerSprig, PatternBackdrop, SongHy } from './ornaments';

export function Hero({
  groomName,
  brideName,
  weddingDate,
  lunarDate,
  photo,
  recipient,
  children,
}: {
  groomName: string;
  brideName: string;
  /** ISO instant of the wedding day. */
  weddingDate: string;
  /** Lunar date as written on invitations, e.g. "ngày 15 tháng 8 năm Ất Tỵ". */
  lunarDate: string;
  /** Couple photo that slides out of the envelope (falls back to a 囍 card). */
  photo?: string;
  /** Guest name shown on the cover (personal invitation pages). */
  recipient?: string;
  children?: ReactNode;
}) {
  const reduce = !!useReducedMotion();
  // Load the photo in CORS mode: the WebGL album reuses this URL, and a cached
  // no-CORS copy would make its CORS check fail. Hosts without CORS headers
  // fail this load, so retry once as a plain image.
  const [corsPhoto, setCorsPhoto] = useState(true);
  const [opened, setOpened] = useState(false);
  const onOpened = useCallback(() => setOpened(true), []);

  // The cover opens by itself, so there is no tap to start the music.
  // Browsers only allow audio after a gesture: start it on the guest's first
  // tap, click or key press instead (SoundToggle respects a saved mute).
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    const start = (e: Event) => {
      // A tap on the music button is handled by the button itself; starting
      // here too would make its click pause the music right away.
      if ((e.target as Element | null)?.closest?.('[data-sound-toggle]')) {
        return;
      }
      requestSoundPlay();
      events.forEach((e) => window.removeEventListener(e, start));
    };
    events.forEach((e) => window.addEventListener(e, start));
    return () => events.forEach((e) => window.removeEventListener(e, start));
  }, []);

  const { weekday, day, month, year } = dateParts(weddingDate);

  // Names animate only once the cover is out of the way
  const name = (text: string) =>
    opened ? (
      <BlurText
        text={text}
        animateBy="words"
        delay={120}
        className="justify-center"
      />
    ) : (
      <p className="opacity-0">{text}</p>
    );

  return (
    <header
      className={`relative isolate overflow-hidden px-6 pt-16 pb-14 text-center
        sm:px-10 lg:flex lg:min-h-dvh lg:items-center lg:py-24`}
    >
      <PatternBackdrop className="opacity-[0.08]" />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(ellipse_at_50%_20%,color-mix(in_oklch,var(--gold)_16%,transparent),transparent_65%)]`}
      />

      {/* phones: stacked; large screens: envelope | names side by side */}
      <div
        className={`mx-auto grid w-full max-w-6xl items-center lg:grid-cols-2
          lg:gap-20`}
      >
        {/* Envelope with the letter (or photo) sliding out of it */}
        <div
          className={`relative mx-auto mt-10 aspect-[4/3] w-[82%] max-w-md
            sm:w-[70%] lg:mt-28 lg:w-full lg:max-w-lg`}
        >
          <FlowerSprig
            className={`absolute -top-16 -left-10 z-30 h-40 w-28 text-gold
              lg:-top-24 lg:-left-16 lg:h-56 lg:w-40`}
          />
          {/* back of the envelope */}
          <div
            className={`absolute inset-0 rounded-sm
              bg-[color-mix(in_oklch,var(--primary),black_18%)]
              shadow-[0_30px_50px_-24px_rgb(60_10_20/0.7)]`}
          />
          <motion.div
            className={`absolute inset-x-[9%] top-[6%] z-10 h-[86%]
              origin-bottom overflow-hidden rounded-[2px] bg-card p-2 shadow-lg`}
            initial={false}
            animate={opened ? { y: '-46%', rotate: 4 } : { y: '0%', rotate: 0 }}
            transition={{
              duration: reduce ? 0 : 1.1,
              delay: reduce ? 0 : 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote upload URL
              <img
                key={corsPhoto ? 'cors' : 'plain'}
                src={photo}
                crossOrigin={corsPhoto ? 'anonymous' : undefined}
                onError={() => setCorsPhoto(false)}
                alt={`Ảnh cưới của ${groomName} và ${brideName}`}
                className="size-full rounded-[1px] object-cover"
              />
            ) : (
              <div
                className={`flex size-full flex-col items-center justify-start
                  rounded-[1px] border border-gold/40 pt-[12%]`}
              >
                <SongHy className="text-5xl text-primary" />
                <p
                  className={`mt-2 font-serif text-xs tracking-[0.35em]
                    text-muted-foreground uppercase`}
                >
                  Save the date
                </p>
              </div>
            )}
          </motion.div>
          {/* front pocket */}
          <div
            className={`absolute inset-0 z-20 rounded-sm bg-primary
              [clip-path:polygon(0_0,50%_52%,100%_0,100%_100%,0_100%)]`}
          />
          <div
            className={`absolute inset-0 z-20 rounded-sm
              bg-[color-mix(in_oklch,var(--primary),black_10%)]
              [clip-path:polygon(0_100%,50%_46%,100%_100%)]`}
          />
          {/* gold wax seal */}
          <span
            aria-hidden
            className={`absolute top-[52%] left-1/2 z-30 flex size-14
              -translate-x-1/2 -translate-y-1/2 items-center justify-center
              rounded-full
              bg-[radial-gradient(circle_at_35%_30%,#f3d995,#c69540_55%,#8f6524)]
              text-xl text-[#6b4615]
              shadow-[inset_0_-3px_6px_rgb(0_0_0/0.25),0_6px_14px_rgb(60_10_20/0.45)]`}
          >
            <SongHy />
          </span>
        </div>

        <div>
          {/* Names, thin serif with a faint ampersand between them */}
          <div
            role="heading"
            aria-level={1}
            aria-label={`${groomName} và ${brideName}`}
            className={`relative mt-12 font-serif text-5xl leading-[1.15]
              font-light text-rose-deep sm:text-6xl lg:mt-0 lg:text-7xl`}
          >
            {name(groomName)}
            <span
              aria-hidden
              className={`pointer-events-none absolute top-1/2 left-1/2
                -translate-1/2 font-serif text-7xl text-gold/25 italic
                sm:text-8xl lg:text-9xl`}
            >
              &amp;
            </span>
            {name(brideName)}
          </div>

          {/* date line */}
          <div
            className={'mt-8 flex items-center justify-center gap-4 font-serif'}
          >
            <span
              className={
                'text-sm tracking-[0.25em] text-muted-foreground uppercase'
              }
            >
              {weekday}
            </span>
            <span aria-hidden className="h-8 w-px bg-gold/50" />
            <span
              className={`text-4xl leading-none text-primary tabular-nums
                sm:text-5xl`}
            >
              {day}.{month}
            </span>
            <span aria-hidden className="h-8 w-px bg-gold/50" />
            <span
              className={`text-sm tracking-[0.25em] text-muted-foreground
                tabular-nums`}
            >
              {year}
            </span>
          </div>
          <p
            className={`mt-3 font-serif text-base text-muted-foreground italic
              sm:text-lg`}
          >
            (Tức {lunarDate})
          </p>

          {children}
        </div>
      </div>

      <EnvelopeIntro
        onOpenStart={requestSoundPlay}
        onOpened={onOpened}
        autoOpenAfter={1200}
        seal={<SongHy />}
        greeting={recipient ? 'Thân mời' : undefined}
        recipient={recipient}
        card={
          <>
            <FlowerSprig
              className={`pointer-events-none absolute -top-24 -left-14 h-40
              w-28 text-gold/80`}
            />
            <FlowerSprig
              className={`pointer-events-none absolute -top-24 -right-14 h-40
              w-28 -scale-x-100 text-gold/80`}
            />
            <p
              className={`font-serif text-4xl leading-tight font-light
              text-rose-deep`}
            >
              {groomName}
              <span className="block text-2xl text-gold">&amp;</span>
              {brideName}
            </p>
            <span
              aria-hidden
              className={`mx-auto mt-4 flex items-center justify-center gap-2
              text-gold`}
            >
              <span className="h-px w-10 bg-gold/60" />
              <SongHy className="text-xs" />
              <span className="h-px w-10 bg-gold/60" />
            </span>
            <p
              className={`mt-3 font-serif text-lg text-muted-foreground
              tabular-nums`}
            >
              {Number(day)} tháng {Number(month)}, {year}
            </p>
          </>
        }
      />
    </header>
  );
}
