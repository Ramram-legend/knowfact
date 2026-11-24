interface LevelBadgeProps {
  level: number
  levelName: string
  levelIcon: string
  size?: 'sm' | 'md' | 'lg'
  showIconOnly?: boolean
}

export default function LevelBadge({
  level,
  levelName,
  levelIcon,
  size = 'md',
  showIconOnly = false,
}: LevelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  }

  // Level colors
  const levelColors: Record<number, string> = {
    1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    2: 'bg-teal-50 text-teal-700 border-teal-200',
    3: 'bg-blue-50 text-blue-700 border-blue-200',
    4: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    5: 'bg-purple-50 text-purple-700 border-purple-200',
    6: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  const colorClass = levelColors[level] || 'bg-gray-50 text-gray-700 border-gray-200'

  if (showIconOnly) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border shadow-2xs ${colorClass}`}
        title={`Niveau ${level} — ${levelName}`}
      >
        <span>{levelIcon}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold shadow-2xs transition-colors ${sizeClasses[size]} ${colorClass}`}
    >
      <span className="text-base leading-none">{levelIcon}</span>
      <span>Niv. {level}</span>
      <span className="text-gray-300 font-normal">·</span>
      <span className="truncate max-w-[120px]">{levelName}</span>
    </span>
  )
}

