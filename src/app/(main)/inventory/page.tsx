'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate } from '@/lib/export'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import KPICard from '@/components/ui/KPICard'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const CATEGORIES = ['Network', 'Security', 'Power', 'Software', 'Hardware', 'Accessories']
const STATUSES = ['In Stock', 'Reserved', 'Deployed', 'Returned']

export default function InventoryPage() {
  const { lang, inventory, projects, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    code: '', name: '', category: 'Network', brand: '', model: '', qty: 0,
    unitCost: 0, location: '', projectId: null, status: 'In Stock'
  })

  const filtered = inventory.filter(item =>
    (filterStatus === 'all' || item.status === filterStatus) &&
    (filterCategory === 'all' || item.category === filterCategory) &&
    (item.name.toLowerCase().includes(search.toLowerCase()) ||
     item.code.toLowerCase().includes(search.toLowerCase()) ||
     item.brand.toLowerCase().includes(search.toLowerCase()))
  )

  const inStock = filtered.filter(i => i.status === 'In Stock').reduce((s, i) => s + i.qty, 0)
  const reserved = filtered.filter(i => i.status === 'Reserved').reduce((s, i) => s + i.qty, 0)
  const deployed = filtered.filter(i => i.status === 'Deployed').reduce((s, i) => s + i.qty, 0)
  const totalValue = filtered.reduce((s, i) => s + (i.qty * i.unitCost), 0)

  const handleAdd = () => {
    if (!form.code || !form.name) return
    const newItem: any = {
      id: Date.now(),
      code: form.code,
      name: form.name,
      category: form.category,
      brand: form.brand,
      model: form.model,
      qty: form.qty,
      unitCost: form.unitCost,
      location: form.location,
      projectId: form.projectId ? +form.projectId : null,
      status: form.status
    }
    if (editingId) {
      updateInventoryItem(editingId, newItem)
      setEditingId(null)
    } else {
      addInventoryItem(newItem)
    }
    resetForm()
    setShowModal(false)
  }

  const handleEdit = (item: any) => {
    setForm(item)
    setEditingId(item.id)
    setShowModal(true)
    setShowDetail(null)
  }

  const handleDelete = (id: number) => {
    if (confirm(t.master.deleteConfirm)) {
      deleteInventoryItem(id)
      setShowDetail(null)
    }
  }

  const resetForm = () => {
    setForm({
      code: '', name: '', category: 'Network', brand: '', model: '', qty: 0,
      unitCost: 0, location: '', projectId: null, status: 'In Stock'
    })
    setEditingId(null)
  }

  const detailItem = showDetail !== null ? inventory.find(i => i.id === showDetail) : null

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'In Stock': 'bg-green-100 text-green-800',
      'Reserved': 'bg-yellow-100 text-yellow-800',
      'Deployed': 'bg-blue-100 text-blue-800',
      'Returned': 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">{t.inventory.inStock}</div>
          <div className="text-xl font-bold text-green-600">{inStock}</div>
          <div className="text-xs text-gray-400">หน่วย</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">{t.inventory.reserved}</div>
          <div className="text-xl font-bold text-yellow-600">{reserved}</div>
          <div className="text-xs text-gray-400">จองแล้ว</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">{t.inventory.deployed}</div>
          <div className="text-xl font-bold text-blue-600">{deployed}</div>
          <div className="text-xs text-gray-400">ติดตั้ง</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">มูลค่าคลัง</div>
          <div className="text-lg font-bold text-[#1B3875]">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-gray-400">รวม</div>
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
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600"
            >
              <option value="all">{t.common.all}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600"
            >
              <option value="all">{t.common.all}</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B3875] text-white rounded-lg hover:bg-[#152d5a] transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            {t.inventory.addItem}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.inventory.code}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.inventory.name}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.inventory.category}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.inventory.brand}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{t.inventory.quantity}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{t.inventory.unitCost}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.inventory.status}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">{t.common.noData}</td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setShowDetail(item.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-[#1B3875]">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.brand}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">{item.qty}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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
        title={editingId ? `${t.common.edit} ${t.inventory.items}` : t.inventory.addItem}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.code}</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder={t.inventory.code}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.name}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={t.inventory.name}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.category}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.status}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.brand}</label>
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                placeholder={t.inventory.brand}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.model}</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                placeholder={t.inventory.model}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.quantity}</label>
              <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: +e.target.value })}
                placeholder={t.inventory.quantity}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.unitCost}</label>
              <input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: +e.target.value })}
                placeholder={t.inventory.unitCost}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.location}</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder={t.inventory.location}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">{t.inventory.project}</label>
              <select value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value ? +e.target.value : null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              >
                <option value="">ไม่มี</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
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
      {detailItem && (
        <Modal open={showDetail !== null} onClose={() => setShowDetail(null)}
          title={detailItem.code}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">{t.inventory.name}</div>
                <div className="font-medium text-gray-900">{detailItem.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.category}</div>
                <div className="font-medium text-gray-900">{detailItem.category}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.brand}</div>
                <div className="font-medium text-gray-900">{detailItem.brand}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.model}</div>
                <div className="font-medium text-gray-900">{detailItem.model}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.quantity}</div>
                <div className="font-medium text-gray-900">{detailItem.qty} หน่วย</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.unitCost}</div>
                <div className="font-medium text-gray-900">{formatCurrency(detailItem.unitCost)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.inventory.status}</div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadge(detailItem.status)}`}>
                  {detailItem.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500">มูลค่ารวม</div>
                <div className="font-bold text-[#1B3875]">{formatCurrency(detailItem.qty * detailItem.unitCost)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500">{t.inventory.location}</div>
                <div className="font-medium text-gray-900">{detailItem.location}</div>
              </div>
              {detailItem.projectId && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">{t.inventory.project}</div>
                  <div className="font-medium text-gray-900">{projects.find(p => p.id === detailItem.projectId)?.name}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => setShowDetail(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.close}
              </button>
              <button onClick={() => handleEdit(detailItem)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {t.common.edit}
              </button>
              <button onClick={() => handleDelete(detailItem.id)}
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
