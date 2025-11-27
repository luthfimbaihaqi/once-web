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
  const [myDailyPost, setMyDailyPost] = useState(null)
  
  const [showReportModal, setShowReportModal] = useState(false)
  const [showMyDetail, setShowMyDetail] = useState(false)

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

      await checkMyDailyPost(user.id) 
      await loadFeedLogic(user.id) 
    }
    init()
  }, [router])

  const checkMyDailyPost = async (userId) => {
    const { data } = await supabase
      .from('posts')
      .select('*, reactions(reaction_value)') 
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const postDate = new Date(data.created_at).toDateString()
      const today = new Date().toDateString()
      if (postDate === today) {
        setHasPostedToday(true)
        setMyDailyPost(data) 
      }
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

    const { data: seenData } = await supabase.from('seen_posts').select('post_id').eq('user_id', userId)
    const seenPostIds = seenData?.map(s => s.post_id) || []

    const { data: rawPosts } = await supabase
      .from('posts')
      .select(`*, profiles ( username, avatar_url ), reactions ( user_id, reaction_value )`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (rawPosts) {
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
    await supabase.from('seen_posts').insert([{ user_id: user.id, post_id: currentPost.id }])
    setCurrentCardIndex(prev => prev + 1)
    setViewCount(prev => prev + 1)
  }

  const handleConfirmReport = async () => {
    if (!user) return
    const currentPost = posts[currentCardIndex]
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, post_id: currentPost.id, reason: 'Inappropriate Content' })
    if (!error) {
        await supabase.from('seen_posts').insert([{ user_id: user.id, post_id: currentPost.id }])
        setShowReportModal(false)
        setCurrentCardIndex(prev => prev + 1)
        setViewCount(prev => prev + 1)
        alert("Thanks. We've removed this from your feed.")
    }
  }

  const getReactionCount = (postReactions, type) => {
    return postReactions?.filter(r => r.reaction_value === type).length || 0
  }

  const UploadSection = () => (
    <div className="mb-8 w-full max-w-xs flex justify-center z-50">
      {!myDailyPost ? (
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
        <div 
            onClick={() => setShowMyDetail(true)}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md w-full cursor-pointer hover:bg-white/5 transition-colors group"
        >
            <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 relative">
                <img src={myDailyPost.image_url} className="w-full h-full object-cover" />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${MOOD_STYLES[myDailyPost.mood]?.split(' ')[0] || 'bg-gray-500'}`}></div>
            </div>
            <div className="flex-1 text-left">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Your Truth Today</p>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${MOOD_STYLES[myDailyPost.mood]}`}>
                        {myDailyPost.mood}
                    </span>
                    <span className="text-xs text-gray-300 font-medium">
                        {myDailyPost.reactions?.length || 0} Reacts
                    </span>
                </div>
            </div>
            <div className="text-gray-500 group-hover:text-white transition">→</div>
        </div>
      )}
    </div>
  )

  const AmbientBackground = () => (
    <>
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
  )

  // --- KOMPONEN EMPTY STATE (Update Teks) ---
  const EmptyState = ({ message, subMessage }) => (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <AmbientBackground />
        
        <div className="absolute top-24 z-50 w-full max-w-xs">
            <UploadSection />
        </div>

        <div className="relative mb-8 mt-10">
            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-20"></div>
                <div className="absolute inset-2 rounded-full border border-white/5 animate-ping delay-75 opacity-10"></div>
                <span className="text-2xl opacity-50">📡</span>
            </div>
        </div>

        <p className="text-sm font-bold tracking-widest uppercase text-gray-400">{message}</p>
        <p className="text-xs text-gray-600 mt-2 mb-10 max-w-xs leading-relaxed">{subMessage}</p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs z-10">
            <button 
                onClick={() => router.push('/profile')} 
                className="w-full px-6 py-4 rounded-full bg-white text-black font-bold text-xs tracking-[0.2em] hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
                OPEN ARCHIVE
            </button>
            <button onClick={() => window.location.reload()} className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-white transition-colors py-2">
                Refresh Feed
            </button>
        </div>
    </div>
  )


  if (!user || loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-500 tracking-widest text-xs uppercase animate-pulse">Checking Frequency...</div>

  // RENDER MODAL DETAIL
  const renderMyDetailModal = () => {
    if (!showMyDetail || !myDailyPost) return null
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowMyDetail(false)}>
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowMyDetail(false)} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition">&times;</button>
                <div className="relative aspect-[4/5]">
                    <img src={myDailyPost.image_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md ${MOOD_STYLES[myDailyPost.mood]}`}>{myDailyPost.mood}</div>
                </div>
                <div className="p-6 -mt-12 relative z-10">
                    <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
                        <span className="font-bold text-white mr-2 block text-xs uppercase tracking-widest text-gray-500 mb-1">Today, {new Date(myDailyPost.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        "{myDailyPost.caption}"
                    </p>
                    <div className="flex gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                        {[{ label: 'Love', emoji: '❤️' }, { label: 'Laugh', emoji: '😂' }, { label: 'Crying', emoji: '😭' }, { label: 'Hug', emoji: '🫂' }].map(reaction => {
                           const count = getReactionCount(myDailyPost.reactions, reaction.label)
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
    )
  }

  // KONDISI 1: LIMIT HABIS
  if (viewCount >= DAILY_VIEW_LIMIT) {
    return (
        <>
            {renderMyDetailModal()}
            <EmptyState 
                message="Cycle Complete" 
                subMessage="You have reached the daily limit of 10 truths. Return to your reality."
            />
        </>
    )
  }

  // KONDISI 2: STOK HABIS (Updated Text Here!)
  if (currentCardIndex >= posts.length) {
    return (
        <>
            {renderMyDetailModal()}
            <EmptyState 
                message="All Caught Up" 
                subMessage="The feed is quiet. Time to enjoy the real world."
            />
        </>
    )
  }

  const post = posts[currentCardIndex]
  const userReaction = post.reactions?.find(r => r.user_id === user.id)?.reaction_value

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-white/20">
      
      <AmbientBackground />
      {renderMyDetailModal()}
      
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

      <main className="h-screen w-full flex flex-col items-center justify-center px-4 pt-16 pb-24 relative z-10">
        
        <div className="absolute top-20 z-40 animate-fade-in-down w-full max-w-xs">
             <UploadSection />
        </div>

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