'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// GAYA NEON GLOW UNTUK BADGE
const MOOD_STYLES = {
  'Happy': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
  'Sad': 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  'InLove': 'bg-pink-500/10 text-pink-500 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
  'Angry': 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  'Gloomy': 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-[0_0_15px_rgba(156,163,175,0.2)]',
  'Boring': 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
  'FlatFace': 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-[0_0_15px_rgba(100,116,139,0.2)]',
}

const DAILY_VIEW_LIMIT = 10

export default function Feed() {
  const [user, setUser] = useState(null)
  const [userAvatar, setUserAvatar] = useState(null) 
  
  const [posts, setPosts] = useState([]) 
  const [currentCardIndex, setCurrentCardIndex] = useState(0) 
  const [viewCount, setViewCount] = useState(0) 
  
  const [loading, setLoading] = useState(true)
  const [hasPostedToday, setHasPostedToday] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      if (profile) setUserAvatar(profile.avatar_url)

      await checkPostStatus(user.id)
      await loadFeedLogic(user.id)
    }
    init()
  }, [router])

  const checkPostStatus = async (userId) => {
    const { data } = await supabase
      .from('posts')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const postDate = new Date(data.created_at).toDateString()
      const today = new Date().toDateString()
      if (postDate === today) setHasPostedToday(true)
    }
  }

  const loadFeedLogic = async (userId) => {
    setLoading(true)
    
    const todayStart = new Date()
    todayStart.setHours(0,0,0,0)
    
    const { count: seenCount } = await supabase
      .from('seen_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', todayStart.toISOString())
      
    const currentViews = seenCount || 0
    setViewCount(currentViews)

    if (currentViews >= DAILY_VIEW_LIMIT) {
      setLoading(false)
      return
    }

    const { data: seenData } = await supabase
      .from('seen_posts')
      .select('post_id')
      .eq('user_id', userId)
    
    const seenPostIds = seenData?.map(s => s.post_id) || []

    const { data: rawPosts } = await supabase
      .from('posts')
      .select(`*, profiles ( username, avatar_url ), reactions ( user_id, reaction_value )`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (rawPosts) {
      // Filter: Buang post yang sudah dilihat DAN post milik user sendiri
      let filtered = rawPosts.filter(p => !seenPostIds.includes(p.id) && p.user_id !== userId)
      filtered = filtered.sort(() => Math.random() - 0.5)
      
      const remainingQuota = DAILY_VIEW_LIMIT - currentViews
      setPosts(filtered.slice(0, remainingQuota))
    }
    
    setLoading(false)
  }

  const handleReaction = async (postId, reactionValue) => {
    if (!user) return
    const post = posts[currentCardIndex]
    const existingReaction = post.reactions.find(r => r.user_id === user.id)
    const newPosts = [...posts]
    
    if (existingReaction && existingReaction.reaction_value === reactionValue) {
       newPosts[currentCardIndex].reactions = post.reactions.filter(r => r.user_id !== user.id)
       await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
       const otherReactions = post.reactions.filter(r => r.user_id !== user.id)
       newPosts[currentCardIndex].reactions = [...otherReactions, { user_id: user.id, reaction_value: reactionValue }]
       await supabase.from('reactions').upsert({ post_id: postId, user_id: user.id, reaction_value: reactionValue }, { onConflict: 'post_id, user_id' })
    }
    setPosts(newPosts)
  }

  const handleNextPost = async () => {
    if (currentCardIndex >= posts.length) return 

    const currentPost = posts[currentCardIndex]
    await supabase.from('seen_posts').insert([
        { user_id: user.id, post_id: currentPost.id }
    ])

    setCurrentCardIndex(prev => prev + 1)
    setViewCount(prev => prev + 1)
  }

  const handleConfirmReport = async () => {
    if (!user) return
    const currentPost = posts[currentCardIndex]

    const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        post_id: currentPost.id,
        reason: 'Inappropriate Content'
    })

    if (!error) {
        await supabase.from('seen_posts').insert([
            { user_id: user.id, post_id: currentPost.id }
        ])
        setShowReportModal(false)
        setCurrentCardIndex(prev => prev + 1)
        setViewCount(prev => prev + 1)
        alert("Thanks. We've removed this from your feed.")
    }
  }

  const getReactionCount = (postReactions, type) => {
    return postReactions.filter(r => r.reaction_value === type).length
  }

  // --- KOMPONEN TOMBOL UPLOAD ---
  const UploadSection = () => (
    <div className="mb-8 w-full max-w-xs flex justify-center">
      {!hasPostedToday ? (
        <button 
          onClick={() => router.push('/upload')} 
          className="group relative w-full overflow-hidden rounded-full bg-white py-4 text-black font-black tracking-widest text-sm transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span>+ SHARE YOUR TRUTH</span>
          </span>
        </button>
      ) : (
        // --- REVISI TEKS DI SINI ---
        <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm w-full">
            <span className="text-xl mb-1 block animate-pulse">✨</span>
            <p className="text-sm font-bold text-gray-200 tracking-wider uppercase">
              YOU HAVE SHARED YOUR TRUTH TODAY
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">
              See you tomorrow at 00:00
            </p>
        </div>
      )}
    </div>
  )


  // --- RENDER AREA ---

  if (!user || loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-500 tracking-widest text-xs uppercase animate-pulse">Checking Frequency...</div>

  // KONDISI 1: LIMIT HABIS (QUOTA REACHED)
  if (viewCount >= DAILY_VIEW_LIMIT) {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center space-y-6">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600">10/10</h1>
            <div className="space-y-2">
                <p className="text-xl font-bold">Cycle Complete.</p>
                <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">You have witnessed 10 truths today. <br/>Return to your reality.</p>
            </div>
            
            <UploadSection />

            <button onClick={() => router.push('/profile')} className="px-8 py-3 rounded-full bg-transparent border border-white/20 hover:bg-white hover:text-black transition-all font-bold text-sm tracking-widest">OPEN ARCHIVE</button>
        </div>
    )
  }

  // KONDISI 2: TIDAK ADA POSTINGAN LAGI (STOK HABIS / KOSONG)
  if (currentCardIndex >= posts.length) {
    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center">
            
            <UploadSection />

            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 animate-spin-slow mb-6"></div>
            <p className="text-gray-500 text-sm tracking-widest uppercase">No more posts nearby.</p>
            <p className="text-gray-600 text-xs mt-2 mb-8">Try again later.</p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button onClick={() => router.push('/profile')} className="w-full px-6 py-3 rounded-full bg-white/10 border border-white/10 text-white font-bold text-xs tracking-widest hover:bg-white hover:text-black transition-all">OPEN PROFILE</button>
                <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-white underline text-xs transition-colors">Refresh Posts</button>
            </div>
        </div>
    )
  }

  const post = posts[currentCardIndex]
  const userReaction = post.reactions?.find(r => r.user_id === user.id)?.reaction_value

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-white/20">
      
      {showReportModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(255,165,0,0.2)]">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto text-xl border border-orange-500/20">⚠️</div>
                  <div><h3 className="text-lg font-bold text-white">Report Content?</h3><p className="text-gray-400 text-sm mt-1">Is this inappropriate or toxic? <br/>We will remove it from your feed immediately.</p></div>
                  <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition font-medium">Cancel</button>
                      <button onClick={handleConfirmReport} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-900/20">Yes, Report</button>
                  </div>
              </div>
          </div>
      )}

      <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-50 mix-blend-difference">
        <h1 className="text-xl font-black tracking-tighter">ONCE.</h1>
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">{viewCount + 1} / {DAILY_VIEW_LIMIT}</span>
            <button onClick={() => router.push('/profile')} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold border border-white/20 overflow-hidden">
                {userAvatar ? (
                    <img src={userAvatar} className="w-full h-full object-cover" />
                ) : (
                    user.email[0].toUpperCase()
                )}
            </button>
        </div>
      </nav>

      <main className="h-screen w-full flex flex-col items-center justify-center px-4 pt-16 pb-24">
        
        {!hasPostedToday && (
            <div className="absolute top-20 z-40 animate-fade-in-down">
                 <button onClick={() => router.push('/upload')} className="bg-white text-black px-5 py-2 rounded-full text-xs font-black tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform">
                    + SHARE TRUTH
                 </button>
            </div>
        )}

        <div className="relative w-full max-w-sm aspect-[4/5] bg-[#111] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            <img src={post.image_url} className="w-full h-full object-cover" />
            <button onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }} className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-red-500 hover:bg-black/50 transition border border-white/10" title="Report">⚠️</button>

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                <div className="absolute top-4 left-0 right-4 flex justify-end items-start pointer-events-auto">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md ${MOOD_STYLES[post.mood]}`}>{post.mood}</div>
                </div>

                <div className="pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                         <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] border border-white/20 overflow-hidden">
                            {post.profiles?.avatar_url ? (
                                <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                post.profiles?.username?.[0].toUpperCase()
                            )}
                         </div>
                         <span className="text-xs font-bold tracking-wide text-gray-300">{post.profiles?.username}</span>
                    </div>

                    <p className="text-sm font-light text-gray-200 leading-relaxed mb-6 drop-shadow-md">{post.caption}</p>

                    <div className="flex gap-2 mb-4">
                         {[{ label: 'Love', emoji: '❤️' }, { label: 'Laugh', emoji: '😂' }, { label: 'Crying', emoji: '😭' }, { label: 'Hug', emoji: '🫂' }].map((reaction) => {
                            const count = getReactionCount(post.reactions || [], reaction.label)
                            const isActive = userReaction === reaction.label
                            return (
                              <button key={reaction.label} onClick={(e) => { e.stopPropagation(); handleReaction(post.id, reaction.label); }} className={`flex-1 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/5 transition-all active:scale-95 ${isActive ? 'bg-white text-black border-white' : 'hover:bg-white/20'}`}>
                                 <span className={isActive ? 'scale-125 inline-block' : 'grayscale'}>{reaction.emoji}</span>
                                 {count > 0 && <span className="ml-1 text-[10px] font-bold">{count}</span>}
                              </button>
                            )
                          })}
                    </div>
                </div>
            </div>
        </div>
      </main>

      <div className="fixed bottom-8 w-full flex justify-center z-50 px-4">
         <button onClick={handleNextPost} className="w-full max-w-sm bg-white text-black font-black py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all duration-300 tracking-widest">NEXT TRUTH →</button>
      </div>
    </div>
  )
}