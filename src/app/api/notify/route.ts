/**
 * NEFT Notification API
 * POST /api/notify
 *
 * รองรับ:
 *  - LINE Notify  → ต้องการ LINE_NOTIFY_TOKEN ใน env
 *  - Email (SMTP) → ต้องการ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM ใน env
 *
 * Body: {
 *   channels: ('line' | 'email')[]
 *   message: string           // ข้อความหลัก (ใช้ทั้ง LINE และ email body)
 *   subject?: string          // สำหรับ email subject เท่านั้น
 *   lineTokens?: string[]     // override tokens (ถ้าไม่ส่ง ใช้ LINE_NOTIFY_TOKEN จาก env)
 *   emailTo?: string[]        // ที่อยู่อีเมล์ผู้รับ
 *   // metadata สำหรับ log / audit
 *   ticketNo?: string
 *   caseStatus?: string
 *   customerName?: string
 * }
 *
 * Response: { ok: true, results: { line?: string, email?: string } }
 *           { ok: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server'

// ── helpers ──────────────────────────────────────────────────────────────────

async function sendLineNotify(token: string, message: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  })
  return { ok: res.ok, status: res.status }
}

async function sendEmail(opts: {
  to: string[]
  subject: string
  text: string
}): Promise<{ ok: boolean; message: string }> {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  if (!host || !user || !pass) {
    return { ok: false, message: 'SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS)' }
  }

  // ── dynamic import of nodemailer (server-side only) ──────────────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer') // eslint-disable-line

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `"NEFT Solution" <${from}>`,
      to: opts.to.join(', '),
      subject: opts.subject,
      text: opts.text,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${opts.text}</pre>`,
    })
    return { ok: true, message: `Sent to ${opts.to.join(', ')}` }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: msg }
  }
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      channels: ('line' | 'email')[]
      message: string
      subject?: string
      lineTokens?: string[]
      emailTo?: string[]
      ticketNo?: string
      caseStatus?: string
      customerName?: string
    }

    const { channels, message, subject, lineTokens, emailTo } = body

    if (!channels || !message) {
      return NextResponse.json({ ok: false, error: 'channels and message are required' }, { status: 400 })
    }

    const results: Record<string, unknown> = {}

    // ── LINE Notify ──────────────────────────────────────────────────────────
    if (channels.includes('line')) {
      const tokens: string[] = lineTokens?.length
        ? lineTokens
        : process.env.LINE_NOTIFY_TOKEN
          ? [process.env.LINE_NOTIFY_TOKEN]
          : []

      if (tokens.length === 0) {
        results.line = 'SKIPPED: no LINE Notify token configured'
      } else {
        try {
          const lineResults = await Promise.all(tokens.map(t => sendLineNotify(t, message)))
          const failed = lineResults.filter(r => !r.ok)
          results.line = failed.length === 0
            ? `OK: sent to ${tokens.length} token(s)`
            : `PARTIAL: ${failed.length}/${tokens.length} failed (status ${failed.map(f => f.status).join(',')})`
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          // LINE Notify (notify-api.line.me) was officially discontinued by LINE on 2025-03-31.
          results.line = `ERROR: ${msg} (NOTE: LINE Notify service was discontinued by LINE on 31 Mar 2025 — this channel is no longer usable; consider migrating to LINE Messaging API)`
        }
      }
    }

    // ── Email ────────────────────────────────────────────────────────────────
    if (channels.includes('email')) {
      const recipients = emailTo?.filter(Boolean) ?? []
      if (recipients.length === 0) {
        results.email = 'SKIPPED: no emailTo recipients provided'
      } else {
        const emailResult = await sendEmail({
          to: recipients,
          subject: subject || `[NEFT] Case Update${body.ticketNo ? ' — ' + body.ticketNo : ''}`,
          text: message,
        })
        results.email = emailResult.ok ? `OK: ${emailResult.message}` : `ERROR: ${emailResult.message}`
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/notify] error:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
