/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, hasSupabase } from '@/lib/supabase'
import {
  demoUsers, demoCustomers, demoOpportunities, demoProjects,
  demoMilestones, demoInvoices, demoTickets, demoContracts, demoNotifications,
  demoVendors, demoQuotations, demoPurchaseOrders, demoInventory,
  demoProjectTypes, demoPaymentTerms, demoDeliveryPeriods, generateNo
} from '@/lib/demo-data'
import type { Lang } from '@/lib/translations'

type User = typeof demoUsers[number]

interface AppState {
  currentUser: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  lang: Lang
  setLang: (l: Lang) => void
  initialized: boolean
  initialize: () => Promise<void>
  customers: typeof demoCustomers
  opportunities: typeof demoOpportunities
  projects: typeof demoProjects
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
  // Customers
  addCustomer: (customer: typeof demoCustomers[number]) => void
  updateCustomer: (id: number, data: Partial<typeof demoCustomers[number]>) => void
  deleteCustomer: (id: number) => void
  // Opportunities
  addOpportunity: (opp: typeof demoOpportunities[number]) => void
  updateOpportunity: (id: number, data: Partial<typeof demoOpportunities[number]>) => void
  deleteOpportunity: (id: number) => void
  // Projects
  addProject: (proj: typeof demoProjects[number]) => void
  updateProject: (id: number, data: Partial<typeof demoProjects[number]>) => void
  deleteProject: (id: number) => void
  createProjectFromOpp: (oppId: number) => void
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      login: (username, password) => {
        const user = demoUsers.find(u => u.username === username && u.password === password)
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
          const keys = ['customers','opportunities','projects','milestones','invoices','tickets','contracts','notifications','vendors','quotations','purchaseOrders','inventory','projectTypes','paymentTerms','deliveryPeriods']
          const { data, error } = await supabase
            .from('app_data')
            .select('key, value')
            .in('key', keys)
          if (error) throw error
          if (!data || data.length === 0) {
            await supabase.from('app_data').insert([
              { key: 'customers',     value: demoCustomers },
              { key: 'opportunities', value: demoOpportunities },
              { key: 'projects',      value: demoProjects },
              { key: 'milestones',    value: demoMilestones },
              { key: 'invoices',      value: demoInvoices },
              { key: 'tickets',       value: demoTickets },
              { key: 'contracts',     value: demoContracts },
              { key: 'notifications', value: demoNotifications },
              { key: 'vendors',       value: demoVendors },
              { key: 'quotations',    value: demoQuotations },
              { key: 'purchaseOrders',value: demoPurchaseOrders },
              { key: 'inventory',     value: demoInventory },
              { key: 'projectTypes',  value: demoProjectTypes },
              { key: 'paymentTerms',  value: demoPaymentTerms },
              { key: 'deliveryPeriods',value: demoDeliveryPeriods },
            ])
          } else {
            const m: Record<string, any> = {}
            data.forEach(r => { m[r.key] = r.value })
            set({
              customers:     m.customers     ?? demoCustomers,
              opportunities: m.opportunities ?? demoOpportunities,
              projects:      m.projects      ?? demoProjects,
              milestones:    m.milestones    ?? demoMilestones,
              invoices:      m.invoices      ?? demoInvoices,
              tickets:       m.tickets       ?? demoTickets,
              contracts:     m.contracts     ?? demoContracts,
              notifications: m.notifications ?? demoNotifications,
              vendors:       m.vendors       ?? demoVendors,
              quotations:    m.quotations    ?? demoQuotations,
              purchaseOrders:m.purchaseOrders ?? demoPurchaseOrders,
              inventory:     m.inventory     ?? demoInventory,
              projectTypes:  m.projectTypes  ?? demoProjectTypes,
              paymentTerms:  m.paymentTerms  ?? demoPaymentTerms,
              deliveryPeriods:m.deliveryPeriods ?? demoDeliveryPeriods,
            })
          }
        } catch (e) {
          console.error('Supabase init error:', e)
        }
        set({ initialized: true })
      },
      customers:     demoCustomers,
      opportunities: demoOpportunities,
      projects:      demoProjects,
      milestones:    demoMilestones,
      invoices:      demoInvoices,
      tickets:       demoTickets,
      contracts:     demoContracts,
      notifications: demoNotifications,
      users:         demoUsers,
      vendors:       demoVendors,
      quotations:    demoQuotations,
      purchaseOrders:demoPurchaseOrders,
      inventory:     demoInventory,
      projectTypes:  demoProjectTypes,
      paymentTerms:  demoPaymentTerms,
      deliveryPeriods:demoDeliveryPeriods,
      // Customers
      addCustomer: (customer) => {
        const customers = [customer, ...get().customers]
        set({ customers })
        syncToSupabase('customers', customers)
      },
      updateCustomer: (id, data) => {
        const customers = get().customers.map(c =>
          c.id === id ? { ...c, ...(data as any) } : c
        )
        set({ customers })
        syncToSupabase('customers', customers)
      },
      deleteCustomer: (id) => {
        const customers = get().customers.filter(c => c.id !== id)
        set({ customers })
        syncToSupabase('customers', customers)
      },
      // Opportunities
      addOpportunity: (opp) => {
        const opportunities = [opp, ...get().opportunities]
        set({ opportunities })
        syncToSupabase('opportunities', opportunities)
      },
      updateOpportunity: (id, data) => {
        const opportunities = get().opportunities.map(o =>
          o.id === id ? { ...o, ...(data as any) } : o
        )
        set({ opportunities })
        syncToSupabase('opportunities', opportunities)
      },
      deleteOpportunity: (id) => {
        const opportunities = get().opportunities.filter(o => o.id !== id)
        set({ opportunities })
        syncToSupabase('opportunities', opportunities)
      },
      // Projects
      addProject: (proj) => {
        const projects = [proj, ...get().projects]
        set({ projects })
        syncToSupabase('projects', projects)
      },
      updateProject: (id, data) => {
        const projects = get().projects.map(p =>
          p.id === id ? { ...p, ...(data as any) } : p
        )
        set({ projects })
        syncToSupabase('projects', projects)
      },
      deleteProject: (id) => {
        const projects = get().projects.filter(p => p.id !== id)
        set({ projects })
        syncToSupabase('projects', projects)
      },
      createProjectFromOpp: (oppId) => {
        const opp = get().opportunities.find(o => o.id === oppId)
        if (!opp) return
        const projCode = `PRJ-${new Date().getFullYear()}-${String(get().projects.length + 1).padStart(3, '0')}`
        const newProj: any = {
          id: Date.now(),
          code: projCode,
          name: opp.name.replace('Opportunity', 'Project').replace('opportunity', 'project'),
          customerId: opp.customerId,
          customerName: opp.customerName,
          pm: 'ยังไม่มอบหมาย',
          type: opp.projectType || 'Implementation',
          contractValue: opp.value,
          estimatedCost: opp.cost,
          gp: opp.gp,
          gpPct: opp.gpPct,
          gpTarget: Math.round(opp.gpPct || 30),
          startDate: new Date().toISOString().split('T')[0],
          targetEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Planning',
          progress: 0,
          latestUpdate: 'สร้างจากโอกาสขาย',
          blocker: null,
          sourceOppId: oppId,
          oppNo: opp.no,
          quotationId: opp.quotationIds?.[0] || null,
          paymentTerm: opp.paymentTerm || null,
          deliveryPeriod: opp.deliveryPeriod || null,
        }
        get().addProject(newProj)
      },
      // Vendors
      addVendor: (vendor) => {
        const vendors = [vendor, ...get().vendors]
        set({ vendors })
        syncToSupabase('vendors', vendors)
      },
      updateVendor: (id, data) => {
        const vendors = get().vendors.map(v =>
          v.id === id ? { ...v, ...(data as any) } : v
        )
        set({ vendors })
        syncToSupabase('vendors', vendors)
      },
      deleteVendor: (id) => {
        const vendors = get().vendors.filter(v => v.id !== id)
        set({ vendors })
        syncToSupabase('vendors', vendors)
      },
      // Quotations
      addQuotation: (q) => {
        const quotations = [q, ...get().quotations]
        set({ quotations })
        syncToSupabase('quotations', quotations)
      },
      updateQuotation: (id, data) => {
        const quotations = get().quotations.map(q =>
          q.id === id ? { ...q, ...(data as any) } : q
        )
        set({ quotations })
        syncToSupabase('quotations', quotations)
      },
      deleteQuotation: (id) => {
        const quotations = get().quotations.filter(q => q.id !== id)
        set({ quotations })
        syncToSupabase('quotations', quotations)
      },
      // Purchase Orders
      addPurchaseOrder: (po) => {
        const purchaseOrders = [po, ...get().purchaseOrders]
        set({ purchaseOrders })
        syncToSupabase('purchaseOrders', purchaseOrders)
      },
      updatePurchaseOrder: (id, data) => {
        const purchaseOrders = get().purchaseOrders.map(po =>
          po.id === id ? { ...po, ...(data as any) } : po
        )
        set({ purchaseOrders })
        syncToSupabase('purchaseOrders', purchaseOrders)
      },
      deletePurchaseOrder: (id) => {
        const purchaseOrders = get().purchaseOrders.filter(po => po.id !== id)
        set({ purchaseOrders })
        syncToSupabase('purchaseOrders', purchaseOrders)
      },
      // Inventory
      addInventoryItem: (item) => {
        const inventory = [item, ...get().inventory]
        set({ inventory })
        syncToSupabase('inventory', inventory)
      },
      updateInventoryItem: (id, data) => {
        const inventory = get().inventory.map(it =>
          it.id === id ? { ...it, ...(data as any) } : it
        )
        set({ inventory })
        syncToSupabase('inventory', inventory)
      },
      deleteInventoryItem: (id) => {
        const inventory = get().inventory.filter(it => it.id !== id)
        set({ inventory })
        syncToSupabase('inventory', inventory)
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
      // Invoices
      addInvoice: (inv) => {
        const invoices = [inv, ...get().invoices]
        set({ invoices })
        syncToSupabase('invoices', invoices)
      },
      updateInvoice: (id, data) => {
        const invoices = get().invoices.map(i =>
          i.id === id ? { ...i, ...(data as any) } : i
        )
        set({ invoices })
        syncToSupabase('invoices', invoices)
      },
      deleteInvoice: (id) => {
        const invoices = get().invoices.filter(i => i.id !== id)
        set({ invoices })
        syncToSupabase('invoices', invoices)
      },
      // Tickets
      addTicket: (ticket) => {
        const tickets = [ticket, ...get().tickets]
        set({ tickets })
        syncToSupabase('tickets', tickets)
      },
      updateTicket: (id, data) => {
        const tickets = get().tickets.map(t =>
          t.id === id ? { ...t, ...(data as any) } : t
        )
        set({ tickets })
        syncToSupabase('tickets', tickets)
      },
      deleteTicket: (id) => {
        const tickets = get().tickets.filter(t => t.id !== id)
        set({ tickets })
        syncToSupabase('tickets', tickets)
      },
      // Contracts
      updateContract: (id, data) => {
        const contracts = get().contracts.map(c =>
          c.id === id ? { ...c, ...(data as any) } : c
        )
        set({ contracts })
        syncToSupabase('contracts', contracts)
      },
      deleteContract: (id) => {
        const contracts = get().contracts.filter(c => c.id !== id)
        set({ contracts })
        syncToSupabase('contracts', contracts)
      },
      // Milestones
      addMilestone: (milestone) => {
        const milestones = [...get().milestones, milestone]
        set({ milestones })
        syncToSupabase('milestones', milestones)
      },
      updateMilestone: (id, data) => {
        const milestones = get().milestones.map(m =>
          m.id === id ? { ...m, ...(data as any) } : m
        )
        set({ milestones })
        syncToSupabase('milestones', milestones)
      },
      deleteMilestone: (id) => {
        const milestones = get().milestones.filter(m => m.id !== id)
        set({ milestones })
        syncToSupabase('milestones', milestones)
      },
      // Notifications
      markNotificationRead: (id) => {
        const notifications = get().notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
        set({ notifications })
        syncToSupabase('notifications', notifications)
      },
      markAllNotificationsRead: () => {
        const notifications = get().notifications.map(n => ({ ...n, read: true }))
        set({ notifications })
        syncToSupabase('notifications', notifications)
      },
    }),
    {
      name: 'neft-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        lang: state.lang,
        customers:     state.customers,
        opportunities: state.opportunities,
        projects:      state.projects,
        milestones:    state.milestones,
        invoices:      state.invoices,
        tickets:       state.tickets,
        contracts:     state.contracts,
        notifications: state.notifications,
        vendors:       state.vendors,
        quotations:    state.quotations,
        purchaseOrders:state.purchaseOrders,
        inventory:     state.inventory,
        projectTypes:  state.projectTypes,
        paymentTerms:  state.paymentTerms,
        deliveryPeriods:state.deliveryPeriods,
      }),
    }
  )
)
