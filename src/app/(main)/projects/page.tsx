'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { formatCurrency, formatDate, exportToExcel, exportToPdf } from '@/lib/export'
import Badge, { projectStatusVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

const STATUSES = ['Planning','Waiting for Customer','In Progress','Delayed','On Hold','Completed','Closed']

export default function ProjectsPage() {
  const { lang, projects, milestones, addProject, updateProject, customers } = useAppStore()
  const t = translations[lang]
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<number | null>(null)
  const [form, setForm] = useState({ code: '', name: '', customerId: '', pm: '', type: 'Implementation', contractValue: '', gpTarget: '', startDate: '', targetEnd: '' })

  const filtered = projects.filter(p =>
    (filterStatus === 'all' || p.status === filterStatus) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.customerName.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  )

  const detailProj = showDetail !== null ? projects.find(p => p.id === showDetail) : null
  const detailMilestones = detailProj ? milestones.filter(m => m.projectId === detailProj.id) : []

  const handleAdd = () => {
    const cust = customers.find(c => c.id === +form.customerId)
    addProject({
      id: Date.now(), code: form.code || `PRJ-2026-${String(Date.now()).slice(-3)}`,
      name: form.name, customerId: +form.customerId, customerName: cust?.name || '',
      pm: form.pm, type: form.type, contractValue: +form.contractValue || 0,
      gpTarget: +form.gpTarget || 0, startDate: form.startDate, targetEnd: form.targetEnd,
      status: 'Planning', progress: 0, latestUpdate: '', blocker: null, sourceOppId: null,
    })
    setShowModal(false)
    setForm({ code:'',name:'',customerId:'',pm:'',type:'Implementation',contractValue:'',gpTarget:'',startDate:'',targetEnd:'' })
  }

  const excelHeaders = ['รหัส','ชื่อโครงการ','ลูกค้า','PM','สถานะ','ความคืบหน้า','มูลค่าสัญญา','เริ่มต้น','กำหนดเสร็จ']
  const excelKeys = ['code','name','customerName','pm','status','progress','contractValue','startDate','targetEnd']

  const getProgressColor = (p: number) => p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-blue-500' : p >= 30 ? 'bg-yellow-500' : 'bg-red-400'

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['In Progress','Planning','Delayed','On Hold','Completed'].map(s => {
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
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={() => exportToExcel(filtered, excelHeaders, excelKeys, 'projects')}>Excel</Button>
            <Button variant="outline" size="sm" icon={<DocumentArrowDownIcon className="w-4 h-4" />}
              onClick={() => exportToPdf('Projects', excelHeaders, filtered, excelKeys, 'projects')}>PDF</Button>
            <Button icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowModal(true)}>{t.projects.addProject}</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F6FA] border-b border-gray-100">
              <tr>
                {['รหัส','ชื่อโครงการ','ลูกค้า','PM','สถานะ','ความคืบหน้า','มูลค่าสัญญา','กำหนดเสร็จ',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap font-mono">{p.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate max-w-[200px]">{p.name}</div>
                    {p.blocker && <div className="text-xs text-red-500 mt-0.5 truncate">⚠ {p.blocker}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.pm}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge variant={projectStatusVariant(p.status)}>{p.status}</Badge></td>
                  <td className="px-4 py-3 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className={`${getProgressColor(p.progress)} h-1.5 rounded-full transition-all`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap">{formatCurrency(p.contractValue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(p.targetEnd, lang)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setShowDetail(p.id)} className="text-[#1B3875] hover:underline text-xs">ดู</button>
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

      {/* Add Project Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.projects.addProject} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'รหัสโครงการ', key: 'code', type: 'text' },
            { label: 'ประเภทโครงการ', key: 'type', type: 'type-select' },
            { label: 'ชื่อโครงการ*', key: 'name', type: 'text', span: 2 },
            { label: 'ลูกค้า*', key: 'customerId', type: 'customer-select' },
            { label: 'Project Manager*', key: 'pm', type: 'text' },
            { label: 'มูลค่าสัญญา (฿)', key: 'contractValue', type: 'number' },
            { label: 'GP Target (%)', key: 'gpTarget', type: 'number' },
            { label: 'วันเริ่มต้น', key: 'startDate', type: 'date' },
            { label: 'กำหนดเสร็จ', key: 'targetEnd', type: 'date' },
          ].map(f => (
            <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              {f.type === 'customer-select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : f.type === 'type-select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  {['Implementation','Infrastructure','Software','Security','Consulting'].map(t => <option key={t} value={t}>{t}</option>)}
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
          <Button onClick={handleAdd} disabled={!form.name || !form.customerId}>{t.common.save}</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail !== null} onClose={() => setShowDetail(null)} title="รายละเอียดโครงการ" size="xl">
        {detailProj && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2654]">{detailProj.name}</h2>
                <p className="text-xs text-gray-400">{detailProj.code}</p>
              </div>
              <Badge variant={projectStatusVariant(detailProj.status)}>{detailProj.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ['ลูกค้า', detailProj.customerName],
                ['PM', detailProj.pm],
                ['ประเภท', detailProj.type],
                ['มูลค่าสัญญา', formatCurrency(detailProj.contractValue)],
                ['GP Target', `${detailProj.gpTarget}%`],
                ['ความคืบหน้า', `${detailProj.progress}%`],
                ['วันเริ่มต้น', formatDate(detailProj.startDate, lang)],
                ['กำหนดเสร็จ', formatDate(detailProj.targetEnd, lang)],
                ['อัปเดตล่าสุด', detailProj.latestUpdate || '-'],
              ].map(([k,v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="text-sm font-medium text-gray-700 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {detailProj.blocker && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                ⚠ Blocker: {detailProj.blocker}
              </div>
            )}
            {/* Milestones */}
            <div>
              <h3 className="text-sm font-semibold text-[#0F2654] mb-2">Milestones</h3>
              <div className="space-y-2">
                {detailMilestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg text-sm">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status==='Completed'?'bg-green-500':m.status==='Overdue'?'bg-red-500':m.status==='In Progress'?'bg-blue-500':'bg-gray-300'}`} />
                    <div className="flex-1">{m.name}</div>
                    <div className="text-xs text-gray-400">{formatDate(m.planned, lang)}</div>
                    <Badge variant={m.status==='Completed'?'success':m.status==='Overdue'?'danger':m.status==='In Progress'?'info':'default'}>{m.status}</Badge>
                  </div>
                ))}
                {detailMilestones.length === 0 && <p className="text-xs text-gray-400 text-center py-2">ไม่มี Milestone</p>}
              </div>
            </div>
            {/* Update Progress */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="5"
                  defaultValue={detailProj.progress}
                  onChange={e => updateProject(detailProj.id, { progress: +e.target.value })}
                  className="flex-1 accent-[#1B3875]"
                />
                <span className="text-sm font-medium text-[#1B3875] w-10 text-right">{detailProj.progress}%</span>
                <select defaultValue={detailProj.status}
                  onChange={e => updateProject(detailProj.id, { status: e.target.value })}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
