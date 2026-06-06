import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Job } from '../lib/types'
import { JobCard } from './JobCard'

interface Props {
  jobs: Job[]
  loading: boolean
  onSelect: (job: Job) => void
}

export function JobList({ jobs, loading, onSelect }: Props) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-52" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:bg-gray-900 rounded-xl">
        <div className="flex justify-center mb-4">
          <Sparkles size={48} className="text-blue-400" />
        </div>
        <p className="text-lg font-medium">{t('jobs.empty_no_jobs')}</p>
        <p className="text-sm mt-1">{t('jobs.empty_be_first')}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onClick={() => onSelect(job)} />
      ))}
    </div>
  )
}
