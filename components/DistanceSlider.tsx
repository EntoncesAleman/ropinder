"use client";
import { MapPin } from "lucide-react";

const STEPS = [1, 5, 20, 50];

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function DistanceSlider({ value, onChange }: Props) {
  const idx = STEPS.indexOf(value);

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <MapPin size={14} className="text-rose-400" />
        <span>Radio: <strong className="text-rose-500">{value} km</strong></span>
      </div>
      <div className="flex gap-1 w-full">
        {STEPS.map((step, i) => (
          <button
            key={step}
            onClick={() => onChange(step)}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
              i === idx
                ? "bg-rose-500 text-white shadow"
                : "bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600"
            }`}
          >
            {step} km
          </button>
        ))}
      </div>
    </div>
  );
}
