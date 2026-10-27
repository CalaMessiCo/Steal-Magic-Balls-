export type LeverType = 
  | 'wood' 
  | 'stone' 
  | 'copper' 
  | 'iron' 
  | 'gold' 
  | 'diamond' 
  | 'ultimate' 
  | 'crafted';

export interface Lever {
  id: string;
  x: number;
  y: number;
  type: LeverType;
  ballsReward: number;
  cooldownRemaining: number; // in seconds, 120s max
  cooldownDuration: number;  // 120s
  isCrafted: boolean;
  craftedHitsRemaining?: number; // 2 hits from Hồn Trảm to break
  oxidationPercent?: number;     // 0 to 100 for copper
  isDisposed?: boolean;
}

export interface PasswordPaper {
  roman: 'I' | 'II' | 'III' | 'IV' | 'V';
  digit: number; // 0-9
  collectedAt: number;
}

export interface Weapon {
  id: string;
  name: string;
  price: number;
  description: string;
  damage: number;
  cooldown: number; // in seconds
  range: number;    // in PGrid units
  projectileSpeed?: number;
  isRanged?: boolean;
  color: string;
  icon: string;
  specialSkillName?: string;
  specialSkillDesc?: string;
  specialCooldown?: number; // in seconds
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // in PGrid (1 for player, 3 for monster, 6 for boss)
  hp: number;
  maxHp: number;
  isDead: boolean;
}

export interface Player extends Entity {
  isUser: boolean;
  name: string;
  idNumber: number; // 0 for user, 1-2999 for bots
  magicBalls: number;
  equippedWeapon: Weapon;
  shieldTimeRemaining: number; // 5s invulnerability upon spawn
  kills: number;
  targetLeverId?: string;
  attackCooldown: number;
  soulSlashCooldown: number;
  soulHealCooldown: number;
  color: string;
  regenTimer?: number; // Tracks 15-second 1 HP passive regen
  aggroTargetId?: string; // Tracks player who attacked this bot until > 100 PGrid or dead
  isSprinting?: boolean;
  sprintDuration?: number;
  lastPlayerKillTime?: number;
  multiKillCount?: number;
  shieldSkillCooldown?: number;
  hasSoulHeal?: boolean; // Protects from lethal Soul Slash once
  lastScore?: number;
  timeSinceScoreChange?: number; // If >= 120s (2 minutes), eliminated permanently
  isPermanentlyDead?: boolean; // Cannot respawn; user enters Shadowing Mode
  weaponSkillCooldown?: number; // Cooldown for ranged weapon special skill
}

export interface Monster extends Entity {
  isBoss: boolean;
  damage: number;
  attackCooldown: number;
  speed: number;
  rewardBalls: number;
  specialAttackTimer?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  rangeRemaining: number;
  sourceId: string;
  isUser: boolean;
  isSoulSlash: boolean;
  color: string;
  radius: number;
  isSpecialSkill?: boolean;
  piercesWalls?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PasswordGate {
  x: number;
  y: number;
  size: number; // 5x5 PGrid
  requiredCode: { [key in 'I' | 'II' | 'III' | 'IV' | 'V']: number };
}

export interface GameVictoryStats {
  playersKilled: number;
  hasPlayerWith20kBalls: boolean;
  bossesKilled: number;
  isWon: boolean;
}
