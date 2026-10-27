import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { X, Scroll, HelpCircle, Shield, Sparkles, Zap, Crosshair } from 'lucide-react';

interface InventoryModalProps {
  engine: GameEngine;
  onClose: () => void;
  onOpenGate: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ engine, onClose, onOpenGate }) => {
  const romans: ('I' | 'II' | 'III' | 'IV' | 'V')[] = ['I', 'II', 'III', 'IV', 'V'];
  const user = engine.getUserPlayer();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl p-6 flex flex-col gap-5 text-slate-100 max-h-[85vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Scroll className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
              TÚI ĐỒ & GIẤY MẬT KHẨU
            </h2>
            <p className="text-xs text-slate-400">
              Các mảnh giấy mật mã thu thập được và cẩm nang quy luật trò chơi.
            </p>
          </div>
        </div>

        {/* Collected Password Papers Section */}
        <div className="flex flex-col gap-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> 5 Tờ Giấy Mật Khẩu (Đã thu thập: {engine.collectedPapers.size}/5)
            </span>
            {engine.collectedPapers.size === 5 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGate();
                }}
                className="text-xs text-cyan-400 font-bold underline underline-offset-2 hover:text-cyan-300"
              >
                Mở Cổng Ngay 👉
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2.5 pt-1">
            {romans.map(r => {
              const paper = engine.collectedPapers.get(r);
              return (
                <div
                  key={r}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all ${
                    paper
                      ? 'bg-amber-950/30 border-amber-500/60 text-amber-300 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600'
                  }`}
                >
                  <span className="text-[11px] font-mono font-bold">[{r}]</span>
                  <span className="font-mono text-xl font-black my-1">
                    {paper ? paper.digit : '?'}
                  </span>
                  <span className="text-[9px]">
                    {paper ? 'Đã thu thập' : 'Chưa có'}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Nhận giấy mật khẩu bằng cách đập vỡ Cần gạt tự tạo với 2 nhát Hồn Trảm (tỉ lệ 5%).
          </p>
        </div>

        {/* Current Equipped Weapon */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{user.equippedWeapon.icon}</span>
            <div>
              <div className="font-bold text-sm text-slate-200">
                {user.equippedWeapon.name}
              </div>
              <div className="text-[11px] text-slate-400">
                Sát thương: {user.equippedWeapon.damage} • Cự ly: {user.equippedWeapon.range}m
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            Trang Bị Hiện Tại
          </span>
        </div>

        {/* Rules & Lever Rarity Guide */}
        <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/40 p-4 border border-slate-800 text-xs">
          <div className="font-bold text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-800">
            <HelpCircle className="h-4 w-4 text-cyan-400" />
            <span>Quy Tắc Các Loại Cần Gạt & Kỹ Năng</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
            <div className="p-2 rounded-lg bg-slate-900/50">
              <strong className="text-amber-300">🕹️ Cần gạt tự nhiên (5000 cái):</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                <li>Gỗ: +5 MB (hồi chiêu 2 phút)</li>
                <li>Đá: +10 MB (hồi chiêu 2 phút)</li>
                <li>Đồng: +20 MB (bị oxy hóa, tốn 500 MB làm sạch)</li>
                <li>Sắt: +50 MB</li>
                <li>Kim cương: +100 MB</li>
                <li>Vàng: +200 MB (gạt xong biến mất luôn)</li>
                <li>Tối thượng: +200 MB</li>
              </ul>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/50">
              <strong className="text-purple-300">🔮 Kỹ năng tiêu hao Magic Balls:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                <li><strong>[Q] Hồn Trảm (500 MB):</strong> Nhát chém 120 sát thương tầm xa.</li>
                <li><strong>[E] Hồn Hồi (650 MB):</strong> Giúp người chơi không chết khi bị trúng sát thương từ Hồn Trảm (giữ lại máu và tiêu hao Hồn Hồi).</li>
                <li><strong>[R] Khiên Thần (650 MB):</strong> Miễn nhiễm toàn bộ sát thương trong 5 giây (cả người chơi và bot đều dùng được).</li>
                <li><strong>[C] Cần Gạt Tự Tạo (2500 MB):</strong> Cho 25 MB/lần gạt, trúng 2 lần Hồn Trảm bị phá (+500 MB & 5% ra mật khẩu).</li>
                <li><strong>[Shift] Bứt Tốc:</strong> Giữ Shift để chạy nhanh hơn (tiêu hao 5 MB mỗi 5 giây chạy). Bot cũng có thể tiêu hao MB để bứt tốc truy đuổi.</li>
                <li><strong>Tường Phòng Thủ Dày Đặc:</strong> Xuất hiện dày đặc khắp bản đồ làm vật cản phòng thủ; cả người chơi bot, quái vật và đạn bình thường đều không thể đi xuyên qua tường.</li>
                <li><strong>Hành vi Tấn Công Của Bot:</strong> 
                  <ul className="list-disc list-inside pl-4 text-slate-300">
                    <li>(1) <strong>Phản kích:</strong> Khi bị bạn tấn công, duy nhất bot đó sẽ truy kích và đánh trả cho đến khi bạn cách xa hơn 100 PGrid (mất dấu) hoặc 1 trong 2 người chết.</li>
                    <li>(2) <strong>Tranh cần gạt:</strong> Khi bot phát hiện bạn lại gần bất kỳ cần gạt nào, nó cũng sẽ chủ động tấn công để tranh giành cần gạt, cho dù bạn có tấn công nó hay không.</li>
                    <li>(3) <strong>Cuồng sát sinh tồn (Còn 30s):</strong> Khi bot chỉ còn 30 giây để thay đổi điểm Magic Balls (sắp hết 2 phút), nó sẽ chuyển sang trạng thái cuồng sát, gặp bất kỳ người chơi nào (user hay bot khác) đều sẽ tấn công tiêu diệt người đó để kiếm điểm thoát chết!</li>
                    <li>(4) <strong>Hòa bình:</strong> Nếu bạn ở xa cần gạt, không tấn công bot và bot chưa vào thế 30s khẩn cấp, bot sẽ hoàn toàn không tấn công bạn mà chỉ tập trung tìm cần gạt.</li>
                  </ul>
                </li>
                <li><strong>Luật Điểm Bất Động (2 Phút) & Shadowing Mode:</strong>
                  <ul className="list-disc list-inside pl-4 text-rose-300">
                    <li>Nếu số điểm Magic Balls không thay đổi trong 2 phút (120s), người chơi sẽ bị tiêu diệt hoàn toàn vĩnh viễn không thể hồi sinh.</li>
                    <li>Khi user bị tiêu diệt hoàn toàn, chuyển sang <strong>Chế độ Quan Sát (Shadowing Mode)</strong>: có thể dùng WASD di chuyển góc nhìn tự do xem các bot thi đấu nhưng không thể điều khiển hay can thiệp. Khi còn sống không có chế độ này.</li>
                    <li>Chỉ có không thay đổi điểm mới làm cho chết hoàn toàn. Còn lại bị hạ gục bình thường (bởi quái, người chơi, chạm biên) đều có thể hồi sinh sau 2s nhưng mất 750 MB (nếu có ≥ 750 MB).</li>
                  </ul>
                </li>
                <li><strong>Chuỗi Hạ Gục (Multi-Kill) trong 1s:</strong> Tiêu diệt người chơi liên tiếp cách nhau không quá 1 giây nhận thêm thưởng Magic Balls:
                  <ul className="list-disc list-inside pl-4 text-amber-300">
                    <li>Double Kill (2 mạng): +50 MB</li>
                    <li>Triple Kill (3 mạng): +100 MB</li>
                    <li>Quadra Kill (4 mạng): +150 MB</li>
                    <li>Mega Kill (từ 5 mạng trở lên): +200 MB</li>
                  </ul>
                </li>
                <li><strong>Cơ Chế Sát Thương Càng Xa Càng Yếu (Tất Cả Vũ Khí):</strong> Tất cả vũ khí tầm gần và tầm xa đều có thể tấn công tầm xa tức thì (chuột trái). Càng lại gần sát thương càng cao (áp sát đạt 100% sát thương tối đa, ở xa suy giảm dần xuống tối thiểu 28%). Tường phòng thủ sẽ chắn đòn đánh.</li>
                <li><strong>[X] Chiêu Thức Đặc Biệt (Dành Cho Vũ Khí Tầm Xa):</strong> Bấm phím [X] hoặc bấm nút trên thanh kỹ năng:
                  <ul className="list-disc list-inside pl-4 text-fuchsia-300">
                    <li><strong>Súng Lục (Bão Đạn Xung Kích):</strong> Bắn tỏa chùm 7 viên đạn ma thuật tốc độ cao đẩy lùi đối thủ.</li>
                    <li><strong>Cung Thần (Mũi Tên Sao Băng):</strong> Mũi tên ánh sáng khổng lồ xuyên qua mọi tường thành và kẻ thù, gây 135 ST.</li>
                    <li><strong>Pháp Trượng Sét (Thiên Lôi Chuỗi Giật):</strong> Giáng sấm sét 140 ST và phóng tia sét chuỗi lan tỏa qua tối đa 5 kẻ địch xung quanh (100 ST mỗi mục tiêu).</li>
                    <li><strong>Trượng Hư Không (Hố Đen Hư Vô):</strong> Bắn hố đen vũ trụ hút toàn bộ kẻ địch xung quanh vào tâm và phát nổ 350 ST hủy diệt.</li>
                  </ul>
                </li>
                <li><strong>Hồi phục tự nhiên:</strong> Tự động hồi phục 1 HP mỗi 15 giây nếu chưa đầy máu.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
