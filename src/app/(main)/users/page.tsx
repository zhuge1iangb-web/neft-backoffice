'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { exportToExcel, exportToPdf } from '@/lib/export'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, UserCircleIcon } from '@heroicons/react/24/outline'

const ROLES = ['Admin','CEO/Director','Sales Manager','Sales','Project Manager','Engineer','Finance','Service Support']
const DEPARTMENTS = ['Management','Sales','Engineering','Finance','Service','IT','HR']

const PERMISSION_MATRIX = [
  { fn: 'View Executive Dashboard', ceo: true,  sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: true  },
  { fn: 'View All Opportunities',   ceo: true,  sales: false, sm: true,  pm: false, eng: false, fin: false, svc: false, admin: true  },
  { fn: 'Create/Edit Opportunity',  ceo: false, sales: true,  sm: true,  pm: false, eng: false, fin: false, svc: false, admin: true  },
  { fn: 'View All Projects',        ceo: true,  sales: false, sm: false, pm: true,  eng: false, fin: false, svc: false, admin: true  },
  { fn: 'Update Project Progress',  ceo: false, sales: false, sm: false, pm: true,  eng: true,  fin: false, svc: false, admin: true  },
  { fn: 'View Finance Data',        ceo: true,  sales: false, sm: false, pm: false, eng: false, fin: true,  svc: false, admin: true  },
  { fn: 'Update Billing/Collection',ceo: false, sales: false, sm: false, pm: false, eng: false, fin: true,  svc: false, admin: true  },
  { fn: 'Manage Tickets',           ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: true,  admin: true  },
  { fn: 'Manage Users/Master Data', ceo: false, sales: false, sm: false, pm: false, eng: false, fin: false, svc: false, admin: true  },
]

export default function UsersPage() {
  const { lang, users } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'users'|'roles'>('users')
  const [showModal, setShowModal] = useState(false)

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  )

  const excelHeaders = ['ชื่อ', 'Username', 'บทบาท', 'แผนก', 'อีเมล', 'สถานะ', 'เข้าใช้งานล่าสุด']
  const excelKeys = ['name','username','role','department','email','active','lastLogin']

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: users.length, color: 'text-[#1B3875]' },
          { label: 'ใช้งานอยู่', value: users.filter(u => u.active).length, color: 'text-green-600' },
          { label: 'บทบาทที่ใช้', value: [...new Set(users.map(u => u.role))].length, color: 'text-purple-600' },
          { label: 'แผนก', value: [...new Set(users.map(u => u.department))].length, color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['users','roles'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'users' ? 'รายชื่อผู้ใช้' : 'ตาราง Permission'}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.common.search}...`}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filtered.map(u=>({...u, active: u.active?'Active':'Inactive'})), excelHeaders, excelKeys, 'users')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('User Management', excelHeaders, filtered.map(u=>({...u, active: u.active?'Active':'Inactive'})), excelKeys, 'users')}>PDF</Button>
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>{t.users.addUser}</Button>
              </div>
            </div>
          </div>

          {/* User Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1B3875] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{u.name}</div>
                    <div className="text-xs text-gray-400">@{u.username}</div>
                  </div>
                  <Badge variant={u.active ? 'success' : 'default'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{t.users.role}</span>
                    <Badge variant="info">{u.role}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{t.users.department}</span>
                    <span className="text-gray-600 font-medium">{u.department}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{t.users.lastLogin}</span>
                    <span className="text-gray-500">{u.lastLogin}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0F2654] text-white">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold">ฟีเจอร์ / Function</th>
                  {['CEO','Sales','SM','PM','Eng','Finance','Service','Admin'].map(r => (
                    <th key={r} className="text-center px-3 py-3 text-xs font-semibold">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{row.fn}</td>
                    {[row.ceo, row.sales, row.sm, row.pm, row.eng, row.fin, row.svc, row.admin].map((val, j) => (
                      <td key={j} className="text-center px-3 py-2.5">
                        {val
                          ? <span className="text-green-600 text-base">✓</span>
                          : <span className="text-gray-200 text-base">✕</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal (simplified) */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.users.addUser} size="md">
        <p className="text-sm text-gray-500 text-center py-6">
          ฟีเจอร์นี้จะเชื่อมต่อกับระบบ Authentication ในรุ่น Production<br/>
          <span className="text-xs text-gray-400 mt-1 block">สำหรับ Demo: บัญชีผู้ใช้จัดการผ่าน admin panel</span>
        </p>
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t.common.close}</Button>
        </div>
      </Modal>
    </div>
  )
}
