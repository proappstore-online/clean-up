import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'
import { LanguageSwitcher } from './LanguageSwitcher'

export function SignInScreen() {
  const { t } = useTranslation()

  return (
    <div className="relative flex items-center justify-center min-h-[70vh]">
      {/* Language switcher — accessible before sign-in */}
      <div className="absolute top-0 right-0">
        <LanguageSwitcher />
      </div>

      <div className="flex flex-col items-center gap-6 text-center px-6 w-full max-w-sm">
        {/* Logo / heading */}
        <Sparkles size={40} style={{ color: 'var(--accent)' }} />
        <h1
          className="display-font text-3xl font-bold"
          style={{ color: 'var(--ink)' }}
        >
          {t('header.title')}
        </h1>

        {/* Tagline */}
        <p style={{ color: 'var(--muted)' }}>
          {t('header.subtitle')}
        </p>

        {/* Sign-in prompt */}
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('auth.sign_in_prompt')}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            className="btn btn-primary w-full"
            style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}
            onClick={() => app.auth.signIn('google')}
          >
            {t('auth.sign_in_google')}
          </button>

          <button
            className="btn btn-secondary w-full"
            style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}
            onClick={() => app.auth.signIn()}
          >
            {t('auth.sign_in_github')}
          </button>
        </div>
      </div>
    </div>
  )
}
