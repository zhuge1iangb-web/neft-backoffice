'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import Modal from '@/components/ui/Modal'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const VENDOR_TYPES = ['Vendor', 'Supplier', 'Distributor']

export default function MasterPage() {
  const {
    lang, customers, vendors, projectTypes, paymentTerms, deliveryPeriods,
    addCustomer, updateCustomer, deleteCustomer,
    addVendor, updateVendor, deleteVendor,
    addProjectType, addPaymentTerm, addDeliveryPeriod,
    cmSlaOptions, addCmSla, updateCmSla, deleteCmSla,
    projectNameOptions, addProjectNameOption, updateProjectNameOption, deleteProjectNameOption,
  } = useAppStore()
  const t = translations[lang]

  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'types' | 'terms' | 'periods' | 'sla' | 'projnames'>('customers')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form states
  const [customerForm, setCustomerForm] = useState({ name: '', industry: '', phone: '', email: '', taxId: '', address: '' })
  const [vendorForm, setVendorForm] = useState({ code: '', name: '', type: 'Vendor', contact: '', phone: '', email: '', taxId: '' })
  const [typeForm, setTypeForm] = useState('')
  const [termForm, setTermForm] = useState('')
  const [periodForm, setPeriodForm] = useState('')

  // CM SLA form
  const [slaForm, setSlaForm] = useState({ name: '', responseTimeHours: '', resolutionTimeHours: '', description: '' })
  const [showSlaModal, setShowSlaModal] = useState(false)
  const [editingSlaId, setEditingSlaId] = useState<number | null>(null)

  // Project Name Options form
  const [projNameForm, setProjNameForm] = useState({ name: '', isActive: true })
  const [showProjNameModal, setShowProjNameModal] = useState(false)
  const [editingProjNameId, setEditingProjNameId] = useState<number | null>(null)

  // ─── CUSTOMERS TAB ─────────────────────────────────────────────────────────

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddCustomer = () => {
    if (!customerForm.name.trim()) return
    const newCust: any = {
      id: Date.now(),
      name: customerForm.name.trim(),
      industry: customerForm.industry || 'Other',
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      taxId: customerForm.taxId.trim(),
      address: customerForm.address.trim(),
    }
    if (editingId) {
      updateCustomer(editingId, newCust)
      setEditingId(null)
    } else {
      addCustomer(newCust)
    }
    setCustomerForm({ name: '', industry: '', phone: '', email: '', taxId: '', address: '' })
    setShowModal(false)
  }

  const handleEditCustomer = (cust: any) => {
    setCustomerForm(cust)
    setEditingId(cust.id)
    setShowModal(true)
    setShowDetail(null)
  }

  const handleDeleteCustomer = (id: number) => {
    if (confirm(t.master.deleteConfirm)) {
      deleteCustomer(id)
      setShowDetail(null)
    }
  }

  // ─── VENDORS TAB ───────────────────────────────────────────────────────────

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddVendor = () => {
    if (!vendorForm.name.trim()) return
    const newVendor: any = {
      id: Date.now(),
      code: vendorForm.code || `VND-${String(vendors.length + 1).padStart(3, '0')}`,
      name: vendorForm.name.trim(),
      type: vendorForm.type,
      contact: vendorForm.contact.trim(),
      phone: vendorForm.phone.trim(),
      email: vendorForm.email.trim(),
      taxId: vendorForm.taxId.trim(),
    }
    if (editingId) {
      updateVendor(editingId, newVendor)
      setEditingId(null)
    } else {
      addVendor(newVendor)
    }
    setVendorForm({ code: '', name: '', type: 'Vendor', contact: '', phone: '', email: '', taxId: '' })
    setShowModal(false)
  }

  const handleEditVendor = (vnd: any) => {
    setVendorForm(vnd)
    setEditingId(vnd.id)
    setShowModal(true)
    setShowDetail(null)
  }

  const handleDeleteVendor = (id: number) => {
    if (confirm(t.master.deleteConfirm)) {
      deleteVendor(id)
      setShowDetail(null)
    }
  }

  // ─── MASTER DATA ───────────────────────────────────────────────────────────

  const handleAddType = () => {
    if (typeForm.trim() && !projectTypes.includes(typeForm.trim())) {
      addProjectType(typeForm.trim())
      setTypeForm('')
    }
  }

  const handleAddTerm = () => {
    if (termForm.trim() && !paymentTerms.includes(termForm.trim())) {
      addPaymentTerm(termForm.trim())
      setTermForm('')
    }
  }

  const handleAddPeriod = () => {
    if (periodForm.trim() && !deliveryPeriods.includes(periodForm.trim())) {
      addDeliveryPeriod(periodForm.trim())
      setPeriodForm('')
    }
  }

  // ─── CM SLA CRUD ───────────────────────────────────────────────────────────

  const handleSaveSla = () => {
    if (!slaForm.name.trim() || !slaForm.responseTimeHours || !slaForm.resolutionTimeHours) return
    const data = {
      name: slaForm.name.trim(),
      responseTimeHours: Number(slaForm.responseTimeHours),
      resolutionTimeHours: Number(slaForm.resolutionTimeHours),
      description: slaForm.description.trim(),
    }
    if (editingSlaId !== null) {
      updateCmSla(editingSlaId, data)
      setEditingSlaId(null)
    } else {
      addCmSla(data)
    }
    setSlaForm({ name: '', responseTimeHours: '', resolutionTimeHours: '', description: '' })
    setShowSlaModal(false)
  }

  const handleEditSla = (sla: any) => {
    setSlaForm({
      name: sla.name,
      responseTimeHours: String(sla.responseTimeHours),
      resolutionTimeHours: String(sla.resolutionTimeHours),
      description: sla.description || '',
    })
    setEditingSlaId(sla.id)
    setShowSlaModal(true)
  }

  const handleDeleteSla = (id: number) => {
    if (confirm('ยืนยันลบ SLA นี้?')) deleteCmSla(id)
  }

  // ─── PROJECT NAME OPTIONS CRUD ────────────────────────────────────────────

  const filteredProjNames = (projectNameOptions || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveProjName = () => {
    if (!projNameForm.name.trim()) return
    if (editingProjNameId !== null) {
      updateProjectNameOption(editingProjNameId, { name: projNameForm.name.trim(), isActive: projNameForm.isActive })
      setEditingProjNameId(null)
    } else {
      addProjectNameOption(projNameForm.name.trim())
    }
    setProjNameForm({ name: '', isActive: true })
    setShowProjNameModal(false)
  }

  const handleEditProjName = (p: any) => {
    setProjNameForm({ name: p.name, isActive: p.isActive })
    setEditingProjNameId(p.id)
    setShowProjNameModal(true)
  }

  const handleDeleteProjName = (id: number) => {
    if (confirm('ยืนยันลบชื่อโครงการนี้?')) deleteProjectNameOption(id)
  }

  const tabClasses = (active: boolean) => `px-4 py-2 font-medium border-b-2 transition-colors text-sm ${
    active ? 'border-[#1B3875] text-[#1B3875]' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {(['customers', 'vendors', 'types', 'terms', 'periods', 'sla', 'projnames'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearch(''); setShowDetail(null) }}
              className={tabClasses(activeTab === tab)}
            >
              {{
                customers: t.master.customers,
                vendors: t.master.vendors,
                types: t.master.projectTypes,
                terms: t.master.paymentTerms,
                periods: t.master.deliveryPeriods,
                sla: 'CM SLA',
                projnames: 'ชื่อโครงการ',
              }[tab]}
            </button>
          ))}
        </div>

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={`${t.common.search}...`}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <button onClick={() => { setCustomerForm({ name: '', industry: '', phone: '', email: '', taxId: '', address: '' }); setEditingId(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" /> {t.master.addCustomer}
              </button>
            </div>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t.common.noData}</div>
              ) : (
                filteredCustomers.map(cust => (
                  <div key={cust.id} onClick={() => setShowDetail(cust.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#1B3875] hover:bg-blue-50 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{cust.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{cust.industry} • {cust.phone} • {cust.email}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEditCustomer(cust)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCustomer(cust.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={`${t.common.search}...`}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <button onClick={() => { setVendorForm({ code: '', name: '', type: 'Vendor', contact: '', phone: '', email: '', taxId: '' }); setEditingId(null); setShowModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" /> {t.master.addVendor}
              </button>
            </div>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t.common.noData}</div>
              ) : (
                filteredVendors.map(vnd => (
                  <div key={vnd.id} onClick={() => setShowDetail(vnd.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#1B3875] hover:bg-blue-50 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900">{vnd.name}</div>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium">{vnd.code}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{vnd.type}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{vnd.contact} • {vnd.phone} • {vnd.email}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEditVendor(vnd)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteVendor(vnd.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PROJECT TYPES */}
        {activeTab === 'types' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input value={typeForm} onChange={e => setTypeForm(e.target.value)} placeholder="เพิ่มประเภท..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                onKeyPress={e => e.key === 'Enter' && handleAddType()}
              />
              <button onClick={handleAddType} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">{t.common.add}</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {projectTypes.map((type, idx) => (
                <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">{type}</div>
              ))}
            </div>
          </div>
        )}

        {/* PAYMENT TERMS */}
        {activeTab === 'terms' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input value={termForm} onChange={e => setTermForm(e.target.value)} placeholder="เพิ่มเงื่อนไขชำระ..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                onKeyPress={e => e.key === 'Enter' && handleAddTerm()}
              />
              <button onClick={handleAddTerm} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">{t.common.add}</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {paymentTerms.map((term, idx) => (
                <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">{term}</div>
              ))}
            </div>
          </div>
        )}

        {/* DELIVERY PERIODS */}
        {activeTab === 'periods' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input value={periodForm} onChange={e => setPeriodForm(e.target.value)} placeholder="เพิ่มระยะส่งมอบ..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                onKeyPress={e => e.key === 'Enter' && handleAddPeriod()}
              />
              <button onClick={handleAddPeriod} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">{t.common.add}</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {deliveryPeriods.map((period, idx) => (
                <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-gray-700">{period}</div>
              ))}
            </div>
          </div>
        )}

        {/* CM SLA TAB */}
        {activeTab === 'sla' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">กำหนด SLA สำหรับสัญญา CM แต่ละ tier — ระบุเวลาตอบสนองและแก้ไข</p>
              <button
                onClick={() => { setSlaForm({ name: '', responseTimeHours: '', resolutionTimeHours: '', description: '' }); setEditingSlaId(null); setShowSlaModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4" /> เพิ่ม SLA
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">ชื่อ SLA</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-700">ตอบสนอง</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-gray-700">แก้ไข</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-gray-700">คำอธิบาย</th>
                    <th className="py-2.5 px-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {cmSlaOptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">ยังไม่มีข้อมูล SLA</td>
                    </tr>
                  ) : (
                    cmSlaOptions.map((sla, idx) => (
                      <tr key={sla.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="py-3 px-3 font-medium text-gray-800">{sla.name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{sla.responseTimeHours}h</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold">{sla.resolutionTimeHours}h</span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{sla.description}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => handleEditSla(sla)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteSla(sla.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROJECT NAME OPTIONS TAB */}
        {activeTab === 'projnames' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อโครงการ..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <button
                onClick={() => { setProjNameForm({ name: '', isActive: true }); setEditingProjNameId(null); setShowProjNameModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" /> เพิ่มชื่อโครงการ
              </button>
            </div>
            <p className="text-xs text-gray-400">ชื่อโครงการที่สร้างไว้จะให้เลือกตอนสร้างโครงการใหม่ เพื่อใช้ sort/ทำรายงานในอนาคต</p>
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {filteredProjNames.length === 0 ? (
                <div className="text-center py-8 text-gray-400">ยังไม่มีชื่อโครงการ</div>
              ) : (
                filteredProjNames.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-gray-800">{p.name}</span>
                      {!p.isActive && <span className="text-xs text-gray-400">(ปิดใช้งาน)</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditProjName(p)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteProjName(p.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {activeTab === 'customers' && showDetail !== null && (
        <Modal open={true} onClose={() => setShowDetail(null)} title={customers.find(c => c.id === showDetail)?.name || ''}>
          {customers.find(c => c.id === showDetail) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-500">ชื่อ</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.name}</div></div>
                <div><div className="text-xs text-gray-500">อุตสาหกรรม</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.industry}</div></div>
                <div><div className="text-xs text-gray-500">โทรศัพท์</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.phone}</div></div>
                <div><div className="text-xs text-gray-500">อีเมล</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.email}</div></div>
                <div className="col-span-2"><div className="text-xs text-gray-500">เลขที่ผู้เสียภาษี</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.taxId}</div></div>
                <div className="col-span-2"><div className="text-xs text-gray-500">ที่อยู่</div><div className="font-medium">{customers.find(c => c.id === showDetail)?.address}</div></div>
              </div>
              <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
                <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">ปิด</button>
                <button onClick={() => handleEditCustomer(customers.find(c => c.id === showDetail)!)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">แก้ไข</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* VENDOR DETAIL MODAL */}
      {activeTab === 'vendors' && showDetail !== null && (
        <Modal open={true} onClose={() => setShowDetail(null)} title={vendors.find(v => v.id === showDetail)?.name || ''}>
          {vendors.find(v => v.id === showDetail) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-500">รหัส</div><div className="font-medium">{vendors.find(v => v.id === showDetail)?.code}</div></div>
                <div><div className="text-xs text-gray-500">ประเภท</div><span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{vendors.find(v => v.id === showDetail)?.type}</span></div>
                <div><div className="text-xs text-gray-500">ชื่อติดต่อ</div><div className="font-medium">{vendors.find(v => v.id === showDetail)?.contact}</div></div>
                <div><div className="text-xs text-gray-500">โทรศัพท์</div><div className="font-medium">{vendors.find(v => v.id === showDetail)?.phone}</div></div>
                <div><div className="text-xs text-gray-500">อีเมล</div><div className="font-medium">{vendors.find(v => v.id === showDetail)?.email}</div></div>
                <div><div className="text-xs text-gray-500">เลขที่ผู้เสียภาษี</div><div className="font-medium">{vendors.find(v => v.id === showDetail)?.taxId}</div></div>
              </div>
              <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
                <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">ปิด</button>
                <button onClick={() => handleEditVendor(vendors.find(v => v.id === showDetail)!)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">แก้ไข</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* CUSTOMER FORM MODAL */}
      {activeTab === 'customers' && showModal && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ</label>
              <input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">อุตสาหกรรม</label>
              <input value={customerForm.industry} onChange={e => setCustomerForm({ ...customerForm, industry: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">โทรศัพท์</label>
                <input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
                <input value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">เลขที่ผู้เสียภาษี</label>
              <input value={customerForm.taxId} onChange={e => setCustomerForm({ ...customerForm, taxId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">ที่อยู่</label>
              <textarea value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              <button onClick={handleAddCustomer} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* VENDOR FORM MODAL */}
      {activeTab === 'vendors' && showModal && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? 'แก้ไข Vendor' : 'เพิ่ม Vendor'}>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ</label>
              <input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">รหัส</label>
                <input value={vendorForm.code} onChange={e => setVendorForm({ ...vendorForm, code: e.target.value })} placeholder="ถ้าว่างจะสร้างอัตโนมัติ" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">ประเภท</label>
                <select value={vendorForm.type} onChange={e => setVendorForm({ ...vendorForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                  {VENDOR_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}</select></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อติดต่อ</label>
              <input value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">โทรศัพท์</label>
                <input value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
                <input value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1">เลขที่ผู้เสียภาษี</label>
              <input value={vendorForm.taxId} onChange={e => setVendorForm({ ...vendorForm, taxId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" /></div>
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              <button onClick={handleAddVendor} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* CM SLA FORM MODAL */}
      {showSlaModal && (
        <Modal open={showSlaModal} onClose={() => { setShowSlaModal(false); setEditingSlaId(null) }} title={editingSlaId !== null ? 'แก้ไข CM SLA' : 'เพิ่ม CM SLA'}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ SLA <span className="text-red-500">*</span></label>
              <input value={slaForm.name} onChange={e => setSlaForm({ ...slaForm, name: e.target.value })}
                placeholder="เช่น Gold 8x5, Platinum 24x7"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">เวลาตอบสนอง (ชม.) <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={slaForm.responseTimeHours} onChange={e => setSlaForm({ ...slaForm, responseTimeHours: e.target.value })}
                  placeholder="1, 2, 4..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">เวลาแก้ไข (ชม.) <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={slaForm.resolutionTimeHours} onChange={e => setSlaForm({ ...slaForm, resolutionTimeHours: e.target.value })}
                  placeholder="4, 8, 24..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">คำอธิบาย</label>
              <input value={slaForm.description} onChange={e => setSlaForm({ ...slaForm, description: e.target.value })}
                placeholder="เช่น วันทำการ, 24/7 ตลอดเวลา"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
            </div>
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowSlaModal(false); setEditingSlaId(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              <button onClick={handleSaveSla} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* PROJECT NAME FORM MODAL */}
      {showProjNameModal && (
        <Modal open={showProjNameModal} onClose={() => { setShowProjNameModal(false); setEditingProjNameId(null) }} title={editingProjNameId !== null ? 'แก้ไขชื่อโครงการ' : 'เพิ่มชื่อโครงการ'}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อโครงการ <span className="text-red-500">*</span></label>
              <input value={projNameForm.name} onChange={e => setProjNameForm({ ...projNameForm, name: e.target.value })}
                placeholder="เช่น ระบบ ERP, โครงการ Network Infrastructure"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                onKeyPress={e => e.key === 'Enter' && handleSaveProjName()} />
            </div>
            {editingProjNameId !== null && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={projNameForm.isActive}
                  onChange={e => setProjNameForm({ ...projNameForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#1B3875] focus:ring-[#1B3875]/20" />
                <label htmlFor="isActive" className="text-sm text-gray-700">เปิดใช้งาน</label>
              </div>
            )}
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowProjNameModal(false); setEditingProjNameId(null) }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              <button onClick={handleSaveProjName} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]">{t.common.save}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
