import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { Lever, Player, Monster, Projectile, LeverType, PasswordGate } from '../types/game';
import { MAP_SIZE } from '../game/worldGenerator';

interface GameCanvasProps {
  engine: GameEngine;
  onOpenGate: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenInventory: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onOpenGate,
  onOpenShop,
  onOpenLeaderboard,
  onOpenInventory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredLever, setHoveredLever] = useState<Lever | null>(null);
  const [nearbyLever, setNearbyLever] = useState<Lever | null>(null);

  // Input states
  const keysRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean; shift: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
    shift: false,
  });
  const mouseRef = useRef<{ screenX: number; screenY: number; worldX: number; worldY: number }>({
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
  });

  const TILE_SIZE = 28; // 1 PGrid = 28 pixels

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrow keys or space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keysRef.current.up = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keysRef.current.down = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keysRef.current.left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keysRef.current.right = true;
      if (e.key === 'Shift') keysRef.current.shift = true;

      // Spells Hotkeys
      const user = engine.getUserPlayer();
      if (user.isPermanentlyDead) {
        // In Shadowing Mode, player cannot interact or cast skills, only spectates
        if (e.key === 'l' || e.key === 'L' || e.key === 'Tab') {
          e.preventDefault();
          onOpenLeaderboard();
        }
        return;
      }

      const aimAngle = Math.atan2(
        mouseRef.current.worldY - user.y,
        mouseRef.current.worldX - user.x
      );

      // Key F to Pull / Clean Lever
      if (e.key === 'f' || e.key === 'F') {
        engine.interactWithLeverAt();
      }

      if (e.key === 'x' || e.key === 'X') {
        engine.castWeaponSpecialSkill(user, aimAngle, mouseRef.current.worldX, mouseRef.current.worldY);
      }
      if (e.key === 'q' || e.key === 'Q') {
        engine.castSoulSlash(user, aimAngle);
      }
      if (e.key === 'e' || e.key === 'E') {
        engine.castSoulHeal(user);
      }
      if (e.key === 'r' || e.key === 'R') {
        engine.castShield(user);
      }
      if (e.key === 'c' || e.key === 'C') {
        engine.craftLever(user);
      }
      if (e.key === 'b' || e.key === 'B') {
        onOpenShop();
      }
      if (e.key === 'p' || e.key === 'P') {
        onOpenGate();
      }
      if (e.key === 'l' || e.key === 'L' || e.key === 'Tab') {
        e.preventDefault();
        onOpenLeaderboard();
      }
      if (e.key === 'i' || e.key === 'I') {
        onOpenInventory();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keysRef.current.up = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keysRef.current.down = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keysRef.current.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keysRef.current.right = false;
      if (e.key === 'Shift') keysRef.current.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, onOpenGate, onOpenShop, onOpenLeaderboard, onOpenInventory]);

  // Main rendering & game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const updateSize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const user = engine.getUserPlayer();

      // Calculate aim angle
      const aimAngle = Math.atan2(
        mouseRef.current.worldY - user.y,
        mouseRef.current.worldX - user.x
      );

      // Update engine
      engine.update(dt, {
        up: keysRef.current.up,
        down: keysRef.current.down,
        left: keysRef.current.left,
        right: keysRef.current.right,
        shift: keysRef.current.shift,
        aimAngle,
      });

      // Check nearby levers for user
      const userLevers = engine.leverGrid.queryRadius(user.x, user.y, 5.0).filter(l => !l.isDisposed);
      setNearbyLever(userLevers[0] || null);

      // VIEWPORT CAMERA: Center on User Player
      const viewW = canvas.width;
      const viewH = canvas.height;
      const camX = user.x * TILE_SIZE - viewW / 2;
      const camY = user.y * TILE_SIZE - viewH / 2;

      // Update world mouse coords
      mouseRef.current.worldX = (mouseRef.current.screenX + camX) / TILE_SIZE;
      mouseRef.current.worldY = (mouseRef.current.screenY + camY) / TILE_SIZE;

      // Find if hovering a lever
      const nearbyLevers = engine.leverGrid.queryRadius(mouseRef.current.worldX, mouseRef.current.worldY, 2.5);
      setHoveredLever(nearbyLevers[0] || null);

      // CLEAR SCREEN
      ctx.fillStyle = '#090d16'; // Deep midnight fantasy void
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      ctx.translate(-camX, -camY);

      // 1. DRAW MAP TILES & BACKGROUND GRID
      drawWorldBackground(ctx, camX, camY, viewW, viewH, TILE_SIZE);

      // 2. DRAW MAP EDGES (DANGER ZONE)
      drawMapBoundaries(ctx, TILE_SIZE);

      // 3. DRAW WALLS
      drawWalls(ctx, engine, TILE_SIZE);

      // 4. DRAW LEVERS
      drawLevers(ctx, engine, camX, camY, viewW, viewH, TILE_SIZE, time);

      // 6. DRAW MONSTERS & BOSS
      drawMonsters(ctx, engine.monsters, TILE_SIZE, time);

      // 7. DRAW PLAYERS & BOTS
      drawPlayers(ctx, engine, camX, camY, viewW, viewH, TILE_SIZE, time);

      // 8. DRAW PROJECTILES
      drawProjectiles(ctx, engine.projectiles, TILE_SIZE);

      // 9. DRAW PARTICLES
      drawParticles(ctx, engine.particles, TILE_SIZE);

      // 10. DRAW FLOATING TEXTS
      drawFloatingTexts(ctx, engine.floatingTexts, TILE_SIZE);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, [engine]);

  const handleRightClick = (clientX?: number, clientY?: number) => {
    const user = engine.getUserPlayer();
    if (user.isDead) return;

    if (clientX !== undefined && clientY !== undefined && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const camX = user.x * TILE_SIZE - canvasRef.current.width / 2;
      const camY = user.y * TILE_SIZE - canvasRef.current.height / 2;
      const worldX = (screenX + camX) / TILE_SIZE;
      const worldY = (screenY + camY) / TILE_SIZE;
      engine.interactWithLeverAt(worldX, worldY);
    } else {
      engine.interactWithLeverAt();
    }
  };

  // Handle Mouse Click (Left = Attack, Right = Interact Lever)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const user = engine.getUserPlayer();
    if (user.isDead || user.isPermanentlyDead) return;

    if (e.button === 0) {
      // Left Click: Normal Attack with equipped weapon
      const rect = canvasRef.current?.getBoundingClientRect();
      let worldX = mouseRef.current.worldX;
      let worldY = mouseRef.current.worldY;
      if (rect && canvasRef.current) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const camX = user.x * TILE_SIZE - canvasRef.current.width / 2;
        const camY = user.y * TILE_SIZE - canvasRef.current.height / 2;
        worldX = (screenX + camX) / TILE_SIZE;
        worldY = (screenY + camY) / TILE_SIZE;
      }
      const aimAngle = Math.atan2(worldY - user.y, worldX - user.x);
      engine.attackWithEquippedWeapon(user, aimAngle, worldX, worldY);
    } else if (e.button === 2) {
      // Right Click: Pull Lever or Clean Copper Lever
      e.preventDefault();
      handleRightClick(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mouseRef.current.screenX = e.clientX - rect.left;
      mouseRef.current.screenY = e.clientY - rect.top;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => {
          e.preventDefault();
          handleRightClick(e.clientX, e.clientY);
        }}
      />

      {/* Lever Hover Tooltip */}
      {hoveredLever && !hoveredLever.isDisposed && (
        <div 
          className="absolute pointer-events-none z-20 bg-slate-900/90 border border-amber-500/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-xl flex flex-col gap-0.5"
          style={{
            left: Math.min(window.innerWidth - 180, mouseRef.current.screenX + 15),
            top: Math.min(window.innerHeight - 80, mouseRef.current.screenY + 15)
          }}
        >
          <div className="font-bold flex items-center gap-1.5 text-amber-300">
            <span>🕹️ {engine.getLeverTypeName(hoveredLever.type)}</span>
            <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded font-mono">
              +{hoveredLever.ballsReward} MB
            </span>
          </div>
          {hoveredLever.type === 'copper' && (
            <div className="text-[11px] text-cyan-400">
              Oxy hóa: {Math.round(hoveredLever.oxidationPercent || 0)}% (Cần 500 MB để làm sạch)
            </div>
          )}
          {hoveredLever.cooldownRemaining > 0 ? (
            <div className="text-red-400 font-mono">
              ⏳ Hồi chiêu: {Math.ceil(hoveredLever.cooldownRemaining)}s
            </div>
          ) : (
            <div className="text-emerald-400 font-semibold animate-pulse">
              👉 Chuột phải hoặc bấm F để gạt!
            </div>
          )}
        </div>
      )}

      {/* Near Lever Interaction Prompt Button */}
      {nearbyLever && !nearbyLever.isDisposed && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => engine.interactWithLeverAt()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-2xl transition-all border active:scale-95 cursor-pointer ${
              nearbyLever.cooldownRemaining > 0
                ? 'bg-slate-800/90 border-slate-700 text-slate-300'
                : 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-500 text-slate-950 font-black border-amber-400 shadow-amber-900/50 hover:scale-105 animate-pulse'
            }`}
          >
            <span>🕹️</span>
            <span>
              {nearbyLever.cooldownRemaining > 0
                ? `Cần gạt đang hồi chiêu (${Math.ceil(nearbyLever.cooldownRemaining)}s)`
                : `GẠT ${engine.getLeverTypeName(nearbyLever.type).toUpperCase()} (+${nearbyLever.ballsReward} MB) [Bấm F / Chuột Phải]`}
            </span>
          </button>
        </div>
      )}

      {/* Multi-Kill Streak Announcement Banner */}
      {engine.activeMultiKill && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center animate-bounce">
          <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white font-black text-2xl tracking-wider shadow-2xl border-2 border-amber-300 shadow-rose-950/80 uppercase">
            {engine.activeMultiKill.title}
          </div>
          <div className="mt-1.5 px-4 py-1 rounded-full bg-slate-900/90 border border-amber-400 text-amber-300 font-mono text-sm font-bold shadow-lg">
            +{engine.activeMultiKill.bonus} Magic Balls!
          </div>
        </div>
      )}

      {/* Shadowing Mode Spectator Banner */}
      {engine.getUserPlayer().isPermanentlyDead && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center">
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-purple-950/90 border-2 border-purple-500 text-purple-200 shadow-2xl backdrop-blur-md animate-pulse">
            <span className="text-2xl">👁️</span>
            <div>
              <div className="font-black text-sm uppercase tracking-wider text-purple-300">
                CHẾ ĐỘ QUAN SÁT (SHADOWING MODE)
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Bị loại vĩnh viễn do không đổi điểm trong 2 phút. Dùng WASD tự do di chuyển quan sát các bot thi đấu.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- RENDER HELPERS ---

function drawWorldBackground(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  tileSize: number
) {
  // Draw subtle grid tiles in view
  const startX = Math.max(0, Math.floor(camX / tileSize));
  const endX = Math.min(MAP_SIZE, Math.ceil((camX + viewW) / tileSize));
  const startY = Math.max(0, Math.floor(camY / tileSize));
  const endY = Math.min(MAP_SIZE, Math.ceil((camY + viewH) / tileSize));

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = startX; x <= endX; x++) {
    ctx.moveTo(x * tileSize, startY * tileSize);
    ctx.lineTo(x * tileSize, endY * tileSize);
  }
  for (let y = startY; y <= endY; y++) {
    ctx.moveTo(startX * tileSize, y * tileSize);
    ctx.lineTo(endX * tileSize, y * tileSize);
  }
  ctx.stroke();

  // Subtle floor markings every 10 units
  ctx.fillStyle = 'rgba(56, 189, 248, 0.03)';
  for (let x = Math.floor(startX / 10) * 10; x <= endX; x += 10) {
    for (let y = Math.floor(startY / 10) * 10; y <= endY; y += 10) {
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize * 2, tileSize * 2);
    }
  }
}

function drawMapBoundaries(ctx: CanvasRenderingContext2D, tileSize: number) {
  const mapPx = MAP_SIZE * tileSize;
  
  // Outer Death Field border glow
  ctx.save();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 8;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 15;
  ctx.strokeRect(0, 0, mapPx, mapPx);

  // Inner warning stripe
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(tileSize, tileSize, mapPx - tileSize * 2, mapPx - tileSize * 2);
  ctx.restore();
}

function drawWalls(ctx: CanvasRenderingContext2D, engine: GameEngine, tileSize: number) {
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;

  for (const wall of engine.walls) {
    const px = wall.x * tileSize;
    const py = wall.y * tileSize;
    const pw = wall.width * tileSize;
    const ph = wall.height * tileSize;

    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);

    // Wall top bevel
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 2, py + 2, pw - 4, Math.min(6, ph - 4));
    ctx.fillStyle = '#1e293b';
  }
}

function drawLevers(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  tileSize: number,
  time: number
) {
  // Query levers in viewport
  const minX = (camX - 50) / tileSize;
  const maxX = (camX + viewW + 50) / tileSize;
  const minY = (camY - 50) / tileSize;
  const maxY = (camY + viewH + 50) / tileSize;
  const visibleLevers = engine.leverGrid.queryRect(minX, minY, maxX, maxY);

  for (const lever of visibleLevers) {
    if (lever.isDisposed) continue;

    const lx = lever.x * tileSize;
    const ly = lever.y * tileSize;
    const isReady = lever.cooldownRemaining <= 0;

    ctx.save();
    ctx.translate(lx, ly);

    // Lever base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -9, 18, 18);

    // Lever Handle Color based on type
    let handleColor = '#b45309'; // wood
    let glowColor = 'transparent';

    switch (lever.type) {
      case 'wood':
        handleColor = '#b45309';
        break;
      case 'stone':
        handleColor = '#94a3b8';
        break;
      case 'copper':
        // If oxidized, green patina tint
        const ox = (lever.oxidationPercent || 0) / 100;
        handleColor = ox > 0.4 ? '#10b981' : '#f97316';
        break;
      case 'iron':
        handleColor = '#cbd5e1';
        break;
      case 'gold':
        handleColor = '#fbbf24';
        glowColor = '#f59e0b';
        break;
      case 'diamond':
        handleColor = '#38bdf8';
        glowColor = '#06b6d4';
        break;
      case 'ultimate':
        handleColor = '#e879f9';
        glowColor = '#c084fc';
        break;
      case 'crafted':
        handleColor = '#a855f7';
        glowColor = '#9333ea';
        break;
    }

    if (glowColor !== 'transparent' && isReady) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
    }

    // Draw lever arm
    const leverAngle = isReady ? -Math.PI / 4 : Math.PI / 4;
    ctx.strokeStyle = handleColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(Math.cos(leverAngle) * 12, Math.sin(leverAngle) * 12);
    ctx.stroke();

    // Lever knob
    ctx.fillStyle = handleColor;
    ctx.beginPath();
    ctx.arc(Math.cos(leverAngle) * 12, Math.sin(leverAngle) * 12, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Cooldown ring
    if (!isReady) {
      const progress = 1 - lever.cooldownRemaining / lever.cooldownDuration;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    } else {
      // Ready pulse ring
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crafted Lever Hit Points Indicator (2 hits from Hồn Trảm)
    if (lever.isCrafted) {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ ${lever.craftedHitsRemaining ?? 2}/2`, 0, -14);
    }

    // Copper Lever Oxidation warning
    if (lever.type === 'copper' && lever.oxidationPercent && lever.oxidationPercent > 20) {
      ctx.fillStyle = lever.oxidationPercent > 70 ? '#ef4444' : '#06b6d4';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(lever.oxidationPercent)}%`, 0, 19);
    }

    ctx.restore();
  }
}

function drawMonsters(ctx: CanvasRenderingContext2D, monsters: Monster[], tileSize: number, time: number) {
  for (const m of monsters) {
    if (m.isDead) continue;
    const mx = m.x * tileSize;
    const my = m.y * tileSize;
    const sizePx = m.size * tileSize;
    const radius = sizePx / 2;

    ctx.save();
    ctx.translate(mx, my);

    if (m.isBoss) {
      // BOSS AURA (3x3 PGrid)
      ctx.shadowColor = '#9333ea';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Horns / Spikes
      ctx.fillStyle = '#a855f7';
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + time * 0.001;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing Eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-7, -4, 3.5, 0, Math.PI * 2);
      ctx.arc(7, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Boss Label & HP Bar
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('👑 BOSS MA THUẬT', 0, -radius - 10);

      // HP Bar
      const barW = radius * 2.2;
      const barH = 5;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-barW / 2, -radius - 7, barW, barH);
      const hpPct = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-barW / 2, -radius - 7, barW * hpPct, barH);
    } else {
      // Normal Monster (1x1 PGrid - same size as player)
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Monster Eyes (scaled for 1x1 size)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-3.5, -2, 2, 0, Math.PI * 2);
      ctx.arc(3.5, -2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Monster mini HP Bar
      const barW = tileSize * 0.9;
      const barH = 3;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-barW / 2, -radius - 5, barW, barH);
      const hpPct = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -radius - 5, barW * hpPct, barH);
    }

    ctx.restore();
  }
}

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  tileSize: number,
  time: number
) {
  const user = engine.getUserPlayer();
  const radius = tileSize / 2;

  // Draw Bots in view
  for (let i = 1; i < engine.players.length; i++) {
    const bot = engine.players[i];
    if (bot.isDead) continue;

    const bx = bot.x * tileSize;
    const by = bot.y * tileSize;

    // Viewport cull check
    if (bx < camX - 40 || bx > camX + viewW + 40 || by < camY - 40 || by > camY + viewH + 40) {
      continue;
    }

    ctx.save();
    ctx.translate(bx, by);

    // Shield Aura if active
    if (bot.shieldTimeRemaining > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bot Body (1x1 PGrid)
    ctx.fillStyle = bot.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bot Tag & HP
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${bot.idNumber}`, 0, -radius - 8);

    // Bot mini HP bar
    const barW = tileSize * 0.9;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, -radius - 6, barW, 3);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-barW / 2, -radius - 6, barW * (bot.hp / bot.maxHp), 3);

    // Bot Magic Balls Badge
    if (bot.magicBalls > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`${bot.magicBalls} MB`, 0, radius + 9);
    }

    // Desperation Frenzy Aura (<= 30s to change score: cuồng sát tiêu diệt mọi người chơi)
    if (bot.timeSinceScoreChange && bot.timeSinceScoreChange >= 90) {
      const remainingSeconds = Math.ceil(120 - bot.timeSinceScoreChange);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`⚔️ CUỒNG SÁT (${remainingSeconds}s)`, 0, -radius - 12);
    }

    ctx.restore();
  }

  // Draw User Player
  if (user.isPermanentlyDead) {
    // Ethereal spectator ghost orb in Shadowing Mode
    const ux = user.x * tileSize;
    const uy = user.y * tileSize;

    ctx.save();
    ctx.translate(ux, uy);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👁️', 0, 4);

    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('SHADOWING (QUAN SÁT)', 0, -radius - 9);

    ctx.restore();
  } else if (!user.isDead) {
    const ux = user.x * tileSize;
    const uy = user.y * tileSize;

    ctx.save();
    ctx.translate(ux, uy);

    // User Invulnerability Shield
    if (user.shieldTimeRemaining > 0) {
      const shieldPulse = Math.sin(time * 0.01) * 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 6 + shieldPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Shield countdown tag
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`KHIÊN ${user.shieldTimeRemaining.toFixed(1)}s`, 0, -radius - 17);
    }

    // Hồn Hồi protective aura indicator
    if (user.hasSoulHeal) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hero Body
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Weapon indicator in hand
    ctx.fillStyle = user.equippedWeapon.color;
    ctx.beginPath();
    ctx.arc(radius * 0.8, -radius * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Name & HP Bar
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BẠN (USER)', 0, -radius - 8);

    const barW = tileSize * 1.2;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, -radius - 6, barW, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-barW / 2, -radius - 6, barW * (user.hp / user.maxHp), 4);

    if (user.hasSoulHeal) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('✨ HỒN HỒI (BẢO HỘ)', 0, radius + 11);
    }

    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], tileSize: number) {
  for (const proj of projectiles) {
    const px = proj.x * tileSize;
    const py = proj.y * tileSize;
    const rad = proj.radius * tileSize;

    ctx.save();
    ctx.translate(px, py);

    if (proj.isSoulSlash) {
      // HỒN TRẢM: Crescent Energy Wave
      const angle = Math.atan2(proj.vy, proj.vx);
      ctx.rotate(angle);

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.6, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 1.4, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.stroke();
    } else {
      // Standard bullet / arrow
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: any[], tileSize: number) {
  for (const p of particles) {
    const alpha = 1 - p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.beginPath();
    ctx.arc(p.x * tileSize, p.y * tileSize, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: any[], tileSize: number) {
  for (const ft of texts) {
    const alpha = 1 - ft.life / ft.maxLife;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x * tileSize, ft.y * tileSize);
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
}
