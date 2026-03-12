import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';
import { database, ref, set, get, onValue, update, remove, waitForAuth, getCurrentUserId } from '../services/firebaseConfig';
import type { Question } from '../services/gameStore';

// ===== Types =====
export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  isEliminated: boolean;
  tabId: string; // Firebase uid
}

export interface RoomSettings {
  timePerQuestion: number;
  eliminationMode: boolean;
  speedBonus: boolean;
}

export interface Room {
  id: string;
  pin: string;
  hostTabId: string;
  questions: Question[];
  settings: RoomSettings;
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, Player>;
  currentQuestionIndex: number;
  answers: Record<string, number>;
  answerTimes: Record<string, number>;
  questionStartTime: number;
}

interface GameContextType {
  tabId: string;
  room: Room | null;
  // Host actions
  createRoom: (questions: Question[], settings: RoomSettings) => Promise<string>;
  startGame: () => void;
  nextQuestion: () => void;
  showAnswer: () => void;
  // Player actions
  joinRoom: (pin: string, name: string, avatar: string) => Promise<boolean>;
  submitAnswer: (answerIndex: number) => void;
  // Derived state
  players: Player[];
  currentQuestion: any;
  gameState: 'idle' | 'waiting' | 'playing' | 'showingAnswer' | 'finished';
  answerResult: any;
  answers: Record<string, number>;
  myPlayer: Player | null;
}

const GameContext = createContext<GameContextType>(null!);

export function useGame() {
  return useContext(GameContext);
}

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [tabId, setTabId] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'playing' | 'showingAnswer' | 'finished'>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);

  const roomRef_ = useRef(room);
  roomRef_.current = room;
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Init auth
  useEffect(() => {
    waitForAuth().then(uid => {
      setTabId(uid);
    });
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const isHost = room?.hostTabId === tabId;

  // Listen to room changes from Firebase
  const listenToRoom = useCallback((pin: string) => {
    // Unsubscribe previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const roomDbRef = ref(database, `rooms/${pin}`);
    const unsub = onValue(roomDbRef, (snapshot) => {
      const data = snapshot.val() as Room | null;
      if (!data) {
        console.log('[Game] Room deleted');
        return;
      }

      setRoom(data);

      // Update game state based on room status
      if (data.status === 'finished') {
        setGameState('finished');
      }

      // Update answers
      if (data.answers) {
        setAnswers(data.answers);
      }

      // Update current question
      if (data.currentQuestionIndex >= 0 && data.questions && data.currentQuestionIndex < data.questions.length) {
        const q = data.questions[data.currentQuestionIndex];
        setCurrentQuestion({
          index: data.currentQuestionIndex,
          total: data.questions.length,
          content: q.content,
          options: q.options,
          timeLimit: data.settings.timePerQuestion,
        });
      }

      // Update myPlayer
      const players = data.players || {};
      const me = Object.values(players).find(p => p.tabId === getCurrentUserId());
      if (me) {
        setMyPlayer(me);
      }
    });

    unsubscribeRef.current = unsub;
  }, []);

  // ===== Host Actions =====
  const createRoom = useCallback(async (questions: Question[], settings: RoomSettings): Promise<string> => {
    const uid = await waitForAuth();
    const pin = generatePin();
    const newRoom: Room = {
      id: `room_${Date.now()}`,
      pin,
      hostTabId: uid,
      questions,
      settings,
      status: 'waiting',
      players: {},
      currentQuestionIndex: -1,
      answers: {},
      answerTimes: {},
      questionStartTime: 0,
    };

    await set(ref(database, `rooms/${pin}`), newRoom);
    setRoom(newRoom);
    setGameState('waiting');
    listenToRoom(pin);
    return pin;
  }, [listenToRoom]);

  const startGame = useCallback(async () => {
    if (!room || !isHost) return;
    const pin = room.pin;

    const q = room.questions[0];
    if (!q) return;

    const updates: any = {
      [`rooms/${pin}/status`]: 'playing',
      [`rooms/${pin}/currentQuestionIndex`]: 0,
      [`rooms/${pin}/answers`]: {},
      [`rooms/${pin}/answerTimes`]: {},
      [`rooms/${pin}/questionStartTime`]: Date.now(),
    };

    const dbRef = ref(database);
    await update(dbRef, updates);
    setGameState('playing');
    setAnswers({});
  }, [room, isHost]);

  const nextQuestion = useCallback(async () => {
    if (!room || !isHost) return;
    const pin = room.pin;
    const nextIdx = room.currentQuestionIndex + 1;

    if (nextIdx < room.questions.length) {
      const updates: any = {
        [`rooms/${pin}/currentQuestionIndex`]: nextIdx,
        [`rooms/${pin}/answers`]: {},
        [`rooms/${pin}/answerTimes`]: {},
        [`rooms/${pin}/questionStartTime`]: Date.now(),
      };
      await update(ref(database), updates);
      setGameState('playing');
      setAnswers({});
      setAnswerResult(null);
    } else {
      // Game finished
      await update(ref(database), {
        [`rooms/${pin}/status`]: 'finished',
      });
      setGameState('finished');
    }
  }, [room, isHost]);

  const showAnswerRunningRef = useRef(false);

  const showAnswer = useCallback(async () => {
    if (!room || !isHost) return;
    // Chặn gọi 2 lần liên tiếp (double-click, race condition)
    if (showAnswerRunningRef.current) return;
    showAnswerRunningRef.current = true;

    const pin = room.pin;

    // Fetch FRESH data từ Firebase để tránh dùng stale React state
    const freshSnap = await get(ref(database, `rooms/${pin}`));
    if (!freshSnap.exists()) { showAnswerRunningRef.current = false; return; }
    const freshRoom = freshSnap.val() as Room;

    const q = freshRoom.questions[freshRoom.currentQuestionIndex];
    if (!q) { showAnswerRunningRef.current = false; return; }

    const correctIndex = q.correctAnswer;
    const playersObj = freshRoom.players || {};
    const roomAnswers = freshRoom.answers || {};
    const roomTimes = freshRoom.answerTimes || {};

    const updatedPlayers: Record<string, Player> = {};
    const entries = Object.entries(playersObj) as [string, Player][];
    for (const [key, p] of entries) {
      if (p.isEliminated) {
        updatedPlayers[key] = p;
        continue;
      }

      const answer = roomAnswers[p.tabId];
      if (answer === correctIndex) {
        let points = q.points || 100;
        if (freshRoom.settings.speedBonus) {
          const timeTaken = roomTimes[p.tabId] || freshRoom.settings.timePerQuestion * 1000;
          const timeRatio = Math.max(0, 1 - (timeTaken / (freshRoom.settings.timePerQuestion * 1000)));
          points += Math.floor(timeRatio * 50);
        }
        updatedPlayers[key] = {
          ...p,
          score: p.score + points,
          correctAnswers: p.correctAnswers + 1,
        };
      } else if (freshRoom.settings.eliminationMode && answer !== undefined) {
        updatedPlayers[key] = { ...p, isEliminated: true };
      } else {
        updatedPlayers[key] = p;
      }
    }

    // Write updated players and answer result to Firebase
    const result = {
      correctAnswer: correctIndex,
      explanation: q.explanation,
      answers: roomAnswers,
    };

    await update(ref(database), {
      [`rooms/${pin}/players`]: updatedPlayers,
      [`rooms/${pin}/answerResult`]: result,
    });

    setAnswerResult({ ...result, players: Object.values(updatedPlayers) });
    setGameState('showingAnswer');
    showAnswerRunningRef.current = false;
  }, [room, isHost]);

  // ===== Player Actions =====
  const joinRoom = useCallback(async (pin: string, name: string, avatar: string): Promise<boolean> => {
    const uid = await waitForAuth();

    // Check room exists
    const snapshot = await get(ref(database, `rooms/${pin}`));
    if (!snapshot.exists()) return false;

    const roomData = snapshot.val() as Room;
    if (roomData.status !== 'waiting') return false;

    const player: Player = {
      id: `player_${Date.now()}`,
      name,
      avatar,
      score: 0,
      correctAnswers: 0,
      isEliminated: false,
      tabId: uid,
    };

    // Add player to room in Firebase
    await set(ref(database, `rooms/${pin}/players/${uid}`), player);

    setMyPlayer(player);
    setRoom(roomData);
    setGameState('waiting');
    listenToRoom(pin);
    return true;
  }, [listenToRoom]);

  const submitAnswer = useCallback(async (answerIndex: number) => {
    if (!room) return;
    const uid = getCurrentUserId();

    // Kiểm tra xem player đã submit chưa bằng cách đọc trực tiếp từ Firebase
    const existingSnap = await get(ref(database, `rooms/${room.pin}/answers/${uid}`));
    if (existingSnap.exists()) {
      // Đã submit rồi, không ghi đè
      console.warn('[submitAnswer] Đã submit rồi, bỏ qua.');
      return;
    }

    const timeTaken = Date.now() - (room.questionStartTime || Date.now());
    await update(ref(database), {
      [`rooms/${room.pin}/answers/${uid}`]: answerIndex,
      [`rooms/${room.pin}/answerTimes/${uid}`]: timeTaken,
    });
  }, [room]);

  // Derive players array from room.players object
  const players = room?.players ? Object.values(room.players) : [];

  // Listen to answerResult changes
  useEffect(() => {
    if (!room?.pin) return;
    const resultRef = ref(database, `rooms/${room.pin}/answerResult`);
    const unsub = onValue(resultRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const playersArray = room?.players ? Object.values(room.players) : [];
        setAnswerResult({ ...data, players: playersArray });
        setGameState('showingAnswer');
      }
    });
    return () => unsub();
  }, [room?.pin]);

  // Listen to status changes for player side
  useEffect(() => {
    if (!room?.pin) return;
    const statusRef = ref(database, `rooms/${room.pin}/status`);
    const unsub = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (status === 'playing' && gameState === 'waiting') {
        setGameState('playing');
      } else if (status === 'finished') {
        setGameState('finished');
      }
    });
    return () => unsub();
  }, [room?.pin, gameState]);

  // Listen to currentQuestionIndex changes to reset showingAnswer
  useEffect(() => {
    if (!room?.pin) return;
    const qIdxRef = ref(database, `rooms/${room.pin}/currentQuestionIndex`);
    const unsub = onValue(qIdxRef, (snapshot) => {
      const idx = snapshot.val();
      if (typeof idx === 'number' && idx >= 0) {
        // New question arrived, switch to playing
        if (gameState === 'showingAnswer' || gameState === 'waiting') {
          setGameState('playing');
          setAnswerResult(null);
          setAnswers({});
        }
      }
    });
    return () => unsub();
  }, [room?.pin, gameState]);

  return (
    <GameContext.Provider value={{
      tabId,
      room,
      createRoom,
      startGame,
      nextQuestion,
      showAnswer,
      joinRoom,
      submitAnswer,
      players,
      currentQuestion,
      gameState,
      answerResult,
      answers,
      myPlayer,
    }}>
      {children}
    </GameContext.Provider>
  );
}
