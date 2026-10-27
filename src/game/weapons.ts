import { Weapon } from '../types/game';

export const WEAPONS: Record<string, Weapon> = {
  fists: {
    id: 'fists',
    name: 'Tay Không',
    price: 0,
    description: 'Tấn công tức thì (chuột trái). Càng lại gần sát thương càng cao (tối đa 15). Bot áp sát để tấn công.',
    damage: 15,
    cooldown: 0.35,
    range: 25.0,
    color: '#e2e8f0',
    icon: '👊'
  },
  wooden_club: {
    id: 'wooden_club',
    name: 'Gậy Gỗ',
    price: 150,
    description: 'Đòn đập tầm xa tức thì. Càng lại gần sát thương càng uy lực (tối đa 32).',
    damage: 32,
    cooldown: 0.3,
    range: 25.0,
    color: '#b45309',
    icon: '🪵'
  },
  iron_sword: {
    id: 'iron_sword',
    name: 'Kiếm Sắt',
    price: 450,
    description: 'Nhát chém thép tức thì. Càng lại gần sát thương càng lớn (tối đa 55).',
    damage: 55,
    cooldown: 0.28,
    range: 28.0,
    color: '#94a3b8',
    icon: '⚔️'
  },
  pistol: {
    id: 'pistol',
    name: 'Súng Lục Ma Thuật',
    price: 900,
    description: 'Bắn tức thì tầm xa (càng gần sát thương càng cao, tối đa 48). [X] Chiêu đặc biệt: Bão Đạn Xung Kích - Bắn tỏa chùm 7 viên đạn tốc độ cao đẩy lùi đối thủ.',
    damage: 48,
    cooldown: 0.32,
    range: 30.0,
    isRanged: true,
    projectileSpeed: 24,
    color: '#f59e0b',
    icon: '🔫',
    specialSkillName: 'Bão Đạn Xung Kích',
    specialSkillDesc: 'Bắn chùm 7 viên đạn ma thuật tỏa hình nón cực mạnh',
    specialCooldown: 5.0
  },
  divine_bow: {
    id: 'divine_bow',
    name: 'Cung Thần',
    price: 1800,
    description: 'Bắn tức thì tầm xa (càng gần sát thương càng cao, tối đa 90). [X] Chiêu đặc biệt: Mũi Tên Sao Băng - Bắn tên ánh sáng khổng lồ xuyên tường và vật cản kích nổ diện rộng.',
    damage: 90,
    cooldown: 0.42,
    range: 32.0,
    isRanged: true,
    projectileSpeed: 28,
    color: '#10b981',
    icon: '🏹',
    specialSkillName: 'Mũi Tên Sao Băng',
    specialSkillDesc: 'Mũi tên ánh sáng siêu năng lượng xuyên qua mọi tường phòng thủ',
    specialCooldown: 6.0
  },
  thunder_staff: {
    id: 'thunder_staff',
    name: 'Pháp Trượng Sấm Sét',
    price: 3500,
    description: 'Tấn công tức thì tầm xa (càng gần sát thương càng cao, tối đa 130). [X] Chiêu đặc biệt: Thiên Lôi Chuỗi Giật - Giáng sét chuỗi lan tỏa qua tất cả kẻ địch xung quanh.',
    damage: 130,
    cooldown: 0.38,
    range: 30.0,
    isRanged: true,
    projectileSpeed: 26,
    color: '#8b5cf6',
    icon: '⚡',
    specialSkillName: 'Thiên Lôi Chuỗi Giật',
    specialSkillDesc: 'Sét chuỗi giật lan truyền qua hàng loạt mục tiêu xung quanh',
    specialCooldown: 6.5
  },
  light_blade: {
    id: 'light_blade',
    name: 'Kiếm Ánh Sáng',
    price: 6000,
    description: 'Trảm kích ánh sáng tức thì xuyên không gian. Càng lại gần chém càng hủy diệt (tối đa 180).',
    damage: 180,
    cooldown: 0.22,
    range: 30.0,
    color: '#38bdf8',
    icon: '✨'
  },
  void_scepter: {
    id: 'void_scepter',
    name: 'Trượng Hư Không',
    price: 10000,
    description: 'Bắn tức thì tầm xa (càng gần sát thương càng cao, tối đa 260). [X] Chiêu đặc biệt: Hố Đen Hư Vô - Tạo hố đen hút mọi kẻ địch vào tâm và kích nổ 350 ST hủy diệt.',
    damage: 260,
    cooldown: 0.35,
    range: 35.0,
    isRanged: true,
    projectileSpeed: 30,
    color: '#ec4899',
    icon: '🔮',
    specialSkillName: 'Hố Đen Hư Vô',
    specialSkillDesc: 'Tạo hố đen vũ trụ hút đối thủ vào tâm và phát nổ 350 ST',
    specialCooldown: 7.5
  }
};

export const SHOP_ITEMS = Object.values(WEAPONS).filter(w => w.price > 0);
