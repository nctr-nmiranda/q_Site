import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const { 
      documentId, 
      questionnaireId,
      shuffleQuestions = false, 
      shuffleAnswers = true,
      questionsPerPage = 10,
      timerEnabled = false,
      timerMinutes = null
    } = await request.json()
    
    let session
    
    if (questionnaireId) {
      const questionnaire = await storage.getQuestionnaire(questionnaireId)
      if (!questionnaire) {
        return NextResponse.json({ 
          success: false, 
          error: 'Questionnaire not found' 
        }, { status: 404 })
      }
      
      session = await storage.createQuizSessionFromQuestionnaire({
        questionnaireId,
        shuffleQuestions,
        shuffleAnswers,
        questionsPerPage,
        timerEnabled,
        timerMinutes
      })
    } else if (documentId) {
      const document = await storage.getDocument(documentId)
      if (!document) {
        return NextResponse.json({ 
          success: false, 
          error: 'Document not found' 
        }, { status: 404 })
      }
      
      session = await storage.createQuizSession({
        documentId,
        shuffleQuestions,
        shuffleAnswers,
        questionsPerPage,
        timerEnabled,
        timerMinutes
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Either documentId or questionnaireId is required' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        sessionId: session.id,
        documentTitle: session.documentTitle,
        totalQuestions: session.questions.length,
        questionsPerPage: session.questionsPerPage,
        timerEnabled: session.timerEnabled,
        timerMinutes: session.timerMinutes,
        startedAt: session.startedAt,
        questions: session.questions.map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      }
    })
  } catch (error) {
    console.error('Error creating quiz session:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create quiz session' 
    }, { status: 500 })
  }
}
