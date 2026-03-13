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

export interface QuizMetadata {
  id: string
  documentId?: string
  questionnaireId?: string
  documentTitle: string
  status: 'in_progress' | 'completed'
  totalQuestions: number
  questionsPerPage: number
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  timerEnabled: boolean
  timerMinutes: number | null
  startedAt: string
  completedAt: string | null
  correctAnswers: Record<string, string>
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

    return docs.map((doc: any) => ({
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
      questions: (doc.questions || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((q: any) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices || '[]') as Choice[],
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

    const docAny = doc as any
    return {
      id: docAny.id,
      title: docAny.title,
      filename: docAny.filename,
      filePath: docAny.filePath,
      fileType: docAny.fileType,
      fileSize: docAny.fileSize,
      totalQuestions: docAny.totalQuestions,
      rawText: docAny.rawText,
      status: docAny.status,
      createdAt: docAny.createdAt.toISOString(),
      updatedAt: docAny.updatedAt.toISOString(),
      questions: (docAny.questions || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((q: any) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices || '[]') as Choice[],
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
    // Using any to bypass strict Prisma type checks that might be failing on Vercel
    const doc = await (prisma.document as any).create({
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

    return this.getDocument(doc.id) as Promise<Document>
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

    const session = await (prisma.quizSession as any).create({
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

  async getQuizMetadata(id: string): Promise<QuizMetadata | null> {
    const session = await (prisma.quizSession as any).findUnique({
      where: { id },
      include: {
        document: { select: { title: true, totalQuestions: true } },
        questionnaire: { select: { name: true, totalQuestions: true } },
      }
    })

    if (!session) return null

    const totalQuestions = session.document?.totalQuestions || session.questionnaire?.totalQuestions || 0
    const title = session.document?.title || session.questionnaire?.name || ''

    return {
      id: session.id,
      documentId: session.documentId || undefined,
      questionnaireId: session.questionnaireId || undefined,
      documentTitle: title,
      status: session.status as 'in_progress' | 'completed',
      totalQuestions,
      questionsPerPage: 10, // Default or from session if added to schema
      shuffleQuestions: session.shuffleQuestions,
      shuffleAnswers: session.shuffleAnswers,
      timerEnabled: false,
      timerMinutes: null,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
      correctAnswers: await this.getCorrectAnswersMap(id)
    }
  },

  async getCorrectAnswersMap(sessionId: string): Promise<Record<string, string>> {
    const session = await (prisma.quizSession as any).findUnique({
      where: { id: sessionId },
      select: { documentId: true, questionnaireId: true }
    })

    if (!session) return {}

    let questions: { id: string, correctAnswer: string }[] = []

    if (session.documentId) {
      questions = await prisma.question.findMany({
        where: { documentId: session.documentId },
        select: { id: true, correctAnswer: true }
      })
    } else if (session.questionnaireId) {
      questions = await (prisma as any).questionnaireQuestion.findMany({
        where: { questionnaireId: session.questionnaireId },
        select: { id: true, correctAnswer: true }
      })
    }

    const map: Record<string, string> = {}
    questions.forEach(q => {
      map[q.id] = q.correctAnswer
    })
    return map
  },

  async getQuestionsPaginated(sessionId: string, page: number, limit: number): Promise<Question[]> {
    const session = await (prisma.quizSession as any).findUnique({
      where: { id: sessionId },
      select: { documentId: true, questionnaireId: true, shuffleQuestions: true, shuffleAnswers: true }
    })

    if (!session) return []

    let questions: any[] = []
    const skip = (page - 1) * limit

    if (session.documentId) {
      questions = await prisma.question.findMany({
        where: { documentId: session.documentId },
        orderBy: { orderIndex: 'asc' },
        skip,
        take: limit
      })
    } else if (session.questionnaireId) {
      questions = await (prisma as any).questionnaireQuestion.findMany({
        where: { questionnaireId: session.questionnaireId },
        orderBy: { questionNumber: 'asc' },
        skip,
        take: limit
      })
    }

    return questions.map((q: any) => {
      let choices = JSON.parse(q.choices || '[]') as Choice[]
      if (session.shuffleAnswers) {
        choices = this.shuffleArray(choices)
      }
      return {
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }
    })
  },

  async getQuizSession(id: string): Promise<QuizSession | null> {
    const session = await (prisma.quizSession as any).findUnique({
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
      questions = (session.document.questions || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((q: any) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices || '[]') as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    } else if (session.questionnaire) {
      title = session.questionnaire.name
      questions = (session.questionnaire.questions || []).sort((a: any, b: any) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((q: any) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: JSON.parse(q.choices || '[]') as Choice[],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
    }

    const answers: Record<string, { selectedAnswer: string; isCorrect: boolean; correctAnswer: string }> = {}
    if (session.answers) {
      session.answers.forEach((ans: any) => {
        const q = questions.find(question => question.id === ans.questionId)
        if (q) {
          answers[ans.questionId] = {
            selectedAnswer: ans.selectedAnswer || '',
            isCorrect: ans.isCorrect || false,
            correctAnswer: q.correctAnswer
          }
        }
      })
    }

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
    const session = await (prisma.quizSession as any).findUnique({
      where: { id: sessionId },
      select: { status: true, documentId: true, questionnaireId: true }
    })

    if (!session || session.status === 'completed') {
      return null
    }

    let question: any = null
    if (session.documentId) {
      question = await prisma.question.findUnique({ where: { id: questionId } })
    } else if (session.questionnaireId) {
      question = await (prisma as any).questionnaireQuestion.findUnique({ where: { id: questionId } })
    }

    if (!question) return null

    const isCorrect = selectedAnswer === question.correctAnswer

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

  async countCorrectAnswers(sessionId: string): Promise<number> {
    return await prisma.quizAnswer.count({
      where: { sessionId, isCorrect: true }
    })
  },

  async completeQuizSession(id: string) {
    await prisma.quizSession.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    })

    return this.getQuizMetadata(id)
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
    const qs = await (prisma as any).questionnaire.findMany({
      include: { questions: true },
      orderBy: { updatedAt: 'desc' }
    })

    return qs.map((q: any) => ({
      id: q.id,
      name: q.name,
      examTitle: q.examTitle,
      totalQuestions: q.totalQuestions,
      questions: (q.questions || []).sort((a: any, b: any) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((qq: any) => ({
        id: qq.id,
        questionNumber: qq.questionNumber,
        questionText: qq.questionText,
        choices: JSON.parse(qq.choices || '[]') as Choice[],
        correctAnswer: qq.correctAnswer,
        explanation: qq.explanation
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString()
    }))
  },

  async getQuestionnaire(id: string): Promise<Questionnaire | null> {
    const q = await (prisma as any).questionnaire.findUnique({
      where: { id },
      include: { questions: true }
    })

    if (!q) return null

    return {
      id: q.id,
      name: q.name,
      examTitle: q.examTitle,
      totalQuestions: q.totalQuestions,
      questions: (q.questions || []).sort((a: any, b: any) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((qq: any) => ({
        id: qq.id,
        questionNumber: qq.questionNumber,
        questionText: qq.questionText,
        choices: JSON.parse(qq.choices || '[]') as Choice[],
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
    const q = await (prisma as any).questionnaire.create({
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

    return this.getQuestionnaire(q.id) as Promise<Questionnaire>
  },

  async updateQuestionnaire(id: string, data: {
    name?: string
    examTitle?: string
    questions?: Question[]
  }): Promise<Questionnaire | null> {
    if (data.questions) {
      // Delete existing questions
      await (prisma as any).questionnaireQuestion.deleteMany({ where: { questionnaireId: id } })

      await (prisma as any).questionnaire.update({
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
      await (prisma as any).questionnaire.update({
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
      await (prisma as any).questionnaire.delete({ where: { id } })
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

    const session = await (prisma.quizSession as any).create({
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
