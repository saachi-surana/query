'use client'

import { Poll } from '@/lib/supabase'

export function PollResults({
  poll,
  large = false,
}: {
  poll: Poll
  large?: boolean
}) {
  const totalVotes = Object.values(poll.votes).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className={`font-semibold text-slate-900 ${large ? 'text-xl' : 'text-sm'}`}>
          {poll.question}
        </h4>
        {!poll.is_active && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            Closed
          </span>
        )}
      </div>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const count = poll.votes[String(index)] || 0
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-slate-700 ${large ? 'text-lg' : 'text-sm'}`}>{option}</span>
                <span className={`font-medium text-slate-500 ${large ? 'text-base' : 'text-xs'}`}>
                  {count} vote{count !== 1 ? 's' : ''} ({percentage}%)
                </span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ background: 'var(--theme-primary-light)', height: large ? '1.5rem' : '0.75rem' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: 'var(--theme-primary)',
                    minWidth: percentage > 0 ? '0.75rem' : '0',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className={`text-slate-400 ${large ? 'text-sm' : 'text-xs'}`}>
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
