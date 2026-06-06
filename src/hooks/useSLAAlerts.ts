'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'

/**
 * useSLAAlerts — runs once per session on mount.
 * Scans open tickets for At Risk / Breached SLA and generates
 * notifications for any ticket that doesn't already have one.
 */
export function useSLAAlerts() {
  const { tickets, notifications, addNotification } = useAppStore()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const openStatuses = ['Open','Assigned','In Progress','Pending Customer','Pending Vendor','Escalated']
    const openTickets = tickets.filter(t => openStatuses.includes(t.status))

    const now = new Date()

    openTickets.forEach(ticket => {
      const alertKey = `sla-alert-${ticket.id}`
      const alreadyNotified = notifications.some(n => n.id === alertKey as any)
      if (alreadyNotified) return

      const resolutionDue = ticket.resolutionDue ? new Date(ticket.resolutionDue) : null
      const responseDue   = ticket.responseDue   ? new Date(ticket.responseDue)   : null
      const hoursToResolution = resolutionDue ? (resolutionDue.getTime() - now.getTime()) / 36e5 : null
      const hoursToResponse   = responseDue   ? (responseDue.getTime()   - now.getTime()) / 36e5 : null

      const isBreached  = ticket.slaStatus === 'Breached'
        || (hoursToResolution !== null && hoursToResolution < 0)
        || (hoursToResponse !== null && hoursToResponse < 0)

      const isAtRisk    = !isBreached && (
        ticket.slaStatus === 'At Risk'
        || (hoursToResolution !== null && hoursToResolution >= 0 && hoursToResolution <= 4)
        || (hoursToResponse !== null && hoursToResponse >= 0 && hoursToResponse <= 1)
      )

      if (!isBreached && !isAtRisk) return

      const type = isBreached ? 'critical' : 'warning'
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })

      const title = isBreached
        ? `SLA Breached — ${ticket.title}`
        : `SLA ใกล้หมดเวลา — ${ticket.title}`

      const message = isBreached
        ? `Ticket #${ticket.id} (${ticket.severity}) เกิน SLA แล้ว — ดำเนินการแก้ไขโดยด่วน`
        : `Ticket #${ticket.id} (${ticket.severity}) เหลือเวลาน้อยกว่า ${hoursToResolution !== null && hoursToResolution <= 4 ? Math.max(0, Math.round(hoursToResolution)) + ' ชั่วโมง' : '1 ชั่วโมง'} ก่อนเกิน SLA`

      addNotification({
        id: alertKey as any,
        module: 'Service',
        type,
        title,
        message,
        time: timeStr,
        date: dateStr,
        read: false,
        link: '/service',
      })
    })
  }, []) // intentionally empty — run once per mount
}
