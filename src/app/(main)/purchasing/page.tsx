'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel } from '@/lib/export'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import KPICard from '@/components/ui/KPICard'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const PO_STATUSES = ['Draft', 'Sent', 'Received', 'Cancelled']

export default function PurchasingPage() {
  const { lang, purchaseOrders, vendors, projects, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    no: '', vendorId: '', vendorName: '', projectId: '', projectName: '', total: 0,
    status: 'Draft', expectedDelivery: '', notes: '', items: [] as any[]
  })

  const filtered = purchaseOrders.filter(po =>
    (filterStatus === 'all' || po.status === filterStatus) &&
    (po.no.toLowerCase().includes(search.toLowerCase()) ||
     po.vendorName.toLowerCase().includes(search.toLowerCase()) ||
     po.projectName.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPOs = filtered.reduce((s, po) => s + po.total, 0)
  const sentPOs = filtered.filter(p => p.status === 'Sent').length
  const receivedPOs = filtered.filter(p => p.status === 'Received').length

  const handleAdd = () => {
    if (!form.vendorId || !form.projectId) return
    const newPO: any = {
      id: Date.now(),
      no: `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorId: +form.vendorId,
      vendorName: vendors.find(v => v.id === +form.vendorId)?.name || '',
      projectId: +form.projectId,
      projectName: projects.find(p => p.id === +form.projectId)?.name || '',
      items: form.items,
      total: form.items.reduce((s: number, i: any) => s + i.total, 0),
      status: form.status,
      createdAt: new Date().toISOString().split('T')[0],
      expectedDelivery: form.expectedDelivery,
      notes: form.notes
    }
    if (editingId) {
      updatePurchaseOrder(editingId, newPO)
      setEditingId(null)
    } else {
      addPurchaseOrder(newPO)
    }
    resetForm()
    setShowModal(false)
  }

  const handleEdit = (po: any) => {
    setForm(po)
    setEditingId(po.id)
    setShowModal(true)
    setShowDetail(null)
  }

  const handleDelete = (id: number) => {
    if (confirm(t.master.deleteConfirm)) {
      deletePurchaseOrder(id)
      setShowDetail(null)
    }
  }

  const resetForm = () => {
    setForm({
      no: '', vendorId: '', vendorName: '', projectId: '', projectName: '', total: 0,
      status: 'Draft', expectedDelivery: '', notes: '', items: []
    })
    setEditingId(null)
  }

  const handleAddItem = () => {
    const newItem = { description: '', qty: 0, unitPrice: 0, total: 0 }
    setForm({ ...form, items: [...form.items, newItem] })
  }

  const handleUpdateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'qty' || field === 'unitPrice') {
      items[idx].total = items[idx].qty * items[idx].unitPrice
    }
    setForm({ ...form, items })
  }

  const handleRemoveItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) })
  }

  const detailPO = showDetail !== null ? purchaseOrders.find(p => p.id === showDetail) : null

  const excelHeaders = [t.purchasing.poNo, t.purchasing.vendor, t.purchasing.project, t.purchasing.amount, t.purchasing.status, t.purchasing.expectedDelivery]
  const excelKeys = ['no', 'vendorName', 'projectName', 'total', 'status', 'expectedDelivery']

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Sent': 'bg-blue-100 text-blue-800',
      'Received': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">ค่าซื้อรวม</div>
          <div className="text-xl font-bold text-[#1B3875]">{formatCurrency(totalPOs)}</div>
          <div className="text-xs text-gray-400">{filtered.length} POs</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">ส่งแล้ว</div>
          <div className="text-xl font-bold text-blue-600">{sentPOs}</div>
          <div className="text-xs text-gray-400">รอรับสินค้า</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">ได้รับแล้ว</div>
          <div className="text-xl font-bold text-green-600">{receivedPOs}</div>
          <div className="text-xs text-gray-400">สมบูรณ์</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Draft</div>
          <div className="text-xl font-bold text-orange-600">
            {purchaseOrders.filter(p => p.status === 'Draft').length}
          </div>
          <div className="text-xs text-gray-400">รอส่ง</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`${t.common.search}...`}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 focus:border-[#1B3875]"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600"
            >
              <option value="all">{t.common.all}</option>
              {PO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            {t.purchasing.addPO}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.purchasing.poNo}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.purchasing.vendor}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.purchasing.project}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{t.purchasing.amount}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.purchasing.status}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.purchasing.expectedDelivery}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t.common.noData}</td>
              </tr>
            ) : (
              filtered.map(po => (
                <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setShowDetail(po.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-[#1B3875]">{po.no}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{po.vendorName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{po.projectName}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(po.total)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(po.expectedDelivery)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(po)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(po.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }}
        title={editingId ? `${t.common.edit} PO` : t.purchasing.addPO} size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.purchasing.vendor}</label>
              <select value={form.vendorId} onChange={e => {
                const vid = e.target.value
                const v = vendors.find(vnd => vnd.id === +vid)
                setForm({ ...form, vendorId: vid, vendorName: v?.name || '' })
              }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                <option value="">{t.common.select || 'เลือก'}</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.purchasing.project}</label>
              <select value={form.projectId} onChange={e => {
                const pid = e.target.value
                const p = projects.find(proj => proj.id === +pid)
                setForm({ ...form, projectId: pid, projectName: p?.name || '' })
              }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                <option value="">{t.common.select || 'เลือก'}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.purchasing.status}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                {PO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.purchasing.expectedDelivery}</label>
              <input type="date" value={form.expectedDelivery} onChange={e => setForm({ ...form, expectedDelivery: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">{t.purchasing.items}</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {form.items.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                  <input placeholder={t.purchasing.description}
                    value={item.description}
                    onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                  />
                  <input type="number" placeholder={t.purchasing.qty}
                    value={item.qty}
                    onChange={e => handleUpdateItem(idx, 'qty', +e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                  />
                  <input type="number" placeholder={t.purchasing.unitPrice}
                    value={item.unitPrice}
                    onChange={e => handleUpdateItem(idx, 'unitPrice', +e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                  />
                  <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm font-medium">
                    {formatCurrency(item.total)}
                  </div>
                  <button onClick={() => handleRemoveItem(idx)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm">
                    {t.common.delete}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleAddItem} className="mt-2 text-sm text-[#1B3875] hover:text-[#152d5a] font-medium">
              + {t.common.add} {t.purchasing.items}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t.purchasing.notes}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder={t.purchasing.notes}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowModal(false); resetForm() }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.common.cancel}
            </button>
            <button onClick={handleAdd}
              className="px-4 py-2 bg-[#1B3875] text-white rounded-lg text-sm font-medium hover:bg-[#152d5a]"
            >
              {t.common.save}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailPO && (
        <Modal open={showDetail !== null} onClose={() => setShowDetail(null)}
          title={detailPO.no} size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">{t.purchasing.vendor}</div>
                <div className="font-medium text-gray-900">{detailPO.vendorName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.purchasing.project}</div>
                <div className="font-medium text-gray-900">{detailPO.projectName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.purchasing.status}</div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadge(detailPO.status)}`}>
                  {detailPO.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.purchasing.expectedDelivery}</div>
                <div className="font-medium text-gray-900">{formatDate(detailPO.expectedDelivery)}</div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{t.purchasing.items}</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-600 pb-2">{t.purchasing.description}</th>
                    <th className="text-right text-xs font-semibold text-gray-600 pb-2">{t.purchasing.qty}</th>
                    <th className="text-right text-xs font-semibold text-gray-600 pb-2">{t.purchasing.unitPrice}</th>
                    <th className="text-right text-xs font-semibold text-gray-600 pb-2">{t.purchasing.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPO.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{item.description}</td>
                      <td className="py-2 text-right text-gray-700">{item.qty}</td>
                      <td className="py-2 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">{t.purchasing.total}:</span>
                <span className="text-lg font-bold text-[#1B3875]">{formatCurrency(detailPO.total)}</span>
              </div>
            </div>

            {detailPO.notes && (
              <div className="border-t border-gray-200 pt-4">
                <div className="text-xs text-gray-500 mb-1">{t.purchasing.notes}</div>
                <div className="text-sm text-gray-700">{detailPO.notes}</div>
              </div>
            )}

            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => setShowDetail(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.close}
              </button>
              <button onClick={() => handleEdit(detailPO)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {t.common.edit}
              </button>
              <button onClick={() => handleDelete(detailPO.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
