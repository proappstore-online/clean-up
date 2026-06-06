import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'
import {
  MAX_JOB_PHOTOS,
  addJobPhoto,
  loadJobPhotos,
  removeJobPhoto,
} from '../lib/photos'
import type { JobPhoto } from '../lib/types'

interface Props {
  jobId: string
}

export function JobPhotoManager({ jobId }: Props) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    try {
      setPhotos(await loadJobPhotos(jobId))
    } catch (err) {
      console.error('Failed to load job photos', err)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (photos.length >= MAX_JOB_PHOTOS) return
    setBusy(true)
    try {
      await addJobPhoto(jobId, file)
      await refresh()
    } catch (err) {
      console.error('Failed to add photo', err)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(path: string) {
    setBusy(true)
    try {
      await removeJobPhoto(path)
      await refresh()
    } catch (err) {
      console.error('Failed to remove photo', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 pt-0">
      <div className="flex gap-2 flex-wrap">
        {photos.map((photo, i) => (
          <div key={photo.id} className="relative w-20 h-20">
            <img
              src={app.storage.publicUrl(photo.path)}
              alt={t('detail.photo_alt', { index: i + 1 })}
              className="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemove(photo.path)}
              aria-label={t('detail.remove_photo', { index: i + 1 })}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center leading-none disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_JOB_PHOTOS && (
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            aria-label={t('detail.add_photo')}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-2xl disabled:opacity-50"
          >
            +
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{t('detail.photo_management_hint')}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />
    </div>
  )
}
