'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { severityVariant, slaVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const SEVERITIES = ['Critical','High','Medium','Low']
const TICKET_STATUSES = ['Open','Assigned','In Progress','Pending Customer','Pending Vendor','Resolved','Closed']

export default function ServicePage() {
  const { lang, tickets, contracts, addTicket, updateTicket, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [activeTab, setActiveTab] = useState<'tickets' | 'contracts'>('tickets')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [form, setForm] = useState({ customerId: '', subject: '', description: '', severity: 'Medium', assignedTo: '' })

  const filteredTickets = tickets.filter(tk =>
    (filterSev === 'all' || tk.severity === filterSev) &&
    (filterStatus === 'all' || (filterStatus === 'active' ? !['Resolved','Closed'].includes(tk.status) : ['Resolved','Closed'].includes(tk.status))) &&
    (tk.subject.toLowerCase().includes(search.toLowerCase()) || tk.customerName.toLowerCase().includes(search.toLowerCase()) || tk.no.toLowerCase().includes(search.toLowerCase()))
  )

  const openTickets = tickets.filter(t => !['Resolved','Closed'].includes(t.status))
  const criticalOpen = openTickets.filter(t => t.severity === 'Critical')
  const slaAtRisk = openTickets.filter(t => t.slaStatus === 'At Risk')
  const slaBreach = openTickets.filter(t => t.slaStatus === 'Breached')
  const detailTicket = showDetail !== null ? tickets.find(t => t.id === showDetail) : null

  const handleAdd = () => {
    const cust = customers.find(c => c.id === +form.customerId)
    addTicket({
      id: Date.now(), no: `TK-2026-${String(Date.now()).slice(-4)}`,
      customerId: +form.customerId, customerName: cust?.name || '',
      subject: form.subject, description: form.description, severity: form.severity,
      assignedTo: form.assignedTo, status: 'Open',
      createdAt: new Date().toISOString().split('T')[0],
      responseDue: '', resolutionDue: '', slaStatus: 'Met', contractId: null,
    })
    setShowModal(false)
    setForm({ customerId:'', subject:'', description:'', severity:'Medium', assignedTo:'' })
  }

  const excelHeaders = ['เลขที่','ลูกค้า','หัวข้อ','ระดับ','สถานะ','SLA','ผู้รับผิดชอบ','วันที่สร้าง']
  const excelKeys = ['no','customerName','subject','severity','status','slaStatus','assignedTo','createdAt']

  const sevColors: Record<string, string> = { Critical: 'bg-red-100 border-red-200', High: 'bg-orange-100 border-orange-200', Medium: 'bg-yellow-50 border-yellow-200', Low: 'bg-blue-50 border-blue-200' }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Critical Open</div>
          <div className="text-2xl font-bold text-red-600">{criticalOpen.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">SLA At Risk</div>
          <div className="text-2xl font-bold text-orange-600">{slaAtRisk.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">SLA Breached</div>
          <div className="text-2xl font-bold text-red-700">{slaBreach.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Open Tickets</div>
          <div className="text-2xl font-bold text-blue-600">{openTickets.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['tickets','contracts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'tickets' ? `Tickets (${openTickets.length})` : `สัญญา MA (${contracts.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.common.search}...`}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                  <option value="all">ทุกระดับ</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filteredTickets, excelHeaders, excelKeys, 'service_tickets')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Service Tickets', excelHeaders, filteredTickets, excelKeys, 'service_tickets')}>PDF</Button>
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>{t.service.addTicket}</Button>
              </div>
            </div>
          </div>

          {/* Ticket Cards */}
          <div className="space-y-3">
            {filteredTickets.map(tk => (
              <div key={tk.id}
                className={`bg-white rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-all ${sevColors[tk.severity] || 'border-gray-100'}`}
                onClick={() => setShowDetail(tk.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-400">{tk.no}</span>
                      <Badge variant={severityVariant(tk.severity)}>{tk.severity}</Badge>
                      <Badge variant={slaVariant(tk.slaStatus)}>{tk.slaStatus}</Badge>
                      {tk.slaStatus === 'Breached' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 truncate">{tk.subject}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{tk.customerName} · ผู้รับผิดชอบ: {tk.assignedTo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={tk.status === 'Open' ? 'danger' : tk.status === 'Resolved' ? 'success' : 'warning'}>{tk.status}</Badge>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(tk.createdAt, lang)}</div>
                  </div>
                </div>
                {tk.responseDue && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                    <span>Response due: <span className="font-medium">{tk.responseDue}</span></span>
                    <span>Resolution due: <span className="font-medium">{tk.resolutionDue}</span></span>
                  </div>
                )}
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">{t.common.noData}</div>
            )}
          </div>
        </>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] border-b border-gray-100">
                <tr>
                  {['เลขที่สัญญา','ลูกค้า','ประเภท','เริ่มต้น','สิ้นสุด','วันที่เหลือ','ผู้รับผิดชอบ','สถานะ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${c.daysLeft > 0 && c.daysLeft <= 30 ? 'bg-red-50/30' : c.daysLeft > 0 && c.daysLeft <= 60 ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.no}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.customerName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.startDate, lang)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(c.endDate, lang)}</td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {c.daysLeft === 0 ? <span className="text-gray-400">Expired</span> : (
                        <span className={c.daysLeft <= 30 ? 'text-red-600' : c.daysLeft <= 60 ? 'text-orange-500' : 'text-gray-600'}>
                          {c.daysLeft} วัน
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.renewalOwner}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.status === 'Active' ? 'success' : 'default'}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Ticket Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.service.addTicket} size="md">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ลูกค้า*</label>
            <select value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              <option value="">-- เลือกลูกค้า --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">หัวข้อ*</label>
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ระดับความรุนแรง</label>
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับผิดชอบ</label>
              <input value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleAdd} disabled={!form.customerId || !form.subject}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal open={showDetail !== null} onClose={() => setShowDetail(null)} title="รายละเอียด Ticket" size="lg">
        {detailTicket && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2654]">{detailTicket.subject}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detailTicket.no}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge variant={severityVariant(detailTicket.severity)}>{detailTicket.severity}</Badge>
                <Badge variant={slaVariant(detailTicket.slaStatus)}>{detailTicket.slaStatus}</Badge>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{detailTicket.description || '-'}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['ลูกค้า', detailTicket.customerName],
                ['ผู้รับผิดชอบ', detailTicket.assignedTo],
                ['Response due', detailTicket.responseDue || '-'],
                ['Resolution due', detailTicket.resolutionDue || '-'],
                ['สร้างเมื่อ', formatDate(detailTicket.createdAt, lang)],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="font-medium text-gray-700 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {/* Status Update */}
            <div className="pt-3 border-t border-gray-100">
              <label className="text-xs font-medium text-gray-600 mb-1 block">อัปเดตสถานะ</label>
              <div className="flex flex-wrap gap-2">
                {TICKET_STATUSES.map(s => (
                  <button key={s} onClick={() => { updateTicket(detailTicket.id, { status: s }); setShowDetail(null) }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${detailTicket.status === s ? 'bg-[#1B3875] text-white border-[#1B3875]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3875]/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
