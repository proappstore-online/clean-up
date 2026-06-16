import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'

export function SignInScreen() {
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--paper)' }}
    >
      <div
        className="card text-center w-full max-w-sm mx-4"
        style={{ padding: '2.5rem 2rem' }}
      >
        {/* Logo / wordmark */}
        <div
          className="flex items-center justify-center gap-2 mb-2"
          style={{ color: 'var(--accent)' }}
        >
          <Sparkles size={36} />
          <span
            className="display-font"
            style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink)' }}
          >
            {t('header.title')}
          </span>
        </div>

        {/* Tagline */}
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {t('header.subtitle')}
        </p>

        {/* Sign-in prompt */}
        <p style={{ color: 'var(--ink)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          {t('auth.sign_in_prompt')}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            className="btn btn-primary w-full"
            onClick={() => app.auth.signIn('google')}
          >
            {t('auth.sign_in_google')}
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={() => app.auth.signIn()}
          >
            {t('auth.sign_in_github')}
          </button>
        </div>
      </div>
    </div>
  )
}
