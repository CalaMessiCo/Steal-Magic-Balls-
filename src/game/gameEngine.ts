import { 
  Player, Lever, Monster, Projectile, Particle, FloatingText, 
  Wall, PasswordGate, PasswordPaper, Weapon, GameVictoryStats, LeverType 
} from '../types/game';
import { generateWorld, MAP_SIZE } from './worldGenerator';
import { SpatialGrid } from '../utils/spatialGrid';
import { sound } from '../utils/audio';
import { WEAPONS } from './weapons';

export class GameEngine {
  public players: Player[] = [];
  public levers: Lever[] = [];
  public walls: Wall[] = [];
  public passwordGate!: PasswordGate;
  public monsters: Monster[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  
  // Spatial grids for ultra-fast queries
  public leverGrid: SpatialGrid<Lever>;
  public wallGrid: SpatialGrid<Wall>;
  
  // Game stats
  public totalPlayersKilled: number = 0;
  public totalBossesKilled: number = 0;
  public isWon: boolean = false;
  
  // User collected papers: map from 'I'|'II'|'III'|'IV'|'V' to digit
  public collectedPapers: Map<string, PasswordPaper> = new Map();
  
  // Monster spawn timer (every 1 second)
  private monsterSpawnTimer: number = 0;
  
  // Time accumulator for oxidation & distant bots
  private globalTimer: number = 0;
  private distantBotIndex: number = 1;

  // Kill feed / event log
  public eventLog: { text: string; time: number; type: 'kill' | 'boss' | 'lever' | 'paper' | 'system' }[] = [];
  public activeMultiKill: { title: string; count: number; bonus: number; timestamp: number } | null = null;

  constructor() {
    this.leverGrid = new SpatialGrid<Lever>(MAP_SIZE, MAP_SIZE, 50);
    this.wallGrid = new SpatialGrid<Wall>(MAP_SIZE, MAP_SIZE, 40);
    this.initGame();
  }

  public initGame() {
    const world = generateWorld();
    this.players = world.players;
    this.levers = world.levers;
    this.walls = world.walls;
    this.passwordGate = world.passwordGate;
    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.totalPlayersKilled = 0;
    this.totalBossesKilled = 0;
    this.isWon = false;
    this.collectedPapers.clear();

    // Rebuild spatial grid for levers & dense defensive walls
    this.rebuildLeverGrid();
    this.rebuildWallGrid();

    // Initial log
    this.addEventLog('Chào mừng đến với Steal Magic Balls! Hãy tranh giành cần gạt và sống sót.', 'system');
    this.addEventLog('Bạn có 5 giây miễn nhiễm sát thương. Nhấn chuột phải vào cần gạt để thu thập Magic Balls.', 'system');
  }

  public rebuildLeverGrid() {
    this.leverGrid.clear();
    for (const lever of this.levers) {
      if (!lever.isDisposed) {
        this.leverGrid.insert(lever);
      }
    }
  }

  public rebuildWallGrid() {
    this.wallGrid.clear();
    for (const wall of this.walls) {
      this.wallGrid.insert(wall);
    }
  }

  public getUserPlayer(): Player {
    return this.players[0];
  }

  public addEventLog(text: string, type: 'kill' | 'boss' | 'lever' | 'paper' | 'system' = 'system') {
    this.eventLog.unshift({ text, time: Date.now(), type });
    if (this.eventLog.length > 30) {
      this.eventLog.pop();
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string = '#facc15') {
    this.floatingTexts.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 1.2
    });
  }

  public addBloodParticles(x: number, y: number, color: string = '#ef4444', count: number = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  // --- ACTIONS & SKILLS ---

  // 1. Right Click or Press F on Lever (User)
  public interactWithLeverAt(targetX?: number, targetY?: number): { success: boolean; message: string } {
    const user = this.getUserPlayer();
    if (user.isDead) return { success: false, message: 'Bạn đang hồi sinh!' };

    // Search around player first (within 5.5 PGrid units)
    let candidateLevers = this.leverGrid.queryRadius(user.x, user.y, 5.5).filter(l => !l.isDisposed);

    // If target coordinates are provided, also query around clicked point
    if (targetX !== undefined && targetY !== undefined) {
      const targetLevers = this.leverGrid.queryRadius(targetX, targetY, 4.0).filter(l => !l.isDisposed);
      for (const tl of targetLevers) {
        if (!candidateLevers.some(c => c.id === tl.id)) {
          if (Math.hypot(tl.x - user.x, tl.y - user.y) <= 6.0) {
            candidateLevers.push(tl);
          }
        }
      }
    }

    if (candidateLevers.length === 0) {
      return { success: false, message: 'Không có cần gạt nào ở gần bạn! Hãy lại gần hơn.' };
    }

    // Sort to prioritize ready levers (cooldownRemaining <= 0) then closest
    candidateLevers.sort((a, b) => {
      const aReady = a.cooldownRemaining <= 0 ? 0 : 1;
      const bReady = b.cooldownRemaining <= 0 ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;
      const distA = Math.hypot(a.x - user.x, a.y - user.y);
      const distB = Math.hypot(b.x - user.x, b.y - user.y);
      return distA - distB;
    });

    const closestLever = candidateLevers[0];
    return this.pullOrCleanLever(user, closestLever);
  }

  public pullOrCleanLever(player: Player, lever: Lever): { success: boolean; message: string } {
    if (lever.isDisposed) {
      return { success: false, message: 'Cần gạt này không còn tồn tại!' };
    }

    // Cooldown check
    if (lever.cooldownRemaining > 0) {
      // If copper lever is on cooldown but heavily oxidized (>= 40%) and player has >= 500 MB, allow cleaning
      if (lever.type === 'copper' && (lever.oxidationPercent || 0) >= 40 && player.magicBalls >= 500) {
        player.magicBalls -= 500;
        lever.oxidationPercent = 0;
        sound.playCleanCopper();
        this.addFloatingText(lever.x, lever.y, 'Làm sạch Cần Đồng! (-500 MB)', '#38bdf8');
        this.addEventLog(`${player.name} đã làm sạch Cần gạt đồng (-500 MB).`, 'lever');
        return { success: true, message: 'Đã làm sạch cần gạt đồng thành công! (-500 Magic Balls)' };
      }

      const waitSec = Math.ceil(lever.cooldownRemaining);
      return { 
        success: false, 
        message: `Cần gạt đang trong thời gian hồi! Cần chờ thêm ${waitSec}s.` 
      };
    }

    // PULL SUCCESSFUL!
    const ballsGained = lever.ballsReward;
    player.magicBalls += ballsGained;
    lever.cooldownRemaining = lever.cooldownDuration; // 120s cooldown

    if (player.isUser) {
      sound.playLeverPull();
      sound.playMagicBallsGain();
    }

    this.addFloatingText(lever.x, lever.y, `+${ballsGained} Magic Balls!`, '#fbbf24');
    
    // Special behavior for Gold lever: disappears immediately!
    if (lever.type === 'gold') {
      lever.isDisposed = true;
      this.addEventLog(`${player.name} đã gạt Cần Vàng (+200 MB)! Cần vàng đã biến mất!`, 'lever');
      this.rebuildLeverGrid();
    } else {
      this.addEventLog(`${player.name} gạt ${this.getLeverTypeName(lever.type)} (+${ballsGained} MB)`, 'lever');
    }

    return { success: true, message: `Gạt thành công! Nhận được +${ballsGained} Magic Balls.` };
  }

  public getLeverTypeName(type: LeverType): string {
    switch (type) {
      case 'wood': return 'Cần Gỗ';
      case 'stone': return 'Cần Đá';
      case 'copper': return 'Cần Đồng';
      case 'iron': return 'Cần Sắt';
      case 'gold': return 'Cần Vàng';
      case 'diamond': return 'Cần Kim Cương';
      case 'ultimate': return 'Cần Tối Thượng';
      case 'crafted': return 'Cần Tự Tạo';
    }
  }

  // 2. Cast "Hồn Trảm" (Soul Slash) - Costs 500 Magic Balls
  public castSoulSlash(source: Player, targetAngle: number): boolean {
    if (source.isDead) return false;
    if (source.magicBalls < 500) {
      if (source.isUser) this.addFloatingText(source.x, source.y, 'Cần 500 Magic Balls!', '#ef4444');
      return false;
    }

    source.magicBalls -= 500;
    source.soulSlashCooldown = 0.5;

    // Fire crescent wave projectile
    const speed = 18;
    this.projectiles.push({
      id: Math.random().toString(),
      x: source.x,
      y: source.y,
      vx: Math.cos(targetAngle) * speed,
      vy: Math.sin(targetAngle) * speed,
      damage: 120, // massive damage
      rangeRemaining: 15,
      sourceId: source.id,
      isUser: source.isUser,
      isSoulSlash: true,
      color: '#06b6d4',
      radius: 1.8
    });

    if (source.isUser) {
      sound.playSoulSlash();
    }

    this.addFloatingText(source.x, source.y, 'HỒN TRẢM! (-500 MB)', '#06b6d4');
    return true;
  }

  // 3. Equip "Hồn Hồi" - Costs 650 Magic Balls
  // Rule: "Hồn Hồi là khi bị sát thương của Hồn Trảm, nó sẽ giúp chúng ta không chết. nhưng sẽ không còn Hồn Hồi nữa. giá nó sửa thành 650 Magic Balls."
  public castSoulHeal(source: Player): boolean {
    if (source.isDead) return false;
    if (source.hasSoulHeal) {
      if (source.isUser) this.addFloatingText(source.x, source.y, 'ĐÃ CÓ HỒN HỒI BẢO HỘ!', '#22c55e');
      return false;
    }
    if (source.magicBalls < 650) {
      if (source.isUser) this.addFloatingText(source.x, source.y, 'Cần 650 Magic Balls!', '#ef4444');
      return false;
    }

    source.magicBalls -= 650;
    source.hasSoulHeal = true;
    source.soulHealCooldown = 0.5;

    if (source.isUser) {
      sound.playSoulHeal();
    }

    this.addFloatingText(source.x, source.y, 'KÍCH HOẠT HỒN HỒI (-650 MB)!', '#22c55e');
    this.addBloodParticles(source.x, source.y, '#22c55e', 12);
    this.addEventLog(`${source.name} đã trang bị Hồn Hồi (-650 MB, bảo vệ sống sót khi trúng Hồn Trảm).`, 'system');
    return true;
  }

  // 4. Craft Lever - Costs 2500 Magic Balls
  public craftLever(source: Player): boolean {
    if (source.isDead) return false;
    if (source.magicBalls < 2500) {
      if (source.isUser) this.addFloatingText(source.x, source.y, 'Cần 2500 Magic Balls!', '#ef4444');
      return false;
    }

    source.magicBalls -= 2500;

    const newLever: Lever = {
      id: `crafted_${Date.now()}_${Math.random()}`,
      x: source.x,
      y: source.y,
      type: 'crafted',
      ballsReward: 25,
      cooldownRemaining: 0,
      cooldownDuration: 120,
      isCrafted: true,
      craftedHitsRemaining: 2 // takes 2 hits from Hồn Trảm to break
    };

    this.levers.push(newLever);
    this.leverGrid.insert(newLever);

    if (source.isUser) {
      sound.playCraftLever();
    }

    this.addFloatingText(source.x, source.y, 'TẠO CẦN GẠT THÀNH CÔNG! (-2500 MB)', '#a855f7');
    this.addEventLog(`${source.name} đã tạo một Cần gạt tự tạo (+25 MB/lần gạt).`, 'lever');
    return true;
  }

  // 5. Cast Shield Skill - Costs 650 Magic Balls (5 seconds invulnerability)
  public castShield(source: Player): boolean {
    if (source.isDead) return false;
    if (source.magicBalls < 650) {
      if (source.isUser) this.addFloatingText(source.x, source.y, 'Cần 650 Magic Balls!', '#ef4444');
      return false;
    }

    source.magicBalls -= 650;
    source.shieldTimeRemaining = 5.0; // 5s invulnerability shield
    source.shieldSkillCooldown = 0.5;

    if (source.isUser) {
      sound.playShield();
    }

    this.addFloatingText(source.x, source.y, 'KHIÊN THẦN 5S! (-650 MB)', '#06b6d4');
    this.addBloodParticles(source.x, source.y, '#38bdf8', 12);
    this.addEventLog(`${source.name} kích hoạt Khiên Thần 5 giây (-650 MB).`, 'system');
    return true;
  }

  // 6. Weapon Attack (Special Fists Instant Damage & Distance Scaling)
  // Helper: Check if line of sight is blocked by a defensive wall
  public isLineBlockedByWall(x1: number, y1: number, x2: number, y2: number): boolean {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const radius = Math.hypot(x2 - x1, y2 - y1) / 2 + 3;
    const nearbyWalls = this.wallGrid.queryRadius(midX, midY, radius);

    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(3, Math.ceil(dist / 1.5));
    for (let s = 1; s < steps; s++) {
      const sx = x1 + ((x2 - x1) * s) / steps;
      const sy = y1 + ((y2 - y1) * s) / steps;
      for (const wall of nearbyWalls) {
        if (
          sx >= wall.x &&
          sx <= wall.x + wall.width &&
          sy >= wall.y &&
          sy <= wall.y + wall.height
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // 6. Unified Weapon Attack (All weapons can hit at range; closer = stronger damage, like fists)
  public attackWithEquippedWeapon(
    source: Player, 
    targetAngle: number, 
    targetWorldX?: number, 
    targetWorldY?: number
  ): boolean {
    if (source.isDead || source.attackCooldown > 0) return false;
    const weapon = source.equippedWeapon;
    source.attackCooldown = weapon.cooldown;

    if (source.isUser) {
      sound.playHit();
    }

    let target: Player | Monster | null = null;
    let minClickDist = Infinity;

    // 1. Direct cursor click target search (within 3.5 PGrid of click point)
    if (source.isUser && targetWorldX !== undefined && targetWorldY !== undefined) {
      for (const m of this.monsters) {
        if (m.isDead) continue;
        const d = Math.hypot(m.x - targetWorldX, m.y - targetWorldY);
        if (d <= 3.5 + m.size / 2 && d < minClickDist) {
          if (!this.isLineBlockedByWall(source.x, source.y, m.x, m.y)) {
            minClickDist = d;
            target = m;
          }
        }
      }

      for (const p of this.players) {
        if (p.isDead || p.id === source.id || p.shieldTimeRemaining > 0) continue;
        const d = Math.hypot(p.x - targetWorldX, p.y - targetWorldY);
        if (d <= 3.0 + p.size / 2 && d < minClickDist) {
          if (!this.isLineBlockedByWall(source.x, source.y, p.x, p.y)) {
            minClickDist = d;
            target = p;
          }
        }
      }
    }

    // 2. Cone target search in direction of aim
    if (!target) {
      let closestDist = Infinity;
      const maxSearchRange = Math.max(25, weapon.range || 25);

      for (const m of this.monsters) {
        if (m.isDead) continue;
        const dx = m.x - source.x;
        const dy = m.y - source.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxSearchRange) continue;
        const angle = Math.atan2(dy, dx);
        let diff = Math.abs(angle - targetAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        if (Math.abs(diff) < Math.PI / 4 && dist < closestDist) {
          if (!this.isLineBlockedByWall(source.x, source.y, m.x, m.y)) {
            closestDist = dist;
            target = m;
          }
        }
      }

      for (const p of this.players) {
        if (p.isDead || p.id === source.id || p.shieldTimeRemaining > 0) continue;
        const dx = p.x - source.x;
        const dy = p.y - source.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxSearchRange) continue;
        const angle = Math.atan2(dy, dx);
        let diff = Math.abs(angle - targetAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        if (Math.abs(diff) < Math.PI / 4 && dist < closestDist) {
          if (!this.isLineBlockedByWall(source.x, source.y, p.x, p.y)) {
            closestDist = dist;
            target = p;
          }
        }
      }
    }

    // 3. Proximity-scaled damage calculation:
    // Càng lại gần sát thương càng cao (áp sát <= 2.2 PGrid đạt 100% max damage, càng xa càng giảm xuống tối thiểu 28%)
    if (target) {
      const dist = Math.hypot(target.x - source.x, target.y - source.y);
      const minDamage = Math.max(3, Math.round(weapon.damage * 0.28));
      const maxDist = Math.max(25, weapon.range || 25);
      const falloff = Math.min(1.0, Math.max(0, (dist - 2.2) / (maxDist - 2.2)));
      const damage = Math.max(minDamage, Math.round(weapon.damage - (weapon.damage - minDamage) * falloff));

      // Visual tracer particles along beam/strike path
      const steps = Math.min(8, Math.max(2, Math.floor(dist)));
      for (let s = 1; s <= steps; s++) {
        const px = source.x + ((target.x - source.x) * s) / steps;
        const py = source.y + ((target.y - source.y) * s) / steps;
        this.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 0,
          maxLife: 0.18,
          color: weapon.color,
          size: weapon.isRanged ? 2.5 : 3.5,
        });
      }

      if ('isBoss' in target) {
        this.damageMonster(target as Monster, damage, source);
      } else {
        this.damagePlayer(target as Player, damage, source);
      }

      this.addBloodParticles(target.x, target.y, weapon.color, 5);
      this.addFloatingText(target.x, target.y, `${weapon.icon} -${damage}`, '#fbbf24');
      return true;
    }

    return false;
  }

  // 7. Chiêu Thức Đặc Biệt Của Vũ Khí Tầm Xa (Special Weapon Skill [X])
  public castWeaponSpecialSkill(
    source: Player,
    aimAngle: number,
    targetWorldX?: number,
    targetWorldY?: number
  ): boolean {
    if (source.isDead) return false;
    const weapon = source.equippedWeapon;
    if (!weapon.isRanged || !weapon.specialSkillName) {
      if (source.isUser) {
        this.addFloatingText(source.x, source.y, 'Chỉ vũ khí tầm xa mới có chiêu đặc biệt!', '#94a3b8');
      }
      return false;
    }

    if (source.weaponSkillCooldown && source.weaponSkillCooldown > 0) {
      if (source.isUser) {
        this.addFloatingText(source.x, source.y, `Đang hồi chiêu (${source.weaponSkillCooldown.toFixed(1)}s)!`, '#f59e0b');
      }
      return false;
    }

    source.weaponSkillCooldown = weapon.specialCooldown || 5.0;

    if (source.isUser) {
      sound.playSoulSlash();
    }

    if (weapon.id === 'pistol') {
      // 1. Súng Lục: Bão Đạn Xung Kích (7 viên đạn ma thuật tỏa quạt)
      this.addFloatingText(source.x, source.y, '🔫 BÃO ĐẠN XUNG KÍCH!', '#f59e0b');
      this.addEventLog(`${source.name} thi triển [Bão Đạn Xung Kích]!`, 'system');
      const count = 7;
      const spread = 0.55;
      for (let i = 0; i < count; i++) {
        const offset = -spread / 2 + (spread * i) / (count - 1);
        const bulletAngle = aimAngle + offset;
        const speed = (weapon.projectileSpeed || 24) * (0.9 + Math.random() * 0.2);
        this.projectiles.push({
          id: Math.random().toString(),
          x: source.x,
          y: source.y,
          vx: Math.cos(bulletAngle) * speed,
          vy: Math.sin(bulletAngle) * speed,
          damage: weapon.damage,
          rangeRemaining: 28,
          sourceId: source.id,
          isUser: source.isUser,
          isSoulSlash: false,
          color: '#fbbf24',
          radius: 0.7,
          isSpecialSkill: true
        });
      }
    } else if (weapon.id === 'divine_bow') {
      // 2. Cung Thần: Mũi Tên Sao Băng (Xuyên qua mọi tường thành và kẻ thù)
      this.addFloatingText(source.x, source.y, '🏹 MŨI TÊN SAO BĂNG!', '#10b981');
      this.addEventLog(`${source.name} bắn [Mũi Tên Sao Băng] xuyên phá mọi tường thành!`, 'system');
      const speed = 32;
      this.projectiles.push({
        id: Math.random().toString(),
        x: source.x,
        y: source.y,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        damage: Math.round(weapon.damage * 1.5), // 135 damage
        rangeRemaining: 40,
        sourceId: source.id,
        isUser: source.isUser,
        isSoulSlash: false,
        color: '#34d399',
        radius: 1.4,
        isSpecialSkill: true,
        piercesWalls: true
      });
    } else if (weapon.id === 'thunder_staff') {
      // 3. Pháp Trượng Sấm Sét: Thiên Lôi Chuỗi Giật (Lan truyền sấm sét qua nhiều mục tiêu)
      this.addFloatingText(source.x, source.y, '⚡ THIÊN LÔI CHUỖI GIẬT!', '#a855f7');
      this.addEventLog(`${source.name} triệu hồi [Thiên Lôi Chuỗi Giật]!`, 'system');

      let firstTarget: Player | Monster | null = null;
      let minTargetDist = 25;
      for (const m of this.monsters) {
        if (m.isDead) continue;
        const d = Math.hypot(m.x - source.x, m.y - source.y);
        if (d < minTargetDist) {
          minTargetDist = d;
          firstTarget = m;
        }
      }
      for (const p of this.players) {
        if (p.isDead || p.id === source.id || p.shieldTimeRemaining > 0) continue;
        const d = Math.hypot(p.x - source.x, p.y - source.y);
        if (d < minTargetDist) {
          minTargetDist = d;
          firstTarget = p;
        }
      }

      if (firstTarget) {
        if ('isBoss' in firstTarget) this.damageMonster(firstTarget as Monster, 140, source);
        else this.damagePlayer(firstTarget as Player, 140, source);
        this.addBloodParticles(firstTarget.x, firstTarget.y, '#c084fc', 14);

        let chainedCount = 0;
        for (const p of this.players) {
          if (chainedCount >= 5) break;
          if (p.isDead || p.id === source.id || p.id === firstTarget.id || p.shieldTimeRemaining > 0) continue;
          const d = Math.hypot(p.x - firstTarget.x, p.y - firstTarget.y);
          if (d <= 15) {
            chainedCount++;
            this.damagePlayer(p, 100, source);
            this.addBloodParticles(p.x, p.y, '#c084fc', 8);
            this.addFloatingText(p.x, p.y, '⚡ -100 (Sét chuỗi)', '#c084fc');
          }
        }
        for (const m of this.monsters) {
          if (chainedCount >= 5) break;
          if (m.isDead || m.id === firstTarget.id) continue;
          const d = Math.hypot(m.x - firstTarget.x, m.y - firstTarget.y);
          if (d <= 15) {
            chainedCount++;
            this.damageMonster(m, 100, source);
            this.addBloodParticles(m.x, m.y, '#c084fc', 8);
            this.addFloatingText(m.x, m.y, '⚡ -100', '#c084fc');
          }
        }
      } else {
        const speed = 30;
        this.projectiles.push({
          id: Math.random().toString(),
          x: source.x,
          y: source.y,
          vx: Math.cos(aimAngle) * speed,
          vy: Math.sin(aimAngle) * speed,
          damage: 140,
          rangeRemaining: 26,
          sourceId: source.id,
          isUser: source.isUser,
          isSoulSlash: false,
          color: '#c084fc',
          radius: 1.0,
          isSpecialSkill: true
        });
      }
    } else if (weapon.id === 'void_scepter') {
      // 4. Trượng Hư Không: Hố Đen Hư Vô (Cosmic Black Hole)
      this.addFloatingText(source.x, source.y, '🔮 HỐ ĐEN HƯ VÔ!', '#ec4899');
      this.addEventLog(`${source.name} triệu hồi [Hố Đen Hư Vô] tối thượng!`, 'system');
      const speed = 14;
      this.projectiles.push({
        id: Math.random().toString(),
        x: source.x,
        y: source.y,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        damage: 350,
        rangeRemaining: 28,
        sourceId: source.id,
        isUser: source.isUser,
        isSoulSlash: false,
        color: '#ec4899',
        radius: 2.2,
        isSpecialSkill: true
      });
    }

    return true;
  }

  // Damage Player
  public damagePlayer(
    victim: Player, 
    amount: number, 
    attacker?: Player | Monster,
    isSoulSlash: boolean = false
  ) {
    if (victim.isDead || victim.shieldTimeRemaining > 0) return;

    // HỒN HỒI DEATH-DEFY MECHANIC:
    // "Hồn Hồi là khi bị sát thương của Hồn Trảm, nó sẽ giúp chúng ta không chết. nhưng sẽ không còn Hồn Hồi nữa."
    if (isSoulSlash && victim.hasSoulHeal) {
      victim.hasSoulHeal = false; // Consumed!
      if (victim.hp - amount <= 0) {
        victim.hp = 50; // Saved from death!
      } else {
        victim.hp = Math.max(25, victim.hp - amount);
      }
      this.addBloodParticles(victim.x, victim.y, '#22c55e', 14);
      this.addFloatingText(victim.x, victim.y, '✨ HỒN HỒI CỨU MẠNG!', '#22c55e');
      sound.playSoulHeal();
      this.addEventLog(`✨ Hồn Hồi đã bảo vệ ${victim.name} không chết trước đòn Hồn Trảm!`, 'system');

      if (!victim.isUser && attacker && 'isUser' in attacker && attacker.id !== victim.id) {
        victim.aggroTargetId = attacker.id;
      }
      return;
    }

    victim.hp -= amount;
    this.addBloodParticles(victim.x, victim.y, victim.color, 4);
    this.addFloatingText(victim.x, victim.y, `-${Math.round(amount)}`, '#ef4444');

    // BOT RETALIATION: If victim is a bot and attacker is another player, bot aggros onto attacker!
    if (!victim.isUser && attacker && 'isUser' in attacker && attacker.id !== victim.id) {
      victim.aggroTargetId = attacker.id;
    }

    if (victim.isUser) {
      sound.playHit();
    }

    if (victim.hp <= 0) {
      this.killPlayer(victim, attacker);
    }
  }

  // Kill Player (Normal death - allows respawn with 750 MB penalty if >= 750 MB)
  public killPlayer(victim: Player, killer?: Player | Monster) {
    if (victim.isDead || victim.isPermanentlyDead) return;
    victim.isDead = true;
    victim.hp = 0;
    victim.aggroTargetId = undefined;

    // Penalty: Only players with >= 750 Magic Balls lose 750 MB when dying
    let lostBalls = 0;
    if (victim.magicBalls >= 750) {
      victim.magicBalls -= 750;
      lostBalls = 750;
    }

    this.totalPlayersKilled++;

    if (victim.isUser) {
      sound.playDeath();
      if (lostBalls > 0) {
        this.addFloatingText(victim.x, victim.y, `BẠN ĐÃ CHẾT! MẤT ${lostBalls} MB`, '#ef4444');
      } else {
        this.addFloatingText(victim.x, victim.y, 'BẠN ĐÃ CHẾT! (<750 MB: Không bị trừ)', '#f59e0b');
      }
    }

    this.addBloodParticles(victim.x, victim.y, '#991b1b', 16);

    // Reward killer if killer is a player
    if (killer && 'isUser' in killer) {
      killer.magicBalls += 50; // Killing player awards 50 Magic Balls
      killer.kills++;
      this.addFloatingText(killer.x, killer.y, '+50 MB (Hạ Người Chơi)', '#fbbf24');

      // MULTI-KILL STREAK LOGIC (within <= 1.0 second between consecutive player kills, not monsters)
      if (killer.isUser && !victim.isUser) {
        const now = performance.now() / 1000;
        const timeSinceLast = killer.lastPlayerKillTime ? (now - killer.lastPlayerKillTime) : 999;
        
        if (timeSinceLast <= 1.0) {
          killer.multiKillCount = (killer.multiKillCount || 1) + 1;
        } else {
          killer.multiKillCount = 1;
        }
        killer.lastPlayerKillTime = now;

        if (killer.multiKillCount === 2) {
          killer.magicBalls += 50;
          sound.playMultiKill(2);
          this.activeMultiKill = { title: 'DOUBLE KILL!', count: 2, bonus: 50, timestamp: now };
          this.addEventLog('🔥 DOUBLE KILL! Tiêu diệt liên tiếp 2 người chơi trong 1s (+50 MB)!', 'kill');
          this.addFloatingText(killer.x, killer.y - 1.5, '🔥 DOUBLE KILL! +50 MB', '#f59e0b');
        } else if (killer.multiKillCount === 3) {
          killer.magicBalls += 100;
          sound.playMultiKill(3);
          this.activeMultiKill = { title: 'TRIPLE KILL!', count: 3, bonus: 100, timestamp: now };
          this.addEventLog('⚡ TRIPLE KILL! Tiêu diệt 3 người chơi trong 1s (+100 MB)!', 'kill');
          this.addFloatingText(killer.x, killer.y - 1.5, '⚡ TRIPLE KILL! +100 MB', '#38bdf8');
        } else if (killer.multiKillCount === 4) {
          killer.magicBalls += 150;
          sound.playMultiKill(4);
          this.activeMultiKill = { title: 'QUADRA KILL!', count: 4, bonus: 150, timestamp: now };
          this.addEventLog('💥 QUADRA KILL! Tiêu diệt 4 người chơi trong 1s (+150 MB)!', 'kill');
          this.addFloatingText(killer.x, killer.y - 1.5, '💥 QUADRA KILL! +150 MB', '#ec4899');
        } else if (killer.multiKillCount >= 5) {
          killer.magicBalls += 200;
          sound.playMultiKill(5);
          this.activeMultiKill = { title: 'MEGA KILL!', count: killer.multiKillCount, bonus: 200, timestamp: now };
          this.addEventLog(`👑 MEGA KILL (${killer.multiKillCount})! Chuỗi hạ gục thần thánh (+200 MB)!`, 'kill');
          this.addFloatingText(killer.x, killer.y - 1.5, '👑 MEGA KILL! +200 MB', '#a855f7');
        }
      }
      
      this.addEventLog(`${killer.name} đã tiêu diệt ${victim.name} (+50 MB)`, 'kill');
    } else {
      this.addEventLog(`${victim.name} đã bị hạ gục!`, 'kill');
    }

    // Schedule respawn after 2 seconds only if not permanently dead
    setTimeout(() => {
      if (!victim.isPermanentlyDead) {
        this.respawnPlayer(victim);
      }
    }, 2000);
  }

  // Permanent elimination due to inactivity (score unchanged for 2 minutes)
  // "chỉ có không thay đổi điểm mới làm cho chết hoàn toàn. user thì cũng bị tiêu diệt, không thể hồi sinh. user lúc này chỉ có Shadowing Mode thôi: có thể nhìn các người chơi bot nhưng không thể điều khiển họ"
  public eliminatePlayerPermanently(player: Player) {
    if (player.isPermanentlyDead) return;
    player.isDead = true;
    player.isPermanentlyDead = true;
    player.hp = 0;
    this.totalPlayersKilled++;

    this.addBloodParticles(player.x, player.y, '#991b1b', 24);

    if (player.isUser) {
      sound.playDeath();
      this.addFloatingText(player.x, player.y, 'BỊ HỦY DIỆT VĨNH VIỄN DO BẤT ĐỘNG 2 PHÚT!', '#ef4444');
      this.addEventLog('☠️ Điểm không đổi trong 2 phút: Bạn đã bị TIÊU DIỆT HOÀN TOÀN (Không thể hồi sinh). Kích hoạt Shadowing Mode để quan sát các bot.', 'kill');
    } else {
      this.addEventLog(`${player.name} bị tiêu diệt vĩnh viễn (không đổi điểm trong 2 phút).`, 'kill');
    }
    // Never respawns!
  }

  // Instant kill when touching map edge
  public checkMapEdgeBoundary(player: Player) {
    if (player.isDead) return;

    if (player.x <= 1.0 || player.x >= MAP_SIZE - 1.0 || player.y <= 1.0 || player.y >= MAP_SIZE - 1.0) {
      if (player.isUser) {
        this.addEventLog('Bạn chạm phải ranh giới tận cùng thế giới và bị hủy diệt tức thì!', 'system');
      }
      this.killPlayer(player);
    }
  }

  // Respawn Player with 5-second immunity shield
  public respawnPlayer(player: Player) {
    player.isDead = false;
    player.hp = player.maxHp;
    player.shieldTimeRemaining = 5.0; // 5 seconds invulnerability!
    player.regenTimer = 0;

    if (player.isUser) {
      // Respawn near center or safe sanctuary
      player.x = 1250 + (Math.random() * 20 - 10);
      player.y = 1270 + (Math.random() * 20 - 10);
      this.addEventLog('Bạn đã hồi sinh! Nhận Khiên Miễn Nhiễm trong 5 giây.', 'system');
      this.addFloatingText(player.x, player.y, 'HỒI SINH! KHIÊN 5S', '#38bdf8');
    } else {
      // Bots spawn safely away from edge
      player.x = 100 + Math.random() * (MAP_SIZE - 200);
      player.y = 100 + Math.random() * (MAP_SIZE - 200);
    }
  }

  // Damage Monster
  public damageMonster(monster: Monster, amount: number, attacker?: Player) {
    if (monster.isDead) return;

    monster.hp -= amount;
    this.addBloodParticles(monster.x, monster.y, monster.isBoss ? '#7c3aed' : '#dc2626', monster.isBoss ? 8 : 4);
    this.addFloatingText(monster.x, monster.y, `-${Math.round(amount)}`, monster.isBoss ? '#c084fc' : '#f87171');

    if (monster.hp <= 0) {
      this.killMonster(monster, attacker);
    }
  }

  // Kill Monster
  public killMonster(monster: Monster, killer?: Player) {
    if (monster.isDead) return;
    monster.isDead = true;

    if (monster.isBoss) {
      this.totalBossesKilled++;
      this.addEventLog(`BOSS ĐÃ BỊ HẠ GỤC BỞI ${killer?.name || 'Chiến Binh'}!`, 'boss');
      sound.playBossRoar();
      if (killer) {
        killer.magicBalls += 500;
        this.addFloatingText(killer.x, killer.y, '+500 MB (Diệt BOSS)', '#f59e0b');
      }
    } else {
      if (killer) {
        killer.magicBalls += 30; // Kill monster gives 30 Magic Balls
        this.addFloatingText(killer.x, killer.y, '+30 MB', '#fbbf24');
      }
    }

    this.addBloodParticles(monster.x, monster.y, monster.isBoss ? '#9333ea' : '#ef4444', 20);

    // Remove from active monster list
    this.monsters = this.monsters.filter(m => m.id !== monster.id);
  }

  // Spawn Monster (every 1 second)
  public spawnMonster() {
    // 0.1% chance for BOSS (1 in 1000)
    // To ensure exciting gameplay without waiting 1000s, boss also spawns if no boss exists after 60s
    const isBoss = Math.random() < 0.001 || (this.monsters.filter(m => m.isBoss).length === 0 && Math.random() < 0.02);

    const user = this.getUserPlayer();
    // Spawn monster at random position or around active players
    let mx = 60 + Math.random() * (MAP_SIZE - 120);
    let my = 60 + Math.random() * (MAP_SIZE - 120);

    // 40% chance to spawn in broader vicinity of user (e.g. 50-90 units away)
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 50;
      mx = Math.max(30, Math.min(MAP_SIZE - 30, user.x + Math.cos(angle) * dist));
      my = Math.max(30, Math.min(MAP_SIZE - 30, user.y + Math.sin(angle) * dist));
    }

    if (isBoss) {
      const boss: Monster = {
        id: `boss_${Date.now()}`,
        x: mx,
        y: my,
        vx: 0,
        vy: 0,
        size: 3, // 3x3 PGrid for BOSS
        hp: 2000,
        maxHp: 2000,
        isDead: false,
        isBoss: true,
        damage: 45,
        attackCooldown: 0,
        speed: 3.2,
        rewardBalls: 500,
        specialAttackTimer: 4.0,
      };
      this.monsters.push(boss);
      this.addEventLog(`⚠️ MỘT CON BOSS MA THUẬT VỪA XUẤT HIỆN TẠI TỌA ĐỘ (${Math.round(mx)}, ${Math.round(my)})!`, 'boss');
      sound.playBossRoar();
    } else {
      const normalMonster: Monster = {
        id: `monster_${Date.now()}_${Math.random()}`,
        x: mx,
        y: my,
        vx: 0,
        vy: 0,
        size: 1, // 1x1 PGrid (same size as player)
        hp: 120,
        maxHp: 120,
        isDead: false,
        isBoss: false,
        damage: 18,
        attackCooldown: 0,
        speed: 4.5,
        rewardBalls: 30,
      };
      this.monsters.push(normalMonster);
    }

    // Keep monster count managed (cap at 120 max active monsters for performance)
    if (this.monsters.length > 120) {
      // Remove furthest normal monster from user
      let furthestIdx = -1;
      let maxDist = -1;
      for (let i = 0; i < this.monsters.length; i++) {
        if (this.monsters[i].isBoss) continue;
        const d = Math.hypot(this.monsters[i].x - user.x, this.monsters[i].y - user.y);
        if (d > maxDist) {
          maxDist = d;
          furthestIdx = i;
        }
      }
      if (furthestIdx >= 0) {
        this.monsters.splice(furthestIdx, 1);
      }
    }
  }

  // Hit crafted lever with Soul Slash
  public hitCraftedLever(lever: Lever, attacker: Player) {
    if (!lever.isCrafted || lever.isDisposed) return;
    
    lever.craftedHitsRemaining = (lever.craftedHitsRemaining || 2) - 1;
    this.addFloatingText(lever.x, lever.y, `Đòn chém trúng Cần Gạt! (${lever.craftedHitsRemaining}/2)`, '#f59e0b');

    if (lever.craftedHitsRemaining <= 0) {
      // Break lever!
      lever.isDisposed = true;
      this.addBloodParticles(lever.x, lever.y, '#eab308', 20);
      
      // Destroyer gets 500 Magic Balls!
      attacker.magicBalls += 500;
      this.addFloatingText(lever.x, lever.y, '+500 MB (Phá Cần Gạt Tự Tạo)!', '#fbbf24');
      this.addEventLog(`${attacker.name} đã phá hủy Cần gạt tự tạo (+500 MB)!`, 'lever');

      // 5% chance to drop Password Paper
      const roll = Math.random();
      if (roll < 0.05 || this.collectedPapers.size === 0) { // guarantee at least first one or 5%
        const romans: ('I' | 'II' | 'III' | 'IV' | 'V')[] = ['I', 'II', 'III', 'IV', 'V'];
        // Pick missing Roman numeral or random
        const missing = romans.filter(r => !this.collectedPapers.has(r));
        const chosenRoman = missing.length > 0 
          ? missing[Math.floor(Math.random() * missing.length)] 
          : romans[Math.floor(Math.random() * romans.length)];
        
        const digit = this.passwordGate.requiredCode[chosenRoman];
        const paper: PasswordPaper = {
          roman: chosenRoman,
          digit,
          collectedAt: Date.now()
        };

        this.collectedPapers.set(chosenRoman, paper);
        sound.playPaperFound();
        this.addEventLog(`📜 TÌM THẤY TỜ GIẤY MẬT KHẨU: [${chosenRoman}]: ${digit}!`, 'paper');
        this.addFloatingText(lever.x, lever.y, `📜 MẬT KHẨU [${chosenRoman}]: ${digit}`, '#a855f7');
      }

      this.rebuildLeverGrid();
    }
  }

  // Verify victory conditions at Password Gate
  public verifyPassword(inputCode: { [key in 'I' | 'II' | 'III' | 'IV' | 'V']: number }): {
    codeMatches: boolean;
    stats: GameVictoryStats;
    message: string;
  } {
    const required = this.passwordGate.requiredCode;
    const isMatch = 
      inputCode.I === required.I &&
      inputCode.II === required.II &&
      inputCode.III === required.III &&
      inputCode.IV === required.IV &&
      inputCode.V === required.V;

    const hasPlayerWith20k = this.players.some(p => p.magicBalls >= 20000);
    const stats: GameVictoryStats = {
      playersKilled: this.totalPlayersKilled,
      hasPlayerWith20kBalls: hasPlayerWith20k,
      bossesKilled: this.totalBossesKilled,
      isWon: false,
    };

    if (!isMatch) {
      return {
        codeMatches: false,
        stats,
        message: 'Mật khẩu sai! Vui lòng kiểm tra lại 5 ký tự [I] đến [V].'
      };
    }

    // Code matches! Now check the 3 conditions:
    // 1) >= 500 players killed
    // 2) At least 1 player has >= 20000 MB
    // 3) At least 1 BOSS killed
    const cond1 = this.totalPlayersKilled >= 500;
    const cond2 = hasPlayerWith20k;
    const cond3 = this.totalBossesKilled >= 1;

    if (cond1 && cond2 && cond3) {
      this.isWon = true;
      stats.isWon = true;
      sound.playVictoryFanfare();
      this.addEventLog('🎉 CHÚC MỪNG BẠN ĐÃ CHIẾN THẮNG TRÒ CHƠI STEAL MAGIC BALLS!', 'system');
      return {
        codeMatches: true,
        stats,
        message: 'XÁC NHẬN MẬT KHẨU CHÍNH XÁC VÀ ĐẠT TẤT CẢ ĐIỀU KIỆN! CHIẾN THẮNG!'
      };
    }

    const missingList: string[] = [];
    if (!cond1) missingList.push(`Cần ít nhất 500 người chơi bị tiêu diệt (Hiện tại: ${this.totalPlayersKilled}/500)`);
    if (!cond2) missingList.push(`Cần ít nhất 1 người chơi có trên 20.000 Magic Balls (Cao nhất hiện tại: ${Math.max(...this.players.map(p => p.magicBalls))}/20.000)`);
    if (!cond3) missingList.push(`Cần tiêu diệt ít nhất 1 BOSS (Hiện tại: ${this.totalBossesKilled}/1)`);

    return {
      codeMatches: true,
      stats,
      message: `Mật mã chính xác! Nhưng chưa đủ điều kiện chiến thắng:\n- ${missingList.join('\n- ')}`
    };
  }

  // MAIN UPDATE LOOP (dt in seconds)
  public update(dt: number, input: { up: boolean; down: boolean; left: boolean; right: boolean; shift?: boolean; aimAngle: number }) {
    this.globalTimer += dt;

    // Clear active multi-kill banner after 2.5 seconds
    if (this.activeMultiKill && (performance.now() / 1000) - this.activeMultiKill.timestamp > 2.5) {
      this.activeMultiKill = null;
    }

    // 1. Update Monster Spawn (every 10 seconds as requested)
    this.monsterSpawnTimer += dt;
    if (this.monsterSpawnTimer >= 10.0) {
      this.monsterSpawnTimer = 0;
      this.spawnMonster();
    }

    // 2. Update User Player
    const user = this.getUserPlayer();

    // SHADOWING MODE: If permanently dead (due to 2-min inactivity), user can move camera freely to spectate
    if (user.isPermanentlyDead) {
      let dx = 0;
      let dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx /= Math.SQRT2;
        dy /= Math.SQRT2;
      }
      const ghostSpeed = 16.0; // Spectator ghost speed
      user.x = Math.max(15, Math.min(MAP_SIZE - 15, user.x + dx * ghostSpeed * dt));
      user.y = Math.max(15, Math.min(MAP_SIZE - 15, user.y + dy * ghostSpeed * dt));
    } else if (!user.isDead) {
      // INACTIVITY CHECK: If score doesn't change in 2 minutes (120s), eliminated permanently!
      if (user.lastScore === undefined) {
        user.lastScore = user.magicBalls;
        user.timeSinceScoreChange = 0;
      }
      if (user.magicBalls !== user.lastScore) {
        user.lastScore = user.magicBalls;
        user.timeSinceScoreChange = 0;
      } else {
        user.timeSinceScoreChange = (user.timeSinceScoreChange || 0) + dt;
        if (user.timeSinceScoreChange >= 120.0) {
          this.eliminatePlayerPermanently(user);
        }
      }

      let dx = 0;
      let dy = 0;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;

      if (dx !== 0 && dy !== 0) {
        const len = Math.SQRT2;
        dx /= len;
        dy /= len;
      }

      // SPRINT MECHANIC: Hold Shift to sprint; costs 5 Magic Balls every 5 seconds
      let speed = 7.5;
      const isMoving = dx !== 0 || dy !== 0;
      if (input.shift && isMoving && user.magicBalls >= 5) {
        speed = 12.0; // Fast sprint!
        user.isSprinting = true;
        user.sprintDuration = (user.sprintDuration || 0) + dt;
        if (user.sprintDuration >= 5.0) {
          user.sprintDuration -= 5.0;
          user.magicBalls = Math.max(0, user.magicBalls - 5);
          this.addFloatingText(user.x, user.y, '-5 MB (Chạy nhanh)', '#f59e0b');
        }
      } else {
        user.isSprinting = false;
        if (!input.shift || !isMoving) {
          user.sprintDuration = 0;
        }
      }

      user.x += dx * speed * dt;
      user.y += dy * speed * dt;

      // Wall collisions
      this.resolveWallCollisions(user);

      // Map boundary check: touching edge = INSTANT DEATH!
      this.checkMapEdgeBoundary(user);

      // Decrement timers
      if (user.shieldTimeRemaining > 0) {
        user.shieldTimeRemaining = Math.max(0, user.shieldTimeRemaining - dt);
      }
      if (user.attackCooldown > 0) user.attackCooldown = Math.max(0, user.attackCooldown - dt);
      if (user.soulSlashCooldown > 0) user.soulSlashCooldown = Math.max(0, user.soulSlashCooldown - dt);
      if (user.soulHealCooldown > 0) user.soulHealCooldown = Math.max(0, user.soulHealCooldown - dt);
      if (user.shieldSkillCooldown && user.shieldSkillCooldown > 0) {
        user.shieldSkillCooldown = Math.max(0, user.shieldSkillCooldown - dt);
      }
      if (user.weaponSkillCooldown && user.weaponSkillCooldown > 0) {
        user.weaponSkillCooldown = Math.max(0, user.weaponSkillCooldown - dt);
      }

      // Passive HP Regen: 1 HP every 15 seconds
      user.regenTimer = (user.regenTimer || 0) + dt;
      if (user.regenTimer >= 15.0) {
        user.regenTimer -= 15.0;
        if (user.hp < user.maxHp) {
          user.hp = Math.min(user.maxHp, user.hp + 1);
          this.addFloatingText(user.x, user.y, '+1 HP (Hồi phục)', '#10b981');
        }
      }
    }

    // 3. Update Levers (cooldowns & copper oxidation)
    // Run full check on levers near player and sample others
    for (let i = 0; i < this.levers.length; i++) {
      const lever = this.levers[i];
      if (lever.isDisposed) continue;

      if (lever.cooldownRemaining > 0) {
        lever.cooldownRemaining = Math.max(0, lever.cooldownRemaining - dt);
      }

      // Copper oxidation: increases 1% every 1.5 seconds (~150 seconds to full oxidization)
      if (lever.type === 'copper') {
        lever.oxidationPercent = (lever.oxidationPercent || 0) + (dt / 1.5);
        if (lever.oxidationPercent >= 100) {
          lever.isDisposed = true; // vanished!
          this.addEventLog('Một Cần gạt đồng đã bị oxy hóa 100% và biến mất hoàn toàn!', 'lever');
        }
      }
    }

    // 4. Update Nearby Bots (Active AI within radius 40 of user)
    // And batch-update distant bots
    this.updateBots(dt, user);

    // 5. Update Monsters
    this.updateMonsters(dt, user);

    // 6. Update Projectiles
    this.updateProjectiles(dt);

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // 8. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.2 * dt;
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public resolveWallCollisions(entity: { x: number; y: number; size: number }) {
    const half = entity.size / 2;
    // Check against nearby walls using spatial grid (ultra-fast)
    const nearbyWalls = this.wallGrid.queryRadius(entity.x, entity.y, 20);
    for (const wall of nearbyWalls) {
      if (
        entity.x + half > wall.x &&
        entity.x - half < wall.x + wall.width &&
        entity.y + half > wall.y &&
        entity.y - half < wall.y + wall.height
      ) {
        // Simple push-out
        const overlapL = (entity.x + half) - wall.x;
        const overlapR = (wall.x + wall.width) - (entity.x - half);
        const overlapT = (entity.y + half) - wall.y;
        const overlapB = (wall.y + wall.height) - (entity.y - half);
        const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);

        if (minOverlap === overlapL) entity.x = wall.x - half;
        else if (minOverlap === overlapR) entity.x = wall.x + wall.width + half;
        else if (minOverlap === overlapT) entity.y = wall.y - half;
        else entity.y = wall.y + wall.height + half;
      }
    }
  }

  private updateBots(dt: number, user: Player) {
    const activeRadius = 45; // Units around user where bots run full reactive simulation

    for (let i = 1; i < this.players.length; i++) {
      const bot = this.players[i];
      if (bot.isDead || bot.isPermanentlyDead) continue;

      // Inactivity check for bots: 2 minutes without score change = permanent elimination
      if (bot.lastScore === undefined) {
        bot.lastScore = bot.magicBalls;
        bot.timeSinceScoreChange = 0;
      }
      if (bot.magicBalls !== bot.lastScore) {
        bot.lastScore = bot.magicBalls;
        bot.timeSinceScoreChange = 0;
      } else {
        bot.timeSinceScoreChange = (bot.timeSinceScoreChange || 0) + dt;
        if (bot.timeSinceScoreChange >= 120.0) {
          this.eliminatePlayerPermanently(bot);
          continue;
        }
      }

      if (bot.shieldTimeRemaining > 0) {
        bot.shieldTimeRemaining = Math.max(0, bot.shieldTimeRemaining - dt);
      }
      if (bot.attackCooldown > 0) bot.attackCooldown = Math.max(0, bot.attackCooldown - dt);
      if (bot.soulSlashCooldown > 0) bot.soulSlashCooldown = Math.max(0, bot.soulSlashCooldown - dt);
      if (bot.soulHealCooldown > 0) bot.soulHealCooldown = Math.max(0, bot.soulHealCooldown - dt);
      if (bot.weaponSkillCooldown && bot.weaponSkillCooldown > 0) {
        bot.weaponSkillCooldown = Math.max(0, bot.weaponSkillCooldown - dt);
      }

      // Passive HP Regen: 1 HP every 15 seconds
      bot.regenTimer = (bot.regenTimer || 0) + dt;
      if (bot.regenTimer >= 15.0) {
        bot.regenTimer -= 15.0;
        if (bot.hp < bot.maxHp) {
          bot.hp = Math.min(bot.maxHp, bot.hp + 1);
        }
      }

      const distToUser = Math.hypot(bot.x - user.x, bot.y - user.y);

      if (distToUser <= activeRadius) {
        // FULL REACTIVE AI FOR NEARBY BOTS
        this.runReactiveBotAI(bot, dt, user);
      }
    }

    // BATCH-UPDATE DISTANT BOTS: update 60 distant bots per frame
    const batchSize = 60;
    for (let count = 0; count < batchSize; count++) {
      this.distantBotIndex++;
      if (this.distantBotIndex >= this.players.length) {
        this.distantBotIndex = 1;
      }
      const bot = this.players[this.distantBotIndex];
      if (bot.isDead) continue;

      const distToUser = Math.hypot(bot.x - user.x, bot.y - user.y);
      if (distToUser > activeRadius) {
        this.runMacroBotAI(bot);
      }
    }
  }

  // Reactive AI for bots near player
  private runReactiveBotAI(bot: Player, dt: number, user: Player) {
    const distToUser = Math.hypot(bot.x - user.x, bot.y - user.y);

    // Decrement bot shield skill cooldown
    if (bot.shieldSkillCooldown && bot.shieldSkillCooldown > 0) {
      bot.shieldSkillCooldown = Math.max(0, bot.shieldSkillCooldown - dt);
    }

    // 0. Survival: Use Shield Skill (650 MB) if HP < 50, has >= 650 MB, no shield active
    if (bot.hp < 50 && bot.magicBalls >= 650 && bot.shieldTimeRemaining <= 0 && (!bot.shieldSkillCooldown || bot.shieldSkillCooldown <= 0)) {
      this.castShield(bot);
    }

    // 1. Survival: Equip Hồn Hồi if bot has >= 650 MB and doesn't have it equipped yet
    if (bot.magicBalls >= 650 && !bot.hasSoulHeal && Math.random() < 0.05) {
      this.castSoulHeal(bot);
    }

    // 2. AGGRO RETALIATION CHECK:
    // If attacked, bot retaliates until target is > 100 PGrid away or target dies, ignoring levers!
    let aggroTarget: Player | null = null;
    if (bot.aggroTargetId) {
      const candidate = this.players.find(p => p.id === bot.aggroTargetId);
      if (candidate && !candidate.isDead) {
        const d = Math.hypot(candidate.x - bot.x, candidate.y - bot.y);
        if (d <= 100) {
          aggroTarget = candidate;
        } else {
          // Lost track (> 100 PGrid away)
          bot.aggroTargetId = undefined;
        }
      } else {
        bot.aggroTargetId = undefined;
      }
    }

    // 3. Find target lever
    let targetLever: Lever | null = null;
    if (!aggroTarget) {
      if (bot.targetLeverId) {
        const cached = this.levers.find(l => l.id === bot.targetLeverId && !l.isDisposed && l.cooldownRemaining <= 0 && !l.isCrafted);
        if (cached) {
          targetLever = cached;
        } else {
          bot.targetLeverId = undefined;
        }
      }

      if (!targetLever) {
        const nearbyLevers = this.leverGrid.queryRadius(bot.x, bot.y, 45);
        let minLeverDist = Infinity;
        for (const l of nearbyLevers) {
          if (l.isDisposed || l.cooldownRemaining > 0 || l.isCrafted) continue;
          const d = Math.hypot(l.x - bot.x, l.y - bot.y);
          if (d < minLeverDist) {
            minLeverDist = d;
            targetLever = l;
          }
        }
        if (targetLever) {
          bot.targetLeverId = targetLever.id;
        }
      }
    }

    // 4. Target Enemy Selection:
    // Rule 1: Bot bị tấn công sẽ truy kích người tấn công (cho đến khi > 100 PGrid hoặc chết)
    // Rule 2: Bot còn 30 giây để thay đổi Magic Balls (timeSinceScoreChange >= 90s) -> Gặp bất kỳ người chơi nào đều tiêu diệt!
    // Rule 3: Bot thấy người chơi lại gần cần gạt cũng chủ động tấn công, dù có bị đánh hay chưa
    // Rule 4: Người chơi ở xa cần gạt và không tấn công bot thì bot sẽ phớt lờ và đi tìm cần gạt
    let targetEnemy: Player | Monster | null = null;

    const isDesperateForPoints = (bot.timeSinceScoreChange || 0) >= 90; // <= 30 giây còn lại!

    if (aggroTarget && aggroTarget.shieldTimeRemaining <= 0) {
      // Ưu tiên 1: Trực tiếp phản đòn kẻ đã tấn công mình!
      targetEnemy = aggroTarget;
    } else if (isDesperateForPoints) {
      // Ưu tiên 2 (MỚI): Còn 30s để đổi điểm -> Gặp bất kỳ người chơi nào (user hoặc bot) đều sẽ tiêu diệt!
      let closestPlayer: Player | null = null;
      let minTargetDist = 24; // Tầm phát hiện người chơi khi cuồng sát

      // Kiểm tra user
      if (!user.isDead && !user.isPermanentlyDead && user.shieldTimeRemaining <= 0) {
        if (distToUser < minTargetDist) {
          minTargetDist = distToUser;
          closestPlayer = user;
        }
      }

      // Kiểm tra các người chơi bot khác gần kề
      for (let i = 1; i < Math.min(250, this.players.length); i++) {
        const other = this.players[i];
        if (other.id === bot.id || other.isDead || other.isPermanentlyDead || other.shieldTimeRemaining > 0) continue;
        const d = Math.hypot(other.x - bot.x, other.y - bot.y);
        if (d < minTargetDist) {
          minTargetDist = d;
          closestPlayer = other;
        }
      }

      if (closestPlayer) {
        targetEnemy = closestPlayer;
      }
    }

    if (!targetEnemy) {
      // Ưu tiên 3: Kiểm tra xem người chơi có đang lại gần cần gạt trong tầm nhìn của bot không
      const userNearLevers = this.leverGrid.queryRadius(user.x, user.y, 4.5);
      const isUserNearAnyLever = userNearLevers.some(l => !l.isDisposed);
      const isUserNearBotTargetLever = targetLever 
        ? Math.hypot(targetLever.x - user.x, targetLever.y - user.y) <= 6.0 
        : false;

      const isUserContestingLever = (isUserNearBotTargetLever || isUserNearAnyLever) && distToUser < 18;

      if (isUserContestingLever && !user.isDead && user.shieldTimeRemaining <= 0) {
        // Thấy người chơi lại gần cần gạt -> Tấn công ngay!
        targetEnemy = user;
      } else {
        // Người chơi không lại gần cần gạt và không đánh bot: bot chỉ tự vệ trước quái vật gần kề
        for (const m of this.monsters) {
          if (m.isDead) continue;
          const d = Math.hypot(m.x - bot.x, m.y - bot.y);
          if (d < 5.5) {
            targetEnemy = m;
            break;
          }
        }
      }
    }

    if (targetEnemy) {
      // Fight enemy!
      const ex = targetEnemy.x;
      const ey = targetEnemy.y;
      const angle = Math.atan2(ey - bot.y, ex - bot.x);
      const enemyDist = Math.hypot(ex - bot.x, ey - bot.y);

      // 1. Ranged weapon special skill
      if (bot.equippedWeapon.isRanged && (!bot.weaponSkillCooldown || bot.weaponSkillCooldown <= 0) && enemyDist < 25 && Math.random() < 0.1) {
        this.castWeaponSpecialSkill(bot, angle, ex, ey);
      } else if (bot.magicBalls >= 500 && enemyDist < 12 && bot.soulSlashCooldown <= 0 && Math.random() < 0.05) {
        // 2. Hồn Trảm
        this.castSoulSlash(bot, angle);
      } else {
        const canBotAttack = enemyDist <= Math.max(25.0, bot.equippedWeapon.range);

        if (canBotAttack && bot.attackCooldown <= 0) {
          // Normal attack with distance scaling
          this.attackWithEquippedWeapon(bot, angle, ex, ey);
        } else {
          // Bot can sprint using Magic Balls to chase down target (speed 10.5, -5 MB every 5s)
          let botSpeed = 6.2;
          if (bot.magicBalls >= 5 && enemyDist > 2.5) {
            botSpeed = 10.5;
            bot.isSprinting = true;
            bot.sprintDuration = (bot.sprintDuration || 0) + dt;
            if (bot.sprintDuration >= 5.0) {
              bot.sprintDuration -= 5.0;
              bot.magicBalls = Math.max(0, bot.magicBalls - 5);
            }
          } else {
            bot.isSprinting = false;
            bot.sprintDuration = 0;
          }

          bot.x += Math.cos(angle) * botSpeed * dt;
          bot.y += Math.sin(angle) * botSpeed * dt;
        }
      }
    } else if (targetLever) {
      // Move towards lever
      const angle = Math.atan2(targetLever.y - bot.y, targetLever.x - bot.x);
      const leverDist = Math.hypot(targetLever.x - bot.x, targetLever.y - bot.y);

      if (leverDist <= 2.2) {
        // Pull lever!
        this.pullOrCleanLever(bot, targetLever);
        bot.targetLeverId = undefined;
      } else {
        const botSpeed = 6.0;
        bot.x += Math.cos(angle) * botSpeed * dt;
        bot.y += Math.sin(angle) * botSpeed * dt;
      }
    } else {
      // Wander safely
      if (Math.random() < 0.02) {
        const wanderAngle = Math.random() * Math.PI * 2;
        bot.vx = Math.cos(wanderAngle) * 4.0;
        bot.vy = Math.sin(wanderAngle) * 4.0;
      }
      bot.x += bot.vx * dt;
      bot.y += bot.vy * dt;
    }

    // BOT SAFETY RULE: Bots NEVER touch the edge of the map!
    const edgeMargin = 25;
    if (bot.x < edgeMargin) { bot.x = edgeMargin; bot.vx = 4; }
    if (bot.x > MAP_SIZE - edgeMargin) { bot.x = MAP_SIZE - edgeMargin; bot.vx = -4; }
    if (bot.y < edgeMargin) { bot.y = edgeMargin; bot.vy = 4; }
    if (bot.y > MAP_SIZE - edgeMargin) { bot.y = MAP_SIZE - edgeMargin; bot.vy = -4; }

    // BOT WALL COLLISION RULE: Bots cannot pass through walls!
    this.resolveWallCollisions(bot);
  }

  // Macro AI for distant bots across the 2500x2500 world to simulate live active competition
  private runMacroBotAI(bot: Player) {
    // Distant bot pulls nearby levers if available
    if (Math.random() < 0.25) {
      const nearbyLevers = this.leverGrid.queryRadius(bot.x, bot.y, 30);
      for (const l of nearbyLevers) {
        if (!l.isDisposed && l.cooldownRemaining <= 0 && !l.isCrafted) {
          l.cooldownRemaining = l.cooldownDuration;
          bot.magicBalls += l.ballsReward;
          break;
        }
      }
    }

    // Distant bot buys weapon upgrades if they have enough Magic Balls
    if (bot.magicBalls > 1000 && bot.equippedWeapon.id === 'fists') {
      bot.equippedWeapon = WEAPONS.iron_sword;
    } else if (bot.magicBalls > 2000 && bot.equippedWeapon.id === 'iron_sword') {
      bot.equippedWeapon = WEAPONS.pistol;
    }

    // Distant skirmishes: 2% chance per tick to fight a distant monster or bot
    if (Math.random() < 0.02) {
      if (Math.random() < 0.4) {
        // Killed a monster
        bot.magicBalls += 30;
      } else if (Math.random() < 0.1) {
        // Bot died in distant skirmish
        this.totalPlayersKilled++;
        if (bot.magicBalls >= 750) {
          bot.magicBalls -= 750;
        }
        bot.hp = bot.maxHp;
        bot.x = 100 + Math.random() * (MAP_SIZE - 200);
        bot.y = 100 + Math.random() * (MAP_SIZE - 200);
      }
    }

    // Keep away from map edges
    bot.x = Math.max(30, Math.min(MAP_SIZE - 30, bot.x + (Math.random() * 6 - 3)));
    bot.y = Math.max(30, Math.min(MAP_SIZE - 30, bot.y + (Math.random() * 6 - 3)));
  }

  // Monsters Update
  private updateMonsters(dt: number, user: Player) {
    for (let i = 0; i < this.monsters.length; i++) {
      const monster = this.monsters[i];
      if (monster.isDead) continue;

      if (monster.attackCooldown > 0) {
        monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);
      }

      // Find closest player (user or bot)
      let closestTarget: Player | null = null;
      let minDist = monster.isBoss ? 40 : 25; // Boss has larger aggro radius

      // Check user
      if (!user.isDead && user.shieldTimeRemaining <= 0) {
        const d = Math.hypot(user.x - monster.x, user.y - monster.y);
        if (d < minDist) {
          minDist = d;
          closestTarget = user;
        }
      }

      // Check nearby bots
      for (let b = 1; b < Math.min(300, this.players.length); b++) {
        const bot = this.players[b];
        if (bot.isDead || bot.shieldTimeRemaining > 0) continue;
        const d = Math.hypot(bot.x - monster.x, bot.y - monster.y);
        if (d < minDist) {
          minDist = d;
          closestTarget = bot;
        }
      }

      if (closestTarget) {
        // Move towards target
        const angle = Math.atan2(closestTarget.y - monster.y, closestTarget.x - monster.x);
        monster.x += Math.cos(angle) * monster.speed * dt;
        monster.y += Math.sin(angle) * monster.speed * dt;

        // Attack target if close enough
        const attackDist = (monster.size / 2) + (closestTarget.size / 2) + 0.6;
        if (minDist <= attackDist && monster.attackCooldown <= 0) {
          monster.attackCooldown = monster.isBoss ? 1.0 : 0.8;
          this.damagePlayer(closestTarget, monster.damage, monster);

          // Boss special stomp effect
          if (monster.isBoss) {
            this.addBloodParticles(monster.x, monster.y, '#9333ea', 12);
            // Stomp shockwave damages all nearby players
            for (const p of this.players) {
              if (p.isDead || p.shieldTimeRemaining > 0) continue;
              const pd = Math.hypot(p.x - monster.x, p.y - monster.y);
              if (pd < 6 && p.id !== closestTarget.id) {
                this.damagePlayer(p, 25, monster);
              }
            }
          }
        }
      } else {
        // Idle wander
        if (Math.random() < 0.01) {
          monster.vx = (Math.random() * 2 - 1) * 2;
          monster.vy = (Math.random() * 2 - 1) * 2;
        }
        monster.x += (monster.vx || 0) * dt;
        monster.y += (monster.vy || 0) * dt;
      }

      // MONSTERS CANNOT PASS THROUGH WALLS
      this.resolveWallCollisions(monster);
    }
  }

  // Projectiles Update
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const moveDist = Math.hypot(proj.vx * dt, proj.vy * dt);
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.rangeRemaining -= moveDist;

      // Trail particles for soul slash
      if (proj.isSoulSlash && Math.random() < 0.4) {
        this.particles.push({
          x: proj.x,
          y: proj.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0,
          maxLife: 0.25,
          color: '#38bdf8',
          size: 3
        });
      }

      // Gravitational pull for Void Scepter Black Hole
      if (proj.isSpecialSkill && proj.radius >= 2.0) {
        for (const p of this.players) {
          if (p.isDead || p.id === proj.sourceId || p.shieldTimeRemaining > 0) continue;
          const pd = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (pd < 9 && pd > 0.4) {
            p.x += ((proj.x - p.x) / pd) * 5.0 * dt;
            p.y += ((proj.y - p.y) / pd) * 5.0 * dt;
          }
        }
        for (const m of this.monsters) {
          if (m.isDead) continue;
          const md = Math.hypot(m.x - proj.x, m.y - proj.y);
          if (md < 9 && md > 0.4) {
            m.x += ((proj.x - m.x) / md) * 5.0 * dt;
            m.y += ((proj.y - m.y) / md) * 5.0 * dt;
          }
        }
      }

      // Check collision with walls (unless projectile pierces walls, e.g. Divine Bow special)
      if (!proj.piercesWalls) {
        const nearbyWalls = this.wallGrid.queryRadius(proj.x, proj.y, 6);
        let hitWall = false;
        for (const wall of nearbyWalls) {
          if (
            proj.x >= wall.x &&
            proj.x <= wall.x + wall.width &&
            proj.y >= wall.y &&
            proj.y <= wall.y + wall.height
          ) {
            hitWall = true;
            this.addBloodParticles(proj.x, proj.y, '#94a3b8', 4);
            break;
          }
        }

        if (hitWall) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision with monsters
      let hasHit = false;
      for (const m of this.monsters) {
        if (m.isDead) continue;
        const d = Math.hypot(m.x - proj.x, m.y - proj.y);
        if (d < (m.size / 2) + proj.radius) {
          const sourcePlayer = this.players.find(p => p.id === proj.sourceId);
          this.damageMonster(m, proj.damage, sourcePlayer);
          hasHit = true;
          break;
        }
      }

      // Check collision with players
      if (!hasHit) {
        for (const p of this.players) {
          if (p.isDead || p.id === proj.sourceId || p.shieldTimeRemaining > 0) continue;
          const d = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (d < (p.size / 2) + proj.radius) {
            const sourcePlayer = this.players.find(pl => pl.id === proj.sourceId);
            this.damagePlayer(p, proj.damage, sourcePlayer, proj.isSoulSlash);
            hasHit = true;
            break;
          }
        }
      }

      // Check collision with crafted levers if this is a Soul Slash ("Hồn Trảm")
      // User rule: "cần gạt tự tạo có thể phá bằng cách nó bị trúng 2 lần nhát chém Hồn Trảm"
      if (proj.isSoulSlash) {
        const nearbyLevers = this.leverGrid.queryRadius(proj.x, proj.y, proj.radius + 1.2);
        for (const l of nearbyLevers) {
          if (l.isCrafted && !l.isDisposed) {
            const attacker = this.players.find(pl => pl.id === proj.sourceId);
            if (attacker) {
              this.hitCraftedLever(l, attacker);
              hasHit = true;
              break;
            }
          }
        }
      }

      if (hasHit || proj.rangeRemaining <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  // Get Top 100 Leaderboard
  public getTop100Players(): Player[] {
    // Sort copy by magicBalls descending
    return [...this.players].sort((a, b) => b.magicBalls - a.magicBalls).slice(0, 100);
  }

  // Get user rank
  public getUserRank(): number {
    const userBalls = this.getUserPlayer().magicBalls;
    let higherCount = 0;
    for (let i = 1; i < this.players.length; i++) {
      if (this.players[i].magicBalls > userBalls) {
        higherCount++;
      }
    }
    return higherCount + 1;
  }
}
