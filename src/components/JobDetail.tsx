import { useEffect, useState } from 'react'
import type { User } from '@proappstore/sdk'
import { app } from '../lib/app'
import { generateId, formatDate, formatCurrency } from '../lib/utils'
import type { Job, Bid } from '../lib/types'

interface Props {
  job: Job
  currentUser: User | null
  onBack: () => void
}

export function JobDetail({ job, currentUser, onBack }: Props) {
  const [bids, setBids] = useState<Bid[]>([])
  const [bidsLoading, setBidsLoading] = useState(true)
  const [showBidForm, setShowBidForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isOwner = currentUser?.id === job.poster_id
  const hasAlreadyBid = bids.some((b) => b.bidder_id === currentUser?.id)
  const canBid = !!currentUser && !isOwner && !hasAlreadyBid && job.status === 'open'

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
      setBids(rows)
    } catch (err) {
      console.error('Failed to load bids', err)
    } finally {
      setBidsLoading(false)
    }
  }

  async function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid bid amount.')
      return
    }
    if (message.length > 500) {
      setError('Message must be 500 characters or less.')
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
          currentUser.email ?? '',
          currentUser.name ?? currentUser.email ?? 'Unknown',
          parsed,
          message.trim() || null,
          now,
        ],
      )

      // Notify poster via push notification (best-effort)
      try {
        await app.notifications.notifyUser(job.poster_id, {
          title: 'New bid on your job!',
          body: `${currentUser.name ?? currentUser.email ?? 'Someone'} bid ${formatCurrency(parsed)} on "${job.title}"`,
        })
      } catch {
        // non-fatal
      }

      // Email poster (best-effort)
      if (job.poster_email) {
        try {
          await app.email.send(
            job.poster_email,
            `New bid on "${job.title}"`,
            `<p>Hi ${job.poster_name},</p>
             <p><strong>${currentUser.name ?? currentUser.email ?? 'A cleaner'}</strong> has placed a bid of <strong>${formatCurrency(parsed)}</strong> on your job <strong>${job.title}</strong>.</p>
             ${
               message.trim()
                 ? `<p>Their message: <em>${message.trim()}</em></p>`
                 : ''
             }
             <p>Contact them at: <a href="mailto:${currentUser.email}">${currentUser.email}</a></p>
             <p>View all bids at <a href="https://clean-up.proappstore.online">CleanMarket</a>.</p>`,
          )
        } catch {
          // non-fatal
        }
      }

      setSuccess('Your bid has been placed! The poster has been notified.')
      setAmount('')
      setMessage('')
      setShowBidForm(false)
      await loadBids()
    } catch (err) {
      setError('Failed to submit bid. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteJob() {
    if (!window.confirm('Delete this job? This cannot be undone.')) return
    setDeleting(true)
    try {
      await app.db.execute(`UPDATE jobs SET status = 'closed' WHERE id = ?`, [job.id])
      onBack()
    } catch (err) {
      console.error('Failed to close job', err)
      setDeleting(false)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
      >
        ← Back to listings
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Photos */}
        {job.photos && job.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-4 pb-0">
            {job.photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-52 w-auto rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
              />
            ))}
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📍 {job.location}</p>
              <p className="text-xs text-gray-400 mt-1">
                Posted by <span className="font-medium">{job.poster_name}</span> · {formatDate(job.created_at)}
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() => void handleDeleteJob()}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Closing…' : 'Close Job'}
              </button>
            )}
          </div>

          <p className="mt-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{job.description}</p>

          {/* Map */}
          {mapUrl && (
            <div className="mt-4">
              <img
                src={mapUrl}
                alt="Job location map"
                className="w-full h-40 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bids section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Bids ({bids.length})
          </h3>
          {canBid && !showBidForm && (
            <button
              onClick={() => setShowBidForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Place a Bid
            </button>
          )}
          {hasAlreadyBid && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ You've bid on this job</span>
          )}
          {!currentUser && (
            <span className="text-sm text-gray-400">Sign in to place a bid</span>
          )}
          {isOwner && (
            <span className="text-sm text-gray-400">Your listing</span>
          )}
        </div>

        {success && (
          <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Bid form */}
        {showBidForm && canBid && (
          <form
            onSubmit={(e) => void handleBidSubmit(e)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4"
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Your Bid</h4>
            <div className="mb-3">
              <label
                htmlFor="bid-amount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Bid Amount (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  id="bid-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  className="w-full pl-7 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="mb-3">
              <label
                htmlFor="bid-message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Message (optional, max 500 chars)
              </label>
              <textarea
                id="bid-message"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself, your availability, experience…"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{message.length}/500</p>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-3">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowBidForm(false); setError('') }}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Bid'}
              </button>
            </div>
          </form>
        )}

        {/* Bid list */}
        {bidsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-20" />
            ))}
          </div>
        ) : bids.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">💰</p>
            <p className="text-sm">No bids yet — be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                isOwner={isOwner}
                isCurrentUser={bid.bidder_id === currentUser?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BidCard({
  bid,
  isOwner,
  isCurrentUser,
}: {
  bid: Bid
  isOwner: boolean
  isCurrentUser: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{bid.bidder_name}</span>
            {isCurrentUser && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">You</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(bid.created_at)}</p>
          {bid.message && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{bid.message}</p>
          )}
          {/* Show contact email to job poster so they can reach out */}
          {isOwner && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Contact: <a href={`mailto:${bid.bidder_email}`} className="underline">{bid.bidder_email}</a>
            </p>
          )}
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(bid.amount)}</span>
        </div>
      </div>
    </div>
  )
}
