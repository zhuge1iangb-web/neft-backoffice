/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, hasSupabase } from '@/lib/supabase'
import { notifyTicketEvent } from '@/lib/notify'
import {
  demoUsers, demoCustomers, demoOpportunities, demoProjects,
  demoMilestones, demoInvoices, demoTickets, demoContracts, demoNotifications,
  demoVendors, demoQuotations, demoPurchaseOrders, demoInventory,
  demoProjectTypes, demoPaymentTerms, demoDeliveryPeriods, generateNo
} from '@/lib/demo-data'
import type { Lang } from '@/lib/translations'

type User = typeof demoUsers[number]

export type CustomerPortalAccount = {
  id: number
  name: string
  company: string
  email: string
  password: string
  customerId: number
  active: boolean
  createdAt: string
  lastLogin: string | null
  // Contact & notification fields (multi-value)
  phones: string[]        // เบอร์โทรศัพท์ได้หลายเบอร์
  emails: string[]        // email ติดต่อ (อาจต่างจาก login email)
  lineIds: string[]       // LINE ID ได้หลายรายการ
  lineNotifyTokens: string[]  // LINE Notify token สำหรับส่งแจ้งเตือน
  notifyViaEmail: boolean // เปิด/ปิด แจ้งเตือนทาง email
  notifyViaLine: boolean  // เปิด/ปิด แจ้งเตือนทาง LINE
}

interface AppState {
  currentUser: User | null
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  lang: Lang
  setLang: (l: Lang) => void
  initialized: boolean
  initialize: () => Promise<void>
  realtimeSubscribed: boolean
  subscribeRealtime: () => void
  customers: typeof demoCustomers
  opportunities: typeof demoOpportunities
  projects: ProjectExtended[]
  projectWorkLogs: ProjectWorkLog[]
  cmSlaOptions: { id: number; name: string; responseTimeHours: number; resolutionTimeHours: number; description: string }[]
  milestones: typeof demoMilestones
  invoices: typeof demoInvoices
  tickets: typeof demoTickets
  contracts: typeof demoContracts
  notifications: typeof demoNotifications
  users: typeof demoUsers
  vendors: typeof demoVendors
  quotations: typeof demoQuotations
  purchaseOrders: typeof demoPurchaseOrders
  inventory: typeof demoInventory
  projectTypes: typeof demoProjectTypes
  paymentTerms: typeof demoPaymentTerms
  deliveryPeriods: typeof demoDeliveryPeriods
  // CM SLA Options
  addCmSla: (data: { name: string; responseTimeHours: number; resolutionTimeHours: number; description: string }) => void
  updateCmSla: (id: number, data: { name: string; responseTimeHours: number; resolutionTimeHours: number; description: string }) => void
  deleteCmSla: (id: number) => void
  // Project Name Options
  projectNameOptions: { id: number; name: string; isActive: boolean; createdAt: string }[]
  addProjectNameOption: (name: string) => void
  updateProjectNameOption: (id: number, data: { name: string; isActive: boolean }) => void
  deleteProjectNameOption: (id: number) => void
  // Customers
  addCustomer: (customer: typeof demoCustomers[number]) => void
  updateCustomer: (id: number, data: Partial<typeof demoCustomers[number]>) => void
  deleteCustomer: (id: number) => void
  // Opportunities
  addOpportunity: (opp: typeof demoOpportunities[number]) => void
  updateOpportunity: (id: number, data: Partial<typeof demoOpportunities[number]>) => void
  deleteOpportunity: (id: number) => void
  // Projects
  addProject: (proj: ProjectExtended) => void
  updateProject: (id: number, data: Partial<ProjectExtended>) => void
  deleteProject: (id: number) => void
  createProjectFromOpp: (oppId: number) => void
  addProjectWorkLog: (log: ProjectWorkLog) => void
  generateProjectNo: () => Promise<string>
  // Vendors
  addVendor: (vendor: typeof demoVendors[number]) => void
  updateVendor: (id: number, data: Partial<typeof demoVendors[number]>) => void
  deleteVendor: (id: number) => void
  // Quotations
  addQuotation: (q: typeof demoQuotations[number]) => void
  updateQuotation: (id: number, data: Partial<typeof demoQuotations[number]>) => void
  deleteQuotation: (id: number) => void
  // Purchase Orders
  addPurchaseOrder: (po: typeof demoPurchaseOrders[number]) => void
  updatePurchaseOrder: (id: number, data: Partial<typeof demoPurchaseOrders[number]>) => void
  deletePurchaseOrder: (id: number) => void
  // Inventory
  addInventoryItem: (item: typeof demoInventory[number]) => void
  updateInventoryItem: (id: number, data: Partial<typeof demoInventory[number]>) => void
  deleteInventoryItem: (id: number) => void
  // Master data
  addProjectType: (name: string) => void
  addPaymentTerm: (name: string) => void
  addDeliveryPeriod: (name: string) => void
  // Invoices
  addInvoice: (inv: typeof demoInvoices[number]) => void
  updateInvoice: (id: number, data: Partial<typeof demoInvoices[number]>) => void
  deleteInvoice: (id: number) => void
  // Tickets
  addTicket: (ticket: typeof demoTickets[number]) => void
  updateTicket: (id: number, data: Partial<typeof demoTickets[number]>) => void
  deleteTicket: (id: number) => void
  addWorkLog: (ticketId: number, log: import('@/lib/demo-data').WorkLog) => void
  // Contracts
  updateContract: (id: number, data: Partial<typeof demoContracts[number]>) => void
  deleteContract: (id: number) => void
  // Milestones
  addMilestone: (milestone: typeof demoMilestones[number]) => void
  updateMilestone: (id: number, data: Partial<typeof demoMilestones[number]>) => void
  deleteMilestone: (id: number) => void
  // Notifications
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  addNotification: (n: typeof demoNotifications[number]) => void
  // Users (Staff)
  addUser: (user: typeof demoUsers[number]) => void
  updateUser: (id: number, data: Partial<typeof demoUsers[number]>) => void
  deleteUser: (id: number) => void
  // Customer Portal Accounts
  customerPortalAccounts: CustomerPortalAccount[]
  addCustomerPortalAccount: (account: CustomerPortalAccount) => void
  updateCustomerPortalAccount: (id: number, data: Partial<CustomerPortalAccount>) => void
  deleteCustomerPortalAccount: (id: number) => void
}

async function syncToSupabase(key: string, value: any) {
  if (!hasSupabase || !supabase) return
  try {
    await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() })
  } catch (e) {
    console.error('Supabase sync error:', e)
  }
}

// ---- Tickets: relational row-level sync (replaces JSON-blob full-array upsert) ----
// Each ticket lives as its own row in `tickets`, with work logs in a child
// table `ticket_work_logs`. Mutations only touch the affected row(s), so
// concurrent edits/deletes from different users no longer overwrite each other.

type TicketRow = typeof demoTickets[number]
type TicketWorkLog = import('@/lib/demo-data').WorkLog

// ---- Project Work Log type (parallel to TicketWorkLog) ----
export type ProjectWorkLog = {
  id: number
  projectId: number
  actionType: string
  description: string
  status: string
  progress: number
  attachmentUrls: string[]
  performedBy: string
  performedById: number | null
  createdAt: string
}

// ---- Extended Project type (adds new fields from Wave B migration) ----
export type ProjectExtended = typeof demoProjects[number] & {
  projectNo?: string | null
  workStart?: string | null
  workEnd?: string | null
  contractStart?: string | null
  contractEnd?: string | null
  deliveryDays?: number | null
  pmUserId?: number | null
  pmFrequencyMonths?: number | null
  pmFirstDate?: string | null
  pmLastDate?: string | null
  pmTotalCount?: number | null
  cmSlaId?: number | null
  contractAttachmentUrl?: string | null
  otherAttachments?: { name: string; url: string }[]
  projectDescription?: string | null
  workLogs?: ProjectWorkLog[]
}

function ticketToRow(t: TicketRow) {
  return {
    id: t.id,
    no: t.no,
    customer_id: t.customerId ?? null,
    customer_name: t.customerName ?? null,
    subject: t.subject ?? null,
    severity: t.severity ?? null,
    channel: t.channel ?? null,
    contact_name: t.contactName ?? null,
    contact_phone: t.contactPhone ?? null,
    contact_email: t.contactEmail ?? null,
    assigned_to: t.assignedTo ?? null,
    status: t.status ?? null,
    created_at: t.createdAt ?? new Date().toISOString(),
    response_due: t.responseDue ?? null,
    resolution_due: t.resolutionDue ?? null,
    sla_status: t.slaStatus ?? null,
    contract_id: t.contractId ?? null,
    description: t.description ?? null,
    escalation_level: t.escalationLevel ?? null,
    escalated_to: t.escalatedTo ?? null,
    escalated_at: t.escalatedAt ?? null,
    escalation_reason: t.escalationReason ?? null,
    root_cause: t.rootCause ?? null,
    resolution: t.resolution ?? null,
    resolved_at: t.resolvedAt ?? null,
    closed_at: t.closedAt ?? null,
    updated_at: new Date().toISOString(),
  }
}

function rowToTicket(r: any, workLogs: TicketWorkLog[]): TicketRow {
  return {
    id: r.id,
    no: r.no,
    customerId: r.customer_id,
    customerName: r.customer_name,
    subject: r.subject,
    severity: r.severity,
    channel: r.channel,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    assignedTo: r.assigned_to,
    status: r.status,
    createdAt: r.created_at,
    responseDue: r.response_due,
    resolutionDue: r.resolution_due,
    slaStatus: r.sla_status,
    contractId: r.contract_id,
    description: r.description,
    escalationLevel: r.escalation_level,
    escalatedTo: r.escalated_to,
    escalatedAt: r.escalated_at,
    escalationReason: r.escalation_reason,
    rootCause: r.root_cause,
    resolution: r.resolution,
    resolvedAt: r.resolved_at,
    closedAt: r.closed_at,
    workLogs,
  } as TicketRow
}

function workLogToRow(ticketId: number, log: TicketWorkLog) {
  return {
    ticket_id: ticketId,
    log_id: log.id,
    time: log.time,
    user: log.user,
    action: log.action,
    note: log.note,
  }
}

async function fetchTicketsFromSupabase(): Promise<TicketRow[] | null> {
  if (!hasSupabase || !supabase) return null
  try {
    const [{ data: ticketRows, error: tErr }, { data: logRows, error: lErr }] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('ticket_work_logs').select('*').order('id', { ascending: true }),
    ])
    if (tErr) throw tErr
    if (lErr) throw lErr
    const logsByTicket: Record<number, TicketWorkLog[]> = {}
    ;(logRows || []).forEach((r: any) => {
      const arr = logsByTicket[r.ticket_id] || (logsByTicket[r.ticket_id] = [])
      arr.push({ id: r.log_id, time: r.time, user: r.user, action: r.action, note: r.note })
    })
    return (ticketRows || []).map((r: any) => rowToTicket(r, logsByTicket[r.id] || []))
  } catch (e) {
    console.error('Supabase fetch tickets error:', e)
    return null
  }
}

// Bumps the trailing numeric portion of a ticket number, e.g.
// "TK-2026-0092" -> "TK-2026-0093". Falls back to appending "-1" if the
// pattern doesn't match (shouldn't happen for our generated numbers).
function bumpTicketNo(no: string): string {
  const m = no.match(/^(TK-\d{4}-)(\d+)$/)
  if (!m) return `${no}-1`
  const next = (parseInt(m[2], 10) + 1).toString().padStart(m[2].length, '0')
  return `${m[1]}${next}`
}

// Inserts a ticket into Supabase. The `no` (human-readable ticket number)
// is generated client-side from a snapshot of locally-known tickets, so two
// people opening cases at nearly the same moment can compute the same next
// number — a race condition. The database now enforces a UNIQUE constraint
// on `tickets.no`, so a collision surfaces as a Postgres 23505 error here.
// When that happens we bump the number and retry (a few times) so the
// ticket still gets created with a guaranteed-unique number, and we patch
// the in-memory store entry so the UI reflects the corrected number too.
async function insertTicketToSupabase(ticket: TicketRow, onNoChanged?: (newNo: string) => void) {
  if (!hasSupabase || !supabase) return
  let current = ticket
  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { error } = await supabase.from('tickets').insert(ticketToRow(current))
      if (error) {
        // 23505 = unique_violation in Postgres
        const isUniqueNoConflict =
          (error as any).code === '23505' &&
          /tickets_no_unique|tickets.*no/i.test((error as any).message || (error as any).details || '')
        if (isUniqueNoConflict && attempt < maxAttempts - 1) {
          const bumpedNo = bumpTicketNo(current.no)
          current = { ...current, no: bumpedNo }
          continue
        }
        throw error
      }
      if (current.no !== ticket.no && onNoChanged) onNoChanged(current.no)
      if (current.workLogs && current.workLogs.length > 0) {
        const logs = current.no !== ticket.no
          ? current.workLogs.map(l => ({ ...l, note: l.note?.split(ticket.no).join(current.no) }))
          : current.workLogs
        const { error: lErr } = await supabase
          .from('ticket_work_logs')
          .insert(logs.map(l => workLogToRow(current.id, l)))
        if (lErr) throw lErr
      }
      return
    } catch (e) {
      console.error('Supabase insert ticket error:', e)
      return
    }
  }
}

async function updateTicketInSupabase(id: number, data: Partial<TicketRow>, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const partial = ticketToRow({ id, ...data } as TicketRow)
    // Only send fields that were actually part of `data` (plus updated_at),
    // so we never clobber columns we don't have new values for.
    const update: Record<string, any> = { updated_at: partial.updated_at }
    const fieldMap: Record<string, string> = {
      no: 'no', customerId: 'customer_id', customerName: 'customer_name', subject: 'subject',
      severity: 'severity', channel: 'channel', contactName: 'contact_name', contactPhone: 'contact_phone',
      contactEmail: 'contact_email', assignedTo: 'assigned_to', status: 'status', createdAt: 'created_at',
      responseDue: 'response_due', resolutionDue: 'resolution_due', slaStatus: 'sla_status',
      contractId: 'contract_id', description: 'description', escalationLevel: 'escalation_level',
      escalatedTo: 'escalated_to', escalatedAt: 'escalated_at', escalationReason: 'escalation_reason',
      rootCause: 'root_cause', resolution: 'resolution', resolvedAt: 'resolved_at', closedAt: 'closed_at',
    }
    Object.keys(data).forEach((k) => {
      const col = fieldMap[k]
      if (col) update[col] = (partial as any)[col]
    })
    const { error } = await supabase.from('tickets').update(update).eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) {
    console.error('Supabase update ticket error:', e)
  }
}

async function deleteTicketFromSupabase(id: number, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from('tickets').delete().eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) {
    console.error('Supabase delete ticket error:', e)
  }
}

async function insertWorkLogToSupabase(ticketId: number, log: TicketWorkLog, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from('ticket_work_logs').insert(workLogToRow(ticketId, log))
    if (error) throw error
    onDone?.()
  } catch (e) {
    console.error('Supabase insert work log error:', e)
  }
}

// ---- Generic row-level helpers for Wave 1 modules: customers, vendors,
// contracts, inventory. Same philosophy as tickets — each entity is its own
// row in a real table (not a JSON blob), so concurrent edits/deletes never
// clobber each other and there is no demo-data fallback to "ghost" old rows
// back into view.

type CustomerRow = typeof demoCustomers[number]
type VendorRow = typeof demoVendors[number]
type ContractRow = typeof demoContracts[number]
type InventoryRow = typeof demoInventory[number]
type OpportunityRow = typeof demoOpportunities[number]
type ProjectRow = typeof demoProjects[number]
type MilestoneRow = typeof demoMilestones[number]
type InvoiceRow = typeof demoInvoices[number]
type QuotationRow = typeof demoQuotations[number]
type PurchaseOrderRow = typeof demoPurchaseOrders[number]

function customerToRow(c: CustomerRow) {
  return {
    id: c.id, name: c.name ?? null, industry: c.industry ?? null, phone: c.phone ?? null,
    email: c.email ?? null, tax_id: c.taxId ?? null, address: c.address ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToCustomer(r: any): CustomerRow {
  return { id: r.id, name: r.name, industry: r.industry, phone: r.phone, email: r.email, taxId: r.tax_id, address: r.address } as CustomerRow
}

function vendorToRow(v: VendorRow) {
  return {
    id: v.id, code: v.code ?? null, name: v.name ?? null, type: v.type ?? null,
    contact: v.contact ?? null, phone: v.phone ?? null, email: v.email ?? null, tax_id: v.taxId ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToVendor(r: any): VendorRow {
  return { id: r.id, code: r.code, name: r.name, type: r.type, contact: r.contact, phone: r.phone, email: r.email, taxId: r.tax_id } as VendorRow
}

// ---- Wave 4: users, notifications, customer portal accounts — same
// row-level real-table philosophy. `notifications` uses a text id (some
// real alerts use string ids like "sla-alert-1", not numeric demo ids),
// so it gets its own insert/update/delete helpers below.

type NotificationRow = typeof demoNotifications[number]

function userToRow(u: User) {
  return {
    id: u.id, username: u.username ?? null, password: u.password ?? null, name: u.name ?? null,
    role: u.role ?? null, department: u.department ?? null, email: u.email ?? null,
    active: u.active ?? null, last_login: u.lastLogin ?? null, updated_at: new Date().toISOString(),
  }
}
function rowToUser(r: any): User {
  return { id: r.id, username: r.username, password: r.password, name: r.name, role: r.role, department: r.department, email: r.email, active: r.active, lastLogin: r.last_login } as User
}

function notificationToRow(n: NotificationRow) {
  return {
    id: String(n.id), module: n.module ?? null, type: n.type ?? null, title: n.title ?? null,
    message: n.message ?? null, time: n.time ?? null, date: n.date ?? null, read: n.read ?? false,
    link: n.link ?? null, updated_at: new Date().toISOString(),
  }
}
function rowToNotification(r: any): NotificationRow {
  return { id: r.id, module: r.module, type: r.type, title: r.title, message: r.message, time: r.time, date: r.date, read: r.read, link: r.link } as NotificationRow
}

function customerPortalAccountToRow(a: CustomerPortalAccount) {
  return {
    id: a.id, name: a.name ?? null, company: a.company ?? null, email: a.email ?? null,
    password: a.password ?? null, customer_id: a.customerId ?? null, active: a.active ?? null,
    created_at_label: a.createdAt ?? null, last_login: a.lastLogin ?? null,
    phones: a.phones ?? [], emails: a.emails ?? [], line_ids: a.lineIds ?? [],
    line_notify_tokens: a.lineNotifyTokens ?? [], notify_via_email: a.notifyViaEmail ?? false,
    notify_via_line: a.notifyViaLine ?? false, updated_at: new Date().toISOString(),
  }
}
function rowToCustomerPortalAccount(r: any): CustomerPortalAccount {
  return {
    id: r.id, name: r.name, company: r.company, email: r.email, password: r.password,
    customerId: r.customer_id, active: r.active, createdAt: r.created_at_label, lastLogin: r.last_login,
    phones: r.phones ?? [], emails: r.emails ?? [], lineIds: r.line_ids ?? [],
    lineNotifyTokens: r.line_notify_tokens ?? [], notifyViaEmail: r.notify_via_email ?? false,
    notifyViaLine: r.notify_via_line ?? false,
  } as CustomerPortalAccount
}

function contractToRow(c: ContractRow) {
  return {
    id: c.id, no: c.no ?? null, customer_id: c.customerId ?? null, customer_name: c.customerName ?? null,
    type: c.type ?? null, start_date: c.startDate || null, end_date: c.endDate || null,
    scope: c.scope ?? null, renewal_owner: c.renewalOwner ?? null, status: c.status ?? null,
    days_left: c.daysLeft ?? null, updated_at: new Date().toISOString(),
  }
}
function rowToContract(r: any): ContractRow {
  return {
    id: r.id, no: r.no, customerId: r.customer_id, customerName: r.customer_name, type: r.type,
    startDate: r.start_date, endDate: r.end_date, scope: r.scope, renewalOwner: r.renewal_owner,
    status: r.status, daysLeft: r.days_left,
  } as ContractRow
}

function inventoryToRow(i: InventoryRow) {
  return {
    id: i.id, code: i.code ?? null, name: i.name ?? null, category: i.category ?? null,
    brand: i.brand ?? null, model: i.model ?? null, qty: i.qty ?? null, unit_cost: i.unitCost ?? null,
    location: i.location ?? null, project_id: i.projectId ?? null, status: i.status ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToInventory(r: any): InventoryRow {
  return {
    id: r.id, code: r.code, name: r.name, category: r.category, brand: r.brand, model: r.model,
    qty: r.qty, unitCost: r.unit_cost, location: r.location, projectId: r.project_id, status: r.status,
  } as InventoryRow
}

// ---- Wave 2: opportunities, projects (+ milestones as child rows), invoices

function opportunityToRow(o: OpportunityRow) {
  return {
    id: o.id, no: o.no ?? null, name: o.name ?? null, customer_id: o.customerId ?? null,
    customer_name: o.customerName ?? null, owner: o.owner ?? null, stage: o.stage ?? null,
    value: o.value ?? null, cost: o.cost ?? null, gp: o.gp ?? null, gp_pct: o.gpPct ?? null,
    probability: o.probability ?? null, expected_close: o.expectedClose ?? null,
    last_activity: o.lastActivity ?? null, next_follow_up: o.nextFollowUp ?? null,
    status: o.status ?? null, quotation_ids: o.quotationIds ?? [], delivery_period: o.deliveryPeriod ?? null,
    payment_term: o.paymentTerm ?? null, project_type: o.projectType ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToOpportunity(r: any): OpportunityRow {
  return {
    id: r.id, no: r.no, name: r.name, customerId: r.customer_id, customerName: r.customer_name,
    owner: r.owner, stage: r.stage, value: r.value, cost: r.cost, gp: r.gp, gpPct: r.gp_pct,
    probability: r.probability, expectedClose: r.expected_close, lastActivity: r.last_activity,
    nextFollowUp: r.next_follow_up, status: r.status, quotationIds: r.quotation_ids ?? [],
    deliveryPeriod: r.delivery_period, paymentTerm: r.payment_term, projectType: r.project_type,
  } as OpportunityRow
}

function projectToRow(p: ProjectRow | ProjectExtended) {
  const pe = p as ProjectExtended
  return {
    id: p.id, code: p.code ?? null, name: p.name ?? null, customer_id: p.customerId ?? null,
    customer_name: p.customerName ?? null, pm: p.pm ?? null, type: p.type ?? null,
    contract_value: p.contractValue ?? null, estimated_cost: p.estimatedCost ?? null,
    gp: p.gp ?? null, gp_pct: p.gpPct ?? null, gp_target: p.gpTarget ?? null,
    start_date: p.startDate ?? null, target_end: p.targetEnd ?? null, status: p.status ?? null,
    progress: p.progress ?? null, latest_update: p.latestUpdate ?? null, blocker: p.blocker ?? null,
    source_opp_id: p.sourceOppId ?? null, opp_no: p.oppNo ?? null, quotation_id: p.quotationId ?? null,
    payment_term: p.paymentTerm ?? null, delivery_period: p.deliveryPeriod ?? null,
    // Wave B extended fields
    project_no: pe.projectNo ?? null,
    work_start: pe.workStart ?? null,
    work_end: pe.workEnd ?? null,
    contract_start: pe.contractStart ?? null,
    contract_end: pe.contractEnd ?? null,
    delivery_days: pe.deliveryDays ?? null,
    pm_user_id: pe.pmUserId ?? null,
    pm_frequency_months: pe.pmFrequencyMonths ?? null,
    pm_first_date: pe.pmFirstDate ?? null,
    pm_last_date: pe.pmLastDate ?? null,
    pm_total_count: pe.pmTotalCount ?? null,
    cm_sla_id: pe.cmSlaId ?? null,
    contract_attachment_url: pe.contractAttachmentUrl ?? null,
    other_attachments: pe.otherAttachments ?? [],
    project_description: pe.projectDescription ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToProject(r: any): ProjectExtended {
  return {
    id: r.id, code: r.code, name: r.name, customerId: r.customer_id, customerName: r.customer_name,
    pm: r.pm, type: r.type, contractValue: r.contract_value, estimatedCost: r.estimated_cost,
    gp: r.gp, gpPct: r.gp_pct, gpTarget: r.gp_target, startDate: r.start_date, targetEnd: r.target_end,
    status: r.status, progress: r.progress, latestUpdate: r.latest_update, blocker: r.blocker,
    sourceOppId: r.source_opp_id, oppNo: r.opp_no, quotationId: r.quotation_id,
    paymentTerm: r.payment_term, deliveryPeriod: r.delivery_period,
    // Wave B extended fields
    projectNo: r.project_no,
    workStart: r.work_start,
    workEnd: r.work_end,
    contractStart: r.contract_start,
    contractEnd: r.contract_end,
    deliveryDays: r.delivery_days,
    pmUserId: r.pm_user_id,
    pmFrequencyMonths: r.pm_frequency_months,
    pmFirstDate: r.pm_first_date,
    pmLastDate: r.pm_last_date,
    pmTotalCount: r.pm_total_count,
    cmSlaId: r.cm_sla_id,
    contractAttachmentUrl: r.contract_attachment_url,
    otherAttachments: r.other_attachments ?? [],
    projectDescription: r.project_description,
    workLogs: [],
  } as ProjectExtended
}

// ---- Project Work Log helpers ----
function projectWorkLogToRow(log: ProjectWorkLog) {
  return {
    project_id: log.projectId,
    action_type: log.actionType,
    description: log.description,
    status: log.status,
    progress: log.progress,
    attachment_urls: log.attachmentUrls ?? [],
    performed_by: log.performedBy,
    performed_by_id: log.performedById ?? null,
  }
}
function rowToProjectWorkLog(r: any): ProjectWorkLog {
  return {
    id: r.id, projectId: r.project_id, actionType: r.action_type, description: r.description,
    status: r.status, progress: r.progress, attachmentUrls: r.attachment_urls ?? [],
    performedBy: r.performed_by, performedById: r.performed_by_id,
    createdAt: r.created_at,
  }
}

async function fetchProjectsWithLogs(): Promise<ProjectExtended[] | null> {
  if (!hasSupabase || !supabase) return null
  try {
    const [{ data: projRows, error: pErr }, { data: logRows, error: lErr }] = await Promise.all([
      supabase.from('projects').select('*').order('id', { ascending: false }),
      supabase.from('project_work_logs').select('*').order('id', { ascending: true }),
    ])
    if (pErr) throw pErr
    if (lErr) throw lErr
    const logsByProject: Record<number, ProjectWorkLog[]> = {}
    ;(logRows || []).forEach((r: any) => {
      const arr = logsByProject[r.project_id] || (logsByProject[r.project_id] = [])
      arr.push(rowToProjectWorkLog(r))
    })
    return (projRows || []).map((r: any) => ({ ...rowToProject(r), workLogs: logsByProject[r.id] || [] }))
  } catch (e) {
    console.error('Supabase fetch projects error:', e)
    return null
  }
}

function milestoneToRow(m: MilestoneRow) {
  return {
    id: m.id, project_id: m.projectId ?? null, name: m.name ?? null, planned: m.planned ?? null,
    actual: m.actual ?? null, status: m.status ?? null, owner: m.owner ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToMilestone(r: any): MilestoneRow {
  return {
    id: r.id, projectId: r.project_id, name: r.name, planned: r.planned, actual: r.actual,
    status: r.status, owner: r.owner,
  } as MilestoneRow
}

function invoiceToRow(i: InvoiceRow) {
  return {
    id: i.id, project_id: i.projectId ?? null, project_name: i.projectName ?? null,
    customer_id: i.customerId ?? null, customer_name: i.customerName ?? null,
    invoice_no: i.invoiceNo ?? null, invoice_date: i.invoiceDate ?? null, due_date: i.dueDate ?? null,
    billed_amount: i.billedAmount ?? null, paid_amount: i.paidAmount ?? null, status: i.status ?? null,
    overdue: i.overdue ?? null, updated_at: new Date().toISOString(),
  }
}
function rowToInvoice(r: any): InvoiceRow {
  return {
    id: r.id, projectId: r.project_id, projectName: r.project_name, customerId: r.customer_id,
    customerName: r.customer_name, invoiceNo: r.invoice_no, invoiceDate: r.invoice_date,
    dueDate: r.due_date, billedAmount: r.billed_amount, paidAmount: r.paid_amount,
    status: r.status, overdue: r.overdue,
  } as InvoiceRow
}

// ---- Wave 3: quotations (+ items as jsonb), purchase orders (+ items as jsonb)

function quotationToRow(q: QuotationRow) {
  return {
    id: q.id, no: q.no ?? null, opp_id: q.oppId ?? null, opp_no: q.oppNo ?? null,
    customer_id: q.customerId ?? null, customer_name: q.customerName ?? null,
    items: q.items ?? [], total_price: q.totalPrice ?? null, total_cost: q.totalCost ?? null,
    gp: q.gp ?? null, gp_pct: q.gpPct ?? null, status: q.status ?? null,
    created_at_label: q.createdAt ?? null, valid_until: q.validUntil ?? null, notes: q.notes ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToQuotation(r: any): QuotationRow {
  return {
    id: r.id, no: r.no, oppId: r.opp_id, oppNo: r.opp_no, customerId: r.customer_id,
    customerName: r.customer_name, items: r.items ?? [], totalPrice: r.total_price,
    totalCost: r.total_cost, gp: r.gp, gpPct: r.gp_pct, status: r.status,
    createdAt: r.created_at_label, validUntil: r.valid_until, notes: r.notes,
  } as QuotationRow
}

function purchaseOrderToRow(po: PurchaseOrderRow) {
  return {
    id: po.id, no: po.no ?? null, vendor_id: po.vendorId ?? null, vendor_name: po.vendorName ?? null,
    project_id: po.projectId ?? null, project_name: po.projectName ?? null, items: po.items ?? [],
    total: po.total ?? null, status: po.status ?? null, created_at_label: po.createdAt ?? null,
    expected_delivery: po.expectedDelivery ?? null, notes: po.notes ?? null,
    updated_at: new Date().toISOString(),
  }
}
function rowToPurchaseOrder(r: any): PurchaseOrderRow {
  return {
    id: r.id, no: r.no, vendorId: r.vendor_id, vendorName: r.vendor_name, projectId: r.project_id,
    projectName: r.project_name, items: r.items ?? [], total: r.total, status: r.status,
    createdAt: r.created_at_label, expectedDelivery: r.expected_delivery, notes: r.notes,
  } as PurchaseOrderRow
}

async function fetchTableRows<T>(table: string, mapper: (r: any) => T, orderCol = 'id'): Promise<T[] | null> {
  if (!hasSupabase || !supabase) return null
  try {
    const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false })
    if (error) throw error
    return (data || []).map(mapper)
  } catch (e) {
    console.error(`Supabase fetch ${table} error:`, e)
    return null
  }
}
// ---- Supabase write helpers ------------------------------------------------
// Each helper accepts an optional `onDone` callback that fires after the
// server write succeeds.  Callers use this to refetch from the DB so the
// local store always reflects the committed state, not just an optimistic
// approximation.  This eliminates the need to press Refresh after any CRUD
// action — the post-write refetch guarantees consistency regardless of
// whether the Supabase Realtime WebSocket is connected.
async function insertRow(table: string, row: any, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from(table).insert(row)
    if (error) throw error
    onDone?.()
  } catch (e) { console.error(`Supabase insert ${table} error:`, e) }
}
async function updateRow(table: string, id: number, row: any, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from(table).update(row).eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) { console.error(`Supabase update ${table} error:`, e) }
}
async function deleteRow(table: string, id: number, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) { console.error(`Supabase delete ${table} error:`, e) }
}
// Text-id variants — `notifications.id` is text (some real alerts use
// string ids like "sla-alert-1"), so it can't use the numeric-id helpers.
async function updateRowByTextId(table: string, id: string, row: any, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from(table).update(row).eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) { console.error(`Supabase update ${table} error:`, e) }
}
async function deleteRowByTextId(table: string, id: string, onDone?: () => void) {
  if (!hasSupabase || !supabase) return
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    onDone?.()
  } catch (e) { console.error(`Supabase delete ${table} error:`, e) }
}

// ---- Per-table refetch helpers (used as onDone callbacks) ------------------
// These fetch the latest rows from Supabase and push them into the store so
// every component sees real committed data immediately after a write.
async function refetchInto<T>(
  table: string,
  mapper: (r: any) => T,
  stateKey: keyof AppState,
  setter: (patch: Partial<AppState>) => void,
  orderCol = 'id',
) {
  const rows = await fetchTableRows<T>(table, mapper, orderCol)
  if (rows) setter({ [stateKey]: rows } as Partial<AppState>)
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      login: async (username, password) => {
        // Fixed bug: previously checked the static `demoUsers` array, so any
        // staff account added or edited via addUser/updateUser could never
        // log in (their changes never reached the auth check). Now checks
        // live `users` state — fetched from the real `users` table — so
        // newly added/edited accounts can log in immediately, everywhere.
        //
        // The login page runs before `initialize()` (which only fires after
        // currentUser is set), so `users` may still be empty here on a fresh
        // load. Ensure it's populated first: fetch from Supabase directly,
        // falling back to demoUsers only if Supabase is unavailable.
        let users = get().users
        if (users.length === 0) {
          if (hasSupabase && supabase) {
            const rows = await fetchTableRows('users', rowToUser)
            users = rows && rows.length > 0 ? rows : demoUsers
          } else {
            users = demoUsers
          }
          set({ users })
        }
        const user = users.find(u => u.username === username && u.password === password)
        if (user) { set({ currentUser: user }); return true }
        return false
      },
      logout: () => set({ currentUser: null }),
      lang: 'th',
      setLang: (l) => set({ lang: l }),
      initialized: false,
      initialize: async () => {
        if (get().initialized) return
        if (!hasSupabase || !supabase) {
          set({ initialized: true })
          return
        }
        try {
          // Master data lookups only — simple string-array config lists with
          // no independent entity identity, so the blob pattern is fine here
          // (no "ghost data" race condition risk like entity collections had).
          const keys = ['projectTypes','paymentTerms','deliveryPeriods']
          const { data, error } = await supabase
            .from('app_data')
            .select('key, value')
            .in('key', keys)
          if (error) throw error
          if (!data || data.length === 0) {
            await supabase.from('app_data').insert([
              { key: 'projectTypes',          value: demoProjectTypes },
              { key: 'paymentTerms',          value: demoPaymentTerms },
              { key: 'deliveryPeriods',       value: demoDeliveryPeriods },
            ])
          } else {
            const m: Record<string, any> = {}
            data.forEach(r => { m[r.key] = r.value })
            set({
              projectTypes:           m.projectTypes           ?? demoProjectTypes,
              paymentTerms:           m.paymentTerms           ?? demoPaymentTerms,
              deliveryPeriods:        m.deliveryPeriods         ?? demoDeliveryPeriods,
            })
          }
        } catch (e) {
          console.error('Supabase init error:', e)
        }

        // Tickets now live in real relational tables (tickets / ticket_work_logs)
        // instead of the app_data JSON blob — fetch them separately.
        try {
          const ticketRows = await fetchTicketsFromSupabase()
          if (ticketRows && ticketRows.length > 0) {
            set({ tickets: ticketRows })
          } else if (ticketRows && ticketRows.length === 0) {
            // Tables exist but are empty — seed with demo data (row-level inserts)
            for (const t of demoTickets) {
              await insertTicketToSupabase(t)
            }
            set({ tickets: demoTickets })
          }
          // if ticketRows is null (fetch failed / no supabase), keep demo data already in state
        } catch (e) {
          console.error('Supabase tickets init error:', e)
        }

        // ---- Wave 1: customers, vendors, contracts, inventory — real
        // relational tables, fetched directly (source of truth). No
        // demo-data fallback: an empty table means an empty list, never
        // a ghost of sample records.
        try {
          const [custRows, vendRows, contrRows, invRows] = await Promise.all([
            fetchTableRows('customers', rowToCustomer),
            fetchTableRows('vendors', rowToVendor),
            fetchTableRows('contracts', rowToContract),
            fetchTableRows('inventory', rowToInventory),
          ])
          const patch: Partial<AppState> = {}
          if (custRows) patch.customers = custRows
          if (vendRows) patch.vendors = vendRows
          if (contrRows) patch.contracts = contrRows
          if (invRows) patch.inventory = invRows
          set(patch)
        } catch (e) {
          console.error('Supabase wave1 init error:', e)
        }

        // ---- Wave 2: opportunities, projects (with work logs), milestones, invoices — real
        // relational tables, fetched directly (source of truth). No
        // demo-data fallback.
        try {
          const [oppRows, projRows, msRows, invoiceRows, slaRows, projNameRows] = await Promise.all([
            fetchTableRows('opportunities', rowToOpportunity),
            fetchProjectsWithLogs(),
            fetchTableRows('milestones', rowToMilestone),
            fetchTableRows('invoices', rowToInvoice),
            fetchTableRows('cm_sla_options', (r: any) => ({
              id: r.id, name: r.name, responseTimeHours: r.response_time_hours,
              resolutionTimeHours: r.resolution_time_hours, description: r.description,
            })),
            fetchTableRows('project_name_options', (r: any) => ({
              id: r.id, name: r.name, isActive: r.is_active, createdAt: r.created_at,
            })),
          ])
          const patch2: Partial<AppState> = {}
          if (oppRows) patch2.opportunities = oppRows
          if (projRows) {
            patch2.projects = projRows
            patch2.projectWorkLogs = projRows.flatMap(p => p.workLogs || [])
          }
          if (msRows) patch2.milestones = msRows
          if (invoiceRows) patch2.invoices = invoiceRows
          if (slaRows) patch2.cmSlaOptions = slaRows
          if (projNameRows) patch2.projectNameOptions = projNameRows
          set(patch2)
        } catch (e) {
          console.error('Supabase wave2 init error:', e)
        }

        // ---- Wave 3: quotations, purchase orders — real relational tables
        // (items stored as jsonb sub-arrays), fetched directly. No demo-data
        // fallback.
        try {
          const [quotRows, poRows] = await Promise.all([
            fetchTableRows('quotations', rowToQuotation),
            fetchTableRows('purchase_orders', rowToPurchaseOrder),
          ])
          const patch3: Partial<AppState> = {}
          if (quotRows) patch3.quotations = quotRows
          if (poRows) patch3.purchaseOrders = poRows
          set(patch3)
        } catch (e) {
          console.error('Supabase wave3 init error:', e)
        }

        // ---- Wave 4: users, notifications, customer portal accounts — real
        // relational tables, fetched directly (source of truth). No
        // demo-data fallback. `users` was never synced server-side before
        // this migration, so on first run (empty table) we seed it from
        // demoUsers (row-level inserts) — same one-time-seed pattern used
        // for tickets in Wave 0.
        try {
          const [userRows, notifRows, portalRows] = await Promise.all([
            fetchTableRows('users', rowToUser),
            fetchTableRows('notifications', rowToNotification),
            fetchTableRows('customer_portal_accounts', rowToCustomerPortalAccount),
          ])
          const patch4: Partial<AppState> = {}
          if (userRows && userRows.length > 0) {
            patch4.users = userRows
          } else if (userRows && userRows.length === 0) {
            for (const u of demoUsers) await insertRow('users', userToRow(u))
            patch4.users = demoUsers
          }
          if (notifRows) patch4.notifications = notifRows
          if (portalRows) patch4.customerPortalAccounts = portalRows
          set(patch4)
        } catch (e) {
          console.error('Supabase wave4 init error:', e)
        }

        set({ initialized: true })
      },
      realtimeSubscribed: false,
      subscribeRealtime: () => {
        if (!hasSupabase || !supabase) return
        if (get().realtimeSubscribed) return
        set({ realtimeSubscribed: true })

        const KEY_TO_STATE: Record<string, keyof AppState> = {
          projectTypes: 'projectTypes',
          paymentTerms: 'paymentTerms',
          deliveryPeriods: 'deliveryPeriods',
        }

        supabase
          .channel('app_data_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_data' },
            (payload: any) => {
              const row = payload.new ?? payload.old
              if (!row || !row.key) return
              const stateKey = KEY_TO_STATE[row.key]
              if (!stateKey) return
              // Apply incoming value as-is — Supabase row is the source of truth.
              // (Our own writes will round-trip here too, but produce an
              // identical value, so this is a harmless no-op re-render.)
              if (payload.new && payload.new.value !== undefined) {
                set({ [stateKey]: payload.new.value } as Partial<AppState>)
              }
            }
          )
          .subscribe()

        // Tickets: subscribe to the real relational tables instead of the
        // app_data blob. On any change, re-fetch from Supabase (source of
        // truth) and replace local state — row-level changes from other
        // users are reflected without any chance of resurrecting deleted rows.
        let refetchTimer: ReturnType<typeof setTimeout> | null = null
        const scheduleTicketsRefetch = () => {
          if (refetchTimer) clearTimeout(refetchTimer)
          refetchTimer = setTimeout(async () => {
            const rows = await fetchTicketsFromSupabase()
            if (rows) set({ tickets: rows })
          }, 300)
        }
        supabase
          .channel('tickets_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, scheduleTicketsRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_work_logs' }, scheduleTicketsRefetch)
          .subscribe()

        // ---- Wave 1 tables: customers, vendors, contracts, inventory.
        // Each gets its own channel that re-fetches from the table (source
        // of truth) on any change — same row-level philosophy as tickets.
        const makeTableRefetcher = <T,>(table: string, mapper: (r: any) => T, stateKey: keyof AppState) => {
          let timer: ReturnType<typeof setTimeout> | null = null
          return () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(async () => {
              const rows = await fetchTableRows(table, mapper)
              if (rows) set({ [stateKey]: rows } as Partial<AppState>)
            }, 300)
          }
        }
        const refetchCustomers = makeTableRefetcher('customers', rowToCustomer, 'customers')
        const refetchVendors = makeTableRefetcher('vendors', rowToVendor, 'vendors')
        const refetchContracts = makeTableRefetcher('contracts', rowToContract, 'contracts')
        const refetchInventory = makeTableRefetcher('inventory', rowToInventory, 'inventory')
        supabase
          .channel('customers_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, refetchCustomers)
          .subscribe()
        supabase
          .channel('vendors_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, refetchVendors)
          .subscribe()
        supabase
          .channel('contracts_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, refetchContracts)
          .subscribe()
        supabase
          .channel('inventory_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, refetchInventory)
          .subscribe()

        // ---- Wave 2 tables: opportunities, projects, milestones, invoices.
        // Same row-level refetch-on-change philosophy as Wave 1.
        const refetchOpportunities = makeTableRefetcher('opportunities', rowToOpportunity, 'opportunities')
        const refetchMilestones = makeTableRefetcher('milestones', rowToMilestone, 'milestones')
        const refetchInvoices = makeTableRefetcher('invoices', rowToInvoice, 'invoices')

        // Projects + project_work_logs share one refetcher (projects include their logs)
        let projTimer: ReturnType<typeof setTimeout> | null = null
        const scheduleProjectsRefetch = () => {
          if (projTimer) clearTimeout(projTimer)
          projTimer = setTimeout(async () => {
            const rows = await fetchProjectsWithLogs()
            if (rows) {
              set({ projects: rows, projectWorkLogs: rows.flatMap(p => p.workLogs || []) })
            }
          }, 300)
        }

        supabase
          .channel('opportunities_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, refetchOpportunities)
          .subscribe()
        supabase
          .channel('projects_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleProjectsRefetch)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'project_work_logs' }, scheduleProjectsRefetch)
          .subscribe()
        supabase
          .channel('milestones_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, refetchMilestones)
          .subscribe()
        supabase
          .channel('invoices_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, refetchInvoices)
          .subscribe()

        // ---- Wave 3 tables: quotations, purchase orders.
        // Same row-level refetch-on-change philosophy as Wave 1/2.
        const refetchQuotations = makeTableRefetcher('quotations', rowToQuotation, 'quotations')
        const refetchPurchaseOrders = makeTableRefetcher('purchase_orders', rowToPurchaseOrder, 'purchaseOrders')
        supabase
          .channel('quotations_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, refetchQuotations)
          .subscribe()
        supabase
          .channel('purchase_orders_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, refetchPurchaseOrders)
          .subscribe()

        // ---- Wave 4 tables: users, notifications, customer portal accounts.
        // Same row-level refetch-on-change philosophy as Wave 1/2/3 — staff
        // accounts, alerts, and portal logins are now consistent in real
        // time across every device/browser instead of living in each
        // person's localStorage or a single shared JSON blob.
        const refetchUsers = makeTableRefetcher('users', rowToUser, 'users')
        const refetchNotifications = makeTableRefetcher('notifications', rowToNotification, 'notifications')
        const refetchPortalAccounts = makeTableRefetcher('customer_portal_accounts', rowToCustomerPortalAccount, 'customerPortalAccounts')
        supabase
          .channel('users_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, refetchUsers)
          .subscribe()
        supabase
          .channel('notifications_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refetchNotifications)
          .subscribe()
        supabase
          .channel('customer_portal_accounts_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_portal_accounts' }, refetchPortalAccounts)
          .subscribe()

        // CM SLA Options realtime
        const refetchCmSla = makeTableRefetcher('cm_sla_options', (r: any) => ({
          id: r.id, name: r.name, responseTimeHours: r.response_time_hours,
          resolutionTimeHours: r.resolution_time_hours, description: r.description,
        }), 'cmSlaOptions')
        supabase
          .channel('cm_sla_options_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cm_sla_options' }, refetchCmSla)
          .subscribe()

        // Project Name Options realtime
        const refetchProjNames = makeTableRefetcher('project_name_options', (r: any) => ({
          id: r.id, name: r.name, isActive: r.is_active, createdAt: r.created_at,
        }), 'projectNameOptions')
        supabase
          .channel('project_name_options_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'project_name_options' }, refetchProjNames)
          .subscribe()
      },
      // Wave 1 modules start empty — they are fetched live from their real
      // Supabase tables in `initialize()`. No demo-data seeding: an empty
      // table must show as empty, never as ghost sample records.
      customers:     [] as typeof demoCustomers,
      vendors:       [] as typeof demoVendors,
      contracts:     [] as typeof demoContracts,
      inventory:     [] as typeof demoInventory,
      // Wave 2 modules start empty — fetched live from their real Supabase
      // tables in `initialize()`. No demo-data seeding.
      opportunities:    [] as typeof demoOpportunities,
      projects:         [] as ProjectExtended[],
      projectWorkLogs:  [] as ProjectWorkLog[],
      cmSlaOptions:     [] as AppState['cmSlaOptions'],
      milestones:       [] as typeof demoMilestones,
      invoices:         [] as typeof demoInvoices,
      tickets:       demoTickets,
      // Wave 4 modules start empty — fetched live from their real Supabase
      // tables in `initialize()`. No demo-data seeding: an empty table must
      // show as empty, never as a ghost of stale sample records. `users`
      // briefly being [] before the fetch completes is fine — the login
      // screen waits for `hasHydrated`/`initialized` before accepting input,
      // and `initialize()` seeds the `users` table from demoUsers on first
      // run if it's empty (same one-time-seed pattern as tickets).
      notifications: [] as typeof demoNotifications,
      users:         [] as typeof demoUsers,
      customerPortalAccounts: [] as CustomerPortalAccount[],
      // Wave 3 modules start empty — fetched live from their real Supabase
      // tables in `initialize()`. No demo-data seeding.
      quotations:    [] as typeof demoQuotations,
      purchaseOrders:[] as typeof demoPurchaseOrders,
      projectTypes:  demoProjectTypes,
      paymentTerms:  demoPaymentTerms,
      deliveryPeriods:demoDeliveryPeriods,
      // CM SLA Options
      addCmSla: (data) => {
        const tempId = Date.now()
        const newItem = { id: tempId, ...data }
        set({ cmSlaOptions: [...get().cmSlaOptions, newItem] })
        insertRow('cm_sla_options', {
          name: data.name,
          response_time_hours: data.responseTimeHours,
          resolution_time_hours: data.resolutionTimeHours,
          description: data.description,
        }, async () => {
          const rows = await fetchTableRows('cm_sla_options', (r: any) => ({
            id: r.id, name: r.name, responseTimeHours: r.response_time_hours,
            resolutionTimeHours: r.resolution_time_hours, description: r.description,
          }))
          if (rows) set({ cmSlaOptions: rows })
        })
      },
      updateCmSla: (id, data) => {
        const cmSlaOptions = get().cmSlaOptions.map(s =>
          s.id === id ? { ...s, ...data } : s
        )
        set({ cmSlaOptions })
        updateRow('cm_sla_options', id, {
          name: data.name,
          response_time_hours: data.responseTimeHours,
          resolution_time_hours: data.resolutionTimeHours,
          description: data.description,
        }, async () => {
          const rows = await fetchTableRows('cm_sla_options', (r: any) => ({
            id: r.id, name: r.name, responseTimeHours: r.response_time_hours,
            resolutionTimeHours: r.resolution_time_hours, description: r.description,
          }))
          if (rows) set({ cmSlaOptions: rows })
        })
      },
      deleteCmSla: (id) => {
        set({ cmSlaOptions: get().cmSlaOptions.filter(s => s.id !== id) })
        deleteRow('cm_sla_options', id, async () => {
          const rows = await fetchTableRows('cm_sla_options', (r: any) => ({
            id: r.id, name: r.name, responseTimeHours: r.response_time_hours,
            resolutionTimeHours: r.resolution_time_hours, description: r.description,
          }))
          if (rows) set({ cmSlaOptions: rows })
        })
      },
      // Project Name Options
      projectNameOptions: [] as { id: number; name: string; isActive: boolean; createdAt: string }[],
      addProjectNameOption: (name) => {
        const tempId = Date.now()
        const newItem = { id: tempId, name, isActive: true, createdAt: new Date().toISOString() }
        set({ projectNameOptions: [...get().projectNameOptions, newItem] })
        insertRow('project_name_options', { name, is_active: true }, async () => {
          const rows = await fetchTableRows('project_name_options', (r: any) => ({
            id: r.id, name: r.name, isActive: r.is_active, createdAt: r.created_at,
          }))
          if (rows) set({ projectNameOptions: rows })
        })
      },
      updateProjectNameOption: (id, data) => {
        const projectNameOptions = get().projectNameOptions.map(p =>
          p.id === id ? { ...p, ...data } : p
        )
        set({ projectNameOptions })
        updateRow('project_name_options', id, { name: data.name, is_active: data.isActive }, async () => {
          const rows = await fetchTableRows('project_name_options', (r: any) => ({
            id: r.id, name: r.name, isActive: r.is_active, createdAt: r.created_at,
          }))
          if (rows) set({ projectNameOptions: rows })
        })
      },
      deleteProjectNameOption: (id) => {
        set({ projectNameOptions: get().projectNameOptions.filter(p => p.id !== id) })
        deleteRow('project_name_options', id, async () => {
          const rows = await fetchTableRows('project_name_options', (r: any) => ({
            id: r.id, name: r.name, isActive: r.is_active, createdAt: r.created_at,
          }))
          if (rows) set({ projectNameOptions: rows })
        })
      },
      // Customers — row-level CRUD against the real `customers` table
      addCustomer: (customer) => {
        const customers = [customer, ...get().customers]
        set({ customers })
        insertRow('customers', customerToRow(customer),
          () => refetchInto('customers', rowToCustomer, 'customers', set))
      },
      updateCustomer: (id, data) => {
        const customers = get().customers.map(c =>
          c.id === id ? { ...c, ...(data as any) } : c
        )
        set({ customers })
        const updated = customers.find(c => c.id === id)
        if (updated) updateRow('customers', id, customerToRow(updated),
          () => refetchInto('customers', rowToCustomer, 'customers', set))
      },
      deleteCustomer: (id) => {
        const customers = get().customers.filter(c => c.id !== id)
        set({ customers })
        deleteRow('customers', id,
          () => refetchInto('customers', rowToCustomer, 'customers', set))
      },
      // Opportunities — row-level CRUD against the real `opportunities` table
      addOpportunity: (opp) => {
        const opportunities = [opp, ...get().opportunities]
        set({ opportunities })
        insertRow('opportunities', opportunityToRow(opp),
          () => refetchInto('opportunities', rowToOpportunity, 'opportunities', set))
      },
      updateOpportunity: (id, data) => {
        const opportunities = get().opportunities.map(o =>
          o.id === id ? { ...o, ...(data as any) } : o
        )
        set({ opportunities })
        const updated = opportunities.find(o => o.id === id)
        if (updated) updateRow('opportunities', id, opportunityToRow(updated),
          () => refetchInto('opportunities', rowToOpportunity, 'opportunities', set))
      },
      deleteOpportunity: (id) => {
        const opportunities = get().opportunities.filter(o => o.id !== id)
        set({ opportunities })
        deleteRow('opportunities', id,
          () => refetchInto('opportunities', rowToOpportunity, 'opportunities', set))
      },
      // Projects — row-level CRUD against the real `projects` table
      generateProjectNo: async () => {
        const year = new Date().getFullYear()
        if (hasSupabase && supabase) {
          try {
            const { data } = await supabase.rpc('nextval', { seq: 'project_no_seq' }).single()
            const seq = data ?? (get().projects.length + 1)
            return `PRJ-${year}-${String(seq).padStart(4, '0')}`
          } catch {
            // fallback
          }
        }
        return `PRJ-${year}-${String(get().projects.length + 1).padStart(4, '0')}`
      },
      addProject: (proj) => {
        const projects = [proj, ...get().projects]
        set({ projects })
        const row = projectToRow(proj)
        insertRow('projects', row, async () => {
          const rows = await fetchProjectsWithLogs()
          if (rows) set({ projects: rows, projectWorkLogs: rows.flatMap(p => p.workLogs || []) })
        })
      },
      updateProject: (id, data) => {
        const projects = get().projects.map(p =>
          p.id === id ? { ...p, ...(data as any) } : p
        )
        set({ projects })
        const updated = projects.find(p => p.id === id)
        if (updated) updateRow('projects', id, projectToRow(updated), async () => {
          const rows = await fetchProjectsWithLogs()
          if (rows) set({ projects: rows, projectWorkLogs: rows.flatMap(p => p.workLogs || []) })
        })
      },
      deleteProject: (id) => {
        const projects = get().projects.filter(p => p.id !== id)
        set({ projects })
        deleteRow('projects', id, async () => {
          const rows = await fetchProjectsWithLogs()
          if (rows) set({ projects: rows, projectWorkLogs: rows.flatMap(p => p.workLogs || []) })
        })
      },
      addProjectWorkLog: (log) => {
        // Optimistic update — append log to the project's workLogs array
        const projects = get().projects.map(p =>
          p.id === log.projectId
            ? { ...p, workLogs: [...(p.workLogs || []), log], progress: log.progress, status: log.status, latestUpdate: log.description }
            : p
        )
        set({ projects, projectWorkLogs: [...get().projectWorkLogs, log] })
        // Also update project row's progress + status + latest_update
        const proj = projects.find(p => p.id === log.projectId)
        if (proj) {
          updateRow('projects', log.projectId, {
            progress: log.progress, status: log.status,
            latest_update: log.description, updated_at: new Date().toISOString()
          })
        }
        // Insert work log row
        insertRow('project_work_logs', projectWorkLogToRow(log), async () => {
          const rows = await fetchProjectsWithLogs()
          if (rows) set({ projects: rows, projectWorkLogs: rows.flatMap(p => p.workLogs || []) })
        })
      },
      createProjectFromOpp: async (oppId) => {
        const opp = get().opportunities.find(o => o.id === oppId)
        if (!opp) return
        const projNo = await get().generateProjectNo()
        const newProj: ProjectExtended = {
          id: Date.now(),
          code: projNo,
          projectNo: projNo,
          name: opp.name.replace('Opportunity', 'Project').replace('opportunity', 'project'),
          customerId: opp.customerId,
          customerName: opp.customerName,
          pm: 'ยังไม่มอบหมาย',
          type: opp.projectType || 'Implementation',
          contractValue: opp.value,
          estimatedCost: opp.cost,
          gp: opp.gp,
          gpPct: opp.gpPct,
          gpTarget: Math.round(opp.gpPct || 30) as any,
          startDate: new Date().toISOString().split('T')[0],
          targetEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Planning',
          progress: 0,
          latestUpdate: 'สร้างจากโอกาสขาย',
          blocker: null as any,
          sourceOppId: oppId as any,
          oppNo: opp.no as any,
          quotationId: (opp.quotationIds?.[0] || null) as any,
          paymentTerm: (opp.paymentTerm || null) as any,
          deliveryPeriod: (opp.deliveryPeriod || null) as any,
          workLogs: [],
        }
        get().addProject(newProj)
      },
      // Vendors — row-level CRUD against the real `vendors` table
      addVendor: (vendor) => {
        const vendors = [vendor, ...get().vendors]
        set({ vendors })
        insertRow('vendors', vendorToRow(vendor),
          () => refetchInto('vendors', rowToVendor, 'vendors', set))
      },
      updateVendor: (id, data) => {
        const vendors = get().vendors.map(v =>
          v.id === id ? { ...v, ...(data as any) } : v
        )
        set({ vendors })
        const updated = vendors.find(v => v.id === id)
        if (updated) updateRow('vendors', id, vendorToRow(updated),
          () => refetchInto('vendors', rowToVendor, 'vendors', set))
      },
      deleteVendor: (id) => {
        const vendors = get().vendors.filter(v => v.id !== id)
        set({ vendors })
        deleteRow('vendors', id,
          () => refetchInto('vendors', rowToVendor, 'vendors', set))
      },
      // Quotations — row-level CRUD against the real `quotations` table
      addQuotation: (q) => {
        const quotations = [q, ...get().quotations]
        set({ quotations })
        insertRow('quotations', quotationToRow(q),
          () => refetchInto('quotations', rowToQuotation, 'quotations', set))
      },
      updateQuotation: (id, data) => {
        const quotations = get().quotations.map(q =>
          q.id === id ? { ...q, ...(data as any) } : q
        )
        set({ quotations })
        const updated = quotations.find(q => q.id === id)
        if (updated) updateRow('quotations', id, quotationToRow(updated),
          () => refetchInto('quotations', rowToQuotation, 'quotations', set))
      },
      deleteQuotation: (id) => {
        const quotations = get().quotations.filter(q => q.id !== id)
        set({ quotations })
        deleteRow('quotations', id,
          () => refetchInto('quotations', rowToQuotation, 'quotations', set))
      },
      // Purchase Orders — row-level CRUD against the real `purchase_orders` table
      addPurchaseOrder: (po) => {
        const purchaseOrders = [po, ...get().purchaseOrders]
        set({ purchaseOrders })
        insertRow('purchase_orders', purchaseOrderToRow(po),
          () => refetchInto('purchase_orders', rowToPurchaseOrder, 'purchaseOrders', set))
      },
      updatePurchaseOrder: (id, data) => {
        const purchaseOrders = get().purchaseOrders.map(po =>
          po.id === id ? { ...po, ...(data as any) } : po
        )
        set({ purchaseOrders })
        const updated = purchaseOrders.find(po => po.id === id)
        if (updated) updateRow('purchase_orders', id, purchaseOrderToRow(updated),
          () => refetchInto('purchase_orders', rowToPurchaseOrder, 'purchaseOrders', set))
      },
      deletePurchaseOrder: (id) => {
        const purchaseOrders = get().purchaseOrders.filter(po => po.id !== id)
        set({ purchaseOrders })
        deleteRow('purchase_orders', id,
          () => refetchInto('purchase_orders', rowToPurchaseOrder, 'purchaseOrders', set))
      },
      // Inventory — row-level CRUD against the real `inventory` table
      addInventoryItem: (item) => {
        const inventory = [item, ...get().inventory]
        set({ inventory })
        insertRow('inventory', inventoryToRow(item),
          () => refetchInto('inventory', rowToInventory, 'inventory', set))
      },
      updateInventoryItem: (id, data) => {
        const inventory = get().inventory.map(it =>
          it.id === id ? { ...it, ...(data as any) } : it
        )
        set({ inventory })
        const updated = inventory.find(it => it.id === id)
        if (updated) updateRow('inventory', id, inventoryToRow(updated),
          () => refetchInto('inventory', rowToInventory, 'inventory', set))
      },
      deleteInventoryItem: (id) => {
        const inventory = get().inventory.filter(it => it.id !== id)
        set({ inventory })
        deleteRow('inventory', id,
          () => refetchInto('inventory', rowToInventory, 'inventory', set))
      },
      // Master data
      addProjectType: (name) => {
        if (!get().projectTypes.includes(name)) {
          const projectTypes = [...get().projectTypes, name]
          set({ projectTypes })
          syncToSupabase('projectTypes', projectTypes)
        }
      },
      addPaymentTerm: (name) => {
        if (!get().paymentTerms.includes(name)) {
          const paymentTerms = [...get().paymentTerms, name]
          set({ paymentTerms })
          syncToSupabase('paymentTerms', paymentTerms)
        }
      },
      addDeliveryPeriod: (name) => {
        if (!get().deliveryPeriods.includes(name)) {
          const deliveryPeriods = [...get().deliveryPeriods, name]
          set({ deliveryPeriods })
          syncToSupabase('deliveryPeriods', deliveryPeriods)
        }
      },
      // Invoices — row-level CRUD against the real `invoices` table
      addInvoice: (inv) => {
        const invoices = [inv, ...get().invoices]
        set({ invoices })
        insertRow('invoices', invoiceToRow(inv),
          () => refetchInto('invoices', rowToInvoice, 'invoices', set))
      },
      updateInvoice: (id, data) => {
        const invoices = get().invoices.map(i =>
          i.id === id ? { ...i, ...(data as any) } : i
        )
        set({ invoices })
        const updated = invoices.find(i => i.id === id)
        if (updated) updateRow('invoices', id, invoiceToRow(updated),
          () => refetchInto('invoices', rowToInvoice, 'invoices', set))
      },
      deleteInvoice: (id) => {
        const invoices = get().invoices.filter(i => i.id !== id)
        set({ invoices })
        deleteRow('invoices', id,
          () => refetchInto('invoices', rowToInvoice, 'invoices', set))
      },
      // Tickets — row-level CRUD against the real `tickets` / `ticket_work_logs`
      // tables (NOT a full-array upsert of a JSON blob). This is what fixes
      // the "deleted tickets reappear" bug: each mutation only touches the
      // row(s) it actually changes, so concurrent edits from different users
      // can no longer clobber each other's changes.
      addTicket: (ticket) => {
        const tickets = [ticket, ...get().tickets]
        set({ tickets })
        // If the server detects our client-generated `no` collided with one
        // created concurrently elsewhere, it retries with a bumped number —
        // patch our local copy (and its work log notes) so the UI shows the
        // same number that's now actually saved in the database.
        insertTicketToSupabase(ticket, (newNo) => {
          set({
            tickets: get().tickets.map(t =>
              t.id === ticket.id
                ? {
                    ...t,
                    no: newNo,
                    workLogs: (t.workLogs || []).map(l => ({
                      ...l,
                      note: l.note ? l.note.split(ticket.no).join(newNo) : l.note,
                    })),
                  }
                : t
            ),
          })
        })
        // หมายเหตุ: ไม่ส่งอีเมลแจ้งเตือนตอนเปิดเคสใหม่ — ส่งเฉพาะตอนมีความคืบหน้า/ปิดเคส
      },
      updateTicket: (id, data) => {
        const prev = get().tickets.find(t => t.id === id)
        const tickets = get().tickets.map(t =>
          t.id === id ? { ...t, ...(data as any) } : t
        )
        set({ tickets })
        const updated = tickets.find(t => t.id === id)
        updateTicketInSupabase(id, data as Partial<TicketRow>,
          async () => {
            const rows = await fetchTicketsFromSupabase()
            if (rows) set({ tickets: rows })
          })
        if (prev && updated && (data as any).status && (data as any).status !== prev.status) {
          // ส่งอีเมลแจ้งเตือนเฉพาะตอน "ปิดเคส" — ไม่ส่งตอนเปลี่ยนสถานะทั่วไป
          if ((data as any).status === 'Closed') {
            notifyTicketEvent({
              event: 'closed',
              ticket: updated,
              prevStatus: prev.status,
              accounts: get().customerPortalAccounts,
            })
          }
        }
      },
      deleteTicket: (id) => {
        const tickets = get().tickets.filter(t => t.id !== id)
        set({ tickets })
        deleteTicketFromSupabase(id, async () => {
          const rows = await fetchTicketsFromSupabase()
          if (rows) set({ tickets: rows })
        })
      },
      addWorkLog: (ticketId, log) => {
        const tickets = get().tickets.map(t =>
          t.id === ticketId ? { ...t, workLogs: [...(t.workLogs || []), log] } : t
        )
        set({ tickets })
        const updated = tickets.find(t => t.id === ticketId)
        insertWorkLogToSupabase(ticketId, log, async () => {
          const rows = await fetchTicketsFromSupabase()
          if (rows) set({ tickets: rows })
        })
        if (updated) {
          notifyTicketEvent({
            event: 'workLogAdded',
            ticket: updated,
            workLog: log,
            accounts: get().customerPortalAccounts,
          })
        }
      },
      // Contracts — row-level CRUD against the real `contracts` table
      updateContract: (id, data) => {
        const contracts = get().contracts.map(c =>
          c.id === id ? { ...c, ...(data as any) } : c
        )
        set({ contracts })
        const updated = contracts.find(c => c.id === id)
        if (updated) updateRow('contracts', id, contractToRow(updated),
          () => refetchInto('contracts', rowToContract, 'contracts', set))
      },
      deleteContract: (id) => {
        const contracts = get().contracts.filter(c => c.id !== id)
        set({ contracts })
        deleteRow('contracts', id,
          () => refetchInto('contracts', rowToContract, 'contracts', set))
      },
      // Milestones — row-level CRUD against the real `milestones` table
      // (child of `projects` via `project_id` FK)
      addMilestone: (milestone) => {
        const milestones = [...get().milestones, milestone]
        set({ milestones })
        insertRow('milestones', milestoneToRow(milestone),
          () => refetchInto('milestones', rowToMilestone, 'milestones', set))
      },
      updateMilestone: (id, data) => {
        const milestones = get().milestones.map(m =>
          m.id === id ? { ...m, ...(data as any) } : m
        )
        set({ milestones })
        const updated = milestones.find(m => m.id === id)
        if (updated) updateRow('milestones', id, milestoneToRow(updated),
          () => refetchInto('milestones', rowToMilestone, 'milestones', set))
      },
      deleteMilestone: (id) => {
        const milestones = get().milestones.filter(m => m.id !== id)
        set({ milestones })
        deleteRow('milestones', id,
          () => refetchInto('milestones', rowToMilestone, 'milestones', set))
      },
      // Notifications
      // Notifications — row-level CRUD against the real `notifications`
      // table (text id). Same philosophy as tickets/Wave 1-3: each alert is
      // its own row, so concurrent reads/inserts from different staff never
      // clobber each other and there's no demo-data ghost fallback.
      markNotificationRead: (id) => {
        const notifications = get().notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
        set({ notifications })
        const target = notifications.find(n => n.id === id)
        if (target) updateRowByTextId('notifications', String(id), notificationToRow(target))
      },
      markAllNotificationsRead: () => {
        const notifications = get().notifications.map(n => ({ ...n, read: true }))
        set({ notifications })
        for (const n of notifications) updateRowByTextId('notifications', String(n.id), notificationToRow(n))
      },
      addNotification: (n) => {
        const notifications = [n, ...get().notifications]
        set({ notifications })
        insertRow('notifications', notificationToRow(n),
          () => refetchInto('notifications', rowToNotification, 'notifications', set))
      },
      // Users (Staff) — row-level CRUD against the real `users` table.
      // Now properly synced server-side, so accounts added/edited by any
      // staff member can log in from any device (fixes the old localStorage-
      // only bug where addUser/updateUser changes never reached auth).
      addUser: (user) => {
        const users = [...get().users, user]
        set({ users })
        insertRow('users', userToRow(user),
          () => refetchInto('users', rowToUser, 'users', set))
      },
      updateUser: (id, data) => {
        const users = get().users.map(u =>
          u.id === id ? { ...u, ...(data as any) } : u
        )
        set({ users })
        const updated = users.find(u => u.id === id)
        if (updated) updateRow('users', id, userToRow(updated),
          () => refetchInto('users', rowToUser, 'users', set))
      },
      deleteUser: (id) => {
        const users = get().users.filter(u => u.id !== id)
        set({ users })
        deleteRow('users', id,
          () => refetchInto('users', rowToUser, 'users', set))
      },
      // Customer Portal Accounts — row-level CRUD against the real
      // `customer_portal_accounts` table (jsonb columns for multi-value
      // contact fields), so logins/edits are consistent everywhere.
      addCustomerPortalAccount: (account) => {
        const customerPortalAccounts = [...get().customerPortalAccounts, account]
        set({ customerPortalAccounts })
        insertRow('customer_portal_accounts', customerPortalAccountToRow(account),
          () => refetchInto('customer_portal_accounts', rowToCustomerPortalAccount, 'customerPortalAccounts', set))
      },
      updateCustomerPortalAccount: (id, data) => {
        const customerPortalAccounts = get().customerPortalAccounts.map(a =>
          a.id === id ? { ...a, ...data } : a
        )
        set({ customerPortalAccounts })
        const updated = customerPortalAccounts.find(a => a.id === id)
        if (updated) updateRow('customer_portal_accounts', id, customerPortalAccountToRow(updated),
          () => refetchInto('customer_portal_accounts', rowToCustomerPortalAccount, 'customerPortalAccounts', set))
      },
      deleteCustomerPortalAccount: (id) => {
        const customerPortalAccounts = get().customerPortalAccounts.filter(a => a.id !== id)
        set({ customerPortalAccounts })
        deleteRow('customer_portal_accounts', id,
          () => refetchInto('customer_portal_accounts', rowToCustomerPortalAccount, 'customerPortalAccounts', set))
      },
    }),
    {
      name: 'neft-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        lang: state.lang,
        // tickets, customers, vendors, contracts, inventory, opportunities,
        // projects, milestones, invoices, quotations, purchaseOrders,
        // notifications, users, customerPortalAccounts intentionally
        // excluded — they now live in real relational tables and are always
        // fetched fresh from Supabase (storing them in localStorage caused
        // stale/deleted data to reappear, and was the root cause of the
        // "users added on one device can't log in on another" problem —
        // the original "ghost data" bug)
        projectTypes:  state.projectTypes,
        paymentTerms:  state.paymentTerms,
        deliveryPeriods:state.deliveryPeriods,
      }),
    }
  )
)
