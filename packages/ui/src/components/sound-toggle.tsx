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
        aria-pressed={playing}
        aria-label={playing ? 'Tắt nhạc' : 'Bật nhạc'}
        className={cn(
          `fixed top-4 right-4 z-[55] inline-flex items-center gap-2
          rounded-full border bg-card/80 px-3 py-1.5 text-xs tracking-[0.2em]
          text-foreground uppercase shadow-soft backdrop-blur transition-colors
          hover:bg-card`,
          className,
        )}
      >
        {playing ? (
          <Music2Icon className="size-4 animate-pulse text-rose-deep" />
        ) : (
          <VolumeXIcon className="size-4 text-muted-foreground" />
        )}
        {playing ? 'Sound on' : 'Sound off'}
      </button>
    </>
  );
}
