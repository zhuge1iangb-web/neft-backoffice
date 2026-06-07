'use client'
import type { ReactNode } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate } from '@/lib/export'
import { canAccessModule } from '@/lib/permissions'
import KPICard from '@/components/ui/KPICard'
import Badge, { stageBadgeVariant, projectStatusVariant, severityVariant } from '@/components/ui/Badge'
import {
  BriefcaseIcon, FolderOpenIcon, CurrencyDollarIcon, WrenchScrewdriverIcon,
  ExclamationTriangleIcon, CalendarDaysIcon, ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts'
import { useRouter } from 'next/navigation'
import { monthlyRevenueData, projectStatusData, pipelineChartData } from '@/lib/demo-data'

export default function DashboardPage() {
  const { lang, currentUser, opportunities, projects, invoices, tickets, notifications, contracts, salesTargets } = useAppStore()
  const t = translations[lang]
  const router = useRouter()

  const role = currentUser?.role
  const showSales = canAccessModule(role, 'sales')
  const showProjects = canAccessModule(role, 'projects')
  const showFinance = canAccessModule(role, 'finance')
  const showService = canAccessModule(role, 'service')
  const isAdminCeo = ['Admin', 'CEO/Director'].includes(role || '')
  const isSalesRole = role === 'Sales'

  // Sales Target for current user (if Sales role) or org target (if Admin/CEO)
  const currentYear = new Date().getFullYear()
  const wonThisYearOpps = opportunities.filter(o => o.status === 'won')
  const myWonOpps = isSalesRole
    ? wonThisYearOpps.filter(o => o.owner === currentUser?.name)
    : wonThisYearOpps
  const myActualRevenue = myWonOpps.reduce((s, o) => s + o.value, 0)
  const myActualGp = myWonOpps.reduce((s, o) => s + o.gp, 0)

  const myPersonalTarget = isSalesRole
    ? salesTargets.find(t => t.userId === currentUser?.id && t.year === currentYear && !t.month && !t.isOrgTarget)
    : null
  const orgAnnualTarget = salesTargets.find(t => t.isOrgTarget && t.year === currentYear && !t.month)

  // KPI calcs
  const activeOpps = opportunities.filter(o => o.status === 'active')
  const totalPipeline = activeOpps.reduce((s, o) => s + o.value, 0)
  const closingThisMonth = activeOpps
    .filter(o => o.expectedClose?.startsWith('2026-04'))
    .reduce((s, o) => s + o.value, 0)

  const activeProjects = projects.filter(p => ['Planning','Waiting for Customer','In Progress','On Hold'].includes(p.status))
  const delayedProjects = projects.filter(p => p.status === 'Delayed')

  const overdueAR = invoices.filter(i => i.overdue).reduce((s, i) => s + (i.billedAmount - i.paidAmount), 0)
  const openTickets = tickets.filter(t => !['Closed','Resolved'].includes(t.status))
  const criticalTickets = tickets.filter(t => t.severity === 'Critical' && !['Closed','Resolved'].includes(t.status))
  const unreadAlerts = notifications.filter(n => !n.read)
  const expiringContracts = contracts.filter(c => c.daysLeft > 0 && c.daysLeft <= 60)

  const wonThisYear = opportunities.filter(o => o.status === 'won').length
  const lostThisYear = opportunities.filter(o => o.status === 'lost').length
  const winRate = wonThisYear + lostThisYear > 0 ? Math.round(wonThisYear / (wonThisYear + lostThisYear) * 100) : 0

  const alertColors: Record<string, string> = { critical: 'bg-red-50 border-red-200 text-red-700', warning: 'bg-yellow-50 border-yellow-200 text-yellow-700', info: 'bg-blue-50 border-blue-200 text-blue-600' }

  // Build the list of KPI cards this user's role is allowed to see
  const kpiCards: ReactNode[] = []
  if (showSales) {
    kpiCards.push(
      <KPICard key="activePipeline" title={t.dashboard.activePipeline} value={formatCurrency(totalPipeline)} sub={`${activeOpps.length} โอกาสขาย`} icon={<BriefcaseIcon className="w-5 h-5" />} color="blue" onClick={() => router.push('/sales')} />,
      <KPICard key="closingThisMonth" title={t.dashboard.closingThisMonth} value={formatCurrency(closingThisMonth)} sub="คาดปิดเดือนนี้" icon={<ArrowTrendingUpIcon className="w-5 h-5" />} color="green" onClick={() => router.push('/sales')} />,
      <KPICard key="winRate" title={t.dashboard.winRate} value={`${winRate}%`} sub={`${wonThisYear} won / ${lostThisYear} lost`} icon={<ArrowTrendingUpIcon className="w-5 h-5" />} color="purple" />,
    )
  }
  if (showProjects) {
    kpiCards.push(
      <KPICard key="activeProjects" title={t.dashboard.activeProjects} value={activeProjects.length} sub={`${delayedProjects.length} โครงการล่าช้า`} icon={<FolderOpenIcon className="w-5 h-5" />} color={delayedProjects.length > 0 ? 'orange' : 'navy'} onClick={() => router.push('/projects')} />,
    )
  }
  if (showFinance) {
    kpiCards.push(
      <KPICard key="overdueAR" title={t.dashboard.overdueAR} value={formatCurrency(overdueAR)} sub={`${invoices.filter(i=>i.overdue).length} ใบแจ้งหนี้`} icon={<CurrencyDollarIcon className="w-5 h-5" />} color="red" onClick={() => router.push('/finance')} />,
    )
  }
  if (showService) {
    kpiCards.push(
      <KPICard key="openTickets" title={t.dashboard.openTickets} value={openTickets.length} sub={`${criticalTickets.length} วิกฤต`} icon={<WrenchScrewdriverIcon className="w-5 h-5" />} color={criticalTickets.length > 0 ? 'red' : 'blue'} onClick={() => router.push('/service')} />,
      <KPICard key="maExpiring" title={t.dashboard.maExpiring} value={expiringContracts.length} sub="สัญญาใกล้หมดอายุ (60 วัน)" icon={<CalendarDaysIcon className="w-5 h-5" />} color="orange" onClick={() => router.push('/service')} />,
    )
  }
  // Alerts is visible to everyone — it's a personal/system-wide notification count, not a department metric
  kpiCards.push(
    <KPICard key="alerts" title={t.dashboard.alerts} value={unreadAlerts.length} sub="การแจ้งเตือนที่ยังไม่ได้อ่าน" icon={<ExclamationTriangleIcon className="w-5 h-5" />} color={unreadAlerts.length > 0 ? 'orange' : 'green'} onClick={() => router.push('/notifications')} />,
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards — filtered by role/module access */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards}
      </div>

      {/* Charts Row — only show charts relevant to modules this role can access */}
      {(showFinance || showProjects) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Revenue */}
          {showFinance && (
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0F2654] mb-4">รายรับ vs การรับชำระ (รายเดือน)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3875" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#1B3875" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="รายรับ" stroke="#1B3875" fill="url(#rev)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="collection" name="รับชำระ" stroke="#E84B0F" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Project Status Pie */}
          {showProjects && (
            <div className={showFinance ? '' : 'lg:col-span-3'}>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F2654] mb-4">สถานะโครงการ</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {projectStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Chart — Sales only */}
      {showSales && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F2654] mb-4">Sales Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={pipelineChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" name="มูลค่า" fill="#1B3875" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales Target Progress — Sales rep sees own target, Admin/CEO sees org target */}
      {showSales && (myPersonalTarget || orgAnnualTarget) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0F2654] dark:text-blue-300">
              🎯 {isSalesRole
                ? (lang === 'th' ? `เป้าหมายของคุณ ปี ${currentYear}` : `Your Target ${currentYear}`)
                : (lang === 'th' ? `เป้าองค์กร ปี ${currentYear}` : `Org Target ${currentYear}`)}
            </h3>
            <button onClick={() => router.push('/sales')} className="text-xs text-[#1B3875] hover:underline">
              {lang === 'th' ? 'ดูรายละเอียด' : 'View Details'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Target */}
            {(() => {
              const tgt = isSalesRole ? myPersonalTarget : orgAnnualTarget
              const targetRev = tgt?.targetRevenue ?? 0
              const pct = targetRev > 0 ? Math.min(100, (myActualRevenue / targetRev) * 100) : 0
              return (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{lang === 'th' ? 'ยอดขาย' : 'Revenue'}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(myActualRevenue)} / {formatCurrency(targetRev)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${myActualRevenue >= targetRev ? 'bg-green-500' : 'bg-[#1B3875]'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className={`text-xs mt-1 font-medium ${myActualRevenue >= targetRev ? 'text-green-600' : 'text-orange-500'}`}>
                    {targetRev > 0
                      ? myActualRevenue >= targetRev
                        ? (lang === 'th' ? `✅ เกินเป้า +${formatCurrency(myActualRevenue - targetRev)}` : `✅ Exceeded +${formatCurrency(myActualRevenue - targetRev)}`)
                        : (lang === 'th' ? `⚠️ ขาด ${formatCurrency(targetRev - myActualRevenue)} (${pct.toFixed(0)}%)` : `⚠️ Gap ${formatCurrency(targetRev - myActualRevenue)} (${pct.toFixed(0)}%)`)
                      : (lang === 'th' ? 'ยังไม่ตั้งเป้า' : 'No target set')}
                  </div>
                </div>
              )
            })()}
            {/* GP Target */}
            {(() => {
              const tgt = isSalesRole ? myPersonalTarget : orgAnnualTarget
              const targetGp = tgt?.targetGp ?? 0
              const pct = targetGp > 0 ? Math.min(100, (myActualGp / targetGp) * 100) : 0
              return (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>GP</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(myActualGp)} / {formatCurrency(targetGp)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${myActualGp >= targetGp ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className={`text-xs mt-1 font-medium ${myActualGp >= targetGp ? 'text-green-600' : 'text-orange-500'}`}>
                    {targetGp > 0
                      ? myActualGp >= targetGp
                        ? (lang === 'th' ? `✅ เกิน GP +${formatCurrency(myActualGp - targetGp)}` : `✅ GP Exceeded`)
                        : (lang === 'th' ? `⚠️ GP ขาด ${formatCurrency(targetGp - myActualGp)}` : `⚠️ GP Gap ${formatCurrency(targetGp - myActualGp)}`)
                      : (lang === 'th' ? 'ยังไม่ตั้งเป้า GP' : 'No GP target')}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Bottom Row: Alerts (everyone) + Active Opportunities (Sales only) */}
      <div className={`grid grid-cols-1 ${showSales ? 'lg:grid-cols-2' : ''} gap-4`}>
        {/* Critical Alerts */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0F2654]">{t.dashboard.alerts}</h3>
            <span className="text-xs text-gray-400">{unreadAlerts.length} รายการ</span>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
            {unreadAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">ไม่มีการแจ้งเตือนใหม่</p>
            ) : unreadAlerts.map(n => (
              <div key={n.id} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${alertColors[n.type] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="opacity-80">{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Opportunities — Sales only */}
        {showSales && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0F2654]">โอกาสขายสำคัญ</h3>
              <button className="text-xs text-[#1B3875] hover:underline" onClick={() => router.push('/sales')}>ดูทั้งหมด</button>
            </div>
            <div className="space-y-2">
              {opportunities.filter(o => o.status === 'active').slice(0,5).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{o.name}</div>
                    <div className="text-xs text-gray-400">{o.customerName}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-[#1B3875]">{formatCurrency(o.value)}</div>
                    <Badge variant={stageBadgeVariant(o.stage)}>{o.stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
