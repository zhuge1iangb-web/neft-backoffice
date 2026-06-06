'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/export'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  UserCircleIcon, BuildingOffice2Icon, ClipboardDocumentIcon, EyeIcon, EyeSlashIcon,
  TrashIcon, CheckCircleIcon, PencilIcon, KeyIcon, XMarkIcon
} from '@heroicons/react/24/outline'

const STAFF_ROLES = ['Admin','CEO/Director','Sales Manager','Sales','Project Manager','Engineer','Finance','Service Support']
const DEPARTMENTS = ['Management','Sales','Engineering','Finance','Service','IT','HR']

const PERMISSION_MATRIX = [
  { fn: 'View Executive Dashboard', ceo: true,  sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: true,  cust: false },
  { fn: 'View All Opportunities',   ceo: true,  sales: false, sm: true,  pm: false, eng: false, fin: false, svc: false, admin: true,  cust: false },
  { fn: 'Create/Edit Opportunity',  ceo: false, sales: true,  sm: true,  pm: false, eng: false, fin: false, svc: false, admin: true,  cust: false },
  { fn: 'View All Projects',        ceo: true,  sales: false, sm: false, pm: true,  eng: false, fin: false, svc: false, admin: true,  cust: false },
  { fn: 'Update Project Progress',  ceo: false, sales: false, sm: false, pm: true,  eng: true,  fin: false, svc: false, admin: true,  cust: false },
  { fn: 'View Finance Data',        ceo: true,  sales: false, sm: false, pm: false, eng: false, fin: true,  svc: false, admin: true,  cust: false },
  { fn: 'Manage Tickets (Staff)',   ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: true,  admin: true,  cust: false },
  { fn: 'Open Ticket (Customer)',   ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: false, cust: true  },
  { fn: 'View Own Tickets',         ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: false, cust: true  },
  { fn: 'Manage Users/Master Data', ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: true,  cust: false },
]

type CustomerAccount = {
  id: number; name: string; company: string; email: string; password: string
  customerId: number; active: boolean; createdAt: string; lastLogin: string | null
}

function generatePassword(length = 10) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

type StaffFormData = {
  name: string; username: string; email: string; password: string
  role: string; department: string; active: boolean
}

const defaultStaffForm: StaffFormData = {
  name: '', username: '', email: '', password: '', role: 'Service Support', department: 'Service', active: true
}

export default function UsersPage() {
  const { lang, users, customers, currentUser, customerPortalAccounts, addCustomerPortalAccount, updateCustomerPortalAccount, deleteCustomerPortalAccount } = useAppStore()
  const t = translations[lang]
  const isAdmin = currentUser?.role === 'Admin'

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'staff' | 'customers' | 'roles'>('staff')

  // Staff management state
  const [staffList, setStaffList] = useState(users)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<(typeof users[number]) | null>(null)
  const [staffForm, setStaffForm] = useState<StaffFormData>(defaultStaffForm)
  const [showStaffPw, setShowStaffPw] = useState(false)
  const [deleteStaffConfirm, setDeleteStaffConfirm] = useState<number | null>(null)
  const [showResetPw, setShowResetPw] = useState<number | null>(null)
  const [newResetPw, setNewResetPw] = useState('')
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null)

  // Customer portal state — backed by store for cross-page persistence
  const customerAccounts = customerPortalAccounts
  const [showCustModal, setShowCustModal] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showPassId, setShowPassId] = useState<number | null>(null)
  const [newCustCreated, setNewCustCreated] = useState<CustomerAccount | null>(null)
  const [custForm, setCustForm] = useState({ name: '', email: '', customerId: '', password: '' })

  const filteredStaff = staffList.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )
  const filteredCustomers = customerAccounts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  )

  const copyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  const flashSuccess = (msg: string) => {
    setStaffSuccess(msg); setTimeout(() => setStaffSuccess(null), 3500)
  }

  // ── STAFF CRUD ──
  const openAddStaff = () => {
    setEditingStaff(null)
    setStaffForm({ ...defaultStaffForm, password: generatePassword() })
    setShowStaffPw(false)
    setShowStaffModal(true)
  }

  const openEditStaff = (u: typeof users[number]) => {
    setEditingStaff(u)
    setStaffForm({ name: u.name, username: u.username, email: u.email, password: u.password, role: u.role, department: u.department, active: u.active })
    setShowStaffPw(false)
    setShowStaffModal(true)
  }

  const handleSaveStaff = () => {
    if (editingStaff) {
      setStaffList(prev => prev.map(u => u.id === editingStaff.id ? { ...u, ...staffForm } : u))
      flashSuccess(`อัพเดทข้อมูล "${staffForm.name}" เรียบร้อย`)
    } else {
      const newUser = {
        id: Date.now(), ...staffForm,
        lastLogin: null as any,
      }
      setStaffList(prev => [...prev, newUser as any])
      flashSuccess(`สร้าง account "${staffForm.name}" สำเร็จ`)
    }
    setShowStaffModal(false)
  }

  const handleDeleteStaff = (id: number) => {
    setStaffList(prev => prev.filter(u => u.id !== id))
    setDeleteStaffConfirm(null)
    flashSuccess('ลบ account เรียบร้อย')
  }

  const handleResetPassword = (id: number) => {
    setStaffList(prev => prev.map(u => u.id === id ? { ...u, password: newResetPw } : u))
    flashSuccess('รีเซ็ตรหัสผ่านเรียบร้อย — แจ้ง password ใหม่ให้พนักงานด้วย')
    setShowResetPw(null); setNewResetPw('')
  }

  const toggleStaffActive = (id: number) => {
    setStaffList(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }

  // ── CUSTOMER PORTAL CRUD ──
  const handleCreateCustomer = () => {
    const cust = customers.find(c => c.id === +custForm.customerId)
    const pw = custForm.password || generatePassword()
    const newAcc: CustomerAccount = {
      id: Date.now(), name: custForm.name, company: cust?.name || '',
      email: custForm.email, password: pw, customerId: +custForm.customerId,
      active: true, createdAt: new Date().toISOString().split('T')[0], lastLogin: null,
    }
    addCustomerPortalAccount(newAcc)
    setNewCustCreated(newAcc)
    setShowCustModal(false)
    setCustForm({ name: '', email: '', customerId: '', password: '' })
  }

  const toggleActive = (id: number) => {
    const acc = customerPortalAccounts.find(c => c.id === id)
    if (acc) updateCustomerPortalAccount(id, { active: !acc.active })
  }
  const deleteCustomerAcc = (id: number) => {
    deleteCustomerPortalAccount(id)
  }

  return (
    <div className="space-y-4">
      {/* Success banner */}
      {staffSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 font-medium">{staffSuccess}</span>
          <button onClick={() => setStaffSuccess(null)} className="ml-auto text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      {/* New customer credentials banner */}
      {newCustCreated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 mb-2">สร้าง Customer Account สำเร็จ — แจ้ง credentials ให้ลูกค้าได้เลย</p>
              <div className="bg-white border border-green-200 rounded-lg p-3 text-xs space-y-1 font-mono">
                <div>Portal URL: <span className="font-bold text-[#1B3875]">https://neft-backofficev2.vercel.app/customer-portal</span></div>
                <div>Email: <span className="font-bold">{newCustCreated.email}</span></div>
                <div>Password: <span className="font-bold text-[#E84B0F]">{newCustCreated.password}</span></div>
              </div>
              <button onClick={() => copyText(`Portal: https://neft-backofficev2.vercel.app/customer-portal\nEmail: ${newCustCreated.email}\nPassword: ${newCustCreated.password}`, newCustCreated.id)}
                className="mt-2 text-xs flex items-center gap-1 text-green-700 hover:text-green-900">
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                {copiedId === newCustCreated.id ? 'คัดลอกแล้ว!' : 'คัดลอก credentials ทั้งหมด'}
              </button>
            </div>
            <button onClick={() => setNewCustCreated(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Staff ทั้งหมด', value: staffList.length, color: 'text-[#1B3875]' },
          { label: 'Staff Active', value: staffList.filter(u => u.active).length, color: 'text-green-600' },
          { label: 'Customer Accounts', value: customerAccounts.length, color: 'text-orange-600' },
          { label: 'แผนก', value: Array.from(new Set(staffList.map(u => u.department))).length, color: 'text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'staff', label: `Staff (${staffList.length})` },
          { key: 'customers', label: `Customer Portal (${customerAccounts.length})` },
          { key: 'roles', label: 'Permission Matrix' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {activeTab === 'staff' && (
        <>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, username, บทบาท..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filteredStaff.map(u => ({ ...u, active: u.active ? 'Active' : 'Inactive' })),
                    ['ชื่อ','Username','บทบาท','แผนก','อีเมล','สถานะ'], ['name','username','role','department','email','active'], 'staff_users')}>
                  Excel
                </Button>
                {isAdmin && <Button icon={<PlusIcon className="w-4 h-4" />} onClick={openAddStaff}>เพิ่ม Staff</Button>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStaff.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F2654] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{u.name}</div>
                    <div className="text-xs text-gray-400">@{u.username}</div>
                  </div>
                  <button onClick={() => toggleStaffActive(u.id)} title="Toggle Active/Inactive">
                    <Badge variant={u.active ? 'success' : 'default'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">บทบาท</span><Badge variant="info">{u.role}</Badge></div>
                  <div className="flex justify-between"><span className="text-gray-400">แผนก</span><span className="text-gray-600 font-medium">{u.department}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">อีเมล</span><span className="text-gray-500 truncate max-w-[180px]">{u.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">เข้าใช้ล่าสุด</span><span className="text-gray-500">{u.lastLogin || '—'}</span></div>
                </div>
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
                    <button onClick={() => openEditStaff(u as any)}
                      className="flex items-center gap-1 text-xs text-[#1B3875] hover:text-[#0F2654] px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                      <PencilIcon className="w-3.5 h-3.5" />แก้ไข
                    </button>
                    <button onClick={() => { setShowResetPw(u.id); setNewResetPw(generatePassword()) }}
                      className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                      <KeyIcon className="w-3.5 h-3.5" />รีเซ็ต Password
                    </button>
                    {deleteStaffConfirm === u.id ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-red-500">ยืนยัน?</span>
                        <button onClick={() => handleDeleteStaff(u.id)} className="text-xs text-red-600 font-medium hover:text-red-800 px-1">ลบ</button>
                        <button onClick={() => setDeleteStaffConfirm(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">ยกเลิก</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteStaffConfirm(u.id)}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-300 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Reset password inline panel */}
                {showResetPw === u.id && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                    <div className="text-xs font-semibold text-orange-700">รีเซ็ต Password สำหรับ {u.name}</div>
                    <div className="flex gap-2">
                      <input value={newResetPw} onChange={e => setNewResetPw(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-orange-200 rounded text-xs font-mono focus:outline-none bg-white" />
                      <button onClick={() => setNewResetPw(generatePassword())}
                        className="text-xs text-orange-600 hover:text-orange-800 px-2 py-1 border border-orange-200 rounded bg-white">สุ่ม</button>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setShowResetPw(null); setNewResetPw('') }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">ยกเลิก</button>
                      <button onClick={() => handleResetPassword(u.id)} disabled={!newResetPw}
                        className="text-xs text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded disabled:opacity-50">บันทึก Password ใหม่</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CUSTOMER PORTAL TAB ── */}
      {activeTab === 'customers' && (
        <>
          <div className="bg-[#0F2654]/5 border border-[#1B3875]/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <BuildingOffice2Icon className="w-5 h-5 text-[#1B3875] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#1B3875]/80">
              <span className="font-semibold text-[#1B3875]">Customer Portal Account</span> — ลูกค้าใช้ login ที่{' '}
              <span className="font-mono bg-white px-1 py-0.5 rounded text-xs">neft-backofficev2.vercel.app/customer-portal</span>{' '}
              เพื่อเปิด Case, ติดตามสถานะ, ดู Work Log ของตัวเอง
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาลูกค้า..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowCustModal(true)}>สร้าง Customer Account</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] border-b border-gray-100">
                <tr>
                  {['บริษัท / ลูกค้า','ชื่อผู้ใช้','Email (Login)','Password','สถานะ','สร้างเมื่อ','Login ล่าสุด',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
                          {c.company.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{c.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-gray-700">{c.email}</span>
                        <button onClick={() => copyText(c.email, c.id * 10)} className="text-gray-400 hover:text-[#1B3875]">
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-gray-500">{showPassId === c.id ? c.password : '••••••••'}</span>
                        <button onClick={() => setShowPassId(showPassId === c.id ? null : c.id)} className="text-gray-400 hover:text-gray-600">
                          {showPassId === c.id ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => copyText(c.password, c.id * 100)} className="text-gray-400 hover:text-[#1B3875]">
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                        {copiedId === c.id * 100 && <span className="text-xs text-green-600">✓</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(c.id)}>
                        <Badge variant={c.active ? 'success' : 'default'}>{c.active ? 'Active' : 'Inactive'}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.createdAt}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{c.lastLogin || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyText(`Portal: https://neft-backofficev2.vercel.app/customer-portal\nEmail: ${c.email}\nPassword: ${c.password}`, c.id)}
                          className="text-xs flex items-center gap-1 text-[#1B3875] hover:text-[#0F2654] px-2 py-1 rounded hover:bg-blue-50">
                          <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                          {copiedId === c.id ? 'คัดลอกแล้ว!' : 'Copy'}
                        </button>
                        <button onClick={() => deleteCustomerAcc(c.id)} className="text-gray-300 hover:text-red-500 p-1 rounded">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ROLES TAB ── */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0F2654] text-white">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold">ฟีเจอร์ / Function</th>
                  {['CEO','Sales','SM','PM','Eng','Finance','Service','Admin','Customer'].map(r => (
                    <th key={r} className="text-center px-3 py-3 text-xs font-semibold">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{row.fn}</td>
                    {[row.ceo,row.sales,row.sm,row.pm,row.eng,row.fin,row.svc,row.admin,row.cust].map((val, j) => (
                      <td key={j} className="text-center px-3 py-2.5">
                        {val ? <span className="text-green-600 text-base">✓</span> : <span className="text-gray-200 text-base">✕</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add/Edit Staff Modal ── */}
      <Modal open={showStaffModal} onClose={() => setShowStaffModal(false)}
        title={editingStaff ? `แก้ไขข้อมูล — ${editingStaff.name}` : 'เพิ่ม Staff Account ใหม่'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อ-นามสกุล *</label>
              <input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Username *</label>
              <input value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                placeholder="somchai" disabled={!!editingStaff}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">อีเมล *</label>
              <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="somchai@neftsolution.co.th"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">บทบาท *</label>
              <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">แผนก *</label>
              <select value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {!editingStaff && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password เริ่มต้น *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={showStaffPw ? 'text' : 'password'} value={staffForm.password}
                      onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                      className="w-full px-3 py-2 pr-9 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
                    <button type="button" onClick={() => setShowStaffPw(!showStaffPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showStaffPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={() => setStaffForm({ ...staffForm, password: generatePassword() })}
                    className="text-xs text-[#1B3875] hover:text-[#0F2654] px-3 py-2 border border-gray-200 rounded-lg hover:bg-blue-50 whitespace-nowrap">สุ่มรหัส</button>
                </div>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">สถานะ</label>
              <button onClick={() => setStaffForm({ ...staffForm, active: !staffForm.active })}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${staffForm.active ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${staffForm.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-gray-500">{staffForm.active ? 'Active — สามารถ login ได้' : 'Inactive — ไม่สามารถ login ได้'}</span>
            </div>
          </div>
          {!editingStaff && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              แจ้ง username และ password นี้ให้พนักงาน — ควรเปลี่ยนรหัสผ่านหลัง login ครั้งแรก
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowStaffModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSaveStaff}
            disabled={!staffForm.name || !staffForm.username || !staffForm.email || (!editingStaff && !staffForm.password)}>
            {editingStaff ? 'บันทึกการแก้ไข' : 'สร้าง Account'}
          </Button>
        </div>
      </Modal>

      {/* ── Create Customer Account Modal ── */}
      <Modal open={showCustModal} onClose={() => setShowCustModal(false)} title="สร้าง Customer Portal Account" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg px-3 py-2.5 text-xs text-blue-700">
            ลูกค้าจะ login ที่ <span className="font-mono font-semibold">/customer-portal</span> ด้วย email + password ที่กำหนดไว้ และจะเห็นเฉพาะ ticket ของบริษัทตัวเอง
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">บริษัทลูกค้า *</label>
            <select value={custForm.customerId} onChange={e => setCustForm({ ...custForm, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              <option value="">-- เลือกบริษัท --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อผู้ติดต่อ / ตำแหน่ง *</label>
            <input value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })}
              placeholder="เช่น IT Manager, System Admin"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email (ใช้ Login) *</label>
            <input type="email" value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })}
              placeholder="contact@company.co.th"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password (เว้นว่างให้สร้างอัตโนมัติ)</label>
            <input value={custForm.password} onChange={e => setCustForm({ ...custForm, password: e.target.value })}
              placeholder="ระบบจะสร้างรหัสผ่านให้อัตโนมัติ"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
            หลังสร้างแล้วจะแสดง credentials ให้คัดลอกส่งให้ลูกค้าทันที
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowCustModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleCreateCustomer} disabled={!custForm.customerId || !custForm.name || !custForm.email}>
            สร้าง Account + ดู Credentials
          </Button>
        </div>
      </Modal>
    </div>
  )
}
