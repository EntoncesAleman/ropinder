"use client";
import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface Suggestion { label: string; latitude: number; longitude: number }

interface Props {
  value: string;
  onChange: (address: string) => void;
  onSelect: (s: Suggestion) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      if (res.ok) { setSuggestions(await res.json()); setOpen(true); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text" value={value} placeholder={placeholder ?? "Domicilio"}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(s); onChange(s.label); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs text-slate-600 hover:bg-rose-50 border-b border-slate-50 last:border-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
