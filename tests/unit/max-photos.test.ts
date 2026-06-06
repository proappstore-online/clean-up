import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// AC: MAX_PHOTOS in PostJobModal.tsx is 10; the slice cap and "add" gate use MAX_PHOTOS (not a hardcoded 4).
// We assert against the source text since the constant is module-private (not exported).

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = readFileSync(
  resolve(__dirname, '../../src/components/PostJobModal.tsx'),
  'utf8',
)

describe('PostJobModal MAX_PHOTOS constant', () => {
  it('declares MAX_PHOTOS = 10', () => {
    expect(SRC).toMatch(/const\s+MAX_PHOTOS\s*=\s*10\b/)
  })

  it('does not declare MAX_PHOTOS = 4 (old value)', () => {
    expect(SRC).not.toMatch(/const\s+MAX_PHOTOS\s*=\s*4\b/)
  })

  it('caps the photo array via .slice(0, MAX_PHOTOS) not a hardcoded number', () => {
    expect(SRC).toMatch(/\.slice\(0,\s*MAX_PHOTOS\)/)
    expect(SRC).not.toMatch(/\.slice\(0,\s*4\)/)
    expect(SRC).not.toMatch(/\.slice\(0,\s*10\)/)
  })

  it('gates the "add photo" button on photos.length < MAX_PHOTOS', () => {
    expect(SRC).toMatch(/photos\.length\s*<\s*MAX_PHOTOS/)
  })

  it('passes MAX_PHOTOS into post.photos_label via count interpolation', () => {
    expect(SRC).toMatch(/photos_label['"]\s*,\s*\{\s*count:\s*MAX_PHOTOS\s*\}/)
  })

  it('renders the cover-image helper text via t(post.cover_hint)', () => {
    expect(SRC).toMatch(/t\(\s*['"]post\.cover_hint['"]\s*\)/)
  })
})
