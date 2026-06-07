'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, type SalesTarget } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { stageBadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import KPICard from '@/components/ui/KPICard'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  DocumentArrowDownIcon, FunnelIcon, ArrowRightCircleIcon,
  TrashIcon, PencilSquareIcon, CheckCircleIcon, TrophyIcon,
  ChartBarIcon, CurrencyDollarIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const STAGES = ['New Lead','Qualified','Requirement Gathered','Proposal Submitted','Negotiation','Pending Decision','Won','Lost']

export default function SalesPage() {
  const router = useRouter()
  const {
    lang, currentUser, opportunities: allOpportunities,
    addOpportunity, updateOpportunity, deleteOpportunity,
    customers, quotations: allQuotations, addQuotation,
    createProjectFromOpp, addProjectNameOption, projectNameOptions,
    users, salesTargets, addSalesTarget, updateSalesTarget, deleteSalesTarget,
  } = useAppStore()
  const t = translations[lang]

  // Per-rep data isolation
  const isSalesRep = currentUser?.role === 'Sales'
  const isAdminOrCeo = currentUser?.role === 'Admin' || currentUser?.role === 'CEO/Director'
  const opportunities = isSalesRep
    ? allOpportunities.filter(o => o.owner === currentUser?.name)
    : allOpportunities
  const oppIdSet = new Set(opportunities.map(o => o.id))
  const quotations = isSalesRep
    ? allQuotations.filter(q => oppIdSet.has(q.oppId))
    : allQuotations

  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [activeTab, setActiveTab] = useState<'list' | 'kanban' | 'quotations' | 'targets'>('list')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', customerId: '', stage: 'New Lead', value: '', cost: '',
    probability: '10', expectedClose: '', owner: '', remark: ''
  })
  const [quotationForm, setQuotationForm] = useState({ oppId: '', items: [{ description: '', qty: '', unitPrice: '' }] })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  // Won → Auto Project confirmation
  const [wonConfirmId, setWonConfirmId] = useState<number | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

  // Sales Target modal state
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null)
  const [targetForm, setTargetForm] = useState({
    userId: '' as string,
    year: new Date().getFullYear(),
    month: '' as string,
    targetRevenue: '',
    targetGp: '',
    targetGpPct: '',
    isOrgTarget: false,
  })
  const [targetYear, setTargetYear] = useState(new Date().getFullYear())

  const filtered = opportunities.filter(o =>
    (filterStage === 'all' || o.stage === filterStage) &&
    (o.name.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPipeline = filtered.filter(o => o.status === 'active').reduce((s, o) => s + o.value, 0)
  const totalWon = opportunities.filter(o => o.status === 'won').reduce((s, o) => s + o.value, 0)
  const totalGp = opportunities.filter(o => o.status === 'won').reduce((s, o) => s + o.gp, 0)
  const avgGP = filtered.filter(o => o.gp > 0).reduce((s, o) => s + (o.gp / o.value * 100), 0) / (filtered.filter(o => o.gp > 0).length || 1)

  // ---- Sales Targets: คำนวณ actual vs target ----
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // org target ปีนี้ (annual)
  const orgTarget = salesTargets.find(t => t.isOrgTarget && t.year === targetYear && !t.month)
  const orgTargetRevenue = orgTarget?.targetRevenue ?? 0
  const orgTargetGp = orgTarget?.targetGp ?? 0

  // คำนวณ actual ปีนี้ (won)
  const wonThisYear = allOpportunities.filter(o => o.status === 'won')
  const actualRevenue = wonThisYear.reduce((s, o) => s + o.value, 0)
  const actualGp = wonThisYear.reduce((s, o) => s + o.gp, 0)

  // per-user targets ปีนี้
  const salesUsers = users.filter(u => u.role === 'Sales')
  const userTargetsThisYear = salesUsers.map(u => {
    const target = salesTargets.find(t => t.userId === u.id && t.year === targetYear && !t.month && !t.isOrgTarget)
    const actual = allOpportunities.filter(o => o.status === 'won' && o.owner === u.name).reduce((s, o) => s + o.value, 0)
    const actualGpUser = allOpportunities.filter(o => o.status === 'won' && o.owner === u.name).reduce((s, o) => s + o.gp, 0)
    return {
      user: u,
      targetRevenue: target?.targetRevenue ?? 0,
      targetGp: target?.targetGp ?? 0,
      actualRevenue: actual,
      actualGp: actualGpUser,
      shortfallRevenue: Math.max(0, (target?.targetRevenue ?? 0) - actual),
      surplusRevenue: Math.max(0, actual - (target?.targetRevenue ?? 0)),
    }
  })

  // Auto-detect name from projectNameOptions when typing opp name
  const handleOppNameChange = async (value: string) => {
    setForm(f => ({ ...f, name: value }))
    // ถ้าพิมพ์ชื่อใหม่ที่ไม่มีใน projectNameOptions ให้ auto-create เมื่อ blur
  }

  const handleOppNameBlur = async () => {
    if (!form.name.trim()) return
    const exists = (projectNameOptions || []).some(
      p => p.name.toLowerCase() === form.name.trim().toLowerCase()
    )
    if (!exists) {
      // auto-create project_name_option
      addProjectNameOption(form.name.trim())
    }
  }

  const handleSave = () => {
    const oppName = form.name.trim()
    if (editingId) {
      updateOpportunity(editingId, {
        name: oppName, stage: form.stage, value: +form.value || 0, cost: +form.cost || 0,
        gp: (+form.value || 0) - (+form.cost || 0), probability: +form.probability || 10,
        expectedClose: form.expectedClose, owner: form.owner,
        status: form.stage === 'Won' ? 'won' : form.stage === 'Lost' ? 'lost' : 'active'
      })
      // ถ้า stage เป็น Won → แสดง confirm dialog สร้างโครงการ
      if (form.stage === 'Won') {
        setWonConfirmId(editingId)
      }
      setEditingId(null)
    } else {
      const cust = customers.find(c => c.id === +form.customerId)
      const newId = Date.now()
      const newOpp = {
        id: newId, no: `OPP-${currentYear}-${String(newId).slice(-3)}`,
        name: oppName, customerId: +form.customerId, customerName: cust?.name || '',
        owner: form.owner, stage: form.stage, value: +form.value || 0, cost: +form.cost || 0,
        gp: (+form.value || 0) - (+form.cost || 0), probability: +form.probability || 10,
        expectedClose: form.expectedClose, lastActivity: new Date().toISOString().split('T')[0],
        nextFollowUp: null, status: form.stage === 'Won' ? 'won' : form.stage === 'Lost' ? 'lost' : 'active',
        quotationIds: [], deliveryPeriod: null, paymentTerm: null, projectType: null, gpPct: 0
      }
      addOpportunity(newOpp)
      if (form.stage === 'Won') {
        setTimeout(() => setWonConfirmId(newId), 200)
      }
    }
    setShowModal(false)
    setForm({ name: '', customerId: '', stage: 'New Lead', value: '', cost: '', probability: '10', expectedClose: '', owner: '', remark: '' })
  }

  const handleEdit = (opp: typeof opportunities[0]) => {
    setEditingId(opp.id)
    setForm({ name: opp.name, customerId: String(opp.customerId), stage: opp.stage, value: String(opp.value), cost: String(opp.cost), probability: String(opp.probability), expectedClose: opp.expectedClose, owner: opp.owner, remark: '' })
    setShowModal(true)
  }

  // Won → เปลี่ยน stage → แสดง confirm สร้างโครงการอัตโนมัติ
  const handleStageChange = (opp: typeof opportunities[0], newStage: string) => {
    updateOpportunity(opp.id, {
      stage: newStage,
      status: newStage === 'Won' ? 'won' : newStage === 'Lost' ? 'lost' : 'active'
    })
    setShowDetail(null)
    if (newStage === 'Won') {
      setTimeout(() => setWonConfirmId(opp.id), 200)
    }
  }

  const handleConfirmCreateProject = async () => {
    if (!wonConfirmId) return
    setCreatingProject(true)
    await createProjectFromOpp(wonConfirmId)
    setCreatingProject(false)
    setWonConfirmId(null)
    router.push('/projects')
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
    const qt = {
      id: Date.now(), no: `QT-${currentYear}-${String(quotations.length + 1).padStart(3, '0')}`,
      oppId: +quotationForm.oppId, oppNo: opp.no, customerId: opp.customerId, customerName: opp.customerName,
      items, totalPrice, totalCost: 0, gp: totalPrice, gpPct: 100,
      status: 'Draft' as 'Draft' | 'Sent' | 'Approved' | 'Rejected',
      createdAt: new Date().toISOString().split('T')[0], validUntil: '', notes: ''
    }
    addQuotation(qt)
    setShowQuotationModal(false)
    setQuotationForm({ oppId: '', items: [{ description: '', qty: '', unitPrice: '' }] })
  }

  // ---- Target handlers ----
  const handleSaveTarget = () => {
    const data = {
      userId: targetForm.isOrgTarget ? null : (+targetForm.userId || null),
      userName: targetForm.isOrgTarget ? 'องค์กร' : (users.find(u => u.id === +targetForm.userId)?.name || ''),
      year: targetForm.year,
      month: targetForm.month ? +targetForm.month : null,
      targetRevenue: +targetForm.targetRevenue || 0,
      targetGp: +targetForm.targetGp || 0,
      targetGpPct: +targetForm.targetGpPct || 0,
      isOrgTarget: targetForm.isOrgTarget,
    }
    if (editingTargetId) {
      updateSalesTarget(editingTargetId, data)
      setEditingTargetId(null)
    } else {
      addSalesTarget(data)
    }
    setShowTargetModal(false)
    setTargetForm({ userId: '', year: new Date().getFullYear(), month: '', targetRevenue: '', targetGp: '', targetGpPct: '', isOrgTarget: false })
  }

  const detailOpp = showDetail !== null ? opportunities.find(o => o.id === showDetail) : null
  const oppQuotations = quotations.filter(q => q.oppId === showDetail)
  const quotationExcelHeaders = [t.common.description, t.common.quantity, t.sales.unitPrice, t.common.total]
  const quotationExcelKeys = ['description', 'qty', 'unitPrice', 'total']
  const excelHeaders = [t.sales.opportunityName, t.common.customer, t.sales.stage, t.sales.value, t.sales.estimatedGP, t.sales.probability, t.sales.expectedClose, t.common.owner]
  const excelKeys = ['name','customerName','stage','value','gp','probability','expectedClose','owner']

  // active projectNameOptions for datalist
  const activeProjectNames = (projectNameOptions || []).filter(p => p.isActive)

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
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalWon)}</div>
          <div className="text-xs text-gray-400">{opportunities.filter(o=>o.status==='won').length} deals</div>
          {orgTargetRevenue > 0 && (
            <div className="mt-1">
              <div className="text-xs text-gray-400">เป้า: {formatCurrency(orgTargetRevenue)}</div>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                <div className="bg-green-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (totalWon/orgTargetRevenue)*100)}%` }} />
              </div>
              <div className={`text-xs mt-0.5 font-medium ${totalWon >= orgTargetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                {totalWon >= orgTargetRevenue
                  ? `เกินเป้า +${formatCurrency(totalWon - orgTargetRevenue)}`
                  : `ขาด ${formatCurrency(orgTargetRevenue - totalWon)}`}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">GP Won ปีนี้</div>
          <div className="text-xl font-bold text-purple-600">{formatCurrency(totalGp)}</div>
          <div className="text-xs text-gray-400">เฉลี่ย {avgGP.toFixed(1)}%</div>
          {orgTargetGp > 0 && (
            <div className="mt-1">
              <div className="text-xs text-gray-400">เป้า GP: {formatCurrency(orgTargetGp)}</div>
              <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (totalGp/orgTargetGp)*100)}%` }} />
              </div>
              <div className={`text-xs mt-0.5 font-medium ${totalGp >= orgTargetGp ? 'text-green-600' : 'text-orange-500'}`}>
                {totalGp >= orgTargetGp
                  ? `เกินเป้า +${formatCurrency(totalGp - orgTargetGp)}`
                  : `ขาด ${formatCurrency(orgTargetGp - totalGp)}`}
              </div>
            </div>
          )}
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
            {activeTab !== 'quotations' && activeTab !== 'targets' && (
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                <option value="all">{t.common.all}</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['list','kanban','quotations','targets'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab===tab ? 'bg-white shadow text-[#1B3875]' : 'text-gray-500'}`}>
                  {tab === 'list' ? 'รายการ' : tab === 'kanban' ? 'Kanban' : tab === 'quotations' ? 'ใบเสนอราคา' : '🎯 Target'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab !== 'quotations' && activeTab !== 'targets' && (
              <>
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filtered, excelHeaders, excelKeys, 'sales_opportunities')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Sales Opportunities', excelHeaders, filtered, excelKeys, 'sales_opportunities')}>PDF</Button>
              </>
            )}
            {activeTab === 'quotations' && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowQuotationModal(true)}>
                เพิ่มใบเสนอราคา
              </Button>
            )}
            {activeTab === 'targets' && isAdminOrCeo && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditingTargetId(null); setShowTargetModal(true) }}>
                ตั้ง Target
              </Button>
            )}
            {activeTab !== 'quotations' && activeTab !== 'targets' && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => {
                setEditingId(null)
                if (isSalesRep && currentUser?.name) setForm(f => ({ ...f, owner: currentUser.name }))
                setShowModal(true)
              }}>{t.sales.addOpportunity}</Button>
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
                  {['เลขที่','ชื่อโครงการ / โอกาสขาย','ลูกค้า','ขั้นตอน','มูลค่า','GP%','คาดปิด','ผู้รับผิดชอบ',''].map(h => (
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

      {/* ============== TARGETS TAB ============== */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          {/* Year filter */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600">แสดงเป้าปี:</span>
            <select value={targetYear} onChange={e => setTargetYear(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Org Target Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Target */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollarIcon className="w-4 h-4 text-[#1B3875]" />
                <span className="text-sm font-semibold text-gray-700">เป้ายอดขายองค์กร ปี {targetYear}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>เป้า (Target)</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(orgTargetRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>ยอดจริง (Actual)</span>
                  <span className="font-semibold text-green-600">{formatCurrency(actualRevenue)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${actualRevenue >= orgTargetRevenue ? 'bg-green-500' : 'bg-[#1B3875]'}`}
                    style={{ width: `${orgTargetRevenue > 0 ? Math.min(100, (actualRevenue/orgTargetRevenue)*100) : 0}%` }} />
                </div>
                <div className={`text-xs font-semibold ${actualRevenue >= orgTargetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                  {orgTargetRevenue > 0
                    ? (actualRevenue >= orgTargetRevenue
                      ? `✅ เกินเป้า +${formatCurrency(actualRevenue - orgTargetRevenue)} (${((actualRevenue/orgTargetRevenue)*100).toFixed(1)}%)`
                      : `⚠️ ขาด ${formatCurrency(orgTargetRevenue - actualRevenue)} (${((actualRevenue/orgTargetRevenue)*100).toFixed(1)}%)`
                    )
                    : 'ยังไม่ได้ตั้งเป้า'
                  }
                </div>
              </div>
            </div>

            {/* GP Target */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">เป้า GP องค์กร ปี {targetYear}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>เป้า GP (Target)</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(orgTargetGp)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GP จริง (Actual)</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(actualGp)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${actualGp >= orgTargetGp ? 'bg-green-500' : 'bg-purple-500'}`}
                    style={{ width: `${orgTargetGp > 0 ? Math.min(100, (actualGp/orgTargetGp)*100) : 0}%` }} />
                </div>
                <div className={`text-xs font-semibold ${actualGp >= orgTargetGp ? 'text-green-600' : 'text-orange-500'}`}>
                  {orgTargetGp > 0
                    ? (actualGp >= orgTargetGp
                      ? `✅ เกินเป้า +${formatCurrency(actualGp - orgTargetGp)}`
                      : `⚠️ ขาด ${formatCurrency(orgTargetGp - actualGp)}`
                    )
                    : 'ยังไม่ได้ตั้งเป้า GP'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Per-User Target Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrophyIcon className="w-4 h-4 text-yellow-500" /> เป้าหมายรายบุคคล ปี {targetYear}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F6FA] border-b border-gray-100">
                  <tr>
                    {['พนักงาน', 'เป้ายอดขาย', 'ยอดจริง', 'ได้/ขาด', 'เป้า GP', 'GP จริง', 'ได้/ขาด GP', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userTargetsThisYear.map(({ user, targetRevenue, targetGp, actualRevenue: actRev, actualGp: actGp, shortfallRevenue, surplusRevenue }) => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 text-xs">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.role}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {targetRevenue > 0 ? formatCurrency(targetRevenue) : <span className="text-gray-300">ยังไม่ตั้งเป้า</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-green-600 whitespace-nowrap">{formatCurrency(actRev)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {targetRevenue > 0 ? (
                          <span className={`text-xs font-semibold ${actRev >= targetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                            {actRev >= targetRevenue
                              ? `+${formatCurrency(actRev - targetRevenue)}`
                              : `-${formatCurrency(targetRevenue - actRev)}`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {targetGp > 0 ? formatCurrency(targetGp) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-purple-600 whitespace-nowrap">{formatCurrency(actGp)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {targetGp > 0 ? (
                          <span className={`text-xs font-semibold ${actGp >= targetGp ? 'text-green-600' : 'text-orange-500'}`}>
                            {actGp >= targetGp ? `+${formatCurrency(actGp - targetGp)}` : `-${formatCurrency(targetGp - actGp)}`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isAdminOrCeo && (
                          <button onClick={() => {
                            const existing = salesTargets.find(t => t.userId === user.id && t.year === targetYear && !t.month && !t.isOrgTarget)
                            if (existing) {
                              setEditingTargetId(existing.id)
                              setTargetForm({
                                userId: String(user.id),
                                year: targetYear,
                                month: '',
                                targetRevenue: String(existing.targetRevenue),
                                targetGp: String(existing.targetGp),
                                targetGpPct: String(existing.targetGpPct),
                                isOrgTarget: false,
                              })
                            } else {
                              setEditingTargetId(null)
                              setTargetForm({ userId: String(user.id), year: targetYear, month: '', targetRevenue: '', targetGp: '', targetGpPct: '', isOrgTarget: false })
                            }
                            setShowTargetModal(true)
                          }} className="text-xs text-[#1B3875] hover:underline whitespace-nowrap">
                            {salesTargets.find(t => t.userId === user.id && t.year === targetYear && !t.month && !t.isOrgTarget) ? 'แก้ไข' : 'ตั้งเป้า'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {userTargetsThisYear.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">ยังไม่มีพนักงาน Sales</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All targets list (for Admin/CEO) */}
          {isAdminOrCeo && salesTargets.filter(t => t.year === targetYear).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">รายการ Target ทั้งหมด ปี {targetYear}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F4F6FA] border-b border-gray-100">
                    <tr>
                      {['ประเภท','บุคคล/หน่วยงาน','ปี','เดือน','เป้ายอดขาย','เป้า GP','เป้า GP%',''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesTargets.filter(t => t.year === targetYear).map(target => (
                      <tr key={target.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Badge variant={target.isOrgTarget ? 'info' : 'default'}>{target.isOrgTarget ? 'องค์กร' : 'รายบุคคล'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700">{target.userName || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{target.year}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{target.month ? `เดือน ${target.month}` : 'ทั้งปี'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(target.targetRevenue)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(target.targetGp)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{target.targetGpPct}%</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => {
                            setEditingTargetId(target.id)
                            setTargetForm({
                              userId: target.userId ? String(target.userId) : '',
                              year: target.year,
                              month: target.month ? String(target.month) : '',
                              targetRevenue: String(target.targetRevenue),
                              targetGp: String(target.targetGp),
                              targetGpPct: String(target.targetGpPct),
                              isOrgTarget: target.isOrgTarget,
                            })
                            setShowTargetModal(true)
                          }} className="text-blue-500 hover:text-blue-700 transition-colors">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteSalesTarget(target.id)} className="text-red-400 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? 'แก้ไขโอกาสขาย' : t.sales.addOpportunity} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {/* ชื่อโครงการ — ใช้ project_name_options datalist + auto-create */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ชื่อโครงการ <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">— พิมพ์เพื่อเลือกหรือสร้างชื่อโครงการใหม่</span>
            </label>
            <input
              type="text"
              list="opp-project-name-datalist"
              value={form.name}
              onChange={e => handleOppNameChange(e.target.value)}
              onBlur={handleOppNameBlur}
              placeholder="พิมพ์ชื่อโครงการ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
            <datalist id="opp-project-name-datalist">
              {activeProjectNames.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            {form.name && !activeProjectNames.some(p => p.name.toLowerCase() === form.name.toLowerCase()) && (
              <p className="text-xs text-blue-500 mt-1">✨ ชื่อโครงการใหม่ — จะถูกเพิ่มใน Master Data อัตโนมัติเมื่อบันทึก</p>
            )}
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ลูกค้า*</label>
              <select value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ผู้รับผิดชอบ*</label>
            <input type="text" value={form.owner}
              readOnly={isSalesRep}
              onChange={e => { if (isSalesRep) return; setForm({...form, owner: e.target.value}) }}
              className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 ${isSalesRep ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ขั้นตอน</label>
            <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ความน่าจะเป็น (%)</label>
            <input type="number" value={form.probability}
              onChange={e => setForm({...form, probability: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">มูลค่าประมาณการ (฿)</label>
            <input type="number" value={form.value}
              onChange={e => setForm({...form, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ต้นทุนประมาณการ (฿)</label>
            <input type="number" value={form.cost}
              onChange={e => setForm({...form, cost: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">คาดปิดวันที่</label>
            <input type="date" value={form.expectedClose}
              onChange={e => setForm({...form, expectedClose: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
          </div>
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
                ['GP', `${formatCurrency(detailOpp.gp)} (${detailOpp.value > 0 ? ((detailOpp.gp/detailOpp.value)*100).toFixed(1) : 0}%)`],
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
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">โอกาสขาย Won แล้ว</span>
                </div>
                <Button icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => { setShowDetail(null); setWonConfirmId(detailOpp.id) }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
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
                  <button key={s} onClick={() => handleStageChange(detailOpp, s)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-[#1B3875] hover:text-white rounded-lg transition-colors">
                    → {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ============== Won → Create Project Confirmation ============== */}
      <Modal open={wonConfirmId !== null} onClose={() => setWonConfirmId(null)} title="🎉 โอกาสขาย Won!" size="sm">
        {wonConfirmId && (() => {
          const opp = allOpportunities.find(o => o.id === wonConfirmId)
          return (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  {opp?.name}
                </p>
                <p className="text-xs text-green-700">
                  มูลค่า {formatCurrency(opp?.value || 0)} • GP {formatCurrency(opp?.gp || 0)}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                ต้องการสร้างโครงการในระบบโครงการจากโอกาสขายนี้ทันทีหรือไม่?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setWonConfirmId(null)}>ทีหลัง</Button>
                <Button onClick={handleConfirmCreateProject} disabled={creatingProject}
                  icon={<PlusIcon className="w-4 h-4" />}>
                  {creatingProject ? 'กำลังสร้าง...' : 'สร้างโครงการทันที'}
                </Button>
              </div>
            </div>
          )
        })()}
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
                      <Badge variant={q.status === 'Approved' ? 'success' : q.status === 'Rejected' ? 'danger' : 'warning'}>{q.status}</Badge>
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
                        onClick={() => { const items = q.items.map(i => ({...i, total: i.qty * i.unitPrice})); exportToExcel(items, quotationExcelHeaders, quotationExcelKeys, `quotation_${q.no}`) }}>Excel</Button>
                      <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                        onClick={() => { const items = q.items.map(i => ({...i, total: i.qty * i.unitPrice})); exportToPdf(`${q.no} - ${q.customerName}`, quotationExcelHeaders, items, quotationExcelKeys, `quotation_${q.no}`) }}>PDF</Button>
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

      {/* Sales Target Modal */}
      <Modal open={showTargetModal} onClose={() => { setShowTargetModal(false); setEditingTargetId(null) }} title={editingTargetId ? 'แก้ไข Target' : 'ตั้ง Sales Target'} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={targetForm.isOrgTarget}
                onChange={e => setTargetForm(f => ({ ...f, isOrgTarget: e.target.checked, userId: e.target.checked ? '' : f.userId }))}
                className="accent-[#1B3875]"
              />
              <span className="text-sm font-medium text-gray-700">Target ขององค์กร (ไม่ใช่รายบุคคล)</span>
            </label>
          </div>

          {!targetForm.isOrgTarget && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">พนักงาน Sales *</label>
              <select value={targetForm.userId} onChange={e => setTargetForm(f => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                <option value="">-- เลือกพนักงาน --</option>
                {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ปี (Year) *</label>
              <input type="number" value={targetForm.year}
                onChange={e => setTargetForm(f => ({ ...f, year: +e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">เดือน (ว่าง = ทั้งปี)</label>
              <select value={targetForm.month} onChange={e => setTargetForm(f => ({ ...f, month: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                <option value="">ทั้งปี (Annual)</option>
                {['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">เป้ายอดขาย (฿)</label>
              <input type="number" value={targetForm.targetRevenue}
                onChange={e => setTargetForm(f => ({ ...f, targetRevenue: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">เป้า GP (฿)</label>
              <input type="number" value={targetForm.targetGp}
                onChange={e => setTargetForm(f => ({ ...f, targetGp: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">เป้า GP% (ถ้าระบุ)</label>
              <input type="number" value={targetForm.targetGpPct}
                onChange={e => setTargetForm(f => ({ ...f, targetGpPct: e.target.value }))}
                placeholder="เช่น 30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => { setShowTargetModal(false); setEditingTargetId(null) }}>{t.common.cancel}</Button>
          <Button onClick={handleSaveTarget}
            disabled={!targetForm.isOrgTarget && !targetForm.userId}>
            {t.common.save}
          </Button>
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
