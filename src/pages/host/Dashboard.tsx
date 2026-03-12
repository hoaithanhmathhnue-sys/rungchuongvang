import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Plus, Play, Sparkles, BookOpen, Settings } from 'lucide-react';
import { useApiKey } from '../../contexts/ApiKeyContext';
import { useGame } from '../../contexts/GameContext';
import { getAllQuestions, addQuestions } from '../../services/gameStore';
import { generateQuestions } from '../../services/geminiService';
import type { Question } from '../../services/gameStore';

export default function HostDashboard() {
  const navigate = useNavigate();
  const { apiKey } = useApiKey();
  const { createRoom } = useGame();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState({
    timePerQuestion: 20,
    eliminationMode: true,
    speedBonus: true
  });

  useEffect(() => {
    setQuestions(getAllQuestions());
  }, []);

  const generateWithAI = async () => {
    if (!topic) return alert('Vui lòng nhập chủ đề!');
    if (!apiKey) return alert('Vui lòng nhập API Key trước!');
    setIsGenerating(true);
    try {
      const generated = await generateQuestions(apiKey, topic, count, difficulty);
      const saved = addQuestions(
        generated.map(q => ({
          subject: topic,
          difficulty,
          type: 'multiple_choice',
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 100,
        }))
      );
      setQuestions(prev => [...prev, ...saved]);
      alert('Tạo câu hỏi thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
    setIsGenerating(false);
  };

  const handleCreateRoom = async () => {
    if (selectedQuestions.length === 0) return alert('Vui lòng chọn ít nhất 1 câu hỏi!');
    
    const selectedQData = questions.filter(q => selectedQuestions.includes(q.id));
    const pin = await createRoom(selectedQData, settings);
    navigate(`/host/room/${pin}`);
  };

  const toggleQuestion = (id: number) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <BookOpen className="text-orange-500" />
            QUẢN LÝ CÂU HỎI
          </h1>
          <button
            onClick={handleCreateRoom}
            disabled={selectedQuestions.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center gap-2 hover:scale-105 transition"
          >
            <Play size={20} />
            TẠO PHÒNG CHƠI ({selectedQuestions.length})
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Generator */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
              <Sparkles size={20} />
              Tạo câu hỏi bằng AI
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Chủ đề</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="VD: Lịch sử Việt Nam"
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Số lượng</label>
                  <input
                    type="number"
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    min="1" max="20"
                    className="w-full p-3 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl"
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>
              <button
                onClick={generateWithAI}
                disabled={isGenerating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? 'Đang tạo...' : 'Tạo tự động'}
              </button>
            </div>

            <hr className="my-6 border-slate-200" />
            
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Settings size={20} />
              Cài đặt phòng
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Thời gian/câu (giây)</label>
                <input
                  type="number"
                  value={settings.timePerQuestion}
                  onChange={e => setSettings({...settings, timePerQuestion: Number(e.target.value)})}
                  className="w-full p-3 border border-slate-300 rounded-xl"
                />
              </div>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={settings.eliminationMode}
                  onChange={e => setSettings({...settings, eliminationMode: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="font-medium text-slate-700">Chế độ loại trực tiếp</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={settings.speedBonus}
                  onChange={e => setSettings({...settings, speedBonus: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="font-medium text-slate-700">Thưởng điểm tốc độ</span>
              </label>
            </div>
          </div>

          {/* Question List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Ngân hàng câu hỏi ({questions.length})</h2>
              <button
                onClick={() => setSelectedQuestions(questions.map(q => q.id))}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Chọn tất cả
              </button>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {questions.map((q, idx) => (
                <div 
                  key={q.id} 
                  onClick={() => toggleQuestion(q.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition ${selectedQuestions.includes(q.id) ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                >
                  <div className="flex gap-4">
                    <div className="pt-1">
                      <input 
                        type="checkbox" 
                        checked={selectedQuestions.includes(q.id)}
                        readOnly
                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-600 rounded-md uppercase">
                          {q.subject}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 mb-3">{idx + 1}. {q.content}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, i: number) => (
                          <div key={i} className={`p-2 rounded-lg text-sm ${i === q.correctAnswer ? 'bg-green-100 border border-green-300 font-medium text-green-800' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Chưa có câu hỏi nào. Hãy tạo mới bằng AI!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
