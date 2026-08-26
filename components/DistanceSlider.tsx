"use client";
import Link from "next/link";
import { MapPin, Lock } from "lucide-react";
import { RADIUS_STEPS_KM, FREE_MAX_RADIUS_KM } from "@/lib/searchRadius";

interface Props {
  value: number;
  onChange: (v: number) => void;
  isPremium: boolean;
}

export function DistanceSlider({ value, onChange, isPremium }: Props) {
  const idx = RADIUS_STEPS_KM.indexOf(value as (typeof RADIUS_STEPS_KM)[number]);

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <MapPin size={14} className="text-rose-400" />
        <span>Radio: <strong className="text-rose-500">{value} km</strong></span>
      </div>
      <div className="flex gap-1 w-full">
        {RADIUS_STEPS_KM.map((step, i) => {
          const locked = !isPremium && step > FREE_MAX_RADIUS_KM;
          if (locked) {
            return (
              <Link key={step} href="/premium" title="Radio ampliado — disponible con Premium"
                className="flex-1 flex items-center justify-center gap-1 rounded-full py-1.5 text-xs font-semibold bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all">
                <Lock size={10} /> {step} km
              </Link>
            );
          }
          return (
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
          );
        })}
      </div>
    </div>
  );
}
