import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    
    const session = await storage.getQuizSession(sessionId)
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }
    
    const answeredQuestions = Object.values(session.answers).filter(a => a.selectedAnswer !== null)
    const correctAnswers = Object.values(session.answers).filter(a => a.isCorrect === true)
    const totalQuestions = session.questions.length
    
    const answeredIds = new Set(Object.keys(session.answers))
    const answers = session.questions.map(q => {
      const answer = session.answers[q.id]
      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        choices: q.choices,
        selectedAnswer: answer?.selectedAnswer || null,
        correctAnswer: q.correctAnswer,
        isCorrect: answer?.isCorrect || null,
        explanation: q.explanation
      }
    })
    
    const startTime = new Date(session.startedAt).getTime()
    const endTime = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
    const timeTaken = Math.floor((endTime - startTime) / 1000)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        sessionId: session.id,
        documentTitle: session.documentTitle,
        documentId: session.documentId,
        status: session.status,
        totalQuestions,
        questionsPerPage: session.questionsPerPage,
        answeredQuestions: answeredQuestions.length,
        correctAnswers: correctAnswers.length,
        score: totalQuestions > 0 ? Math.round((correctAnswers.length / totalQuestions) * 100) : null,
        timeTaken,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        timerEnabled: session.timerEnabled,
        timerMinutes: session.timerMinutes,
        questions: session.questions,
        answers
      }
    })
  } catch (error) {
    console.error('Error fetching quiz session:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch quiz session' 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    
    const session = await storage.completeQuizSession(sessionId)
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }
    
    const totalQuestions = session.questions.length
    const correctAnswers = Object.values(session.answers).filter(a => a.isCorrect === true).length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
    const startedAt = new Date(session.startedAt).getTime()
    const completedAt = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
    const timeTaken = Math.floor((completedAt - startedAt) / 1000)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        resultId: sessionId,
        totalQuestions,
        correctAnswers,
        score,
        timeTaken
      }
    })
  } catch (error) {
    console.error('Error completing quiz:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to complete quiz' 
    }, { status: 500 })
  }
}
