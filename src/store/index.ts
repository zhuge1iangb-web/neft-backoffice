/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, hasSupabase } from '@/lib/supabase'
import {
  demoUsers, demoCustomers, demoOpportunities, demoProjects,
  demoMilestones, demoInvoices, demoTickets, demoContracts, demoNotifications
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
  addCustomer: (customer: typeof demoCustomers[number]) => void
  addOpportunity: (opp: typeof demoOpportunities[number]) => void
  updateOpportunity: (id: number, data: Partial<typeof demoOpportunities[number]>) => void
  addProject: (proj: typeof demoProjects[number]) => void
  updateProject: (id: number, data: Partial<typeof demoProjects[number]>) => void
  addTicket: (ticket: typeof demoTickets[number]) => void
  updateTicket: (id: number, data: Partial<typeof demoTickets[number]>) => void
  addInvoice: (inv: typeof demoInvoices[number]) => void
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
          const keys = ['customers','opportunities','projects','milestones','invoices','tickets','contracts','notifications']
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
      addCustomer: (customer) => {
        const customers = [customer, ...get().customers]
        set({ customers })
        syncToSupabase('customers', customers)
      },
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
      addInvoice: (inv) => {
        const invoices = [inv, ...get().invoices]
        set({ invoices })
        syncToSupabase('invoices', invoices)
      },
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
      }),
    }
  )
)
