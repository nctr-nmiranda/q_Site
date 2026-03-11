export interface Question {
  id: string
  documentId: string
  questionNumber: number
  questionText: string
  choices: string[]
  correctAnswer: string
  explanation: string | null
  orderIndex: number
}

export interface Document {
  id: string
  userId: string
  title: string
  filename: string
  fileType: string
  fileSize: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalQuestions: number
  createdAt: Date
}

export interface QuizSession {
  id: string
  documentId: string
  userId: string
  status: 'in_progress' | 'completed'
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  startedAt: Date
  completedAt: Date | null
}

export interface QuizAnswer {
  id: string
  sessionId: string
  questionId: string
  selectedAnswer: string | null
  isCorrect: boolean | null
}

export interface QuizResult {
  id: string
  sessionId: string
  userId: string
  documentId: string
  totalQuestions: number
  correctAnswers: number
  score: number
  timeTaken: number
  completedAt: Date
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
