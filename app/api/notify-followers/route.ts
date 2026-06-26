import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { story_id, story_title, chapter_num, chapter_title } = await req.json()

  // Get all followers of this story
  const { data: follows } = await supabase
    .from('story_follows')
    .select('user_id')
    .eq('story_id', story_id)

  if (!follows?.length) return NextResponse.json({ ok: true, notified: 0 })

  // Get author who just submitted (to exclude them from notification)
  const { data: chapter } = await supabase
    .from('chapters')
    .select('author_id')
    .eq('story_id', story_id)
    .eq('chapter_num', chapter_num)
    .single()

  let notified = 0
  for (const follow of follows) {
    if (follow.user_id === chapter?.author_id) continue

    const { data: profile } = await supabase
      .from('profiles').select('display_name').eq('id', follow.user_id).single()
    const { data: authUser } = await supabase.auth.admin.getUserById(follow.user_id)

    if (authUser?.user?.email) {
      await sendNotification({
        type: 'story_chapter_published',
        to_email: authUser.user.email,
        to_name: (profile as any)?.display_name ?? 'Reader',
        data: {
          story_title,
          story_id,
          chapter_num: String(chapter_num),
          chapter_title,
          author_name: (profile as any)?.display_name ?? 'An author',
        },
      })
      notified++
    }
  }

  return NextResponse.json({ ok: true, notified })
}
