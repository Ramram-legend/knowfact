import React from 'react'
import {
  Glasses,
  HardHat,
  Headphones,
  Footprints,
  ShieldCheck,
  AlertCircle,
  Wind,
  Sun,
  Hand,
} from 'lucide-react'
import type { PPEItem } from '../types'

interface PPEBadgesProps {
  items: PPEItem[]
  size?: 'sm' | 'md'
}

export const getPPEIcon = (code: string, className = 'h-5 w-5') => {
  switch (code.toLowerCase()) {
    case 'glasses':
      return <Glasses className={className} />
    case 'gloves':
      return <Hand className={className} />
    case 'helmet':
      return <HardHat className={className} />
    case 'safety_shoes':
      return <Footprints className={className} />
    case 'ear_protection':
      return <Headphones className={className} />
    case 'mask':
      return <Wind className={className} />
    case 'hi_vis':
      return <Sun className={className} />
    default:
      return <ShieldCheck className={className} />
  }
}

export default function PPEBadges({ items, size = 'md' }: PPEBadgesProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 italic">
        <AlertCircle className="h-4 w-4" /> Aucun EPI spécifique requis (EPI d'atelier standards).
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-2.5 text-blue-950 transition-shadow print:border-gray-400 print:bg-white print:p-2 ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-2xs print:border print:border-black print:bg-gray-100 print:text-black">
            {getPPEIcon(item.code, 'h-4 w-4')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-semibold text-xs leading-tight line-clamp-2 text-blue-900 print:text-black">
                {item.name}
              </span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-[11px] text-blue-700/80 leading-snug line-clamp-2 print:text-gray-700">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
