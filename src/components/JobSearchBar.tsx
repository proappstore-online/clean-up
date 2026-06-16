import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  keyword: string
  onKeywordChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  onClear: () => void
  inputValue: string
  onInputChange: (v: string) => void
}

export function JobSearchBar({
  keyword,
  statusFilter,
  onStatusFilterChange,
  onClear,
  inputValue,
  onInputChange,
}: Props) {
  const { t } = useTranslation()
  const showClear = keyword !== '' || statusFilter !== 'open'

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1 relative">
        <label htmlFor="job-search" className="sr-only">
          {t('search.label')}
        </label>
        <input
          id="job-search"
          type="text"
          placeholder={t('search.placeholder')}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="input w-full pl-10 pr-3 py-2"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--muted)' }}
          aria-hidden="true"
        />
      </div>

      <div>
        <label htmlFor="status-filter" className="sr-only">
          {t('search.status_label')}
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="input w-full sm:w-auto px-3 py-2"
        >
          <option value="">{t('search.status_all')}</option>
          <option value="open">{t('search.status_open')}</option>
        </select>
      </div>

      {showClear && (
        <button
          onClick={onClear}
          aria-label={t('search.clear')}
          className="btn btn-secondary px-4 py-2 text-sm font-medium"
        >
          {t('search.clear')}
        </button>
      )}
    </div>
  )
}
