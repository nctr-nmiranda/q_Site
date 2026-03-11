import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Write buffer to temp file (required for pdf-parse)
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `pdf-${Date.now()}.pdf`)
    await fs.writeFile(tempPath, buffer)
    
    // Use pdftotext command if available (Linux server)
    try {
      const { stdout } = await execAsync(`pdftotext -layout "${tempPath}" -`)
      await fs.unlink(tempPath)
      return stdout
    } catch {
      // Fallback to pdf-parse
    }
    
    // Fallback: use pdf-parse with modified data handling
    const PDFParse = require('pdf-parse')
    const data = await PDFParse(buffer, {
      max: 0, // Get all pages
      version: 'v1.10.100'
    })
    
    // Clean up temp file
    await fs.unlink(tempPath)
    
    return data.text
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}
