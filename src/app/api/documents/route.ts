import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'
import { parseDocument } from '@/lib/parser/question-parser'

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
    const contentType = request.headers.get('content-type') || ''

    let rawText: string
    let filename: string

    // Check if receiving JSON with pre-extracted text (client-side extraction)
    if (contentType.includes('application/json')) {
      const body = await request.json()

      if (body.text) {
        rawText = body.text
        filename = body.filename || 'document.txt'
      } else if (body.file) {
        // Old format - file as base64
        return NextResponse.json({
          success: false,
          error: 'Please use the updated upload method. Refresh the page and try again.'
        }, { status: 400 })
      } else {
        return NextResponse.json({
          success: false,
          error: 'No text content provided'
        }, { status: 400 })
      }
    } else {
      // Old formData format - try to parse but likely won't work on Vercel
      return NextResponse.json({
        success: false,
        error: 'Please refresh the page and try again.'
      }, { status: 400 })
    }

    // Parse the extracted text
    const parseResult = parseDocument(rawText)

    const questions = parseResult.questions.map(q => ({
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }))

    // Validate we got some questions
    if (questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No questions found in document. Please check the format.'
      }, { status: 400 })
    }

    const document = await storage.createDocument({
      title: parseResult.examTitle || filename.replace(/\.[^/.]+$/, ''),
      filename,
      filePath: '',
      fileType: 'text/plain',
      fileSize: rawText.length,
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
      error: error instanceof Error ? error.message : 'Failed to process document. Please try again.'
    }, { status: 500 })

  }
}
