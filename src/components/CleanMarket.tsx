import { useEffect, useMemo, useRef, useState } from 'react'
import { useProAuth } from '@proappstore/sdk/hooks'
import { app } from '../lib/app'
import { runMigrations } from '../lib/db'
import { JobList } from './JobList'
import { JobSearchBar } from './JobSearchBar'
import { PostJobModal } from './PostJobModal'
import { JobDetail } from './JobDetail'
import type { Job } from '../lib/types'

export function CleanMarket() {
  const { user, loading } = useProAuth(app)
  const [ready, setReady] = useState(false)
  const [migrationError, setMigrationError] = useState(false)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Search / filter state
  const [inputValue, setInputValue] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: update keyword 300ms after the user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setKeyword(inputValue)
    }, 300)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [inputValue])

  // Derived filtered list — pure memo, never mutates jobs
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

  function handleInputChange(v: string) {
    setInputValue(v)
  }

  function handleClear() {
    setInputValue('')
    setKeyword('')
    setStatusFilter('open')
  }

  useEffect(() => {
    if (loading) return
    runMigrations()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Migration failed', err)
        setMigrationError(true)
        setReady(true) // unblock the UI so users aren't stuck on spinner
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

  function handleJobPosted() {
    setShowPostModal(false)
    setRefreshKey((k) => k + 1)
  }

  function handleSelectJob(job: Job) {
    setSelectedJob(job)
    setView('detail')
  }

  function handleBack() {
    setView('list')
    setSelectedJob(null)
    setRefreshKey((k) => k + 1)
  }

  function handleJobUpdated(updated: Job) {
    setSelectedJob(updated)
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading CleanMarket…</p>
        </div>
      </div>
    )
  }

  if (migrationError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to initialise database</h2>
          <p className="text-sm text-gray-500 mb-4">There was a problem setting up the app. Please refresh the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 dark:bg-gray-900 min-h-screen">
      {view === 'list' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧹 CleanMarket</h1>
              <p className="text-sm text-gray-500 mt-1">Find cleaning jobs or post work that needs doing</p>
            </div>
            {user && (
              <button
                onClick={() => setShowPostModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                + Post a Job
              </button>
            )}
          </div>

          {!user && !loading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-sm text-blue-800 dark:text-blue-300">
              <p className="mb-3">Sign in to post jobs or place bids on listings.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => app.auth.signIn('google')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Sign in with Google
                </button>
                <button
                  onClick={() => app.auth.signIn()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Sign in with GitHub
                </button>
              </div>
            </div>
          )}

          {/* Search bar */}
          <JobSearchBar
            keyword={keyword}
            onKeywordChange={setKeyword}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onClear={handleClear}
            inputValue={inputValue}
            onInputChange={handleInputChange}
          />

          {/* No-match message when search yields nothing but jobs exist */}
          {!jobsLoading && filteredJobs.length === 0 && jobs.length > 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <p className="text-lg font-medium">No jobs match your search.</p>
            </div>
          ) : (
            <JobList
              jobs={filteredJobs}
              loading={jobsLoading}
              onSelect={handleSelectJob}
            />
          )}
        </>
      )}

      {view === 'detail' && selectedJob && (
        <JobDetail
          job={selectedJob}
          currentUser={user ?? null}
          onBack={handleBack}
          onJobUpdated={handleJobUpdated}
        />
      )}

      {showPostModal && user && (
        <PostJobModal
          user={user}
          onClose={() => setShowPostModal(false)}
          onPosted={handleJobPosted}
        />
      )}
    </div>
  )
}
