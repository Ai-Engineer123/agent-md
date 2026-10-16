import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export const CustomSelect = ({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select...',
  className = '',
  style = {},
  triggerStyle = {},
  searchable = null // if null, auto-enables when options.length > 6
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options to { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedOpt = normalizedOptions.find((o) => o.value === value);

  const shouldShowSearch = searchable !== null
    ? searchable
    : normalizedOptions.length > 6;

  const filteredOptions = shouldShowSearch && searchTerm.trim()
    ? normalizedOptions.filter((o) =>
        (o.label || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  return (
    <div
      className={`custom-select-container ${className}`}
      ref={containerRef}
      style={style}
    >
      {label && <label className="custom-select-label">{label}</label>}
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        style={triggerStyle}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchTerm('');
        }}
      >
        <span className="custom-select-val">
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {shouldShowSearch && (
            <div className="custom-select-search-wrap">
              <Search size={13} className="custom-select-search-icon" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="custom-select-search-input"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="custom-select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="custom-select-list">
            {filteredOptions.length === 0 ? (
              <div className="custom-select-empty">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={String(opt.value)}
                    className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="custom-select-opt-text">{opt.label}</span>
                    {isSelected && <Check size={14} color="#ff914d" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
