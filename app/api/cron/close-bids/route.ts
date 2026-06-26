import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  // Close expired bidding windows
  const { data: expiredChapters } = await supabase
    .from('chapters')
    .select('id, chapter_num, story_id')
    .eq('status', 'bidding')
    .lt('bid_deadline', new Date().toISOString())

  const results = []
  for (const ch of expiredChapters || []) {
    await supabase.rpc('close_bidding', { p_chapter_id: ch.id })

    // Find winner and notify them
    const { data: winningBid } = await supabase
      .from('bids')
      .select('*, bidder_profile:profiles!bidder_id(*)')
      .eq('chapter_id', ch.id)
      .eq('status', 'won')
      .single()

    if (winningBid) {
      const { data: story } = await supabase.from('stories').select('title, guideline').eq('id', ch.story_id).single()
      const { data: authUser } = await supabase.auth.admin.getUserById(winningBid.bidder_id)

      if (authUser?.user?.email && story) {
        await sendNotification({
          type: 'bid_won',
          to_email: authUser.user.email,
          to_name: (winningBid.bidder_profile as any)?.display_name ?? 'Author',
          data: {
            story_title: story.title,
            chapter_num: String(ch.chapter_num),
            bid_amount: String(winningBid.amount),
            guideline: story.guideline,
          },
        })
      }
    }
    results.push({ chapter_id: ch.id, winner: winningBid?.bidder_id ?? null })
  }

  // Handle overdue write deadlines
  const { data: overdueChapters } = await supabase
    .from('chapters')
    .select('id, chapter_num, story_id, author_id, write_deadline')
    .eq('status', 'writing')
    .lt('write_deadline', new Date().toISOString())

  for (const ch of overdueChapters || []) {
    await supabase.rpc('handle_missed_deadline', { p_chapter_id: ch.id })
    results.push({ chapter_id: ch.id, action: 'missed_deadline' })
  }

  // Send 48-hour deadline reminders
  const in48h = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  const in47h = new Date(Date.now() + 47 * 3600 * 1000).toISOString()
  const { data: dueSoon } = await supabase
    .from('chapters')
    .select('id, chapter_num, story_id, author_id')
    .eq('status', 'writing')
    .gte('write_deadline', in47h)
    .lte('write_deadline', in48h)

  for (const ch of dueSoon || []) {
    const { data: story } = await supabase.from('stories').select('title').eq('id', ch.story_id).single()
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', ch.author_id).single()
    const { data: authUser } = await supabase.auth.admin.getUserById(ch.author_id)

    if (authUser?.user?.email && story) {
      await sendNotification({
        type: 'deadline_reminder',
        to_email: authUser.user.email,
        to_name: (profile as any)?.display_name ?? 'Author',
        data: { story_title: story.title, chapter_num: String(ch.chapter_num) },
      })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
