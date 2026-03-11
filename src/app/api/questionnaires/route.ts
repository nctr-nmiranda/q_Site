import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const questionnaires = await storage.getAllQuestionnaires()
    
    return NextResponse.json({ 
      success: true, 
      data: questionnaires.map(q => ({
        id: q.id,
        name: q.name,
        examTitle: q.examTitle,
        totalQuestions: q.totalQuestions,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching questionnaires:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch questionnaires' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, examTitle, questions } = await request.json()
    
    if (!name || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: name, examTitle, questions' 
      }, { status: 400 })
    }
    
    const questionnaire = await storage.createQuestionnaire({
      name,
      examTitle: examTitle || 'Untitled',
      questions
    })
    
    return NextResponse.json({ 
      success: true, 
      data: {
        id: questionnaire.id,
        name: questionnaire.name,
        examTitle: questionnaire.examTitle,
        totalQuestions: questionnaire.totalQuestions
      }
    })
  } catch (error) {
    console.error('Error creating questionnaire:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create questionnaire' 
    }, { status: 500 })
  }
}
