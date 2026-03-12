import { cn } from '@/lib/utils'

export type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect' | 'unanswered'

interface AnswerButtonProps {
  letter: string
  text: string
  state?: AnswerState
  showCorrect?: boolean
  onClick?: () => void
  disabled?: boolean
  explanation?: string | null
}

export function AnswerButton({
  letter,
  text,
  state = 'default',
  showCorrect = false,
  onClick,
  disabled = false,
  explanation
}: AnswerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full min-h-[56px] p-4 rounded-xl border-2 text-left',
        'flex items-start gap-3 transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer': state === 'default',
          'bg-blue-50 border-blue-300 hover:bg-blue-100 cursor-pointer': state === 'selected',
          'bg-green-50 border-green-300 cursor-default': state === 'correct',
          'bg-red-50 border-red-300 cursor-default': state === 'incorrect',
          'bg-slate-50 border-slate-200 cursor-default opacity-60': state === 'unanswered',
        },
        disabled && 'cursor-not-allowed opacity-60'
      )}
      role="radio"
      aria-checked={state === 'selected'}
      aria-label={`Option ${letter}: ${text}`}
    >
      <span
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm',
          {
            'bg-slate-200 text-slate-700': state === 'default',
            'bg-blue-500 text-white': state === 'selected',
            'bg-green-500 text-white': state === 'correct',
            'bg-red-500 text-white': state === 'incorrect',
            'bg-slate-200 text-slate-500': state === 'unanswered',
          }
        )}
      >
        {letter}
      </span>
      <span className="flex-1 text-base text-slate-900 leading-relaxed pt-1">
        {text}
      </span>
      {showCorrect && state === 'correct' && (
        <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {showCorrect && state === 'incorrect' && (
        <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </button>
  )
}
