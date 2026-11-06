'use client';

import { useEffect, useRef, useState } from 'react';

import { Music2Icon, VolumeXIcon } from 'lucide-react';

import { cn } from '../lib/utils';

const PREF_KEY = 'sound-muted';

/** Window event that asks the toggle to start playing (e.g. after a tap). */
export const SOUND_PLAY_EVENT = 'sound-toggle:play';

/** Ask any SoundToggle on the page to start playing (needs a user gesture). */
export function requestSoundPlay() {
  window.dispatchEvent(new Event(SOUND_PLAY_EVENT));
}

const readMuted = () => {
  try {
    return localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
};

const writeMuted = (muted: boolean) => {
  try {
    localStorage.setItem(PREF_KEY, muted ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
};

/**
 * Looping background music with an on/off button. Browsers only allow audio
 * after a user gesture, so playback starts on click or via requestSoundPlay()
 * from a gesture handler (unless the visitor muted it before).
 */
export function SoundToggle({
  src,
  volume = 0.5,
  className,
}: {
  src: string;
  volume?: number;
  className?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const play = async () => {
    const el = audio.current;
    if (!el) return;
    el.volume = volume;
    try {
      await el.play();
      setPlaying(true);
      writeMuted(false);
    } catch {
      setPlaying(false);
    }
  };

  useEffect(() => {
    const onRequest = () => {
      if (!readMuted()) void play();
    };
    // Music is on by default: try right away. Browsers that block autoplay
    // reject this, and playback then starts on the first gesture instead.
    onRequest();
    window.addEventListener(SOUND_PLAY_EVENT, onRequest);
    return () => window.removeEventListener(SOUND_PLAY_EVENT, onRequest);
    // play only depends on refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      writeMuted(true);
    } else {
      void play();
    }
  };

  if (unavailable) return null;

  return (
    <>
      <audio
        ref={audio}
        src={src}
        loop
        preload="none"
        onError={() => setUnavailable(true)}
      />
      <button
        type="button"
        onClick={toggle}
        data-sound-toggle
        aria-pressed={playing}
        aria-label="Nhạc nền"
        title={playing ? 'Tắt nhạc' : 'Bật nhạc'}
        className={cn(
          `group fixed top-4 right-4 z-55 grid size-11 cursor-pointer
          touch-manipulation place-items-center rounded-full border
          border-border/70 bg-card/75 shadow-soft backdrop-blur-md
          transition-[background-color,transform] duration-200 outline-none
          hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50
          active:scale-95 motion-reduce:transition-none
          motion-reduce:active:scale-100`,
          playing && 'border-primary/40',
          className,
        )}
      >
        {/* Soft ripple while music plays */}
        {playing && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 animate-ping
            rounded-full border border-primary/40 [animation-duration:2.4s]
            motion-reduce:hidden`}
          />
        )}
        <Music2Icon
          aria-hidden
          className={cn(
            `col-start-1 row-start-1 size-[18px] text-primary transition-all
            duration-200`,
            playing ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
          )}
        />
        <VolumeXIcon
          aria-hidden
          className={cn(
            `col-start-1 row-start-1 size-[18px] text-muted-foreground
            transition-all duration-200`,
            playing ? 'scale-75 opacity-0' : 'scale-100 opacity-100',
          )}
        />
      </button>
    </>
  );
}
