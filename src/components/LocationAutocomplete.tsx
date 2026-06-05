import { useState, useEffect, useRef, useCallback } from 'react'
import { app } from '../lib/app'

interface GeoResultLocal {
  lat: number
  lng: number
  displayName: string
}

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  onSelect: (lat: number | null, lng: number | null) => void
  placeholder?: string
  className?: string
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) {
  const [results, setResults] = useState<GeoResultLocal[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track whether current value came from a selection (to avoid re-geocoding on selection)
  const selectedRef = useRef(false)
  // Track query version to discard stale responses
  const queryVersionRef = useRef(0)

  // Debounced geocode
  useEffect(() => {
    if (selectedRef.current) {
      // value was just set via selection — skip geocode
      selectedRef.current = false
      return
    }

    const trimmed = value.trim()
    if (!trimmed) {
      setResults([])
      setNoResults(false)
      setOpen(false)
      setLoading(false)
      return
    }

    const version = ++queryVersionRef.current
    setLoading(true)
    setNoResults(false)

    const timer = setTimeout(() => {
      app.maps
        .geocode(trimmed)
        .then((res) => {
          if (version !== queryVersionRef.current) return // stale
          const top5: GeoResultLocal[] = res.slice(0, 5).map((r) => ({
            lat: r.lat,
            lng: r.lng,
            displayName: r.displayName,
          }))
          setResults(top5)
          setNoResults(top5.length === 0)
          setOpen(true)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (version !== queryVersionRef.current) return // stale
          console.error('Geocode error:', err)
          setResults([])
          setNoResults(false)
          setOpen(false)
          setLoading(false)
        })
    }, 400)

    return () => {
      clearTimeout(timer)
    }
  }, [value])

  // Outside click dismissal
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Escape key dismissal
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      inputRef.current?.focus()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // User is editing — reset coordinates
    onSelect(null, null)
    onChange(e.target.value)
  }

  const handleSelect = useCallback(
    (result: GeoResultLocal) => {
      selectedRef.current = true
      onChange(result.displayName)
      onSelect(result.lat, result.lng)
      setOpen(false)
      setResults([])
      setNoResults(false)
    },
    [onChange, onSelect],
  )

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
        />
        {loading && (
          <span
            aria-label="Loading location suggestions"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <span className="block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {open && (
        <ul
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          {noResults ? (
            <li className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 select-none">
              No results found
            </li>
          ) : (
            results.map((result, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    // Use mousedown so it fires before the input's blur
                    e.preventDefault()
                    handleSelect(result)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-100
                    dark:text-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer truncate"
                >
                  {result.displayName}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
