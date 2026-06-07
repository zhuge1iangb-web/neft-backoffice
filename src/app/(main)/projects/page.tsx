'use client'
import { useState, useEffect, useRef } from 'react'
import { useAppStore, type ProjectExtended, type ProjectWorkLog } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { projectStatusVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  TrashIcon, PaperClipIcon, ClipboardDocumentListIcon, InformationCircleIcon,
  WrenchScrewdriverIcon, ChevronDownIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

// Status sequence — ordered from start to close
const STATUS_SEQUENCE = [
  'Planning',
  'Contract Signed',
  'Kick-off',
  'In Progress',
  'Waiting for Customer',
  'Testing / UAT',
  'Delayed',
  'On Hold',
  'Handover',
  'Completed',
  'Closed',
]

// Progress mapping for each status
const STATUS_PROGRESS: Record<string, number> = {
  'Planning': 5,
  'Contract Signed': 10,
  'Kick-off': 15,
  'In Progress': 40,
  'Waiting for Customer': 50,
  'Testing / UAT': 70,
  'Delayed': 50,
  'On Hold': 50,
  'Handover': 85,
  'Completed': 95,
  'Closed': 100,
}

const ACTION_TYPES = [
  'รายงานความคืบหน้า',
  'ติดตั้งอุปกรณ์',
  'ทดสอบระบบ',
  'ประชุมกับลูกค้า',
  'ส่งมอบงาน',
  'แก้ไขปัญหา',
  'อื่นๆ',
]

function getProgressColor(p: number) {
  return p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-blue-500' : p >= 30 ? 'bg-yellow-500' : 'bg-red-400'
}

// คำนวณวันสิ้นสุดสัญญาจากวันเริ่มต้น + จำนวนวัน
function calcContractEnd(startDate: string, days: string): string {
  if (!startDate || !days || isNaN(+days) || +days <= 0) return ''
  const d = new Date(startDate)
  d.setDate(d.getDate() + parseInt(days))
  return d.toISOString().split('T')[0]
}

// แสดงวันในรูปแบบ Thai-readable
function fmtDateTH(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ---- Upload helper ----
async function uploadFile(file: File, bucket: string, folder: string): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) { console.error('Upload error', error); return null }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export default function ProjectsPage() {
  const {
    lang, projects, users, customers, cmSlaOptions, projectNameOptions,
    addProject, updateProject, deleteProject, addProjectWorkLog, generateProjectNo,
    currentUser,
  } = useAppStore()
  const t = translations[lang]

  // List view state
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'worklog' | 'attachments' | 'pm-schedule'>('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [showWorkLogModal, setShowWorkLogModal] = useState(false)

  // Banner เตือนเลขสัญญา — เก็บ id ที่ user กด dismiss ไปแล้วในรอบนี้
  const [dismissedContractBanner, setDismissedContractBanner] = useState<Set<number>>(new Set())
  const [showContractNoModal, setShowContractNoModal] = useState(false)
  const [contractNoInput, setContractNoInput] = useState('')
  const [contractNoSaving, setContractNoSaving] = useState(false)

  // Add project form
  const emptyForm = {
    name: '', customerId: '', pmUserId: '', type: 'Implementation',
    contractValue: '', description: '',
    workStart: '', workEnd: '',
    contractStart: '', deliveryDays: '',
    pmFrequencyMonths: '', pmFirstDate: '', pmLastDate: '', pmTotalCount: '',
    cmSlaId: '',
  }
  const [form, setForm] = useState(emptyForm)

  // auto-calc contract end ใน Add form
  const contractEndPreview = calcContractEnd(form.contractStart, form.deliveryDays)

  // auto-calc PM last date: pmFirstDate + (pmTotalCount-1) * pmFrequencyMonths months
  function calcPmLastDate(firstDate: string, totalCount: string, freqMonths: string): string {
    if (!firstDate || !totalCount || !freqMonths) return ''
    const count = parseInt(totalCount)
    const freq = parseFloat(freqMonths)
    if (isNaN(count) || count <= 0 || isNaN(freq) || freq <= 0) return ''
    const d = new Date(firstDate)
    // เพิ่มจำนวนเดือน = (count - 1) * freq
    const totalMonthsToAdd = (count - 1) * freq
    const wholeMonths = Math.floor(totalMonthsToAdd)
    const fracDays = Math.round((totalMonthsToAdd - wholeMonths) * 30)
    d.setMonth(d.getMonth() + wholeMonths)
    d.setDate(d.getDate() + fracDays)
    return d.toISOString().split('T')[0]
  }

  const pmLastDatePreview = calcPmLastDate(form.pmFirstDate, form.pmTotalCount, form.pmFrequencyMonths)

  // sync pmLastDate เข้า form อัตโนมัติเมื่อ pmFirstDate/pmTotalCount/pmFrequencyMonths เปลี่ยน
  useEffect(() => {
    const computed = calcPmLastDate(form.pmFirstDate, form.pmTotalCount, form.pmFrequencyMonths)
    if (computed && computed !== form.pmLastDate) {
      setForm(f => ({ ...f, pmLastDate: computed }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pmFirstDate, form.pmTotalCount, form.pmFrequencyMonths])

  // Work log form
  const [wlForm, setWlForm] = useState({
    actionType: ACTION_TYPES[0],
    description: '',
    status: 'In Progress',
    performedByUserId: '' as string,
    attachmentFiles: [] as File[],
  })
  const [wlUploading, setWlUploading] = useState(false)
  const wlFileRef = useRef<HTMLInputElement>(null)

  // Attachment upload (contract / other)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [otherFiles, setOtherFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const contractFileRef = useRef<HTMLInputElement>(null)
  const otherFileRef = useRef<HTMLInputElement>(null)

  // Edit project inline
  const [editForm, setEditForm] = useState<Partial<ProjectExtended>>({})
  const [editMode, setEditMode] = useState(false)
  // auto-calc contractEnd ใน edit form
  const editContractEndPreview = calcContractEnd(
    (editForm.contractStart as string) || '',
    String(editForm.deliveryDays || '')
  )

  const pmUsers = users.filter(u => u.role === 'Project Manager' || u.role === 'Admin' || u.role === 'CEO/Director')
  const detailProj = showDetail !== null ? projects.find(p => p.id === showDetail) : null

  // เมื่อเปิด detail modal ให้ reset dismiss banner ถ้า project เปลี่ยน
  useEffect(() => {
    if (showDetail !== null) {
      setDetailTab('overview')
      setEditMode(false)
      setEditForm({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDetail])

  // เมื่อ wlForm.status เปลี่ยน ให้ set performedBy เป็น currentUser ถ้ายังไม่ได้เลือก
  useEffect(() => {
    if (!wlForm.performedByUserId && currentUser) {
      setWlForm(f => ({ ...f, performedByUserId: String(currentUser.id) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWorkLogModal])

  const filtered = projects.filter(p =>
    (filterStatus === 'all' || p.status === filterStatus) &&
    (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.projectNo || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  // ---- Add Project ----
  const handleAddProject = async () => {
    if (!form.name || !form.customerId || !form.pmUserId) return
    setUploading(true)
    const projNo = await generateProjectNo()
    const pmUser = users.find(u => u.id === +form.pmUserId)
    const cust = customers.find(c => c.id === +form.customerId)

    // Upload contract attachment
    let contractUrl: string | null = null
    if (contractFile) {
      contractUrl = await uploadFile(contractFile, 'project-attachments', `${projNo}/contract`)
    }
    // Upload other files
    const otherAttachments: { name: string; url: string }[] = []
    for (const f of otherFiles) {
      const url = await uploadFile(f, 'project-attachments', `${projNo}/others`)
      if (url) otherAttachments.push({ name: f.name, url })
    }

    const contractEnd = contractEndPreview || null
    const newProj: ProjectExtended = {
      id: Date.now(),
      code: projNo,
      projectNo: projNo,
      name: form.name,
      customerId: +form.customerId,
      customerName: cust?.name || '',
      pm: pmUser?.name || '',
      pmUserId: pmUser?.id || null,
      type: form.type,
      contractValue: +form.contractValue || 0,
      estimatedCost: 0,
      gp: 0,
      gpPct: 0,
      gpTarget: 0,
      startDate: form.workStart || '',
      targetEnd: form.workEnd || '',
      workStart: form.workStart || null,
      workEnd: form.workEnd || null,
      contractStart: form.contractStart || null,
      contractEnd,
      deliveryDays: +form.deliveryDays || null,
      pmFrequencyMonths: +form.pmFrequencyMonths || null,
      pmFirstDate: form.pmFirstDate || null,
      pmLastDate: form.pmLastDate || null,
      pmTotalCount: +form.pmTotalCount || null,
      cmSlaId: +form.cmSlaId || null,
      contractAttachmentUrl: contractUrl,
      otherAttachments,
      projectDescription: form.description || null,
      status: 'Planning',
      progress: 5,
      latestUpdate: 'เริ่มโครงการ',
      blocker: null,
      sourceOppId: null,
      oppNo: null,
      quotationId: null,
      paymentTerm: null as any,
      deliveryPeriod: null as any,
      workLogs: [],
    }

    addProject(newProj)
    setShowAddModal(false)
    setForm(emptyForm)
    setContractFile(null)
    setOtherFiles([])
    setUploading(false)
  }

  // ---- Add Work Log ----
  const handleAddWorkLog = async () => {
    if (!detailProj || !wlForm.description || !wlForm.performedByUserId) return
    setWlUploading(true)
    const urls: string[] = []
    for (const f of wlForm.attachmentFiles) {
      const url = await uploadFile(f, 'project-attachments', `${detailProj.projectNo || detailProj.id}/worklogs`)
      if (url) urls.push(url)
    }
    const newProgress = STATUS_PROGRESS[wlForm.status] ?? detailProj.progress
    const performer = users.find(u => u.id === +wlForm.performedByUserId)
    const log: ProjectWorkLog = {
      id: Date.now(),
      projectId: detailProj.id,
      actionType: wlForm.actionType,
      description: wlForm.description,
      status: wlForm.status,
      progress: newProgress,
      attachmentUrls: urls,
      performedBy: performer?.name || currentUser?.name || 'ระบบ',
      performedById: performer?.id || currentUser?.id || null,
      createdAt: new Date().toISOString(),
    }
    addProjectWorkLog(log)
    setShowWorkLogModal(false)
    setWlForm({ actionType: ACTION_TYPES[0], description: '', status: 'In Progress', performedByUserId: String(currentUser?.id || ''), attachmentFiles: [] })
    setWlUploading(false)
  }

  // helper ปิด contractNo modal
  const closeContractNoModal = () => {
    setShowContractNoModal(false)
    if (detailProj) {
      setDismissedContractBanner(prev => new Set(prev).add(detailProj.id))
    }
  }

  // ---- Save Contract No ----
  const handleSaveContractNo = async () => {
    if (!detailProj || !contractNoInput.trim()) return
    setContractNoSaving(true)
    await updateProject(detailProj.id, { code: contractNoInput.trim(), projectNo: contractNoInput.trim() })
    setShowContractNoModal(false)
    setContractNoSaving(false)
    setContractNoInput('')
  }

  // ---- Save edit ----
  const handleSaveEdit = () => {
    if (!detailProj) return
    // ถ้า contractStart หรือ deliveryDays เปลี่ยน ให้คำนวณ contractEnd ใหม่
    const updatedEdit = { ...editForm }
    if (editContractEndPreview) {
      updatedEdit.contractEnd = editContractEndPreview
    }
    updateProject(detailProj.id, updatedEdit)
    setEditMode(false)
    setEditForm({})
  }

  const excelHeaders = ['รหัส', 'ชื่อโครงการ', 'ลูกค้า', 'PM', 'สถานะ', 'ความคืบหน้า', 'มูลค่าสัญญา', 'เริ่มสัญญา', 'สิ้นสุดสัญญา']
  const excelKeys = ['projectNo', 'name', 'customerName', 'pm', 'status', 'progress', 'contractValue', 'contractStart', 'contractEnd']

  // ---- ตรวจสอบว่า project ที่กำลังดูมีเลขสัญญาไหม ----
  const needsContractBanner = detailProj &&
    (!detailProj.projectNo || detailProj.projectNo === '') &&
    !dismissedContractBanner.has(detailProj.id)

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['In Progress', 'Planning', 'Delayed', 'On Hold', 'Completed'].map(s => {
          const count = projects.filter(p => p.status === s).length
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm cursor-pointer hover:border-[#1B3875]/30 transition-all">
              <div className="text-xl font-bold text-gray-800">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                <Badge variant={projectStatusVariant(s)}>{s}</Badge>
              </div>
            </div>
          )
        })}
      </div>

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
              <option value="all">{t.common.all}</option>
              {STATUS_SEQUENCE.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={() => exportToExcel(filtered, excelHeaders, excelKeys, 'projects')}>Excel</Button>
            <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
              onClick={() => exportToPdf('Projects', excelHeaders, filtered, excelKeys, 'projects')}>PDF</Button>
            <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
              {t.projects.addProject}
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F6FA] border-b border-gray-100">
              <tr>
                {['รหัสโครงการ', 'ชื่อโครงการ', 'ลูกค้า', 'PM', 'สถานะ', 'ความคืบหน้า', 'มูลค่าสัญญา', 'เริ่มสัญญา', 'สิ้นสุดสัญญา', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => { setShowDetail(p.id) }}>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">
                    {p.projectNo || p.code || (
                      <span className="text-amber-500 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" /> ยังไม่มีเลข
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate max-w-[200px] hover:text-[#1B3875]">{p.name}</div>
                    {p.projectDescription && <div className="text-xs text-gray-400 truncate max-w-[200px]">{p.projectDescription}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.pm || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={projectStatusVariant(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className={`${getProgressColor(p.progress)} h-1.5 rounded-full transition-all`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap">{formatCurrency(p.contractValue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.contractStart ? formatDate(p.contractStart, lang) : '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.contractEnd ? formatDate(p.contractEnd, lang) : '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(p.id) }}
                      className="text-gray-300 hover:text-red-500 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">{t.common.noData}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============== ADD PROJECT MODAL ============== */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm(emptyForm); setContractFile(null); setOtherFiles([]) }}
        title="เพิ่มโครงการใหม่" size="xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">

          {/* ส่วน 1: ข้อมูลพื้นฐาน */}
          <div>
            <h3 className="text-xs font-semibold text-[#1B3875] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <InformationCircleIcon className="w-4 h-4" /> ข้อมูลโครงการ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ชื่อโครงการ <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">— เลือกจาก Master Data หรือพิมพ์ใหม่</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="project-name-datalist"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="เลือกหรือพิมพ์ชื่อโครงการ..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20"
                  />
                  <datalist id="project-name-datalist">
                    {(projectNameOptions || []).filter(p => p.isActive).map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
                {(projectNameOptions || []).filter(p => p.isActive).length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">ยังไม่มีชื่อโครงการใน Master Data — <a href="/master" className="text-[#1B3875] underline">เพิ่มได้ที่ Master Data</a></p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ลูกค้า <span className="text-red-500">*</span></label>
                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${!form.customerId ? 'border-gray-200' : 'border-gray-200'}`}>
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Project Manager <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(ต้องระบุ — ใช้อ้างอิงในระบบ Service)</span>
                </label>
                <select value={form.pmUserId} onChange={e => setForm({ ...form, pmUserId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 ${!form.pmUserId ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                  <option value="">-- เลือก PM --</option>
                  {pmUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                {!form.pmUserId && (
                  <p className="text-xs text-red-400 mt-1">กรุณาเลือก PM ก่อนบันทึก</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทโครงการ</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  {['Implementation', 'Infrastructure', 'Software', 'Security', 'Consulting'].map(tt => (
                    <option key={tt} value={tt}>{tt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">มูลค่าสัญญา (฿)</label>
                <input type="number" value={form.contractValue} onChange={e => setForm({ ...form, contractValue: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียดโครงการ</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="รายละเอียดขอบเขตงาน ..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* ส่วน 2: วันที่สัญญาและวันทำงาน */}
          <div>
            <h3 className="text-xs font-semibold text-[#1B3875] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ClipboardDocumentListIcon className="w-4 h-4" /> วันที่สัญญา &amp; วันทำงาน
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันเริ่มต้นสัญญา</label>
                <input type="date" value={form.contractStart} onChange={e => setForm({ ...form, contractStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ระยะเวลาส่งมอบ (วัน)
                  <span className="text-gray-400 font-normal ml-1">— ระบบคำนวณวันสิ้นสุดให้อัตโนมัติ</span>
                </label>
                <input type="number" value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: e.target.value })}
                  placeholder="เช่น 120"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  วันสิ้นสุดสัญญา
                  {contractEndPreview && <span className="text-green-600 font-normal ml-1">✓ คำนวณอัตโนมัติ</span>}
                </label>
                <div className={`w-full px-3 py-2 border rounded-lg text-sm ${contractEndPreview ? 'border-green-200 bg-green-50 text-green-700 font-medium' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                  {contractEndPreview ? fmtDateTH(contractEndPreview) : 'กรอกวันเริ่มต้น + จำนวนวันก่อน'}
                </div>
                {contractEndPreview && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {form.contractStart && fmtDateTH(form.contractStart)} + {form.deliveryDays} วัน = {fmtDateTH(contractEndPreview)}
                  </p>
                )}
              </div>
              <div />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันเริ่มงาน (เริ่มทำงานจริง)</label>
                <input type="date" value={form.workStart} onChange={e => setForm({ ...form, workStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันสิ้นสุดงาน (คาดการณ์)</label>
                <input type="date" value={form.workEnd} onChange={e => setForm({ ...form, workEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
          </div>

          {/* ส่วน 3: CM SLA & PM Schedule */}
          <div>
            <h3 className="text-xs font-semibold text-[#1B3875] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <WrenchScrewdriverIcon className="w-4 h-4" /> CM SLA &amp; กำหนด PM
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  CM SLA
                  <span className="text-gray-400 font-normal ml-1">— ดึงจาก SLA Rule ใน Master Data</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {cmSlaOptions.filter(s => s.id !== undefined).map(s => (
                    <label key={s.id}
                      className={`flex items-start gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${form.cmSlaId === String(s.id) ? 'border-[#1B3875] bg-[#1B3875]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="cmSlaId" value={s.id}
                        checked={form.cmSlaId === String(s.id)}
                        onChange={e => setForm({ ...form, cmSlaId: e.target.value })}
                        className="mt-0.5 accent-[#1B3875]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{s.name}</span>
                          <span className="text-xs text-gray-400">ตอบสนอง {s.responseTimeHours} ชม. | แก้ไข {s.resolutionTimeHours} ชม.</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                      </div>
                    </label>
                  ))}
                  {cmSlaOptions.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">ไม่พบ SLA Rule — กรุณาเพิ่มใน Master Data</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ความถี่การทำ PM (เดือน/ครั้ง)</label>
                <input type="number" value={form.pmFrequencyMonths} onChange={e => setForm({ ...form, pmFrequencyMonths: e.target.value })}
                  placeholder="เช่น 3 (ทุก 3 เดือน)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนครั้ง PM ตลอดสัญญา</label>
                <input type="number" value={form.pmTotalCount} onChange={e => setForm({ ...form, pmTotalCount: e.target.value })}
                  placeholder="เช่น 4"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันทำ PM ครั้งแรก</label>
                <input type="date" value={form.pmFirstDate} onChange={e => setForm({ ...form, pmFirstDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  วันทำ PM ครั้งสุดท้าย
                  {pmLastDatePreview && <span className="text-green-600 font-normal ml-1">✓ คำนวณอัตโนมัติ</span>}
                </label>
                <div className={`w-full px-3 py-2 border rounded-lg text-sm ${pmLastDatePreview ? 'border-green-200 bg-green-50 text-green-700 font-medium' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                  {pmLastDatePreview ? (
                    <>
                      {fmtDateTH(pmLastDatePreview)}
                      <span className="text-xs text-green-500 ml-2 font-normal">
                        (PM ครั้งที่ {form.pmTotalCount}: {fmtDateTH(form.pmFirstDate)} + {form.pmFrequencyMonths && form.pmTotalCount ? `${form.pmFrequencyMonths}×${parseInt(form.pmTotalCount)-1} เดือน` : ''})
                      </span>
                    </>
                  ) : 'กรอกวัน PM แรก + จำนวนครั้ง + ความถี่ก่อน'}
                </div>
              </div>
            </div>
          </div>

          {/* ส่วน 4: เอกสารแนบ */}
          <div>
            <h3 className="text-xs font-semibold text-[#1B3875] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <PaperClipIcon className="w-4 h-4" /> เอกสารแนบ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สัญญา / Contract</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => contractFileRef.current?.click()}
                    className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#1B3875] hover:text-[#1B3875] flex items-center gap-1.5 transition-colors">
                    <PaperClipIcon className="w-4 h-4" />
                    {contractFile ? contractFile.name : 'แนบสัญญา'}
                  </button>
                  <input ref={contractFileRef} type="file" className="hidden"
                    onChange={e => setContractFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เอกสารอื่นๆ</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => otherFileRef.current?.click()}
                    className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#1B3875] hover:text-[#1B3875] flex items-center gap-1.5 transition-colors">
                    <PaperClipIcon className="w-4 h-4" />
                    เพิ่มเอกสาร
                  </button>
                  <input ref={otherFileRef} type="file" multiple className="hidden"
                    onChange={e => setOtherFiles(Array.from(e.target.files || []))} />
                  {otherFiles.map((f, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{f.name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => { setShowAddModal(false); setForm(emptyForm); setContractFile(null); setOtherFiles([]) }}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleAddProject} disabled={!form.name || !form.customerId || !form.pmUserId || uploading}>
            {uploading ? 'กำลังบันทึก...' : t.common.save}
          </Button>
        </div>
      </Modal>

      {/* ============== DETAIL MODAL ============== */}
      <Modal open={showDetail !== null} onClose={() => { setShowDetail(null); setEditMode(false) }} title="รายละเอียดโครงการ" size="xl">
        {detailProj && (
          <div className="space-y-4">

            {/* ⚠️ Banner เตือนเลขสัญญา — แสดงทุกครั้งจนกว่าจะกรอก */}
            {needsContractBanner && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">ยังไม่มีเลขที่สัญญา</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    กรุณากรอกเลขที่สัญญาก่อน — เพื่อใช้อ้างอิงในระบบ Service Ticket, Portal และระบบอื่นๆ ที่เกี่ยวข้อง
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { setContractNoInput(detailProj.projectNo || ''); setShowContractNoModal(true) }}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                    กรอกเลขสัญญา
                  </button>
                  <button onClick={() => setDismissedContractBanner(prev => new Set(prev).add(detailProj.id))}
                    className="px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg text-xs hover:bg-amber-100 transition-colors">
                    ข้ามครั้งนี้
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{detailProj.projectNo || detailProj.code || '—'}</span>
                  <Badge variant={projectStatusVariant(detailProj.status)}>{detailProj.status}</Badge>
                </div>
                <h2 className="text-base font-bold text-[#0F2654] mt-0.5">{detailProj.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{detailProj.customerName} — PM: {detailProj.pm || '-'}</p>
              </div>
              {/* Progress bar */}
              <div className="flex flex-col items-end gap-1 min-w-[100px]">
                <span className="text-lg font-bold text-[#1B3875]">{detailProj.progress}%</span>
                <div className="w-24 bg-gray-100 rounded-full h-2">
                  <div className={`${getProgressColor(detailProj.progress)} h-2 rounded-full transition-all`} style={{ width: `${detailProj.progress}%` }} />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100">
              {([
                { key: 'overview', label: 'ภาพรวม', icon: <InformationCircleIcon className="w-3.5 h-3.5" /> },
                { key: 'worklog', label: 'Work Log', icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> },
                { key: 'attachments', label: 'เอกสาร', icon: <PaperClipIcon className="w-3.5 h-3.5" /> },
                { key: 'pm-schedule', label: 'PM Schedule', icon: <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${detailTab === tab.key ? 'border-[#1B3875] text-[#1B3875]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ---- Overview Tab ---- */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                {!editMode ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {[
                        ['ลูกค้า', detailProj.customerName],
                        ['Project Manager', detailProj.pm || '-'],
                        ['ประเภท', detailProj.type],
                        ['มูลค่าสัญญา', formatCurrency(detailProj.contractValue)],
                        ['วันเริ่มต้นสัญญา', detailProj.contractStart ? fmtDateTH(detailProj.contractStart) : '-'],
                        ['วันสิ้นสุดสัญญา', detailProj.contractEnd ? fmtDateTH(detailProj.contractEnd) : '-'],
                        ['ระยะส่งมอบ', detailProj.deliveryDays ? `${detailProj.deliveryDays} วัน` : '-'],
                        ['วันเริ่มงาน', detailProj.workStart ? fmtDateTH(detailProj.workStart) : '-'],
                        ['วันสิ้นสุดงาน', detailProj.workEnd ? fmtDateTH(detailProj.workEnd) : '-'],
                        ['CM SLA', cmSlaOptions.find(s => s.id === detailProj.cmSlaId)?.name || '-'],
                        ['อัปเดตล่าสุด', detailProj.latestUpdate || '-'],
                      ].map(([k, v]) => (
                        <div key={k as string} className="bg-gray-50 rounded-lg p-2.5">
                          <div className="text-xs text-gray-400">{k}</div>
                          <div className="text-sm font-medium text-gray-700 mt-0.5 break-words">{v}</div>
                        </div>
                      ))}
                    </div>
                    {detailProj.projectDescription && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-gray-700">
                        <div className="text-xs text-gray-400 mb-1">รายละเอียดโครงการ</div>
                        {detailProj.projectDescription}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditMode(true)
                        setEditForm({
                          name: detailProj.name, pm: detailProj.pm,
                          pmUserId: detailProj.pmUserId, type: detailProj.type,
                          contractValue: detailProj.contractValue,
                          contractStart: detailProj.contractStart,
                          contractEnd: detailProj.contractEnd,
                          deliveryDays: detailProj.deliveryDays,
                          workStart: detailProj.workStart,
                          workEnd: detailProj.workEnd,
                          cmSlaId: detailProj.cmSlaId,
                          projectDescription: detailProj.projectDescription,
                        })
                      }}>แก้ไขข้อมูล</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => { setShowDetail(null); setShowDeleteConfirm(detailProj.id) }}>
                        ลบโครงการ
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Edit mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อโครงการ</label>
                        <input type="text" value={(editForm.name as string) || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Project Manager <span className="text-red-500">*</span>
                        </label>
                        <select value={(editForm.pmUserId as number) || ''}
                          onChange={e => {
                            const u = users.find(u => u.id === +e.target.value)
                            setEditForm({ ...editForm, pmUserId: +e.target.value, pm: u?.name || '' })
                          }}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${!editForm.pmUserId ? 'border-red-200' : 'border-gray-200'}`}>
                          <option value="">-- เลือก PM --</option>
                          {pmUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">มูลค่าสัญญา (฿)</label>
                        <input type="number" value={(editForm.contractValue as number) || 0}
                          onChange={e => setEditForm({ ...editForm, contractValue: +e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">วันเริ่มต้นสัญญา</label>
                        <input type="date" value={(editForm.contractStart as string) || ''}
                          onChange={e => setEditForm({ ...editForm, contractStart: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          ระยะเวลาส่งมอบ (วัน)
                          <span className="text-gray-400 font-normal ml-1">— คำนวณวันสิ้นสุดอัตโนมัติ</span>
                        </label>
                        <input type="number" value={(editForm.deliveryDays as number) || ''}
                          onChange={e => setEditForm({ ...editForm, deliveryDays: +e.target.value || null })}
                          placeholder="เช่น 120"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          วันสิ้นสุดสัญญา
                          {editContractEndPreview && <span className="text-green-600 font-normal ml-1">✓ คำนวณอัตโนมัติ</span>}
                        </label>
                        {editContractEndPreview ? (
                          <div className="w-full px-3 py-2 border border-green-200 bg-green-50 rounded-lg text-sm text-green-700 font-medium">
                            {fmtDateTH(editContractEndPreview)}
                          </div>
                        ) : (
                          <input type="date" value={(editForm.contractEnd as string) || ''}
                            onChange={e => setEditForm({ ...editForm, contractEnd: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">CM SLA</label>
                        <select value={(editForm.cmSlaId as number) || ''}
                          onChange={e => setEditForm({ ...editForm, cmSlaId: +e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                          <option value="">-- เลือก SLA --</option>
                          {cmSlaOptions.map(s => (
                            <option key={s.id} value={s.id}>{s.name} — ตอบ {s.responseTimeHours} ชม. | แก้ {s.resolutionTimeHours} ชม.</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียดโครงการ</label>
                        <textarea value={(editForm.projectDescription as string) || ''}
                          onChange={e => setEditForm({ ...editForm, projectDescription: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>บันทึก</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setEditForm({}) }}>ยกเลิก</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- Work Log Tab ---- */}
            {detailTab === 'worklog' && (
              <div className="space-y-3">
                <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowWorkLogModal(true)} size="sm" className="w-full">
                  เพิ่ม Work Log / อัปเดตสถานะ
                </Button>

                {/* Timeline */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {(detailProj.workLogs || []).slice().reverse().map((log, i) => (
                    <div key={log.id ?? i} className="flex gap-3 p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${log.progress >= 100 ? 'bg-green-500' : log.progress >= 70 ? 'bg-blue-500' : 'bg-yellow-400'}`} />
                        {i < (detailProj.workLogs || []).length - 1 && <div className="w-px flex-1 bg-gray-200 min-h-[12px]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 text-xs">{log.actionType}</span>
                            <Badge variant={projectStatusVariant(log.status)}>{log.status}</Badge>
                            <span className="text-xs text-gray-400">{log.progress}%</span>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {log.createdAt ? new Date(log.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="text-gray-600 mt-1 text-xs">{log.description}</div>
                        <div className="text-gray-400 text-xs mt-0.5">โดย: {log.performedBy}</div>
                        {log.attachmentUrls && log.attachmentUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {log.attachmentUrls.map((url, j) => (
                              <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-0.5">
                                <PaperClipIcon className="w-3 h-3" />เอกสาร {j + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(detailProj.workLogs || []).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">ยังไม่มี Work Log — เพิ่มการอัปเดตแรก</p>
                  )}
                </div>
              </div>
            )}

            {/* ---- Attachments Tab ---- */}
            {detailTab === 'attachments' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">สัญญา</h4>
                  {detailProj.contractAttachmentUrl ? (
                    <a href={detailProj.contractAttachmentUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-2 rounded-lg">
                      <PaperClipIcon className="w-4 h-4" /> ดูสัญญา
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400">ยังไม่มีสัญญาแนบ</p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">เอกสารอื่นๆ</h4>
                  {detailProj.otherAttachments && detailProj.otherAttachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detailProj.otherAttachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">
                          <PaperClipIcon className="w-3.5 h-3.5" /> {a.name}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">ยังไม่มีเอกสารอื่นๆ</p>
                  )}
                </div>
              </div>
            )}

            {/* ---- PM Schedule Tab ---- */}
            {detailTab === 'pm-schedule' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['ความถี่ PM', detailProj.pmFrequencyMonths ? `ทุก ${detailProj.pmFrequencyMonths} เดือน` : '-'],
                    ['PM ครั้งแรก', detailProj.pmFirstDate ? fmtDateTH(detailProj.pmFirstDate) : '-'],
                    ['PM ครั้งสุดท้าย', detailProj.pmLastDate ? fmtDateTH(detailProj.pmLastDate) : '-'],
                    ['จำนวน PM ตลอดสัญญา', detailProj.pmTotalCount ? `${detailProj.pmTotalCount} ครั้ง` : '-'],
                    ['CM SLA', cmSlaOptions.find(s => s.id === detailProj.cmSlaId)?.name || '-'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="text-sm font-medium text-gray-700 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                {detailProj.pmFrequencyMonths && detailProj.pmFirstDate && detailProj.pmTotalCount && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ตารางนัด PM</h4>
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                      {Array.from({ length: detailProj.pmTotalCount }).map((_, i) => {
                        const d = new Date(detailProj.pmFirstDate!)
                        d.setMonth(d.getMonth() + i * (detailProj.pmFrequencyMonths!))
                        const isPast = d < new Date()
                        return (
                          <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${isPast ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                            <span>PM ครั้งที่ {i + 1}</span>
                            <span>{d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                            <Badge variant={isPast ? 'success' : 'default'}>{isPast ? 'ผ่านแล้ว' : 'กำหนดการ'}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ============== CONTRACT NO MODAL ============== */}
      <Modal open={showContractNoModal} onClose={closeContractNoModal} title="กรอกเลขที่สัญญา" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
            เลขที่สัญญานี้จะถูกใช้เป็น reference ในทุกระบบที่เกี่ยวข้อง เช่น Service Ticket, Portal, MA Contract — กรุณากรอกให้ถูกต้อง
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">เลขที่สัญญา <span className="text-red-500">*</span></label>
            <input type="text" value={contractNoInput} onChange={e => setContractNoInput(e.target.value)}
              placeholder="เช่น PRJ-2026-0001 หรือ CT-2026-001"
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/20 font-mono" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={closeContractNoModal}>{t.common.cancel}</Button>
          <Button onClick={handleSaveContractNo} disabled={!contractNoInput.trim() || contractNoSaving}>
            {contractNoSaving ? 'กำลังบันทึก...' : 'บันทึกเลขสัญญา'}
          </Button>
        </div>
      </Modal>

      {/* ============== WORK LOG MODAL ============== */}
      <Modal open={showWorkLogModal} onClose={() => setShowWorkLogModal(false)} title="เพิ่ม Work Log" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทงาน</label>
            <div className="relative">
              <select value={wlForm.actionType} onChange={e => setWlForm({ ...wlForm, actionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none appearance-none pr-8">
                {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* ผู้ปฏิบัติงาน — บังคับกรอก อ้างอิงจาก PM */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ผู้ปฏิบัติงาน <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">— ใช้อ้างอิงใน Service Ticket</span>
            </label>
            <div className="relative">
              <select value={wlForm.performedByUserId}
                onChange={e => setWlForm({ ...wlForm, performedByUserId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none appearance-none pr-8 focus:ring-2 focus:ring-[#1B3875]/20 ${!wlForm.performedByUserId ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                <option value="">-- เลือกผู้ปฏิบัติงาน --</option>
                {pmUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {!wlForm.performedByUserId && (
              <p className="text-xs text-red-400 mt-1">กรุณาระบุผู้ปฏิบัติงาน</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">สถานะโครงการหลังอัปเดต</label>
            <div className="relative">
              <select value={wlForm.status} onChange={e => setWlForm({ ...wlForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none appearance-none pr-8">
                {STATUS_SEQUENCE.map(s => (
                  <option key={s} value={s}>{s} ({STATUS_PROGRESS[s]}%)</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className={`${getProgressColor(STATUS_PROGRESS[wlForm.status] || 0)} h-1.5 rounded-full transition-all`}
                  style={{ width: `${STATUS_PROGRESS[wlForm.status] || 0}%` }} />
              </div>
              <span className="text-xs text-gray-500">{STATUS_PROGRESS[wlForm.status] || 0}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด <span className="text-red-500">*</span></label>
            <textarea value={wlForm.description} onChange={e => setWlForm({ ...wlForm, description: e.target.value })}
              rows={3} placeholder="ระบุรายละเอียดสิ่งที่ดำเนินการ..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none focus:ring-2 focus:ring-[#1B3875]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">แนบเอกสาร</label>
            <button type="button" onClick={() => wlFileRef.current?.click()}
              className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#1B3875] hover:text-[#1B3875] flex items-center gap-1.5 transition-colors">
              <PaperClipIcon className="w-4 h-4" />
              {wlForm.attachmentFiles.length > 0 ? `${wlForm.attachmentFiles.length} ไฟล์` : 'เพิ่มไฟล์'}
            </button>
            <input ref={wlFileRef} type="file" multiple className="hidden"
              onChange={e => setWlForm({ ...wlForm, attachmentFiles: Array.from(e.target.files || []) })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowWorkLogModal(false)}>{t.common.cancel}</Button>
          <Button onClick={handleAddWorkLog} disabled={!wlForm.description || !wlForm.performedByUserId || wlUploading}>
            {wlUploading ? 'กำลังบันทึก...' : 'บันทึก Work Log'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={showDeleteConfirm !== null} onClose={() => setShowDeleteConfirm(null)} title="ยืนยันการลบ" size="sm">
        <p className="text-gray-600 text-sm mb-4">คุณแน่ใจว่าต้องการลบโครงการนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>{t.common.cancel}</Button>
          <Button
            onClick={() => { if (showDeleteConfirm) { deleteProject(showDeleteConfirm) } setShowDeleteConfirm(null) }}
            className="bg-red-600 hover:bg-red-700">
            {t.common.delete}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
