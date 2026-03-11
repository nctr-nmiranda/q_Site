import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const questionnaire = await storage.getQuestionnaire(id)
    
    if (!questionnaire) {
      return NextResponse.json({ 
        success: false, 
        error: 'Questionnaire not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: questionnaire
    })
  } catch (error) {
    console.error('Error fetching questionnaire:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch questionnaire' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, examTitle, questions } = await request.json()
    
    const questionnaire = await storage.updateQuestionnaire(id, {
      name,
      examTitle,
      questions
    })
    
    if (!questionnaire) {
      return NextResponse.json({ 
        success: false, 
        error: 'Questionnaire not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: questionnaire
    })
  } catch (error) {
    console.error('Error updating questionnaire:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update questionnaire' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const deleted = await storage.deleteQuestionnaire(id)
    
    if (!deleted) {
      return NextResponse.json({ 
        success: false, 
        error: 'Questionnaire not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting questionnaire:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete questionnaire' 
    }, { status: 500 })
  }
}
