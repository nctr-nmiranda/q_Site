import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { questionId, selectedAnswer } = await request.json()
    
    const result = await storage.saveQuizAnswer(sessionId, questionId, selectedAnswer)
    
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save answer' 
      }, { status: 400 })
    }
    
    const session = await storage.getQuizSession(sessionId)
    const question = session?.questions.find(q => q.id === questionId)
    
    return NextResponse.json({ 
      success: true, 
      data: {
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: question?.explanation || null,
        choices: question?.choices || []
      }
    })
  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to submit answer' 
    }, { status: 500 })
  }
}
