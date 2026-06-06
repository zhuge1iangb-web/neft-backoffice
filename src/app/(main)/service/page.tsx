'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { severityVariant, slaVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  ExclamationTriangleIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon,
  ArrowUpCircleIcon, CheckCircleIcon, ClockIcon, UserIcon,
  ClipboardDocumentIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import type { WorkLog } from '@/lib/demo-data'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const TICKET_STATUSES = ['Open', 'Assigned', 'In Progress', 'Pending Customer', 'Pending Vendor', 'Escalated', 'Resolved', 'Closed']
const CHANNELS = ['Phone', 'Web', 'Email']
const ESC_LEVELS = ['ไม่มีการยกระดับ', 'L1 - Internal Support', 'L2 - Specialist/3rd Party', 'L3 - Manufacturer/Vendor']

export default function ServicePage() {
  const { lang, tickets, contracts, addTicket, updateTicket, deleteTicket, addWorkLog, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [activeTab, setActiveTab] = useState<'tickets' | 'contracts'>('tickets')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [showEscModal, setShowEscModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    customerId: '', subject: '', description: '', severity: 'Medium',
    channel: 'Web', contactName: '', contactPhone: '', contactEmail: '', assignedTo: ''
  })
  const [escForm, setEscForm] = useState({ level: 2, escalatedTo: '', reason: '' })
  const [logForm, setLogForm] = useState({ action: 'In Progress', note: '' })
  const [resolveForm, setResolveForm] = useState({ rootCause: '', resolution: '', note: '' })
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [assignForm, setAssignForm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const filteredTickets = tickets.filter(tk =>
    (filterSev === 'all' || tk.severity === filterSev) &&
    (filterStatus === 'all' || (filterStatus === 'active' ? !['Resolved', 'Closed'].includes(tk.status) : ['Resolved', 'Closed'].includes(tk.status))) &&
    (tk.subject.toLowerCase().includes(search.toLowerCase()) || tk.customerName.toLowerCase().includes(search.toLowerCase()) || tk.no.toLowerCase().includes(search.toLowerCase()))
  )

  const openTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status))
  const criticalOpen = openTickets.filter(t => t.severity === 'Critical')
  const escalated = openTickets.filter(t => t.status === 'Escalated' || (t.escalationLevel || 0) > 0)
  const slaAtRisk = openTickets.filter(t => t.slaStatus === 'At Risk')
  const slaBreach = openTickets.filter(t => t.slaStatus === 'Breached')
  const detailTicket = showDetail !== null ? tickets.find(t => t.id === showDetail) : null

  // Channel icons
  const channelIcon = (ch: string) => {
    if (ch === 'Phone') return <PhoneIcon className="w-3.5 h-3.5 text-green-600" />
    if (ch === 'Email') return <EnvelopeIcon className="w-3.5 h-3.5 text-blue-600" />
    return <GlobeAltIcon className="w-3.5 h-3.5 text-purple-600" />
  }
  const channelBg = (ch: string) => ch === 'Phone' ? 'bg-green-50 text-green-700' : ch === 'Email' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'

  const escLevelBadge = (lvl: number) => {
    if (lvl === 0) return null
    const colors = ['', 'bg-yellow-100 text-yellow-800', 'bg-orange-100 text-orange-800', 'bg-red-100 text-red-800']
    const labels = ['', 'L1 Internal', 'L2 Specialist', 'L3 Manufacturer']
    return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors[lvl]}`}><ArrowUpCircleIcon className="w-3 h-3" />{labels[lvl]}</span>
  }

  // Auto-generate ticket number
  const nextTicketNo = () => {
    const year = new Date().getFullYear()
    const maxNo = tickets.reduce((max, tk) => {
      const m = tk.no.match(/TK-\d{4}-(\d+)/)
      return m ? Math.max(max, parseInt(m[1])) : max
    }, 90)
    return `TK-${year}-${String(maxNo + 1).padStart(4, '0')}`
  }

  const handleAdd = () => {
    const cust = customers.find(c => c.id === +form.customerId)
    const now = new Date().toISOString()
    const no = nextTicketNo()
    // SLA: Critical=4h, High=8h, Medium=24h, Low=48h response
    const slaHours: Record<string, number> = { Critical: 4, High: 8, Medium: 24, Low: 48 }
    const respDue = new Date(Date.now() + slaHours[form.severity] * 3600000)
    const resDue = new Date(Date.now() + slaHours[form.severity] * 3 * 3600000)
    addTicket({
      id: Date.now(), no,
      customerId: +form.customerId, customerName: cust?.name || '',
      subject: form.subject, description: form.description, severity: form.severity as any,
      channel: form.channel as any,
      contactName: form.contactName, contactPhone: form.contactPhone, contactEmail: form.contactEmail,
      assignedTo: form.assignedTo, status: 'Open' as any,
      createdAt: now,
      responseDue: respDue.toLocaleString('th-TH'),
      resolutionDue: resDue.toLocaleString('th-TH'),
      slaStatus: 'Met' as any, contractId: null,
      escalationLevel: 0 as any, escalatedTo: '', escalatedAt: '', escalationReason: '',
      rootCause: '', resolution: '', resolvedAt: null, closedAt: null,
      workLogs: [{
        id: 1, time: now, user: 'ระบบ', action: 'Ticket Opened',
        note: `รับแจ้งปัญหาผ่าน${form.channel} ออก Case Number ${no} แจ้งลูกค้าแล้ว`
      }]
    })
    setShowModal(false)
    setForm({ customerId: '', subject: '', description: '', severity: 'Medium', channel: 'Web', contactName: '', contactPhone: '', contactEmail: '', assignedTo: '' })
  }

  const handleEscalate = () => {
    if (!detailTicket) return
    const now = new Date().toISOString()
    updateTicket(detailTicket.id, {
      status: 'Escalated' as any,
      escalationLevel: escForm.level as any,
      escalatedTo: escForm.escalatedTo,
      escalatedAt: now,
      escalationReason: escForm.reason,
    })
    addWorkLog(detailTicket.id, {
      id: Date.now(), time: now, user: 'Service Team',
      action: `Escalated to ${ESC_LEVELS[escForm.level]}`,
      note: `ยกระดับไปยัง: ${escForm.escalatedTo} | เหตุผล: ${escForm.reason}`
    })
    setShowEscModal(false)
    setEscForm({ level: 2, escalatedTo: '', reason: '' })
  }

  const handleAddLog = () => {
    if (!detailTicket) return
    const now = new Date().toISOString()
    addWorkLog(detailTicket.id, {
      id: Date.now(), time: now,
      user: 'Service Team',
      action: logForm.action, note: logForm.note
    })
    const statusMap: Record<string, string> = {
      'In Progress': 'In Progress',
      'Pending Customer': 'Pending Customer',
      'Pending Vendor': 'Pending Vendor',
      'Closed': 'Closed',
    }
    if (statusMap[logForm.action]) {
      const extra: Record<string, string | null> = {}
      if (logForm.action === 'Closed') extra.closedAt = now
      updateTicket(detailTicket.id, { status: statusMap[logForm.action] as any, ...extra as any })
    }
    setShowLogModal(false)
    setLogForm({ action: 'In Progress', note: '' })
  }

  const handleResolve = () => {
    if (!detailTicket) return
    const now = new Date().toISOString()
    updateTicket(detailTicket.id, {
      status: 'Resolved' as any,
      rootCause: resolveForm.rootCause,
      resolution: resolveForm.resolution,
      resolvedAt: now,
    })
    addWorkLog(detailTicket.id, {
      id: Date.now(), time: now, user: 'Service Team',
      action: 'Resolved',
      note: `✅ Root Cause: ${resolveForm.rootCause} | วิธีแก้ไข: ${resolveForm.resolution}${resolveForm.note ? ` | หมายเหตุ: ${resolveForm.note}` : ''}`
    })
    setShowResolveModal(false)
    setResolveForm({ rootCause: '', resolution: '', note: '' })
  }

  const copyTicketNo = (no: string) => {
    navigator.clipboard.writeText(no).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const excelHeaders = ['เลขที่', 'ลูกค้า', 'หัวข้อ', 'ช่องทาง', 'ระดับ', 'สถานะ', 'SLA', 'Escalation', 'ผู้รับผิดชอบ', 'วันที่สร้าง']
  const excelKeys = ['no', 'customerName', 'subject', 'channel', 'severity', 'status', 'slaStatus', 'escalatedTo', 'assignedTo', 'createdAt']

  const sevColors: Record<string, string> = {
    Critical: 'border-l-4 border-red-500 bg-red-50/30',
    High: 'border-l-4 border-orange-400 bg-orange-50/20',
    Medium: 'border-l-4 border-yellow-400 bg-yellow-50/20',
    Low: 'border-l-4 border-blue-400 bg-blue-50/20'
  }

  const statusColor = (s: string) => {
    if (s === 'Resolved' || s === 'Closed') return 'success'
    if (s === 'Escalated') return 'danger'
    if (s === 'Open') return 'danger'
    return 'warning'
  }

  const timelineActionColor = (action: string) => {
    if (action.includes('Resolved') || action.includes('Closed')) return 'bg-green-100 text-green-700 border-green-200'
    if (action.includes('Escalated')) return 'bg-red-100 text-red-700 border-red-200'
    if (action.includes('Opened')) return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="space-y-4">
      {/* TOR Compliance Banner */}
      <div className="bg-[#0F2654]/5 border border-[#1B3875]/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <CheckCircleIcon className="w-5 h-5 text-[#1B3875] flex-shrink-0" />
        <p className="text-xs text-[#1B3875]/80 leading-relaxed">
          <span className="font-semibold text-[#1B3875]">ระบบ Ticketing ตามข้อกำหนด TOR:</span>{' '}
          รองรับการแจ้งเหตุ 3 ช่องทาง (โทรศัพท์ / Web / อีเมล) · ออก Case Number อัตโนมัติทุกครั้ง ·
          ลูกค้าตรวจสอบสถานะได้ตลอดเวลา · มีกระบวนการยกระดับ L1→L2 Specialist→L3 Manufacturer
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Critical Open</div>
          <div className="text-2xl font-bold text-red-600">{criticalOpen.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">ต้องแก้ด่วน</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">SLA At Risk / Breached</div>
          <div className="text-2xl font-bold text-orange-600">{slaAtRisk.length + slaBreach.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Breach: {slaBreach.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Escalated</div>
          <div className="text-2xl font-bold text-red-700">{escalated.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">L2/L3 Escalation</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Open Tickets</div>
          <div className="text-2xl font-bold text-blue-600">{openTickets.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">ทั้งหมดที่เปิดอยู่</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['tickets', 'contracts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'tickets' ? `Tickets (${openTickets.length})` : `สัญญา MA (${contracts.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.common.search}...`}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                  <option value="all">ทุกระดับ</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                  <option value="active">Active</option>
                  <option value="closed">Closed/Resolved</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filteredTickets, excelHeaders, excelKeys, 'service_tickets')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Service Tickets', excelHeaders, filteredTickets, excelKeys, 'service_tickets')}>PDF</Button>
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>แจ้งเหตุใหม่</Button>
              </div>
            </div>
          </div>

          {/* Channel Summary */}
          <div className="grid grid-cols-3 gap-3">
            {CHANNELS.map(ch => {
              const cnt = openTickets.filter(tk => tk.channel === ch).length
              return (
                <div key={ch} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                  {channelIcon(ch)}
                  <div>
                    <div className="text-xs text-gray-500">{ch === 'Phone' ? 'โทรศัพท์' : ch === 'Email' ? 'อีเมล' : 'Web Portal'}</div>
                    <div className="font-semibold text-sm text-gray-700">{cnt} tickets</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ticket Cards */}
          <div className="space-y-2">
            {filteredTickets.map(tk => (
              <div key={tk.id}
                className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-all ${sevColors[tk.severity] || 'border-gray-100'}`}
                onClick={() => setShowDetail(tk.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{tk.no}</span>
                      <Badge variant={severityVariant(tk.severity)}>{tk.severity}</Badge>
                      <Badge variant={slaVariant(tk.slaStatus)}>{tk.slaStatus}</Badge>
                      {/* Channel badge */}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${channelBg(tk.channel || 'Web')}`}>
                        {channelIcon(tk.channel || 'Web')}
                        {tk.channel || 'Web'}
                      </span>
                      {/* Escalation badge */}
                      {(tk.escalationLevel || 0) > 0 && escLevelBadge(tk.escalationLevel || 0)}
                      {tk.slaStatus === 'Breached' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 truncate">{tk.subject}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">{tk.customerName}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">ผู้รับผิดชอบ: {tk.assignedTo}</span>
                      {tk.contactName && <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400"><UserIcon className="w-3 h-3 inline mr-0.5" />{tk.contactName}</span>
                      </>}
                    </div>
                    {(tk.escalationLevel || 0) > 0 && tk.escalatedTo && (
                      <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                        <ArrowUpCircleIcon className="w-3.5 h-3.5" />
                        ยกระดับไปยัง: {tk.escalatedTo}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={statusColor(tk.status) as any}>{tk.status}</Badge>
                    <div className="text-xs text-gray-400 mt-1">{new Date(tk.createdAt).toLocaleDateString('th-TH')}</div>
                    <div className="text-xs text-gray-300 mt-0.5">{(tk.workLogs || []).length} logs</div>
                  </div>
                </div>
                {tk.responseDue && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                    <span><ClockIcon className="w-3.5 h-3.5 inline mr-1 text-orange-400" />Response due: <span className="font-medium">{tk.responseDue}</span></span>
                    <span>Resolution due: <span className="font-medium">{tk.resolutionDue}</span></span>
                  </div>
                )}
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">{t.common.noData}</div>
            )}
          </div>
        </>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] border-b border-gray-100">
                <tr>
                  {['เลขที่สัญญา', 'ลูกค้า', 'ประเภท', 'เริ่มต้น', 'สิ้นสุด', 'วันที่เหลือ', 'ผู้รับผิดชอบ', 'สถานะ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${c.daysLeft > 0 && c.daysLeft <= 30 ? 'bg-red-50/30' : c.daysLeft > 0 && c.daysLeft <= 60 ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.no}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.customerName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.startDate, lang)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.endDate, lang)}</td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {c.daysLeft === 0 ? <span className="text-gray-400">Expired</span> : (
                        <span className={c.daysLeft <= 30 ? 'text-red-600' : c.daysLeft <= 60 ? 'text-orange-500' : 'text-gray-600'}>{c.daysLeft} วัน</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.renewalOwner}</td>
                    <td className="px-4 py-3"><Badge variant={c.status === 'Active' ? 'success' : 'default'}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add Ticket Modal ─── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="เปิดเคสใหม่ / แจ้งเหตุขัดข้อง" size="lg">
        <div className="space-y-4">
          {/* Channel Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">ช่องทางการแจ้งเหตุ*</label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => (
                <button key={ch} type="button" onClick={() => setForm({ ...form, channel: ch })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.channel === ch ? 'bg-[#1B3875] text-white border-[#1B3875]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3875]/30'}`}>
                  {ch === 'Phone' ? <PhoneIcon className="w-4 h-4" /> : ch === 'Email' ? <EnvelopeIcon className="w-4 h-4" /> : <GlobeAltIcon className="w-4 h-4" />}
                  {ch === 'Phone' ? 'โทรศัพท์' : ch === 'Email' ? 'อีเมล' : 'Web Portal'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ลูกค้า*</label>
              <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ระดับความรุนแรง</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">หัวข้อปัญหา*</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="อธิบายปัญหาโดยย่อ"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>

          {/* Contact Info */}
          <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-800">ข้อมูลผู้ติดต่อ (จะแจ้ง Case Number กลับ)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">ชื่อผู้ติดต่อ</label>
                <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">โทรศัพท์</label>
                <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับผิดชอบ</label>
            <input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>

          {/* SLA Preview */}
          {form.severity && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
              <span className="font-semibold">SLA Auto-Set:</span>{' '}
              {form.severity === 'Critical' ? 'Response 4h / Resolution 12h' :
               form.severity === 'High' ? 'Response 8h / Resolution 24h' :
               form.severity === 'Medium' ? 'Response 24h / Resolution 72h' : 'Response 48h / Resolution 5 วันทำการ'}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleAdd} disabled={!form.customerId || !form.subject}>เปิด Case + ออก Ticket Number</Button>
        </div>
      </Modal>

      {/* ─── Ticket Detail Modal ─── */}
      <Modal open={showDetail !== null} onClose={() => { setShowDetail(null) }} title="รายละเอียด Case" size="xl">
        {detailTicket && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0F2654]">{detailTicket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-mono text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">{detailTicket.no}</span>
                    <button onClick={() => copyTicketNo(detailTicket.no)}
                      className="flex items-center gap-1 text-xs text-[#1B3875] hover:text-[#0F2654] transition-colors">
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      {copied ? 'คัดลอกแล้ว!' : 'คัดลอก Case No.'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <Badge variant={statusColor(detailTicket.status) as any}>{detailTicket.status}</Badge>
                  <Badge variant={severityVariant(detailTicket.severity)}>{detailTicket.severity}</Badge>
                  <Badge variant={slaVariant(detailTicket.slaStatus)}>{detailTicket.slaStatus}</Badge>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                ['ลูกค้า', detailTicket.customerName],
                ['ผู้รับผิดชอบ', detailTicket.assignedTo],
                ['ช่องทางแจ้งเหตุ', detailTicket.channel || '-'],
                ['Response Due', detailTicket.responseDue || '-'],
                ['Resolution Due', detailTicket.resolutionDue || '-'],
                ['สร้างเมื่อ', new Date(detailTicket.createdAt).toLocaleString('th-TH')],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="font-medium text-gray-700 mt-0.5 text-sm">{v}</div>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            {(detailTicket.contactName || detailTicket.contactPhone || detailTicket.contactEmail) && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">ข้อมูลผู้ติดต่อ</p>
                <div className="flex flex-wrap gap-4 text-xs text-blue-700">
                  {detailTicket.contactName && <span><UserIcon className="w-3.5 h-3.5 inline mr-1" />{detailTicket.contactName}</span>}
                  {detailTicket.contactPhone && <span><PhoneIcon className="w-3.5 h-3.5 inline mr-1" />{detailTicket.contactPhone}</span>}
                  {detailTicket.contactEmail && <span><EnvelopeIcon className="w-3.5 h-3.5 inline mr-1" />{detailTicket.contactEmail}</span>}
                </div>
              </div>
            )}

            {/* Description */}
            {detailTicket.description && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{detailTicket.description}</div>
            )}

            {/* Escalation Info */}
            {(detailTicket.escalationLevel || 0) > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircleIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">การยกระดับปัญหา</span>
                  {escLevelBadge(detailTicket.escalationLevel || 0)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-orange-600">ยกระดับไปยัง:</span> <span className="font-medium">{detailTicket.escalatedTo}</span></div>
                  <div><span className="text-orange-600">เวลา:</span> <span className="font-medium">{detailTicket.escalatedAt ? new Date(detailTicket.escalatedAt).toLocaleString('th-TH') : '-'}</span></div>
                  {detailTicket.escalationReason && <div className="col-span-2"><span className="text-orange-600">เหตุผล:</span> <span>{detailTicket.escalationReason}</span></div>}
                </div>
              </div>
            )}

            {/* Work Log / Timeline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-[#1B3875]" />
                  Work Log / Timeline
                  <span className="text-xs font-normal text-gray-400">({(detailTicket.workLogs || []).length} รายการ)</span>
                </h3>
                <Button size="sm" variant="outline" icon={<PlusIcon className="w-3.5 h-3.5" />}
                  onClick={() => setShowLogModal(true)}>เพิ่ม Log</Button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {(detailTicket.workLogs || []).map((log: WorkLog, i: number) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#1B3875] mt-1.5 flex-shrink-0" />
                      {i < (detailTicket.workLogs || []).length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${timelineActionColor(log.action)}`}>{log.action}</span>
                        <span className="text-xs text-gray-400">{new Date(log.time).toLocaleString('th-TH')}</span>
                        <span className="text-xs text-gray-500">— {log.user}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{log.note}</p>
                    </div>
                  </div>
                ))}
                {(!detailTicket.workLogs || detailTicket.workLogs.length === 0) && (
                  <div className="text-xs text-gray-400 py-2">ยังไม่มีบันทึก</div>
                )}
              </div>
            </div>

            {/* Resolution */}
            {(detailTicket.rootCause || detailTicket.resolution) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-green-800 flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" />ผลการแก้ไข</p>
                {detailTicket.rootCause && <p className="text-xs text-green-700"><span className="font-medium">Root Cause:</span> {detailTicket.rootCause}</p>}
                {detailTicket.resolution && <p className="text-xs text-green-700"><span className="font-medium">Resolution:</span> {detailTicket.resolution}</p>}
              </div>
            )}

            {/* Engineer Actions */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              {/* Assign */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">มอบหมาย:</label>
                <input
                  value={assignForm || detailTicket.assignedTo}
                  onChange={e => setAssignForm(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  placeholder="ชื่อ Engineer" />
                <Button size="sm" onClick={() => {
                  if (assignForm) {
                    const now = new Date().toISOString()
                    updateTicket(detailTicket.id, { assignedTo: assignForm, status: 'Assigned' as any })
                    addWorkLog(detailTicket.id, { id: Date.now(), time: now, user: 'Service Team', action: 'Assigned', note: `มอบหมายให้ ${assignForm}` })
                    setAssignForm('')
                  }
                }}>บันทึก</Button>
              </div>

              {/* Status quick-update (excluding Resolved — use dedicated button) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">อัปเดตสถานะ</label>
                <div className="flex flex-wrap gap-1.5">
                  {TICKET_STATUSES.filter(s => s !== 'Resolved').map(s => (
                    <button key={s} onClick={() => {
                      const now = new Date().toISOString()
                      updateTicket(detailTicket.id, { status: s as any, ...(s === 'Closed' ? { closedAt: now } : {}) })
                      addWorkLog(detailTicket.id, { id: Date.now(), time: now, user: 'Service Team', action: s, note: `อัปเดตสถานะเป็น ${s}` })
                    }}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${detailTicket.status === s ? 'bg-[#1B3875] text-white border-[#1B3875]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3875]/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button size="sm" icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
                  onClick={() => setShowLogModal(true)}>เพิ่ม Work Log</Button>
                <Button variant="outline" size="sm" icon={<ArrowUpCircleIcon className="w-4 h-4" />}
                  onClick={() => setShowEscModal(true)}>Escalate</Button>
                {!['Resolved', 'Closed'].includes(detailTicket.status) && (
                  <Button size="sm"
                    className="!bg-green-600 hover:!bg-green-700 !text-white"
                    icon={<CheckCircleIcon className="w-4 h-4" />}
                    onClick={() => setShowResolveModal(true)}>
                    Resolve Case
                  </Button>
                )}
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="ml-auto text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  ลบ Case
                </button>
              </div>

              {/* Delete confirm inline */}
              {showDeleteConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
                  <p className="text-red-700 font-semibold mb-2">ยืนยันการลบ Case {detailTicket.no}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { deleteTicket(detailTicket.id); setShowDetail(null); setShowDeleteConfirm(false) }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">ยืนยันลบ</button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Escalation Modal ─── */}
      <Modal open={showEscModal} onClose={() => setShowEscModal(false)} title="ยกระดับปัญหา (Escalation)" size="md">
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
            <p className="font-semibold mb-1">กระบวนการยกระดับปัญหาตาม TOR:</p>
            <p>L1 → Internal Support → L2 Specialist/3rd Party → L3 Manufacturer/Vendor</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ระดับการยกระดับ*</label>
            <select value={escForm.level} onChange={e => setEscForm({ ...escForm, level: +e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {ESC_LEVELS.map((l, i) => i > 0 && <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ยกระดับไปยัง (ชื่อผู้รับ/บริษัท)*</label>
            <input value={escForm.escalatedTo} onChange={e => setEscForm({ ...escForm, escalatedTo: e.target.value })}
              placeholder="เช่น HPE TAC, True Business NOC, Cisco SMARTnet..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">เหตุผลการยกระดับ*</label>
            <textarea rows={3} value={escForm.reason} onChange={e => setEscForm({ ...escForm, reason: e.target.value })}
              placeholder="อธิบายเหตุผลที่ต้องยกระดับ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowEscModal(false)}>ยกเลิก</Button>
          <Button onClick={handleEscalate} disabled={!escForm.escalatedTo || !escForm.reason}>ยืนยัน Escalate</Button>
        </div>
      </Modal>

      {/* ─── Resolve Case Modal ─── */}
      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="✅ ปิด / Resolve Case" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs text-green-700">
            การ Resolve case ต้องบันทึก Root Cause และวิธีแก้ไขทุกครั้ง เพื่อใช้อ้างอิงและปรับปรุงกระบวนการ
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Root Cause (สาเหตุที่แท้จริง) *</label>
            <textarea rows={2} value={resolveForm.rootCause} onChange={e => setResolveForm({ ...resolveForm, rootCause: e.target.value })}
              placeholder="เช่น Hardware failure — HDD bad sector, Configuration error — VLAN misconfigured..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">วิธีแก้ไข (Resolution) *</label>
            <textarea rows={3} value={resolveForm.resolution} onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })}
              placeholder="อธิบายขั้นตอนที่ทำเพื่อแก้ไขปัญหา รวมถึง preventive action..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">หมายเหตุเพิ่มเติม</label>
            <input value={resolveForm.note} onChange={e => setResolveForm({ ...resolveForm, note: e.target.value })}
              placeholder="คำแนะนำเพิ่มเติม ไฟล์อ้างอิง ฯลฯ"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowResolveModal(false)}>ยกเลิก</Button>
          <Button
            className="!bg-green-600 hover:!bg-green-700"
            onClick={handleResolve}
            disabled={!resolveForm.rootCause || !resolveForm.resolution}>
            ยืนยัน Resolve + บันทึก
          </Button>
        </div>
      </Modal>

      {/* ─── Work Log Modal ─── */}
      <Modal open={showLogModal} onClose={() => setShowLogModal(false)} title="เพิ่ม Work Log / บันทึกความคืบหน้า" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action / ประเภทกิจกรรม*</label>
            <select value={logForm.action} onChange={e => setLogForm({ ...logForm, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {['Investigating', 'On-site Visit', 'Remote Support', 'In Progress', 'Parts Ordered',
                'Pending Customer', 'Pending Vendor', 'Resolved', 'Closed', 'Other'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">บันทึกรายละเอียด*</label>
            <textarea rows={4} value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })}
              placeholder="อธิบายขั้นตอนที่ดำเนินการ ผลลัพธ์ ขั้นตอนถัดไป..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowLogModal(false)}>ยกเลิก</Button>
          <Button onClick={handleAddLog} disabled={!logForm.note}>บันทึก Log</Button>
        </div>
      </Modal>
    </div>
  )
}
