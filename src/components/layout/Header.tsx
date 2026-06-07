'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { BellIcon, LanguageIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { lang, setLang, theme, setTheme, currentUser, notifications } = useAppStore()
  const t = translations[lang]
  const router = useRouter()
  const unread = notifications.filter(n => !n.read).length

  // Apply dark class on mount/hydration
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const roleLabel = (t as any).roles?.[currentUser?.role || ''] || currentUser?.role || ''

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm transition-colors">
      <h1 className="text-lg font-semibold text-[#0F2654] dark:text-blue-300">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
        >
          <LanguageIcon className="w-4 h-4" />
          <span className="font-medium">{lang === 'th' ? 'TH' : 'EN'}</span>
          <span className="text-gray-300 dark:text-gray-500">|</span>
          <span className="text-gray-400 dark:text-gray-500">{lang === 'th' ? 'EN' : 'TH'}</span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={t.theme?.toggle || 'Toggle Theme'}
          className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {theme === 'light'
            ? <MoonIcon className="w-5 h-5" />
            : <SunIcon className="w-5 h-5 text-yellow-400" />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-[#1B3875] flex items-center justify-center text-white text-xs font-bold">
            {currentUser?.name.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">{currentUser?.name}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
