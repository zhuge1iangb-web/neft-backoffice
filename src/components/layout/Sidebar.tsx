'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { clsx } from 'clsx'
import {
  HomeIcon, BriefcaseIcon, FolderOpenIcon, CurrencyDollarIcon,
  WrenchScrewdriverIcon, BellIcon, UsersIcon, CircleStackIcon,
  ArrowRightOnRectangleIcon, BuildingOffice2Icon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  ShoppingCartIcon, ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const navItems = (t: typeof translations.th) => [
  { href: '/dashboard',      label: t.nav.dashboard,      icon: HomeIcon },
  { href: '/sales',          label: t.nav.sales,          icon: BriefcaseIcon },
  { href: '/projects',       label: t.nav.projects,       icon: FolderOpenIcon },
  { href: '/finance',        label: t.nav.finance,        icon: CurrencyDollarIcon },
  { href: '/service',        label: t.nav.service,        icon: WrenchScrewdriverIcon },
  { href: '/purchasing',     label: t.nav.purchasing,     icon: ShoppingCartIcon },
  { href: '/inventory',      label: t.nav.inventory,      icon: ArchiveBoxIcon },
  { href: '/notifications',  label: t.nav.notifications,  icon: BellIcon, badge: true },
  { href: '/users',          label: t.nav.users,          icon: UsersIcon },
  { href: '/master',         label: t.nav.master,         icon: CircleStackIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, logout, notifications } = useAppStore()
  const t = translations[lang]
  const [collapsed, setCollapsed] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = () => { logout(); router.push('/') }

  return (
    <aside className={clsx(
      'flex flex-col h-screen bg-[#0F2654] text-white transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E84B0F] rounded-lg flex items-center justify-center font-bold text-sm">N</div>
            <div>
              <div className="font-bold text-sm leading-tight">NEFT</div>
              <div className="text-xs text-blue-200">Backoffice</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-[#E84B0F] rounded-lg flex items-center justify-center font-bold text-sm mx-auto">N</div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-blue-300 hover:text-white p-1 rounded">
          {collapsed ? <ChevronDoubleRightIcon className="w-4 h-4" /> : <ChevronDoubleLeftIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems(t).map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 text-sm transition-all relative',
                active
                  ? 'bg-[#1B5BC6] text-white border-r-2 border-[#E84B0F]'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
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
      <div className="border-t border-white/10 p-3">
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
