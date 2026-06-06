'use client'
import { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  ArrowDownTrayIcon, ChartBarIcon, DocumentCheckIcon,
  BanknotesIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  XCircleIcon, CalendarIcon
} from '@heroicons/react/24/outline'

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

type ReportTab = 'service' | 'sla' | 'revenue'

export default function ReportsPage() {
  const { lang, tickets, invoices, projects, customers } = useAppStore()
  const t = translations[lang]

  const [activeTab, setActiveTab] = useState<ReportTab>('service')
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(5) // 0-indexed, June = 5

  // ── Service KPIs ──
  const serviceStats = useMemo(() => {
    const total   = tickets.length
    const open    = tickets.filter(t => ['Open','Assigned','In Progress'].includes(t.status)).length
    const pending = tickets.filter(t => ['Pending Customer','Pending Vendor'].includes(t.status)).length
    const resolved= tickets.filter(t => ['Resolved','Closed'].includes(t.status)).length
    const escalated=tickets.filter(t => t.status === 'Escalated').length
    const breached= tickets.filter(t => t.slaStatus === 'Breached').length
    const atRisk  = tickets.filter(t => t.slaStatus === 'At Risk').length
    const met     = tickets.filter(t => t.slaStatus === 'Met').length
    const slaRate = total > 0 ? Math.round((met / total) * 100) : 0

    // By month (simulated from ticket IDs)
    const monthly = MONTHS_TH.map((m, i) => ({
      month: m, total: 2 + i % 3, resolved: 1 + i % 3, breached: i % 4 === 0 ? 1 : 0
    }))

    // By channel
    const phone = tickets.filter(t => t.channel === 'Phone').length
    const web   = tickets.filter(t => t.channel === 'Web').length
    const email = tickets.filter(t => t.channel === 'Email').length

    return { total, open, pending, resolved, escalated, breached, atRisk, met, slaRate, monthly, phone, web, email }
  }, [tickets])

  // ── SLA Compliance ──
  const slaByPriority = useMemo(() => {
    const priorities = ['Critical','High','Medium','Low']
    return priorities.map(p => {
      const group = tickets.filter(t => t.severity === p)
      const met   = group.filter(t => t.slaStatus === 'Met').length
      const rate  = group.length > 0 ? Math.round((met / group.length) * 100) : 100
      return { priority: p, total: group.length, met, rate }
    })
  }, [tickets])

  // ── Revenue ──
  const revenueStats = useMemo(() => {
    const paid   = invoices.filter(i => i.status === 'Paid')
    const unpaid = invoices.filter(i => ['Unpaid','Overdue'].includes(i.status))
    const total  = paid.reduce((s, i) => s + i.billedAmount, 0)
    const pending= unpaid.reduce((s, i) => s + (i.billedAmount - i.paidAmount), 0)
    const target = 5000000

    const monthly = MONTHS_TH.map((m, idx) => ({
      month: m,
      actual:  [320000,410000,380000,450000,520000,490000,560000,480000,0,0,0,0][idx] || 0,
      target:  416667,
    }))
    return { total, pending, target, monthly, paidCount: paid.length, unpaidCount: unpaid.length }
  }, [invoices])

  // ── Exporters ──
  const exportCSV = (data: object[], filename: string) => {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv  = [keys.join(','), ...data.map(row => keys.map(k => `"${(row as any)[k] ?? ''}"`).join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportServiceReport = () => {
    exportCSV(tickets.map(t => ({
      ID: t.id, หัวข้อ: t.subject, สถานะ: t.status, ความรุนแรง: t.severity,
      SLA: t.slaStatus, ลูกค้า: customers.find(c => c.id === t.customerId)?.name || '',
      ช่องทาง: t.channel, วันที่เปิด: t.createdAt, กำหนดแก้ไข: t.resolutionDue || '',
    })), 'service_report_' + new Date().toISOString().split('T')[0])
  }

  const exportSLAReport = () => {
    exportCSV(slaByPriority.map(r => ({
      ความรุนแรง: r.priority, ทั้งหมด: r.total, ตรงเวลา: r.met, อัตราปฏิบัติตาม: r.rate + '%'
    })), 'sla_compliance_' + new Date().toISOString().split('T')[0])
  }

  const exportRevenueReport = () => {
    exportCSV(revenueStats.monthly.map(m => ({
      เดือน: m.month, รายได้จริง: m.actual, เป้าหมาย: m.target,
      ส่วนต่าง: m.actual - m.target,
    })), 'revenue_report_' + new Date().toISOString().split('T')[0])
  }

  const maxMonthlyTicket = Math.max(...serviceStats.monthly.map(m => m.total), 1)
  const maxMonthlyRevenue= Math.max(...revenueStats.monthly.map(m => Math.max(m.actual, m.target)), 1)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2654] flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#0F2654] text-lg">รายงานและสถิติ</h2>
              <p className="text-xs text-gray-400">ข้อมูล ณ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
            {activeTab === 'service' && <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={exportServiceReport}>Export CSV</Button>}
            {activeTab === 'sla'     && <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={exportSLAReport}>Export CSV</Button>}
            {activeTab === 'revenue' && <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={exportRevenueReport}>Export CSV</Button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'service', label: 'Service Summary', icon: DocumentCheckIcon },
          { key: 'sla',     label: 'SLA Compliance',  icon: ClockIcon },
          { key: 'revenue', label: 'Revenue',          icon: BanknotesIcon },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── SERVICE SUMMARY ── */}
      {activeTab === 'service' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Ticket ทั้งหมด', value: serviceStats.total, color: 'text-[#1B3875]', bg: 'bg-blue-50', icon: DocumentCheckIcon },
              { label: 'กำลังดำเนินการ', value: serviceStats.open, color: 'text-orange-600', bg: 'bg-orange-50', icon: ClockIcon },
              { label: 'แก้ไขแล้ว', value: serviceStats.resolved, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircleIcon },
              { label: 'SLA Breached', value: serviceStats.breached, color: 'text-red-600', bg: 'bg-red-50', icon: XCircleIcon },
            ].map(k => (
              <div key={k.label} className={`rounded-xl p-4 border border-white/50 ${k.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-xs text-gray-500">{k.label}</span>
                </div>
                <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Channel breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Phone', value: serviceStats.phone, pct: Math.round((serviceStats.phone / Math.max(serviceStats.total,1)) * 100), color: 'bg-blue-500' },
              { label: 'Web Portal', value: serviceStats.web, pct: Math.round((serviceStats.web / Math.max(serviceStats.total,1)) * 100), color: 'bg-indigo-500' },
              { label: 'Email', value: serviceStats.email, pct: Math.round((serviceStats.email / Math.max(serviceStats.total,1)) * 100), color: 'bg-purple-500' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{c.label}</span>
                  <span className="text-sm font-bold text-gray-800">{c.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.color}`} style={{ width: c.pct + '%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{c.pct}% ของ ticket ทั้งหมด</div>
              </div>
            ))}
          </div>

          {/* Monthly bar chart */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#1B3875]" />
              Ticket รายเดือน — {selectedYear}
            </h3>
            <div className="flex items-end gap-2 h-36">
              {serviceStats.monthly.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{m.total || ''}</span>
                  <div className="w-full flex flex-col gap-0.5 relative" style={{ height: '100px' }}>
                    <div className="absolute bottom-0 w-full rounded-t-sm bg-[#1B3875]/20"
                      style={{ height: Math.round((m.total / maxMonthlyTicket) * 100) + '%' }} />
                    <div className="absolute bottom-0 w-full rounded-t-sm bg-[#1B3875]"
                      style={{ height: Math.round((m.resolved / maxMonthlyTicket) * 100) + '%' }} />
                    {m.breached > 0 && (
                      <div className="absolute bottom-0 w-full rounded-t-sm bg-red-500"
                        style={{ height: Math.round((m.breached / maxMonthlyTicket) * 100) + '%' }} />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#1B3875]" /><span className="text-xs text-gray-500">แก้ไขแล้ว</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#1B3875]/20" /><span className="text-xs text-gray-500">ทั้งหมด</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-xs text-gray-500">SLA Breached</span></div>
            </div>
          </div>

          {/* Ticket table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">รายการ Ticket ทั้งหมด</h3>
              <span className="text-xs text-gray-400">{tickets.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['ID','หัวข้อ','ลูกค้า','ช่องทาง','ความรุนแรง','สถานะ','SLA','กำหนดแก้ไข'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-500">#{ticket.id}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[200px] truncate">{ticket.subject}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{customers.find(c => c.id === ticket.customerId)?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{ticket.channel}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={ticket.severity === 'Critical' ? 'error' : ticket.severity === 'High' ? 'warning' : 'info'} size="sm">{ticket.severity}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={['Resolved','Closed'].includes(ticket.status) ? 'success' : ticket.status === 'Escalated' ? 'error' : 'default'} size="sm">{ticket.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={ticket.slaStatus === 'Met' ? 'success' : ticket.slaStatus === 'Breached' ? 'error' : 'warning'} size="sm">{ticket.slaStatus}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{ticket.resolutionDue || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SLA COMPLIANCE ── */}
      {activeTab === 'sla' && (
        <div className="space-y-4">
          {/* Overall gauge */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'SLA Compliance Rate', value: serviceStats.slaRate + '%', color: serviceStats.slaRate >= 90 ? 'text-green-600' : serviceStats.slaRate >= 75 ? 'text-yellow-600' : 'text-red-600', bg: 'bg-white' },
              { label: 'ตรงตาม SLA', value: serviceStats.met, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'ใกล้เกิน SLA', value: serviceStats.atRisk, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'เกิน SLA แล้ว', value: serviceStats.breached, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(k => (
              <div key={k.label} className={`rounded-xl p-4 border border-gray-100 shadow-sm ${k.bg}`}>
                <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* SLA by priority */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">SLA Compliance ตามความรุนแรง</h3>
            <div className="space-y-4">
              {slaByPriority.map(row => (
                <div key={row.priority}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={row.priority === 'Critical' ? 'error' : row.priority === 'High' ? 'warning' : 'info'}>{row.priority}</Badge>
                      <span className="text-xs text-gray-500">{row.met}/{row.total} tickets</span>
                    </div>
                    <span className={`text-sm font-bold ${row.rate >= 90 ? 'text-green-600' : row.rate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{row.rate}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${row.rate >= 90 ? 'bg-green-500' : row.rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: row.rate + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA threshold reference */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">SLA Target ตาม TOR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['ระดับ','Response Time','Resolution Time','หมายเหตุ'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: 'Critical', res: '1 ชั่วโมง', resolve: '4 ชั่วโมง', note: '24/7 Support' },
                    { level: 'High',     res: '2 ชั่วโมง', resolve: '8 ชั่วโมง', note: 'Business hours' },
                    { level: 'Medium',   res: '4 ชั่วโมง', resolve: '24 ชั่วโมง',note: 'Next business day' },
                    { level: 'Low',      res: '8 ชั่วโมง', resolve: '72 ชั่วโมง',note: 'Best effort' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-3 py-2.5">
                        <Badge variant={row.level === 'Critical' ? 'error' : row.level === 'High' ? 'warning' : 'info'}>{row.level}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 font-medium">{row.res}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 font-medium">{row.resolve}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breached tickets */}
          {tickets.filter(t => t.slaStatus === 'Breached' || t.slaStatus === 'At Risk').length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-semibold text-red-700">Tickets ที่ต้องดำเนินการด่วน</h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {tickets.filter(t => t.slaStatus === 'Breached' || t.slaStatus === 'At Risk').map(ticket => (
                    <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">#{ticket.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 font-medium max-w-[200px] truncate">{ticket.subject}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{customers.find(c => c.id === ticket.customerId)?.name || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={ticket.severity === 'Critical' ? 'error' : 'warning'} size="sm">{ticket.severity}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={ticket.slaStatus === 'Breached' ? 'error' : 'warning'} size="sm">{ticket.slaStatus}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{ticket.resolutionDue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REVENUE ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'รายได้รวม (YTD)',  value: '฿' + (revenueStats.total / 1e6).toFixed(2) + 'M', color: 'text-[#1B3875]', bg: 'bg-white' },
              { label: 'เป้าหมายรายปี',    value: '฿' + (revenueStats.target / 1e6).toFixed(1) + 'M', color: 'text-gray-600', bg: 'bg-white' },
              { label: '% ต่อเป้า',         value: Math.round((revenueStats.total / revenueStats.target) * 100) + '%', color: revenueStats.total >= revenueStats.target * 0.8 ? 'text-green-600' : 'text-yellow-600', bg: 'bg-white' },
              { label: 'ค้างชำระ',          value: '฿' + (revenueStats.pending / 1e6).toFixed(2) + 'M', color: 'text-red-600', bg: 'bg-red-50' },
            ].map(k => (
              <div key={k.label} className={`rounded-xl p-4 border border-gray-100 shadow-sm ${k.bg}`}>
                <div className="text-xs text-gray-500 mb-1">{k.label}</div>
                <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Annual progress bar */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">ความคืบหน้าต่อเป้าหมายรายปี {selectedYear}</h3>
              <span className="text-sm font-bold text-[#1B3875]">{Math.round((revenueStats.total / revenueStats.target) * 100)}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0F2654] to-[#1B3875] rounded-full transition-all"
                style={{ width: Math.min(100, Math.round((revenueStats.total / revenueStats.target) * 100)) + '%' }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>฿0</span>
              <span>฿{(revenueStats.total / 1e6).toFixed(2)}M จาก ฿{(revenueStats.target / 1e6).toFixed(1)}M</span>
            </div>
          </div>

          {/* Monthly revenue chart */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">รายได้รายเดือน vs เป้าหมาย (฿)</h3>
            <div className="flex items-end gap-2 h-40">
              {revenueStats.monthly.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {m.actual > 0 && <span className="text-[9px] text-gray-400">{(m.actual / 1e3).toFixed(0)}K</span>}
                  <div className="w-full relative" style={{ height: '120px' }}>
                    {/* Target line indicator */}
                    <div className="absolute w-full border-t-2 border-dashed border-red-300/70 z-10"
                      style={{ bottom: Math.round((m.target / maxMonthlyRevenue) * 100) + '%' }} />
                    <div className="absolute bottom-0 w-full">
                      {m.actual > 0 ? (
                        <div className={`w-full rounded-t-sm ${m.actual >= m.target ? 'bg-green-500' : 'bg-[#1B3875]'}`}
                          style={{ height: Math.round((m.actual / maxMonthlyRevenue) * 120) + 'px' }} />
                      ) : (
                        <div className="w-full rounded-t-sm bg-gray-100" style={{ height: '4px' }} />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#1B3875]" /><span className="text-xs text-gray-500">ต่ำกว่าเป้า</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /><span className="text-xs text-gray-500">ถึงเป้าหรือมากกว่า</span></div>
              <div className="flex items-center gap-1"><div className="w-5 h-0 border-t-2 border-dashed border-red-300" /><span className="text-xs text-gray-500">เป้าหมายต่อเดือน</span></div>
            </div>
          </div>

          {/* Invoice table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Invoice ทั้งหมด</h3>
              <Badge variant={revenueStats.unpaidCount > 0 ? 'warning' : 'success'}>{revenueStats.unpaidCount} รายการยังไม่ชำระ</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['เลขที่ Invoice','ลูกค้า','มูลค่า','สถานะ','วันครบกำหนด'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 10).map(inv => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{inv.invoiceNo}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{customers.find(c => c.id === inv.customerId)?.name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">฿{inv.billedAmount.toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'error' : 'warning'} size="sm">{inv.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{inv.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
