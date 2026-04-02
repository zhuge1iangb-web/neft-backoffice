'use client'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Button from '@/components/ui/Button'
import { BellIcon, CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'

const typeColors: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning:  'border-l-yellow-500 bg-yellow-50',
  info:     'border-l-blue-500 bg-blue-50',
}
const typeIcons: Record<string, string> = {
  critical: '🔴', warning: '🟡', info: '🔵',
}

export default function NotificationsPage() {
  const { lang, notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const t = translations[lang]
  const router = useRouter()

  const unread = notifications.filter(n => !n.read)
  const grouped = notifications.reduce((acc, n) => {
    const key = n.date
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {} as Record<string, typeof notifications>)

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{unread.length} รายการที่ยังไม่ได้อ่าน</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" icon={<CheckCircleIcon className="w-4 h-4" />}
            onClick={markAllNotificationsRead}>
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      {/* Notifications */}
      {sortedDates.map(date => (
        <div key={date}>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            {date === new Date().toISOString().split('T')[0] ? 'วันนี้' : date}
          </div>
          <div className="space-y-2">
            {grouped[date].map(n => (
              <div
                key={n.id}
                onClick={() => { markNotificationRead(n.id); if (n.link) router.push(n.link) }}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-sm',
                  typeColors[n.type] || 'border-l-gray-300 bg-white',
                  !n.read && 'shadow-sm',
                  n.read && 'opacity-60'
                )}
              >
                <span className="text-base flex-shrink-0">{typeIcons[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 mr-2">[{n.module}]</span>
                      <span className="text-sm font-medium text-gray-800">{n.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{n.time}</span>
                      {!n.read && <span className="w-2 h-2 bg-[#E84B0F] rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                </div>
                {!n.read && (
                  <button onClick={e => { e.stopPropagation(); markNotificationRead(n.id) }}
                    className="text-gray-400 hover:text-green-600 p-1 rounded transition-colors flex-shrink-0">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {notifications.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BellIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่มีการแจ้งเตือน</p>
        </div>
      )}
    </div>
  )
}
