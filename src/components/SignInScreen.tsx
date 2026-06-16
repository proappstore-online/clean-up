import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'

export function SignInScreen() {
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: 'var(--paper)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        {/* Logo / heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={32} style={{ color: 'var(--accent)' }} />
          <h1
            className="display-font"
            style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}
          >
            CleanMarket
          </h1>
        </div>

        {/* Tagline */}
        <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.5 }}>
          {t('auth.sign_in_prompt')}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem' }}
            onClick={() => app.auth.signIn('google')}
          >
            {t('auth.sign_in_google')}
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem' }}
            onClick={() => app.auth.signIn()}
          >
            {t('auth.sign_in_github')}
          </button>
        </div>
      </div>
    </div>
  )
}
