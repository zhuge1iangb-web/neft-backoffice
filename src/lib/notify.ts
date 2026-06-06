/**
 * NEFT Notification helper — ใช้บน client side
 * เรียก POST /api/notify ซึ่งส่งผ่าน LINE Notify / Email SMTP
 */

import type { CustomerPortalAccount } from '@/store'
import type { WorkLog } from '@/lib/demo-data'

export type TicketNotifyEvent = 'created' | 'statusChanged' | 'workLogAdded' | 'closed'

export interface NotifyPayload {
  channels: ('line' | 'email')[]
  message: string
  subject?: string
  lineTokens?: string[]   // LINE Notify tokens ของลูกค้าคนนั้น
  emailTo?: string[]      // email ที่จะส่ง
  ticketNo?: string
  caseStatus?: string
  customerName?: string
}

export interface NotifyResult {
  ok: boolean
  results?: Record<string, unknown>
  error?: string
}

/**
 * ส่งแจ้งเตือนผ่าน /api/notify
 * ใช้ใน Service page หลังจาก addWorkLog / updateTicket status
 */
export async function sendNotification(payload: NotifyPayload): Promise<NotifyResult> {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return data as NotifyResult
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * สร้างข้อความแจ้งเตือนมาตรฐาน NEFT (รูปแบบเดิม — คงไว้เพื่อความเข้ากันได้)
 */
export function buildTicketNotifyMessage(opts: {
  ticketNo: string
  subject: string
  status: string
  action: string
  note?: string
  customerName?: string
  updatedBy?: string
}): string {
  const lines = [
    `🔔 แจ้งเตือนสถานะ Case จาก NEFT Solution`,
    ``,
    `📋 Case No : ${opts.ticketNo}`,
    `🏢 ลูกค้า  : ${opts.customerName || '-'}`,
    `📌 หัวเรื่อง: ${opts.subject}`,
    ``,
    `✅ สถานะใหม่: ${opts.status}`,
    `🔧 การดำเนินการ: ${opts.action}`,
  ]
  if (opts.note) lines.push(`📝 หมายเหตุ: ${opts.note}`)
  if (opts.updatedBy) lines.push(`👤 อัพเดตโดย: ${opts.updatedBy}`)
  lines.push(``, `📞 สอบถามเพิ่มเติม: support@neftsolution.co.th`)
  lines.push(`🌐 ดูสถานะ: https://neft-backofficev2.vercel.app/customer-portal`)
  return lines.join('\n')
}

// ── Lifecycle-event notification (auto-fired from the store) ─────────────────

type TicketLike = {
  id: number
  no: string
  customerId: number
  customerName: string
  subject: string
  severity: string
  status: string
  assignedTo: string
  description?: string
}

const EVENT_LABEL_TH: Record<TicketNotifyEvent, string> = {
  created: 'เปิดเคสใหม่',
  statusChanged: 'อัปเดตสถานะเคส',
  workLogAdded: 'มีความคืบหน้าใหม่',
  closed: 'ปิดเคส',
}

const EVENT_SUBJECT_TH: Record<TicketNotifyEvent, string> = {
  created: 'แจ้งเปิดเคสใหม่',
  statusChanged: 'แจ้งอัปเดตสถานะเคส',
  workLogAdded: 'แจ้งความคืบหน้าเคส',
  closed: 'แจ้งปิดเคส',
}

/**
 * สร้างข้อความแจ้งเตือนตาม "เหตุการณ์" ของเคส (ใช้ในระบบแจ้งเตือนอัตโนมัติ)
 */
export function buildTicketEventMessage(opts: {
  event: TicketNotifyEvent
  ticket: TicketLike
  prevStatus?: string
  workLog?: WorkLog
}): { subject: string; text: string } {
  const { event, ticket, prevStatus, workLog } = opts

  const lines: string[] = []
  lines.push(`เรียน ลูกค้า ${ticket.customerName}`)
  lines.push('')
  lines.push(`${EVENT_LABEL_TH[event]} — เลขที่เคส ${ticket.no}`)
  lines.push('')
  lines.push(`เรื่อง: ${ticket.subject}`)
  lines.push(`ระดับความรุนแรง: ${ticket.severity}`)
  lines.push(`ผู้รับผิดชอบ: ${ticket.assignedTo}`)

  switch (event) {
    case 'created':
      lines.push(`สถานะ: ${ticket.status}`)
      if (ticket.description) {
        lines.push('')
        lines.push(`รายละเอียดที่แจ้ง: ${ticket.description}`)
      }
      lines.push('')
      lines.push('ทีมงานได้รับเรื่องและจะดำเนินการตรวจสอบโดยเร็วที่สุด')
      break
    case 'statusChanged':
      lines.push('')
      lines.push(`สถานะเปลี่ยนจาก "${prevStatus ?? '-'}" เป็น "${ticket.status}"`)
      break
    case 'workLogAdded':
      lines.push(`สถานะปัจจุบัน: ${ticket.status}`)
      if (workLog) {
        lines.push('')
        lines.push(`ความคืบหน้าล่าสุด: ${workLog.action}`)
        if (workLog.note) lines.push(`รายละเอียด: ${workLog.note}`)
        lines.push(`บันทึกโดย: ${workLog.user}`)
      }
      break
    case 'closed':
      lines.push('')
      lines.push('เคสนี้ได้รับการปิดเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ')
      break
  }

  lines.push('')
  lines.push('— ทีมงาน NEFT Solution')
  lines.push('(อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับอีเมลฉบับนี้โดยตรง)')
  lines.push('สอบถามเพิ่มเติม: support@neftsolution.co.th')

  return {
    subject: `[NEFT] ${EVENT_SUBJECT_TH[event]} — ${ticket.no} (${ticket.customerName})`,
    text: lines.join('\n'),
  }
}

/**
 * หา email ผู้รับการแจ้งเตือนของลูกค้ารายหนึ่ง จาก CustomerPortalAccount
 * (ต้อง active + เปิด notifyViaEmail) — ใช้ emails[] ถ้ามี ไม่งั้น fallback เป็น email login
 */
export function resolveTicketEmailRecipients(
  customerId: number,
  accounts: CustomerPortalAccount[]
): string[] {
  const recipients = new Set<string>()
  accounts
    .filter(a => a.customerId === customerId && a.active && a.notifyViaEmail)
    .forEach(a => {
      if (a.emails?.length) {
        a.emails.filter(Boolean).forEach(e => recipients.add(e))
      } else if (a.email) {
        recipients.add(a.email)
      }
    })
  return Array.from(recipients)
}

/**
 * ยิงแจ้งเตือนอัตโนมัติตามเหตุการณ์ของเคส — เรียกจาก store actions
 * (addTicket / updateTicket / addWorkLog) ปลอดภัยต่อ caller: ไม่ throw,
 * แค่ log error ถ้าล้มเหลว และข้ามไปเงียบๆ ถ้าไม่มีผู้รับที่เปิดแจ้งเตือนทางอีเมล
 */
export async function notifyTicketEvent(opts: {
  event: TicketNotifyEvent
  ticket: TicketLike
  accounts: CustomerPortalAccount[]
  prevStatus?: string
  workLog?: WorkLog
}): Promise<void> {
  try {
    const emailTo = resolveTicketEmailRecipients(opts.ticket.customerId, opts.accounts)
    if (emailTo.length === 0) return

    const { subject, text } = buildTicketEventMessage(opts)

    await sendNotification({
      channels: ['email'],
      message: text,
      subject,
      emailTo,
      ticketNo: opts.ticket.no,
      caseStatus: opts.ticket.status,
      customerName: opts.ticket.customerName,
    })
  } catch (err) {
    console.error('[notifyTicketEvent] failed:', err)
  }
}
