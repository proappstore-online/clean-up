import { useEffect, useState } from 'react'
import { BadgeDollarSign, CheckCircle2, Lock, MapPin, Trophy } from 'lucide-react'
import type { User } from '@proappstore/sdk'
import { app } from '../lib/app'
import { generateId, formatDate, formatCurrency } from '../lib/utils'
import type { Job, Bid } from '../lib/types'

interface Props {
  job: Job
  currentUser: User | null
  onBack: () => void
  onJobUpdated?: (updated: Job) => void
}

export function JobDetail({ job: initialJob, currentUser, onBack, onJobUpdated }: Props) {
  const [job, setJob] = useState<Job>(initialJob)
  const [bids, setBids] = useState<Bid[]>([])
  const [bidsLoading, setBidsLoading] = useState(true)
  const [showBidForm, setShowBidForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null) // bid id being accepted
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isOwner = currentUser?.id === job.poster_id
  const isAccepted = job.status === 'accepted'
  const hasAlreadyBid = bids.some((b) => b.bidder_id === currentUser?.id)
  const canBid = !!currentUser && !isOwner && !hasAlreadyBid && job.status === 'open'

  // ── Bid visibility gate (AC-1 / AC-2 / AC-3 / AC-4) ─────────────────────
  // isPoster  → sees ALL bids (AC-1)
  // myBid     → sees ONLY own bid (AC-2)
  // otherwise → sees NO bids; an appropriate empty-state message is shown (AC-3 / AC-4)
  const isPoster = !!currentUser && currentUser.id === job.poster_id
  const myBid = currentUser ? bids.find((b) => b.bidder_id === currentUser.id) : undefined

  const visibleBids: Bid[] =
    isPoster ? bids          // AC-1: job poster sees all
    : myBid  ? [myBid]       // AC-2: bidder sees only their own bid
    :          []             // AC-3 / AC-4: non-bidder / anon sees nothing

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
      // Ensure the accepted field defaults to 0 for older rows that predate the migration
      setBids(rows.map((b) => ({ ...b, accepted: b.accepted ?? 0 })))
    } catch (err) {
      console.error('Failed to load bids', err)
    } finally {
      setBidsLoading(false)
    }
  }

  async function handleAcceptBid(bid: Bid) {
    if (!window.confirm(`Award this job to ${bid.bidder_name} for ${formatCurrency(bid.amount)}?`)) return
    setAccepting(bid.id)
    setError('')
    try {
      // Atomic: update job + mark bid in one batch
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

      // Notify the winning bidder (best-effort)
      try {
        await app.notifications.notifyUser(bid.bidder_id, {
          title: '🎉 You won the job!',
          body: `Your bid of ${formatCurrency(bid.amount)} was accepted for "${job.title}"`,
        })
      } catch {
        // non-fatal — bidder may not have push subscribed
      }

      // Update local state immediately
      const updatedJob: Job = { ...job, status: 'accepted', winner_bid_id: bid.id }
      setJob(updatedJob)
      onJobUpdated?.(updatedJob)
      setBids((prev) => prev.map((b) => ({ ...b, accepted: b.id === bid.id ? 1 : b.accepted })))
      setSuccess(`Job awarded to ${bid.bidder_name}! They've been notified.`)
    } catch (err) {
      console.error('Failed to accept bid', err)
      setError('Failed to accept bid. Please try again.')
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
          '',
          currentUser.login,
          parsed,
          message.trim() || null,
          now,
        ],
      )

      // Notify poster via push notification (best-effort)
      try {
        await app.notifications.notifyUser(job.poster_id, {
          title: 'New bid on your job!',
          body: `${currentUser.login} bid ${formatCurrency(parsed)} on "${job.title}"`,
        })
      } catch {
        // non-fatal
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

  // Find the winning bid (if any) — use visibleBids so poster always sees it;
  // for non-posters the winning bid is surfaced via the inline winner summary above.
  const winningBid = isAccepted && job.winner_bid_id
    ? bids.find((b) => b.id === job.winner_bid_id)
    : null

  return (
    <div className="dark:bg-gray-900 min-h-screen">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h2>
                {isAccepted && (
                  <span
                    aria-label="Awarded"
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2.5 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700"
                  >
                    <Trophy size={14} className="text-yellow-500" /> Awarded
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 inline-flex items-center gap-1">
                <MapPin size={16} className="text-gray-500 flex-shrink-0" />
                {job.location}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Posted by <span className="font-medium">{job.poster_name}</span> · {formatDate(job.created_at)}
              </p>
              {/* Winner summary for everyone */}
              {isAccepted && winningBid && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span>Won by</span>
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
          {/* AC-1: poster sees full count; AC-2/3/4: count suppressed to avoid leaking competitor info */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isPoster ? `Bids (${bids.length})` : 'Bids'}
          </h3>
          {canBid && !showBidForm && (
            <button
              onClick={() => setShowBidForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Place a Bid
            </button>
          )}
          {isAccepted && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              <Trophy size={16} className="text-yellow-500" /> Job Awarded
            </span>
          )}
          {hasAlreadyBid && !isAccepted && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 size={16} className="text-green-500" /> You&apos;ve bid on this job
            </span>
          )}
          {!currentUser && (
            <span className="text-sm text-gray-400">Sign in to place a bid</span>
          )}
          {isOwner && !isAccepted && (
            <span className="text-sm text-gray-400">Your listing</span>
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

        {/* Bid form — only when job is open */}
        {showBidForm && canBid && job.status === 'open' && (
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

        {/* Job closed / awarded notice for non-owners */}
        {isAccepted && !isOwner && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
            This job has been awarded and is no longer accepting bids.
          </div>
        )}

        {/* Bid list — filtered by visibleBids gate */}
        {bidsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-20" />
            ))}
          </div>
        ) : visibleBids.length === 0 ? (
          // Empty-state messaging differs by viewer tier
          !currentUser ? (
            // AC-4: anonymous
            <div className="text-center py-10 text-gray-400">
              <div className="flex justify-center mb-2">
                <Lock size={48} className="text-gray-400" />
              </div>
              <p className="text-sm">Sign in to view bid information.</p>
            </div>
          ) : isPoster ? (
            // AC-1: poster but genuinely no bids yet
            <div className="text-center py-10 text-gray-400">
              <div className="flex justify-center mb-2">
                <BadgeDollarSign size={48} className="text-gray-400" />
              </div>
              <p className="text-sm">No bids yet — be the first!</p>
            </div>
          ) : (
            // AC-3: authenticated non-bidder
            <div className="text-center py-10 text-gray-400">
              <div className="flex justify-center mb-2">
                <Lock size={48} className="text-gray-400" />
              </div>
              <p className="text-sm">Bids are only visible to the job poster.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {visibleBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                isCurrentUser={bid.bidder_id === currentUser?.id}
                showAccept={isOwner && !isAccepted}
                accepting={accepting === bid.id}
                onAccept={() => void handleAcceptBid(bid)}
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
  isCurrentUser,
  showAccept,
  accepting,
  onAccept,
}: {
  bid: Bid
  isCurrentUser: boolean
  showAccept: boolean
  accepting: boolean
  onAccept: () => void
}) {
  const isWinner = bid.accepted === 1

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${
        isWinner
          ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50/30 dark:bg-yellow-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white">{bid.bidder_name}</span>
            {isCurrentUser && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">You</span>
            )}
            {isWinner && (
              <span
                aria-label="Winner"
                className="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700 font-semibold"
              >
                <Trophy size={14} className="text-yellow-500" /> Winner
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(bid.created_at)}</p>
          {bid.message && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{bid.message}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(bid.amount)}</span>
          {showAccept && (
            <button
              onClick={onAccept}
              disabled={accepting}
              aria-label={`Accept bid from ${bid.bidder_name}`}
              className="text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {accepting ? 'Accepting…' : 'Accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
