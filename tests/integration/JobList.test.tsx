import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'

// Minimal real i18n so t() returns the en.json values
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../src/locales/en.json'

import { JobList } from '../../src/components/JobList'

beforeAll(async () => {
  await i18next.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  })
})

describe('JobList empty state (i18n + icon)', () => {
  it('renders translated empty-state strings, not hardcoded English literals', () => {
    render(<JobList jobs={[]} loading={false} onSelect={vi.fn()} />)
    expect(screen.getByText(en.jobs.empty_no_jobs)).toBeInTheDocument()
    expect(screen.getByText(en.jobs.empty_be_first)).toBeInTheDocument()
  })

  it('does not render the 🧹 broom emoji in the empty state', () => {
    const { container } = render(<JobList jobs={[]} loading={false} onSelect={vi.fn()} />)
    expect(container.textContent ?? '').not.toContain('🧹')
  })

  it('renders an svg icon (Sparkles) in the empty state', () => {
    const { container } = render(<JobList jobs={[]} loading={false} onSelect={vi.fn()} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('shows skeleton (no empty-state text) while loading', () => {
    render(<JobList jobs={[]} loading={true} onSelect={vi.fn()} />)
    expect(screen.queryByText(en.jobs.empty_no_jobs)).toBeNull()
  })
})
