import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID is required'
      }, { status: 400 })
    }

    // 1. Try as a quiz session first
    let session = await storage.getQuizSession(id)
    if (session) {
      if (session.status === 'completed') {
        return NextResponse.json({
          success: true,
          data: { type: 'completed', resultId: id }
        })
      }
      return NextResponse.json({
        success: true,
        data: { type: 'session', sessionId: session.id }
      })
    }

    // 2. Try as a questionnaire - create new session
    const questionnaire = await storage.getQuestionnaire(id)
    if (questionnaire) {
      const newSession = await storage.createQuizSessionFromQuestionnaire({
        questionnaireId: id,
        shuffleQuestions: false,
        shuffleAnswers: true,
        questionsPerPage: 10,
        timerEnabled: false,
        timerMinutes: null
      })
      return NextResponse.json({
        success: true,
        data: { type: 'session', sessionId: newSession.id }
      })
    }

    // 3. Try as a document - create new session
    const document = await storage.getDocument(id)
    if (document) {
      const newSession = await storage.createQuizSession({
        documentId: id,
        shuffleQuestions: false,
        shuffleAnswers: true,
        questionsPerPage: 10,
        timerEnabled: false,
        timerMinutes: null
      })
      return NextResponse.json({
        success: true,
        data: { type: 'session', sessionId: newSession.id }
      })
    }

    // Not found
    return NextResponse.json({
      success: false,
      error: 'Quiz, questionnaire, or document not found'
    }, { status: 404 })

  } catch (error) {
    console.error('Error resolving quiz:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to resolve quiz'
    }, { status: 500 })
  }
}
