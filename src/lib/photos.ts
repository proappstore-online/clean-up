import { app } from './app'
import { generateId } from './utils'
import type { JobPhoto } from './types'

export const MAX_JOB_PHOTOS = 10

/** Derive a lowercase file extension from a filename, defaulting to 'jpg'. */
export function fileExt(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx === -1 || idx === filename.length - 1) return 'jpg'
  return filename.slice(idx + 1).toLowerCase()
}

/** Build the storage path for a job photo. */
export function jobPhotoPath(jobId: string, id: string, ext: string): string {
  return `jobs/${jobId}/${id}.${ext}`
}

/** Load the photo rows for a job, in insert order (first = hero/cover). */
export async function loadJobPhotos(jobId: string): Promise<JobPhoto[]> {
  const { rows } = await app.db.query<JobPhoto>(
    `SELECT id, job_id, path FROM job_photos WHERE job_id = ?`,
    [jobId],
  )
  return rows
}

/** Upload a file to R2 and insert a job_photos row. Returns the new row. */
export async function addJobPhoto(jobId: string, file: File): Promise<JobPhoto> {
  const id = generateId()
  const ext = fileExt(file.name)
  const path = jobPhotoPath(jobId, id, ext)
  await app.storage.uploadPublic(path, file, file.type)
  await app.db.execute(
    `INSERT INTO job_photos (id, job_id, path) VALUES (?, ?, ?)`,
    [id, jobId, path],
  )
  return { id, job_id: jobId, path }
}

/** Delete a job_photos row by path, then delete the R2 object. */
export async function removeJobPhoto(path: string): Promise<void> {
  await app.db.execute(`DELETE FROM job_photos WHERE path = ?`, [path])
  await app.storage.delete(path)
}
