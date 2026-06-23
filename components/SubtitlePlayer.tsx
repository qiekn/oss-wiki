"use client";

import { useEffect, useRef, useState } from "react";

export interface SubtitleItem {
  character: string;
  marker: string;
  comment: string;
  text: string;
}

export interface SubtitleEntry {
  name: string;
  items: SubtitleItem[];
  audioSrc: string;
}

interface SubtitlePlayerProps {
  entry: SubtitleEntry;
}

// Module-level singleton: only one audio element may play at a time across
// every SubtitlePlayer instance on the page.
let activeAudio: HTMLAudioElement | null = null;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H7Zm7 0a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3Z" />
    </svg>
  );
}

export default function SubtitlePlayer({ entry }: SubtitlePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    let probed = false;

    const syncDuration = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        return;
      }
      // Many OGG files report duration === Infinity until the browser reads to
      // the end. Seek far past the end once to force it to resolve the real
      // length, then jump back to the start.
      if (!probed) {
        probed = true;
        const onProbe = () => {
          audio.removeEventListener("timeupdate", onProbe);
          audio.currentTime = 0;
          if (Number.isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        };
        audio.addEventListener("timeupdate", onProbe);
        try {
          audio.currentTime = 1e101;
        } catch {
          audio.removeEventListener("timeupdate", onProbe);
        }
      }
    };

    const handlePlay = () => {
      // Pause whatever else is currently playing before taking over.
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
      }
      activeAudio = audio;
      setIsPlaying(true);
    };
    const handlePause = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      setIsPlaying(false);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("ended", handleEnded);

    // Metadata may already be available before listeners attached.
    if (audio.readyState >= 1 /* HAVE_METADATA */) {
      syncDuration();
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("ended", handleEnded);
      if (activeAudio === audio) {
        activeAudio = null;
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const time = Number(event.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="relative w-full max-w-6xl rounded-xl border border-white/15 bg-black/20 px-8 py-8 shadow-2xl">
      {/* Floating control: overlaid in the top-left corner, does not take a
          row in the flow, so the subtitle text below is never pushed down. */}
      <div className="absolute left-4 top-4 z-10">
        <div className="group inline-flex items-center rounded-full transition-colors hover:bg-black/40 hover:backdrop-blur-sm focus-within:bg-black/40 focus-within:backdrop-blur-sm">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "暂停" : "播放"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="flex max-w-0 items-center gap-2.5 overflow-hidden pl-2 pr-3 opacity-0 transition-all duration-200 ease-out group-hover:max-w-md group-hover:opacity-100 group-focus-within:max-w-md group-focus-within:opacity-100">
            <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-white/60">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step="any"
              onChange={handleSeek}
              aria-label="播放进度"
              className="subtitle-audio-range w-44 sm:w-56"
              style={{ "--progress": `${progress}%` } as React.CSSProperties}
            />

            <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-white/60">
              {formatTime(duration)}
            </span>
          </div>

          <audio ref={audioRef} preload="metadata" src={entry.audioSrc} className="hidden" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-10">
        {entry.items.map((item, index) => (
          <div key={`${entry.name}-${index}`} className="w-full text-center">
            {item.comment && (
              <p className="mx-auto mb-8 max-w-5xl font-sans text-xl italic leading-relaxed text-yellow-300">
                {item.comment}
              </p>
            )}

            <p className="subtitle-game-text mx-auto max-w-5xl whitespace-pre-line">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
