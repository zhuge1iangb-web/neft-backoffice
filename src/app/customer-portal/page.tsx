'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store'
import type { WorkLog } from '@/lib/demo-data'
import {
  PhoneIcon, EnvelopeIcon, GlobeAltIcon, PlusIcon, ArrowRightOnRectangleIcon,
  ClipboardDocumentIcon, CheckCircleIcon, ClockIcon, ArrowUpCircleIcon,
  ExclamationTriangleIcon, MagnifyingGlassIcon, UserCircleIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

// ─── Customer Portal — Separate login for customers ───────────────────────────
// Customers log in with email. They can only see tickets tied to their account.
// Engineers log in at the main app (/). This portal is read-focused + new ticket.

const CHANNEL_LABELS: Record<string, string> = { Phone: 'โทรศัพท์', Web: 'Web Portal', Email: 'อีเมล' }
const STATUS_TH: Record<string, string> = {
  'Open': 'รับเรื่อง', 'Assigned': 'มอบหมายแล้ว', 'In Progress': 'กำลังดำเนินการ',
  'Pending Customer': 'รอข้อมูลลูกค้า', 'Pending Vendor': 'รอ Vendor',
  'Escalated': 'ยกระดับปัญหา', 'Resolved': 'แก้ไขแล้ว', 'Closed': 'ปิด Case'
}

// Demo customer credentials
const CUSTOMER_LOGINS = [
  { email: 'it@ktb.co.th',          password: 'ktb123',  customerId: 2, name: 'ธนาคารกรุงไทย' },
  { email: 'info@thaimetal.co.th',   password: 'metal123', customerId: 1, name: 'บริษัท ไทยเมทัล จำกัด' },
  { email: 'procurement@scg.co.th',  password: 'scg123',  customerId: 3, name: 'SCG Group' },
  { email: 'it@cpf.co.th',           password: 'cpf123',  customerId: 4, name: 'บริษัท ซีพีเอฟ จำกัด' },
  { email: 'info@pttdigital.co.th',  password: 'ptt123',  customerId: 5, name: 'PTT Digital' },
  { email: 'vendor@ais.th',          password: 'ais123',  customerId: 6, name: 'AIS' },
]

type CustomerSession = { email: string; customerId: number; name: string }

export default function CustomerPortalPage() {
  const { tickets, addTicket, customers } = useAppStore()
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    subject: '', description: '', severity: 'Medium',
    channel: 'Web', contactName: '', contactPhone: '', contactEmail: '',
  })

  // Load session from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('neft_customer_session')
      if (saved) setSession(JSON.parse(saved))
    } catch {}
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const cred = CUSTOMER_LOGINS.find(c => c.email === email && c.password === password)
    if (!cred) { setLoginErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); return }
    const sess = { email: cred.email, customerId: cred.customerId, name: cred.name }
    setSession(sess)
    sessionStorage.setItem('neft_customer_session', JSON.stringify(sess))
    setLoginErr('')
  }

  const handleLogout = () => {
    setSession(null)
    sessionStorage.removeItem('neft_customer_session')
  }

  const myTickets = session
    ? tickets.filter(t => t.customerId === session.customerId &&
        (t.no.toLowerCase().includes(search.toLowerCase()) ||
         t.subject.toLowerCase().includes(search.toLowerCase())))
    : []

  const openCount = myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length
  const resolvedCount = myTickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length

  const nextTicketNo = () => {
    const year = new Date().getFullYear()
    const maxNo = tickets.reduce((max, tk) => {
      const m = tk.no.match(/TK-\d{4}-(\d+)/)
      return m ? Math.max(max, parseInt(m[1])) : max
    }, 90)
    return `TK-${year}-${String(maxNo + 1).padStart(4, '0')}`
  }

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    const now = new Date().toISOString()
    const no = nextTicketNo()
    const slaHours: Record<string, number> = { Critical: 4, High: 8, Medium: 24, Low: 48 }
    const respDue = new Date(Date.now() + slaHours[form.severity] * 3600000)
    const resDue = new Date(Date.now() + slaHours[form.severity] * 3 * 3600000)
    addTicket({
      id: Date.now(), no,
      customerId: session.customerId, customerName: session.name,
      subject: form.subject, description: form.description, severity: form.severity as any,
      channel: form.channel as any,
      contactName: form.contactName, contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || session.email,
      assignedTo: 'Service Team', status: 'Open' as any,
      createdAt: now,
      responseDue: respDue.toLocaleString('th-TH'),
      resolutionDue: resDue.toLocaleString('th-TH'),
      slaStatus: 'Met' as any, contractId: null,
      escalationLevel: 0 as any, escalatedTo: '', escalatedAt: '', escalationReason: '',
      rootCause: '', resolution: '', resolvedAt: null, closedAt: null,
      workLogs: [{
        id: 1, time: now, user: 'ระบบ', action: 'Ticket Opened',
        note: `รับแจ้งปัญหาผ่าน Web Portal โดยลูกค้า ออก Case Number ${no} แจ้ง Engineer แล้ว`
      }]
    })
    setSubmitted(true)
    setShowNewTicket(false)
    setForm({ subject: '', description: '', severity: 'Medium', channel: 'Web', contactName: '', contactPhone: '', contactEmail: '' })
    setTimeout(() => setSubmitted(false), 5000)
  }

  const copyNo = (no: string) => {
    navigator.clipboard.writeText(no).catch(() => {})
    setCopied(no)
    setTimeout(() => setCopied(null), 2000)
  }

  const statusColor = (s: string) => {
    if (['Resolved', 'Closed'].includes(s)) return 'bg-green-100 text-green-700'
    if (s === 'Escalated') return 'bg-red-100 text-red-700'
    if (s === 'Open') return 'bg-blue-100 text-blue-700'
    if (['Pending Customer', 'Pending Vendor'].includes(s)) return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
  }

  const sevColor = (s: string) => {
    if (s === 'Critical') return 'bg-red-100 text-red-700'
    if (s === 'High') return 'bg-orange-100 text-orange-700'
    if (s === 'Medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-blue-100 text-blue-700'
  }

  const selectedTk = selectedTicket !== null ? tickets.find(t => t.id === selectedTicket) : null

  // ─── LOGIN PAGE ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F2654] via-[#1B3875] to-[#2557A7] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-[#E84B0F]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with logo */}
            <div className="bg-gradient-to-br from-[#0F2654] to-[#1B3875] px-8 py-8 text-center">
              <div className="flex justify-center mb-3">
                <Image src="/neft-logo.png" alt="NEFT Solution" width={140} height={47} className="h-10 w-auto object-contain brightness-0 invert" priority />
              </div>
              <div className="w-10 h-px bg-[#E84B0F] mx-auto mb-3" />
              <p className="text-blue-100 text-sm font-medium">Customer Support Portal</p>
              <p className="text-blue-300 text-xs mt-1">ระบบแจ้งปัญหาและติดตาม Case</p>
            </div>

            <div className="px-8 py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">อีเมลบริษัท</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="your@company.co.th"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/30 focus:border-[#E84B0F]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผ่าน</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/30 focus:border-[#E84B0F]" />
                </div>
                {loginErr && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{loginErr}</p>}
                <button type="submit"
                  className="w-full bg-gradient-to-r from-[#E84B0F] to-[#c93d08] hover:from-[#c93d08] hover:to-[#b03407] text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md">
                  เข้าสู่ระบบ
                </button>
              </form>

              {/* Demo credentials */}
              <div className="mt-5 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">Demo Accounts</p>
                <div className="space-y-1">
                  {CUSTOMER_LOGINS.slice(0, 3).map(c => (
                    <button key={c.email} onClick={() => { setEmail(c.email); setPassword(c.password) }}
                      className="w-full text-left text-xs px-2 py-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-600 hover:text-[#1B3875]">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-400 ml-2">{c.email}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link back to staff login */}
              <p className="text-center text-xs text-gray-400 mt-4">
                Engineer/Staff?{' '}
                <a href="/" className="text-[#1B3875] hover:underline font-medium">Staff Login →</a>
              </p>
            </div>
          </div>
          <p className="text-center text-white/40 text-xs mt-4">
            © 2026 NEFT Solution · 24/7 Support: 02-096-2377 กด 4
          </p>
        </div>
      </div>
    )
  }

  // ─── TICKET DETAIL ─────────────────────────────────────────────────────────
  if (selectedTk) {
    const timelineActionColor = (action: string) => {
      if (action.includes('Resolved') || action.includes('Closed')) return 'bg-green-100 text-green-700 border-green-200'
      if (action.includes('Escalated')) return 'bg-red-100 text-red-700 border-red-200'
      if (action.includes('Opened')) return 'bg-blue-100 text-blue-700 border-blue-200'
      return 'bg-gray-100 text-gray-700 border-gray-200'
    }

    return (
      <div className="min-h-screen bg-[#F4F6FA]">
        {/* Top nav */}
        <header className="bg-[#0F2654] text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Image src="/neft-logo.png" alt="NEFT" width={100} height={34} className="h-7 w-auto brightness-0 invert" />
            <span className="text-white/60 text-sm hidden sm:inline">/ Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-200 text-xs hidden sm:inline">{session.name}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200 px-2 py-1 rounded">
              <ArrowRightOnRectangleIcon className="w-4 h-4" />ออก
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setSelectedTicket(null)} className="text-xs text-[#1B3875] hover:underline mb-4 flex items-center gap-1">
            ← กลับรายการ Case
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Case header */}
            <div className="bg-gradient-to-r from-[#0F2654] to-[#1B3875] px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded">{selectedTk.no}</span>
                    <button onClick={() => copyNo(selectedTk.no)}
                      className="text-xs text-white/60 hover:text-white flex items-center gap-1">
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      {copied === selectedTk.no ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                    </button>
                  </div>
                  <h2 className="text-white font-semibold text-sm leading-snug">{selectedTk.subject}</h2>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColor(selectedTk.status)}`}>
                  {STATUS_TH[selectedTk.status] || selectedTk.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['ระดับความรุนแรง', <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${sevColor(selectedTk.severity)}`}>{selectedTk.severity}</span>],
                  ['SLA Status', <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${selectedTk.slaStatus === 'Breached' ? 'bg-red-100 text-red-700' : selectedTk.slaStatus === 'At Risk' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{selectedTk.slaStatus}</span>],
                  ['ช่องทางแจ้งเหตุ', CHANNEL_LABELS[selectedTk.channel || 'Web'] || selectedTk.channel],
                  ['ผู้รับผิดชอบ', selectedTk.assignedTo],
                  ['Response Due', selectedTk.responseDue || '-'],
                  ['Resolution Due', selectedTk.resolutionDue || '-'],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-gray-400 mb-0.5">{k}</div>
                    <div className="font-medium text-gray-700">{v}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selectedTk.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">รายละเอียดปัญหา</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{selectedTk.description}</div>
                </div>
              )}

              {/* Escalation */}
              {(selectedTk.escalationLevel || 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-orange-800 mb-1">
                    <ArrowUpCircleIcon className="w-4 h-4" />
                    ยกระดับปัญหาไปยังผู้เชี่ยวชาญ/ผู้ผลิต
                  </div>
                  <div className="text-orange-700">ส่งต่อไปยัง: <span className="font-medium">{selectedTk.escalatedTo}</span></div>
                  {selectedTk.escalationReason && <div className="text-orange-600 mt-0.5">เหตุผล: {selectedTk.escalationReason}</div>}
                </div>
              )}

              {/* Resolution */}
              {(selectedTk.rootCause || selectedTk.resolution) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-green-800 mb-1.5">
                    <CheckCircleIcon className="w-4 h-4" />ผลการแก้ไขปัญหา
                  </div>
                  {selectedTk.rootCause && <div className="text-green-700"><span className="font-medium">Root Cause:</span> {selectedTk.rootCause}</div>}
                  {selectedTk.resolution && <div className="text-green-700 mt-0.5"><span className="font-medium">วิธีแก้ไข:</span> {selectedTk.resolution}</div>}
                </div>
              )}

              {/* Work Log Timeline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-[#1B3875]" />
                  <p className="text-xs font-semibold text-gray-600">ประวัติการดำเนินการ ({(selectedTk.workLogs || []).length} รายการ)</p>
                </div>
                <div className="space-y-2.5">
                  {(selectedTk.workLogs || []).map((log: WorkLog, i: number) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#E84B0F] mt-1.5 flex-shrink-0" />
                        {i < (selectedTk.workLogs || []).length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${timelineActionColor(log.action)}`}>{log.action}</span>
                          <span className="text-xs text-gray-400">{new Date(log.time).toLocaleString('th-TH')}</span>
                        </div>
                        <p className="text-xs text-gray-600">{log.note}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTk.workLogs || selectedTk.workLogs.length === 0) && (
                    <p className="text-xs text-gray-400">ยังไม่มีบันทึก</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN PORTAL ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      {/* Top nav */}
      <header className="bg-[#0F2654] text-white px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image src="/neft-logo.png" alt="NEFT" width={110} height={37} className="h-8 w-auto brightness-0 invert" />
          <div className="hidden sm:block">
            <span className="text-white/60 text-xs">Customer Support Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200">
            <UserCircleIcon className="w-4 h-4" />
            <span>{session.name}</span>
          </div>
          <a href="tel:020962377" className="hidden sm:flex items-center gap-1 text-xs text-blue-300 hover:text-white">
            <PhoneIcon className="w-3.5 h-3.5" />02-096-2377 กด 4
          </a>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200 px-2 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Success flash */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span>เปิด Case สำเร็จ! Engineer จะติดต่อกลับตามช่องทางที่แจ้งไว้</span>
          </div>
        )}

        {/* Welcome + stats */}
        <div className="bg-gradient-to-r from-[#0F2654] to-[#1B3875] rounded-2xl p-5 text-white">
          <h1 className="font-bold text-base mb-0.5">ยินดีต้อนรับ, {session.name}</h1>
          <p className="text-blue-200 text-xs mb-4">ติดตามสถานะ Case และแจ้งปัญหาใหม่ได้ที่นี่</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{myTickets.length}</div>
              <div className="text-xs text-blue-200">Case ทั้งหมด</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-orange-300">{openCount}</div>
              <div className="text-xs text-blue-200">กำลังดำเนินการ</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-green-300">{resolvedCount}</div>
              <div className="text-xs text-blue-200">แก้ไขแล้ว</div>
            </div>
          </div>
        </div>

        {/* New Ticket button + search */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา Case Number หรือหัวข้อปัญหา..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white shadow-sm" />
          </div>
          <button onClick={() => setShowNewTicket(!showNewTicket)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#E84B0F] to-[#c93d08] hover:from-[#c93d08] hover:to-[#b03407] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex-shrink-0">
            <PlusIcon className="w-4 h-4" />แจ้งปัญหาใหม่
          </button>
        </div>

        {/* New ticket form */}
        {showNewTicket && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E84B0F]/10 to-orange-50 px-5 py-3 border-b border-orange-100">
              <h2 className="font-semibold text-sm text-[#0F2654]">แจ้งปัญหา / เปิด Case ใหม่</h2>
              <p className="text-xs text-gray-500 mt-0.5">ระบบจะออก Case Number ให้อัตโนมัติ Engineer จะติดต่อกลับภายใน SLA</p>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-5 space-y-4">
              {/* Channel */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">คุณแจ้งปัญหาผ่านช่องทางใด?</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Phone', 'Web', 'Email'] as const).map(ch => (
                    <button key={ch} type="button" onClick={() => setForm({ ...form, channel: ch })}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${form.channel === ch ? 'bg-[#0F2654] text-white border-[#0F2654]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2654]/30'}`}>
                      {ch === 'Phone' ? <PhoneIcon className="w-3.5 h-3.5" /> : ch === 'Email' ? <EnvelopeIcon className="w-3.5 h-3.5" /> : <GlobeAltIcon className="w-3.5 h-3.5" />}
                      {CHANNEL_LABELS[ch]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">หัวข้อปัญหา *</label>
                  <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="อธิบายปัญหาโดยย่อ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#E84B0F]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ระดับความรุนแรง</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                    <option value="Critical">Critical — ระบบหยุดทำงาน</option>
                    <option value="High">High — กระทบการทำงาน</option>
                    <option value="Medium">Medium — ทำงานได้บ้าง</option>
                    <option value="Low">Low — ปัญหาเล็กน้อย</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อผู้ติดต่อ</label>
                  <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
                    placeholder="ชื่อ-สกุล ตำแหน่ง"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                  <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">อีเมลติดต่อกลับ</label>
                  <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder={session.email}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียดปัญหา</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="อธิบายอาการ ขั้นตอนที่เกิดปัญหา สิ่งที่ลองแก้ไขแล้ว..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
                </div>
              </div>

              {/* SLA info */}
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                <span className="font-semibold">SLA:</span>{' '}
                {form.severity === 'Critical' ? 'Response ภายใน 4 ชั่วโมง' :
                 form.severity === 'High' ? 'Response ภายใน 8 ชั่วโมง' :
                 form.severity === 'Medium' ? 'Response ภายใน 24 ชั่วโมง' : 'Response ภายใน 48 ชั่วโมง'}
                {' · '}หากเร่งด่วนโทร <a href="tel:020962377" className="font-bold underline">02-096-2377 กด 4</a>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg transition-colors">ยกเลิก</button>
                <button type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#E84B0F] to-[#c93d08] text-white text-sm font-semibold rounded-lg hover:from-[#c93d08] hover:to-[#b03407] transition-all shadow-sm">
                  ส่งคำร้อง + รับ Case Number
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 px-1">Case ของคุณ</h2>
          {myTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100">
              {search ? 'ไม่พบ Case ที่ค้นหา' : 'ยังไม่มี Case — กดปุ่ม "แจ้งปัญหาใหม่" เพื่อเปิด Case'}
            </div>
          ) : (
            myTickets.map(tk => (
              <div key={tk.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedTicket(tk.id)}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{tk.no}</span>
                        <button onClick={e => { e.stopPropagation(); copyNo(tk.no) }}
                          className="text-xs text-[#1B3875] hover:text-[#0F2654] flex items-center gap-0.5">
                          <ClipboardDocumentIcon className="w-3 h-3" />
                          {copied === tk.no ? 'คัดลอกแล้ว!' : ''}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sevColor(tk.severity)}`}>{tk.severity}</span>
                        {(tk.escalationLevel || 0) > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <ArrowUpCircleIcon className="w-3 h-3" />ยกระดับแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{tk.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span><ClockIcon className="w-3 h-3 inline mr-0.5" />{new Date(tk.createdAt).toLocaleDateString('th-TH')}</span>
                        <span>ผู้รับผิดชอบ: {tk.assignedTo}</span>
                        <span>{(tk.workLogs || []).length} log</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(tk.status)}`}>
                        {STATUS_TH[tk.status] || tk.status}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {tk.slaStatus === 'Breached' && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500 inline" />}
                        {tk.slaStatus}
                      </div>
                    </div>
                  </div>
                </div>
                {tk.responseDue && (
                  <div className="border-t border-gray-50 px-4 py-2 text-xs text-gray-400">
                    Response due: <span className="font-medium text-gray-600">{tk.responseDue}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-2 pb-6">
          <p>ต้องการความช่วยเหลือด่วน? โทร <a href="tel:020962377" className="text-[#E84B0F] font-semibold">02-096-2377 กด 4</a> (24/7)</p>
          <p className="mt-1">© 2026 NEFT Solution Co., Ltd. · <a href="/" className="hover:underline">Staff Login</a></p>
        </div>
      </div>
    </div>
  )
}
