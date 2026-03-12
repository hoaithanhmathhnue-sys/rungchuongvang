import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, Trophy, Clock, CheckCircle2, XCircle } from 'lucide-react';
import MathText from '../../components/MathText';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import confetti from 'canvas-confetti';
import { useGame } from '../../contexts/GameContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function HostRoom() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const {
    room,
    players,
    gameState,
    currentQuestion,
    answerResult,
    answers,
    startGame,
    nextQuestion,
    showAnswer,
  } = useGame();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer for questions
  useEffect(() => {
    if (gameState === 'playing' && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            showAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentQuestion]);

  // Auto show answer when everyone answered
  useEffect(() => {
    if (gameState === 'playing' && players.length > 0) {
      const activePlayers = players.filter(p => !p.isEliminated);
      if (activePlayers.length > 0 && Object.keys(answers).length >= activePlayers.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        showAnswer();
      }
    }
  }, [answers, players, gameState]);

  const getChartData = () => {
    if (!currentQuestion) return null;
    
    const counts = [0, 0, 0, 0];
    Object.values(answers).forEach((ans: any) => {
      if (typeof ans === 'number' && ans >= 0 && ans < 4) counts[ans]++;
    });

    return {
      labels: ['A', 'B', 'C', 'D'],
      datasets: [
        {
          label: 'Số người chọn',
          data: counts,
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(34, 197, 94, 0.8)'
          ],
          borderRadius: 8,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };

  const joinUrl = `${window.location.origin}/play/${pin}`;

  // Fire confetti when game finishes
  useEffect(() => {
    if (gameState === 'finished') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    }
  }, [gameState]);

  if (gameState === 'waiting' || gameState === 'idle') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-4xl w-full text-center space-y-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
            RUNG CHUÔNG VÀNG
          </h1>
          
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-center gap-12 text-slate-800">
            <div className="space-y-4">
              <p className="text-2xl font-bold text-slate-500">MÃ PHÒNG</p>
              <p className="text-8xl font-black tracking-widest text-slate-900">{pin}</p>
              <p className="text-lg text-slate-500">Truy cập <span className="font-bold text-indigo-600">{window.location.origin}/play</span></p>
            </div>
            <div className="hidden md:block w-px h-48 bg-slate-200"></div>
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 text-2xl font-bold">
              <Users className="text-orange-400" size={32} />
              <span>{players.length} NGƯỜI CHƠI</span>
            </div>
            <button
              onClick={startGame}
              disabled={players.length === 0}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-bold text-2xl shadow-lg disabled:opacity-50 flex items-center gap-3 transform transition hover:scale-105"
            >
              <Play size={28} />
              BẮT ĐẦU
            </button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <AnimatePresence>
              {players.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="px-6 py-3 bg-slate-800 rounded-full font-bold text-lg border border-slate-700 shadow-md flex items-center gap-2"
                >
                  <span className="text-2xl">{p.avatar}</span>
                  {p.name}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-slate-200">
          <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg">
              Câu {currentQuestion.index + 1}/{currentQuestion.total}
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 flex items-center gap-2">
            <Clock className={timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-400'} size={32} />
            <span className={timeLeft <= 5 ? 'text-red-500' : ''}>{timeLeft}</span>
          </div>
          <div className="text-xl font-bold text-slate-600 flex items-center gap-2">
            <Users size={24} />
            {Object.keys(answers).length} / {players.filter(p => !p.isEliminated).length}
          </div>
        </header>

        <main className="flex-1 p-8 max-w-6xl w-full mx-auto flex flex-col items-center justify-center gap-8">
          <div className="w-full text-center">
            <MathText text={currentQuestion.content} tag="h2" className="text-5xl font-black text-slate-800 leading-tight" />
          </div>

          <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
            {currentQuestion.options.map((opt: string, i: number) => {
              const colors = [
                'bg-red-500 border-red-600',
                'bg-blue-500 border-blue-600',
                'bg-yellow-500 border-yellow-600',
                'bg-green-500 border-green-600'
              ];
              return (
                <div key={i} className={`${colors[i]} text-white p-6 rounded-2xl shadow-lg border-b-8 flex items-center gap-4 text-2xl font-bold`}>
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <MathText text={opt} />
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (gameState === 'showingAnswer' && currentQuestion && answerResult) {
    const chartData = getChartData();
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-slate-200">
          <div className="text-xl font-bold text-slate-800">
            Kết quả Câu {currentQuestion.index + 1}
          </div>
          <button
            onClick={nextQuestion}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-2"
          >
            {currentQuestion.index + 1 === currentQuestion.total ? 'XEM KẾT QUẢ CHUNG CUỘC' : 'CÂU TIẾP THEO'}
            <Play size={20} />
          </button>
        </header>

        <main className="flex-1 p-8 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <MathText text={currentQuestion.content} tag="h2" className="text-3xl font-black text-slate-800" />
            
            <div className="grid grid-cols-1 gap-4">
              {currentQuestion.options.map((opt: string, i: number) => {
                const isCorrect = i === answerResult.correctAnswer;
                return (
                  <div key={i} className={`p-4 rounded-xl border-2 flex items-center justify-between ${isCorrect ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-slate-200 text-slate-500 opacity-60'}`}>
                    <div className="flex items-center gap-4 text-xl font-bold">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isCorrect ? 'bg-green-500' : 'bg-slate-300'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <MathText text={opt} />
                    </div>
                    {isCorrect && <CheckCircle2 className="text-green-500" size={32} />}
                  </div>
                );
              })}
            </div>

            {answerResult.explanation && (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
                <p className="font-bold mb-1">Giải thích:</p>
                <p>{answerResult.explanation}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Thống kê câu trả lời</h3>
            <div className="flex-1 min-h-[300px]">
              {chartData && <Bar data={chartData} options={chartOptions} />}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (gameState === 'finished') {
    const topPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 10);
    
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-8 text-white">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-12 drop-shadow-lg flex items-center gap-4">
          <Trophy className="text-yellow-400" size={64} />
          BẢNG XẾP HẠNG CHUNG CUỘC
        </h1>

        <div className="w-full max-w-4xl bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="space-y-4">
            {topPlayers.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-2xl ${i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-900 scale-105 shadow-xl z-10 relative' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-300 text-slate-800' : 'bg-white/5 text-white'}`}
              >
                <div className="flex items-center gap-6">
                  <div className="text-3xl font-black w-12 text-center">
                    {i === 0 ? '👑' : i + 1}
                  </div>
                  <div className="text-4xl">{p.avatar}</div>
                  <div className="text-2xl font-bold">{p.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black">{p.score}</div>
                  <div className="text-sm opacity-80">{p.correctAnswers} câu đúng</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/host')}
          className="mt-12 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-xl backdrop-blur-sm transition"
        >
          QUAY LẠI TRANG CHỦ
        </button>
      </div>
    );
  }

  return null;
}
