import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { initPro } from '@proappstore/sdk'

interface JobRow {
  id: string
  poster_id: string
  poster_name: string
  title: string
  description: string
  location: string
  status: string
  winner_bid_id: string | null
  created_at: string
  bid_count: number
}

interface BidWithJob {
  id: string
  job_id: string
  bidder_id: string
  bidder_name: string
  amount: number
  message: string | null
  accepted: number
  created_at: string
  title: string
  job_status: string
}

interface User {
  id: string
  login: string
  avatarUrl: string | null
  dateOfBirth: string | null
}

interface MyJobsViewProps {
  app: ReturnType<typeof initPro>
  user: User
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
  const label = ['open', 'closed', 'accepted'].includes(status) ? t(`status.${status}`) : status
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function PostedJobs({ jobs }: { jobs: JobRow[] }) {
  const { t } = useTranslation()
  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium">{t('myjobs.empty_posted')}</p>
        <p className="text-sm mt-1">{t('myjobs.empty_posted_hint')}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <li
          key={job.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{job.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{job.location}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{t('myjobs.posted_date', { date: formatDate(job.created_at) })}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {t('myjobs.bids', { count: job.bid_count })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function BidJobs({ bids }: { bids: BidWithJob[] }) {
  const { t } = useTranslation()
  if (bids.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium">{t('myjobs.empty_bids')}</p>
        <p className="text-sm mt-1">{t('myjobs.empty_bids_hint')}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {bids.map((bid) => (
        <li
          key={bid.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{bid.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('myjobs.your_bid')} <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(bid.amount)}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={bid.job_status} />
              {bid.accepted === 1 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 size={14} className="text-green-600" /> {t('myjobs.accepted')}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('myjobs.bid_placed', { date: formatDate(bid.created_at) })}
          </div>
          {bid.message && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{bid.message}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

type SubTab = 'posted' | 'bidding'

export function MyJobsView({ app, user }: MyJobsViewProps) {
  const { t } = useTranslation()
  const [subTab, setSubTab] = useState<SubTab>('posted')
  const [postedJobs, setPostedJobs] = useState<JobRow[]>([])
  const [bidJobs, setBidJobs] = useState<BidWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [postedResult, bidsResult] = await Promise.all([
          app.db.query<JobRow>(
            `SELECT j.id, j.poster_id, j.poster_name, j.title, j.description,
                    j.location, j.status, j.winner_bid_id, j.created_at,
                    COUNT(b.id) as bid_count
             FROM jobs j
             LEFT JOIN bids b ON b.job_id = j.id
             WHERE j.poster_id = ?
             GROUP BY j.id
             ORDER BY j.created_at DESC`,
            [user.id],
          ),
          app.db.query<BidWithJob>(
            `SELECT bids.id, bids.job_id, bids.bidder_id, bids.bidder_name,
                    bids.amount, bids.message, bids.accepted, bids.created_at,
                    jobs.title, jobs.status AS job_status
             FROM bids
             JOIN jobs ON bids.job_id = jobs.id
             WHERE bids.bidder_id = ?
             ORDER BY bids.created_at DESC`,
            [user.id],
          ),
        ])
        if (!cancelled) {
          setPostedJobs(postedResult.rows)
          setBidJobs(bidsResult.rows)
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('myjobs.load_failed'))
          console.error('MyJobsView fetch error', err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchData()
    return () => { cancelled = true }
  }, [app, user.id, t])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('myjobs.heading')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('myjobs.signed_in_as')} <span className="font-medium text-gray-700 dark:text-gray-300">{user.login}</span>
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={subTab === 'posted'}
          onClick={() => setSubTab('posted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'posted'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t('myjobs.posted_tab')}
        </button>
        <button
          role="tab"
          aria-selected={subTab === 'bidding'}
          onClick={() => setSubTab('bidding')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'bidding'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {t('myjobs.bidding_tab')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('myjobs.loading')}</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div role="tabpanel">
          {subTab === 'posted' && <PostedJobs jobs={postedJobs} />}
          {subTab === 'bidding' && <BidJobs bids={bidJobs} />}
        </div>
      )}
    </div>
  )
}
