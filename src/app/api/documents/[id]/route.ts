import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const document = await storage.getDocument(id)
    
    if (!document) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: document
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch document' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const deleted = await storage.deleteDocument(id)
    
    if (!deleted) {
      return NextResponse.json({ 
        success: false, 
        error: 'Document not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete document' 
    }, { status: 500 })
  }
}
