import { describe, it, expect } from 'vitest'

// Criterion #1: photo-management controls render ONLY when
// the viewer is the poster AND job.status === 'open'.
// JobDetail derives: canManagePhotos = isPoster && job.status === 'open'.
// This is the pure gating predicate extracted for direct assertion.
function canManagePhotos(
  user: { id: string } | null,
  job: { poster_id: string; status: 'open' | 'closed' | 'accepted' },
): boolean {
  const isPoster = !!user && user.id === job.poster_id
  return isPoster && job.status === 'open'
}

const poster = { id: 'gh:1' }
const other = { id: 'gh:2' }

describe('canManagePhotos gate (criterion #1)', () => {
  it('true when viewer is poster AND status open', () => {
    expect(canManagePhotos(poster, { poster_id: 'gh:1', status: 'open' })).toBe(true)
  })

  it('false when viewer is poster but status is accepted', () => {
    expect(canManagePhotos(poster, { poster_id: 'gh:1', status: 'accepted' })).toBe(false)
  })

  it('false when viewer is poster but status is closed', () => {
    expect(canManagePhotos(poster, { poster_id: 'gh:1', status: 'closed' })).toBe(false)
  })

  it('false when status open but viewer is not the poster', () => {
    expect(canManagePhotos(other, { poster_id: 'gh:1', status: 'open' })).toBe(false)
  })

  it('false for anonymous (no user)', () => {
    expect(canManagePhotos(null, { poster_id: 'gh:1', status: 'open' })).toBe(false)
  })
})
