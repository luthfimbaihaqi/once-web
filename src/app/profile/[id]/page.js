'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'

// --- CONSTANTS (Sama dengan Profile Utama) ---
const VIBE_CARD_STYLES = {
  'Happy': 'from-yellow-900/40 to-black border-yellow-500/30',
  'Sad': 'from-blue-900/40 to-black border-blue-500/30',
  'InLove': 'from-pink-900/40 to-black border-pink-500/30',
  'Angry': 'from-red-900/40 to-black border-red-500/30',
  'Gloomy': 'from-gray-800/40 to-black border-gray-500/30',
  'Boring': 'from-orange-900/40 to-black border-orange-500/30',
  'FlatFace': 'from-slate-800/40 to-black border-slate-500/30',
}

const MOOD_COLORS = {
  'Happy': 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]',
  'Sad': 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  'InLove': 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]',
  'Angry': 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  'Gloomy': 'bg-gray-400 shadow-[0_0_10px_rgba(156,163,175,0.5)]',
  'Boring': 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]',
  'FlatFace': 'bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.5)]',
}

const MOOD_LINE_COLORS = {
  'Happy': 'bg-yellow-400/50',
  'Sad': 'bg-blue-500/50',
  'InLove': 'bg-pink-500/50',
  'Angry': 'bg-red-500/50',
  'Gloomy': 'bg-gray-400/50',
  'Boring': 'bg-orange-400/50',
  'FlatFace': 'bg-slate-500/50',
}

const MOOD_RING_COLORS = {
  'Happy': 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]',
  'Sad': 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  'InLove': 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
  'Angry': 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  'Gloomy': 'border-gray-400 shadow-[0_0_20px_rgba(156,163,175,0.3)]',
  'Boring': 'border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.3)]',
  'FlatFace': 'border-slate-500 shadow-[0_0_20px_rgba(100,116,139,0.3)]',
}

const MOOD_STYLES_BADGE = {
  'Happy': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'Sad': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'InLove': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  'Angry': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Gloomy': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  'Boring': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'FlatFace': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

// --- COMPONENT: Ambient Background ---
const AmbientBackground = () => (
    <>
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-teal-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
)

// --- COMPONENT: SKELETON LOADER ---
const ProfileSkeleton = () => {
    return (
        <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans relative">
            <AmbientBackground />
            <div className="max-w-md mx-auto min-h-screen bg-[#050505] border-x border-white/5 relative">
                <header className="p-6 flex items-center gap-4 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-40">
                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse"></div>
                </header>
                <section className="flex flex-col items-center pt-6 pb-8">
                     <div className="w-28 h-28 rounded-full bg-white/5 animate-pulse mb-4"></div>
                     <div className="w-32 h-6 bg-white/5 rounded animate-pulse mb-2"></div>
                     <div className="w-48 h-4 bg-white/5 rounded animate-pulse mb-8"></div>
                     <div className="flex gap-8">
                         <div className="w-16 h-8 bg-white/5 rounded animate-pulse"></div>
                         <div className="w-16 h-8 bg-white/5 rounded animate-pulse"></div>
                     </div>
                </section>
                <section className="px-6 mb-8">
                    <div className="bg-white/5 p-5 rounded-3xl h-24 animate-pulse"></div>
                </section>
                <section className="px-0.5">
                    <div className="grid grid-cols-3 gap-0.5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-square bg-white/5 animate-pulse"></div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const targetUserId = params.id

  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null) 
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ dominant: null, total: 0, streak: 0, calendar: [] })
  
  // State baru untuk fitur Vibe Check
  const [vibeMatch, setVibeMatch] = useState(false)
  
  const [selectedPost, setSelectedPost] = useState(null)

  useEffect(() => {
    const init = async () => {
      // 1. Cek User yang sedang login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setCurrentUser(user)

      // 2. Redirect jika mengunjungi profil sendiri
      if (user.id === targetUserId) {
        router.replace('/profile')
        return
      }

      // 3. Fetch data target user & compare vibe
      await Promise.all([
          fetchTargetProfile(targetUserId),
          fetchTargetPosts(targetUserId),
          checkVibeMatch(user.id, targetUserId) // New Logic
      ])
      setLoading(false)
    }

    if (targetUserId) init()
  }, [targetUserId, router])

  const checkVibeMatch = async (myId, targetId) => {
    // Ambil post terakhir saya
    const { data: myPosts } = await supabase.from('posts').select('mood').eq('user_id', myId).order('created_at', { ascending: false }).limit(1)
    // Ambil post terakhir dia
    const { data: theirPosts } = await supabase.from('posts').select('mood').eq('user_id', targetId).order('created_at', { ascending: false }).limit(1)

    if (myPosts?.length && theirPosts?.length) {
        if (myPosts[0].mood === theirPosts[0].mood) {
            setVibeMatch(true) // ITS A MATCH!
        }
    }
  }

  const fetchTargetProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  const fetchTargetPosts = async (userId) => {
    const { data } = await supabase.from('posts').select('*, reactions(reaction_value)').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) {
      setPosts(data)
      generateStats(data)
    }
  }

  const generateStats = (posts) => {
    const counts = {}
    posts.forEach(p => counts[p.mood] = (counts[p.mood] || 0) + 1)
    let dominant = null
    let max = 0
    Object.entries(counts).forEach(([mood, count]) => {
      if (count > max) { max = count; dominant = mood }
    })

    let currentStreak = 0
    const today = new Date().setHours(0,0,0,0)
    const postDates = new Set(posts.map(p => new Date(p.created_at).setHours(0,0,0,0)))
    for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        if (postDates.has(d.getTime())) currentStreak++
        else { if (i === 0) continue; break }
    }

    const curr = new Date()
    const dayOfWeek = curr.getDay() 
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const mondayDate = new Date(curr.setDate(curr.getDate() + distToMon))

    const calendar = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate)
      d.setDate(mondayDate.getDate() + i) 
      const dateStr = d.toDateString()
      const foundPost = posts.find(p => new Date(p.created_at).toDateString() === dateStr)
      calendar.push({
        date: d.getDate(),
        dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
        mood: foundPost ? foundPost.mood : null,
        isFuture: d > new Date()
      })
    }
    setStats({ dominant, total: posts.length, streak: currentStreak, calendar })
  }

  const getReactionCount = (reactions, type) => {
    return reactions?.filter(r => r.reaction_value === type).length || 0
  }

  if (loading) return <ProfileSkeleton />

  const latestMood = posts.length > 0 ? posts[0].mood : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans relative selection:bg-white/20">
      <AmbientBackground />

      {/* DETAIL MODAL (READ ONLY - NO DELETE) */}
      {selectedPost && (
         <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition">&times;</button>
                <div className="relative aspect-[4/5]">
                    <img src={selectedPost.image_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md ${MOOD_STYLES_BADGE[selectedPost.mood]}`}>{selectedPost.mood}</div>
                </div>
                <div className="p-6 -mt-12 relative z-10">
                    <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
                        <span className="font-bold text-white mr-2 block text-xs uppercase tracking-widest text-gray-500 mb-1">{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                        "{selectedPost.caption}"
                    </p>
                    <div className="flex gap-2 mb-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                        {[{ label: 'Love', emoji: '❤️' }, { label: 'Laugh', emoji: '😂' }, { label: 'Crying', emoji: '😭' }, { label: 'Hug', emoji: '🫂' }].map(reaction => {
                           const count = getReactionCount(selectedPost.reactions, reaction.label)
                           return (
                               <div key={reaction.label} className={`flex-1 flex flex-col items-center p-2 rounded-xl ${count > 0 ? 'bg-white/10 text-white' : 'text-gray-600 grayscale'}`}>
                                   <span className="text-lg">{reaction.emoji}</span>
                                   <span className="text-[10px] font-bold mt-1">{count}</span>
                               </div>
                           )
                        })}
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="max-w-md mx-auto min-h-screen bg-[#050505] border-x border-white/5 shadow-2xl relative">
        <header className="p-6 flex items-center gap-4 sticky top-0 bg-[#050505]/80 backdrop-blur-md z-40">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">&larr;</button>
          <span className="font-bold tracking-widest text-sm uppercase">Visitor View</span>
        </header>

        {/* PROFILE INFO & AVATAR */}
        <section className="flex flex-col items-center pt-6 pb-8 relative group">
          <div className="relative">
              {/* Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-tr rounded-full blur-xl opacity-30 transition duration-700 ${vibeMatch ? 'from-pink-500 to-yellow-500 opacity-60 animate-pulse' : 'from-purple-500 to-blue-500'}`}></div>
              
              {/* AVATAR DENGAN RING */}
              <div className={`relative w-28 h-28 rounded-full border-[3px] transition-all duration-500 overflow-hidden ${latestMood ? MOOD_RING_COLORS[latestMood] : 'border-white/10'}`}>
                <div className="w-full h-full bg-black rounded-full overflow-hidden flex items-center justify-center">
                    {(profile?.avatar_url) ? (
                        <img src={profile?.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-gray-700">?</span>
                    )}
                </div>
              </div>

              {/* VIBE MATCH INDICATOR */}
              {vibeMatch && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce">
                      ⚡ Vibe Match
                  </div>
              )}
          </div>
          
          <h2 className="text-2xl font-bold mt-6 tracking-tight">{profile?.username || 'Unknown'}</h2>
          
          {profile?.bio && (
              <p className="text-sm text-gray-400 mt-2 max-w-[200px] text-center italic leading-relaxed">"{profile.bio}"</p>
          )}

          <div className="flex gap-8 mt-8 text-center">
            <div><span className="block font-black text-xl">{stats.total}</span><span className="text-[10px] text-gray-500 uppercase tracking-widest">Momories</span></div>
            <div className="w-[1px] bg-white/10"></div>
            <div><span className="block font-black text-xl">{stats.streak}</span><span className="text-[10px] text-gray-500 uppercase tracking-widest">Day Streak</span></div>
          </div>
        </section>

        {/* MOOD CALENDAR */}
        <section className="px-6 mb-8">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            <div className="grid grid-cols-7 gap-0 relative z-10">
              {stats.calendar.map((day, idx) => (
                <div key={idx} className={`relative flex flex-col items-center gap-3 ${day.isFuture ? 'opacity-20' : 'opacity-100'}`}>
                  {idx < 6 && day.mood && stats.calendar[idx + 1].mood && (
                      <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 ${MOOD_LINE_COLORS[day.mood]}`}></div>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${day.mood ? `${MOOD_COLORS[day.mood]} scale-110` : 'bg-white/5 border border-white/10'}`}></div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{day.dayShort}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WEEKLY VIBE */}
        {stats.dominant && (
          <section className="px-6 mb-8">
            <div className={`border p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br ${VIBE_CARD_STYLES[stats.dominant]}`}>
              <h3 className="text-white/60 text-[10px] font-bold uppercase mb-2 tracking-[0.2em]">Weekly Vibe</h3>
              <p className="text-3xl font-black text-white mb-3 tracking-tighter">{stats.dominant}</p>
            </div>
          </section>
        )}

        {/* MOMENTS GRID */}
        <section className="px-0.5 pb-24">
          <div className="flex items-center justify-center py-6">
             <span className="w-1 h-1 rounded-full bg-white/20 mr-4"></span>
             <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{profile?.username}'s Moments</h3>
             <span className="w-1 h-1 rounded-full bg-white/20 ml-4"></span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {posts.length === 0 ? (
               <div className="col-span-3 py-20 text-center text-gray-600 text-xs tracking-widest uppercase border border-dashed border-white/10 rounded-2xl mx-4 mt-2">No moments yet</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} onClick={() => setSelectedPost(post)} className="relative aspect-square group cursor-pointer overflow-hidden bg-white/5 active:scale-95 transition-transform duration-200">
                  <img src={post.image_url} className="w-full h-full object-cover transition duration-500 group-hover:scale-110 group-hover:opacity-80" />
                  <div className={`absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ${MOOD_COLORS[post.mood]}`}></div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}