'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { invoiceStatusVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function FinancePage() {
  const { lang, invoices, addInvoice, projects, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState<'invoices' | 'ar'>('invoices')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ projectId: '', invoiceNo: '', invoiceDate: '', dueDate: '', billedAmount: '', note: '' })

  const filtered = invoices.filter(inv =>
    (filterStatus === 'all' || inv.status === filterStatus) &&
    (inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) || inv.customerName.toLowerCase().includes(search.toLowerCase()) || inv.projectName.toLowerCase().includes(search.toLowerCase()))
  )

  // Finance KPIs
  const totalBilled = invoices.reduce((s, i) => s + i.billedAmount, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const totalOutstanding = totalBilled - totalPaid
  const overdueAmt = invoices.filter(i => i.overdue).reduce((s, i) => s + (i.billedAmount - i.paidAmount), 0)
  const thisMonthExpected = invoices.filter(i => !i.overdue && i.dueDate?.startsWith('2026-04') && i.status !== 'Paid').reduce((s, i) => s + (i.billedAmount - i.paidAmount), 0)

  // AR Aging data
  const arData = [
    { label: 'ไม่ค้างชำระ', value: invoices.filter(i => !i.overdue && i.status !== 'Paid').reduce((s,i)=>s+(i.billedAmount-i.paidAmount),0) },
    { label: '1-30 วัน', value: overdueAmt * 0.4 },
    { label: '31-60 วัน', value: overdueAmt * 0.35 },
    { label: '61-90 วัน', value: overdueAmt * 0.15 },
    { label: '>90 วัน', value: overdueAmt * 0.1 },
  ]

  const handleAdd = () => {
    const proj = projects.find(p => p.id === +form.projectId)
    addInvoice({
      id: Date.now(), projectId: +form.projectId, projectName: proj?.name || '',
      customerId: proj?.customerId || 0, customerName: proj?.customerName || '',
      invoiceNo: form.invoiceNo || `INV-2026-${String(Date.now()).slice(-4)}`,
      invoiceDate: form.invoiceDate, dueDate: form.dueDate,
      billedAmount: +form.billedAmount || 0, paidAmount: 0,
      status: 'Unpaid', overdue: false,
    })
    setShowModal(false)
    setForm({ projectId:'',invoiceNo:'',invoiceDate:'',dueDate:'',billedAmount:'',note:'' })
  }

  const excelHeaders = ['เลขที่ใบแจ้งหนี้','โครงการ','ลูกค้า','วันที่ออก','วันครบกำหนด','ยอดวางบิล','ยอดชำระ','คงค้าง','สถานะ']
  const excelData = filtered.map(i => ({ ...i, outstanding: i.billedAmount - i.paidAmount }))
  const excelKeys = ['invoiceNo','projectName','customerName','invoiceDate','dueDate','billedAmount','paidAmount','outstanding','status']

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'ยอดวางบิลรวม', value: formatCurrency(totalBilled), color: 'bg-blue-50 border-blue-100' },
          { label: 'รับชำระแล้ว', value: formatCurrency(totalPaid), color: 'bg-green-50 border-green-100' },
          { label: 'ยอดคงค้างรวม', value: formatCurrency(totalOutstanding), color: 'bg-yellow-50 border-yellow-100' },
          { label: 'ลูกหนี้ค้างชำระ', value: formatCurrency(overdueAmt), color: 'bg-red-50 border-red-100' },
          { label: 'คาดรับเดือนนี้', value: formatCurrency(thisMonthExpected), color: 'bg-purple-50 border-purple-100' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border ${k.color} bg-white shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-lg font-bold text-gray-800">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['invoices','ar'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'invoices' ? 'ใบแจ้งหนี้ / Collection' : 'AR Aging Analysis'}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t.common.search}...`}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                  <option value="all">ทุกสถานะ</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(excelData, excelHeaders, excelKeys, 'finance_invoices')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Finance - Invoices & Collections', excelHeaders, excelData, excelKeys, 'finance_invoices')}>PDF</Button>
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>เพิ่มใบแจ้งหนี้</Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F6FA] border-b border-gray-100">
                  <tr>
                    {['เลขที่ใบแจ้งหนี้','โครงการ','ลูกค้า','วันที่ออก','วันครบกำหนด','ยอดวางบิล','รับชำระ','คงค้าง','สถานะ'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const outstanding = inv.billedAmount - inv.paidAmount
                    return (
                      <tr key={inv.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${inv.overdue ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNo}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[140px]"><div className="truncate">{inv.projectName}</div></td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{inv.customerName}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.invoiceDate, lang)}</td>
                        <td className={`px-4 py-3 text-xs whitespace-nowrap font-medium ${inv.overdue ? 'text-red-600' : 'text-gray-500'}`}>{formatDate(inv.dueDate, lang)}</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">{formatCurrency(inv.billedAmount)}</td>
                        <td className="px-4 py-3 text-right text-xs text-green-600 whitespace-nowrap">{formatCurrency(inv.paidAmount)}</td>
                        <td className={`px-4 py-3 text-right text-xs font-semibold whitespace-nowrap ${outstanding > 0 ? (inv.overdue ? 'text-red-600' : 'text-orange-500') : 'text-gray-400'}`}>
                          {formatCurrency(outstanding)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge></td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">{t.common.noData}</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-600 text-right">{t.common.total}:</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{formatCurrency(filtered.reduce((s,i)=>s+i.billedAmount,0))}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-green-600">{formatCurrency(filtered.reduce((s,i)=>s+i.paidAmount,0))}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-orange-600">{formatCurrency(filtered.reduce((s,i)=>s+(i.billedAmount-i.paidAmount),0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'ar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0F2654] mb-4">AR Aging Analysis</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={arData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" name="ยอดคงค้าง" fill="#1B3875" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0F2654] mb-4">สรุป AR Aging</h3>
            <div className="space-y-3">
              {arData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{d.label}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${i >= 2 ? 'text-red-600' : i === 1 ? 'text-orange-500' : 'text-gray-700'}`}>{formatCurrency(d.value)}</div>
                    <div className="text-xs text-gray-400">{totalOutstanding > 0 ? `${((d.value/totalOutstanding)*100).toFixed(1)}%` : '0%'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="เพิ่มใบแจ้งหนี้" size="md">
        <div className="space-y-3">
          {[
            { label: 'โครงการ*', key: 'projectId', type: 'project-select' },
            { label: 'เลขที่ใบแจ้งหนี้', key: 'invoiceNo', type: 'text' },
            { label: 'วันที่ออกใบแจ้งหนี้*', key: 'invoiceDate', type: 'date' },
            { label: 'วันครบกำหนด*', key: 'dueDate', type: 'date' },
            { label: 'ยอดที่วางบิล (฿)*', key: 'billedAmount', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              {f.type === 'project-select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- เลือกโครงการ --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
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
          <Button onClick={handleAdd} disabled={!form.projectId || !form.invoiceDate || !form.dueDate}>{t.common.save}</Button>
        </div>
      </Modal>
    </div>
  )
}
