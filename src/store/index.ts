import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  demoUsers, demoCustomers, demoOpportunities, demoProjects,
  demoMilestones, demoInvoices, demoTickets, demoContracts, demoNotifications
} from '@/lib/demo-data'
import type { Lang } from '@/lib/translations'

type User = typeof demoUsers[number]

interface AppState {
  // Auth
  currentUser: User | null
  login: (username: string, password: string) => boolean
  logout: () => void

  // Language
  lang: Lang
  setLang: (l: Lang) => void

  // Data
  customers: typeof demoCustomers
  opportunities: typeof demoOpportunities
  projects: typeof demoProjects
  milestones: typeof demoMilestones
  invoices: typeof demoInvoices
  tickets: typeof demoTickets
  contracts: typeof demoContracts
  notifications: typeof demoNotifications
  users: typeof demoUsers

  // Actions
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      login: (username, password) => {
        const user = demoUsers.find(u => u.username === username && u.password === password)
        if (user) { set({ currentUser: user }); return true }
        return false
      },
      logout: () => set({ currentUser: null }),

      // Language
      lang: 'th',
      setLang: (l) => set({ lang: l }),

      // Data
      customers: demoCustomers,
      opportunities: demoOpportunities,
      projects: demoProjects,
      milestones: demoMilestones,
      invoices: demoInvoices,
      tickets: demoTickets,
      contracts: demoContracts,
      notifications: demoNotifications,
      users: demoUsers,

      // Actions
      addOpportunity: (opp) => set(s => ({ opportunities: [opp, ...s.opportunities] })),
      updateOpportunity: (id, data) =>
        set(s => ({ opportunities: s.opportunities.map(o => o.id === id ? { ...o, ...data } : o) })),

      addProject: (proj) => set(s => ({ projects: [proj, ...s.projects] })),
      updateProject: (id, data) =>
        set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...data } : p) })),

      addTicket: (ticket) => set(s => ({ tickets: [ticket, ...s.tickets] })),
      updateTicket: (id, data) =>
        set(s => ({ tickets: s.tickets.map(t => t.id === id ? { ...t, ...data } : t) })),

      addInvoice: (inv) => set(s => ({ invoices: [inv, ...s.invoices] })),

      markNotificationRead: (id) =>
        set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
      markAllNotificationsRead: () =>
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
    }),
    {
      name: 'neft-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        lang: state.lang,
        opportunities: state.opportunities,
        projects: state.projects,
        tickets: state.tickets,
        invoices: state.invoices,
        notifications: state.notifications,
      }),
    }
  )
)
