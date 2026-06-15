import { SearchIcon, CloseIcon } from './Icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** SearchBar.swift — input with leading magnifier and a clear button. */
export function SearchBar({ value, onChange, placeholder = 'search' }: SearchBarProps) {
  return (
    <div className="search-bar">
      <SearchIcon size={18} />
      <input
        className="search-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" type="button" onClick={() => onChange('')} aria-label="Clear search">
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  )
}
