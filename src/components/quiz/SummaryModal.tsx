import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'

interface SummaryModalProps {
  isOpen: boolean
  onClose: () => void
  summaryData: {
    total: number
    answered: number
    pending: number
    correct: number
    incorrect: number
    score: number
  }
  showRevealed: boolean
  onRetake: () => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function SummaryModal({
  isOpen,
  onClose,
  summaryData,
  showRevealed,
  onRetake,
  onSubmit,
  isSubmitting = false
}: SummaryModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="absolute inset-0 bg-black/50 touch-auto"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={cn(
        "relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm mx-0 sm:mx-4",
        "max-h-[85vh] flex flex-col",
        "animate-in slide-in-from-bottom duration-200"
      )}>
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Quiz Summary</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg touch-manipulation"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-sm text-blue-600 mb-1">Total Answered</div>
              <div className="text-4xl font-bold text-blue-700">{summaryData.total}</div>
            </div>

            {summaryData.pending > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="text-sm text-amber-600 mb-1">Pending</div>
                <div className="text-xl font-bold text-amber-700">{summaryData.pending}</div>
              </div>
            )}

            {showRevealed && (
              <>
                <div className="border-t border-slate-100 pt-4">
                  <div className="bg-blue-50 rounded-xl p-6 text-center">
                    <div className="text-sm text-blue-600 mb-1">Score</div>
                    <div className="text-4xl font-bold text-blue-700">{summaryData.score}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div className="text-sm text-green-600">Correct</div>
                    </div>
                    <div className="text-xl font-bold text-green-700">{summaryData.correct}</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <div className="text-sm text-red-600">Incorrect</div>
                    </div>
                    <div className="text-xl font-bold text-red-700">{summaryData.incorrect}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-100 space-y-3">
          <Button
            variant="outline"
            fullWidth
            size="lg"
            onClick={onRetake}
          >
            Retake Quiz
          </Button>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={onSubmit}
            loading={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </div>
  )
}
