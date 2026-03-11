export interface ParsedQuestion {
  questionNumber: number
  questionText: string
  choices: { id: string; text: string }[]
  correctAnswer: string
  explanation: string | null
}

export interface ParseResult {
  examTitle: string
  totalQuestions: number
  questions: ParsedQuestion[]
}

const patterns = {
  questionStart: /^(?:Question|Q)\s*[:.]?\s*(\d+)/i,
  questionStartAlt: /^(\d+)[\.)]\s*(.+)/,
  answer: /^(?:Answer|ANS|Ans)\s*[:.]?\s*([A-Z])/i,
  answerAlt: /^(?:Answer|ANS|Ans)\s*[:.]?\s*([A-Z])[\s:]+(.+)/i,
  explanation: /^(?:Explanation|EXP)\s*[:.]?\s*/i,
  choice: /^([A-Z])[\.)]\s+(.+)/,
  choiceAlt: /^([A-Z])\s+(.+)/,
  totalQuestions: /(?:Total| total)\s*[:.]?\s*(\d+)\s*Questions?/i,
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractChoices(lines: string[], startIndex: number): { choices: { id: string; text: string }[]; endIndex: number } {
  const choices: { id: string; text: string }[] = []
  let i = startIndex
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    if (!line) {
      i++
      continue
    }
    
    const choiceMatch = line.match(patterns.choice) || line.match(patterns.choiceAlt)
    if (choiceMatch) {
      choices.push({
        id: choiceMatch[1].toUpperCase(),
        text: choiceMatch[2].trim()
      })
      i++
      continue
    }
    
    if (line.match(patterns.questionStart) || line.match(patterns.answer) || 
        line.match(patterns.explanation) || line.toLowerCase().startsWith('explanation')) {
      break
    }
    
    if (line.length > 0 && choices.length > 0) {
      const lastChoice = choices[choices.length - 1]
      lastChoice.text += ' ' + line
      i++
      continue
    }
    
    if (line.match(/^(?:Total|Question|Q\d)/i)) {
      break
    }
    
    i++
  }
  
  return { choices, endIndex: i }
}

function extractExplanation(lines: string[], startIndex: number): { explanation: string; endIndex: number } {
  const explanationLines: string[] = []
  let i = startIndex
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    if (!line) {
      i++
      continue
    }
    
    if (line.match(patterns.questionStart)) {
      break
    }
    
    if (line.match(/^(?:Question|Q)\s*[:.]?\s*\d+/i)) {
      break
    }
    
    explanationLines.push(line)
    i++
  }
  
  return {
    explanation: explanationLines.join(' ').trim(),
    endIndex: i
  }
}

export function parseDocument(rawText: string): ParseResult {
  const normalizedText = normalizeText(rawText)
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean)
  
  const questions: ParsedQuestion[] = []
  
  let examTitle = ''
  let totalQuestions = 0
  let currentQuestion: Partial<ParsedQuestion> = {}
  let currentQuestionText: string[] = []
  let state: 'looking' | 'question' | 'choices' | 'answer' | 'explanation' = 'looking'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const upperLine = line.toUpperCase()
    
    const totalMatch = line.match(patterns.totalQuestions)
    if (totalMatch) {
      totalQuestions = parseInt(totalMatch[1])
    }
    
    if (!examTitle && line.length > 3 && !upperLine.startsWith('QUESTION') && 
        !upperLine.startsWith('Q.') && !upperLine.startsWith('ANSWER') && 
        !upperLine.startsWith('EXPLANATION') && !upperLine.startsWith('TOTAL') &&
        !line.match(/^\d+[\.)]\s*/)) {
      examTitle = line
    }
    
    const qMatch = line.match(patterns.questionStart)
    if (qMatch) {
      if (currentQuestion.questionNumber !== undefined) {
        questions.push({
          questionNumber: currentQuestion.questionNumber,
          questionText: currentQuestionText.join(' ').trim(),
          choices: currentQuestion.choices || [],
          correctAnswer: currentQuestion.correctAnswer || '',
          explanation: currentQuestion.explanation || null
        })
      }
      
      currentQuestion = {}
      currentQuestionText = []
      state = 'question'
      currentQuestion.questionNumber = parseInt(qMatch[1])
      continue
    }
    
    if (state === 'question' && !line.match(patterns.choice) && !line.match(patterns.choiceAlt)) {
      const ansMatch = line.match(patterns.answer)
      if (ansMatch) {
        currentQuestion.correctAnswer = ansMatch[1]
        state = 'answer'
        
        const ansAltMatch = line.match(patterns.answerAlt)
        if (ansAltMatch && ansAltMatch[2]) {
          currentQuestionText.push(ansAltMatch[2].trim())
        }
        continue
      }
      
      if (upperLine.startsWith('EXPLANATION') || line.match(patterns.explanation)) {
        const result = extractExplanation(lines, i + 1)
        currentQuestion.explanation = result.explanation
        i = result.endIndex - 1
        state = 'explanation'
        continue
      }
      
      if (line.match(patterns.choice) || line.match(patterns.choiceAlt)) {
        const choiceResult = extractChoices(lines, i)
        currentQuestion.choices = choiceResult.choices
        i = choiceResult.endIndex - 1
        state = 'choices'
        continue
      }
      
      if (currentQuestionText.length === 0 || !line.match(/^(Answer|Total|Question|Q\d)/i)) {
        currentQuestionText.push(line)
      }
      continue
    }
    
    if (state === 'choices' || state === 'question') {
      const ansMatch = line.match(patterns.answer)
      if (ansMatch) {
        currentQuestion.correctAnswer = ansMatch[1]
        state = 'answer'
        continue
      }
      
      if (line.match(patterns.choice) || line.match(patterns.choiceAlt)) {
        const choiceResult = extractChoices(lines, i)
        currentQuestion.choices = [...(currentQuestion.choices || []), ...choiceResult.choices]
        i = choiceResult.endIndex - 1
        continue
      }
      
      if (upperLine.startsWith('EXPLANATION') || line.match(patterns.explanation)) {
        const result = extractExplanation(lines, i + 1)
        currentQuestion.explanation = result.explanation
        i = result.endIndex - 1
        state = 'explanation'
        continue
      }
    }
    
    if (state === 'answer') {
      if (line.match(patterns.questionStart)) {
        const qMatch = line.match(patterns.questionStart)
        if (qMatch) {
          if (currentQuestion.questionNumber !== undefined) {
            questions.push({
              questionNumber: currentQuestion.questionNumber,
              questionText: currentQuestionText.join(' ').trim(),
              choices: currentQuestion.choices || [],
              correctAnswer: currentQuestion.correctAnswer || '',
              explanation: currentQuestion.explanation || null
            })
          }
          
          currentQuestion = { questionNumber: parseInt(qMatch[1]) }
          currentQuestionText = []
          state = 'question'
        }
        continue
      }
      
      if (upperLine.startsWith('EXPLANATION') || line.match(patterns.explanation)) {
        const result = extractExplanation(lines, i + 1)
        currentQuestion.explanation = result.explanation
        i = result.endIndex - 1
        state = 'explanation'
        continue
      }
    }
  }
  
  if (currentQuestion.questionNumber !== undefined) {
    questions.push({
      questionNumber: currentQuestion.questionNumber,
      questionText: currentQuestionText.join(' ').trim(),
      choices: currentQuestion.choices || [],
      correctAnswer: currentQuestion.correctAnswer || '',
      explanation: currentQuestion.explanation || null
    })
  }
  
  const seen = new Set<number>()
  const uniqueQuestions = questions.filter(q => {
    if (seen.has(q.questionNumber)) {
      return false
    }
    seen.add(q.questionNumber)
    return true
  })
  
  return {
    examTitle: examTitle || 'Untitled Exam',
    totalQuestions: totalQuestions || uniqueQuestions.length,
    questions: uniqueQuestions
  }
}
