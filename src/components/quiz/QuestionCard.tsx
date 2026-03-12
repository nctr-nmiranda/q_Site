import { cn } from '@/lib/utils'
import { AnswerButton, AnswerState } from './AnswerButton'

interface Choice {
  id: string
  text: string
}

interface Question {
  id: string
  questionNumber: number
  questionText: string
  choices: Choice[]
  explanation?: string | null
}

interface Answer {
  selectedAnswer?: string
  correctAnswer?: string
  isCorrect?: boolean
  submitted?: boolean
  pending?: boolean
}

interface QuestionCardProps {
  question: Question
  answer?: Answer
  showAnswer?: boolean
  showExplanation?: boolean
  onSelectAnswer: (answerId: string) => void
  className?: string
}

export function QuestionCard({
  question,
  answer,
  showAnswer = false,
  showExplanation = false,
  onSelectAnswer,
  className
}: QuestionCardProps) {
  const getAnswerState = (letter: string): AnswerState => {
    // No answer for this question yet
    if (!answer) {
      return 'default'
    }

    // Has selected an answer but not submitted to server yet
    if (answer.submitted && answer.pending && answer.selectedAnswer === letter) {
      return 'selected'
    }

    // Has selected an answer (not revealed yet)
    if (answer.submitted && !showAnswer && answer.selectedAnswer === letter) {
      return 'selected'
    }

    // Show correct/incorrect after reveal
    if (showAnswer && answer.submitted) {
      if (letter === answer.correctAnswer) {
        return 'correct'
      }
      if (letter === answer.selectedAnswer && !answer.isCorrect) {
        return 'incorrect'
      }
    }

    return 'default'
  }

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 p-4 sm:p-6', className)}>
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-lg text-sm">
          Q{question.questionNumber}
        </span>
        {answer?.pending && (
          <span className="text-sm text-amber-600 font-medium">Pending...</span>
        )}
        {showAnswer && answer?.submitted && !answer?.pending && (
          answer.isCorrect ? (
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Correct
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Incorrect
            </span>
          )
        )}
      </div>

      <p className="text-lg text-slate-900 mb-6 leading-relaxed">
        {question.questionText}
      </p>

      <div className="space-y-3">
        {question.choices.map((choice) => (
          <AnswerButton
            key={choice.id}
            letter={choice.id}
            text={choice.text}
            state={getAnswerState(choice.id)}
            showCorrect={showAnswer}
            onClick={() => !answer?.submitted && onSelectAnswer(choice.id)}
            disabled={answer?.submitted && showAnswer}
          />
        ))}
      </div>

      {showAnswer && showExplanation && question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-semibold text-blue-900">Explanation</h4>
          </div>
          <p className="text-blue-800 leading-relaxed">{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
