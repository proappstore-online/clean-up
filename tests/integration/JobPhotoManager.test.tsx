import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// --- Mock the photos lib (component delegates all SDK work to it) ---
const loadJobPhotos = vi.fn()
const addJobPhoto = vi.fn()
const removeJobPhoto = vi.fn()

vi.mock('../../src/lib/photos', () => ({
  MAX_JOB_PHOTOS: 10,
  loadJobPhotos: (...a: unknown[]) => loadJobPhotos(...a),
  addJobPhoto: (...a: unknown[]) => addJobPhoto(...a),
  removeJobPhoto: (...a: unknown[]) => removeJobPhoto(...a),
}))

vi.mock('../../src/lib/app', () => ({
  app: { storage: { publicUrl: (p: string) => `https://cdn.test/${p}` } },
}))

// react-i18next stub: return the key (+ index) so we can assert behaviour without copy.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { index?: number }) =>
      opts?.index != null ? `${k}:${opts.index}` : k,
  }),
}))

import { JobPhotoManager } from '../../src/components/JobPhotoManager'

const photo = (id: string) => ({ id, job_id: 'job1', path: `jobs/job1/${id}.jpg` })

beforeEach(() => {
  loadJobPhotos.mockReset().mockResolvedValue([])
  addJobPhoto.mockReset().mockResolvedValue(undefined)
  removeJobPhoto.mockReset().mockResolvedValue(undefined)
})

describe('JobPhotoManager rendering (criteria #2, #3, #5)', () => {
  it('renders each existing photo with a remove (×) button', async () => {
    loadJobPhotos.mockResolvedValueOnce([photo('p1'), photo('p2')])
    render(<JobPhotoManager jobId="job1" />)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    expect(screen.getByLabelText('detail.remove_photo:1')).toBeInTheDocument()
    expect(screen.getByLabelText('detail.remove_photo:2')).toBeInTheDocument()
  })

  it('first photo uses publicUrl of the first row (hero/cover, insert order)', async () => {
    loadJobPhotos.mockResolvedValueOnce([photo('p1'), photo('p2')])
    render(<JobPhotoManager jobId="job1" />)

    const imgs = await screen.findAllByRole('img')
    expect(imgs[0]).toHaveAttribute('src', 'https://cdn.test/jobs/job1/p1.jpg')
  })

  it('shows the Add photo (+) button when photos.length < 10', async () => {
    loadJobPhotos.mockResolvedValueOnce([photo('p1')])
    render(<JobPhotoManager jobId="job1" />)
    expect(await screen.findByLabelText('detail.add_photo')).toBeInTheDocument()
  })

  it('hides the Add photo (+) button at exactly 10 photos', async () => {
    loadJobPhotos.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => photo(`p${i}`)),
    )
    render(<JobPhotoManager jobId="job1" />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(10))
    expect(screen.queryByLabelText('detail.add_photo')).not.toBeInTheDocument()
  })

  it('renders the photo_management_hint beneath the grid', async () => {
    loadJobPhotos.mockResolvedValueOnce([])
    render(<JobPhotoManager jobId="job1" />)
    expect(await screen.findByText('detail.photo_management_hint')).toBeInTheDocument()
  })

  it('add button uses the same dashed-border styling as PostJobModal (criterion #6)', async () => {
    loadJobPhotos.mockResolvedValueOnce([])
    render(<JobPhotoManager jobId="job1" />)
    const btn = await screen.findByLabelText('detail.add_photo')
    expect(btn.className).toMatch(/border-dashed/)
  })
})

describe('JobPhotoManager remove flow (criterion #2)', () => {
  it('clicking × calls removeJobPhoto(path) then re-queries the list', async () => {
    loadJobPhotos.mockResolvedValueOnce([photo('p1')])
    render(<JobPhotoManager jobId="job1" />)

    const btn = await screen.findByLabelText('detail.remove_photo:1')
    loadJobPhotos.mockResolvedValueOnce([]) // refresh after delete
    fireEvent.click(btn)

    await waitFor(() => expect(removeJobPhoto).toHaveBeenCalledWith('jobs/job1/p1.jpg'))
    // refresh re-queried (initial load + post-remove refresh)
    await waitFor(() => expect(loadJobPhotos).toHaveBeenCalledTimes(2))
  })
})

describe('JobPhotoManager error handling', () => {
  it('does not crash when loadJobPhotos rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadJobPhotos.mockRejectedValueOnce(new Error('db down'))
    render(<JobPhotoManager jobId="job1" />)
    // hint still renders; no throw
    expect(await screen.findByText('detail.photo_management_hint')).toBeInTheDocument()
    spy.mockRestore()
  })
})
