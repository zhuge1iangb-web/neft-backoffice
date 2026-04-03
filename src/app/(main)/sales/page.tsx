'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { stageBadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import KPICard from '@/components/ui/KPICard'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  DocumentArrowDownIcon, FunnelIcon, ArrowRightCircleIcon,
  TrashIcon, PencilSquareIcon, CheckCircleIcon
} from '@heroicons/react/24/outline'

const STAGES = ['New Lead','Qualified','Requirement Gathered','Proposal Submitted','Negotiation','Pending Decision','Won','Lost']

export default function SalesPage() {
  const { lang, opportunities, addOpportunity, updateOpportunity, deleteOpportunity, customers, quotations, addQuotation, createProjectFromOpp } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'quotations'>('list')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', customerId: '', stage: 'New Lead', value: '', cost: '', probability: '10', expectedClose: '', owner: '', remark: '' })
  const [quotationForm, setQuotationForm] = useState({ oppId: '', items: [{ description: '', qty: '', unitPrice: '' }] })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)

  const filtered = opportunities.filter(o =>
    (filterStage === 'all' || o.stage === filterStage) &&
    (o.name.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPipeline = filtered.filter(o => o.status === 'active').reduce((s, o) => s + o.value, 0)
  const avgGP = filtered.filter(o => o.gp > 0).reduce((s, o) => s + (o.gp / o.value * 100), 0) / (filtered.filter(o => o.gp > 0).length || 1)

  const handleSave = () => {
    if (editingId) {
      updateOpportunity(editingId, {
        name: form.name, stage: form.stage, value: +form.value || 0, cost: +form.cost || 0,
        gp: (+form.value || 0) - (+form.cost || 0), probability: +form.probability || 10,
        expectedClose: form.expectedClose, owner: form.owner,
        status: form.stage === 'Won' ? 'won' : form.stage === 'Lost' ? 'lost' : 'active'
      })
      setEditingId(null)
    } else {
      const cust = customers.find(c => c.id === +form.customerId)
      const newOpp = {
        id: Date.now(), no: `OPP-2026-${String(Date.now()).slice(-3)}`,
        name: form.name, customerId: +form.customerId, customerName: cust?.name || '',
        owner: form.owner, stage: form.stage, value: +form.value || 0, cost: +form.cost || 0,
        gp: (+form.value || 0) - (+form.cost || 0), probability: +form.probability || 10,
        expectedClose: form.expectedClose, lastActivity: new Date().toISOString().split('T')[0],
        nextFollowUp: null, status: form.stage === 'Won' ? 'won' : form.stage === 'Lost' ? 'lost' : 'active',
        quotationIds: [], deliveryPeriod: null, paymentTerm: null, projectType: null, gpPct: 0
      }
      addOpportunity(newOpp)
    }
    setShowModal(false)
    setForm({ name: '', customerId: '', stage: 'New Lead', value: '', cost: '', probability: '10', expectedClose: '', owner: '', remark: '' })
  }

  const handleEdit = (opp: typeof opportunities[0]) => {
    setEditingId(opp.id)
    setForm({ name: opp.name, customerId: String(opp.customerId), stage: opp.stage, value: String(opp.value), cost: String(opp.cost), probability: String(opp.probability), expectedClose: opp.expectedClose, owner: opp.owner, remark: '' })
    setShowModal(true)
  }

  const handleAddQuotation = () => {
    if (!quotationForm.oppId) return
    const opp = opportunities.find(o => o.id === +quotationForm.oppId)
    if (!opp) return
    const items = quotationForm.items.filter(i => i.description && i.qty && i.unitPrice).map(i => ({
      id: Date.now() + Math.random(),
      description: i.description, qty: +i.qty, unitPrice: +i.unitPrice, cost: 0, vendorId: null, vendorName: ''
    }))
    const totalPrice = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0)
    const qt = { id: Date.now(), no: `QT-2026-${String(quotations.length + 1).padStart(3, '0')}`, oppId: +quotationForm.oppId, oppNo: opp.no, customerId: opp.customerId, customerName: opp.customerName, items, totalPrice, totalCost: 0, gp: totalPrice, gpPct: 100, status: 'Draft' as const, createdAt: new Date().toISOString().split('T')[0], validUntil: '', notes: '' }
    addQuotation(qt)
    setShowQuotationModal(false)
    setQuotationForm({ oppId: '', items: [{ description: '', qty: '', unitPrice: '' }] })
  }

  const detailOpp = showDetail !== null ? opportunities.find(o => o.id === showDetail) : null
  const oppQuotations = quotations.filter(q => q.oppId === showDetail)
  const quotationExcelHeaders = [t.common.description, t.common.quantity, t.sales.unitPrice, t.common.total]
  const quotationExcelKeys = ['description', 'qty', 'unitPrice', 'total']

  const excelHeaders = [t.sales.opportunityName, t.common.customer, t.sales.stage, t.sales.value, t.sales.estimatedGP, t.sales.probability, t.sales.expectedClose, t.common.owner]
  const excelKeys = ['name','customerName','stage','value','gp','probability','expectedClose','owner']

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Pipeline รวม</div>
          <div className="text-xl font-bold text-[#1B3875]">{formatCurrency(totalPipeline)}</div>
          <div className="text-xs text-gray-400">{filtered.filter(o=>o.status==='active').length} โอกาสขาย</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Won ปีนี้</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(opportunities.filter(o=>o.status==='won').reduce((s,o)=>s+o.value,0))}</div>
          <div className="text-xs text-gray-400">{opportunities.filter(o=>o.status==='won').length} deals</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">GP เฉลี่ย</div>
          <div className="text-xl font-bold text-purple-600">{avgGP.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Follow-up วันนี้</div>
          <div className="text-xl font-bold text-orange-600">
            {opportunities.filter(o => o.nextFollowUp === new Date().toISOString().split('T')[0]).length}
          </div>
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
            {activeTab !== 'quotations' && (
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600"
              >
                <option value="all">{t.common.all}</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['list','kanban','quotations'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500'}`}>
                  {tab === 'list' ? 'รายการ' : tab === 'kanban' ? 'Kanban' : 'ใบเสนอราคา'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab !== 'quotations' && (
              <>
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filtered, excelHeaders, excelKeys, 'sales_opportunities')}>
                  Excel
                </Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Sales Opportunities', excelHeaders, filtered, excelKeys, 'sales_opportunities')}>
                  PDF
                </Button>
              </>
            )}
            {activeTab === 'quotations' && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowQuotationModal(true)}>
                เพิ่มใบเสนอราคา
              </Button>
            )}
            {activeTab !== 'quotations' && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditingId(null); setShowModal(true) }}>
                {t.sales.addOpportunity}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* List View */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] border-b border-gray-100">
                <tr>
                  {['เลขที่','ชื่อโอกาสขาย','ลูกค้า','ขั้นตอน','มูลค่า','GP%','คาดปิด','ผู้รับผิดชอบ',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{o.no}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 truncate max-w-[180px] cursor-pointer hover:text-[#1B3875]" onClick={() => setShowDetail(o.id)}>{o.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{o.customerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge variant={stageBadgeVariant(o.stage)}>{o.stage}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{formatCurrency(o.value)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                      {o.value > 0 ? `${((o.gp/o.value)*100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(o.expectedClose, lang)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{o.owner}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setShowDetail(o.id)} className="text-[#1B3875] hover:text-[#0F2654] transition-colors flex-shrink-0">
                        <ArrowRightCircleIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(o)} className="text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(o.id)} className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">{t.common.noData}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {activeTab === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.filter(s => !['Won','Lost'].includes(s)).map(stage => {
            const stageOpps = opportunities.filter(o => o.stage === stage)
            return (
              <div key={stage} className="flex-shrink-0 w-60">
                <div className="bg-[#F4F6FA] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-600">{stage}</span>
                    <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full">{stageOpps.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageOpps.map(o => (
                      <div key={o.id} onClick={() => setShowDetail(o.id)}
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-[#1B3875]/30 transition-colors">
                        <div className="text-xs font-medium text-gray-800 mb-1 truncate">{o.name}</div>
                        <div className="text-xs text-gray-400 mb-2 truncate">{o.customerName}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1B3875]">{formatCurrency(o.value)}</span>
                          <span className="text-xs text-gray-400">{o.probability}%</span>
                        </div>
                      </div>
                    ))}
                    {stageOpps.length === 0 && <div className="text-xs text-gray-300 text-center py-4">ว่าง</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? 'แก้ไขโอกาสขาย' : t.sales.addOpportunity} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'ชื่อโอกาสขาย*', key: 'name', type: 'text', span: 2 },
            ...(editingId ? [] : [{ label: 'ลูกค้า*', key: 'customerId', type: 'select' }]),
            { label: 'ผู้รับผิดชอบ*', key: 'owner', type: 'text' },
            { label: 'ขั้นตอน', key: 'stage', type: 'stage-select' },
            { label: 'ความน่าจะเป็น (%)', key: 'probability', type: 'number' },
            { label: 'มูลค่าประมาณการ (฿)', key: 'value', type: 'number' },
            { label: 'ต้นทุนประมาณการ (฿)', key: 'cost', type: 'number' },
            { label: 'คาดปิดวันที่', key: 'expectedClose', type: 'date', span: 2 },
          ].map(f => (
            <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : f.type === 'stage-select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => { setShowModal(false); setEditingId(null) }}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!form.name || (!editingId && !form.customerId)}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail !== null} onClose={() => setShowDetail(null)} title="รายละเอียดโอกาสขาย" size="lg">
        {detailOpp && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2654]">{detailOpp.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detailOpp.no}</p>
              </div>
              <Badge variant={stageBadgeVariant(detailOpp.stage)}>{detailOpp.stage}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['ลูกค้า', detailOpp.customerName],
                ['ผู้รับผิดชอบ', detailOpp.owner],
                ['มูลค่า', formatCurrency(detailOpp.value)],
                ['ต้นทุน', formatCurrency(detailOpp.cost)],
                ['GP', `${formatCurrency(detailOpp.gp)} (${((detailOpp.gp/detailOpp.value)*100).toFixed(1)}%)`],
                ['ความน่าจะเป็น', `${detailOpp.probability}%`],
                ['คาดปิด', formatDate(detailOpp.expectedClose, lang)],
                ['Follow-up ถัดไป', formatDate(detailOpp.nextFollowUp, lang)],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="font-medium text-gray-700 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {detailOpp.status === 'won' && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <Button icon={<CheckCircleIcon className="w-4 h-4" />} onClick={() => { createProjectFromOpp(detailOpp.id); setShowDetail(null) }} className="w-full text-green-700 bg-green-100 hover:bg-green-200 border-0">
                  สร้างโครงการจากโอกาสขายนี้
                </Button>
              </div>
            )}

            {oppQuotations.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">ใบเสนอราคาที่เกี่ยวข้อง</h3>
                <div className="space-y-2">
                  {oppQuotations.map(q => (
                    <div key={q.id} className="bg-blue-50 rounded-lg p-2 border border-blue-200 text-xs">
                      <div className="font-medium text-gray-800">{q.no}</div>
                      <div className="text-gray-600">{q.items.length} รายการ • {formatCurrency(q.totalPrice)}</div>
                      <Badge variant="info">{q.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailOpp.status === 'active' && (
              <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                {STAGES.map(s => s !== detailOpp.stage && (
                  <button key={s} onClick={() => { updateOpportunity(detailOpp.id, { stage: s, status: s==='Won'?'won':s==='Lost'?'lost':'active' }); setShowDetail(null) }}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-[#1B3875] hover:text-white rounded-lg transition-colors">
                    → {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          {quotations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-400">{t.common.noData}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {quotations.map(q => {
                const opp = opportunities.find(o => o.id === q.oppId)
                return (
                  <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{q.no}</h3>
                        <p className="text-xs text-gray-400">{q.customerName} • {opp?.name}</p>
                      </div>
                      <Badge variant={q.status === 'Approved' ? 'success' : q.status === 'Rejected' ? 'error' : 'warning'}>{q.status}</Badge>
                    </div>
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-2 py-2 text-gray-600">รายการ</th>
                            <th className="text-right px-2 py-2 text-gray-600">จำนวน</th>
                            <th className="text-right px-2 py-2 text-gray-600">ราคาต่อหน่วย</th>
                            <th className="text-right px-2 py-2 text-gray-600">รวม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.items.map(item => (
                            <tr key={item.id} className="border-b border-gray-100">
                              <td className="px-2 py-2">{item.description}</td>
                              <td className="text-right px-2 py-2">{item.qty}</td>
                              <td className="text-right px-2 py-2">{formatCurrency(item.unitPrice)}</td>
                              <td className="text-right px-2 py-2 font-medium">{formatCurrency(item.qty * item.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-2 mb-3 text-xs">
                      <div><div className="text-gray-500">ราคารวม</div><div className="font-bold text-gray-800">{formatCurrency(q.totalPrice)}</div></div>
                      <div><div className="text-gray-500">GP</div><div className="font-bold text-green-600">{formatCurrency(q.gp)} ({q.gpPct.toFixed(1)}%)</div></div>
                      <div><div className="text-gray-500">สร้างวันที่</div><div className="font-medium text-gray-700">{formatDate(q.createdAt, lang)}</div></div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                        onClick={() => {
                          const items = q.items.map(i => ({...i, total: i.qty * i.unitPrice}))
                          exportToExcel(items, quotationExcelHeaders, quotationExcelKeys, `quotation_${q.no}`)
                        }}>
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                        onClick={() => {
                          const items = q.items.map(i => ({...i, total: i.qty * i.unitPrice}))
                          exportToPdf(`${q.no} - ${q.customerName}`, quotationExcelHeaders, items, quotationExcelKeys, `quotation_${q.no}`)
                        }}>
                        PDF
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Quotation Modal */}
      <Modal open={showQuotationModal} onClose={() => setShowQuotationModal(false)} title="เพิ่มใบเสนอราคา" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">โอกาสขาย*</label>
            <select value={quotationForm.oppId} onChange={e => setQuotationForm({...quotationForm, oppId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
              <option value="">-- เลือกโอกาสขาย --</option>
              {opportunities.filter(o => o.status === 'active' || o.status === 'won').map(o => (
                <option key={o.id} value={o.id}>{o.no} - {o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">รายการ</label>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-2">รายการ</th>
                    <th className="text-right px-2 py-2">จำนวน</th>
                    <th className="text-right px-2 py-2">ราคาต่อหน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationForm.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2"><input type="text" value={item.description} onChange={e => { const items = [...quotationForm.items]; items[idx].description = e.target.value; setQuotationForm({...quotationForm, items}) }} placeholder="เช่น Cisco Switch" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.qty} onChange={e => { const items = [...quotationForm.items]; items[idx].qty = e.target.value; setQuotationForm({...quotationForm, items}) }} placeholder="0" className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.unitPrice} onChange={e => { const items = [...quotationForm.items]; items[idx].unitPrice = e.target.value; setQuotationForm({...quotationForm, items}) }} placeholder="0" className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setQuotationForm({...quotationForm, items: [...quotationForm.items, {description:'', qty:'', unitPrice:''}]})} className="mt-2 text-xs text-[#1B3875] hover:underline">+ เพิ่มรายการ</button>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowQuotationModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleAddQuotation} disabled={!quotationForm.oppId || quotationForm.items.filter(i => i.description && i.qty && i.unitPrice).length === 0}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={showDeleteConfirm !== null} onClose={() => setShowDeleteConfirm(null)} title="ยืนยันการลบ" size="sm">
        <p className="text-gray-600 text-sm mb-4">คุณแน่ใจว่าต้องการลบโอกาสขายนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>{t.common.cancel}</Button>
          <Button onClick={() => { if (showDeleteConfirm) deleteOpportunity(showDeleteConfirm); setShowDeleteConfirm(null) }} className="bg-red-600 hover:bg-red-700">{t.common.delete}</Button>
        </div>
      </Modal>
    </div>
  )
}
