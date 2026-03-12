import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { KeyRound, ExternalLink, X } from 'lucide-react';

interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  showSettings: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType>({
  apiKey: '',
  setApiKey: () => {},
  showSettings: () => {},
});

export function useApiKey() {
  return useContext(ApiKeyContext);
}

const STORAGE_KEY = 'rcv_gemini_api_key';

function ApiKeyModal({ open, onClose, onSave, initialKey }: {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  initialKey: string;
}) {
  const [key, setKey] = useState(initialKey);

  useEffect(() => {
    setKey(initialKey);
  }, [initialKey, open]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed) {
      alert('Vui lòng nhập API Key!');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <KeyRound size={28} />
              Thiết Lập API Key
            </h2>
            {initialKey && (
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
                <X size={20} />
              </button>
            )}
          </div>
          <p className="mt-2 text-white/80 text-sm">Nhập API Key Gemini để sử dụng tính năng AI</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition font-mono text-sm"
            />
          </div>

          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition"
          >
            <ExternalLink size={16} />
            Lấy API Key tại Google AI Studio
          </a>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-bold mb-1">📌 Hướng dẫn:</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-700">
              <li>Truy cập <strong>aistudio.google.com/api-keys</strong></li>
              <li>Đăng nhập bằng tài khoản Google</li>
              <li>Nhấn "Create API Key" → Copy key</li>
              <li>Dán key vào ô trên và nhấn "Lưu"</li>
            </ol>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-lg transition transform hover:-translate-y-0.5"
          >
            Lưu API Key
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [modalOpen, setModalOpen] = useState(false);

  // Hiện modal nếu chưa có key
  useEffect(() => {
    if (!apiKey) {
      setModalOpen(true);
    }
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch (e) {
      console.warn('Không thể lưu API key:', e);
    }
    setModalOpen(false);
  }, []);

  const showSettings = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, showSettings }}>
      {children}
      <ApiKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={setApiKey}
        initialKey={apiKey}
      />
    </ApiKeyContext.Provider>
  );
}
