// Supabase Edge Function — send-notification
// Deploy with: supabase functions deploy send-notification
// Set secrets: supabase secrets set RESEND_API_KEY=your_key SITE_URL=https://yoursite.com

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'
const FROM = 'Penmosaic <onboarding@resend.dev>'

type NotificationType =
  | 'sample_approved'
  | 'sample_rejected'
  | 'bid_won'
  | 'deadline_reminder'
  | 'chapter_liked'
  | 'message_received'
  | 'story_chapter_published'

interface NotificationPayload {
  type: NotificationType
  to_email: string
  to_name: string
  data: Record<string, string>
}

const TEMPLATES: Record<NotificationType, (d: Record<string, string>, name: string) => { subject: string; html: string }> = {

  sample_approved: (d, name) => ({
    subject: `You're approved — start bidding on Penmosaic`,
    html: email(name, `
      <p>Good news — your sample story has been reviewed and approved.</p>
      <p>You can now bid on open chapter slots and start your own collaborative stories.</p>
      <p>You have <strong>${d.points ?? '50'} points</strong> ready to bid with.</p>
      <a href="${SITE_URL}/bids" class="btn">Browse open bids</a>
    `)
  }),

  sample_rejected: (d, name) => ({
    subject: `Feedback on your Penmosaic sample`,
    html: email(name, `
      <p>Thanks for submitting your sample story. After review, we'd like to see a revision before approving your account.</p>
      ${d.admin_note ? `<div class="note"><strong>Feedback:</strong> ${d.admin_note}</div>` : ''}
      <p>You're welcome to try a different prompt or revise your approach.</p>
      <a href="${SITE_URL}/sample" class="btn">Try again</a>
    `)
  }),

  bid_won: (d, name) => ({
    subject: `You won the bid for "${d.story_title}" — Chapter ${d.chapter_num}`,
    html: email(name, `
      <p>Your bid of <strong>${d.bid_amount} points</strong> won the slot for Chapter ${d.chapter_num} of <em>${d.story_title}</em>.</p>
      <p>You have <strong>7 days</strong> to write and submit your chapter. Missing the deadline will cost you your staked points and add a strike to your account.</p>
      <div class="note">
        <strong>Story guideline:</strong><br>${d.guideline}
      </div>
      <a href="${SITE_URL}/mystories" class="btn">Write your chapter</a>
    `)
  }),

  deadline_reminder: (d, name) => ({
    subject: `Reminder: Chapter ${d.chapter_num} of "${d.story_title}" is due in 48 hours`,
    html: email(name, `
      <p>Just a heads up — your chapter for <em>${d.story_title}</em> is due in <strong>48 hours</strong>.</p>
      <p>If you miss the deadline, your staked points will be forfeited and you'll receive a strike.</p>
      <a href="${SITE_URL}/mystories" class="btn">Write now</a>
    `)
  }),

  chapter_liked: (d, name) => ({
    subject: `Someone liked your chapter in "${d.story_title}"`,
    html: email(name, `
      <p>Your chapter <em>${d.chapter_title}</em> in <strong>${d.story_title}</strong> received a like.</p>
      <p>You earned <strong>${d.points_earned} point${d.points_earned !== '1' ? 's' : ''}</strong>. Your total balance is now <strong>${d.new_balance} points</strong>.</p>
      <a href="${SITE_URL}" class="btn">View your stories</a>
    `)
  }),

  message_received: (d, name) => ({
    subject: `New message from ${d.sender_name} on Penmosaic`,
    html: email(name, `
      <p><strong>${d.sender_name}</strong> sent you a message:</p>
      <div class="note">${d.message_preview}</div>
      <a href="${SITE_URL}/messages" class="btn">Reply</a>
    `)
  }),

  story_chapter_published: (d, name) => ({
    subject: `New chapter published in "${d.story_title}"`,
    html: email(name, `
      <p>A new chapter has been published in <em>${d.story_title}</em> that you've contributed to.</p>
      <p><strong>Chapter ${d.chapter_num}: ${d.chapter_title}</strong> by ${d.author_name}.</p>
      <a href="${SITE_URL}/stories/${d.story_id}" class="btn">Read it</a>
    `)
  }),
}

function email(name: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
  .wrap { max-width: 520px; margin: 40px auto; background: white; border-radius: 12px; border: 1px solid #eee; overflow: hidden; }
  .header { background: #7F77DD; padding: 24px 32px; }
  .header h1 { color: white; margin: 0; font-size: 18px; font-weight: 500; letter-spacing: -0.3px; }
  .body { padding: 28px 32px; color: #333; line-height: 1.7; font-size: 15px; }
  .body p { margin: 0 0 16px; }
  .note { background: #f5f5f5; border-left: 3px solid #7F77DD; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #555; margin: 16px 0; }
  .btn { display: inline-block; margin-top: 8px; padding: 10px 20px; background: #7F77DD; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; }
  .footer { padding: 16px 32px; border-top: 1px solid #f0f0f0; font-size: 12px; color: #aaa; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>Penmosaic</h1></div>
  <div class="body">
    <p>Hi ${name},</p>
    ${body}
  </div>
  <div class="footer">You're receiving this because you have an account on Penmosaic. <a href="${SITE_URL}" style="color:#aaa">Visit site</a></div>
</div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const payload: NotificationPayload = await req.json()
    const template = TEMPLATES[payload.type]
    if (!template) return new Response(JSON.stringify({ error: 'Unknown notification type' }), { status: 400 })

    const { subject, html } = template(payload.data, payload.to_name)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [payload.to_email], subject, html }),
    })

    const result = await res.json()
    if (!res.ok) return new Response(JSON.stringify({ error: result }), { status: 500 })
    return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 200 })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
