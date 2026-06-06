import { useEffect, useState } from 'react'
import { BadgeDollarSign, CheckCircle2, Lock, MapPin, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { User } from '@proappstore/sdk'
import { app } from '../lib/app'
import { generateId, formatDate, formatCurrency } from '../lib/utils'
import { JobPhotoManager } from './JobPhotoManager'
import type { Job, Bid } from '../lib/types'

interface Props {
  job: Job
  currentUser: User | null
  onBack: () => void
  onJobUpdated?: (updated: Job) => void
}

export function JobDetail({ job: initialJob, currentUser, onBack, onJobUpdated }: Props) {
  const { t } = useTranslation()
  const [job, setJob] = useState<Job>(initialJob)
  const [bids, setBids] = useState<Bid[]>([])
  const [bidsLoading, setBidsLoading] = useState(true)
  const [showBidForm, setShowBidForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isOwner = currentUser?.id === job.poster_id
  const isAccepted = job.status === 'accepted'
  const hasAlreadyBid = bids.some((b) => b.bidder_id === currentUser?.id)
  const canBid = !!currentUser && !isOwner && !hasAlreadyBid && job.status === 'open'

  const isPoster = !!currentUser && currentUser.id === job.poster_id
  const canManagePhotos = isPoster && job.status === 'open'
  const myBid = currentUser ? bids.find((b) => b.bidder_id === currentUser.id) : undefined

  const visibleBids: Bid[] =
    isPoster ? bids
    : myBid  ? [myBid]
    :          []

  useEffect(() => {
    void loadBids()
    if (job.lat !== null && job.lng !== null && job.lat !== undefined && job.lng !== undefined) {
      setMapUrl(app.maps.staticUrl(job.lat, job.lng))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id])

  async function loadBids() {
    setBidsLoading(true)
    try {
      const { rows } = await app.db.query<Bid>(
        `SELECT * FROM bids WHERE job_id = ? ORDER BY created_at DESC`,
        [job.id],
      )
      setBids(rows.map((b) => ({ ...b, accepted: b.accepted ?? 0 })))
    } catch (err) {
      console.error('Failed to load bids', err)
    } finally {
      setBidsLoading(false)
    }
  }

  async function handleAcceptBid(bid: Bid) {
    if (!window.confirm(t('detail.award_confirm', { name: bid.bidder_name, amount: formatCurrency(bid.amount) }))) return
    setAccepting(bid.id)
    setError('')
    try {
      await app.db.batch([
        {
          sql: `UPDATE jobs SET status = 'accepted', winner_bid_id = ? WHERE id = ?`,
          params: [bid.id, job.id],
        },
        {
          sql: `UPDATE bids SET accepted = 1 WHERE id = ?`,
          params: [bid.id],
        },
      ])

      try {
        await app.notifications.notifyUser(bid.bidder_id, {
          title: t('detail.won_title'),
          body: t('detail.won_body', { amount: formatCurrency(bid.amount), title: job.title }),
        })
      } catch {
        // non-fatal
      }

      const updatedJob: Job = { ...job, status: 'accepted', winner_bid_id: bid.id }
      setJob(updatedJob)
      onJobUpdated?.(updatedJob)
      setBids((prev) => prev.map((b) => ({ ...b, accepted: b.id === bid.id ? 1 : b.accepted })))
      setSuccess(t('detail.job_awarded_to', { name: bid.bidder_name }))
    } catch (err) {
      console.error('Failed to accept bid', err)
      setError(t('detail.accept_failed'))
    } finally {
      setAccepting(null)
    }
  }

  async function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError(t('detail.invalid_amount'))
      return
    }
    if (message.length > 500) {
      setError(t('detail.message_too_long'))
      return
    }
    if (!currentUser) return
    setSubmitting(true)
    try {
      const bidId = generateId()
      const now = new Date().toISOString()
      await app.db.execute(
        `INSERT INTO bids (id, job_id, bidder_id, bidder_email, bidder_name, amount, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bidId,
          job.id,
          currentUser.id,
          '',
          currentUser.login,
          parsed,
          message.trim() || null,
          now,
        ],
      )

      try {
        await app.notifications.notifyUser(job.poster_id, {
          title: t('detail.new_bid_title'),
          body: t('detail.new_bid_body', { name: currentUser.login, amount: formatCurrency(parsed), title: job.title }),
        })
      } catch {
        // non-fatal
      }

      setSuccess(t('detail.bid_placed'))
      setAmount('')
      setMessage('')
      setShowBidForm(false)
      await loadBids()
    } catch (err) {
      setError(t('detail.bid_failed'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteJob() {
    if (!window.confirm(t('detail.delete_confirm'))) return
    setDeleting(true)
    try {
      await app.db.execute(`UPDATE jobs SET status = 'closed' WHERE id = ?`, [job.id])
      onBack()
    } catch (err) {
      console.error('Failed to close job', err)
      setDeleting(false)
    }
  }

  const winningBid = isAccepted && job.winner_bid_id
    ? bids.find((b) => b.id === job.winner_bid_id)
    : null

  return (
    <div className="dark:bg-gray-900 min-h-screen">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
      >
        {t('detail.back')}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {canManagePhotos ? (
          <JobPhotoManager jobId={job.id} />
        ) : (
          job.photos && job.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-4 pb-0">
              {job.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={t('detail.photo_alt', { index: i + 1 })}
                  className="h-52 w-auto rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                />
              ))}
            </div>
          )
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h2>
                {isAccepted && (
                  <span
                    aria-label={t('detail.awarded')}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2.5 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700"
                  >
                    <Trophy size={14} className="text-yellow-500" /> {t('detail.awarded')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 inline-flex items-center gap-1">
                <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                {job.location}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('detail.posted_by', { name: job.poster_name, date: formatDate(job.created_at) })}
              </p>
              {isAccepted && winningBid && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span>{t('detail.won_by')}</span>
                  <span className="font-semibold">{winningBid.bidder_name}</span>
                  <span>·</span>
                  <span className="font-semibold">{formatCurrency(winningBid.amount)}</span>
                </div>
              )}
            </div>
            {isOwner && !isAccepted && (
              <button
                onClick={() => void handleDeleteJob()}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {deleting ? t('detail.closing') : t('detail.close_job')}
              </button>
            )}
          </div>

          <p className="mt-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{job.description}</p>

          {mapUrl && (
            <div className="mt-4">
              <img
                src={mapUrl}
                alt={t('detail.map_alt')}
                className="w-full h-40 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isPoster ? t('detail.bids_with_count', { count: bids.length }) : t('detail.bids')}
          </h3>
          {canBid && !showBidForm && (
            <button
              onClick={() => setShowBidForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {t('detail.place_bid')}
            </button>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              <Trophy size={16} className="text-yellow-500" /> {t('detail.job_awarded')}
            </span>
          )}
          {hasAlreadyBid && !isAccepted && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 size={16} className="text-green-500" /> {t('detail.youve_bid')}
            </span>
          )}
          {!currentUser && (
            <span className="text-sm text-gray-400">{t('detail.sign_in_to_bid')}</span>
          )}
          {isOwner && !isAccepted && (
            <span className="text-sm text-gray-400">{t('detail.your_listing')}</span>
          )}
        </div>

        {success && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {showBidForm && canBid && job.status === 'open' && (
          <BidForm
            amount={amount}
            message={message}
            submitting={submitting}
            onAmount={setAmount}
            onMessage={setMessage}
            onSubmit={handleBidSubmit}
            onCancel={() => setShowBidForm(false)}
            t={t}
          />
        )}

        {!currentUser && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            {t('detail.sign_in_view')}
          </div>
        )}

        {currentUser && isAccepted && !isPoster && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-700 dark:text-yellow-300">
            {t('detail.awarded_notice')}
          </div>
        )}

        {currentUser && (
          <div className="space-y-2">
            {bidsLoading ? (
              <p className="text-sm text-gray-400">…</p>
            ) : visibleBids.length === 0 ? (
              <p className="text-sm text-gray-400">
                {isPoster ? t('detail.no_bids_first') : t('detail.bids_poster_only')}
              </p>
            ) : (
              visibleBids.map((bid) => (
                <div
                  key={bid.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {bid.bidder_id === currentUser.id ? t('detail.you') : bid.bidder_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400">
                        <BadgeDollarSign size={15} className="text-green-500" />
                        {formatCurrency(bid.amount)}
                      </span>
                      {bid.accepted === 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                          <Trophy size={13} className="text-yellow-500" /> {t('detail.winner')}
                        </span>
                      )}
                    </div>
                    {bid.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{bid.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(bid.created_at)}</p>
                  </div>
                  {isPoster && !isAccepted && (
                    <button
                      onClick={() => void handleAcceptBid(bid)}
                      disabled={accepting === bid.id}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {accepting === bid.id ? t('detail.accepting') : t('detail.accept')}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface BidFormProps {
  amount: string
  message: string
  submitting: boolean
  onAmount: (v: string) => void
  onMessage: (v: string) => void
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  onCancel: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function BidForm({ amount, message, submitting, onAmount, onMessage, onSubmit, onCancel, t }: BidFormProps) {
  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3"
    >
      <h4 className="font-semibold text-gray-900 dark:text-white">{t('detail.your_bid_heading')}</h4>
      <div>
        <label htmlFor="bid-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('detail.bid_amount_label')}
        </label>
        <input
          id="bid-amount"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>
      <div>
        <label htmlFor="bid-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('detail.message_label')}
        </label>
        <textarea
          id="bid-message"
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          placeholder={t('detail.message_placeholder')}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? t('detail.submitting') : t('detail.submit_bid')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-4 py-2"
        >
          {t('detail.cancel')}
        </button>
      </div>
    </form>
  )
}
