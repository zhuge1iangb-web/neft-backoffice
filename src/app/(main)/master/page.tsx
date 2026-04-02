'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { exportToExcel } from '@/lib/export'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, BuildingOffice2Icon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

export default function MasterPage() {
  const { lang, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'customers'|'sla'>('customers')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name:'',industry:'',phone:'',email:'',taxId:'',address:'' })

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry.toLowerCase().includes(search.toLowerCase())
  )

  const SLA_RULES = [
    { type: 'MA 24/7',     severity: 'Critical', response: '1 ชั่วโมง',  resolution: '4 ชั่วโมง' },
    { type: 'MA 24/7',     severity: 'High',     response: '2 ชั่วโมง',  resolution: '8 ชั่วโมง' },
    { type: 'MA 24/7',     severity: 'Medium',   response: '4 ชั่วโมง',  resolution: '24 ชั่วโมง' },
    { type: 'MA 24/7',     severity: 'Low',      response: '8 ชั่วโมง',  resolution: '72 ชั่วโมง' },
    { type: 'MA Business', severity: 'Critical', response: '2 ชั่วโมง',  resolution: '8 ชั่วโมง' },
    { type: 'MA Business', severity: 'High',     response: '4 ชั่วโมง',  resolution: '24 ชั่วโมง' },
    { type: 'MA Business', severity: 'Medium',   response: '8 ชั่วโมง',  resolution: '48 ชั่วโมง' },
    { type: 'MA Business', severity: 'Low',      response: '1 วัน',       resolution: '5 วัน' },
    { type: 'MA Basic',    severity: 'Critical', response: '4 ชั่วโมง',  resolution: '24 ชั่วโมง' },
    { type: 'MA Basic',    severity: 'High',     response: '8 ชั่วโมง',  resolution: '48 ชั่วโมง' },
    { type: 'MA Basic',    severity: 'Medium',   response: '2 วัน',       resolution: '5 วัน' },
    { type: 'MA Basic',    severity: 'Low',      response: 'Best Effort', resolution: 'Best Effort' },
  ]

  const INDUSTRIES = ['Manufacturing','Banking','Conglomerate','Food','Energy/IT','Telecom','Retail','Healthcare','Government','Other']

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['customers','sla'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'customers' ? `ลูกค้า (${customers.length})` : 'SLA Rules'}
          </button>
        ))}
      </div>

      {activeTab === 'customers' && (
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
                  onClick={() => exportToExcel(filtered, ['ชื่อ','อุตสาหกรรม','โทรศัพท์','อีเมล','เลขที่ผู้เสียภาษี'], ['name','industry','phone','email','taxId'], 'customers')}>
                  Excel
                </Button>
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>{t.master.addCustomer}</Button>
              </div>
            </div>
          </div>

          {/* Customer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF3FF] flex items-center justify-center text-[#1B3875] font-bold text-sm flex-shrink-0">
                    <BuildingOffice2Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm leading-tight">{c.name}</div>
                    <Badge variant="info" className="mt-1">{c.industry}</Badge>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />{c.phone}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />{c.email}
                  </div>
                  <div className="text-gray-400 text-xs">TaxID: {c.taxId}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'sla' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#0F2654]">SLA Rules Matrix</h3>
            <p className="text-xs text-gray-400 mt-0.5">กำหนด Response time และ Resolution time ตามประเภทสัญญาและระดับความรุนแรง</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] border-b border-gray-100">
                <tr>
                  {['ประเภทสัญญา','Severity','Response Time','Resolution Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLA_RULES.map((r, i) => {
                  const sevMap: Record<string, 'danger'|'orange'|'warning'|'info'> = { Critical:'danger', High:'orange', Medium:'warning', Low:'info' }
                  return (
                    <tr key={i} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-gray-50/30'}`}>
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{r.type}</td>
                      <td className="px-4 py-2.5"><Badge variant={sevMap[r.severity]}>{r.severity}</Badge></td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{r.response}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{r.resolution}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.master.addCustomer} size="md">
        <div className="space-y-3">
          {[
            { label: 'ชื่อบริษัท*', key:'name', type:'text' },
            { label: 'อุตสาหกรรม', key:'industry', type:'industry-select' },
            { label: 'โทรศัพท์', key:'phone', type:'text' },
            { label: 'อีเมล', key:'email', type:'email' },
            { label: 'เลขที่ผู้เสียภาษี', key:'taxId', type:'text' },
            { label: 'ที่อยู่', key:'address', type:'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              {f.type === 'industry-select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- เลือก --</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              ) : (
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
          <Button disabled={!form.name}>{t.common.save}</Button>
        </div>
      </Modal>
    </div>
  )
}
