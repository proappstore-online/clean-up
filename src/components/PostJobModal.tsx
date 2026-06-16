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
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_BYTES,
    )
    const combined = [...photos, ...valid].slice(0, MAX_PHOTOS)
    setPhotos(combined)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !location.trim()) {
      setError(t('post.error_required'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const jobId = crypto.randomUUID()
      const now = new Date().toISOString()

      await app.db.execute(
        `INSERT INTO jobs (id, poster_id, poster_name, title, description, location, lat, lng, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
        [
          jobId,
          user.id,
          user.login,
          title.trim(),
          description.trim(),
          location.trim(),
          coords.lat,
          coords.lng,
          now,
        ],
      )

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const path = `jobs/${jobId}/photo_${i}.${ext}`
        await app.storage.upload(path, file, file.type)
        await app.db.execute(
          `INSERT INTO job_photos (id, job_id, path) VALUES (?, ?, ?)`,
          [crypto.randomUUID(), jobId, path],
        )
      }

      onPosted()
    } catch (err) {
      console.error('Failed to post job', err)
      setError(t('post.error_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-gray-900/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('post.heading')}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('post.heading')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
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
              className="input w-full"
              required
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
              rows={3}
              className="input w-full resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.location_label')}
            </label>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onSelect={(place) => {
                setLocation(place.name)
                setCoords({ lat: place.lat, lng: place.lng })
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('post.photos_label')} ({photos.length}/{MAX_PHOTOS})
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="photo-upload"
            />
            {photos.length < MAX_PHOTOS && (
              <label
                htmlFor="photo-upload"
                className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 transition-colors"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('post.photos_add')}</span>
              </label>
            )}
            {previewUrls.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Preview ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                      aria-label={t('post.remove_photo')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              {t('post.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {submitting ? t('post.submitting') : t('post.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
