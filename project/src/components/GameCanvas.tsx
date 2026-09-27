import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '@/game/config/phaser-config';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game(createGameConfig(containerRef.current));
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="w-full h-full max-w-[1280px] max-h-[720px] aspect-[16/9] relative"
      />
    </div>
  );
}
