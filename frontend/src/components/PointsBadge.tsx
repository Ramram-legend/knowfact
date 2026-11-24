import { useNavigate } from 'react-router-dom'

interface PointsBadgeProps {
  totalPoints: number
  level: number
  levelIcon: string
}

export default function PointsBadge({ totalPoints, level, levelIcon }: PointsBadgeProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/achievements')}
      className="bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-primary-100 transition-colors"
      title={`Level ${level} — Click to view achievements`}
    >
      <span>{levelIcon || '⭐'}</span>
      <span>{totalPoints.toLocaleString()} pts</span>
    </button>
  )
}
