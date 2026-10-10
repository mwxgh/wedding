'use client';

import type { ReactNode } from 'react';

import BlurText from '@repo/ui/components/reactbits/blur-text';
import Particles from '@repo/ui/components/reactbits/particles';
import ShinyText from '@repo/ui/components/reactbits/shiny-text';

export function Hero({
  groomName,
  brideName,
  date,
  children,
}: {
  groomName: string;
  brideName: string;
  date: string;
  children?: ReactNode;
}) {
  return (
    <header
      className="relative flex min-h-[92vh] items-center justify-center
        overflow-hidden
        bg-[radial-gradient(circle_at_20%_20%,rgb(201_169_110/0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgb(181_131_141/0.22),transparent_50%)]
        px-4 py-20 text-center"
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
          className="my-5 font-script text-6xl leading-tight text-rose-deep
            sm:text-8xl"
        >
          <BlurText
            text={groomName}
            animateBy="letters"
            delay={60}
            className="justify-center"
          />
          <span className="block text-[0.5em] text-gold">&amp;</span>
          <BlurText
            text={brideName}
            animateBy="letters"
            delay={60}
            className="justify-center"
          />
        </div>
        <p className="font-serif text-xl capitalize">{date}</p>
        {children}
      </div>
    </header>
  );
}
