import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel Cron เรียก endpoint นี้วันละครั้ง (ดู vercel.json) เพื่อ query เบาๆ
// ไปที่ Supabase — กัน free tier auto-pause หลังไม่มี activity ~7 วัน
// (เหตุการณ์ DB ถูก pause เมื่อ ก.ค. 2026 ทำให้ระบบเซฟข้อมูลไม่ได้ทั้งหมด)

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: 'supabase env not configured' }, { status: 500 })
  }
  const supabase = createClient(url, key)
  const { error } = await supabase.from('app_data').select('key').limit(1)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
