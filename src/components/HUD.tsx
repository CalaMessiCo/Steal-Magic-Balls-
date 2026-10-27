import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { sound } from '../utils/audio';
import { MAP_SIZE } from '../game/worldGenerator';
import { 
  Trophy, 
  ShoppingBag, 
  KeyRound, 
  Volume2, 
  VolumeX, 
  Scroll, 
  Crosshair, 
  ShieldAlert, 
  Heart, 
  Zap, 
  PlusCircle, 
  Sparkles,
  MapPin
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onOpenGate: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenInventory: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onOpenGate,
  onOpenShop,
  onOpenLeaderboard,
  onOpenInventory,
  isMuted,
  onToggleMute
}) => {
  // Continuous real-time frame ticker to keep top-left stats and HUD updating live at 60fps
  const [, setTick] = useState(0);
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setTick(t => (t + 1) % 1000000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const user = engine.getUserPlayer();
  const hpPct = Math.max(0, Math.min(100, (user.hp / user.maxHp) * 100));

  const hasPlayerWith20k = engine.players.some(p => p.magicBalls >= 20000);
  const userRank = engine.getUserRank();

  // Spells affordability
  const canAffordSoulSlash = user.magicBalls >= 500 && !user.isDead && !user.isPermanentlyDead;
  const canAffordSoulHeal = user.magicBalls >= 650 && !user.isDead && !user.isPermanentlyDead && !user.hasSoulHeal;
  const canAffordShield = user.magicBalls >= 650 && !user.isDead && !user.isPermanentlyDead;
  const canAffordCraftLever = user.magicBalls >= 2500 && !user.isDead && !user.isPermanentlyDead;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 overflow-hidden select-none">
      
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-4">
        
        {/* User Stats Card */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-slate-900/85 p-3.5 backdrop-blur-md border border-slate-700/60 shadow-2xl min-w-[280px]">
          
          {/* Header & Magic Balls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-black text-sm tracking-wide text-slate-100">
                {user.name}
              </span>
            </div>
            
            {/* Rank badge */}
            <div className="flex items-center gap-1 rounded-full bg-purple-950/80 px-2.5 py-0.5 border border-purple-500/40 text-[11px] font-bold text-purple-300">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span>Hạng #{userRank}</span>
            </div>
          </div>

          {/* Magic Balls Display */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/5 px-3 py-2 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                🔮
              </div>
              <span className="text-xs font-semibold text-amber-200/90">Magic Balls</span>
            </div>
            <span className="font-mono text-xl font-black text-amber-400 tracking-tight">
              {user.magicBalls.toLocaleString()}
            </span>
          </div>

          {/* Health Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1 text-rose-400">
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> Sinh lực (HP)
                <span className="text-[10px] text-emerald-400 font-normal font-mono">(+1 HP/15s)</span>
              </span>
              <span className="font-mono text-slate-200">
                {Math.round(user.hp)} / {user.maxHp}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-950/80 p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hpPct > 50 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  hpPct > 25 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                  'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Shield status or Position indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            {user.shieldTimeRemaining > 0 ? (
              <span className="flex items-center gap-1 text-cyan-400 font-semibold animate-pulse">
                <ShieldAlert className="h-3.5 w-3.5" /> Khiên miễn nhiễm: {user.shieldTimeRemaining.toFixed(1)}s
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Crosshair className="h-3 w-3" /> Vũ khí: {user.equippedWeapon.name} ({user.equippedWeapon.damage} ST)
              </span>
            )}
            <span className="flex items-center gap-0.5 text-slate-400">
              <MapPin className="h-3 w-3 text-cyan-500" />
              {Math.round(user.x)}, {Math.round(user.y)}
            </span>
          </div>

          {/* Active Sprint Indicator */}
          {user.isSprinting && (
            <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/40 animate-pulse">
              <span>⚡ Đang bứt tốc (Shift)</span>
              <span>-5 MB / 5s</span>
            </div>
          )}

          {/* Hồn Hồi Status Badge */}
          {user.hasSoulHeal && (
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40">
              <span className="flex items-center gap-1 font-bold">✨ Hồn Hồi Bảo Hộ</span>
              <span className="text-[10px] text-emerald-400">Chống chết Hồn Trảm</span>
            </div>
          )}

          {/* Inactivity Warning (Danger if approaching 2 minutes without score change) */}
          {user.timeSinceScoreChange && user.timeSinceScoreChange > 40 && !user.isPermanentlyDead && (
            <div className={`flex items-center justify-between text-[11px] font-mono px-2 py-0.5 rounded-lg border animate-pulse ${
              user.timeSinceScoreChange > 90
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
            }`}>
              <span>⏳ Bất động: {Math.floor(user.timeSinceScoreChange)}s/120s</span>
              <span>(2p = Loại hẳn)</span>
            </div>
          )}

          {/* Shadowing Mode Alert */}
          {user.isPermanentlyDead && (
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2 py-1 rounded-lg border border-purple-500 font-bold animate-pulse">
              <span>👁️ SHADOWING MODE</span>
              <span>Bị loại vĩnh viễn</span>
            </div>
          )}
        </div>

        {/* TOP RIGHT: Victory Conditions Progress & Navigation Bar */}
        <div className="flex flex-col items-end gap-2.5">
          
          {/* Quick Action Navigation Buttons */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-slate-900/85 p-2 backdrop-blur-md border border-slate-700/60 shadow-xl">
            <button
              onClick={onOpenShop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all hover:scale-105 active:scale-95"
              title="Mở Cửa Hàng Vũ Khí (B)"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Shop [B]</span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all hover:scale-105 active:scale-95"
              title="Bảng Xếp Hạng Top 100 (L / Tab)"
            >
              <Trophy className="h-4 w-4" />
              <span>BXH [L]</span>
            </button>

            <button
              onClick={onOpenInventory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all hover:scale-105 active:scale-95"
              title="Túi Mật Khẩu & Giấy Phép [I]"
            >
              <Scroll className="h-4 w-4" />
              <span>Túi [I]</span>
            </button>

            <button
              onClick={onOpenGate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-900/40"
              title="Cổng Mật Khẩu (P)"
            >
              <KeyRound className="h-4 w-4 text-amber-300" />
              <span>Cổng [P]</span>
            </button>

            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all hover:scale-105 active:scale-95"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
          </div>

          {/* Victory Goals Tracker Widget */}
          <div className="pointer-events-auto flex flex-col gap-1.5 rounded-2xl bg-slate-900/85 p-3 backdrop-blur-md border border-slate-700/60 shadow-xl min-w-[260px] text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Điều Kiện Thắng Game
              </span>
              <span className="text-[10px] text-slate-400">Map 2500x2500</span>
            </div>

            {/* Condition 1: 500 players killed */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">⚔️ Người chơi bị diệt:</span>
              <span className={`font-mono font-bold ${engine.totalPlayersKilled >= 500 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {engine.totalPlayersKilled} / 500 {engine.totalPlayersKilled >= 500 && '✓'}
              </span>
            </div>

            {/* Condition 2: Player with 20k balls */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">💰 Ai đó có ≥20.000 MB:</span>
              <span className={`font-mono font-bold ${hasPlayerWith20k ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasPlayerWith20k ? 'Đạt chuẩn ✓' : 'Chưa có'}
              </span>
            </div>

            {/* Condition 3: At least 1 Boss killed */}
            <div className="flex items-center justify-between">
              <span className="text-slate-300">👑 Tiêu diệt BOSS:</span>
              <span className={`font-mono font-bold ${engine.totalBossesKilled >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {engine.totalBossesKilled} / 1 {engine.totalBossesKilled >= 1 && '✓'}
              </span>
            </div>

            {/* Papers Collected */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-300">📜 Giấy mật khẩu:</span>
              <span className={`font-mono font-bold ${engine.collectedPapers.size === 5 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {engine.collectedPapers.size} / 5
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* MIDDLE LEFT: Event / Battle Log */}
      <div className="flex flex-col gap-1 max-w-sm pointer-events-none mt-2">
        {engine.eventLog.slice(0, 5).map((log, index) => (
          <div
            key={index}
            className={`text-xs px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md border ${
              log.type === 'kill' ? 'bg-rose-950/70 border-rose-800/50 text-rose-200' :
              log.type === 'boss' ? 'bg-purple-950/80 border-purple-700/60 text-amber-300 font-bold animate-pulse' :
              log.type === 'paper' ? 'bg-amber-950/70 border-amber-600/50 text-yellow-300 font-semibold' :
              log.type === 'lever' ? 'bg-slate-900/70 border-slate-700/50 text-slate-300' :
              'bg-slate-900/60 border-slate-800/40 text-slate-400'
            }`}
          >
            {log.text}
          </div>
        ))}
      </div>

      {/* BOTTOM CENTER: Action Spells Hotbar */}
      <div className="flex flex-col items-center gap-2">
        
        {/* Controls Hint */}
        <div className="rounded-full bg-slate-900/80 px-4 py-1 backdrop-blur-md border border-slate-700/50 text-[11px] text-slate-300 flex items-center gap-3">
          <span>🎮 <strong className="text-slate-100">WASD</strong> Di chuyển</span>
          <span>•</span>
          <span className={user.isSprinting ? 'text-amber-400 font-bold animate-pulse' : ''}>
            ⚡ <strong className="text-amber-300">Giữ Shift</strong> Chạy nhanh (-5 MB/5s)
          </span>
          <span>•</span>
          <span>🖱️ <strong className="text-slate-100">Chuột Trái</strong> Tấn công</span>
          <span>•</span>
          <span>🕹️ <strong className="text-amber-300">Chuột Phải / F</strong> Gạt cần</span>
        </div>

        {/* Hotbar Skills */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-3xl bg-slate-900/90 p-2.5 backdrop-blur-lg border border-slate-700/70 shadow-2xl">
          
          {/* Skill [X]: Chiêu Đặc Biệt Vũ Khí Tầm Xa */}
          {user.equippedWeapon.isRanged && user.equippedWeapon.specialSkillName && (
            <button
              onClick={() => engine.castWeaponSpecialSkill(user, 0)}
              disabled={Boolean(user.weaponSkillCooldown && user.weaponSkillCooldown > 0)}
              className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
                (!user.weaponSkillCooldown || user.weaponSkillCooldown <= 0)
                  ? 'bg-gradient-to-br from-fuchsia-600 to-purple-800 border-fuchsia-400 text-white hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/40 cursor-pointer animate-pulse'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
              }`}
              title={user.equippedWeapon.specialSkillDesc || 'Chiêu đặc biệt vũ khí tầm xa'}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-sm">
                X
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-wide text-purple-100 flex items-center gap-1">
                  <span>{user.equippedWeapon.icon}</span> {user.equippedWeapon.specialSkillName}
                </span>
                <span className="text-[10px] font-mono text-purple-200/80">
                  {user.weaponSkillCooldown && user.weaponSkillCooldown > 0
                    ? `Hồi: ${user.weaponSkillCooldown.toFixed(1)}s`
                    : 'Chiêu đặc biệt [X]'}
                </span>
              </div>
            </button>
          )}

          {/* Skill [Q]: Hồn Trảm */}
          <button
            onClick={() => {
              const aimAngle = 0; // forward or mouse
              engine.castSoulSlash(user, aimAngle);
            }}
            disabled={!canAffordSoulSlash}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
              canAffordSoulSlash 
                ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-cyan-400 text-white hover:scale-105 active:scale-95 shadow-lg shadow-cyan-900/40 cursor-pointer'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold text-sm">
              Q
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide text-cyan-100 flex items-center gap-1">
                <Zap className="h-3 w-3 text-cyan-300" /> Hồn Trảm
              </span>
              <span className="text-[10px] font-mono text-cyan-200/80">
                500 MB • Sát thương
              </span>
            </div>
          </button>

          {/* Skill [E]: Hồn Hồi */}
          <button
            onClick={() => engine.castSoulHeal(user)}
            disabled={!canAffordSoulHeal}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
              user.hasSoulHeal
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 cursor-default shadow-md shadow-emerald-900/40'
                : canAffordSoulHeal
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400 text-white hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/40 cursor-pointer'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border font-bold text-sm ${
              user.hasSoulHeal
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
            }`}>
              E
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide text-emerald-100 flex items-center gap-1">
                <Heart className="h-3 w-3 text-emerald-300" /> Hồn Hồi {user.hasSoulHeal && '✓'}
              </span>
              <span className="text-[10px] font-mono text-emerald-200/80">
                {user.hasSoulHeal ? 'Đã kích hoạt bảo vệ' : '650 MB • Chống chết Hồn Trảm'}
              </span>
            </div>
          </button>

          {/* Skill [R]: Khiên Thần */}
          <button
            onClick={() => engine.castShield(user)}
            disabled={!canAffordShield}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
              canAffordShield
                ? 'bg-gradient-to-br from-amber-600 to-indigo-700 border-amber-400 text-white hover:scale-105 active:scale-95 shadow-lg shadow-amber-900/40 cursor-pointer'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-sm">
              R
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide text-amber-100 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-300" /> Khiên Thần
              </span>
              <span className="text-[10px] font-mono text-amber-200/80">
                650 MB • Bất tử 5s
              </span>
            </div>
          </button>

          {/* Skill [C]: Tạo Cần Gạt */}
          <button
            onClick={() => engine.craftLever(user)}
            disabled={!canAffordCraftLever}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
              canAffordCraftLever
                ? 'bg-gradient-to-br from-purple-600 to-indigo-700 border-purple-400 text-white hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/40 cursor-pointer'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold text-sm">
              C
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wide text-purple-100 flex items-center gap-1">
                <PlusCircle className="h-3 w-3 text-purple-300" /> Tạo Cần Gạt
              </span>
              <span className="text-[10px] font-mono text-purple-200/80">
                2500 MB • Đập rơi giấy
              </span>
            </div>
          </button>

        </div>

      </div>

    </div>
  );
};
