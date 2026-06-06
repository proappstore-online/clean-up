import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'
import { LocationAutocomplete } from './LocationAutocomplete'

const MAX_PHOTOS = 10
const MAX_FILE_BYTES = 50 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

interface AuthUser {
  id: string
  login: string
  avatarUrl: string | null
  dateOfBirth: string | null
}

interface Props {
  user: AuthUser
  onClose: () => void
  onPosted: () => void
}

export function PostJobModal({ user, onClose, onPosted }: Props) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [photos])

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES) {
        setError(t('post.invalid_image'))
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }
    setPhotos((prev) => [...prev, ...files].slice(0, MAX_PHOTOS))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError(t('post.fill_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const jobId = crypto.randomUUID()
      const now = new Date().toISOString()

      await app.db.execute(
        `INSERT INTO jobs (id, poster_id, poster_email, poster_name, title, description, location, lat, lng, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          jobId,
          user.id,
          '',
          user.login,
          title.trim(),
          description.trim(),
          location.trim(),
          coords.lat,
          coords.lng,
          now,
        ],
      )

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const path = `jobs/${jobId}/${i}.${ext}`
        const buffer = await file.arrayBuffer()
        await app.storage.upload(path, buffer, file.type)
        await app.db.execute(
          `INSERT INTO job_photos (id, job_id, path) VALUES (?, ?, ?)`,
          [crypto.randomUUID(), jobId, path],
        )
      }

      onPosted()
      onClose()
    } catch {
      setError(t('post.fill_required'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('post.heading')}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('post.heading')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('post.close_modal')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
              id="post-location"
              value={location}
              onChange={setLocation}
              onSelect={(lat, lng) => setCoords({ lat, lng })}
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
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-blue-400 flex items-center justify-center text-sm"
                >
                  {t('post.add_photo')}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('post.cover_hint')}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              {t('post.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {submitting ? t('post.posting') : t('post.post')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
