import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { SHOP_ITEMS } from '../game/weapons';
import { Weapon } from '../types/game';
import { X, ShoppingBag, Check, Zap, Target, Crosshair } from 'lucide-react';
import { sound } from '../utils/audio';

interface ShopModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ engine, onClose }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const user = engine.getUserPlayer();

  const handleBuyWeapon = (weapon: Weapon) => {
    if (user.magicBalls < weapon.price) {
      engine.addFloatingText(user.x, user.y, 'Không đủ Magic Balls!', '#ef4444');
      return;
    }

    user.magicBalls -= weapon.price;
    user.equippedWeapon = weapon;
    sound.playMagicBallsGain();
    engine.addFloatingText(user.x, user.y, `Trang bị ${weapon.name}!`, '#38bdf8');
    engine.addEventLog(`Bạn đã mua và trang bị ${weapon.name} (-${weapon.price} MB)!`, 'system');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl p-6 flex flex-col gap-5 text-slate-100 max-h-[88vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-500">
                CỬA HÀNG VŨ KHÍ MA THUẬT
              </h2>
              <p className="text-xs text-slate-400">
                Mua và nâng cấp vũ khí chiến đấu bằng Magic Balls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 mr-8">
            <span className="text-xs text-amber-200/90 font-medium">Số dư:</span>
            <span className="font-mono text-lg font-black text-amber-400">
              {user.magicBalls.toLocaleString()} MB
            </span>
          </div>
        </div>

        {/* Weapon Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {SHOP_ITEMS.map((item) => {
            const isEquipped = user.equippedWeapon.id === item.id;
            const canAfford = user.magicBalls >= item.price;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                  isEquipped 
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-900/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                          {item.name}
                          {item.isRanged && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                              Tầm xa
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weapon Stats */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1 text-rose-400">
                      <Zap className="h-3 w-3" />
                      <span>{item.damage} Sát thương</span>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Target className="h-3 w-3" />
                      <span>{item.range}m Cự ly</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Crosshair className="h-3 w-3" />
                      <span>{item.cooldown}s Tốc độ</span>
                    </div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 mt-1">
                  <span className="font-mono text-sm font-bold text-amber-400">
                    🔮 {item.price.toLocaleString()} MB
                  </span>

                  {isEquipped ? (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                      <Check className="h-3.5 w-3.5" /> Đang dùng
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuyWeapon(item)}
                      disabled={!canAfford}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-900/30 hover:scale-105 active:scale-95'
                          : 'bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Mua & Trang bị' : 'Thiếu Magic Balls'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
