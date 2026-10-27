import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { X, Trophy, Search, User, Shield, Skull, Zap } from 'lucide-react';

interface LeaderboardModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ engine, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [, setTick] = useState(0);

  // Live refresh leaderboard every 500ms
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const top100 = engine.getTop100Players();
  const user = engine.getUserPlayer();
  const userRank = engine.getUserRank();

  const filtered = top100.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.idNumber.toString().includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 flex flex-col gap-4 text-slate-100 max-h-[85vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
              BẢNG XẾP HẠNG TOP 100
            </h2>
            <p className="text-xs text-slate-400">
              Tổng số người chơi: 3000 • Xếp hạng theo số Magic Balls đang nắm giữ.
            </p>
          </div>
        </div>

        {/* User Rank Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 font-mono font-black text-cyan-300 text-sm">
              #{userRank}
            </div>
            <div>
              <div className="font-bold text-sm text-cyan-200 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {user.name}
              </div>
              <div className="text-[11px] text-slate-400">
                Vũ khí: {user.equippedWeapon.name} • {user.kills} mạng hạ gục
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-base font-black text-amber-400">
            <span>🔮</span>
            <span>{user.magicBalls.toLocaleString()} MB</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người chơi hoặc mã ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Top 100 List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 min-h-[250px]">
          {filtered.map((player, index) => {
            const rank = index + 1;
            const isUser = player.isUser;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                  isUser 
                    ? 'bg-cyan-950/40 border-cyan-400 text-cyan-100 font-bold shadow-md'
                    : rank === 1 ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : rank === 2 ? 'bg-slate-800/60 border-slate-600/40 text-slate-200'
                    : rank === 3 ? 'bg-amber-900/20 border-amber-700/40 text-amber-300'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 font-mono font-bold text-center ${
                    rank === 1 ? 'text-amber-400 text-sm' :
                    rank === 2 ? 'text-slate-300 text-sm' :
                    rank === 3 ? 'text-amber-600 text-sm' :
                    'text-slate-500'
                  }`}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                  </span>

                  <div className="flex items-center gap-2">
                    <span 
                      className="h-2.5 w-2.5 rounded-full" 
                      style={{ backgroundColor: player.color }} 
                    />
                    <span className="font-semibold">
                      {player.name}
                    </span>
                    {player.shieldTimeRemaining > 0 && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-0.5">
                        <Shield className="h-3 w-3" /> Khiên
                      </span>
                    )}
                    {player.isDead && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                        <Skull className="h-3 w-3" /> Đang hồi sinh
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-400">
                    {player.equippedWeapon.name}
                  </span>
                  <span className="font-mono font-bold text-amber-400 min-w-[70px] text-right">
                    {player.magicBalls.toLocaleString()} MB
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
