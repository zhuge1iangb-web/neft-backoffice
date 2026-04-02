'use client'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { BellIcon, UserCircleIcon, LanguageIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { lang, setLang, currentUser, notifications } = useAppStore()
  const t = translations[lang]
  const router = useRouter()
  const unread = notifications.filter(n => !n.read).length

  const roleLabels: Record<string, string> = {
    'Admin': lang === 'th' ? 'ผู้ดูแลระบบ' : 'Admin',
    'CEO/Director': lang === 'th' ? 'ผู้บริหาร' : 'CEO/Director',
    'Sales': lang === 'th' ? 'ฝ่ายขาย' : 'Sales',
    'Project Manager': lang === 'th' ? 'ผู้จัดการโครงการ' : 'PM',
    'Finance': lang === 'th' ? 'ฝ่ายการเงิน' : 'Finance',
    'Service Support': lang === 'th' ? 'ฝ่ายบริการ' : 'Service',
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      <h1 className="text-lg font-semibold text-[#0F2654]">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
        >
          <LanguageIcon className="w-4 h-4" />
          <span className="font-medium">{lang === 'th' ? 'TH' : 'EN'}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">{lang === 'th' ? 'EN' : 'TH'}</span>
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
          <div className="w-8 h-8 rounded-full bg-[#1B3875] flex items-center justify-center text-white text-xs font-bold">
            {currentUser?.name.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-700 leading-tight">{currentUser?.name}</div>
            <div className="text-xs text-gray-400">{roleLabels[currentUser?.role || ''] || currentUser?.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
