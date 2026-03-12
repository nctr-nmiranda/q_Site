import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { answers } = await request.json()
    
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Answers array is required' 
      }, { status: 400 })
    }

    const session = await storage.getQuizSession(sessionId)
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }

    const results = []

    for (const { questionId, selectedAnswer } of answers) {
      const result = await storage.saveQuizAnswer(sessionId, questionId, selectedAnswer)
      
      const question = session.questions.find(q => q.id === questionId)
      
      results.push({
        questionId,
        isCorrect: result?.isCorrect || false,
        correctAnswer: result?.correctAnswer || '',
        explanation: question?.explanation || null
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { results }
    })
  } catch (error) {
    console.error('Error submitting answers:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to submit answers' 
    }, { status: 500 })
  }
}
