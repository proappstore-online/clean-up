import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'
import { LocationAutocomplete } from './LocationAutocomplete'

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

interface User {
  id: string
  login: string
  avatarUrl: string | null
}

interface PostJobModalProps {
  user: User
  onClose: () => void
  onPosted: () => void
}

export function PostJobModal({ user, onClose, onPosted }: PostJobModalProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE,
    )
    if (valid.length !== files.length) {
      setError(t('post.invalid_image'))
    } else {
      setError('')
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS))
    if (fileRef.current) fileRef.current.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError(t('post.fill_required'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const jobId = crypto.randomUUID()
      const now = new Date().toISOString()

      await app.db.execute(
        `INSERT INTO jobs (id, poster_id, poster_email, poster_name, title, description, location, lat, lng, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          jobId,
          user.id,
          user.login,
          user.login,
          title.trim(),
          description.trim(),
          location.trim(),
          coords?.lat ?? null,
          coords?.lng ?? null,
          now,
        ],
      )

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const path = `jobs/${jobId}/${i}-${crypto.randomUUID()}.${ext}`
        const buffer = await file.arrayBuffer()
        await app.storage.upload(path, buffer, file.type)
        await app.db.execute(
          `INSERT INTO job_photos (id, job_id, path) VALUES (?, ?, ?)`,
          [crypto.randomUUID(), jobId, path],
        )
      }

      onPosted()
    } catch (err) {
      console.error('Failed to post job', err)
      setError(t('post.fill_required'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('post.heading')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('post.close_modal')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handlePost} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.title_label')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('post.title_placeholder')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.description_label')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('post.description_placeholder')}
              rows={4}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.location_label')}
            </label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onSelect={(loc) => {
                setLocation(loc.label)
                setCoords({ lat: loc.lat, lng: loc.lng })
              }}
              placeholder={t('post.location_placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.photos_label', { count: MAX_PHOTOS })}
            </label>
            <div className="flex gap-2 flex-wrap">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img
                    src={url}
                    alt={t('post.preview_alt', { index: i + 1 })}
                    className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={t('post.remove_photo', { index: i + 1 })}
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
                  aria-label={t('post.add_photo')}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-2xl"
                >
                  +
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('post.cover_hint')}
            </p>
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

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('post.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              {submitting ? t('post.posting') : t('post.post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
