'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, type SalesTarget } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { stageBadgeVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  DocumentArrowDownIcon, ArrowRightCircleIcon,
  TrashIcon, PencilSquareIcon, CheckCircleIcon, TrophyIcon,
  ChartBarIcon, CurrencyDollarIcon, ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

const STAGES = ['New Lead','Qualified','Requirement Gathered','Proposal Submitted','Negotiation','Pending Decision','Won','Lost']

export default function SalesPage() {
  const router = useRouter()
  const {
    lang, currentUser, opportunities: allOpportunities,
    addOpportunity, updateOpportunity, deleteOpportunity,
    customers, createProjectFromOpp, addProjectNameOption, projectNameOptions,
    users, salesTargets, addSalesTarget, updateSalesTarget, deleteSalesTarget,
  } = useAppStore()
  const t = translations[lang]

  const isSalesRep = currentUser?.role === 'Sales'
  const isAdminOrCeo = currentUser?.role === 'Admin' || currentUser?.role === 'CEO/Director'
  const opportunities = isSalesRep
    ? allOpportunities.filter(o => o.owner === currentUser?.name)
    : allOpportunities

  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [activeTab, setActiveTab] = useState<'list' | 'targets'>('list')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', customerId: '', stage: 'New Lead', value: '', cost: '',
    probability: '10', expectedClose: '', owner: '', remark: ''
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [wonConfirmId, setWonConfirmId] = useState<number | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

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

  const currentYear = new Date().getFullYear()
  const totalPipeline = filtered.filter(o => o.status === 'active').reduce((s, o) => s + o.value, 0)
  const totalWon = opportunities.filter(o => o.status === 'won').reduce((s, o) => s + o.value, 0)
  const totalGp = opportunities.filter(o => o.status === 'won').reduce((s, o) => s + o.gp, 0)
  const avgGP = filtered.filter(o => o.gp > 0).reduce((s, o) => s + (o.gp / o.value * 100), 0) / (filtered.filter(o => o.gp > 0).length || 1)

  const orgTarget = salesTargets.find(t => t.isOrgTarget && t.year === targetYear && !t.month)
  const orgTargetRevenue = orgTarget?.targetRevenue ?? 0
  const orgTargetGp = orgTarget?.targetGp ?? 0
  const wonThisYear = allOpportunities.filter(o => o.status === 'won')
  const actualRevenue = wonThisYear.reduce((s, o) => s + o.value, 0)
  const actualGp = wonThisYear.reduce((s, o) => s + o.gp, 0)

  const salesUsers = users.filter(u => u.role === 'Sales')
  const userTargetsThisYear = salesUsers.map(u => {
    const target = salesTargets.find(t => t.userId === u.id && t.year === targetYear && !t.month && !t.isOrgTarget)
    const actRev = allOpportunities.filter(o => o.status === 'won' && o.owner === u.name).reduce((s, o) => s + o.value, 0)
    const actGp = allOpportunities.filter(o => o.status === 'won' && o.owner === u.name).reduce((s, o) => s + o.gp, 0)
    return { user: u, targetRevenue: target?.targetRevenue ?? 0, targetGp: target?.targetGp ?? 0, actualRevenue: actRev, actualGp: actGp }
  })

  const handleOppNameBlur = () => {
    if (!form.name.trim()) return
    const exists = (projectNameOptions || []).some(p => p.name.toLowerCase() === form.name.trim().toLowerCase())
    if (!exists) addProjectNameOption(form.name.trim())
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
      if (form.stage === 'Won') setTimeout(() => setWonConfirmId(editingId), 200)
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
      if (form.stage === 'Won') setTimeout(() => setWonConfirmId(newId), 200)
    }
    setShowModal(false)
    setForm({ name: '', customerId: '', stage: 'New Lead', value: '', cost: '', probability: '10', expectedClose: '', owner: '', remark: '' })
  }

  const handleEdit = (opp: typeof opportunities[0]) => {
    setEditingId(opp.id)
    setForm({ name: opp.name, customerId: String(opp.customerId), stage: opp.stage, value: String(opp.value), cost: String(opp.cost), probability: String(opp.probability), expectedClose: opp.expectedClose, owner: opp.owner, remark: '' })
    setShowModal(true)
  }

  const handleStageChange = (opp: typeof opportunities[0], newStage: string) => {
    updateOpportunity(opp.id, {
      stage: newStage,
      status: newStage === 'Won' ? 'won' : newStage === 'Lost' ? 'lost' : 'active'
    })
    setShowDetail(null)
    if (newStage === 'Won') setTimeout(() => setWonConfirmId(opp.id), 200)
  }

  const handleConfirmCreateProject = async () => {
    if (!wonConfirmId) return
    setCreatingProject(true)
    await createProjectFromOpp(wonConfirmId)
    setCreatingProject(false)
    setWonConfirmId(null)
    router.push('/projects')
  }

  const handleSaveTarget = () => {
    const data = {
      userId: targetForm.isOrgTarget ? null : (+targetForm.userId || null),
      userName: targetForm.isOrgTarget ? (lang === 'th' ? 'องค์กร' : 'Organization') : (users.find(u => u.id === +targetForm.userId)?.name || ''),
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
  const excelHeaders = [t.sales.projectName || 'Project Name', t.common.customer, t.sales.stage, t.sales.value, t.sales.estimatedGP, t.sales.probability, t.sales.expectedClose, t.common.owner]
  const excelKeys = ['name','customerName','stage','value','gp','probability','expectedClose','owner']
  const activeProjectNames = (projectNameOptions || []).filter(p => p.isActive)

  const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const months = lang === 'th' ? thMonths : enMonths

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lang === 'th' ? 'Pipeline รวม' : 'Total Pipeline'}</div>
          <div className="text-xl font-bold text-[#1B3875] dark:text-blue-400">{formatCurrency(totalPipeline)}</div>
          <div className="text-xs text-gray-400">{filtered.filter(o=>o.status==='active').length} {lang === 'th' ? 'โอกาสขาย' : 'opportunities'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lang === 'th' ? 'Won ปีนี้' : 'Won This Year'}</div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(totalWon)}</div>
          <div className="text-xs text-gray-400">{opportunities.filter(o=>o.status==='won').length} deals</div>
          {orgTargetRevenue > 0 && (
            <div className="mt-1">
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1 mt-0.5">
                <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100,(totalWon/orgTargetRevenue)*100)}%` }} />
              </div>
              <div className={`text-xs mt-0.5 font-medium ${totalWon >= orgTargetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                {totalWon >= orgTargetRevenue ? `+${formatCurrency(totalWon-orgTargetRevenue)}` : `${lang==='th'?'ขาด ':'Gap '}${formatCurrency(orgTargetRevenue-totalWon)}`}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lang === 'th' ? 'GP Won ปีนี้' : 'GP Won This Year'}</div>
          <div className="text-xl font-bold text-purple-600">{formatCurrency(totalGp)}</div>
          <div className="text-xs text-gray-400">{lang === 'th' ? 'เฉลี่ย' : 'Avg'} {avgGP.toFixed(1)}%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lang === 'th' ? 'Follow-up วันนี้' : "Today's Follow-up"}</div>
          <div className="text-xl font-bold text-orange-600">
            {opportunities.filter(o => o.nextFollowUp === new Date().toISOString().split('T')[0]).length}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`${t.common.search}...`}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
              />
            </div>
            {activeTab === 'list' && (
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none text-gray-600">
                <option value="all">{t.common.all}</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {(['list','targets'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab===tab ? 'bg-white dark:bg-gray-600 shadow text-[#1B3875] dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tab === 'list' ? (lang === 'th' ? 'รายการ' : 'List') : `🎯 ${lang === 'th' ? 'Target' : 'Target'}`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === 'list' && (
              <>
                <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                  onClick={() => exportToExcel(filtered, excelHeaders, excelKeys, 'sales_opportunities')}>Excel</Button>
                <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                  onClick={() => exportToPdf('Sales Opportunities', excelHeaders, filtered, excelKeys, 'sales_opportunities')}>PDF</Button>
              </>
            )}
            {activeTab === 'targets' && isAdminOrCeo && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditingTargetId(null); setShowTargetModal(true) }}>
                {lang === 'th' ? 'ตั้ง Target' : 'Set Target'}
              </Button>
            )}
            {activeTab === 'list' && (
              <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => {
                setEditingId(null)
                setForm({ name: '', customerId: '', stage: 'New Lead', value: '', cost: '', probability: '10', expectedClose: '', owner: isSalesRep ? (currentUser?.name || '') : '', remark: '' })
                setShowModal(true)
              }}>{t.sales.addOpportunity}</Button>
            )}
          </div>
        </div>
      </div>

      {/* List View */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FA] dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {[
                    lang==='th'?'เลขที่':'No.',
                    lang==='th'?'ชื่อโครงการ':'Project Name',
                    lang==='th'?'ลูกค้า':'Customer',
                    lang==='th'?'ขั้นตอน':'Stage',
                    lang==='th'?'มูลค่า':'Value',
                    'GP%',
                    lang==='th'?'คาดปิด':'Exp. Close',
                    lang==='th'?'ผู้รับผิดชอบ':'Owner',
                    '',
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{o.no}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px] cursor-pointer hover:text-[#1B3875]" onClick={() => setShowDetail(o.id)}>{o.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{o.customerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Badge variant={stageBadgeVariant(o.stage)}>{o.stage}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{formatCurrency(o.value)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {o.value > 0 ? `${((o.gp/o.value)*100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(o.expectedClose, lang)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{o.owner}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setShowDetail(o.id)} className="text-[#1B3875] hover:text-[#0F2654] dark:text-blue-400 transition-colors">
                        <ArrowRightCircleIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(o)} className="text-blue-500 hover:text-blue-700 transition-colors">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(o.id)} className="text-red-500 hover:text-red-700 transition-colors">
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

      {/* ============== TARGETS TAB ============== */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{lang === 'th' ? 'แสดงเป้าปี:' : 'Show Year:'}</span>
            <select value={targetYear} onChange={e => setTargetYear(+e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none">
              {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollarIcon className="w-4 h-4 text-[#1B3875]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{lang === 'th' ? `เป้ายอดขายองค์กร ปี ${targetYear}` : `Org Revenue Target ${targetYear}`}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'th' ? 'เป้า' : 'Target'}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(orgTargetRevenue)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'th' ? 'ยอดจริง' : 'Actual'}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(actualRevenue)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${actualRevenue >= orgTargetRevenue ? 'bg-green-500' : 'bg-[#1B3875]'}`}
                    style={{ width: `${orgTargetRevenue > 0 ? Math.min(100,(actualRevenue/orgTargetRevenue)*100) : 0}%` }} />
                </div>
                <div className={`text-xs font-semibold ${actualRevenue >= orgTargetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                  {orgTargetRevenue > 0
                    ? (actualRevenue >= orgTargetRevenue
                      ? `✅ ${lang==='th'?'เกินเป้า':' Exceeded'} +${formatCurrency(actualRevenue-orgTargetRevenue)}`
                      : `⚠️ ${lang==='th'?'ขาด':'Gap'} ${formatCurrency(orgTargetRevenue-actualRevenue)}`)
                    : (lang==='th'?'ยังไม่ตั้งเป้า':'No target set')}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{lang === 'th' ? `เป้า GP องค์กร ปี ${targetYear}` : `Org GP Target ${targetYear}`}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang==='th'?'เป้า GP':'GP Target'}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(orgTargetGp)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang==='th'?'GP จริง':'Actual GP'}</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(actualGp)}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${actualGp >= orgTargetGp ? 'bg-green-500' : 'bg-purple-500'}`}
                    style={{ width: `${orgTargetGp > 0 ? Math.min(100,(actualGp/orgTargetGp)*100) : 0}%` }} />
                </div>
                <div className={`text-xs font-semibold ${actualGp >= orgTargetGp ? 'text-green-600' : 'text-orange-500'}`}>
                  {orgTargetGp > 0
                    ? (actualGp >= orgTargetGp
                      ? `✅ ${lang==='th'?'เกินเป้า GP':'GP Exceeded'}`
                      : `⚠️ ${lang==='th'?'ขาด':'Gap'} ${formatCurrency(orgTargetGp-actualGp)}`)
                    : (lang==='th'?'ยังไม่ตั้งเป้า GP':'No GP target')}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <TrophyIcon className="w-4 h-4 text-yellow-500" /> {lang==='th'?`เป้าหมายรายบุคคล ปี ${targetYear}`:`Individual Targets ${targetYear}`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F6FA] dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {[
                      lang==='th'?'พนักงาน':'Staff',
                      lang==='th'?'เป้ายอดขาย':'Revenue Target',
                      lang==='th'?'ยอดจริง':'Actual',
                      lang==='th'?'ได้/ขาด':'Gap',
                      lang==='th'?'เป้า GP':'GP Target',
                      lang==='th'?'GP จริง':'GP Actual',
                      lang==='th'?'ได้/ขาด GP':'GP Gap',
                      '',
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userTargetsThisYear.map(({ user, targetRevenue, targetGp, actualRevenue: actRev, actualGp: actGp }) => (
                    <tr key={user.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.role}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {targetRevenue > 0 ? formatCurrency(targetRevenue) : <span className="text-gray-300">{lang==='th'?'ยังไม่ตั้งเป้า':'—'}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-green-600 whitespace-nowrap">{formatCurrency(actRev)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {targetRevenue > 0 ? (
                          <span className={`text-xs font-semibold ${actRev >= targetRevenue ? 'text-green-600' : 'text-orange-500'}`}>
                            {actRev >= targetRevenue ? `+${formatCurrency(actRev-targetRevenue)}` : `-${formatCurrency(targetRevenue-actRev)}`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {targetGp > 0 ? formatCurrency(targetGp) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-purple-600 whitespace-nowrap">{formatCurrency(actGp)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {targetGp > 0 ? (
                          <span className={`text-xs font-semibold ${actGp >= targetGp ? 'text-green-600' : 'text-orange-500'}`}>
                            {actGp >= targetGp ? `+${formatCurrency(actGp-targetGp)}` : `-${formatCurrency(targetGp-actGp)}`}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isAdminOrCeo && (
                          <button onClick={() => {
                            const existing = salesTargets.find(t => t.userId === user.id && t.year === targetYear && !t.month && !t.isOrgTarget)
                            if (existing) {
                              setEditingTargetId(existing.id)
                              setTargetForm({ userId: String(user.id), year: targetYear, month: '', targetRevenue: String(existing.targetRevenue), targetGp: String(existing.targetGp), targetGpPct: String(existing.targetGpPct), isOrgTarget: false })
                            } else {
                              setEditingTargetId(null)
                              setTargetForm({ userId: String(user.id), year: targetYear, month: '', targetRevenue: '', targetGp: '', targetGpPct: '', isOrgTarget: false })
                            }
                            setShowTargetModal(true)
                          }} className="text-xs text-[#1B3875] dark:text-blue-400 hover:underline whitespace-nowrap">
                            {salesTargets.find(t => t.userId === user.id && t.year === targetYear && !t.month && !t.isOrgTarget) ? (lang==='th'?'แก้ไข':'Edit') : (lang==='th'?'ตั้งเป้า':'Set Target')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {userTargetsThisYear.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">{lang==='th'?'ยังไม่มีพนักงาน Sales':'No Sales staff found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isAdminOrCeo && salesTargets.filter(t => t.year === targetYear).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{lang==='th'?`รายการ Target ทั้งหมด ปี ${targetYear}`:`All Targets ${targetYear}`}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F4F6FA] dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {[lang==='th'?'ประเภท':'Type', lang==='th'?'บุคคล/หน่วยงาน':'Person/Org', lang==='th'?'ปี':'Year', lang==='th'?'เดือน':'Month', lang==='th'?'เป้ายอดขาย':'Revenue Target', lang==='th'?'เป้า GP':'GP Target', 'GP%', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesTargets.filter(t => t.year === targetYear).map(target => (
                      <tr key={target.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <Badge variant={target.isOrgTarget ? 'info' : 'default'}>{target.isOrgTarget ? (lang==='th'?'องค์กร':'Org') : (lang==='th'?'รายบุคคล':'Personal')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">{target.userName || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{target.year}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{target.month ? `${lang==='th'?'เดือน ':'Month '}${target.month}` : (lang==='th'?'ทั้งปี':'Annual')}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{formatCurrency(target.targetRevenue)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{formatCurrency(target.targetGp)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{target.targetGpPct}%</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => {
                            setEditingTargetId(target.id)
                            setTargetForm({ userId: target.userId ? String(target.userId) : '', year: target.year, month: target.month ? String(target.month) : '', targetRevenue: String(target.targetRevenue), targetGp: String(target.targetGp), targetGpPct: String(target.targetGpPct), isOrgTarget: target.isOrgTarget })
                            setShowTargetModal(true)
                          }} className="text-blue-500 hover:text-blue-700 transition-colors"><PencilSquareIcon className="w-4 h-4" /></button>
                          <button onClick={() => deleteSalesTarget(target.id)} className="text-red-400 hover:text-red-600 transition-colors"><TrashIcon className="w-4 h-4" /></button>
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

      {/* Add/Edit Opportunity Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} title={editingId ? (lang==='th'?'แก้ไขโอกาสขาย':'Edit Opportunity') : t.sales.addOpportunity} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {lang==='th'?'ชื่อโครงการ':'Project Name'} <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">{lang==='th'?'— พิมพ์หรือเลือกจาก Master Data':'— Type or select from Master Data'}</span>
            </label>
            <input type="text" list="opp-project-name-datalist" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onBlur={handleOppNameBlur}
              placeholder={lang==='th'?'พิมพ์ชื่อโครงการ...':'Type project name...'}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
            />
            <datalist id="opp-project-name-datalist">
              {activeProjectNames.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            {form.name && !activeProjectNames.some(p => p.name.toLowerCase() === form.name.toLowerCase()) && (
              <p className="text-xs text-blue-500 mt-1">✨ {lang==='th'?'ชื่อโครงการใหม่ — จะถูกเพิ่มใน Master Data อัตโนมัติ':'New project name — will be auto-added to Master Data'}</p>
            )}
          </div>

          {!editingId && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ลูกค้า':'Customer'}*</label>
              <select value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                <option value="">-- {lang==='th'?'เลือกลูกค้า':'Select Customer'} --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ผู้รับผิดชอบ':'Owner'}*</label>
            <input type="text" value={form.owner}
              readOnly={isSalesRep}
              onChange={e => { if (isSalesRep) return; setForm({...form, owner: e.target.value}) }}
              className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 ${isSalesRep ? 'bg-gray-50 dark:bg-gray-600 text-gray-500 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ขั้นตอน':'Stage'}</label>
            <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ความน่าจะเป็น (%)':'Probability (%)'}</label>
            <input type="number" value={form.probability} onChange={e => setForm({...form, probability: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'มูลค่าประมาณการ (฿)':'Estimated Value (฿)'}</label>
            <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ต้นทุนประมาณการ (฿)':'Estimated Cost (฿)'}</label>
            <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'คาดปิดวันที่':'Expected Close Date'}</label>
            <input type="date" value={form.expectedClose} onChange={e => setForm({...form, expectedClose: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20" />
          </div>

          {/* FlowAccount Quotation Button */}
          <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <a href="https://auth.flowaccount.com/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              {lang==='th' ? '📄 สร้างใบเสนอราคา (FlowAccount)' : '📄 Create Quotation (FlowAccount)'}
            </a>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
              {lang==='th' ? 'จะเปิด FlowAccount ในแท็บใหม่' : 'Opens FlowAccount in a new tab'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" onClick={() => { setShowModal(false); setEditingId(null) }}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={!form.name || (!editingId && !form.customerId)}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail !== null} onClose={() => setShowDetail(null)} title={lang==='th'?'รายละเอียดโอกาสขาย':'Opportunity Details'} size="lg">
        {detailOpp && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2654] dark:text-blue-300">{detailOpp.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{detailOpp.no}</p>
              </div>
              <Badge variant={stageBadgeVariant(detailOpp.stage)}>{detailOpp.stage}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [lang==='th'?'ลูกค้า':'Customer', detailOpp.customerName],
                [lang==='th'?'ผู้รับผิดชอบ':'Owner', detailOpp.owner],
                [lang==='th'?'มูลค่า':'Value', formatCurrency(detailOpp.value)],
                [lang==='th'?'ต้นทุน':'Cost', formatCurrency(detailOpp.cost)],
                ['GP', `${formatCurrency(detailOpp.gp)} (${detailOpp.value > 0 ? ((detailOpp.gp/detailOpp.value)*100).toFixed(1) : 0}%)`],
                [lang==='th'?'ความน่าจะเป็น':'Probability', `${detailOpp.probability}%`],
                [lang==='th'?'คาดปิด':'Exp. Close', formatDate(detailOpp.expectedClose, lang)],
                [lang==='th'?'Follow-up ถัดไป':'Next Follow-up', formatDate(detailOpp.nextFollowUp, lang)],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="font-medium text-gray-700 dark:text-gray-200 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {detailOpp.status === 'won' && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800 dark:text-green-400">{lang==='th'?'โอกาสขาย Won แล้ว':'Opportunity Won!'}</span>
                </div>
                <Button icon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => { setShowDetail(null); setWonConfirmId(detailOpp.id) }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
                  {lang==='th'?'สร้างโครงการจากโอกาสขายนี้':'Create Project from This'}
                </Button>
              </div>
            )}

            {detailOpp.status === 'active' && (
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex-wrap">
                {STAGES.map(s => s !== detailOpp.stage && (
                  <button key={s} onClick={() => handleStageChange(detailOpp, s)}
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-[#1B3875] hover:text-white rounded-lg transition-colors dark:text-gray-300">
                    → {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Won → Create Project Confirmation */}
      <Modal open={wonConfirmId !== null} onClose={() => setWonConfirmId(null)} title={lang==='th'?'🎉 โอกาสขาย Won!':'🎉 Opportunity Won!'} size="sm">
        {wonConfirmId && (() => {
          const opp = allOpportunities.find(o => o.id === wonConfirmId)
          return (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-400 mb-1">{opp?.name}</p>
                <p className="text-xs text-green-700 dark:text-green-500">{lang==='th'?'มูลค่า':'Value'} {formatCurrency(opp?.value || 0)} • GP {formatCurrency(opp?.gp || 0)}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {lang==='th'?'ต้องการสร้างโครงการในระบบโครงการจากโอกาสขายนี้ทันทีหรือไม่?':'Create a project from this opportunity now?'}
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setWonConfirmId(null)}>{lang==='th'?'ทีหลัง':'Later'}</Button>
                <Button onClick={handleConfirmCreateProject} disabled={creatingProject} icon={<PlusIcon className="w-4 h-4" />}>
                  {creatingProject ? (lang==='th'?'กำลังสร้าง...':'Creating...') : (lang==='th'?'สร้างโครงการทันที':'Create Project Now')}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Sales Target Modal */}
      <Modal open={showTargetModal} onClose={() => { setShowTargetModal(false); setEditingTargetId(null) }} title={editingTargetId ? (lang==='th'?'แก้ไข Target':'Edit Target') : (lang==='th'?'ตั้ง Sales Target':'Set Sales Target')} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={targetForm.isOrgTarget}
                onChange={e => setTargetForm(f => ({ ...f, isOrgTarget: e.target.checked, userId: e.target.checked ? '' : f.userId }))}
                className="accent-[#1B3875]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{lang==='th'?'Target ขององค์กร (ไม่ใช่รายบุคคล)':'Organization Target (not personal)'}</span>
            </label>
          </div>
          {!targetForm.isOrgTarget && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'พนักงาน Sales *':'Sales Staff *'}</label>
              <select value={targetForm.userId} onChange={e => setTargetForm(f => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20">
                <option value="">-- {lang==='th'?'เลือกพนักงาน':'Select Staff'} --</option>
                {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'ปี (Year) *':'Year *'}</label>
              <input type="number" value={targetForm.year} onChange={e => setTargetForm(f => ({ ...f, year: +e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'เดือน (ว่าง = ทั้งปี)':'Month (empty = annual)'}</label>
              <select value={targetForm.month} onChange={e => setTargetForm(f => ({ ...f, month: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none">
                <option value="">{lang==='th'?'ทั้งปี (Annual)':'Annual'}</option>
                {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'เป้ายอดขาย (฿)':'Revenue Target (฿)'}</label>
              <input type="number" value={targetForm.targetRevenue} onChange={e => setTargetForm(f => ({ ...f, targetRevenue: e.target.value }))} placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'เป้า GP (฿)':'GP Target (฿)'}</label>
              <input type="number" value={targetForm.targetGp} onChange={e => setTargetForm(f => ({ ...f, targetGp: e.target.value }))} placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lang==='th'?'เป้า GP%':'GP% Target'}</label>
              <input type="number" value={targetForm.targetGpPct} onChange={e => setTargetForm(f => ({ ...f, targetGpPct: e.target.value }))} placeholder="30"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="ghost" onClick={() => { setShowTargetModal(false); setEditingTargetId(null) }}>{t.common.cancel}</Button>
          <Button onClick={handleSaveTarget} disabled={!targetForm.isOrgTarget && !targetForm.userId}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={showDeleteConfirm !== null} onClose={() => setShowDeleteConfirm(null)} title={lang==='th'?'ยืนยันการลบ':'Confirm Delete'} size="sm">
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{lang==='th'?'คุณแน่ใจว่าต้องการลบโอกาสขายนี้?':'Are you sure you want to delete this opportunity?'}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>{t.common.cancel}</Button>
          <Button onClick={() => { if (showDeleteConfirm) deleteOpportunity(showDeleteConfirm); setShowDeleteConfirm(null) }} className="bg-red-600 hover:bg-red-700">{t.common.delete}</Button>
        </div>
      </Modal>
    </div>
  )
}
