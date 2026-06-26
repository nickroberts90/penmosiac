// Call this from API routes or server actions to send email notifications.
// It hits the Supabase Edge Function which uses Resend to deliver emails.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type NotificationType =
  | 'sample_approved'
  | 'sample_rejected'
  | 'bid_won'
  | 'deadline_reminder'
  | 'chapter_liked'
  | 'message_received'
  | 'story_chapter_published'

interface SendOptions {
  type: NotificationType
  to_email: string
  to_name: string
  data: Record<string, string>
}

export async function sendNotification(opts: SendOptions): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(opts),
    })
  } catch (e) {
    // Never block the main flow if email fails
    console.error('Notification failed:', e)
  }
}
