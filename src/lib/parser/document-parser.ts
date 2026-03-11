import { extractTextFromPDF } from './pdf-extractor'
import { extractTextFromDOCX } from './docx-extractor'
import { parseDocument, ParseResult } from './question-parser'

export type SupportedFileType = 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function processDocument(
  buffer: Buffer, 
  fileType: string
): Promise<ParseResult> {
  let rawText: string
  
  if (fileType === 'application/pdf') {
    rawText = await extractTextFromPDF(buffer)
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    rawText = await extractTextFromDOCX(buffer)
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }
  
  // Clean up extracted text
  rawText = cleanText(rawText)
  
  // Parse questions from text
  const result = parseDocument(rawText)
  
  return result
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
