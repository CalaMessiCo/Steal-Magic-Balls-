import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { X, KeyRound, ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, Scroll } from 'lucide-react';

interface PasswordGateModalProps {
  engine: GameEngine;
  onClose: () => void;
  onVictory: () => void;
}

export const PasswordGateModal: React.FC<PasswordGateModalProps> = ({ engine, onClose, onVictory }) => {
  const romans: ('I' | 'II' | 'III' | 'IV' | 'V')[] = ['I', 'II', 'III', 'IV', 'V'];

  // Initialize input code from collected papers if available, else 0
  const [code, setCode] = useState<{ [key in 'I' | 'II' | 'III' | 'IV' | 'V']: number }>({
    I: engine.collectedPapers.get('I')?.digit ?? 0,
    II: engine.collectedPapers.get('II')?.digit ?? 0,
    III: engine.collectedPapers.get('III')?.digit ?? 0,
    IV: engine.collectedPapers.get('IV')?.digit ?? 0,
    V: engine.collectedPapers.get('V')?.digit ?? 0,
  });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
  }>({ type: null, message: '' });

  const hasPlayerWith20k = engine.players.some(p => p.magicBalls >= 20000);
  const maxPlayerBalls = Math.max(...engine.players.map(p => p.magicBalls));

  const handleDigitChange = (roman: 'I' | 'II' | 'III' | 'IV' | 'V', delta: number) => {
    setCode(prev => {
      let val = prev[roman] + delta;
      if (val > 9) val = 0;
      if (val < 0) val = 9;
      return { ...prev, [roman]: val };
    });
  };

  const handleFillFromInventory = () => {
    setCode(prev => {
      const next = { ...prev };
      romans.forEach(r => {
        const paper = engine.collectedPapers.get(r);
        if (paper) next[r] = paper.digit;
      });
      return next;
    });
    setFeedback({
      type: 'warning',
      message: 'Đã điền các chữ số từ tờ giấy mật khẩu bạn đang sở hữu!'
    });
  };

  const handleVerify = () => {
    const result = engine.verifyPassword(code);
    if (result.stats.isWon) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        onVictory();
      }, 1000);
    } else if (result.codeMatches) {
      setFeedback({ type: 'warning', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl p-6 flex flex-col gap-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
              CỔNG MẬT KHẨU CỔ ĐẠI
            </h2>
            <p className="text-xs text-slate-400">
              Nhập chính xác 5 chữ số từ I đến V để mở phong ấn chiến thắng.
            </p>
          </div>
        </div>

        {/* Password Dials (I, II, III, IV, V) */}
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span>5 Ký tự số La Mã (0 - 9)</span>
            {engine.collectedPapers.size > 0 && (
              <button
                onClick={handleFillFromInventory}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 underline underline-offset-2"
              >
                <Scroll className="h-3.5 w-3.5" /> Điền từ giấy nhặt được ({engine.collectedPapers.size}/5)
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-3 pt-2">
            {romans.map(r => {
              const paper = engine.collectedPapers.get(r);
              return (
                <div key={r} className="flex flex-col items-center gap-2">
                  <span className="font-mono font-bold text-sm text-purple-300">
                    [{r}]
                  </span>

                  {/* Increment */}
                  <button
                    onClick={() => handleDigitChange(r, 1)}
                    className="w-full py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-slate-300 font-bold transition-all"
                  >
                    ▲
                  </button>

                  {/* Digit Display */}
                  <div className={`w-full py-3 rounded-xl border text-center font-mono text-2xl font-black transition-all ${
                    paper 
                      ? 'bg-purple-950/40 border-purple-500/60 text-amber-300 shadow-inner'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}>
                    {code[r]}
                  </div>

                  {/* Decrement */}
                  <button
                    onClick={() => handleDigitChange(r, -1)}
                    className="w-full py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 text-slate-300 font-bold transition-all"
                  >
                    ▼
                  </button>

                  {/* Paper Hint Indicator */}
                  {paper ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      Đã có: {paper.digit}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      Chưa tìm
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Victory Requirements Checklist */}
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/40 p-4 border border-slate-800 text-xs">
          <div className="font-bold text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-800/80">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>3 Điều Kiện Chiến Thắng Tuyệt Đối:</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-slate-300">
              {engine.totalPlayersKilled >= 500 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Ít nhất 500 người chơi bị tiêu diệt
            </span>
            <span className={`font-mono font-bold ${engine.totalPlayersKilled >= 500 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {engine.totalPlayersKilled} / 500
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-slate-300">
              {hasPlayerWith20k ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Ít nhất 1 người chơi có trên 20.000 Magic Balls
            </span>
            <span className={`font-mono font-bold ${hasPlayerWith20k ? 'text-emerald-400' : 'text-slate-400'}`}>
              Cao nhất: {maxPlayerBalls.toLocaleString()} / 20.000
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-slate-300">
              {engine.totalBossesKilled >= 1 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              )}
              Tiêu diệt ít nhất 1 BOSS Ma Thuật
            </span>
            <span className={`font-mono font-bold ${engine.totalBossesKilled >= 1 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {engine.totalBossesKilled} / 1
            </span>
          </div>
        </div>

        {/* Feedback Message Alert */}
        {feedback.message && (
          <div className={`p-3 rounded-xl text-xs whitespace-pre-line font-medium border ${
            feedback.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200' :
            feedback.type === 'warning' ? 'bg-amber-950/60 border-amber-500/50 text-amber-200' :
            'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* How to get papers guide */}
        <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/30 p-3 rounded-xl border border-slate-800/60">
          💡 <strong>Cách lấy tờ giấy mật khẩu:</strong> Dùng <strong>2500 Magic Balls (phím C)</strong> để tạo Cần Gạt Tự Tạo, sau đó dùng <strong>Hồn Trảm (phím Q - 500 MB)</strong> chém 2 lần để đập vỡ nó. Khi đập vỡ nhận lại 500 MB và có <strong>5% cơ hội</strong> rơi ra một tờ giấy mật khẩu cổ xưa!
        </div>

        {/* Action Button */}
        <button
          onClick={handleVerify}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          XÁC NHẬN MẬT KHẨU & MỞ CỔNG CHIẾN THẮNG
        </button>

      </div>
    </div>
  );
};
