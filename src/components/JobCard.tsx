import { MapPin, Sparkles, Trophy } from 'lucide-react'
import type { Job } from '../lib/types'
import { formatDate } from '../lib/utils'

interface Props {
  job: Job
  onClick: () => void
}

export function JobCard({ job, onClick }: Props) {
  const thumb = job.photos?.[0]
  const isAwarded = job.status === 'accepted'

  return (
    <button
      onClick={onClick}
      aria-label={`View job: ${job.title} at ${job.location}`}
      className="text-left w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
    >
      {thumb ? (
        <img
          src={thumb}
          alt={job.title}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
          <Sparkles size={48} className="text-blue-400" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{job.title}</h3>
          {isAwarded && (
            <span
              aria-label="Awarded"
              className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700 flex-shrink-0"
            >
              <Trophy size={14} className="text-yellow-500" /> Awarded
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate inline-flex items-center gap-1">
          <MapPin size={14} className="text-gray-500 flex-shrink-0" />
          {job.location}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{job.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{formatDate(job.created_at)}</span>
          <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {job.bid_count ?? 0} bid{job.bid_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </button>
  )
}
