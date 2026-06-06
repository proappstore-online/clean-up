import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the SDK app instance so photos.ts logic can be exercised in isolation.
const execute = vi.fn()
const query = vi.fn()
const uploadPublic = vi.fn()
const del = vi.fn()
const publicUrl = vi.fn((p: string) => `https://cdn.test/${p}`)

vi.mock('../../src/lib/app', () => ({
  app: {
    db: {
      execute: (...a: unknown[]) => execute(...a),
      query: (...a: unknown[]) => query(...a),
    },
    storage: {
      uploadPublic: (...a: unknown[]) => uploadPublic(...a),
      delete: (...a: unknown[]) => del(...a),
      publicUrl: (p: string) => publicUrl(p),
    },
  },
}))

// Deterministic id so we can assert the storage path.
vi.mock('../../src/lib/utils', () => ({
  generateId: () => 'fixedid',
}))

import {
  MAX_JOB_PHOTOS,
  fileExt,
  jobPhotoPath,
  loadJobPhotos,
  addJobPhoto,
  removeJobPhoto,
} from '../../src/lib/photos'

beforeEach(() => {
  execute.mockReset().mockResolvedValue({ meta: { changes: 1 } })
  query.mockReset().mockResolvedValue({ rows: [] })
  uploadPublic.mockReset().mockResolvedValue({ key: 'k', url: 'u' })
  del.mockReset().mockResolvedValue(undefined)
})

describe('MAX_JOB_PHOTOS', () => {
  it('caps photos at 10 (criterion #3)', () => {
    expect(MAX_JOB_PHOTOS).toBe(10)
  })
})

describe('fileExt', () => {
  it('derives lowercase extension from filename (criterion #4)', () => {
    expect(fileExt('PHOTO.JPG')).toBe('jpg')
  })

  it('handles multi-dot filenames using the last segment', () => {
    expect(fileExt('my.holiday.png')).toBe('png')
  })

  it('defaults to jpg when there is no extension', () => {
    expect(fileExt('noext')).toBe('jpg')
  })

  it('defaults to jpg when filename ends with a dot', () => {
    expect(fileExt('weird.')).toBe('jpg')
  })
})

describe('jobPhotoPath', () => {
  it('builds path as jobs/{jobId}/{id}.{ext} (criterion #4)', () => {
    expect(jobPhotoPath('job1', 'abc', 'png')).toBe('jobs/job1/abc.png')
  })
})

describe('loadJobPhotos', () => {
  it('queries job_photos scoped by job_id and returns rows in insert order (criterion #5)', async () => {
    const rows = [
      { id: 'p1', job_id: 'job1', path: 'jobs/job1/p1.jpg' },
      { id: 'p2', job_id: 'job1', path: 'jobs/job1/p2.jpg' },
    ]
    query.mockResolvedValueOnce({ rows })
    const result = await loadJobPhotos('job1')
    expect(query).toHaveBeenCalledOnce()
    const [sql, params] = query.mock.calls[0]
    expect(sql).toMatch(/FROM job_photos WHERE job_id = \?/i)
    expect(params).toEqual(['job1'])
    // first row is the hero/cover — order preserved
    expect(result[0].id).toBe('p1')
  })
})

describe('addJobPhoto', () => {
  it('uploads via uploadPublic with the file content-type, then inserts a row (criterion #4)', async () => {
    const file = new File(['data'], 'shot.PNG', { type: 'image/png' })
    const row = await addJobPhoto('job1', file)

    expect(uploadPublic).toHaveBeenCalledWith('jobs/job1/fixedid.png', file, 'image/png')
    expect(execute).toHaveBeenCalledOnce()
    const [sql, params] = execute.mock.calls[0]
    expect(sql).toMatch(/INSERT INTO job_photos \(id, job_id, path\)/i)
    expect(params).toEqual(['fixedid', 'job1', 'jobs/job1/fixedid.png'])
    expect(row).toEqual({ id: 'fixedid', job_id: 'job1', path: 'jobs/job1/fixedid.png' })
  })

  it('uploads to R2 BEFORE inserting the DB row', async () => {
    const order: string[] = []
    uploadPublic.mockImplementation(async () => { order.push('upload'); return {} })
    execute.mockImplementation(async () => { order.push('insert'); return { meta: {} } })
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await addJobPhoto('job1', file)
    expect(order).toEqual(['upload', 'insert'])
  })
})

describe('removeJobPhoto', () => {
  it('deletes the DB row by path, then deletes the R2 object (criterion #2 + spec correction: always delete)', async () => {
    const order: string[] = []
    execute.mockImplementation(async () => { order.push('db'); return { meta: {} } })
    del.mockImplementation(async () => { order.push('storage') })

    await removeJobPhoto('jobs/job1/p1.jpg')

    const [sql, params] = execute.mock.calls[0]
    expect(sql).toMatch(/DELETE FROM job_photos WHERE path = \?/i)
    expect(params).toEqual(['jobs/job1/p1.jpg'])
    expect(del).toHaveBeenCalledWith('jobs/job1/p1.jpg')
    // row removed first, then file (matches spec ordering a -> b)
    expect(order).toEqual(['db', 'storage'])
  })
})
