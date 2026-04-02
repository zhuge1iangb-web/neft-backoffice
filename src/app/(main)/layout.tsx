'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { hasSupabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { usePathname } from 'next/navigation'
import { translations } from '@/lib/translations'

function usePageTitle() {
  const pathname = usePathname()
  const { lang } = useAppStore()
  const t = translations[lang]
  const map: Record<string, string> = {
    '/dashboard':    t.dashboard.title,
    '/sales':        t.sales.title,
    '/projects':     t.projects.title,
    '/finance':      t.finance.title,
    '/service':      t.service.title,
    '/notifications':t.notifications.title,
    '/users':        t.users.title,
    '/master':       t.master.title,
  }
  const key = Object.keys(map).find(k => pathname.startsWith(k)) || '/dashboard'
  return map[key] || t.appName
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, initialized, initialize } = useAppStore()
  const router = useRouter()
  const title = usePageTitle()

  useEffect(() => {
    if (!currentUser) router.replace('/')
  }, [currentUser, router])

  useEffect(() => {
    if (currentUser && !initialized) {
      initialize()
    }
  }, [currentUser, initialized, initialize])

  if (!currentUser) return null

  const isLoading = hasSupabase && !initialized

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FA]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B3875] mx-auto mb-4" />
                <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  )
}
