import { useTranslation } from 'react-i18next'

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en',  label: 'English' },
  { code: 'zh',  label: '中文 (简体)' },
  { code: 'vi',  label: 'Tiếng Việt' },
  { code: 'ar',  label: 'العربية' },
  { code: 'yue', label: '廣東話' },
  { code: 'pa',  label: 'ਪੰਜਾਬੀ' },
  { code: 'el',  label: 'Ελληνικά' },
  { code: 'it',  label: 'Italiano' },
  { code: 'hi',  label: 'हिन्दी' },
]

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    void i18n.changeLanguage(e.target.value)
  }

  return (
    <div className="flex items-center gap-1">
      <label
        htmlFor="language-switcher"
        className="sr-only"
      >
        {t('language_switcher.label')}
      </label>
      <select
        id="language-switcher"
        aria-label={t('language_switcher.label')}
        value={i18n.language}
        onChange={handleChange}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
