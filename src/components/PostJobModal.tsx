import { useState, useRef, useEffect } from 'react'
import type { User } from '@proappstore/sdk'
import { app } from '../lib/app'
import { generateId } from '../lib/utils'

interface Props {
  user: User
  onClose: () => void
  onPosted: () => void
}

const MAX_PHOTOS = 4
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

export function PostJobModal({ user, onClose, onPosted }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Keep preview URLs in sync with photos, and revoke stale object URLs
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [photos])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= 50 * 1024 * 1024,
    )
    if (valid.length < files.length) {
      setError('Only JPEG/PNG images under 50 MB are allowed.')
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS))
    if (fileRef.current) fileRef.current.value = ''
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      const jobId = generateId()
      const now = new Date().toISOString()

      // Geocode location (best-effort)
      let lat: number | null = null
      let lng: number | null = null
      try {
        const results = await app.maps.geocode(location.trim())
        if (results && results.length > 0) {
          lat = results[0].lat
          lng = results[0].lng
        }
      } catch {
        // geocode failure is non-fatal
      }

      // Upload photos
      const photoPaths: string[] = []
      for (const file of photos) {
        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const path = `jobs/${jobId}/${generateId()}.${ext}`
        await app.storage.uploadPublic(path, file, file.type)
        photoPaths.push(path)
      }

      // Insert job
      await app.db.execute(
        `INSERT INTO jobs (id, poster_id, poster_email, poster_name, title, description, location, lat, lng, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          jobId,
          user.id,
          user.email ?? '',
          user.name ?? user.email ?? 'Unknown',
          title.trim().slice(0, 80),
          description.trim().slice(0, 1000),
          location.trim().slice(0, 120),
          lat,
          lng,
          now,
        ],
      )

      // Insert photos in batch
      if (photoPaths.length > 0) {
        await app.db.batch(
          photoPaths.map((path) => ({
            sql: `INSERT INTO job_photos (id, job_id, path) VALUES (?, ?, ?)`,
            params: [generateId(), jobId, path],
          }))
        )
      }

      onPosted()
    } catch (err) {
      setError('Failed to post job. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Post a Cleaning Job</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="job-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="job-title"
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep clean 2-bed apartment"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
          </div>

          <div>
            <label
              htmlFor="job-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="job-description"
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job, property size, special requirements…"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/1000</p>
          </div>

          <div>
            <label
              htmlFor="job-location"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="job-location"
              type="text"
              maxLength={120}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 123 Main St, Brooklyn, NY"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Photos (optional, max {MAX_PHOTOS})
            </label>
            <div className="flex gap-2 flex-wrap">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img
                    src={url}
                    alt={`Photo preview ${i + 1}`}
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Add photo"
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-2xl"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
