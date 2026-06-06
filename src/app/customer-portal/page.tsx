'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store'
import type { WorkLog } from '@/lib/demo-data'
import {
  PhoneIcon, EnvelopeIcon, GlobeAltIcon, PlusIcon, ArrowRightOnRectangleIcon,
  ClipboardDocumentIcon, CheckCircleIcon, ClockIcon, ArrowUpCircleIcon,
  ExclamationTriangleIcon, MagnifyingGlassIcon, UserCircleIcon, ChatBubbleLeftRightIcon,
  EyeIcon, EyeSlashIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline'

// ─── Customer Portal ───────────────────────────────────────────────────────────
// Admin creates accounts in Users page → customers use email+password to login
// Each customer only sees tickets tied to their customerId
// NO credential hints shown on login page (security)

const CHANNEL_LABELS: Record<string, string> = { Phone: 'โทรศัพท์', Web: 'Web Portal', Email: 'อีเมล' }
const STATUS_TH: Record<string, string> = {
  'Open': 'รับเรื่อง', 'Assigned': 'มอบหมายแล้ว', 'In Progress': 'กำลังดำเนินการ',
  'Pending Customer': 'รอข้อมูลจากลูกค้า', 'Pending Vendor': 'รอ Vendor',
  'Escalated': 'ยกระดับปัญหา', 'Resolved': 'แก้ไขแล้ว', 'Closed': 'ปิด Case'
}

type CustomerSession = {
  email: string
  customerId: number
  companyName: string
  contactName: string
}

export default function CustomerPortalPage() {
  const { tickets, addTicket, customerPortalAccounts } = useAppStore()
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<string | null>(null)

  const [form, setForm] = useState({
    subject: '', description: '', severity: 'Medium',
    channel: 'Web', contactName: '', contactPhone: '', contactEmail: '',
  })

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('neft_customer_session')
      if (saved) setSession(JSON.parse(saved))
    } catch {}
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginErr('')
    await new Promise(r => setTimeout(r, 500))
    const cred = customerPortalAccounts.find(c =>
      c.email === email.trim().toLowerCase() && c.password === password && c.active
    )
    if (!cred) {
      setLoginErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาติดต่อ NEFT เพื่อขอรับ credentials')
      setLoginLoading(false)
      return
    }
    const sess: CustomerSession = {
      email: cred.email,
      customerId: cred.customerId,
      companyName: cred.company,
      contactName: cred.name,
    }
    setSession(sess)
    sessionStorage.setItem('neft_customer_session', JSON.stringify(sess))
    setLoginLoading(false)
    setLoginErr('')
  }

  const handleLogout = () => {
    setSession(null)
    sessionStorage.removeItem('neft_customer_session')
    setEmail('')
    setPassword('')
  }

  const myTickets = session
    ? tickets
        .filter(t => t.customerId === session.customerId)
        .filter(t => {
          if (filterStatus === 'open') return !['Resolved', 'Closed'].includes(t.status)
          if (filterStatus === 'resolved') return ['Resolved', 'Closed'].includes(t.status)
          return true
        })
        .filter(t =>
          !search ||
          t.no.toLowerCase().includes(search.toLowerCase()) ||
          t.subject.toLowerCase().includes(search.toLowerCase())
        )
    : []

  const allMyTickets = session ? tickets.filter(t => t.customerId === session.customerId) : []
  const openCount = allMyTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length
  const resolvedCount = allMyTickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length

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
      customerId: session.customerId, customerName: session.companyName,
      subject: form.subject, description: form.description, severity: form.severity as any,
      channel: form.channel as any,
      contactName: form.contactName || session.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail || session.email,
      assignedTo: 'Service Team', status: 'Open' as any,
      createdAt: now,
      responseDue: respDue.toLocaleString('th-TH'),
      resolutionDue: resDue.toLocaleString('th-TH'),
      slaStatus: 'Met' as any, contractId: null,
      escalationLevel: 0 as any, escalatedTo: '', escalatedAt: '', escalationReason: '',
      rootCause: '', resolution: '', resolvedAt: null, closedAt: null,
      workLogs: [{
        id: 1, time: now, user: 'ระบบ (Customer Portal)', action: 'Ticket Opened',
        note: `รับแจ้งปัญหาผ่าน Customer Portal โดย ${session.contactName} (${session.companyName}) — ออก Case ${no}`
      }]
    })
    setSubmitted(no)
    setShowNewTicket(false)
    setForm({ subject: '', description: '', severity: 'Medium', channel: 'Web', contactName: '', contactPhone: '', contactEmail: '' })
    setTimeout(() => setSubmitted(null), 8000)
  }

  const copyNo = (no: string) => {
    navigator.clipboard.writeText(no).catch(() => {})
    setCopied(no)
    setTimeout(() => setCopied(null), 2000)
  }

  const statusStyle = (s: string) => {
    if (['Resolved', 'Closed'].includes(s)) return 'bg-green-100 text-green-700 border border-green-200'
    if (s === 'Escalated') return 'bg-red-100 text-red-700 border border-red-200'
    if (s === 'Open') return 'bg-[#1B3875]/10 text-[#1B3875] border border-[#1B3875]/20'
    if (['Pending Customer', 'Pending Vendor'].includes(s)) return 'bg-amber-100 text-amber-700 border border-amber-200'
    return 'bg-gray-100 text-gray-700 border border-gray-200'
  }

  const sevStyle = (s: string) => {
    if (s === 'Critical') return 'bg-red-100 text-red-700'
    if (s === 'High') return 'bg-orange-100 text-orange-700'
    if (s === 'Medium') return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  const timelineColor = (action: string) => {
    if (action.includes('Resolved') || action.includes('Closed')) return 'bg-green-100 text-green-700 border-green-200'
    if (action.includes('Escalated')) return 'bg-red-100 text-red-700 border-red-200'
    if (action.includes('Opened')) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (action.includes('Pending')) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const selectedTk = selectedTicket !== null ? tickets.find(t => t.id === selectedTicket) : null

  // ─── LOGIN PAGE ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F2654] via-[#1B3875] to-[#2557A7] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#E84B0F]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/4 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1B3875]/30 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            {/* Logo header — white bg to match logo naturally */}
            <div className="bg-white px-8 pt-8 pb-5 text-center border-b border-gray-100">
              <div className="flex justify-center mb-4">
                <Image
                  src="/neft-logo.png"
                  alt="NEFT Solution"
                  width={160} height={54}
                  className="h-12 w-auto object-contain"
                  priority
                />
              </div>
              <div className="w-12 h-0.5 bg-[#E84B0F] mx-auto mb-3 rounded-full" />
              <p className="text-[#0F2654] font-semibold text-sm">Customer Support Portal</p>
              <p className="text-gray-500 text-xs mt-1">ติดตามสถานะ Case และแจ้งปัญหา</p>
            </div>

            <div className="px-8 py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">อีเมลบริษัท</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    autoComplete="email"
                    placeholder="your@company.co.th"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/20 focus:border-[#E84B0F] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผ่าน</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)} required
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/20 focus:border-[#E84B0F] transition-colors" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {loginErr && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                    {loginErr}
                  </div>
                )}
                <button type="submit" disabled={loginLoading}
                  className="w-full bg-[#E84B0F] hover:bg-[#c93d08] text-white py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
                  {loginLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  เข้าสู่ระบบ
                </button>
              </form>

              {/* Security note — no credential hints */}
              <div className="mt-5 flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  ระบบนี้สำหรับลูกค้า NEFT Solution เท่านั้น
                  หากยังไม่มี account กรุณาติดต่อ <span className="font-medium text-[#1B3875]">02-096-2377</span> เพื่อขอรับ credentials
                </p>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Engineer/Staff?{' '}
                <a href="/" className="text-[#1B3875] hover:text-[#0F2654] font-medium hover:underline">Staff Login →</a>
              </p>
            </div>
          </div>
          <p className="text-center text-white/50 text-xs mt-4">
            © 2026 NEFT Solution Co., Ltd. · 24/7: 02-096-2377 กด 4
          </p>
        </div>
      </div>
    )
  }

  // ─── TICKET DETAIL ─────────────────────────────────────────────────────────
  if (selectedTk) {
    return (
      <div className="min-h-screen bg-[#F4F6FA]">
        <header className="bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Image src="/neft-logo.png" alt="NEFT" width={100} height={34} className="h-7 w-auto object-contain" />
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500 font-medium">Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{session.companyName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <ArrowRightOnRectangleIcon className="w-4 h-4" />ออก
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setSelectedTicket(null)}
            className="flex items-center gap-1 text-xs text-[#1B3875] hover:text-[#0F2654] mb-4 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> กลับรายการ Case
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Case header strip */}
            <div className="bg-[#0F2654] px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded">{selectedTk.no}</span>
                    <button onClick={() => copyNo(selectedTk.no)}
                      className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      {copied === selectedTk.no ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                    </button>
                  </div>
                  <h2 className="text-white font-semibold leading-snug">{selectedTk.subject}</h2>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusStyle(selectedTk.status)}`}>
                  {STATUS_TH[selectedTk.status] || selectedTk.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  ['ระดับความรุนแรง', <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${sevStyle(selectedTk.severity)}`}>{selectedTk.severity}</span>],
                  ['SLA Status', <span className={selectedTk.slaStatus === 'Breached' ? 'font-semibold text-red-600' : selectedTk.slaStatus === 'At Risk' ? 'font-semibold text-orange-600' : 'font-semibold text-green-600'}>{selectedTk.slaStatus}</span>],
                  ['ช่องทางแจ้งเหตุ', CHANNEL_LABELS[selectedTk.channel || 'Web'] || selectedTk.channel],
                  ['ผู้รับผิดชอบ', selectedTk.assignedTo],
                  ['Response Due', selectedTk.responseDue || '-'],
                  ['Resolution Due', selectedTk.resolutionDue || '-'],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-400 mb-0.5">{k}</div>
                    <div className="font-medium text-gray-700">{v}</div>
                  </div>
                ))}
              </div>

              {selectedTk.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">รายละเอียดปัญหา</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">{selectedTk.description}</div>
                </div>
              )}

              {(selectedTk.escalationLevel || 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-orange-800 mb-1.5">
                    <ArrowUpCircleIcon className="w-4 h-4" />
                    ยกระดับปัญหาไปยังผู้เชี่ยวชาญ
                  </div>
                  <div className="text-orange-700">ส่งต่อไปยัง: <span className="font-medium">{selectedTk.escalatedTo}</span></div>
                  {selectedTk.escalationReason && <div className="text-orange-600 mt-1">เหตุผล: {selectedTk.escalationReason}</div>}
                </div>
              )}

              {(selectedTk.rootCause || selectedTk.resolution) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                    <CheckCircleIcon className="w-4 h-4" />ผลการแก้ไขปัญหา
                  </div>
                  {selectedTk.rootCause && <div className="text-green-700 mb-1"><span className="font-medium">Root Cause:</span> {selectedTk.rootCause}</div>}
                  {selectedTk.resolution && <div className="text-green-700"><span className="font-medium">วิธีแก้ไข:</span> {selectedTk.resolution}</div>}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-[#1B3875]" />
                  <p className="text-xs font-semibold text-gray-600">ประวัติการดำเนินการ ({(selectedTk.workLogs || []).length} รายการ)</p>
                </div>
                <div className="space-y-3">
                  {(selectedTk.workLogs || []).map((log: WorkLog, i: number) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E84B0F] mt-1 flex-shrink-0 shadow-sm" />
                        {i < (selectedTk.workLogs || []).length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${timelineColor(log.action)}`}>{log.action}</span>
                          <span className="text-xs text-gray-400">{new Date(log.time).toLocaleString('th-TH')}</span>
                          <span className="text-xs text-gray-400">— {log.user}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{log.note}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTk.workLogs || selectedTk.workLogs.length === 0) && (
                    <p className="text-xs text-gray-400 py-2">ยังไม่มีบันทึก</p>
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
      {/* Top nav — white bg, logo natural */}
      <header className="bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Image src="/neft-logo.png" alt="NEFT" width={110} height={37} className="h-8 w-auto object-contain" />
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:block">Customer Support Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <UserCircleIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{session.companyName}</span>
          </div>
          <a href="tel:020962377" className="hidden md:flex items-center gap-1 text-xs text-[#E84B0F] hover:text-[#c93d08] font-medium">
            <PhoneIcon className="w-3.5 h-3.5" />02-096-2377 กด 4
          </a>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200">
            <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Success flash */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">เปิด Case สำเร็จ!</p>
              <p className="text-xs text-green-700 mt-0.5">Case Number: <span className="font-mono font-bold">{submitted}</span> — Engineer จะติดต่อกลับภายใน SLA</p>
            </div>
          </div>
        )}

        {/* Welcome banner */}
        <div className="bg-[#0F2654] rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#E84B0F]/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative">
            <h1 className="font-bold text-base mb-0.5">ยินดีต้อนรับ, {session.contactName}</h1>
            <p className="text-blue-300 text-xs mb-4">{session.companyName}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{allMyTickets.length}</div>
                <div className="text-xs text-blue-200 mt-0.5">Case ทั้งหมด</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-orange-300">{openCount}</div>
                <div className="text-xs text-blue-200 mt-0.5">กำลังดำเนินการ</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-green-300">{resolvedCount}</div>
                <div className="text-xs text-blue-200 mt-0.5">แก้ไขแล้ว</div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา Case Number หรือหัวข้อ..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white shadow-sm focus:ring-2 focus:ring-[#1B3875]/10" />
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {([['all','ทั้งหมด'],['open','กำลังดำเนินการ'],['resolved','แก้ไขแล้ว']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === k ? 'bg-[#1B3875] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewTicket(!showNewTicket)}
            className="flex items-center gap-2 bg-[#E84B0F] hover:bg-[#c93d08] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors flex-shrink-0">
            <PlusIcon className="w-4 h-4" />แจ้งปัญหาใหม่
          </button>
        </div>

        {/* New ticket form */}
        {showNewTicket && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E84B0F]/8 to-orange-50 px-5 py-4 border-b border-orange-100">
              <h2 className="font-semibold text-sm text-[#0F2654]">แจ้งปัญหา / เปิด Case ใหม่</h2>
              <p className="text-xs text-gray-500 mt-0.5">ระบบจะออก Case Number ให้อัตโนมัติ · Engineer ติดต่อกลับตาม SLA</p>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">ช่องทางการแจ้ง</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Phone', 'Web', 'Email'] as const).map(ch => (
                    <button key={ch} type="button" onClick={() => setForm({ ...form, channel: ch })}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.channel === ch ? 'bg-[#0F2654] text-white border-[#0F2654] shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2654]/30'}`}>
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/20 focus:border-[#E84B0F]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ระดับความรุนแรง</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                    <option value="Critical">🔴 Critical — ระบบหยุดทำงาน</option>
                    <option value="High">🟠 High — กระทบการทำงาน</option>
                    <option value="Medium">🟡 Medium — ทำงานได้บ้าง</option>
                    <option value="Low">🔵 Low — ปัญหาเล็กน้อย</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="0X-XXXX-XXXX"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียดปัญหา</label>
                  <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="อธิบายอาการปัญหา ขั้นตอนที่เกิดขึ้น อุปกรณ์ที่เกี่ยวข้อง สิ่งที่ลองแก้ไขแล้ว..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-xs text-blue-700">
                <span className="font-semibold">SLA ของคุณ:</span>{' '}
                {form.severity === 'Critical' ? 'Response ภายใน 4 ชั่วโมง · Resolution ภายใน 12 ชั่วโมง' :
                 form.severity === 'High' ? 'Response ภายใน 8 ชั่วโมง · Resolution ภายใน 24 ชั่วโมง' :
                 form.severity === 'Medium' ? 'Response ภายใน 24 ชั่วโมง · Resolution ภายใน 72 ชั่วโมง' :
                 'Response ภายใน 48 ชั่วโมง · Resolution ภายใน 5 วันทำการ'}
                {' · '}กรณีเร่งด่วนโทร <a href="tel:020962377" className="font-bold underline">02-096-2377 กด 4</a>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="submit"
                  className="px-5 py-2.5 bg-[#E84B0F] hover:bg-[#c93d08] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                  ส่งคำร้อง + รับ Case Number
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-gray-600">Case ทั้งหมด ({myTickets.length})</h2>
          </div>
          {myTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-sm">{search ? 'ไม่พบ Case ที่ค้นหา' : 'ยังไม่มี Case — กดปุ่ม "แจ้งปัญหาใหม่" เพื่อเปิด Case'}</p>
            </div>
          ) : (
            myTickets.map(tk => (
              <div key={tk.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1B3875]/20 transition-all cursor-pointer group"
                onClick={() => setSelectedTicket(tk.id)}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{tk.no}</span>
                        <button onClick={e => { e.stopPropagation(); copyNo(tk.no) }}
                          className="text-xs text-[#1B3875] hover:text-[#0F2654] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ClipboardDocumentIcon className="w-3 h-3" />
                          {copied === tk.no ? '✓' : 'คัดลอก'}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sevStyle(tk.severity)}`}>{tk.severity}</span>
                        {(tk.escalationLevel || 0) > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <ArrowUpCircleIcon className="w-3 h-3" />ยกระดับแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{tk.subject}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span><ClockIcon className="w-3 h-3 inline mr-0.5" />{new Date(tk.createdAt).toLocaleDateString('th-TH')}</span>
                        <span>ผู้รับผิดชอบ: <span className="text-gray-600">{tk.assignedTo}</span></span>
                        <span>{(tk.workLogs || []).length} บันทึก</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyle(tk.status)}`}>
                        {STATUS_TH[tk.status] || tk.status}
                      </span>
                      {tk.slaStatus === 'Breached' && (
                        <div className="text-xs text-red-500 mt-1 flex items-center gap-0.5 justify-end">
                          <ExclamationTriangleIcon className="w-3 h-3" />SLA Breached
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {tk.responseDue && (
                  <div className="border-t border-gray-50 px-4 py-2 text-xs text-gray-400 flex gap-4">
                    <span>Response due: <span className="text-gray-600 font-medium">{tk.responseDue}</span></span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          <p>ต้องการความช่วยเหลือด่วน? โทร <a href="tel:020962377" className="text-[#E84B0F] font-semibold hover:underline">02-096-2377 กด 4</a> (24/7)</p>
          <p className="mt-1">© 2026 NEFT Solution Co., Ltd. · <a href="/" className="hover:underline text-gray-400">Staff Login</a></p>
        </div>
      </div>
    </div>
  )
}
