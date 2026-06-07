'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { BellIcon, LanguageIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { lang, setLang, theme, setTheme, currentUser, notifications } = useAppStore()
  const t = translations[lang]
  const router = useRouter()
  const unread = notifications.filter(n => !n.read).length
  const isRed = theme === 'red'

  // Apply red-theme class on mount/hydration
  useEffect(() => {
    document.documentElement.classList.toggle('red-theme', isRed)
  }, [isRed])

  // สี header/sidebar ตาม theme
  const headerBg = isRed
    ? 'bg-white border-b border-gray-200'
    : 'bg-white border-b border-gray-200'

  const roleLabel = (t as any).roles?.[currentUser?.role || ''] || currentUser?.role || ''

  return (
    <header className={`h-14 ${headerBg} flex items-center justify-between px-6 flex-shrink-0 shadow-sm transition-colors`}>
      <h1 className="text-lg font-semibold text-[var(--brand-navy)]">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
        >
          <LanguageIcon className="w-4 h-4" />
          <span className="font-medium">{lang === 'th' ? 'TH' : 'EN'}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">{lang === 'th' ? 'EN' : 'TH'}</span>
        </button>

        {/* Blue/Red Theme Toggle */}
        <button
          onClick={() => setTheme(isRed ? 'blue' : 'red')}
          title={isRed ? 'เปลี่ยนเป็นธีมน้ำเงิน' : 'เปลี่ยนเป็นธีมแดง'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          style={{ color: isRed ? '#8B1A1A' : '#1B3875' }}
        >
          {/* แสดงสี่เหลี่ยมสีตรงข้าม เพื่อ preview ว่ากดแล้วจะเปลี่ยนเป็นอะไร */}
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block"
            style={{ backgroundColor: isRed ? '#1B3875' : '#8B1A1A' }}
          />
          <span className="font-medium text-xs hidden sm:inline">
            {isRed ? 'Blue' : 'Red'}
          </span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--brand-navy)' }}
          >
            {currentUser?.name.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-700 leading-tight">{currentUser?.name}</div>
            <div className="text-xs text-gray-400">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
