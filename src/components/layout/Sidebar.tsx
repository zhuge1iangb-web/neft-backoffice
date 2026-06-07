'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { canAccessModule, type ModuleKey } from '@/lib/permissions'
import { clsx } from 'clsx'
import {
  HomeIcon, BriefcaseIcon, FolderOpenIcon, CurrencyDollarIcon,
  WrenchScrewdriverIcon, BellIcon, UsersIcon, CircleStackIcon,
  ArrowRightOnRectangleIcon, BuildingOffice2Icon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  ShoppingCartIcon, ArchiveBoxIcon, ChartBarIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import Image from 'next/image'

const navItems = (t: typeof translations.th): { href: string; label: string; icon: any; badge?: boolean; module: ModuleKey }[] => [
  { href: '/dashboard',      label: t.nav.dashboard,      icon: HomeIcon,               module: 'dashboard' },
  { href: '/sales',          label: t.nav.sales,          icon: BriefcaseIcon,          module: 'sales' },
  { href: '/projects',       label: t.nav.projects,       icon: FolderOpenIcon,         module: 'projects' },
  { href: '/finance',        label: t.nav.finance,        icon: CurrencyDollarIcon,     module: 'finance' },
  { href: '/service',        label: t.nav.service,        icon: WrenchScrewdriverIcon,  module: 'service' },
  { href: '/purchasing',     label: t.nav.purchasing,     icon: ShoppingCartIcon,       module: 'purchasing' },
  { href: '/inventory',      label: t.nav.inventory,      icon: ArchiveBoxIcon,         module: 'inventory' },
  { href: '/reports',        label: (t.nav as any).reports ?? 'รายงาน', icon: ChartBarIcon, module: 'reports' },
  { href: '/notifications',  label: t.nav.notifications,  icon: BellIcon, badge: true,  module: 'notifications' },
  { href: '/users',          label: t.nav.users,          icon: UsersIcon,              module: 'users' },
  { href: '/master',         label: t.nav.master,         icon: CircleStackIcon,        module: 'master' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, logout, notifications, currentUser } = useAppStore()
  const t = translations[lang]
  const [collapsed, setCollapsed] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length
  const visibleNavItems = navItems(t).filter(item => canAccessModule(currentUser?.role, item.module))

  const handleLogout = () => { logout(); router.push('/') }

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen text-white transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ backgroundColor: 'var(--brand-navy)' }}
    >
      {/* Logo bar — white background so logo sits flush */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-3 bg-white border-b border-gray-100 flex-shrink-0',
        collapsed ? 'px-2' : 'px-4'
      )}>
        {!collapsed ? (
          <div className="flex items-center flex-1 min-w-0">
            <Image
              src="/neft-logo.png"
              alt="NEFT Solution"
              width={130} height={54}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <Image
              src="/neft-logo.png"
              alt="NEFT"
              width={32} height={32}
              className="w-7 h-7 object-contain"
              priority
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-700 p-1 rounded flex-shrink-0 ml-1 transition-colors"
        >
          {collapsed ? <ChevronDoubleRightIcon className="w-3.5 h-3.5" /> : <ChevronDoubleLeftIcon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {visibleNavItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl text-sm transition-all relative',
                active
                  ? 'bg-white/15 text-white font-medium shadow-sm border border-white/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E84B0F] rounded-full text-[9px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {/* Customer Portal link */}
        <Link href="/customer-portal" target="_blank"
          className={clsx(
            'flex items-center gap-3 w-full px-2 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all',
            collapsed && 'justify-center'
          )}
        >
          <BuildingOffice2Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-xs">Customer Portal</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 w-full px-2 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-all',
            collapsed && 'justify-center'
          )}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{t.nav.logout}</span>}
        </button>
      </div>
    </aside>
  )
}
