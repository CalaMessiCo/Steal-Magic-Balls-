import { Lever, LeverType, Player, Wall, PasswordGate } from '../types/game';
import { WEAPONS } from './weapons';

export const MAP_SIZE = 2500; // 2500 x 2500 PGrid units

// Colors for bot avatars
const BOT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#a855f7'
];

export function generateWorld() {
  const levers: Lever[] = [];
  
  // 5000 Levers distribution
  // Wood: 2400 (5 MB)
  // Stone: 1300 (10 MB)
  // Copper: 650 (20 MB)
  // Iron: 400 (50 MB)
  // Gold: 120 (200 MB, single use)
  // Diamond: 100 (100 MB)
  // Ultimate: 30 (200 MB)
  const distribution: { type: LeverType; count: number; balls: number }[] = [
    { type: 'wood', count: 2400, balls: 5 },
    { type: 'stone', count: 1300, balls: 10 },
    { type: 'copper', count: 650, balls: 20 },
    { type: 'iron', count: 400, balls: 50 },
    { type: 'gold', count: 120, balls: 200 },
    { type: 'diamond', count: 100, balls: 100 },
    { type: 'ultimate', count: 30, balls: 200 },
  ];

  let idCounter = 1;
  for (const item of distribution) {
    for (let i = 0; i < item.count; i++) {
      // Keep away from map edges (at least 20 PGrid away)
      const x = Math.floor(25 + Math.random() * (MAP_SIZE - 50));
      const y = Math.floor(25 + Math.random() * (MAP_SIZE - 50));
      
      const lever: Lever = {
        id: `lever_${idCounter++}`,
        x,
        y,
        type: item.type,
        ballsReward: item.balls,
        cooldownRemaining: 0,
        cooldownDuration: 120, // 2 minutes (120 seconds)
        isCrafted: false,
      };

      if (item.type === 'copper') {
        lever.oxidationPercent = Math.floor(Math.random() * 25); // initial small oxidation
      }

      levers.push(lever);
    }
  }

  // Generate Dense Defensive Walls (Fortresses, ruined ramparts, defensive bunkers)
  // "tường: làm cho nó xuất hiện càng nhiều càng tốt, vì đây là 1 dạng phòng thủ"
  const walls: Wall[] = [];
  const centerX = 1250;
  const centerY = 1250;
  let wallId = 1;

  for (let i = 0; i < 2800; i++) {
    const wx = Math.floor(35 + Math.random() * (MAP_SIZE - 70));
    const wy = Math.floor(35 + Math.random() * (MAP_SIZE - 70));
    
    // Keep central password gate plaza clear
    if (Math.abs(wx - centerX) < 35 && Math.abs(wy - centerY) < 35) continue;

    const pattern = Math.random();
    if (pattern < 0.45) {
      // Horizontal defense wall
      const length = 4 + Math.floor(Math.random() * 10);
      walls.push({
        id: `wall_${wallId++}`,
        x: wx,
        y: wy,
        width: length,
        height: 2,
      });
    } else if (pattern < 0.85) {
      // Vertical defense wall
      const length = 4 + Math.floor(Math.random() * 10);
      walls.push({
        id: `wall_${wallId++}`,
        x: wx,
        y: wy,
        width: 2,
        height: length,
      });
    } else {
      // Fortress corner / bunker bastion (2 intersecting walls)
      const len = 5 + Math.floor(Math.random() * 6);
      walls.push({
        id: `wall_${wallId++}`,
        x: wx,
        y: wy,
        width: len,
        height: 2,
      });
      walls.push({
        id: `wall_${wallId++}`,
        x: wx,
        y: wy,
        width: 2,
        height: len,
      });
    }
  }

  // Password Gate
  const secretCode: { [key in 'I' | 'II' | 'III' | 'IV' | 'V']: number } = {
    I: Math.floor(Math.random() * 10),
    II: Math.floor(Math.random() * 10),
    III: Math.floor(Math.random() * 10),
    IV: Math.floor(Math.random() * 10),
    V: Math.floor(Math.random() * 10),
  };

  const passwordGate: PasswordGate = {
    x: centerX,
    y: centerY,
    size: 4,
    requiredCode: secretCode,
  };

  // Players generation: 3000 total (User is #0, Bots #1 to #2999)
  const players: Player[] = [];

  // Player #0: User
  players.push({
    id: 'user_player',
    idNumber: 0,
    isUser: true,
    name: 'Bạn (Chiến Binh)',
    x: centerX,
    y: centerY + 18,
    vx: 0,
    vy: 0,
    size: 1, // 1x1 PGrid
    hp: 100,
    maxHp: 100,
    isDead: false,
    magicBalls: 0, // starts at 0
    equippedWeapon: WEAPONS.fists,
    shieldTimeRemaining: 5.0, // 5s immunity
    kills: 0,
    attackCooldown: 0,
    soulSlashCooldown: 0,
    soulHealCooldown: 0,
    color: '#38bdf8', // radiant cyan
  });

  // 2999 Bots
  for (let i = 1; i <= 2999; i++) {
    const bx = 60 + Math.random() * (MAP_SIZE - 120);
    const by = 60 + Math.random() * (MAP_SIZE - 120);
    const color = BOT_COLORS[i % BOT_COLORS.length];

    players.push({
      id: `bot_${i}`,
      idNumber: i,
      isUser: false,
      name: `Người Chơi #${i}`,
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      size: 1, // 1x1 PGrid
      hp: 100,
      maxHp: 100,
      isDead: false,
      magicBalls: 0,
      equippedWeapon: WEAPONS.fists,
      shieldTimeRemaining: 5.0,
      kills: 0,
      attackCooldown: 0,
      soulSlashCooldown: 0,
      soulHealCooldown: 0,
      color,
    });
  }

  return {
    levers,
    walls,
    passwordGate,
    players,
  };
}
