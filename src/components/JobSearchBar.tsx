import { useRef } from 'react'

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
  onKeywordChange,
  statusFilter,
  onStatusFilterChange,
  onClear,
  inputValue,
  onInputChange,
}: Props) {
  const showClear = keyword !== '' || statusFilter !== 'open'

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="flex-1 relative">
        <label htmlFor="job-search" className="sr-only">
          Search jobs
        </label>
        <input
          id="job-search"
          type="text"
          placeholder="Search jobs…"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          🔍
        </span>
      </div>

      <div>
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">All</option>
          <option value="open">Open</option>
        </select>
      </div>

      {showClear && (
        <button
          onClick={onClear}
          aria-label="Clear search and filters"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}
