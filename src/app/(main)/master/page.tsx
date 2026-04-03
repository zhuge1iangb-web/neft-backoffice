'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency } from '@/lib/export'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const VENDOR_TYPES = ['Vendor', 'Supplier', 'Distributor']

export default function MasterPage() {
  const {
    lang, customers, vendors, projectTypes, paymentTerms, deliveryPeriods,
    addCustomer, updateCustomer, deleteCustomer,
    addVendor, updateVendor, deleteVendor,
    addProjectType, addPaymentTerm, addDeliveryPeriod
  } = useAppStore()
  const t = translations[lang]

  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'types' | 'terms' | 'periods' | 'sla'>('customers')
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

  const slaRules = [
    { type: 'MA 24/7', severity: 'Critical', response: '1 ชั่วโมง', resolution: '4 ชั่วโมง' },
    { type: 'MA 24/7', severity: 'High', response: '2 ชั่วโมง', resolution: '8 ชั่วโมง' },
    { type: 'MA 24/7', severity: 'Medium', response: '4 ชั่วโมง', resolution: '24 ชั่วโมง' },
    { type: 'MA Business', severity: 'Critical', response: '2 ชั่วโมง', resolution: '8 ชั่วโมง' },
    { type: 'MA Business', severity: 'High', response: '4 ชั่วโมง', resolution: '24 ชั่วโมง' },
    { type: 'MA Basic', severity: 'Critical', response: '4 ชั่วโมง', resolution: '24 ชั่วโมง' },
  ]

  const tabClasses = (active: boolean) => `px-4 py-2 font-medium border-b-2 transition-colors ${
    active ? 'border-[#1B3875] text-[#1B3875]' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {(['customers', 'vendors', 'types', 'terms', 'periods', 'sla'] as const).map(tab => (
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
                sla: 'SLA Rules'
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
                        <div className="text-xs text-gray-500 mt-1">
                          {cust.industry} • {cust.phone} • {cust.email}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEditCustomer(cust)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCustomer(cust.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                          <TrashIcon className="w-4 h-4" />
                        </button>
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
                        <div className="text-xs text-gray-500 mt-1">
                          {vnd.contact} • {vnd.phone} • {vnd.email}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEditVendor(vnd)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteVendor(vnd.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded">
                          <TrashIcon className="w-4 h-4" />
                        </button>
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
              <button onClick={handleAddType} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">
                {t.common.add}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {projectTypes.map((type, idx) => (
                <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
                  {type}
                </div>
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
              <button onClick={handleAddTerm} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">
                {t.common.add}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {paymentTerms.map((term, idx) => (
                <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
                  {term}
                </div>
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
              <button onClick={handleAddPeriod} className="px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] text-sm font-medium">
                {t.common.add}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {deliveryPeriods.map((period, idx) => (
                <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-gray-700">
                  {period}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA RULES */}
        {activeTab === 'sla' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">ประเภท</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">ระดับความรุนแรง</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">ตอบสนอง</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">แก้ไข</th>
                </tr>
              </thead>
              <tbody>
                {slaRules.map((rule, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-700">{rule.type}</td>
                    <td className="py-3 px-3 text-gray-700">{rule.severity}</td>
                    <td className="py-3 px-3 text-gray-700">{rule.response}</td>
                    <td className="py-3 px-3 text-gray-700">{rule.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {activeTab === 'customers' && showDetail !== null && (
        <Modal open={true} onClose={() => setShowDetail(null)}
          title={customers.find(c => c.id === showDetail)?.name || ''}>
          {customers.find(c => c.id === showDetail) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">ชื่อ</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">อุตสาหกรรม</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.industry}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">โทรศัพท์</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">อีเมล</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.email}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">เลขที่ผู้เสียภาษี</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.taxId}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">ที่อยู่</div>
                  <div className="font-medium">{customers.find(c => c.id === showDetail)?.address}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
                <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                  ปิด
                </button>
                <button onClick={() => handleEditCustomer(customers.find(c => c.id === showDetail)!)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  แก้ไข
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* VENDOR DETAIL MODAL */}
      {activeTab === 'vendors' && showDetail !== null && (
        <Modal open={true} onClose={() => setShowDetail(null)}
          title={vendors.find(v => v.id === showDetail)?.name || ''}>
          {vendors.find(v => v.id === showDetail) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">รหัส</div>
                  <div className="font-medium">{vendors.find(v => v.id === showDetail)?.code}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">ประเภท</div>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {vendors.find(v => v.id === showDetail)?.type}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">ชื่อติดต่อ</div>
                  <div className="font-medium">{vendors.find(v => v.id === showDetail)?.contact}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">โทรศัพท์</div>
                  <div className="font-medium">{vendors.find(v => v.id === showDetail)?.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">อีเมล</div>
                  <div className="font-medium">{vendors.find(v => v.id === showDetail)?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">เลขที่ผู้เสียภาษี</div>
                  <div className="font-medium">{vendors.find(v => v.id === showDetail)?.taxId}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
                <button onClick={() => setShowDetail(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                  ปิด
                </button>
                <button onClick={() => handleEditVendor(vendors.find(v => v.id === showDetail)!)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  แก้ไข
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* CUSTOMER FORM MODAL */}
      {activeTab === 'customers' && showModal && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }}
          title={editingId ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ</label>
              <input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">อุตสาหกรรม</label>
              <input value={customerForm.industry} onChange={e => setCustomerForm({ ...customerForm, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">โทรศัพท์</label>
                <input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
                <input value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">เลขที่ผู้เสียภาษี</label>
              <input value={customerForm.taxId} onChange={e => setCustomerForm({ ...customerForm, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ที่อยู่</label>
              <textarea value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowModal(false); setEditingId(null) }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button onClick={handleAddCustomer}
                className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VENDOR FORM MODAL */}
      {activeTab === 'vendors' && showModal && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }}
          title={editingId ? 'แก้ไข Vendor' : 'เพิ่ม Vendor'}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ</label>
              <input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">รหัส</label>
                <input value={vendorForm.code} onChange={e => setVendorForm({ ...vendorForm, code: e.target.value })}
                  placeholder="ถ้าว่างจะสร้างอัตโนมัติ"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ประเภท</label>
                <select value={vendorForm.type} onChange={e => setVendorForm({ ...vendorForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                >
                  {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อติดต่อ</label>
              <input value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">โทรศัพท์</label>
                <input value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
                <input value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">เลขที่ผู้เสียภาษี</label>
              <input value={vendorForm.taxId} onChange={e => setVendorForm({ ...vendorForm, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setShowModal(false); setEditingId(null) }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button onClick={handleAddVendor}
                className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
