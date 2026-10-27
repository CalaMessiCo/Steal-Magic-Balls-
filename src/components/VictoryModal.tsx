import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameEngine } from '../game/gameEngine';
import { Trophy, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface VictoryModalProps {
  engine: GameEngine;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ engine, onRestart }) => {
  useEffect(() => {
    // Launch fireworks confetti
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#38bdf8', '#a855f7', '#10b981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#38bdf8', '#a855f7', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const user = engine.getUserPlayer();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-500/60 shadow-2xl p-8 flex flex-col items-center text-center gap-6 text-slate-100">
        
        {/* Trophy Icon */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-2xl shadow-amber-500/40 animate-bounce">
          <Trophy className="h-12 w-12" />
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-300 animate-spin" />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
            CHIẾN THẮNG TUYỆT ĐỐI!
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Bạn đã giải mã thành công Cổng Mật Khẩu và chinh phục thế giới Steal Magic Balls!
          </p>
        </div>

        {/* Victory Stats Card */}
        <div className="w-full flex flex-col gap-2.5 rounded-2xl bg-slate-950/70 p-4 border border-slate-800 text-xs text-left">
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Người chơi bị tiêu diệt:</span>
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {engine.totalPlayersKilled} / 500
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Số Magic Balls của bạn:</span>
            <span className="font-mono font-bold text-amber-400">
              {user.magicBalls.toLocaleString()} MB
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">BOSS Ma Thuật đã hạ gục:</span>
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {engine.totalBossesKilled} con
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Số mạng hạ gục của bạn:</span>
            <span className="font-mono font-bold text-cyan-400">
              {user.kills} mạng
            </span>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>CHƠI LẠI TRẬN MỚI</span>
        </button>

      </div>
    </div>
  );
};
