import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  await sendNotification(body)
  return NextResponse.json({ ok: true })
}
