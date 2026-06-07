'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAppStore } from '@/store'
import { supabase, hasSupabase } from '@/lib/supabase'
import type { WorkLog } from '@/lib/demo-data'
import type { CustomerPortalAccount } from '@/store'
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

type PortalLang = 'th' | 'en'

const CHANNEL_LABELS: Record<PortalLang, Record<string, string>> = {
  th: { Phone: 'โทรศัพท์', Web: 'Web Portal', Email: 'อีเมล' },
  en: { Phone: 'Phone', Web: 'Web Portal', Email: 'Email' },
}
const STATUS_LABELS: Record<PortalLang, Record<string, string>> = {
  th: {
    'Open': 'รับเรื่อง', 'Assigned': 'มอบหมายแล้ว', 'In Progress': 'กำลังดำเนินการ',
    'Pending Customer': 'รอข้อมูลจากลูกค้า', 'Pending Vendor': 'รอ Vendor',
    'Escalated': 'ยกระดับปัญหา', 'Resolved': 'แก้ไขแล้ว', 'Closed': 'ปิด Case'
  },
  en: {
    'Open': 'Open', 'Assigned': 'Assigned', 'In Progress': 'In Progress',
    'Pending Customer': 'Pending Customer', 'Pending Vendor': 'Pending Vendor',
    'Escalated': 'Escalated', 'Resolved': 'Resolved', 'Closed': 'Closed'
  },
}

// ─── Bilingual UI text for the Customer Portal (TH/EN) ─────────────────────
const PT = {
  th: {
    tagline: 'ติดตามสถานะ Case และแจ้งปัญหา',
    emailLabel: 'อีเมลบริษัท',
    passwordLabel: 'รหัสผ่าน',
    loginBtn: 'เข้าสู่ระบบ',
    securityNote: (phone: string) => <>ระบบนี้สำหรับลูกค้า NEFT Solution เท่านั้น หากยังไม่มี account กรุณาติดต่อ <span className="font-medium text-[#1B3875]">{phone}</span> เพื่อขอรับ credentials</>,
    staffPrompt: 'Engineer/Staff?',
    staffLogin: 'Staff Login →',
    footer: '© 2026 NEFT Solution Co., Ltd. · 24/7: 02-096-2377 กด 4',
    loginErr: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาติดต่อ NEFT เพื่อขอรับ credentials',
    backToList: 'กลับรายการ Case',
    copy: 'คัดลอก',
    copied: '✓ คัดลอกแล้ว',
    logout: 'ออก',
    logoutFull: 'ออกจากระบบ',
    severity: 'ระดับความรุนแรง',
    channel: 'ช่องทางแจ้งเหตุ',
    assignee: 'ผู้รับผิดชอบ',
    responseDue: 'Response Due',
    resolutionDue: 'Resolution Due',
    issueDetail: 'รายละเอียดปัญหา',
    escalatedTitle: 'ยกระดับปัญหาไปยังผู้เชี่ยวชาญ',
    escalatedTo: 'ส่งต่อไปยัง:',
    escalatedReason: 'เหตุผล:',
    resolutionTitle: 'ผลการแก้ไขปัญหา',
    rootCause: 'Root Cause:',
    resolutionMethod: 'วิธีแก้ไข:',
    history: (n: number) => `ประวัติการดำเนินการ (${n} รายการ)`,
    noHistory: 'ยังไม่มีบันทึก',
    welcome: (name: string) => `ยินดีต้อนรับ, ${name}`,
    statTotal: 'Case ทั้งหมด',
    statOpen: 'กำลังดำเนินการ',
    statResolved: 'แก้ไขแล้ว',
    searchPlaceholder: 'ค้นหา Case Number หรือหัวข้อ...',
    filterAll: 'ทั้งหมด',
    filterOpen: 'กำลังดำเนินการ',
    filterResolved: 'แก้ไขแล้ว',
    newTicket: 'แจ้งปัญหาใหม่',
    newTicketTitle: 'แจ้งปัญหา / เปิด Case ใหม่',
    newTicketSub: 'ระบบจะออก Case Number ให้อัตโนมัติ · Engineer ติดต่อกลับตาม SLA',
    channelLabel: 'ช่องทางการแจ้ง',
    subjectLabel: 'หัวข้อปัญหา *',
    subjectPlaceholder: 'อธิบายปัญหาโดยย่อ',
    severitySelect: {
      Critical: '🔴 Critical — ระบบหยุดทำงาน',
      High: '🟠 High — กระทบการทำงาน',
      Medium: '🟡 Medium — ทำงานได้บ้าง',
      Low: '🔵 Low — ปัญหาเล็กน้อย',
    },
    contactPhone: 'เบอร์โทรศัพท์ติดต่อ',
    descLabel: 'รายละเอียดปัญหา',
    descPlaceholder: 'อธิบายอาการปัญหา ขั้นตอนที่เกิดขึ้น อุปกรณ์ที่เกี่ยวข้อง สิ่งที่ลองแก้ไขแล้ว...',
    slaInfo: (sev: string) => {
      const map: Record<string, string> = {
        Critical: 'Response ภายใน 4 ชั่วโมง · Resolution ภายใน 12 ชั่วโมง',
        High: 'Response ภายใน 8 ชั่วโมง · Resolution ภายใน 24 ชั่วโมง',
        Medium: 'Response ภายใน 24 ชั่วโมง · Resolution ภายใน 72 ชั่วโมง',
        Low: 'Response ภายใน 48 ชั่วโมง · Resolution ภายใน 5 วันทำการ',
      }
      return map[sev] || map.Low
    },
    slaLabel: 'SLA ของคุณ:',
    urgentCall: 'กรณีเร่งด่วนโทร',
    cancel: 'ยกเลิก',
    submitTicket: 'ส่งคำร้อง + รับ Case Number',
    caseListTitle: (n: number) => `Case ทั้งหมด (${n})`,
    noCaseSearch: 'ไม่พบ Case ที่ค้นหา',
    noCaseEmpty: 'ยังไม่มี Case — กดปุ่ม "แจ้งปัญหาใหม่" เพื่อเปิด Case',
    escalatedBadge: 'ยกระดับแล้ว',
    logEntries: 'บันทึก',
    helpFooter: 'ต้องการความช่วยเหลือด่วน? โทร',
    available247: '(24/7)',
    workLogOpenedNote: (no: string, name: string, company: string) => `รับแจ้งปัญหาผ่าน Customer Portal โดย ${name} (${company}) — ออก Case ${no}`,
    successOpened: 'เปิด Case สำเร็จ!',
    successDetail: (no: string) => <>Case Number: <span className="font-mono font-bold">{no}</span> — Engineer จะติดต่อกลับภายใน SLA</>,
    locale: 'th-TH',
  },
  en: {
    tagline: 'Track your case status and report issues',
    emailLabel: 'Company Email',
    passwordLabel: 'Password',
    loginBtn: 'Sign In',
    securityNote: (phone: string) => <>This portal is for NEFT Solution customers only. If you don&apos;t have an account, please contact <span className="font-medium text-[#1B3875]">{phone}</span> to request credentials</>,
    staffPrompt: 'Engineer/Staff?',
    staffLogin: 'Staff Login →',
    footer: '© 2026 NEFT Solution Co., Ltd. · 24/7: 02-096-2377 ext. 4',
    loginErr: 'Invalid email or password. Please contact NEFT to request credentials.',
    backToList: 'Back to case list',
    copy: 'Copy',
    copied: '✓ Copied',
    logout: 'Log out',
    logoutFull: 'Log out',
    severity: 'Severity',
    channel: 'Reported via',
    assignee: 'Assigned to',
    responseDue: 'Response Due',
    resolutionDue: 'Resolution Due',
    issueDetail: 'Issue Description',
    escalatedTitle: 'Escalated to specialist team',
    escalatedTo: 'Escalated to:',
    escalatedReason: 'Reason:',
    resolutionTitle: 'Resolution',
    rootCause: 'Root Cause:',
    resolutionMethod: 'Resolution:',
    history: (n: number) => `Activity History (${n} entries)`,
    noHistory: 'No activity yet',
    welcome: (name: string) => `Welcome, ${name}`,
    statTotal: 'Total Cases',
    statOpen: 'In Progress',
    statResolved: 'Resolved',
    searchPlaceholder: 'Search by case number or subject...',
    filterAll: 'All',
    filterOpen: 'In Progress',
    filterResolved: 'Resolved',
    newTicket: 'Report New Issue',
    newTicketTitle: 'Report an Issue / Open New Case',
    newTicketSub: 'A case number will be issued automatically · Engineer will respond per SLA',
    channelLabel: 'Reporting Channel',
    subjectLabel: 'Issue Subject *',
    subjectPlaceholder: 'Briefly describe the issue',
    severitySelect: {
      Critical: '🔴 Critical — System down',
      High: '🟠 High — Impacts operations',
      Medium: '🟡 Medium — Partially working',
      Low: '🔵 Low — Minor issue',
    },
    contactPhone: 'Contact Phone Number',
    descLabel: 'Issue Description',
    descPlaceholder: 'Describe the symptoms, steps to reproduce, affected equipment, and any troubleshooting already tried...',
    slaInfo: (sev: string) => {
      const map: Record<string, string> = {
        Critical: 'Response within 4 hours · Resolution within 12 hours',
        High: 'Response within 8 hours · Resolution within 24 hours',
        Medium: 'Response within 24 hours · Resolution within 72 hours',
        Low: 'Response within 48 hours · Resolution within 5 business days',
      }
      return map[sev] || map.Low
    },
    slaLabel: 'Your SLA:',
    urgentCall: 'For urgent issues, call',
    cancel: 'Cancel',
    submitTicket: 'Submit & Get Case Number',
    caseListTitle: (n: number) => `All Cases (${n})`,
    noCaseSearch: 'No matching cases found',
    noCaseEmpty: 'No cases yet — click "Report New Issue" to open a case',
    escalatedBadge: 'Escalated',
    logEntries: 'entries',
    helpFooter: 'Need urgent help? Call',
    available247: '(24/7)',
    workLogOpenedNote: (no: string, name: string, company: string) => `Issue reported via Customer Portal by ${name} (${company}) — Case ${no} created`,
    successOpened: 'Case created successfully!',
    successDetail: (no: string) => <>Case Number: <span className="font-mono font-bold">{no}</span> — An engineer will contact you within SLA</>,
    locale: 'en-US',
  },
} as const

type CustomerSession = {
  email: string
  customerId: number
  companyName: string
  contactName: string
}

export default function CustomerPortalPage() {
  // `tickets` comes straight from the Zustand store, which fetches from the
  // real `tickets` / `ticket_work_logs` tables and stays live via a Supabase
  // realtime subscription — the exact same source of truth the backoffice
  // uses, so customer portal and backoffice always show identical tickets.
  const { tickets: liveTickets, addTicket, customerPortalAccounts, initialize, initialized, subscribeRealtime, realtimeSubscribed, theme, setTheme } = useAppStore()
  const isRed = theme === 'red'

  // Apply red-theme CSS class on mount + whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('red-theme', isRed)
  }, [isRed])

  // The customer portal has its own session (CustomerSession, kept in
  // sessionStorage) that's completely independent of the backoffice
  // `currentUser`/auth flow. The store's `initialize()` — which fetches
  // tickets, customers, etc. from Supabase — is normally only triggered by
  // the backoffice `(main)` layout when `currentUser` is set. Landing here
  // directly (e.g. a hard refresh on /customer-portal) never goes through
  // that layout, so `tickets` stayed at its initial placeholder value and
  // every customer_id filter matched nothing — Case list showed 0 even
  // though real tickets existed. `initialize()` is idempotent (guarded by
  // the `initialized` flag in the store), so calling it here is safe even
  // if a backoffice session in the same browser already ran it.
  // `subscribeRealtime()` opens the Supabase WebSocket so that any update
  // made from the backoffice (work logs, status changes, etc.) is pushed to
  // this portal immediately without requiring a manual refresh. It is also
  // idempotent (guarded by `realtimeSubscribed`).
  useEffect(() => {
    if (!initialized) initialize()
    if (!realtimeSubscribed) subscribeRealtime()
  }, [initialized, initialize, realtimeSubscribed, subscribeRealtime])
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
  const [portalLang, setPortalLang] = useState<PortalLang>('th')

  const [form, setForm] = useState({
    subject: '', description: '', severity: 'Medium',
    channel: 'Web', contactName: '', contactPhone: '', contactEmail: '',
  })

  const tp = PT[portalLang]
  const channelLabels = CHANNEL_LABELS[portalLang]
  const statusLabels = STATUS_LABELS[portalLang]

  const toggleLang = () => {
    const next: PortalLang = portalLang === 'th' ? 'en' : 'th'
    setPortalLang(next)
    try { localStorage.setItem('neft_portal_lang', next) } catch {}
  }

  // Restore preferred language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('neft_portal_lang')
      if (saved === 'th' || saved === 'en') setPortalLang(saved)
    } catch {}
  }, [])

  // Restore session from sessionStorage on mount.
  // Guard against stale/old-shape session blobs (e.g. cached before the
  // migration to real Supabase tables, where customerId could be a string
  // or a different ID entirely) — validate it still has a numeric
  // customerId, otherwise drop it so the user logs in fresh against the
  // current `customer_portal_accounts` data.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('neft_customer_session')
      if (saved) {
        const parsed = JSON.parse(saved)
        const cid = Number(parsed?.customerId)
        if (parsed && Number.isFinite(cid) && cid > 0) {
          setSession({ ...parsed, customerId: cid })
        } else {
          sessionStorage.removeItem('neft_customer_session')
        }
      }
    } catch {
      try { sessionStorage.removeItem('neft_customer_session') } catch {}
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginErr('')

    const emailNorm = email.trim().toLowerCase()
    let cred: CustomerPortalAccount | undefined

    // Source of truth: the real `customer_portal_accounts` table — same
    // table the backoffice Users > Customer Portal page reads/writes via
    // the Zustand store, so both surfaces always see identical accounts
    // (no more app_data blob, no more localStorage fallback that could
    // serve stale/local-only credentials).
    if (hasSupabase && supabase) {
      try {
        const { data } = await supabase
          .from('customer_portal_accounts')
          .select('*')
          .eq('email', emailNorm)
          .eq('password', password)
          .eq('active', true)
          .maybeSingle()
        if (data) {
          cred = {
            id: data.id, name: data.name, company: data.company, email: data.email,
            password: data.password, customerId: data.customer_id, active: data.active,
            createdAt: data.created_at_label, lastLogin: data.last_login,
            phones: data.phones ?? [], emails: data.emails ?? [], lineIds: data.line_ids ?? [],
            lineNotifyTokens: data.line_notify_tokens ?? [],
            notifyViaEmail: data.notify_via_email ?? false, notifyViaLine: data.notify_via_line ?? false,
          }
        }
      } catch {
        // fall through — cred stays undefined, shows login error below
      }
    } else {
      // Supabase not configured (local/offline dev) — fall back to the
      // store's in-memory list (populated from the same table on init).
      cred = customerPortalAccounts.find(c =>
        c.email === emailNorm && c.password === password && c.active
      )
    }

    if (!cred) {
      setLoginErr(PT[portalLang].loginErr)
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
    ? liveTickets
        .filter(t => String(t.customerId) === String(session.customerId))
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

  const allMyTickets = session ? liveTickets.filter(t => String(t.customerId) === String(session.customerId)) : []
  const openCount = allMyTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length
  const resolvedCount = allMyTickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length

  const nextTicketNo = () => {
    const year = new Date().getFullYear()
    const maxNo = liveTickets.reduce((max, tk) => {
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
    const newTicket = {
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
    }
    addTicket(newTicket)
    // `addTicket` updates the shared Zustand `tickets` state directly, so the
    // new ticket appears immediately here too (liveTickets === store.tickets).
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

  const selectedTk = selectedTicket !== null ? liveTickets.find(t => t.id === selectedTicket) : null

  // Small TH/EN switcher — used on login page and in the portal header
  const LangSwitch = ({ light = false }: { light?: boolean }) => (
    <button
      type="button"
      onClick={toggleLang}
      title="Switch language / สลับภาษา"
      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
        light
          ? 'border-white/30 text-white/80 hover:text-white hover:bg-white/10'
          : 'border-gray-200 text-gray-500 hover:text-[#1B3875] hover:border-[#1B3875]/30 hover:bg-[#1B3875]/5'
      }`}
    >
      <GlobeAltIcon className="w-3.5 h-3.5" />
      <span className={portalLang === 'th' ? 'opacity-100' : 'opacity-40'}>TH</span>
      <span className="opacity-30">/</span>
      <span className={portalLang === 'en' ? 'opacity-100' : 'opacity-40'}>EN</span>
    </button>
  )

  // สีที่ใช้ใน gradient ตาม theme
  const g = isRed
    ? { c1: '#6B1A1A', c2: '#8B2222', c3: '#A33030', orb: '#8B2222' }
    : { c1: '#0F2654', c2: '#1B3875', c3: '#2557A7', orb: '#1B3875' }

  // ─── LOGIN PAGE ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: g.c1 }}>
        {/* Animated gradient background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `linear-gradient(135deg, ${g.c1}, ${g.c2}, ${g.c3}, ${g.c2}, ${g.c1})`,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 12s ease infinite',
          transition: 'background 0.8s ease',
        }} />
        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* blob 1: top-left, orange accent */}
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(232,75,15,0.08)', animation: 'float1 8s ease-in-out infinite' }} />
          {/* blob 2: bottom-right, theme color */}
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${g.orb}33`, transition: 'background-color 0.8s ease', animation: 'float2 10s ease-in-out infinite' }} />
          {/* blob 3: center, theme color large — inline transform ป้องกัน keyframe override */}
          <div className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
            style={{ top: '50%', left: '50%', backgroundColor: `${g.orb}4D`, transition: 'background-color 0.8s ease', animation: 'float3 7s ease-in-out infinite' }} />
        </div>
        {/* CSS keyframes */}
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -40px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
          }
          @keyframes float2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            40% { transform: translate(-40px, 30px) scale(1.08); }
            70% { transform: translate(25px, -20px) scale(0.92); }
          }
          @keyframes float3 {
            0%, 100% { transform: translate(-50%, -50%); }
            50% { transform: translate(calc(-50% + 20px), calc(-50% - 30px)); }
          }
        `}</style>

        {/* Theme toggle — มุมบนขวา */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setTheme(isRed ? 'blue' : 'red')}
            title={isRed ? 'Switch to Blue theme' : 'Switch to Red theme'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium backdrop-blur-sm"
          >
            <span className="w-3 h-3 rounded-sm inline-block border border-white/30"
              style={{ backgroundColor: isRed ? '#1B3875' : '#8B2222' }} />
            {isRed ? 'Blue' : 'Red'}
          </button>
        </div>

        <div className="relative w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            {/* Logo header — white bg to match logo naturally */}
            <div className="bg-white px-8 pt-8 pb-5 text-center border-b border-gray-100">
              <div className="flex justify-center mb-4">
                <Image
                  src="/neft-logo.png"
                  alt="NEFT Solution"
                  width={190} height={78}
                  className="h-14 w-auto object-contain"
                  priority
                />
              </div>
              <div className="w-12 h-0.5 bg-[#E84B0F] mx-auto mb-3 rounded-full" />
              <p className="text-[#0F2654] font-semibold text-sm">Customer Support Portal</p>
              <p className="text-gray-500 text-xs mt-1">{tp.tagline}</p>
              <div className="flex justify-center mt-3">
                <LangSwitch />
              </div>
            </div>

            <div className="px-8 py-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.emailLabel}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    autoComplete="email"
                    placeholder="your@company.co.th"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/20 focus:border-[#E84B0F] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.passwordLabel}</label>
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
                  {tp.loginBtn}
                </button>
              </form>

              {/* Security note — no credential hints */}
              <div className="mt-5 flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  {tp.securityNote('02-096-2377')}
                </p>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                {tp.staffPrompt}{' '}
                <a href="/" className="text-[#1B3875] hover:text-[#0F2654] font-medium hover:underline">{tp.staffLogin}</a>
              </p>
            </div>
          </div>
          <p className="text-center text-white/50 text-xs mt-4">
            {tp.footer}
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
            <Image src="/neft-logo.png" alt="NEFT" width={130} height={54} className="h-10 w-auto object-contain" />
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500 font-medium">Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitch />
            <span className="text-xs text-gray-500 hidden sm:block">{session.companyName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <ArrowRightOnRectangleIcon className="w-4 h-4" />{tp.logout}
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => setSelectedTicket(null)}
            className="flex items-center gap-1 text-xs mb-4 group transition-colors"
            style={{ color: 'var(--brand-blue)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-navy)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--brand-blue)')}>
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> {tp.backToList}
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Case header strip */}
            <div className="px-6 py-5" style={{ backgroundColor: 'var(--brand-navy)', transition: 'background-color 0.3s ease' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded">{selectedTk.no}</span>
                    <button onClick={() => copyNo(selectedTk.no)}
                      className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      {copied === selectedTk.no ? tp.copied : tp.copy}
                    </button>
                  </div>
                  <h2 className="text-white font-semibold leading-snug">{selectedTk.subject}</h2>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusStyle(selectedTk.status)}`}>
                  {statusLabels[selectedTk.status] || selectedTk.status}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  [tp.severity, <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${sevStyle(selectedTk.severity)}`}>{selectedTk.severity}</span>],
                  ['SLA Status', <span className={selectedTk.slaStatus === 'Breached' ? 'font-semibold text-red-600' : selectedTk.slaStatus === 'At Risk' ? 'font-semibold text-orange-600' : 'font-semibold text-green-600'}>{selectedTk.slaStatus}</span>],
                  [tp.channel, channelLabels[selectedTk.channel || 'Web'] || selectedTk.channel],
                  [tp.assignee, selectedTk.assignedTo],
                  [tp.responseDue, selectedTk.responseDue || '-'],
                  [tp.resolutionDue, selectedTk.resolutionDue || '-'],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-400 mb-0.5">{k}</div>
                    <div className="font-medium text-gray-700">{v}</div>
                  </div>
                ))}
              </div>

              {selectedTk.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">{tp.issueDetail}</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">{selectedTk.description}</div>
                </div>
              )}

              {(selectedTk.escalationLevel || 0) > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-orange-800 mb-1.5">
                    <ArrowUpCircleIcon className="w-4 h-4" />
                    {tp.escalatedTitle}
                  </div>
                  <div className="text-orange-700">{tp.escalatedTo} <span className="font-medium">{selectedTk.escalatedTo}</span></div>
                  {selectedTk.escalationReason && <div className="text-orange-600 mt-1">{tp.escalatedReason} {selectedTk.escalationReason}</div>}
                </div>
              )}

              {(selectedTk.rootCause || selectedTk.resolution) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                    <CheckCircleIcon className="w-4 h-4" />{tp.resolutionTitle}
                  </div>
                  {selectedTk.rootCause && <div className="text-green-700 mb-1"><span className="font-medium">{tp.rootCause}</span> {selectedTk.rootCause}</div>}
                  {selectedTk.resolution && <div className="text-green-700"><span className="font-medium">{tp.resolutionMethod}</span> {selectedTk.resolution}</div>}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-[#1B3875]" />
                  <p className="text-xs font-semibold text-gray-600">{tp.history((selectedTk.workLogs || []).length)}</p>
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
                          <span className="text-xs text-gray-400">{new Date(log.time).toLocaleString(tp.locale)}</span>
                          <span className="text-xs text-gray-400">— {log.user}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{log.note}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTk.workLogs || selectedTk.workLogs.length === 0) && (
                    <p className="text-xs text-gray-400 py-2">{tp.noHistory}</p>
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
          <Image src="/neft-logo.png" alt="NEFT" width={130} height={54} className="h-10 w-auto object-contain" />
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:block">Customer Support Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <LangSwitch />
          {/* Blue/Red Theme Toggle */}
          <button
            onClick={() => setTheme(isRed ? 'blue' : 'red')}
            title={isRed ? 'Switch to Blue theme' : 'Switch to Red theme'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            style={{ color: isRed ? '#8B1A1A' : '#1B3875' }}
          >
            <span className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: isRed ? '#1B3875' : '#8B2222' }} />
            <span className="hidden sm:inline font-medium">{isRed ? 'Blue' : 'Red'}</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <UserCircleIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{session.companyName}</span>
          </div>
          <a href="tel:020962377" className="hidden md:flex items-center gap-1 text-xs text-[#E84B0F] hover:text-[#c93d08] font-medium">
            <PhoneIcon className="w-3.5 h-3.5" />02-096-2377 {portalLang === 'th' ? 'กด 4' : 'ext. 4'}
          </a>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200">
            <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tp.logoutFull}</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Success flash */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">{tp.successOpened}</p>
              <p className="text-xs text-green-700 mt-0.5">{tp.successDetail(submitted)}</p>
            </div>
          </div>
        )}

        {/* Welcome banner */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ backgroundColor: 'var(--brand-navy)', transition: 'background-color 0.3s ease' }}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#E84B0F]/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative">
            <h1 className="font-bold text-base mb-0.5">{tp.welcome(session.contactName)}</h1>
            <p className="text-white/60 text-xs mb-4">{session.companyName}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{allMyTickets.length}</div>
                <div className="text-xs text-blue-200 mt-0.5">{tp.statTotal}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-orange-300">{openCount}</div>
                <div className="text-xs text-blue-200 mt-0.5">{tp.statOpen}</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-green-300">{resolvedCount}</div>
                <div className="text-xs text-blue-200 mt-0.5">{tp.statResolved}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tp.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white shadow-sm focus:ring-2 focus:ring-[#1B3875]/10" />
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {([['all',tp.filterAll],['open',tp.filterOpen],['resolved',tp.filterResolved]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterStatus === k ? 'bg-[#1B3875] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewTicket(!showNewTicket)}
            className="flex items-center gap-2 bg-[#E84B0F] hover:bg-[#c93d08] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors flex-shrink-0">
            <PlusIcon className="w-4 h-4" />{tp.newTicket}
          </button>
        </div>

        {/* New ticket form */}
        {showNewTicket && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#E84B0F]/8 to-orange-50 px-5 py-4 border-b border-orange-100">
              <h2 className="font-semibold text-sm text-[#0F2654]">{tp.newTicketTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{tp.newTicketSub}</p>
            </div>
            <form onSubmit={handleSubmitTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">{tp.channelLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Phone', 'Web', 'Email'] as const).map(ch => (
                    <button key={ch} type="button" onClick={() => setForm({ ...form, channel: ch })}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.channel === ch ? 'bg-[#0F2654] text-white border-[#0F2654] shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2654]/30'}`}>
                      {ch === 'Phone' ? <PhoneIcon className="w-3.5 h-3.5" /> : ch === 'Email' ? <EnvelopeIcon className="w-3.5 h-3.5" /> : <GlobeAltIcon className="w-3.5 h-3.5" />}
                      {channelLabels[ch]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.subjectLabel}</label>
                  <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder={tp.subjectPlaceholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E84B0F]/20 focus:border-[#E84B0F]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.severity}</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                    <option value="Critical">{tp.severitySelect.Critical}</option>
                    <option value="High">{tp.severitySelect.High}</option>
                    <option value="Medium">{tp.severitySelect.Medium}</option>
                    <option value="Low">{tp.severitySelect.Low}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.contactPhone}</label>
                  <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="0X-XXXX-XXXX"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{tp.descLabel}</label>
                  <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={tp.descPlaceholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-xs text-blue-700">
                <span className="font-semibold">{tp.slaLabel}</span>{' '}
                {tp.slaInfo(form.severity)}
                {' · '}{tp.urgentCall} <a href="tel:020962377" className="font-bold underline">02-096-2377 {portalLang === 'th' ? 'กด 4' : 'ext. 4'}</a>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">{tp.cancel}</button>
                <button type="submit"
                  className="px-5 py-2.5 bg-[#E84B0F] hover:bg-[#c93d08] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                  {tp.submitTicket}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-gray-600">{tp.caseListTitle(myTickets.length)}</h2>
          </div>
          {myTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
              <p className="text-gray-400 text-sm">{search ? tp.noCaseSearch : tp.noCaseEmpty}</p>
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
                          {copied === tk.no ? '✓' : tp.copy}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sevStyle(tk.severity)}`}>{tk.severity}</span>
                        {(tk.escalationLevel || 0) > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <ArrowUpCircleIcon className="w-3 h-3" />{tp.escalatedBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{tk.subject}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span><ClockIcon className="w-3 h-3 inline mr-0.5" />{new Date(tk.createdAt).toLocaleDateString(tp.locale)}</span>
                        <span>{tp.assignee}: <span className="text-gray-600">{tk.assignedTo}</span></span>
                        <span>{(tk.workLogs || []).length} {tp.logEntries}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyle(tk.status)}`}>
                        {statusLabels[tk.status] || tk.status}
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
                    <span>{tp.responseDue}: <span className="text-gray-600 font-medium">{tk.responseDue}</span></span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          <p>{tp.helpFooter} <a href="tel:020962377" className="text-[#E84B0F] font-semibold hover:underline">02-096-2377 {portalLang === 'th' ? 'กด 4' : 'ext. 4'}</a> {tp.available247}</p>
          <p className="mt-1">{tp.footer.replace('· 24/7: 02-096-2377 กด 4', '')} · <a href="/" className="hover:underline text-gray-400">{tp.staffLogin.replace(' →','')}</a></p>
        </div>
      </div>
    </div>
  )
}
