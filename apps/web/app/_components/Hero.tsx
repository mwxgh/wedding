'use client';

import { type ReactNode, useCallback, useState } from 'react';

import { EnvelopeIntro } from '@repo/ui/components/envelope-intro';
import BlurText from '@repo/ui/components/reactbits/blur-text';
import Particles from '@repo/ui/components/reactbits/particles';
import ShinyText from '@repo/ui/components/reactbits/shiny-text';
import { requestSoundPlay } from '@repo/ui/components/sound-toggle';

export function Hero({
  groomName,
  brideName,
  date,
  recipient,
  children,
}: {
  groomName: string;
  brideName: string;
  date: string;
  /** Guest name shown on the envelope (personal invitation pages). */
  recipient?: string;
  children?: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const onOpened = useCallback(() => setOpened(true), []);
  const initial = (name: string) => name.trim().split(/\s+/).pop()?.[0] ?? '';

  // Names animate only once the envelope is out of the way
  const name = (text: string) =>
    opened ? (
      <BlurText
        text={text}
        animateBy="letters"
        delay={60}
        className="justify-center"
      />
    ) : (
      <p className="opacity-0">{text}</p>
    );

  return (
    <header
      className={`relative flex min-h-[92vh] items-center justify-center
        overflow-hidden
        bg-[radial-gradient(circle_at_20%_20%,rgb(201_169_110/0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgb(181_131_141/0.22),transparent_50%)]
        px-4 py-20 text-center`}
    >
      <div className="pointer-events-auto absolute inset-0" aria-hidden>
        <Particles
          particleColors={['#b5838d', '#c9a96e', '#e8c4c4']}
          particleCount={160}
          particleSpread={10}
          speed={0.06}
          particleBaseSize={90}
          moveParticlesOnHover
          alphaParticles
        />
      </div>
      <div className="relative z-10 max-w-2xl">
        <ShinyText
          text="Save the date"
          className="text-sm tracking-[0.3em] uppercase"
          color="#7d6b62"
          shineColor="#c9a96e"
          speed={3}
        />
        <div
          role="heading"
          aria-level={1}
          aria-label={`${groomName} và ${brideName}`}
          className={`my-5 font-script text-6xl leading-tight text-rose-deep
            sm:text-8xl`}
        >
          {name(groomName)}
          <span className="block text-[0.5em] text-gold">&amp;</span>
          {name(brideName)}
        </div>
        <p className="font-serif text-xl capitalize">{date}</p>
        {children}
      </div>
      <EnvelopeIntro
        onOpenStart={requestSoundPlay}
        onOpened={onOpened}
        seal={`${initial(groomName)}&${initial(brideName)}`}
        greeting={recipient ? 'Trân trọng kính mời' : 'Thiệp mời cưới'}
        recipient={recipient ?? `${groomName} & ${brideName}`}
        card={
          <>
            <p
              className={`text-[10px] tracking-[0.3em] text-muted-foreground
              uppercase`}
            >
              Save the date
            </p>
            <p
              className={`my-1 font-script text-3xl leading-tight text-rose-deep
              sm:text-4xl`}
            >
              {groomName} &amp; {brideName}
            </p>
            <p className="font-serif text-sm capitalize">{date}</p>
          </>
        }
      />
    </header>
  );
}
