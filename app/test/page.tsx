'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { getRank } from '@/types'
import { RANK_COLORS, formatPoints } from '@/lib/utils'
import Navbar from '@/components/Navbar'
import {
  Beaker, Zap, BookOpen, Gavel, CheckCircle, AlertTriangle,
  Coins, RefreshCw, ChevronDown, ChevronUp, Trash2
} from 'lucide-react'

type LogEntry = { msg: string; type: 'success' | 'error' | 'info' }

const SEED_STORIES = [
  {
    title: 'The Cartographer of Lost Places',
    genre: 'Fantasy',
    tier: 'Open',
    mature: false,
    guideline: 'A mapmaker discovers that her maps don\'t just record places — they create them. Each story explores what happens when a new map is drawn.',
    chapters: [
      { title: 'The First Map', content: 'Sera had been drawing maps since she could hold a pen. Her mother said it was a gift. Her father said it was a curse. Neither of them knew that the mountains she drew on her seventh birthday had appeared overnight in the valley behind their house, snow-capped and impossible and entirely real. She hadn\'t told anyone. She\'d simply begun drawing more carefully.' },
      { title: 'Uncharted Waters', content: 'The sea she drew was an accident. She\'d been working late, her hand slipping across the parchment in exhaustion, and by morning the town square had flooded with warm salt water and silver fish that no one had seen before. The mayor blamed the old pipes. Sera rolled up her maps and moved to a smaller room.' },
      { title: 'The City That Shouldn\'t Exist', content: 'Someone had found one of her early sketches — a rough thing, barely more than a joke, a city built entirely upside down with its towers plunging into the earth. She\'d heard about it on the radio. Seventeen people had disappeared into it before the army sealed it off. Sera packed a bag and went to find them.' },
    ]
  },
  {
    title: 'Forty-Eight Hours',
    genre: 'Thriller',
    tier: 'Established',
    mature: false,
    guideline: 'A detective has 48 hours to solve a case before the evidence disappears. Each chapter is set exactly eight hours apart.',
    chapters: [
      { title: 'Hour Zero', content: 'The call came at 3 a.m., which was when all the worst calls came. Detective Yusuf Adeyemi had been awake anyway, sitting at his kitchen table with cold coffee and a case file he couldn\'t close. He listened to the dispatcher\'s voice without moving. Then he put on his coat and drove into the rain.' },
      { title: 'Hour Eight', content: 'The scene was wrong in ways he couldn\'t name yet. Everything was too clean for what was supposed to have happened here. The forensics team moved around him like careful ghosts and Yusuf stood in the center of the room and turned very slowly, cataloguing absences.' },
      { title: 'Hour Sixteen', content: 'He\'d been lied to three times in the last hour. He knew this the way he always knew it — not from tells or inconsistencies, but from the quality of silence that followed certain questions. People who told the truth didn\'t pause before answering simple things.' },
    ]
  },
  {
    title: 'Signal and Noise',
    genre: 'Literary Fiction',
    tier: 'Open',
    mature: false,
    guideline: 'Three strangers connected by a single piece of music, each chapter told from a different perspective across different decades.',
    chapters: [
      { title: '1987 — The Composer', content: 'He wrote it in three hours on a borrowed piano in a practice room that smelled of rosin and old wood. It wasn\'t supposed to be anything. A sketch, maybe. Something to work from. But when he played it back the second time his hands were shaking and he sat there in the fluorescent light for a long time before he wrote down a single note.' },
      { title: '2003 — The Daughter', content: 'She found the recording in a shoebox under her mother\'s bed, on a cassette with no label. She didn\'t have a cassette player. She drove forty minutes to the nearest thrift store and paid three dollars for one and sat in the parking lot and listened to it twice before she could drive home.' },
    ]
  },
]

export default function TestPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [section, setSection] = useState<string | null>('account')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setLoading(false)
  }

  function addLog(msg: string, type: LogEntry['type'] = 'success') {
    setLog(prev => [{ msg, type }, ...prev].slice(0, 30))
  }

  async function run(fn: () => Promise<void>) {
    setWorking(true)
    try { await fn() } catch (e: any) { addLog(e.message, 'error') }
    await loadProfile()
    setWorking(false)
  }

  // ── Account controls ──────────────────────────────────────
  async function approveSample() {
    if (!profile) return
    await supabase.from('profiles').update({ sample_done: true }).eq('id', profile.id)
    addLog('Sample approved — you can now bid and create stories')
  }

  async function revokeSample() {
    if (!profile) return
    await supabase.from('profiles').update({ sample_done: false }).eq('id', profile.id)
    addLog('Sample revoked', 'info')
  }

  async function addPoints(n: number) {
    if (!profile) return
    await supabase.from('profiles').update({ points: profile.points + n }).eq('id', profile.id)
    addLog(`+${n} points added`)
  }

  async function addLikes(n: number) {
    if (!profile) return
    await supabase.from('profiles').update({ lifetime_likes: profile.lifetime_likes + n }).eq('id', profile.id)
    addLog(`+${n} lifetime likes — rank may have changed`)
  }

  async function addStrike() {
    if (!profile) return
    const strikes = Math.min(profile.strikes + 1, 3)
    const update: any = { strikes }
    if (strikes >= 3) update.suspended_until = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    await supabase.from('profiles').update(update).eq('id', profile.id)
    addLog(`Strike added (${strikes}/3)${strikes >= 3 ? ' — bidding suspended' : ''}`, 'info')
  }

  async function clearStrikes() {
    if (!profile) return
    await supabase.from('profiles').update({ strikes: 0, suspended_until: null }).eq('id', profile.id)
    addLog('Strikes cleared')
  }

  async function resetAccount() {
    if (!profile) return
    await supabase.from('profiles').update({
      points: 50, lifetime_likes: 0, strikes: 0,
      suspended_until: null, sample_done: false
    }).eq('id', profile.id)
    addLog('Account reset to new-user state', 'info')
  }

  // ── Seed stories ──────────────────────────────────────────
  async function seedStories() {
    if (!profile) return
    let created = 0

    for (const s of SEED_STORIES) {
      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          title: s.title, genre: s.genre, tier: s.tier,
          mature: s.mature, total_chapters: s.chapters.length + 2,
          guideline: s.guideline, original_author: profile.id, status: 'active'
        })
        .select().single()

      if (error || !story) { addLog(`Failed: ${s.title} — ${error?.message}`, 'error'); continue }

      const chapters: any[] = []
      // Done chapters
      s.chapters.forEach((ch, i) => {
        chapters.push({
          story_id: story.id, chapter_num: i + 1,
          title: ch.title, content: ch.content,
          author_id: profile.id, status: 'done',
          likes_count: Math.floor(Math.random() * 40) + 5,
          avg_rating: +(Math.random() * 2 + 1).toFixed(1),
          rating_count: Math.floor(Math.random() * 20) + 3,
        })
      })
      // Open bidding chapter
      chapters.push({
        story_id: story.id, chapter_num: s.chapters.length + 1,
        title: null, content: null, author_id: null, status: 'bidding',
        bid_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      })
      // Final chapter (locked, original author)
      chapters.push({
        story_id: story.id, chapter_num: s.chapters.length + 2,
        title: null, content: null, author_id: profile.id, status: 'locked',
      })

      await supabase.from('chapters').insert(chapters)
      created++
    }
    addLog(`${created} seed stories created with active bidding`)
  }

  async function seedCompletedStories() {
    if (!profile) return

    const completed = [
      {
        title: `Everything After the Rain`,
        genre: `Literary Fiction`, tier: `Open` as const, mature: false, total_chapters: 4,
        guideline: `Four strangers shelter in the same diner during a storm. By the time it ends, everything has changed.`,
        chapters: [
          { title: `Before the First Drop`, content: `The diner was called Pearl's, though no one named Pearl had owned it in thirty years. It sat at the junction of two state roads that most GPS systems didn't acknowledge, and on the afternoon of the storm it held four people who had each arrived by accident. The waitress — her name tag said Donna — was refilling the sugar dispensers when the first real crack of thunder came. She didn't flinch. She'd grown up in tornado country. Thunder was just weather being theatrical.` },
          { title: `The Order of Arrivals`, content: `The first was a woman in a gray suit who ordered black coffee and didn't touch it. She sat in the corner booth with her phone face-down, and every few minutes she would look at her watch with an expression that wasn't impatience so much as resignation. The second was a teenage boy with a backpack that clinked when he set it down. The third was an older man who knew Donna by name and sat at the counter without being asked. The fourth was still parking.` },
          { title: `What the Storm Said`, content: `The power went out at 4:47 p.m. In the candlelight that followed, the four of them became, briefly, something they hadn't been in years: visible. Not to each other, exactly. To themselves. The woman in the gray suit put her phone in her bag. The boy with the backpack stopped checking the door. The old man set down his coffee cup and folded his hands and looked at nothing in particular with the focused attention of someone finally listening to something he'd been avoiding for a long time.` },
          { title: `Everything After`, content: `By the time the storm passed, the woman had left her phone number on a napkin she'd never meant to leave. The boy's backpack was lighter — Donna hadn't asked, and he hadn't explained. The old man had said the thing he'd been not-saying for eleven years, quietly, to no one in particular. The fourth stranger — the one who'd been parking — had never come in at all. They didn't know this until later, when the lot was empty and the space where a car had been was just wet asphalt catching the last light.` },
        ]
      },
      {
        title: `The Cartographer of Lost Places`,
        genre: `Fantasy`, tier: `Open` as const, mature: false, total_chapters: 4,
        guideline: `A mapmaker discovers her maps don't just record places — they create them. Each chapter follows the consequences of a new map drawn.`,
        chapters: [
          { title: `The First Map`, content: `Sera had been drawing maps since she could hold a pen. Her mother said it was a gift. Her father said it was a curse. Neither of them knew that the mountains she drew on her seventh birthday had appeared overnight in the valley behind their house, snow-capped and impossible and entirely real. She hadn't told anyone. She'd simply begun drawing more carefully, which is not the same thing as drawing less. The mountains were still there. She checked every morning from her window, half-expecting them to be gone, half-afraid they would be.` },
          { title: `Uncharted Waters`, content: `The sea she drew was an accident. She'd been working late, her hand slipping across the parchment in exhaustion, and by morning the town square had flooded with warm salt water and silver fish that no one had seen before. The mayor blamed the old pipes. The geologist blamed a subterranean aquifer. Sera rolled up her maps and moved to a smaller room with a lock on the door and a window too narrow for regret.` },
          { title: `The City That Shouldn't Exist`, content: `Someone had found one of her early sketches — a rough thing from when she was twelve, a city built entirely upside down with its towers plunging into the earth. She'd heard about it on the radio. Seventeen people had disappeared into it before the army sealed the perimeter. The news called it a geological anomaly. Sera pulled over and sat with the engine running for a long time. Then she drove toward the coordinates they'd given on air.` },
          { title: `What She Drew Next`, content: `She sat at the edge of the sealed zone with a fresh sheet of parchment and drew a door. Not a building, not a landscape — just a door, freestanding, at the exact center of where the upside-down city's entrance should be. She drew it carefully: the grain of the wood, the weight of the handle, the particular gap at the bottom that let in light. In the morning the soldiers found the door standing in the field. On the other side, seventeen people were waiting to come home. Sera had already left.` },
        ]
      },
      {
        title: `Forty-Eight Hours`,
        genre: `Thriller`, tier: `Established` as const, mature: false, total_chapters: 4,
        guideline: `A detective has 48 hours to solve a case before key evidence disappears. Each chapter is set twelve hours apart.`,
        chapters: [
          { title: `Hour Zero`, content: `The call came at 3 a.m., which was when all the worst calls came. Detective Yusuf Adeyemi had been awake anyway, sitting at his kitchen table with cold coffee and a case file he couldn't close — a different case, an older one, the kind that didn't close so much as calcify. He listened to the dispatcher's voice without moving. A warehouse on the east side. No body. Just evidence of one. He put on his coat and drove into the rain without waking his wife, which was a habit she'd asked him to break three years ago and which he'd never managed.` },
          { title: `Hour Twelve`, content: `The scene was wrong in ways he couldn't name yet. Everything was too clean for what was supposed to have happened here. The forensics team moved around him like careful ghosts and Yusuf stood in the center of the room and turned very slowly, cataloguing absences. No defensive marks on the walls. No drag patterns in the dust. A single light left on, aimed at nothing. Someone had cleaned this place, but they'd cleaned it the way people clean when they want you to know they cleaned it.` },
          { title: `Hour Twenty-Four`, content: `He'd been lied to four times in the last hour. He knew this the way he always knew it — not from tells or inconsistencies but from the quality of silence that followed certain questions. People who told the truth didn't pause before answering simple things. The warehouse owner paused. The night security guard paused. The woman who'd called it in — supposedly a jogger, at 2 a.m., in the rain — paused longest of all. Yusuf wrote nothing in his notebook during these conversations. He wrote everything afterward, in the car, with the engine off.` },
          { title: `Hour Forty-Eight`, content: `The evidence would be moved at dawn. He had until first light. He sat in the warehouse alone with what remained and went through it one more time, and somewhere in the third hour of that final night he found the thing that had been there all along: not hidden, exactly, just placed where someone looking for something else would never look. He photographed it seventeen times from different angles. Then he called his wife and told her he was coming home, and for once he meant it in the uncomplicated way.` },
        ]
      },
    ]

    let created = 0
    for (const s of completed) {
      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          title: s.title, genre: s.genre, tier: s.tier,
          mature: s.mature, total_chapters: s.total_chapters,
          guideline: s.guideline, original_author: profile.id, status: 'complete'
        })
        .select().single()

      if (error || !story) { addLog(`Failed: ${s.title} — ${error?.message}`, 'error'); continue }

      await supabase.from('chapters').insert(s.chapters.map((ch, i) => ({
        story_id: story.id, chapter_num: i + 1,
        title: ch.title, content: ch.content,
        author_id: profile.id, status: 'done',
        likes_count: Math.floor(Math.random() * 60) + 10,
        avg_rating: +(Math.random() + 2).toFixed(1),
        rating_count: Math.floor(Math.random() * 30) + 5,
      })))
      created++
    }
    addLog(`${created} completed stories created`)
  }

  // ── Bidding controls ──────────────────────────────────────
  async function autoBidWin() {
    if (!profile) return
    // Find an open bidding chapter not authored by this user
    const { data: chapters } = await supabase
      .from('chapters')
      .select('*, story:stories(*)')
      .eq('status', 'bidding')
      .neq('author_id', profile.id)
      .limit(10)

    if (!chapters || chapters.length === 0) {
      addLog('No open bidding chapters found — seed some stories first', 'error'); return
    }

    // Find one we haven't bid on yet
    for (const ch of chapters) {
      const { data: existing } = await supabase
        .from('bids').select('id').eq('chapter_id', ch.id).eq('bidder_id', profile.id).single()
      if (existing) continue

      const story = ch.story as any
      if (!story) continue

      // Place a 5pt bid
      const bidAmount = 5
      if (profile.points < bidAmount) {
        addLog('Not enough points — add some first', 'error'); return
      }

      await supabase.from('profiles').update({ points: profile.points - bidAmount }).eq('id', profile.id)
      await supabase.from('bids').insert({
        chapter_id: ch.id, bidder_id: profile.id,
        amount: bidAmount, pitch: 'Auto-win test bid', status: 'active'
      })

      // Force close bidding immediately — mark as won
      await supabase.from('bids').update({ status: 'lost' })
        .eq('chapter_id', ch.id).neq('bidder_id', profile.id)

      await supabase.from('bids').update({ status: 'won' })
        .eq('chapter_id', ch.id).eq('bidder_id', profile.id)

      await supabase.from('chapters').update({
        status: 'writing',
        author_id: profile.id,
        write_deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      }).eq('id', ch.id)

      addLog(`Auto-won chapter ${ch.chapter_num} of "${story.title}" — go write it in My Stories`)
      return
    }
    addLog('You\'ve already bid on all open chapters', 'info')
  }

  async function expireBidding() {
    // Set all active bidding deadlines to the past so cron would close them
    const { data, error } = await supabase
      .from('chapters')
      .update({ bid_deadline: new Date(Date.now() - 1000).toISOString() })
      .eq('status', 'bidding')
      .select('id')
    if (error) { addLog(error.message, 'error'); return }
    addLog(`${data?.length || 0} bidding deadlines expired — hit "Close expired bids" to process`, 'info')
  }

  async function closeExpiredBids() {
    const { data: expired } = await supabase
      .from('chapters')
      .select('id')
      .eq('status', 'bidding')
      .lt('bid_deadline', new Date().toISOString())

    let closed = 0
    for (const ch of expired || []) {
      await supabase.rpc('close_bidding', { p_chapter_id: ch.id })
      closed++
    }
    addLog(`Closed bidding on ${closed} chapter${closed !== 1 ? 's' : ''}`)
  }

  async function expireWriteDeadline() {
    const { data, error } = await supabase
      .from('chapters')
      .update({ write_deadline: new Date(Date.now() - 1000).toISOString() })
      .eq('status', 'writing')
      .eq('author_id', profile?.id)
      .select('id')
    if (error) { addLog(error.message, 'error'); return }
    addLog(`${data?.length || 0} write deadline(s) expired — hit "Process missed deadlines" to apply strike`, 'info')
  }

  async function processMissedDeadlines() {
    const { data: overdue } = await supabase
      .from('chapters')
      .select('id')
      .eq('status', 'writing')
      .lt('write_deadline', new Date().toISOString())

    let processed = 0
    for (const ch of overdue || []) {
      await supabase.rpc('handle_missed_deadline', { p_chapter_id: ch.id })
      processed++
    }
    addLog(`Processed ${processed} missed deadline${processed !== 1 ? 's' : ''}`)
  }

  // ── Cleanup ───────────────────────────────────────────────
  async function deleteSeededStories() {
    if (!profile) return
    if (!confirm('Delete all stories you authored? This cannot be undone.')) return
    const { data, error } = await supabase
      .from('stories')
      .delete()
      .eq('original_author', profile.id)
      .select('id')
    if (error) { addLog(error.message, 'error'); return }
    addLog(`${data?.length || 0} stories deleted`, 'info')
  }

  if (loading) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Loading…</div></>
  if (!profile) return <><Navbar /><div className="text-center py-16 text-gray-400 text-sm">Sign in to use the test environment.</div></>

  const rank = getRank(profile.lifetime_likes)

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="card mb-4">
      <button
        onClick={() => setSection(section === id ? null : id)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium text-sm">{title}</span>
        {section === id ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {section === id && <div className="mt-4 space-y-2 border-t border-gray-50 pt-4">{children}</div>}
    </div>
  )

  const Btn = ({ onClick, children, danger = false }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
    <button
      onClick={() => run(onClick)}
      disabled={working}
      className={`btn btn-sm w-full justify-start ${danger ? 'btn-danger' : ''}`}
    >
      {children}
    </button>
  )

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Beaker size={18} className="text-brand-400" />
          <h1 className="text-xl font-medium">Test environment</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">Simulate user flows without waiting for real timers or other users.</p>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-3 lg:gap-5">
          {/* Controls */}
          <div className="lg:col-span-2 space-y-0">

            {/* Current state */}
            <div className="card mb-4 bg-gray-50 border-gray-100">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Your current state</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="stat-card">
                  <div className="text-xs text-gray-400 mb-1">Points</div>
                  <div className="text-lg font-medium">{formatPoints(profile.points)}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-gray-400 mb-1">Lifetime likes</div>
                  <div className="text-lg font-medium">{profile.lifetime_likes}</div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-gray-400 mb-1">Rank</div>
                  <div className="mt-0.5"><span className={`badge ${RANK_COLORS[rank]}`}>{rank}</span></div>
                </div>
                <div className="stat-card">
                  <div className="text-xs text-gray-400 mb-1">Status</div>
                  <div className="text-sm mt-0.5 space-y-0.5">
                    <div className={profile.sample_done ? 'text-green-600' : 'text-amber-600'}>
                      {profile.sample_done ? '✓ Sample done' : '✗ No sample'}
                    </div>
                    <div className={profile.strikes > 0 ? 'text-red-500' : 'text-gray-400'}>
                      {profile.strikes}/3 strikes
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Section id="account" title="Account & rank">
              <Btn onClick={approveSample}><CheckCircle size={13} /> Approve my sample</Btn>
              <Btn onClick={revokeSample}><AlertTriangle size={13} /> Revoke sample approval</Btn>
              <Btn onClick={() => addPoints(50)}><Coins size={13} /> Add 50 points</Btn>
              <Btn onClick={() => addPoints(200)}><Coins size={13} /> Add 200 points</Btn>
              <Btn onClick={() => addLikes(50)}><Zap size={13} /> Add 50 likes (→ Journeyman)</Btn>
              <Btn onClick={() => addLikes(150)}><Zap size={13} /> Add 150 more likes (→ Novelist)</Btn>
              <Btn onClick={() => addLikes(300)}><Zap size={13} /> Add 300 more likes (→ Wordsmith)</Btn>
              <Btn onClick={() => addLikes(500)}><Zap size={13} /> Add 500 more likes (→ Luminary)</Btn>
              <Btn onClick={addStrike}><AlertTriangle size={13} /> Add a strike</Btn>
              <Btn onClick={clearStrikes}><RefreshCw size={13} /> Clear all strikes</Btn>
              <Btn onClick={resetAccount} danger><RefreshCw size={13} /> Reset to new user state</Btn>
            </Section>

            <Section id="stories" title="Seed stories">
              <p className="text-xs text-gray-400 mb-2">Creates realistic stories with completed chapters and open bidding. You need to be approved first.</p>
              <Btn onClick={seedStories}><BookOpen size={13} /> Seed 3 stories with active bidding</Btn>
              <Btn onClick={seedCompletedStories}><CheckCircle size={13} /> Seed 3 completed stories</Btn>
              <Btn onClick={deleteSeededStories} danger><Trash2 size={13} /> Delete all my stories</Btn>
            </Section>

            <Section id="bidding" title="Bidding controls">
              <p className="text-xs text-gray-400 mb-2">You need active bidding chapters first — seed stories above if none exist.</p>
              <Btn onClick={autoBidWin}><Gavel size={13} /> Auto-bid 5 pts & win next open chapter</Btn>
              <Btn onClick={expireBidding}><AlertTriangle size={13} /> Expire all active bid deadlines</Btn>
              <Btn onClick={closeExpiredBids}><RefreshCw size={13} /> Close expired bids (run cron now)</Btn>
            </Section>

            <Section id="deadlines" title="Deadline & strike simulation">
              <p className="text-xs text-gray-400 mb-2">Simulate what happens when an author misses their writing deadline.</p>
              <Btn onClick={expireWriteDeadline}><AlertTriangle size={13} /> Expire my write deadline(s)</Btn>
              <Btn onClick={processMissedDeadlines}><RefreshCw size={13} /> Process missed deadlines (adds strike)</Btn>
            </Section>

          </div>

          {/* Log */}
          <div className="lg:col-span-1 mt-4 lg:mt-0">
            <div className="card sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Activity log</span>
                <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-gray-700">Clear</button>
              </div>
              {log.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Actions will appear here.</p>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {log.map((entry, i) => (
                  <div key={i} className={`text-xs px-2.5 py-2 rounded-lg ${
                    entry.type === 'success' ? 'bg-green-50 text-green-800' :
                    entry.type === 'error'   ? 'bg-red-50 text-red-800' :
                                               'bg-blue-50 text-blue-800'
                  }`}>
                    {entry.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
