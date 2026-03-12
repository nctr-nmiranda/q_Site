import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui'

interface QuizHeaderProps {
  currentPage: number
  totalPages: number
  currentQuestion: number
  totalQuestions: number
  questionsPerPage: number
  answeredCount: number
  showAnswers: boolean
  showExplanations: boolean
  onToggleAnswers: () => void
  onToggleExplanations: () => void
  onExit?: () => void
  className?: string
}

export function QuizHeader({
  currentPage,
  totalPages,
  currentQuestion,
  totalQuestions,
  questionsPerPage,
  answeredCount,
  showAnswers,
  showExplanations,
  onToggleAnswers,
  onToggleExplanations,
  onExit,
  className
}: QuizHeaderProps) {
  const startQuestion = (currentPage - 1) * questionsPerPage + 1
  const endQuestion = Math.min(currentPage * questionsPerPage, totalQuestions)

  return (
    <header className={cn('sticky top-0 z-50 bg-white border-b border-slate-200', className)}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Exit quiz"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <h1 className="text-sm font-medium text-slate-700">
              Question {startQuestion}–{endQuestion} of {totalQuestions}
            </h1>
          </div>
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <Progress
          value={answeredCount}
          max={totalQuestions}
          size="sm"
          variant={answeredCount === totalQuestions ? 'success' : 'default'}
        />
      </div>

      {answeredCount > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={onToggleAnswers}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              showAnswers
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            )}
          >
            {showAnswers ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Hide Answers
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Show Answers
              </>
            )}
          </button>

          {showAnswers && (
            <button
              onClick={onToggleExplanations}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                showExplanations
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              )}
            >
              {showExplanations ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Hide Explanations
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Show Explanations
                </>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  )
}
