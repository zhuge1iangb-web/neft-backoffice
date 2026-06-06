'use client'
import { useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { severityVariant, slaVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  ExclamationTriangleIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon,
  CheckCircleIcon, ClockIcon, UserIcon, PaperClipIcon,
  ClipboardDocumentIcon, ChatBubbleLeftRightIcon, PencilSquareIcon, TrashIcon,
  XMarkIcon, ArrowUpCircleIcon
} from '@heroicons/react/24/outline'
import type { WorkLog } from '@/lib/demo-data'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const CHANNELS = ['Phone', 'Web', 'Email']
const ESC_LEVELS = ['ไม่มีการยกระดับ', 'L1 - Internal Support', 'L2 - Specialist/3rd Party', 'L3 - Manufacturer/Vendor']

// Work log actions including escalation options
const LOG_ACTIONS = [
  'Investigating',
  'On-site Visit',
  'Remote Support',
  'In Progress',
  'Parts Ordered',
  'Pending Customer',
  'Pending Vendor',
  'Escalated L1 - Internal Support',
  'Escalated L2 - Specialist/3rd Party',
  'Escalated L3 - Manufacturer/Vendor',
  'Resolved',
  'Closed',
  'Other',
]

// Status pipeline order (for progress display)
const STATUS_PIPELINE = ['Open', 'Assigned', 'In Progress', 'Pending Customer', 'Pending Vendor', 'Escalated', 'Resolved', 'Closed']

// Map log action → ticket status
const ACTION_STATUS_MAP: Record<string, string> = {
  'In Progress': 'In Progress',
  'Pending Customer': 'Pending Customer',
  'Pending Vendor': 'Pending Vendor',
  'Resolved': 'Resolved',
  'Closed': 'Closed',
  'Escalated L1 - Internal Support': 'Escalated',
  'Escalated L2 - Specialist/3rd Party': 'Escalated',
  'Escalated L3 - Manufacturer/Vendor': 'Escalated',
}

type Attachment = { name: string; size: number; type: string; data: string }

export default function ServicePage() {
  const { lang, tickets, contracts, addTicket, updateTicket, deleteTicket, addWorkLog, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [activeTab, setActiveTab] = useState<'tickets' | 'contracts'>('tickets')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Forms
  const [form, setForm] = useState({
    customerId: '', subject: '', description: '', severity: 'Medium',
    channel: 'Web', contactName: '', contactPhone: '', contactEmail: '',
    contactLineId: '', notifyEmail: true, notifyLine: false, assignedTo: ''
  })
  const [logForm, setLogForm] = useState({ action: 'In Progress', note: '', escalateTo: '', escalateLevel: 1 })
  const [resolveForm, setResolveForm] = useState({ rootCause: '', resolution: '', note: '' })
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [assignForm, setAssignForm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Attachments for new ticket
  const [ticketAttachments, setTicketAttachments] = useState<Attachment[]>([])
  const ticketFileRef = useRef<HTMLInputElement>(null)

  // Attachments for work log
  const [logAttachments, setLogAttachments] = useState<Attachment[]>([])
  const logFileRef = useRef<HTMLInputElement>(null)

  // Edit/delete log
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null)
  const [editLogForm, setEditLogForm] = useState({ action: '', note: '' })
  const [deleteLogId, setDeleteLogId] = useState<number | null>(null)

  const filteredTickets = tickets.filter(tk =>
    (filterSev === 'all' || tk.severity === filterSev) &&
    (filterStatus === 'all' || (filterStatus === 'active'
      ? !['Resolved', 'Closed'].includes(tk.status)
      : ['Resolved', 'Closed'].includes(tk.status))) &&
    (tk.subject.toLowerCase().includes(search.toLowerCase()) ||
      tk.customerName.toLowerCase().includes(search.toLowerCase()) ||
      tk.no.toLowerCase().includes(search.toLowerCase()))
  )

  const openTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status))
  const criticalOpen = openTickets.filter(t => t.severity === 'Critical')
  const escalated = openTickets.filter(t => t.status === 'Escalated' || (t.escalationLevel || 0) > 0)
  const slaAtRisk = openTickets.filter(t => t.slaStatus === 'At Risk')
  const slaBreach = openTickets.filter(t => t.slaStatus === 'Breached')
  const detailTicket = showDetail !== null ? tickets.find(t => t.id === showDetail) : null

  // Check if ticket has a Resolved log but not yet officially closed
  const hasResolvedLog = (tk: typeof detailTicket) =>
    tk && (tk.workLogs || []).some((l: WorkLog) => l.action === 'Resolved') && !['Resolved', 'Closed'].includes(tk.status)

  // Channel helpers
  const channelIcon = (ch: string) => {
    if (ch === 'Phone') return <PhoneIcon className="w-3.5 h-3.5 text-green-600" />
    if (ch === 'Email') return <EnvelopeIcon className="w-3.5 h-3.5 text-blue-600" />
    return <GlobeAltIcon className="w-3.5 h-3.5 text-purple-600" />
  }
  const channelBg = (ch: string) => ch === 'Phone' ? 'bg-green-50 text-green-700' : ch === 'Email' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'

  const statusColor = (s: string) => {
    if (s === 'Resolved' || s === 'Closed') return 'success'
    if (s === 'Escalated' || s === 'Open') return 'danger'
    return 'warning'
  }

  const timelineActionColor = (action: string) => {
    if (action.includes('Resolved') || action === 'Closed') return 'bg-green-100 text-green-700 border-green-200'
    if (action.includes('Escalated')) return 'bg-red-100 text-red-700 border-red-200'
    if (action === 'Ticket Opened') return 'bg-blue-100 text-blue-700 border-blue-200'
    if (action === 'Pending Customer' || action === 'Pending Vendor') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Current status step index
  const currentStatusStep = (status: string) => {
    const idx = STATUS_PIPELINE.indexOf(status)
    return idx === -1 ? 0 : idx
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

  // File reading helper
  const readFiles = (files: FileList, cb: (attachments: Attachment[]) => void) => {
    const results: Attachment[] = []
    let done = 0
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        results.push({ name: file.name, size: file.size, type: file.type, data: e.target?.result as string })
        done++
        if (done === files.length) cb(results)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAdd = () => {
    const cust = customers.find(c => c.id === +form.customerId)
    const now = new Date().toISOString()
    const no = nextTicketNo()
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
        note: `รับแจ้งปัญหาผ่าน${form.channel} ออก Case Number ${no}${form.contactEmail ? ` · แจ้ง Email: ${form.contactEmail}` : ''}${(form as any).contactLineId ? ` · Line ID: ${(form as any).contactLineId}` : ''}`
      }]
    } as any)
    setShowModal(false)
    setTicketAttachments([])
    setForm({ customerId: '', subject: '', description: '', severity: 'Medium', channel: 'Web', contactName: '', contactPhone: '', contactEmail: '', contactLineId: '', notifyEmail: true, notifyLine: false, assignedTo: '' })
  }

  const handleAddLog = () => {
    if (!detailTicket) return
    const now = new Date().toISOString()
    const isEscalate = logForm.action.startsWith('Escalated')
    const levelMap: Record<string, number> = {
      'Escalated L1 - Internal Support': 1,
      'Escalated L2 - Specialist/3rd Party': 2,
      'Escalated L3 - Manufacturer/Vendor': 3,
    }
    const note = isEscalate && logForm.escalateTo
      ? `${logForm.note} | ยกระดับไปยัง: ${logForm.escalateTo}`
      : logForm.note

    addWorkLog(detailTicket.id, {
      id: Date.now(), time: now,
      user: 'Service Team',
      action: logForm.action, note
    } as any)

    const newStatus = ACTION_STATUS_MAP[logForm.action]
    if (newStatus) {
      const extra: any = {}
      if (newStatus === 'Closed') extra.closedAt = now
      if (isEscalate) {
        extra.escalationLevel = levelMap[logForm.action] || 1
        extra.escalatedTo = logForm.escalateTo
        extra.escalatedAt = now
        extra.escalationReason = logForm.note
      }
      updateTicket(detailTicket.id, { status: newStatus as any, ...extra })
    }

    // If Resolved log added → prompt resolve modal
    if (logForm.action === 'Resolved') {
      setShowLogModal(false)
      setLogForm({ action: 'In Progress', note: '', escalateTo: '', escalateLevel: 1 })
      setLogAttachments([])
      setTimeout(() => setShowResolveModal(true), 200)
      return
    }

    setShowLogModal(false)
    setLogForm({ action: 'In Progress', note: '', escalateTo: '', escalateLevel: 1 })
    setLogAttachments([])
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
    } as any)
    setShowResolveModal(false)
    setResolveForm({ rootCause: '', resolution: '', note: '' })
  }

  const handleEditLog = () => {
    if (!detailTicket || !editingLog) return
    const updatedLogs = (detailTicket.workLogs || []).map((l: WorkLog) =>
      l.id === editingLog.id ? { ...l, action: editLogForm.action, note: editLogForm.note } : l
    )
    updateTicket(detailTicket.id, { workLogs: updatedLogs } as any)
    setEditingLog(null)
  }

  const handleDeleteLog = (logId: number) => {
    if (!detailTicket) return
    const updatedLogs = (detailTicket.workLogs || []).filter((l: WorkLog) => l.id !== logId)
    updateTicket(detailTicket.id, { workLogs: updatedLogs } as any)
    setDeleteLogId(null)
  }

  const copyTicketNo = (no: string) => {
    navigator.clipboard.writeText(no).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB`

  const excelHeaders = ['เลขที่', 'ลูกค้า', 'หัวข้อ', 'ช่องทาง', 'ระดับ', 'สถานะ', 'SLA', 'ผู้รับผิดชอบ', 'วันที่สร้าง']
  const excelKeys = ['no', 'customerName', 'subject', 'channel', 'severity', 'status', 'slaStatus', 'assignedTo', 'createdAt']

  const sevColors: Record<string, string> = {
    Critical: 'border-l-4 border-red-500 bg-red-50/30',
    High: 'border-l-4 border-orange-400 bg-orange-50/20',
    Medium: 'border-l-4 border-yellow-400 bg-yellow-50/20',
    Low: 'border-l-4 border-blue-400 bg-blue-50/20'
  }

  const isEscalateAction = logForm.action.startsWith('Escalated')

  return (
    <div className="space-y-4">
      {/* TOR Banner */}
      <div className="bg-[#0F2654]/5 border border-[#1B3875]/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <CheckCircleIcon className="w-5 h-5 text-[#1B3875] flex-shrink-0" />
        <p className="text-xs text-[#1B3875]/80 leading-relaxed">
          <span className="font-semibold text-[#1B3875]">ระบบ Ticketing ตามข้อกำหนด TOR:</span>{' '}
          รองรับ 3 ช่องทาง · Case Number อัตโนมัติ · แจ้งเตือนลูกค้าผ่าน Email / Line · แนบไฟล์ได้ · Escalation ผ่าน Work Log
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
          <div className="text-xs text-gray-400 mt-0.5">L1/L2/L3</div>
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
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${channelBg(tk.channel || 'Web')}`}>
                        {channelIcon(tk.channel || 'Web')}{tk.channel || 'Web'}
                      </span>
                      {(tk.escalationLevel || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          <ArrowUpCircleIcon className="w-3 h-3" />L{tk.escalationLevel}
                        </span>
                      )}
                      {tk.slaStatus === 'Breached' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 truncate">{tk.subject}</h3>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{tk.customerName}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">ผู้รับผิดชอบ: {tk.assignedTo || '-'}</span>
                      {tk.contactName && <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400"><UserIcon className="w-3 h-3 inline mr-0.5" />{tk.contactName}</span>
                      </>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={statusColor(tk.status) as any}>{tk.status}</Badge>
                    <div className="text-xs text-gray-400 mt-1">{new Date(tk.createdAt).toLocaleDateString('th-TH')}</div>
                    <div className="text-xs text-gray-300 mt-0.5">{(tk.workLogs || []).length} logs</div>
                  </div>
                </div>
                {tk.responseDue && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                    <span><ClockIcon className="w-3.5 h-3.5 inline mr-1 text-orange-400" />Response: <span className="font-medium">{tk.responseDue}</span></span>
                    <span>Resolution: <span className="font-medium">{tk.resolutionDue}</span></span>
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
          {/* Channel */}
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

          {/* Contact Info + Notification */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-blue-800">ข้อมูลผู้ติดต่อ &amp; การแจ้งเตือนสถานะ</p>
            <div className="grid grid-cols-2 gap-2">
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
                <label className="block text-xs text-gray-600 mb-1">Email (แจ้งเตือนอัตโนมัติ)</label>
                <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="customer@company.com"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Line ID (แจ้งเตือนผ่าน Line)</label>
                <input value={(form as any).contactLineId || ''} onChange={e => setForm({ ...form, contactLineId: e.target.value } as any)}
                  placeholder="@lineId หรือชื่อ Line"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm focus:outline-none" />
              </div>
            </div>
            {/* Notification preference */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">แจ้งเตือนสถานะ Case ผ่าน:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.notifyEmail} onChange={e => setForm({ ...form, notifyEmail: e.target.checked })}
                    className="w-3.5 h-3.5 accent-[#1B3875]" />
                  <EnvelopeIcon className="w-3.5 h-3.5 text-blue-500" /> Email
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={(form as any).notifyLine || false} onChange={e => setForm({ ...form, notifyLine: e.target.checked } as any)}
                    className="w-3.5 h-3.5 accent-[#1B3875]" />
                  <span className="text-green-600 font-bold text-xs">LINE</span> Line Notify
                </label>
              </div>
            </div>
          </div>

          {/* Attach files */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">แนบไฟล์ (รูปภาพ / Log / เอกสาร)</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-[#1B3875]/40 transition-colors"
              onClick={() => ticketFileRef.current?.click()}>
              <PaperClipIcon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-400">คลิกเพื่อเลือกไฟล์ หรือลาก &amp; วาง</p>
              <p className="text-xs text-gray-300 mt-0.5">รองรับ .jpg .png .pdf .log .txt (ไม่เกิน 10MB ต่อไฟล์)</p>
            </div>
            <input ref={ticketFileRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.log,.txt,.zip,.csv"
              className="hidden"
              onChange={e => { if (e.target.files) readFiles(e.target.files, a => setTicketAttachments(prev => [...prev, ...a])) }} />
            {ticketAttachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {ticketAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5 text-xs">
                    <PaperClipIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-700">{a.name}</span>
                    <span className="text-gray-400 flex-shrink-0">{formatBytes(a.size)}</span>
                    <button onClick={() => setTicketAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 ml-1"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับผิดชอบ</label>
            <input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>

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
      <Modal open={showDetail !== null} onClose={() => { setShowDetail(null); setShowDeleteConfirm(false) }} title="รายละเอียด Case" size="xl">
        {detailTicket && (
          <div className="space-y-4">
            {/* Resolve-required banner */}
            {hasResolvedLog(detailTicket) && (
              <div className="bg-green-50 border border-green-400 rounded-xl px-4 py-3 flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Work Log บันทึก &ldquo;Resolved&rdquo; แล้ว — กรุณากด Resolve Case เพื่อระบุ Root Cause</p>
                  <p className="text-xs text-green-600 mt-0.5">ต้องบันทึก Root Cause และวิธีแก้ไขเพื่อปิด Case อย่างสมบูรณ์</p>
                </div>
                <Button size="sm" className="!bg-green-600 hover:!bg-green-700 !text-white flex-shrink-0"
                  onClick={() => setShowResolveModal(true)}>Resolve Case →</Button>
              </div>
            )}

            {/* Header */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0F2654]">{detailTicket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-mono text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">{detailTicket.no}</span>
                    <button onClick={() => copyTicketNo(detailTicket.no)}
                      className="flex items-center gap-1 text-xs text-[#1B3875] hover:text-[#0F2654]">
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
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

            {/* Status Progress Bar (read-only, driven by work logs) */}
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 mb-3">สถานะปัจจุบัน (อัปเดตตาม Work Log)</p>
              <div className="flex items-center gap-0">
                {STATUS_PIPELINE.map((s, i) => {
                  const current = currentStatusStep(detailTicket.status)
                  const isPast = i < current
                  const isCurrent = i === current
                  return (
                    <div key={s} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isCurrent ? 'bg-[#1B3875] ring-2 ring-[#1B3875]/30' : isPast ? 'bg-[#1B3875]/40' : 'bg-gray-200'}`} />
                        <span className={`text-center mt-1 leading-tight ${isCurrent ? 'text-[#1B3875] font-semibold' : isPast ? 'text-gray-400' : 'text-gray-300'}`}
                          style={{ fontSize: '9px', wordBreak: 'break-word', maxWidth: '44px' }}>{s}</span>
                      </div>
                      {i < STATUS_PIPELINE.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-0.5 ${i < current ? 'bg-[#1B3875]/40' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                ['ลูกค้า', detailTicket.customerName],
                ['ผู้รับผิดชอบ', detailTicket.assignedTo || '-'],
                ['ช่องทาง', detailTicket.channel || '-'],
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

            {/* Contact + Notification info */}
            {(detailTicket.contactName || detailTicket.contactPhone || detailTicket.contactEmail || (detailTicket as any).contactLineId) && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">ข้อมูลผู้ติดต่อ &amp; การแจ้งเตือน</p>
                <div className="flex flex-wrap gap-4 text-xs text-blue-700">
                  {detailTicket.contactName && <span><UserIcon className="w-3.5 h-3.5 inline mr-1" />{detailTicket.contactName}</span>}
                  {detailTicket.contactPhone && <span><PhoneIcon className="w-3.5 h-3.5 inline mr-1" />{detailTicket.contactPhone}</span>}
                  {detailTicket.contactEmail && (
                    <span className="flex items-center gap-1">
                      <EnvelopeIcon className="w-3.5 h-3.5" />{detailTicket.contactEmail}
                      <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-xs">แจ้งเตือน Email</span>
                    </span>
                  )}
                  {(detailTicket as any).contactLineId && (
                    <span className="flex items-center gap-1">
                      <span className="font-bold text-green-600 text-xs">LINE</span> {(detailTicket as any).contactLineId}
                      <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-xs">Line Notify</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {detailTicket.description && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{detailTicket.description}</div>
            )}

            {/* Escalation info (from logs) */}
            {(detailTicket.escalationLevel || 0) > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircleIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">ยกระดับปัญหา — {ESC_LEVELS[detailTicket.escalationLevel || 0]}</span>
                </div>
                {detailTicket.escalatedTo && (
                  <div className="text-xs text-orange-700">ส่งต่อไปยัง: <span className="font-medium">{detailTicket.escalatedTo}</span></div>
                )}
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
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(detailTicket.workLogs || []).map((log: WorkLog, i: number) => (
                  <div key={log.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#1B3875] mt-1.5 flex-shrink-0" />
                      {i < (detailTicket.workLogs || []).length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${timelineActionColor(log.action)}`}>{log.action}</span>
                        <span className="text-xs text-gray-400">{new Date(log.time).toLocaleString('th-TH')}</span>
                        <span className="text-xs text-gray-500">— {log.user}</span>
                        {/* Edit/Delete buttons (hidden until hover) */}
                        {deleteLogId === log.id ? (
                          <span className="flex gap-1 ml-auto">
                            <button onClick={() => handleDeleteLog(log.id)}
                              className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100">ยืนยันลบ</button>
                            <button onClick={() => setDeleteLogId(null)}
                              className="text-xs text-gray-500 px-2 py-0.5 rounded hover:bg-gray-100">ยกเลิก</button>
                          </span>
                        ) : (
                          <span className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingLog(log); setEditLogForm({ action: log.action, note: log.note }) }}
                              className="text-gray-400 hover:text-[#1B3875] p-0.5 rounded hover:bg-gray-100">
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteLogId(log.id)}
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50">
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
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

            {/* Edit Log inline */}
            {editingLog && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-yellow-800">แก้ไข Work Log</p>
                <select value={editLogForm.action} onChange={e => setEditLogForm({ ...editLogForm, action: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-yellow-200 rounded text-sm focus:outline-none">
                  {LOG_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <textarea rows={2} value={editLogForm.note} onChange={e => setEditLogForm({ ...editLogForm, note: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-yellow-200 rounded text-sm focus:outline-none resize-none" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditLog}>บันทึก</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingLog(null)}>ยกเลิก</Button>
                </div>
              </div>
            )}

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
                    addWorkLog(detailTicket.id, { id: Date.now(), time: now, user: 'Service Team', action: 'Assigned', note: `มอบหมายให้ ${assignForm}` } as any)
                    setAssignForm('')
                  }
                }}>บันทึก</Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" icon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
                  onClick={() => setShowLogModal(true)}>เพิ่ม Work Log</Button>
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

      {/* ─── Work Log Modal ─── */}
      <Modal open={showLogModal} onClose={() => setShowLogModal(false)} title="เพิ่ม Work Log / บันทึกความคืบหน้า" size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action / ประเภทกิจกรรม*</label>
            <select value={logForm.action} onChange={e => setLogForm({ ...logForm, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {LOG_ACTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Show escalate-to field when escalation action selected */}
          {isEscalateAction && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                <ArrowUpCircleIcon className="w-3.5 h-3.5" />ข้อมูลการยกระดับ
              </p>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ยกระดับไปยัง (ชื่อบุคคล/ทีม/บริษัท)*</label>
                <input value={logForm.escalateTo} onChange={e => setLogForm({ ...logForm, escalateTo: e.target.value })}
                  placeholder="เช่น HPE TAC, True Business NOC, นาย..."
                  className="w-full px-2.5 py-1.5 border border-orange-200 rounded text-sm focus:outline-none" />
              </div>
            </div>
          )}

          {/* Resolved action info */}
          {logForm.action === 'Resolved' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              เมื่อบันทึก &ldquo;Resolved&rdquo; ระบบจะเปิด popup ให้กรอก Root Cause และวิธีแก้ไข เพื่อปิด Case อย่างสมบูรณ์
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">บันทึกรายละเอียด*</label>
            <textarea rows={4} value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })}
              placeholder="อธิบายขั้นตอนที่ดำเนินการ ผลลัพธ์ ขั้นตอนถัดไป..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>

          {/* Attach files in log */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">แนบไฟล์ (รูปหน้าจอ / Log file)</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-2.5 text-center cursor-pointer hover:border-[#1B3875]/40 transition-colors"
              onClick={() => logFileRef.current?.click()}>
              <p className="text-xs text-gray-400">คลิกเพื่อเลือกไฟล์</p>
            </div>
            <input ref={logFileRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.log,.txt,.zip,.csv"
              className="hidden"
              onChange={e => { if (e.target.files) readFiles(e.target.files, a => setLogAttachments(prev => [...prev, ...a])) }} />
            {logAttachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {logAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 text-xs">
                    <PaperClipIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 truncate text-gray-700">{a.name}</span>
                    <span className="text-gray-400">{formatBytes(a.size)}</span>
                    <button onClick={() => setLogAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowLogModal(false)}>ยกเลิก</Button>
          <Button onClick={handleAddLog} disabled={!logForm.note || (isEscalateAction && !logForm.escalateTo)}>บันทึก Log</Button>
        </div>
      </Modal>

      {/* ─── Resolve Case Modal ─── */}
      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="✅ Resolve Case — ระบุ Root Cause" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-xs text-green-700">
            กรุณาระบุ Root Cause และวิธีแก้ไขทุกครั้ง เพื่อใช้อ้างอิงและปรับปรุงกระบวนการในอนาคต
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Root Cause (สาเหตุที่แท้จริง) *</label>
            <textarea rows={2} value={resolveForm.rootCause} onChange={e => setResolveForm({ ...resolveForm, rootCause: e.target.value })}
              placeholder="เช่น Hardware failure — HDD bad sector, Config error — VLAN misconfigured..."
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
            ยืนยัน Resolve + ปิด Case
          </Button>
        </div>
      </Modal>
    </div>
  )
}
