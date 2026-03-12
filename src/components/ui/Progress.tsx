import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function Progress({
  value,
  max = 100,
  showLabel = false,
  label,
  size = 'md',
  variant = 'default',
  className
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-700">
            {label || `${value} of ${max}`}
          </span>
          {showLabel && (
            <span className="text-sm text-slate-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        className={cn('w-full bg-slate-100 rounded-full overflow-hidden', {
          'h-1': size === 'sm',
          'h-2': size === 'md',
          'h-3': size === 'lg',
        })}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', {
            'bg-blue-600': variant === 'default',
            'bg-green-500': variant === 'success',
            'bg-amber-500': variant === 'warning',
            'bg-red-500': variant === 'danger',
          })}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showValue = true,
  className
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const colorMap = {
    default: '#2563eb',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}
