// Game Store - localStorage thay SQLite

export interface Question {
  id: number;
  subject: string;
  difficulty: string;
  type: string;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

const STORAGE_KEY = 'rcv_questions';

let nextId = 1;

function loadQuestions(): Question[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const questions = JSON.parse(data) as Question[];
      if (questions.length > 0) {
        nextId = Math.max(...questions.map(q => q.id)) + 1;
      }
      return questions;
    }
  } catch (e) {
    console.warn('[GameStore] Lỗi đọc localStorage:', e);
  }
  return getDefaultQuestions();
}

function saveQuestions(questions: Question[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function getDefaultQuestions(): Question[] {
  const defaults: Question[] = [
    {
      id: 1,
      subject: 'Toán học',
      difficulty: 'easy',
      type: 'multiple_choice',
      content: '2 + 2 = ?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: '2 + 2 = 4 là phép tính cơ bản',
      points: 100,
    },
    {
      id: 2,
      subject: 'Khoa học',
      difficulty: 'medium',
      type: 'multiple_choice',
      content: 'Hành tinh nào lớn nhất Hệ Mặt Trời?',
      options: ['Trái Đất', 'Sao Thổ', 'Sao Mộc', 'Sao Hỏa'],
      correctAnswer: 2,
      explanation: 'Sao Mộc là hành tinh lớn nhất trong Hệ Mặt Trời',
      points: 100,
    },
  ];
  nextId = 3;
  saveQuestions(defaults);
  return defaults;
}

export function getAllQuestions(): Question[] {
  return loadQuestions();
}

export function addQuestion(q: Omit<Question, 'id'>): Question {
  const questions = loadQuestions();
  const newQuestion: Question = { ...q, id: nextId++ };
  questions.push(newQuestion);
  saveQuestions(questions);
  return newQuestion;
}

export function addQuestions(items: Omit<Question, 'id'>[]): Question[] {
  const questions = loadQuestions();
  const newQuestions: Question[] = items.map(q => ({ ...q, id: nextId++ }));
  questions.push(...newQuestions);
  saveQuestions(questions);
  return newQuestions;
}

export function deleteQuestion(id: number): void {
  const questions = loadQuestions().filter(q => q.id !== id);
  saveQuestions(questions);
}
