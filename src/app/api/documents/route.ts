import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'
import { parseDocument } from '@/lib/parser/question-parser'
import { extractTextFromPDF } from '@/lib/parser/pdf-extractor'
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
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only PDF and DOCX are allowed.' 
      }, { status: 400 })
    }
    
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }
    
    const uploadDir = path.join(process.cwd(), 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })
    
    const ext = file.name.split('.').pop()
    const filename = `${uuidv4()}.${ext}`
    const filePath = path.join(uploadDir, filename)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)
    
    let rawText: string
    if (file.type === 'application/pdf') {
      rawText = await extractTextFromPDF(buffer)
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      rawText = await extractTextFromDOCX(buffer)
    } else {
      throw new Error('Unsupported file type')
    }
    
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
      filePath: `/uploads/${filename}`,
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
