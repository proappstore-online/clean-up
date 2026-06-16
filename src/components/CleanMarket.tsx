import { useState, useEffect, useRef, useMemo } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { useProAuth } from '@proappstore/sdk'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'
import { runMigrations } from '../lib/db'
import type { Job } from '../lib/types'
import { JobList } from './JobList'
import { JobDetail } from './JobDetail'
import { JobSearchBar } from './JobSearchBar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MyJobsView } from './MyJobsView'
import { PostJobModal } from './PostJobModal'
import { SignInScreen } from './SignInScreen'

type View = 'list' | 'detail' | 'mine'

export function CleanMarket() {
  const { user, loading } = useProAuth(app)
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [migrationError, setMigrationError] = useState(false)
  const [view, setView] = useState<View>('list')
  const [returnView, setReturnView] = useState<'list' | 'mine'>('list')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [inputValue, setInputValue] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user && view === 'mine') setView('list')
  }, [user, view])

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setKeyword(inputValue), 300)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [inputValue])

  const filteredJobs = useMemo(() => {
    const lower = keyword.toLowerCase()
    return jobs.filter((job) => {
      const keywordMatch =
        lower === '' ||
        job.title.toLowerCase().includes(lower) ||
        (job.description ?? '').toLowerCase().includes(lower)
      const statusMatch = statusFilter === '' || job.status === statusFilter
      return keywordMatch && statusMatch
    })
  }, [jobs, keyword, statusFilter])

  function handleInputChange(v: string) { setInputValue(v) }
  function handleClear() { setInputValue(''); setKeyword(''); setStatusFilter('open') }

  useEffect(() => {
    if (loading) return
    runMigrations()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Migration failed', err)
        setMigrationError(true)
        setReady(true)
      })
  }, [loading])

  useEffect(() => {
    if (!ready || migrationError) return
    void loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, refreshKey])

  async function loadJobs() {
    setJobsLoading(true)
    try {
      const { rows } = await app.db.query<{
        id: string
        poster_id: string
        poster_name: string
        title: string
        description: string
        location: string
        lat: number | null
        lng: number | null
        status: string
        winner_bid_id: string | null
        created_at: string
        bid_count: number
      }>(
        `SELECT j.id, j.poster_id, j.poster_name, j.title,
                j.description, j.location, j.lat, j.lng, j.status,
                j.winner_bid_id, j.created_at,
                COUNT(b.id) as bid_count
         FROM jobs j
         LEFT JOIN bids b ON b.job_id = j.id
         GROUP BY j.id
         ORDER BY j.created_at DESC`,
      )
      const jobsWithPhotos: Job[] = await Promise.all(
        rows.map(async (row) => {
          const { rows: photos } = await app.db.query<{ path: string }>(
            `SELECT path FROM job_photos WHERE job_id = ?`,
            [row.id],
          )
          return {
            ...row,
            status: row.status as 'open' | 'closed' | 'accepted',
            winner_bid_id: row.winner_bid_id ?? null,
            photos: photos.map((p) => app.storage.publicUrl(p.path)),
            bid_count: row.bid_count,
          }
        }),
      )
      setJobs(jobsWithPhotos)
    } catch (err) {
      console.error('Failed to load jobs', err)
    } finally {
      setJobsLoading(false)
    }
  }

  function handleJobPosted() { setShowPostModal(false); setRefreshKey((k) => k + 1) }
  function handleSelectJob(job: Job) {
    setReturnView(view === 'mine' ? 'mine' : 'list')
    setSelectedJob(job)
    setView('detail')
  }
  function handleBack() { setView(returnView); setSelectedJob(null); setRefreshKey((k) => k + 1) }
  function handleJobUpdated(updated: Job) {
    setSelectedJob(updated)
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
  }

  if (loading || (!ready && !migrationError)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
            style={{ borderColor: 'var(--accent)' }}
          />
          <p style={{ color: 'var(--muted)' }}>{t('jobs.loading')}</p>
        </div>
      </div>
    )
  }

  if (migrationError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-3">
            <AlertTriangle size={48} style={{ color: 'var(--error)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
            {t('errors.db_failed_title')}
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {t('errors.db_failed_body')}
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-primary px-4 py-2 text-sm font-semibold">
            {t('errors.refresh')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 bg-white dark:bg-gray-900 min-h-screen">
      {/* Dedicated sign-in screen — renders inside max-w-5xl so E2E selectors resolve */}
      {!user && <SignInScreen />}

      {user && (
        <>
          {view !== 'detail' && (
            <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  view === 'list'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t('nav.browse_jobs')}
              </button>
              <button
                onClick={() => setView('mine')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  view === 'mine'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {t('nav.my_jobs')}
              </button>
            </div>
          )}

          {view === 'list' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                    <Sparkles size={28} className="text-blue-500" />
                    {t('header.title')}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">{t('header.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <button
                    onClick={() => setShowPostModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {t('jobs.post_button')}
                  </button>
                </div>
              </div>

              <JobSearchBar
                keyword={keyword}
                onKeywordChange={setKeyword}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onClear={handleClear}
                inputValue={inputValue}
                onInputChange={handleInputChange}
              />

              {!jobsLoading && filteredJobs.length === 0 && jobs.length > 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <p className="text-lg font-medium">{t('jobs.no_match')}</p>
                </div>
              ) : (
                <JobList jobs={filteredJobs} loading={jobsLoading} onSelect={handleSelectJob} />
              )}
            </>
          )}

          {view === 'mine' && (
            <MyJobsView app={app} user={user} />
          )}

          {view === 'detail' && selectedJob && (
            <JobDetail
              job={selectedJob}
              currentUser={user}
              onBack={handleBack}
              onJobUpdated={handleJobUpdated}
            />
          )}

          {showPostModal && (
            <PostJobModal
              user={user}
              onClose={() => setShowPostModal(false)}
              onPosted={handleJobPosted}
            />
          )}
        </>
      )}
    </div>
  )
}
