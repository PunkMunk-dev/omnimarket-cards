import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption { id: string; label: string; note?: string; }

interface QueryHeaderDropdownProps {
  label: string; value: string; placeholder: string; options: DropdownOption[];
  selectedId: string | null; onSelect: (id: string) => void; searchable?: boolean;
  showAllMode?: boolean; showAllActive?: boolean; onShowAll?: () => void;
  onSearchChange?: (search: string) => void;
}

export function QueryHeaderDropdown({ label, value, placeholder, options, selectedId, onSelect, searchable = false, showAllMode = false, showAllActive = false, onShowAll, onSearchChange }: QueryHeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        onSearchChange?.('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onSearchChange]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onSearchChange?.(val);
  };

  // When onSearchChange is provided, options are already server-filtered — skip client filter
  const filtered = searchable && search && !onSearchChange
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className={cn("om-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-white/10",
          isOpen && "ring-1",
          (selectedId || showAllActive) ? "" : "")}
        style={{
          background: 'var(--om-bg-2)',
          color: (selectedId || showAllActive) ? 'var(--om-text-0)' : 'var(--om-text-2)',
          ...(isOpen ? { boxShadow: '0 0 0 4px rgba(0,185,255,0.18)', borderColor: 'rgba(0,185,255,0.4)' } : {}),
        }}>
        {label && <span className="text-xs mr-1" style={{ color: 'var(--om-text-3)' }}>{label}</span>}
        <span className="truncate max-w-[100px]">{value || placeholder}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} style={{ color: 'var(--om-text-3)' }} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[260px] max-w-[320px] om-dropdown overflow-hidden">
          {searchable && (
            <div className="p-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--om-text-3)' }} />
                <input placeholder={`Search ${label.toLowerCase() || 'options'}...`} value={search} onChange={(e) => handleSearchChange(e.target.value)}
                  className="om-input w-full pl-8 h-9 text-sm rounded-md" autoFocus />
              </div>
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto p-1.5">
            {showAllMode && (
              <button onClick={() => { onShowAll?.(); setIsOpen(false); }}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                  showAllActive ? "" : "hover:bg-white/5")}
                style={showAllActive ? { background: 'rgba(0,185,255,0.1)', color: 'var(--om-accent)' } : { color: 'var(--om-text-1)' }}>
                <Layers className="h-4 w-4" /><span className="font-medium">All Brands</span>
                {showAllActive && <Check className="h-4 w-4 ml-auto" />}
              </button>
            )}
            {filtered.length === 0 ? <div className="px-3 py-6 text-center text-sm" style={{ color: 'var(--om-text-3)' }}>No results</div> :
              filtered.map(o => {
                const sel = !showAllActive && o.id === selectedId;
                return (
                  <button key={o.id} onClick={() => { onSelect(o.id); setIsOpen(false); setSearch(''); }}
                    className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                      sel ? "" : "hover:bg-white/5")}
                    style={sel ? { background: 'rgba(0,185,255,0.1)', color: 'var(--om-accent)' } : { color: 'var(--om-text-1)' }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{o.label}</span>
                      {o.note && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--om-text-3)' }}>{o.note}</p>}
                    </div>
                    {sel && <Check className="h-4 w-4 flex-shrink-0 ml-2" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

interface TraitsDropdownProps { traits: DropdownOption[]; selectedIds: string[]; onToggle: (id: string) => void; onClear?: () => void; }

export function TraitsDropdown({ traits, selectedIds, onToggle, onClear }: TraitsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const count = selectedIds.length;
  const labels = traits.filter(t => selectedIds.includes(t.id)).map(t => t.label);
  const display = count === 0 ? '' : count <= 2 ? labels.join(' · ') : `${count} traits`;

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className={cn("om-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-white/10")}
        style={{
          background: 'var(--om-bg-2)',
          color: count > 0 ? 'var(--om-text-0)' : 'var(--om-text-2)',
          ...(isOpen ? { boxShadow: '0 0 0 4px rgba(0,185,255,0.18)', borderColor: 'rgba(0,185,255,0.4)' } : {}),
        }}>
        <span className="text-xs mr-1" style={{ color: 'var(--om-text-3)' }}>Traits</span>
        <span className="truncate max-w-[80px]">{display || 'Any'}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} style={{ color: 'var(--om-text-3)' }} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[240px] om-dropdown overflow-hidden">
          <div className="p-3">
            <p className="text-[11px] mb-2.5" style={{ color: 'var(--om-text-3)' }}>Select multiple traits</p>
            <div className="grid grid-cols-2 gap-2">
              {traits.map(t => {
                const sel = selectedIds.includes(t.id);
                return (
                  <button key={t.id} onClick={() => onToggle(t.id)}
                    className={cn("om-btn flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all",
                      sel ? "om-pill-active" : "om-pill")}>
                    {sel && <Check className="h-3 w-3 flex-shrink-0" />}
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {count > 0 && (
            <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-[11px] truncate max-w-[160px]" style={{ color: 'var(--om-text-3)' }}>{labels.join(' · ')}</span>
              <button onClick={() => onClear ? onClear() : selectedIds.forEach(id => onToggle(id))} className="text-[11px]" style={{ color: 'var(--om-text-2)' }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
