// scripts/seed-demo-content.mjs
//
// Creates 8 fake authors + 5 fully-written collaborative stories, simulating
// the entire bidding -> writing -> publishing cycle for each one.
//
// All fake users have email addresses ending in @demo.penmosaic.internal
// and profiles are tagged is_demo = true, so the whole batch can be wiped
// with a single SQL command later (see scripts/delete-demo-content.sql).
//
// USAGE:
//   1. npm install @supabase/supabase-js dotenv --save-dev   (if not already installed)
//   2. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   3. node scripts/seed-demo-content.mjs
//
// Safe to re-run — it skips creating users that already exist by email.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─────────────────────────────────────────────────────────────
// 8 fake authors
// ─────────────────────────────────────────────────────────────
const AUTHORS = [
  { username: 'maren_voss',   display_name: 'Maren Voss',     bio: 'Writes slow-burn literary fiction. Coffee-powered.' },
  { username: 'desmond_ai',   display_name: 'Desmond Achebe', bio: 'Sci-fi and speculative fiction. Once wrote a novel in a month, regretted it.' },
  { username: 'priya_kale',   display_name: 'Priya Kale',     bio: 'Mystery and crime. Reads more true crime than is probably healthy.' },
  { username: 'tobias_lund',  display_name: 'Tobias Lund',    bio: 'Horror enthusiast. Sleeps with the lights on, writes like he doesn\'t.' },
  { username: 'el_marquez',   display_name: 'Elena Marquez',  bio: 'Historical fiction nerd. Will talk your ear off about the Renaissance.' },
  { username: 'sam_okafor',   display_name: 'Samuel Okafor',  bio: 'Fantasy worldbuilder. Has seventeen unfinished maps.' },
  { username: 'wren_callahan',display_name: 'Wren Callahan',  bio: 'Thriller writer. Plots everything, including grocery lists.' },
  { username: 'noor_haddad',  display_name: 'Noor Haddad',    bio: 'Romance and contemporary fiction. Believes in happy endings.' },
]

const DEMO_PASSWORD = 'DemoAuthor2026!'
const DOMAIN = 'demo.penmosaic.internal'

// ─────────────────────────────────────────────────────────────
// 5 stories, each with a guideline and chapters pre-written.
// Chapter authors are assigned by index into AUTHORS (rotated
// so no one writes consecutive chapters, and original author
// writes chapter 1 + final).
// ─────────────────────────────────────────────────────────────
const STORIES = [
  {
    title: 'The Weight of Water',
    genre: 'Literary Fiction', tier: 'Open', mature: false, totalChapters: 5,
    originalAuthorIdx: 0, // Maren
    guideline: 'A family spends one last summer at a lake house before it\'s sold. Each chapter shifts to a different family member\'s perspective on the same week.',
    chapterAuthors: [0, 2, 4, 6, 0], // Maren, Priya, Elena, Wren, Maren(final)
    chapters: [
      { title: 'The Last Key', content: 'The key still stuck the same way it always had, catching on the third turn before giving way. Marian stood on the porch for a long moment before going in, the way she always did now, as if the house needed a moment to recognize her too. Forty-one years of summers were going to end with a sold sign and a stranger\'s name on the deed, and she hadn\'t told the kids that part yet — that this wasn\'t just the last summer, it was the last visit, period.' },
      { title: 'What Dad Doesn\'t Say', content: 'Tom noticed his father counting the porch steps again, the way he\'d done every summer since the surgery, like the number might have changed since last year. Eleven steps. It was always eleven steps. His father had never once mentioned being scared of falling, not directly, but Tom had started walking just behind him anyway, close enough to catch him, far enough to pretend he wasn\'t trying to.' },
      { title: 'The Inventory', content: 'Grandma Ruth had started making lists — what stayed, what went, what the new owners could have, what needed burning before anyone saw it. Elena found her on the dock at six in the morning with a notebook and a thermos, already three pages in, and when she asked what was on page one, Ruth just said "things I am not ready to talk about yet" and kept writing.' },
      { title: 'The Last Swim', content: 'Jamie counted heads the way she\'d done every summer since the accident that almost wasn\'t — eleven-year-old her, the dock, a moment too long underwater. Now she was the one teaching her own daughter to swim in the same lake, and she found herself doing the same head-count, the same private arithmetic of who was safe, every few minutes, without meaning to.' },
      { title: 'What the Water Keeps', content: 'On the last morning, before the movers came, before the realtor\'s sign went up, all five of them swam out to the buoy together, the way they did exactly once a summer, every summer, for forty-one years. No one suggested it. They just found themselves in the water at the same time, swimming the same direction, and nobody mentioned that it might be the last time, because saying it out loud felt like it would make it true faster.' },
    ]
  },
  {
    title: 'Signal Decay',
    genre: 'Science Fiction', tier: 'Established', mature: false, totalChapters: 5,
    originalAuthorIdx: 1, // Desmond
    guideline: 'A deep-space relay station starts receiving a repeating signal from a probe that was declared lost eleven years ago. Something is different about it now.',
    chapterAuthors: [1, 3, 5, 7, 1],
    chapters: [
      { title: 'Echo Eleven', content: 'The signal shouldn\'t have existed. Probe designation Echo-11 had gone dark eleven years, four months, and six days ago, officially declared lost in a debris field near the outer relay. Officer Hana Voss had memorized that timestamp the way you memorize the date of a death, and now the console in front of her was lighting up with Echo-11\'s exact frequency signature, pulsing in a pattern that wasn\'t in any of the original mission parameters.' },
      { title: 'The Pattern Underneath', content: 'It took the analysis team three days to realize the signal wasn\'t corrupted — it was encoded. Priya Okonkwo-Reyes ran the decryption a fourth time, certain she\'d made an error, and got the same result: a voice. Human. Speaking in a cadence that matched no one on the original Echo-11 crew roster, in a language the ship\'s computer flagged as "not yet invented" at the time of the probe\'s launch.' },
      { title: 'Eleven Years Ago', content: 'Captain Osei pulled the original mission logs and found the gap immediately — six hours of telemetry missing from the day Echo-11 went dark, deleted not by malfunction but by deliberate command, issued from inside the probe itself. No one on the original crew had the clearance to issue that command. No one on the original crew, it turned out, had been the only one aboard.' },
      { title: 'What Came Back', content: 'When the relay station\'s long-range scanner finally located the source of the signal, it wasn\'t in the debris field at all — it was approaching, on a slow, deliberate trajectory toward the station itself, eleven years late and perfectly on course, as if it had simply taken the long way home and never stopped trying.' },
      { title: 'Recognition', content: 'The thing that docked at the station wasn\'t Echo-11, not anymore — the hull bore the probe\'s old serial number, but everything else about it had changed, grown, adapted across eleven years of silence and drift. Hana stood at the airlock as it opened, and the voice that came through the comm wasn\'t static or code anymore. It said her name. It had never met her. It said her name anyway, and it sounded relieved.' },
    ]
  },
  {
    title: 'The Fourth Witness',
    genre: 'Mystery', tier: 'Open', mature: false, totalChapters: 4,
    originalAuthorIdx: 2, // Priya
    guideline: 'Three witnesses gave statements about the same car accident. All three contradict each other — and a fourth witness no one knew about is about to change everything.',
    chapterAuthors: [2, 4, 6, 2],
    chapters: [
      { title: 'Three Stories', content: 'Detective Reyes had three witness statements about the same six seconds on Birchwood Avenue, and no two of them agreed on a single detail — not the color of the car, not which direction it came from, not even whether the light had been red or green. Three honest people, she was fairly sure, telling three completely different truths.' },
      { title: 'The Gas Station Camera', content: 'The footage from the gas station across the street was grainy, time-stamped, and utterly useless for identifying the car — but it captured something none of the three witnesses had mentioned: a fourth person, standing at the corner, who turned and walked away the instant the collision happened, unhurried, like they\'d been expecting it.' },
      { title: '找到她', content: 'It took two weeks to identify the woman from the footage, and when Reyes finally sat across from her, she said something that didn\'t match any of the existing statements at all: that the accident hadn\'t been an accident, and that she\'d been the one meant to be in that car.' },
      { title: 'The Real Six Seconds', content: 'Reyes laid all four statements side by side one final time, and for the first time, they didn\'t contradict each other — they completed each other, four fragments of the same six seconds, each witness having seen exactly the piece they were meant to see, and not one second more.' },
    ]
  },
  {
    title: 'The House on Mercer Street',
    genre: 'Horror', tier: 'Open', mature: true, totalChapters: 4,
    originalAuthorIdx: 3, // Tobias
    guideline: 'A family moves into a house where the previous owners vanished without a trace. The realtor insists nothing is wrong with it. The walls disagree.',
    chapterAuthors: [3, 5, 7, 3],
    chapters: [
      { title: 'A Very Reasonable Price', content: 'The realtor mentioned the previous owners only once, in passing, the way you mention something you\'d rather not be asked about twice: "relocated suddenly, very motivated sale." David didn\'t ask for details. The price was too good, and the house was too perfect, and some part of him that he\'d later wish he\'d listened to noted that those two facts were probably related.' },
      { title: 'The Room That Wasn\'t on the Blueprint', content: 'Mara found the door behind the water heater on their second week, a door that led to a room not listed anywhere on the house\'s original floor plan, a room with four walls covered floor to ceiling in the same word, written by hand, over and over, in at least three different sets of handwriting.' },
      { title: 'What the Neighbors Knew', content: 'The neighbor two houses down finally talked after David brought over a bottle of wine and asked the right question the right way: the family before them hadn\'t moved. They\'d left in the middle of the night with nothing, not even shoes, and no one had heard from them since, and the house had sat empty for fourteen months before the realtor listed it again.' },
      { title: 'The Word on the Wall', content: 'On their last night in the house — though they didn\'t yet know it would be their last — David finally read the word on the hidden room\'s walls closely enough to recognize it as his own name, written in his own handwriting, though he had never once been in that room before that night.' },
    ]
  },
  {
    title: 'Letters to a City That Burned',
    genre: 'Historical Fiction', tier: 'Established', mature: false, totalChapters: 5,
    originalAuthorIdx: 4, // Elena
    guideline: 'London, 1666. A young bookbinder writes letters to her brother at sea as the Great Fire approaches, documenting the city\'s last days before everything changes.',
    chapterAuthors: [4, 6, 0, 2, 4],
    chapters: [
      { title: 'The First Letter', content: 'Dearest Will, the baker on Pudding Lane has had no end of trouble with his ovens this week, and Mother says it is nothing, the same complaints as every dry September, but I confess the smoke from his chimney has had an unusual color to it these past two nights, and I do not like the way the wind has turned. I hope this finds you before the next post leaves for the Indies. Your sister, Cecily.' },
      { title: 'The Second Letter', content: 'Will, it has spread faster than anyone believed possible. The Lord Mayor said it could be stamped out by hand, and so no one pulled down the houses in its path when there was still time to stop it, and now half of Fish Street Hill is gone and the fire has reached the river warehouses, and I am told the flames can be seen from across the Thames as though it were daylight at midnight.' },
      { title: 'The Third Letter', content: 'I write this from my workbench, which is also, for now, my bed, having moved my few remaining books and tools to St. Paul\'s churchyard along with half of London, all of us believing the stone walls of the cathedral would hold against anything. I no longer believe this. The lead from the cathedral roof has begun to melt and run down Ludgate Hill like a river of its own, and I have never in my life seen a image I will be less able to forget.' },
      { title: 'The Fourth Letter', content: 'The fire has finally stopped, four days after it began, though I could not tell you what stopped it — the wind dying, or simply running out of city left to take. Our shop is ash. Mother\'s sewing room is ash. The bakery on Pudding Lane, where this is all said to have started, is ash indistinguishable from every other ash on every other street, and I have started to understand that grief, when it is large enough, stops being about any one thing.' },
      { title: 'The Last Letter', content: 'Will, they say the city will be rebuilt in brick and stone, wider streets, no more overhanging timber to catch a spark — a better city, they say, born from a worse one. I do not know yet if I believe that an ending can also be a beginning, but I am rebuilding my workbench regardless, one board at a time, because waiting to believe it first has never once gotten anything built. Come home and see it when you can. Your sister, always, Cecily.' },
    ]
  },
]

const STARTING_LIKES = [12, 31, 8, 45, 19, 27, 6, 38]

async function main() {
  console.log('🌱 Seeding demo content...\n')

  // ── 1. Create auth users + profiles ──────────────────────
  const authorIds = []
  for (let i = 0; i < AUTHORS.length; i++) {
    const a = AUTHORS[i]
    const email = `${a.username}@${DOMAIN}`

    // Check if user already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', a.username)
      .single()

    if (existing) {
      console.log(`  ✓ ${a.display_name} already exists, reusing`)
      authorIds.push(existing.id)
      continue
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: a.username, display_name: a.display_name },
    })

    if (createErr || !created.user) {
      console.error(`  ✗ Failed to create ${a.display_name}:`, createErr?.message)
      continue
    }

    // Profile is auto-created by the on_auth_user_created trigger — update it with demo flag + bio + likes
    await supabase.from('profiles').update({
      bio: a.bio,
      is_demo: true,
      sample_done: true,
      lifetime_likes: STARTING_LIKES[i],
      points: 80,
    }).eq('id', created.user.id)

    authorIds.push(created.user.id)
    console.log(`  ✓ Created ${a.display_name} (${email})`)
  }

  console.log(`\n📚 Creating ${STORIES.length} stories...\n`)

  // ── 2. Create stories with full chapter history ─────────
  for (const story of STORIES) {
    const originalAuthorId = authorIds[story.originalAuthorIdx]

    // Skip if story already exists (idempotent re-runs)
    const { data: existingStory } = await supabase
      .from('stories')
      .select('id')
      .eq('title', story.title)
      .single()

    if (existingStory) {
      console.log(`  ✓ "${story.title}" already exists, skipping`)
      continue
    }

    const { data: newStory, error: storyErr } = await supabase
      .from('stories')
      .insert({
        title: story.title,
        genre: story.genre,
        tier: story.tier,
        mature: story.mature,
        total_chapters: story.totalChapters,
        guideline: story.guideline,
        original_author: originalAuthorId,
        status: 'complete',
        is_demo: true,
      })
      .select()
      .single()

    if (storyErr || !newStory) {
      console.error(`  ✗ Failed to create "${story.title}":`, storyErr?.message)
      continue
    }

    // Insert every chapter as 'done', authored per the rotation,
    // simulating the full bid -> win -> write -> publish cycle already complete.
    const chapterRows = story.chapters.map((ch, i) => ({
      story_id: newStory.id,
      chapter_num: i + 1,
      title: ch.title,
      content: ch.content,
      author_id: authorIds[story.chapterAuthors[i]],
      status: 'done',
      likes_count: Math.floor(Math.random() * 35) + 8,
      avg_rating: +(Math.random() * 1.5 + 1.5).toFixed(1),
      rating_count: Math.floor(Math.random() * 15) + 4,
      is_demo: true,
    }))

    const { error: chErr } = await supabase.from('chapters').insert(chapterRows)
    if (chErr) {
      console.error(`  ✗ Failed to insert chapters for "${story.title}":`, chErr.message)
      continue
    }

    console.log(`  ✓ "${story.title}" — ${story.chapters.length} chapters by ${new Set(story.chapterAuthors).size} authors`)
  }

  console.log('\n✅ Demo seeding complete.')
  console.log('   To remove all demo content later, run scripts/delete-demo-content.sql in Supabase.\n')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
