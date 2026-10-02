"use client";

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCryUrl, type CryVersion } from '@/lib/pokemon-assets';

type PokemonCryButtonProps = {
  id: number;
  name: string;
};

const CRY_LABELS: Record<CryVersion, string> = {
  latest: 'Cry',
  legacy: 'Classic cry',
};

export function PokemonCryButton({ id, name }: PokemonCryButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<CryVersion | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const play = async (version: CryVersion) => {
    audioRef.current?.pause();
    const audio = new Audio(getCryUrl(id, version));
    audio.volume = 0.5;
    audioRef.current = audio;
    setError(false);
    setPlaying(version);
    audio.onended = () => setPlaying(current => (audioRef.current === audio ? null : current));
    try {
      await audio.play();
    } catch {
      if (audioRef.current === audio) {
        setPlaying(null);
        setError(true);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CRY_LABELS) as CryVersion[]).map(version => (
          <Button
            key={version}
            variant="outline"
            size="sm"
            onClick={() => play(version)}
            aria-label={`Play ${name}'s ${CRY_LABELS[version].toLowerCase()}`}
          >
            <Volume2 className={playing === version ? 'animate-pulse' : undefined} />
            {CRY_LABELS[version]}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-muted-foreground">This browser could not play the sound.</p>
      )}
    </div>
  );
}
