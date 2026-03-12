import { cn } from '@/lib/utils'
import { Button, Select } from '@/components/ui'

interface QuizFooterProps {
  currentPage: number
  totalPages: number
  answeredOnPage: number
  totalOnPage: number
  onPreviousPage: () => void
  onNextPage: () => void
  onJumpToPage: (page: number) => void
  onSubmit: () => void
  isSubmitting?: boolean
  className?: string
}

export function QuizFooter({
  currentPage,
  totalPages,
  answeredOnPage,
  totalOnPage,
  onPreviousPage,
  onNextPage,
  onJumpToPage,
  onSubmit,
  isSubmitting = false,
  className
}: QuizFooterProps) {
  const pageOptions = Array.from({ length: totalPages }, (_, i) => ({
    value: i + 1,
    label: `Page ${i + 1}`
  }))

  const isLastPage = currentPage === totalPages
  const allAnswered = answeredOnPage === totalOnPage

  return (
    <footer className={cn('sticky bottom-0 z-40 bg-white border-t border-slate-200 px-4 py-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="md"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-none"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </Button>

        <div className="flex items-center gap-2">
          <Select
            value={currentPage}
            onChange={(e) => onJumpToPage(Number(e.target.value))}
            options={pageOptions}
            aria-label="Jump to page"
          />
        </div>

        {isLastPage ? (
          <Button
            variant="primary"
            size="md"
            onClick={onSubmit}
            loading={isSubmitting}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={onNextPage}
            className="flex-1 sm:flex-none"
          >
            Next
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        )}
      </div>

      {answeredOnPage < totalOnPage && !isLastPage && (
        <p className="text-xs text-center text-slate-500 mt-2">
          {totalOnPage - answeredOnPage} unanswered question{totalOnPage - answeredOnPage > 1 ? 's' : ''} on this page
        </p>
      )}
    </footer>
  )
}
