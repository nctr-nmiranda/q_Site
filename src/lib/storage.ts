import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

// Reuse original interfaces for compatibility
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

export const storage = {
  async init() {
    // No initialization needed for Prisma usually
  },

  async getAllDocuments(): Promise<Document[]> {
    const docs = await prisma.document.findMany({
      include: {
        questions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      filePath: doc.filePath,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      totalQuestions: doc.totalQuestions,
      rawText: doc.rawText,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      questions: doc.questions.sort((a, b) => a.orderIndex - b.orderIndex).map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices) as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }))
  },

  async getDocument(id: string): Promise<Document | null> {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { questions: true }
    })

    if (!doc) return null

    return {
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      filePath: doc.filePath,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      totalQuestions: doc.totalQuestions,
      rawText: doc.rawText,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      questions: doc.questions.sort((a, b) => a.orderIndex - b.orderIndex).map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices) as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }
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
    const doc = await prisma.document.create({
      data: {
        title: data.title,
        filename: data.filename,
        filePath: data.filePath,
        fileType: data.fileType,
        fileSize: data.fileSize,
        rawText: data.rawText,
        status: 'completed',
        totalQuestions: data.questions.length,
        questions: {
          create: data.questions.map((q, index) => ({
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            choices: JSON.stringify(q.choices),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            orderIndex: index
          }))
        }
      },
      include: {
        questions: true
      }
    })

    return {
      id: doc.id,
      title: doc.title,
      filename: doc.filename,
      filePath: doc.filePath,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      totalQuestions: doc.totalQuestions,
      rawText: doc.rawText,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      questions: doc.questions.sort((a, b) => a.orderIndex - b.orderIndex).map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices) as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }
  },

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await prisma.document.delete({ where: { id } })
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
    const document = await this.getDocument(data.documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const session = await prisma.quizSession.create({
      data: {
        documentId: data.documentId,
        status: 'in_progress',
        shuffleQuestions: data.shuffleQuestions,
        shuffleAnswers: data.shuffleAnswers,
      }
    })

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

    return {
      id: session.id,
      documentId: data.documentId,
      documentTitle: document.title,
      status: 'in_progress',
      shuffleQuestions: data.shuffleQuestions,
      shuffleAnswers: data.shuffleAnswers,
      questionsPerPage: data.questionsPerPage,
      timerEnabled: data.timerEnabled,
      timerMinutes: data.timerMinutes,
      startedAt: session.startedAt.toISOString(),
      completedAt: null,
      questions,
      answers: {}
    }
  },

  async getQuizSession(id: string): Promise<QuizSession | null> {
    const session = await prisma.quizSession.findUnique({
      where: { id },
      include: {
        document: { include: { questions: true } },
        questionnaire: { include: { questions: true } },
        answers: true
      }
    })

    if (!session) return null

    let questions: Question[] = []
    let title = ''

    if (session.document) {
      title = session.document.title
      questions = session.document.questions.sort((a, b) => a.orderIndex - b.orderIndex).map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices) as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    } else if (session.questionnaire) {
      title = session.questionnaire.name
      questions = session.questionnaire.questions.sort((a, b) => a.questionNumber - b.questionNumber).map(q => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices) as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }

    const answers: Record<string, { selectedAnswer: string; isCorrect: boolean; correctAnswer: string }> = {}
    session.answers.forEach(ans => {
      const q = questions.find(question => question.id === ans.questionId)
      if (q) {
        answers[ans.questionId] = {
          selectedAnswer: ans.selectedAnswer || '',
          isCorrect: ans.isCorrect || false,
          correctAnswer: q.correctAnswer
        }
      }
    })

    return {
      id: session.id,
      documentId: session.documentId || '',
      questionnaireId: session.questionnaireId || undefined,
      documentTitle: title,
      status: session.status as 'in_progress' | 'completed',
      shuffleQuestions: session.shuffleQuestions,
      shuffleAnswers: session.shuffleAnswers,
      questionsPerPage: 10,
      timerEnabled: false,
      timerMinutes: null,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      questions,
      answers
    }
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

    // We'll use a transaction to handle upsert manually since we don't have a composite key in schema
    const existing = await prisma.quizAnswer.findFirst({
      where: { sessionId, questionId }
    })

    if (existing) {
      await prisma.quizAnswer.update({
        where: { id: existing.id },
        data: { selectedAnswer, isCorrect }
      })
    } else {
      await prisma.quizAnswer.create({
        data: { sessionId, questionId, selectedAnswer, isCorrect }
      })
    }

    return { isCorrect, correctAnswer: question.correctAnswer }
  },

  async completeQuizSession(id: string): Promise<QuizSession | null> {
    await prisma.quizSession.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    })

    return this.getQuizSession(id)
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
    const qs = await prisma.questionnaire.findMany({
      include: { questions: true },
      orderBy: { updatedAt: 'desc' }
    })

    return qs.map(q => ({
      id: q.id,
      name: q.name,
      examTitle: q.examTitle,
      totalQuestions: q.totalQuestions,
      questions: q.questions.sort((a, b) => a.questionNumber - b.questionNumber).map(qq => ({
        id: qq.id,
        questionNumber: qq.questionNumber,
        questionText: qq.questionText,
        choices: JSON.parse(qq.choices) as Choice[],
        correctAnswer: qq.correctAnswer,
        explanation: qq.explanation
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString()
    }))
  },

  async getQuestionnaire(id: string): Promise<Questionnaire | null> {
    const q = await prisma.questionnaire.findUnique({
      where: { id },
      include: { questions: true }
    })

    if (!q) return null

    return {
      id: q.id,
      name: q.name,
      examTitle: q.examTitle,
      totalQuestions: q.totalQuestions,
      questions: q.questions.sort((a, b) => a.questionNumber - b.questionNumber).map(qq => ({
        id: qq.id,
        questionNumber: qq.questionNumber,
        questionText: qq.questionText,
        choices: JSON.parse(qq.choices) as Choice[],
        correctAnswer: qq.correctAnswer,
        explanation: qq.explanation
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString()
    }
  },

  async createQuestionnaire(data: {
    name: string
    examTitle: string
    questions: Omit<Question, 'id'>[]
  }): Promise<Questionnaire> {
    const q = await prisma.questionnaire.create({
      data: {
        name: data.name,
        examTitle: data.examTitle,
        totalQuestions: data.questions.length,
        questions: {
          create: data.questions.map(qq => ({
            questionNumber: qq.questionNumber,
            questionText: qq.questionText,
            choices: JSON.stringify(qq.choices),
            correctAnswer: qq.correctAnswer,
            explanation: qq.explanation
          }))
        }
      },
      include: { questions: true }
    })

    return {
      id: q.id,
      name: q.name,
      examTitle: q.examTitle,
      totalQuestions: q.totalQuestions,
      questions: q.questions.sort((a, b) => a.questionNumber - b.questionNumber).map(qq => ({
        id: qq.id,
        questionNumber: qq.questionNumber,
        questionText: qq.questionText,
        choices: JSON.parse(qq.choices) as Choice[],
        correctAnswer: qq.correctAnswer,
        explanation: qq.explanation
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString()
    }
  },

  async updateQuestionnaire(id: string, data: {
    name?: string
    examTitle?: string
    questions?: Question[]
  }): Promise<Questionnaire | null> {
    if (data.questions) {
      // Delete existing questions
      await prisma.questionnaireQuestion.deleteMany({ where: { questionnaireId: id } })

      await prisma.questionnaire.update({
        where: { id },
        data: {
          name: data.name,
          examTitle: data.examTitle,
          totalQuestions: data.questions.length,
          questions: {
            create: data.questions.map(qq => ({
              questionNumber: qq.questionNumber,
              questionText: qq.questionText,
              choices: JSON.stringify(qq.choices),
              correctAnswer: qq.correctAnswer,
              explanation: qq.explanation
            }))
          }
        }
      })
    } else {
      await prisma.questionnaire.update({
        where: { id },
        data: {
          name: data.name,
          examTitle: data.examTitle,
        }
      })
    }

    return this.getQuestionnaire(id)
  },

  async deleteQuestionnaire(id: string): Promise<boolean> {
    try {
      await prisma.questionnaire.delete({ where: { id } })
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
    const questionnaire = await this.getQuestionnaire(data.questionnaireId)
    if (!questionnaire) {
      throw new Error('Questionnaire not found')
    }

    const session = await prisma.quizSession.create({
      data: {
        questionnaireId: data.questionnaireId,
        status: 'in_progress',
        shuffleQuestions: data.shuffleQuestions,
        shuffleAnswers: data.shuffleAnswers,
      }
    })

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

    return {
      id: session.id,
      documentId: '',
      questionnaireId: data.questionnaireId,
      documentTitle: questionnaire.name,
      status: 'in_progress',
      shuffleQuestions: data.shuffleQuestions,
      shuffleAnswers: data.shuffleAnswers,
      questionsPerPage: data.questionsPerPage,
      timerEnabled: data.timerEnabled,
      timerMinutes: data.timerMinutes,
      startedAt: session.startedAt.toISOString(),
      completedAt: null,
      questions,
      answers: {}
    }
  }
}
