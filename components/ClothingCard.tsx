"use client";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Tag, Ruler, Star, MapPin, Megaphone } from "lucide-react";

export interface ClothingItemWithDistance {
  id: string;
  title: string;
  size: string;
  brand: string;
  condition: string;
  imageUrl: string;
  distance: number;
  isAd?: boolean;
  user: { id: string; name: string; avatar: string; ratingAvg?: number; ratingCount?: number };
}

interface Props {
  item: ClothingItemWithDistance;
  onSwipe: (id: string, type: "LIKE" | "DISLIKE") => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 120;

export function ClothingCard({ item, onSwipe, isTop }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-25, 25]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const dislikeOpacity = useTransform(x, [-100, -20], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe(item.id, "LIKE");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe(item.id, "DISLIKE");
    }
  }

  const conditionColor: Record<string, string> = {
    Nuevo: "bg-emerald-100 text-emerald-700",
    "Muy bueno": "bg-blue-100 text-blue-700",
    Bueno: "bg-amber-100 text-amber-700",
    Regular: "bg-slate-100 text-slate-600",
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      style={{ x, rotate }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.03 }}
    >
      <motion.div
        className="absolute top-8 left-6 z-10 rotate-[-20deg] border-4 border-emerald-400 rounded-xl px-4 py-2 text-emerald-400 font-extrabold text-2xl tracking-widest uppercase"
        style={{ opacity: likeOpacity }}
      >
        Me gusta
      </motion.div>
      <motion.div
        className="absolute top-8 right-6 z-10 rotate-[20deg] border-4 border-rose-400 rounded-xl px-4 py-2 text-rose-400 font-extrabold text-2xl tracking-widest uppercase"
        style={{ opacity: dislikeOpacity }}
      >
        Nope
      </motion.div>

      <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-white flex flex-col">
        <div className="relative flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {item.isAd && (
            <span className="absolute top-4 left-4 flex items-center gap-1 text-[10px] font-semibold bg-violet-500 text-white rounded-full px-2.5 py-1">
              <Megaphone size={10} /> Publicidad
            </span>
          )}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-2xl font-bold drop-shadow">{item.title}</h2>
            <div className="flex items-center gap-1 mt-1 text-sm opacity-90">
              <img
                src={item.user.avatar}
                alt={item.user.name}
                className="w-5 h-5 rounded-full object-cover border border-white"
              />
              <span>{item.user.name}</span>
              {!!item.user.ratingCount && (
                <span className="flex items-center gap-0.5 ml-1">
                  <Star size={11} fill="currentColor" className="text-amber-400" />
                  {item.user.ratingAvg?.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-wrap gap-2 items-center bg-white">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
            <Ruler size={12} /> Talle {item.size}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
            <Tag size={12} /> {item.brand}
          </span>
          <span className={`flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1 ${conditionColor[item.condition] ?? "bg-slate-100 text-slate-600"}`}>
            <Star size={12} /> {item.condition}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-50 rounded-full px-3 py-1 ml-auto">
            <MapPin size={12} /> {item.distance.toFixed(1)} km
          </span>
        </div>
      </div>
    </motion.div>
  );
}
