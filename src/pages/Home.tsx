import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Play, Users } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 mb-8 drop-shadow-lg">
            RUNG CHUÔNG VÀNG
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/play')}
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-2xl font-bold text-xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
            >
              <Play size={28} />
              VÀO CHƠI NGAY
            </button>
            
            <button
              onClick={() => navigate('/host')}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3 border border-slate-700"
            >
              <Users size={28} />
              GIÁO VIÊN / TẠO PHÒNG
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
