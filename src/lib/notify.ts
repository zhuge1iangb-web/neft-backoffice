/**
 * NEFT Notification helper — ใช้บน client side
 * เรียก POST /api/notify ซึ่งส่งผ่าน LINE Notify / Email SMTP
 */

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
 * สร้างข้อความแจ้งเตือนมาตรฐาน NEFT
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
