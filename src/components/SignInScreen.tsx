import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { app } from '../lib/app'

export function SignInScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-white dark:bg-gray-900">
      <div className="card w-full max-w-sm p-10 text-center">
        {/* Logo / heading */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={32} style={{ color: 'var(--accent)' }} />
          <h1 className="display-font text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            CleanMarket
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          {t('auth.sign_in_prompt')}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            className="btn btn-primary w-full py-3 text-base"
            onClick={() => app.auth.signIn('google')}
          >
            {t('auth.sign_in_google')}
          </button>

          <button
            className="btn btn-secondary w-full py-3 text-base"
            onClick={() => app.auth.signIn()}
          >
            {t('auth.sign_in_github')}
          </button>
        </div>
      </div>
    </div>
  )
}
