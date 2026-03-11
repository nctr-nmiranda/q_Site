import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), 'data')
const DOCUMENTS_DIR = path.join(DATA_DIR, 'documents')
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions')
const QUESTIONNAIRES_DIR = path.join(DATA_DIR, 'questionnaires')

export interface Choice {
  id: string
  text: string
}

export interface Question {
  id: string
  questionNumber: number
  questionText: string
  choices: Choice[]
  correctAnswer: string
  explanation: string | null
}

export interface Document {
  id: string
  title: string
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  totalQuestions: number
  rawText: string
  status: string
  createdAt: string
  updatedAt: string
  questions: Question[]
}

export interface QuizSession {
  id: string
  documentId: string
  questionnaireId?: string
  documentTitle: string
  status: 'in_progress' | 'completed'
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  questionsPerPage: number
  timerEnabled: boolean
  timerMinutes: number | null
  startedAt: string
  completedAt: string | null
  questions: Question[]
  answers: Record<string, { selectedAnswer: string; isCorrect: boolean; correctAnswer: string }>
}

export interface Questionnaire {
  id: string
  name: string
  examTitle: string
  totalQuestions: number
  questions: Question[]
  createdAt: string
  updatedAt: string
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

export const storage = {
  async init() {
    await ensureDir(DOCUMENTS_DIR)
    await ensureDir(SESSIONS_DIR)
    await ensureDir(QUESTIONNAIRES_DIR)
  },

  async getAllDocuments(): Promise<Document[]> {
    await this.init()
    const files = await fs.readdir(DOCUMENTS_DIR).catch(() => [])
    const documents: Document[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const doc = await readJson<Document>(path.join(DOCUMENTS_DIR, file))
        if (doc) {
          documents.push(doc)
        }
      }
    }
    
    return documents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async getDocument(id: string): Promise<Document | null> {
    const filePath = path.join(DOCUMENTS_DIR, `${id}.json`)
    return readJson<Document>(filePath)
  },

  async createDocument(data: {
    title: string
    filename: string
    filePath: string
    fileType: string
    fileSize: number
    rawText: string
    questions: Omit<Question, 'id'>[]
  }): Promise<Document> {
    await this.init()
    
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const document: Document = {
      id,
      title: data.title,
      filename: data.filename,
      filePath: data.filePath,
      fileType: data.fileType,
      fileSize: data.fileSize,
      totalQuestions: data.questions.length,
      rawText: data.rawText,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
      questions: data.questions.map((q, index) => ({
        ...q,
        id: uuidv4()
      }))
    }
    
    await writeJson(path.join(DOCUMENTS_DIR, `${id}.json`), document)
    return document
  },

  async deleteDocument(id: string): Promise<boolean> {
    const filePath = path.join(DOCUMENTS_DIR, `${id}.json`)
    try {
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  },

  async createQuizSession(data: {
    documentId: string
    shuffleQuestions: boolean
    shuffleAnswers: boolean
    questionsPerPage: number
    timerEnabled: boolean
    timerMinutes: number | null
  }): Promise<QuizSession> {
    await this.init()
    
    const document = await this.getDocument(data.documentId)
    if (!document) {
      throw new Error('Document not found')
    }
    
    let questions = [...document.questions]
    
    if (data.shuffleQuestions) {
      questions = this.shuffleArray(questions)
      questions = questions.map((q, i) => ({ ...q, questionNumber: i + 1 }))
    }
    
    if (data.shuffleAnswers) {
      questions = questions.map(q => ({
        ...q,
        choices: this.shuffleArray(q.choices)
      }))
    }
    
    const session: QuizSession = {
      id: uuidv4(),
      documentId: data.documentId,
      documentTitle: document.title,
      status: 'in_progress',
      shuffleQuestions: data.shuffleQuestions,
      shuffleAnswers: data.shuffleAnswers,
      questionsPerPage: data.questionsPerPage,
      timerEnabled: data.timerEnabled,
      timerMinutes: data.timerMinutes,
      startedAt: new Date().toISOString(),
      completedAt: null,
      questions,
      answers: {}
    }
    
    await writeJson(path.join(SESSIONS_DIR, `${session.id}.json`), session)
    return session
  },

  async getQuizSession(id: string): Promise<QuizSession | null> {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`)
    return readJson<QuizSession>(filePath)
  },

  async saveQuizAnswer(
    sessionId: string, 
    questionId: string, 
    selectedAnswer: string
  ): Promise<{ isCorrect: boolean; correctAnswer: string } | null> {
    const session = await this.getQuizSession(sessionId)
    if (!session || session.status === 'completed') {
      return null
    }
    
    const question = session.questions.find(q => q.id === questionId)
    if (!question) {
      return null
    }
    
    const isCorrect = selectedAnswer === question.correctAnswer
    
    session.answers[questionId] = {
      selectedAnswer,
      isCorrect,
      correctAnswer: question.correctAnswer
    }
    
    await writeJson(path.join(SESSIONS_DIR, `${sessionId}.json`), session)
    
    return { isCorrect, correctAnswer: question.correctAnswer }
  },

  async completeQuizSession(id: string): Promise<QuizSession | null> {
    const session = await this.getQuizSession(id)
    if (!session) {
      return null
    }
    
    session.status = 'completed'
    session.completedAt = new Date().toISOString()
    
    await writeJson(path.join(SESSIONS_DIR, `${id}.json`), session)
    return session
  },

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  },

  async getAllQuestionnaires(): Promise<Questionnaire[]> {
    await this.init()
    const files = await fs.readdir(QUESTIONNAIRES_DIR).catch(() => [])
    const questionnaires: Questionnaire[] = []
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const q = await readJson<Questionnaire>(path.join(QUESTIONNAIRES_DIR, file))
        if (q) {
          questionnaires.push(q)
        }
      }
    }
    
    return questionnaires.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  async getQuestionnaire(id: string): Promise<Questionnaire | null> {
    const filePath = path.join(QUESTIONNAIRES_DIR, `${id}.json`)
    return readJson<Questionnaire>(filePath)
  },

  async createQuestionnaire(data: {
    name: string
    examTitle: string
    questions: Omit<Question, 'id'>[]
  }): Promise<Questionnaire> {
    await this.init()
    
    const id = uuidv4()
    const now = new Date().toISOString()
    
    const questionnaire: Questionnaire = {
      id,
      name: data.name,
      examTitle: data.examTitle,
      totalQuestions: data.questions.length,
      questions: data.questions.map((q, index) => ({
        ...q,
        id: uuidv4()
      })),
      createdAt: now,
      updatedAt: now
    }
    
    await writeJson(path.join(QUESTIONNAIRES_DIR, `${id}.json`), questionnaire)
    return questionnaire
  },

  async updateQuestionnaire(id: string, data: {
    name?: string
    examTitle?: string
    questions?: Question[]
  }): Promise<Questionnaire | null> {
    const questionnaire = await this.getQuestionnaire(id)
    if (!questionnaire) {
      return null
    }
    
    questionnaire.name = data.name ?? questionnaire.name
    questionnaire.examTitle = data.examTitle ?? questionnaire.examTitle
    questionnaire.questions = data.questions ?? questionnaire.questions
    questionnaire.totalQuestions = questionnaire.questions.length
    questionnaire.updatedAt = new Date().toISOString()
    
    await writeJson(path.join(QUESTIONNAIRES_DIR, `${id}.json`), questionnaire)
    return questionnaire
  },

  async deleteQuestionnaire(id: string): Promise<boolean> {
    const filePath = path.join(QUESTIONNAIRES_DIR, `${id}.json`)
    try {
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  },

  async createQuizSessionFromQuestionnaire(data: {
    questionnaireId: string
    shuffleQuestions: boolean
    shuffleAnswers: boolean
    questionsPerPage: number
    timerEnabled: boolean
    timerMinutes: number | null
  }): Promise<QuizSession> {
    await this.init()
    
    const questionnaire = await this.getQuestionnaire(data.questionnaireId)
    if (!questionnaire) {
      throw new Error('Questionnaire not found')
    }
    
    let questions = [...questionnaire.questions]
    
    if (data.shuffleQuestions) {
      questions = this.shuffleArray(questions)
      questions = questions.map((q, i) => ({ ...q, questionNumber: i + 1 }))
    }
    
    if (data.shuffleAnswers) {
      questions = questions.map(q => ({
        ...q,
        choices: this.shuffleArray(q.choices)
      }))
    }
    
    const session: QuizSession = {
      id: uuidv4(),
      documentId: '',
      questionnaireId: data.questionnaireId,
      documentTitle: questionnaire.name,
      status: 'in_progress',
      shuffleQuestions: data.shuffleQuestions,
      shuffleAnswers: data.shuffleAnswers,
      questionsPerPage: data.questionsPerPage,
      timerEnabled: data.timerEnabled,
      timerMinutes: data.timerMinutes,
      startedAt: new Date().toISOString(),
      completedAt: null,
      questions,
      answers: {}
    }
    
    await writeJson(path.join(SESSIONS_DIR, `${session.id}.json`), session)
    return session
  }
}
