import { clsx } from 'clsx'
import React from 'react'

interface KPICardProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'navy'
  trend?: { value: number; label: string }
  onClick?: () => void
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100   text-blue-600',  border: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100  text-green-600', border: 'border-green-100' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600',border: 'border-orange-100' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100    text-red-600',   border: 'border-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600',border: 'border-purple-100' },
  navy:   { bg: 'bg-[#EBF3FF]', icon: 'bg-[#1B3875]  text-white',    border: 'border-blue-100' },
}

export default function KPICard({ title, value, sub, icon, color = 'blue', trend, onClick }: KPICardProps) {
  const c = colorMap[color]
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl p-5 border shadow-sm transition-all',
        c.border,
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          {trend && (
            <p className={clsx('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
