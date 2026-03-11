import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'
import { parseDocument } from '@/lib/parser/question-parser'
import { extractTextFromDOCX } from '@/lib/parser/docx-extractor'

export async function GET(request: NextRequest) {
  try {
    const documents = await storage.getAllDocuments()
    
    return NextResponse.json({ 
      success: true, 
      data: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        totalQuestions: doc.totalQuestions,
        createdAt: doc.createdAt
      }))
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch documents' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 })
    }
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only DOCX files are supported.' 
      }, { status: 400 })
    }
    
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }
    
    // Process file in memory - no disk write (works on Vercel)
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Extract text from DOCX
    const rawText = await extractTextFromDOCX(buffer)
    
    const parseResult = parseDocument(rawText)
    
    const questions = parseResult.questions.map(q => ({
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }))
    
    const document = await storage.createDocument({
      title: parseResult.examTitle || file.name.replace(/\.[^/.]+$/, ''),
      filename: file.name,
      filePath: '', // Not saving file to disk
      fileType: file.type,
      fileSize: file.size,
      rawText,
      questions
    })
    
    return NextResponse.json({ 
      success: true, 
      data: {
        id: document.id,
        title: document.title,
        totalQuestions: document.totalQuestions,
        filename: document.filename,
        questions: document.questions.map(q => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      }
    })
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process document' 
    }, { status: 500 })
  }
}
