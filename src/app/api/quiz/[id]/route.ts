import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { searchParams } = new URL(request.url)
    const includeQuestions = searchParams.get('questions') === 'true'

    // Try to get metadata first (very fast)
    let metadata = await storage.getQuizMetadata(sessionId)

    // Retry for propagation
    if (!metadata) {
      await new Promise(resolve => setTimeout(resolve, 500))
      metadata = await storage.getQuizMetadata(sessionId)
    }

    if (!metadata) {
      return NextResponse.json({
        success: false,
        error: 'Quiz session not found'
      }, { status: 404 })
    }

    // Get session for answers status
    const session = await storage.getQuizSession(sessionId)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session deep fetch failed' }, { status: 404 })
    }

    const answeredQuestions = Object.values(session.answers).filter(a => a.selectedAnswer !== null)
    const answeredCorrectly = Object.values(session.answers).filter(a => a.isCorrect === true)
    const totalQuestions = metadata.totalQuestions

    const startTime = new Date(metadata.startedAt).getTime()
    const endTime = metadata.completedAt ? new Date(metadata.completedAt).getTime() : Date.now()
    const timeTaken = Math.floor((endTime - startTime) / 1000)

    const responseData: any = {
      sessionId: metadata.id,
      documentTitle: metadata.documentTitle,
      documentId: metadata.documentId,
      status: metadata.status,
      totalQuestions,
      questionsPerPage: metadata.questionsPerPage,
      answeredQuestions: answeredQuestions.length,
      correctAnswersCount: answeredCorrectly.length,
      score: totalQuestions > 0 ? Math.round((answeredCorrectly.length / totalQuestions) * 100) : null,
      timeTaken,
      startedAt: metadata.startedAt,
      completedAt: metadata.completedAt,
      timerEnabled: metadata.timerEnabled,
      timerMinutes: metadata.timerMinutes,
      correctAnswers: metadata.correctAnswers
    }

    if (includeQuestions) {
      responseData.questions = session.questions
    }

    return NextResponse.json({
      success: true,
      data: responseData
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

    const metadata = await storage.completeQuizSession(sessionId)

    if (!metadata) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }

    const correctAnswers = await storage.countCorrectAnswers(sessionId)

    const totalQuestions = metadata.totalQuestions
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    const startedAt = new Date(metadata.startedAt).getTime()
    const completedAt = metadata.completedAt ? new Date(metadata.completedAt).getTime() : Date.now()
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
