import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { MAP_SIZE } from '../game/worldGenerator';

interface MinimapProps {
  engine: GameEngine;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const scale = size / MAP_SIZE;

      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, size, size);

      // Map Danger border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, size, size);

      // Nearby Levers (sample every 10 for performance)
      ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
      for (let i = 0; i < engine.levers.length; i += 8) {
        const l = engine.levers[i];
        if (!l.isDisposed) {
          ctx.fillRect(l.x * scale, l.y * scale, 1, 1);
        }
      }

      // Bosses
      for (const m of engine.monsters) {
        if (m.isDead) continue;
        if (m.isBoss) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(m.x * scale, m.y * scale, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // User Player
      const user = engine.getUserPlayer();
      if (!user.isDead) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(user.x * scale, user.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col items-center rounded-2xl bg-slate-900/90 p-2 backdrop-blur-md border border-slate-700/60 shadow-2xl">
      <div className="flex items-center justify-between w-full px-1 pb-1 text-[10px] font-bold text-slate-400">
        <span>BẢN ĐỒ RADAR</span>
        <span className="text-cyan-400">2500x2500</span>
      </div>
      <canvas
        ref={canvasRef}
        width={130}
        height={130}
        className="rounded-xl border border-slate-800"
      />
      <div className="flex items-center gap-3 pt-1.5 text-[9px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Bạn
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Boss
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" /> Cần gạt
        </span>
      </div>
    </div>
  );
};
