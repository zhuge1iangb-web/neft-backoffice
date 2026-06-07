'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { hasSupabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { usePathname } from 'next/navigation'
import { translations } from '@/lib/translations'
import { useSLAAlerts } from '@/hooks/useSLAAlerts'
import { canAccessPath } from '@/lib/permissions'

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
    '/reports':      t.nav.reports,
    '/notifications':t.notifications.title,
    '/users':        t.users.title,
    '/master':       t.master.title,
  }
  const key = Object.keys(map).find(k => pathname.startsWith(k)) || '/dashboard'
  return map[key] || t.appName
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, initialized, initialize, hasHydrated, subscribeRealtime } = useAppStore()
  const router = useRouter()
  const pathname = usePathname()
  const title = usePageTitle()
  useSLAAlerts()

  // Wait for the persisted store to rehydrate from localStorage before deciding
  // whether to redirect — otherwise currentUser is briefly null on every page
  // refresh and this bounces the user back to the login page.
  useEffect(() => {
    if (hasHydrated && !currentUser) router.replace('/')
  }, [hasHydrated, currentUser, router])

  // ตรวจสิทธิ์ตาม role — ถ้า staff พิมพ์ URL ตรงไปยัง module ที่ไม่ควรเห็น
  // ให้เด้งกลับไปหน้า dashboard (ป้องกันการเข้าถึงนอกเหนือจากเมนูที่ Sidebar กรองไว้)
  useEffect(() => {
    if (hasHydrated && currentUser && !canAccessPath(currentUser.role, pathname)) {
      router.replace('/dashboard')
    }
  }, [hasHydrated, currentUser, pathname, router])

  useEffect(() => {
    if (currentUser && !initialized) {
      initialize()
    }
  }, [currentUser, initialized, initialize])

  // Once data is loaded, subscribe to Supabase Realtime so that changes made
  // by other logged-in users (in other browser tabs/sessions) are reflected
  // here automatically — no manual refresh needed.
  useEffect(() => {
    if (currentUser && initialized) {
      subscribeRealtime()
    }
  }, [currentUser, initialized, subscribeRealtime])

  if (!hasHydrated || !currentUser) return null

  const isLoading = hasSupabase && !initialized

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6FA] dark:bg-gray-950 transition-colors">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B3875] mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {translations[useAppStore.getState().lang].common.loading}
                </p>
              </div>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  )
}
