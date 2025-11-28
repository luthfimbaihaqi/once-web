'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const MOOD_STYLES = {
  'Happy': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.25)]',
  'Sad': 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.18)]',
  'InLove': 'bg-pink-500/10 text-pink-500 border-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.18)]',
  'Angry': 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
  'Gloomy': 'bg-gray-500/10 text-gray-400 border-gray-500/20 shadow-[0_0_10px_rgba(156,163,175,0.12)]',
  'Boring': 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.18)]',
  'FlatFace': 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-[0_0_10px_rgba(100,116,139,0.12)]',
}

const MOOD_EMOJI = {
  Happy: '🙂',
  Sad: '😔',
  InLove: '💕',
  Angry: '😤',
  Gloomy: '☁️',
  Boring: '😐',
  FlatFace: '😶',
}

const MOOD_DOT_COLOR = {
  Happy: '#f59e0b',
  Sad: '#3b82f6',
  InLove: '#ec4899',
  Angry: '#ef4444',
  Gloomy: '#9ca3af',
  Boring: '#f97316',
  FlatFace: '#64748b',
}

const DAILY_VIEW_LIMIT = 10

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// --- COMPONENT: Ambient Background ---
const AmbientBackground = () => (
    <>
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
)

// --- COMPONENT: SKELETON FEED (Premium Loading State) ---
const FeedSkeleton = () => {
    return (
        <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center">
            <AmbientBackground />
            
            {/* Header Skeleton */}
            <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse"></div>
                    <div className="w-16 h-5 rounded bg-white/5 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                        <div className="w-12 h-2 rounded bg-white/5 animate-pulse"></div>
                        <div className="w-20 h-1 rounded-full bg-white/5 animate-pulse"></div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse"></div>
                </div>
            </nav>

            {/* Main Card Skeleton */}
            <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 pt-28 pb-48 gap-6 relative z-10">
                <div className="relative w-full max-w-sm aspect-[4/5] bg-white/5 rounded-[2rem] border border-white/5 flex flex-col justify-end p-6 animate-pulse">
                    {/* Fake Content Inside Card */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white/10"></div>
                        <div className="flex flex-col gap-2">
                             <div className="w-24 h-3 rounded bg-white/10"></div>
                             <div className="w-16 h-2 rounded bg-white/10"></div>
                        </div>
                    </div>
                    <div className="w-full h-4 rounded bg-white/10 mb-2"></div>
                    <div className="w-3/4 h-4 rounded bg-white/10 mb-6"></div>
                    
                    {/* Fake Reactions */}
                    <div className="flex gap-2">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex-1 h-12 rounded-xl bg-white/10"></div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Bottom Button Skeleton */}
            <div className="fixed bottom-8 w-full flex justify-center z-50 px-4">
                <div className="max-w-sm w-full flex flex-col items-center gap-3">
                     <div className="w-32 h-2 rounded bg-white/5 animate-pulse"></div>
                     <div className="w-full h-14 rounded-full bg-white/10 animate-pulse"></div>
                </div>
            </div>
        </div>
    )
}

export default function Feed() {
  const [user, setUser] = useState(null)
  const [userAvatar, setUserAvatar] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [viewCount, setViewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasPostedToday, setHasPostedToday] = useState(false)
  const [myDailyPost, setMyDailyPost] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showMyDetail, setShowMyDetail] = useState(false)
  const [processingNext, setProcessingNext] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/')
      setUser(user)

      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      if (profile) setUserAvatar(profile.avatar_url)

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setUnreadCount(count || 0)

      await checkMyDailyPost(user.id)
      
      // LOAD FEED LOGIC (TERPISAH COUNTER & FILTER)
      await loadFeedLogic(user.id)
    }

    init()
  }, [router])

  const checkMyDailyPost = async (userId) => {
    const { data } = await supabase
      .from('posts')
      .select('*')
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

    // A. LOGIC 1: Hitung Limit UI (Hanya Reset Tiap 00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Hitung berapa kali lihat post HARI INI
    const { count: todaySeenCount } = await supabase
      .from('seen_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', today.toISOString())

    const currentDailyView = todaySeenCount || 0
    setViewCount(currentDailyView)

    // Jika limit hari ini habis, stop fetch
    if (currentDailyView >= DAILY_VIEW_LIMIT) {
      setPosts([])
      setLoading(false)
      return
    }

    // B. LOGIC 2: Filter Konten (Exclude SEMUA post yang pernah dilihat kapanpun)
    // Ambil semua post_id yang pernah dilihat user ini (tanpa batasan waktu)
    const { data: allSeenData } = await supabase
      .from('seen_posts')
      .select('post_id')
      .eq('user_id', userId)

    const excludePostIds = allSeenData?.map(item => item.post_id) || []

    // C. LOGIC 3: Fetch Feed (Hanya Post 3 Hari Terakhir agar Fresh)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    let query = supabase
      .from('posts')
      .select(`*, profiles ( username, avatar_url ), reactions ( user_id, reaction_value )`)
      .neq('user_id', userId) 
      .gte('created_at', threeDaysAgo.toISOString()) // HANYA AMBIL YG BARU
      .order('created_at', { ascending: false })
      .limit(30) 

    // Terapkan filter exclude (NOT IN)
    if (excludePostIds.length > 0) {
      query = query.not('id', 'in', `(${excludePostIds.join(',')})`)
    }

    const { data: rawPosts } = await query

    if (rawPosts) {
      setPosts(rawPosts)
    }

    setLoading(false)
  }

  const handleNextPost = async () => {
    if (processingNext) return
    if (!user) return
    const currentPost = posts[currentCardIndex]

    if (!currentPost) {
        setCurrentCardIndex(prev => prev + 1)
        return
    }

    setProcessingNext(true)

    try {
      await supabase.from('seen_posts').insert({
        user_id: user.id,
        post_id: currentPost.id,
        viewed_at: new Date().toISOString()
      })

      setViewCount(prev => prev + 1)
      setCurrentCardIndex(prev => prev + 1)

    } catch (error) {
      console.error('Error recording view:', error)
      setCurrentCardIndex(prev => prev + 1)
    } finally {
      setProcessingNext(false)
    }
  }

  // Handle Profile Click
  const handleProfileClick = (targetUserId) => {
      if (!targetUserId) return
      if (user && targetUserId === user.id) {
          router.push('/profile')
      } else {
          router.push(`/profile/${targetUserId}`)
      }
  }

  const post = posts[currentCardIndex]

  // --- HEADER WITH PROGRESS BAR ---
  const Header = () => (
    <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-50 backdrop-blur-md bg-gradient-to-b from-black/80 to-transparent">
      {/* KIRI: Logo & Notif */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/notifications')} aria-label="notifications" className="relative group">
          <span className="text-xl group-hover:scale-110 transition block">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>
        <h1 className="font-black tracking-tighter text-lg">ONCE.</h1>
      </div>

      {/* KANAN: Status Limit & Profile */}
      <div className="flex items-center gap-4">
        
        {/* Visual Limit Indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500">Daily Limit</span>
            <span className={`text-[10px] font-black ${viewCount >= DAILY_VIEW_LIMIT ? 'text-red-500' : 'text-white'}`}>
              {viewCount}/{DAILY_VIEW_LIMIT}
            </span>
          </div>
          {/* Progress Bar Line */}
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${viewCount >= DAILY_VIEW_LIMIT ? 'bg-red-500' : 'bg-white'}`}
              style={{ width: `${(viewCount / DAILY_VIEW_LIMIT) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Profile Pic */}
        <button onClick={() => router.push('/profile')} aria-label="profile" className="w-9 h-9 rounded-full bg-gray-800 p-0.5 border border-white/10 overflow-hidden hover:border-white transition">
          <div className="w-full h-full rounded-full overflow-hidden">
            {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full w-full text-white text-xs">{user?.email?.[0]?.toUpperCase()}</span>}
          </div>
        </button>
      </div>
    </nav>
  )

  const UploadSection = () => (
    <div className="mb-0 w-full max-w-xs flex justify-center z-40 pointer-events-auto">
      {!myDailyPost && (
        <button
          onClick={() => router.push('/upload')}
          aria-label="Share your truth"
          className="w-full max-w-[260px] rounded-full bg-white text-black py-1.5 px-4 text-xs font-bold tracking-wider hover:scale-105 transition shadow-lg"
        >
          <div className="flex flex-col items-center">
            <span className="font-black text-sm">+ SHARE YOUR TRUTH</span>
            <span className="text-[10px] uppercase text-gray-500 mt-1">You can post only once per day</span>
          </div>
        </button>
      )}

      {myDailyPost && (
        <div
          onClick={() => setShowMyDetail(true)}
          className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md w-full cursor-pointer hover:bg-white/5 transition-colors group"
        >
          <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 relative">
            <img src={myDailyPost.image_url} className="w-full h-full object-cover" />
            <div style={{ backgroundColor: MOOD_DOT_COLOR[myDailyPost.mood] || '#9ca3af' }} className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black"></div>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Your Truth Today</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${MOOD_STYLES[myDailyPost.mood]}`}>
                {MOOD_EMOJI[myDailyPost.mood]} {myDailyPost.mood}
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

  const renderMyDetailModal = () => {
    if (!showMyDetail || !myDailyPost) return null
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowMyDetail(false)}>
        <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowMyDetail(false)} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white hover:text-black transition">&times;</button>
          <div className="relative aspect-[4/5]">
            <img src={myDailyPost.image_url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className={`absolute top-6 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md ${MOOD_STYLES[myDailyPost.mood]}`}>{MOOD_EMOJI[myDailyPost.mood]} {myDailyPost.mood}</div>
          </div>
          <div className="p-6 -mt-12 relative z-10">
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-light">
              <span className="font-bold text-white mr-2 block text-xs uppercase tracking-widest text-gray-500 mb-1">Today, {new Date(myDailyPost.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              "{myDailyPost.caption}"
            </p>
            <div className="flex gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
              {[{ label: 'Love', emoji: '❤️' }, { label: 'Laugh', emoji: '😂' }, { label: 'Crying', emoji: '😭' }, { label: 'Hug', emoji: '🫂' }].map(reaction => {
                const count = (myDailyPost.reactions || []).filter(r => r.reaction_value === reaction.label).length
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

  // USE SKELETON INSTEAD OF TEXT
  if (!user || loading) return <FeedSkeleton />

  const isLimitReached = viewCount >= DAILY_VIEW_LIMIT;
  const isFeedEmpty = !isLimitReached && currentCardIndex >= posts.length;
  const userReaction = post?.reactions?.find(r => r.user_id === user.id)?.reaction_value;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AmbientBackground />
      <Header />

      {isLimitReached ? (
        <main className="h-screen w-full flex flex-col items-center justify-center p-8 text-center space-y-6 relative z-10">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600">10/10</h1>
          <div className="space-y-2">
            <p className="text-xl font-bold">Cycle Complete.</p>
            <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">You have witnessed 10 truths today. <br/>Return to your reality.</p>
          </div>
          <div className="w-full max-w-xs"><UploadSection /></div>
          {/* Tagline dipindah ke sini */}
          <div className="text-[10px] uppercase tracking-widest text-gray-500">another life, another day</div>
          <button onClick={() => router.push('/profile')} className="px-8 py-3 rounded-full bg-transparent border border-white/20 hover:bg-white hover:text-black transition-all font-bold text-sm tracking-widest">OPEN MOMENTS</button>
        </main>
      ) : isFeedEmpty ? (
        <main className="h-screen w-full flex flex-col items-center justify-center p-8 text-center relative z-10">
          <div className="w-full max-w-xs mb-8"><UploadSection /></div>
          
          <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center relative mb-8 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            <div className="absolute inset-0 bg-white/5 blur-xl rounded-full"></div>
            <div className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full border border-white/5 animate-ping delay-75 opacity-10"></div>
            <span className="text-2xl opacity-50 relative z-10">📡</span>
          </div>

          <p className="text-sm font-bold tracking-widest uppercase text-gray-400">All Caught Up</p>
          <p className="text-xs text-gray-600 mt-2 mb-10 max-w-xs leading-relaxed">The feed is quiet. Time to enjoy the real world.</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Tagline dipindah ke sini juga (di atas tombol utama) */}
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">another life, another day</div>
            <button onClick={() => router.push('/profile')} className="w-full px-6 py-4 rounded-full bg-white text-black font-bold text-xs tracking-[0.2em] hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]">OPEN MOMENTS</button>
            <button onClick={() => window.location.reload()} className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-white transition-colors py-2">Refresh Feed</button>
          </div>
        </main>
      ) : (
        <>
          <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 pt-28 pb-48 relative z-10 gap-6">
            
            {hasPostedToday && (
              <div className="w-full max-w-xs animate-in slide-in-from-top-4 fade-in duration-500 z-30">
                <UploadSection />
              </div>
            )}

            <div className="relative w-full max-w-sm aspect-[4/5] bg-[#111] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shrink-0">
              <img src={post.image_url} className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }} className="absolute top-6 left-4 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-red-500 hover:bg-black/50 transition border border-white/10" title="Report">⚠️</button>

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                <div className="absolute top-6 left-0 right-4 flex justify-end items-start pointer-events-auto">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border backdrop-blur-md flex items-center gap-2 ${MOOD_STYLES[post.mood]}`}>
                    <span className="text-[12px]">{MOOD_EMOJI[post.mood]}</span>
                    <span>{post.mood}</span>
                  </div>
                </div>

                <div className="pointer-events-auto">
                  {/* USER INFO - CLICKABLE */}
                  <div 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        handleProfileClick(post.user_id); 
                    }}
                    className="flex items-center gap-2 mb-2 cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] border border-white/20 overflow-hidden group-hover:border-white transition">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        post.profiles?.username?.[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-wide text-gray-300 group-hover:text-white transition">{post.profiles?.username}</span>
                      <span className="text-[10px] text-gray-500">{timeAgo(post.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-sm font-light text-gray-200 leading-relaxed mb-6 drop-shadow-md">{post.caption}</p>

                  <div className="flex gap-2 mb-4">
                    {[{ label: 'Love', emoji: '❤️' }, { label: 'Laugh', emoji: '😂' }, { label: 'Crying', emoji: '😭' }, { label: 'Hug', emoji: '🫂' }].map((reaction) => {
                      const count = (post.reactions || []).filter(r => r.reaction_value === reaction.label).length
                      const isActive = userReaction === reaction.label
                      return (
                        <button key={reaction.label} onClick={(e) => { e.stopPropagation(); }} className={`flex-1 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/5 transition-all active:scale-95 ${isActive ? 'bg-white text-black border-white' : 'hover:bg-white/20'}`}>
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

          <div className="fixed bottom-8 w-full flex justify-center z-50 px-4 pointer-events-none">
            <div className="max-w-sm w-full flex flex-col items-center gap-3 pointer-events-auto">
              {/* TAGLINE DIHAPUS DARI SINI AGAR TIDAK PADAT */}
              
              {!hasPostedToday && (
                <UploadSection />
              )}

              <button disabled={processingNext} onClick={handleNextPost} className="w-full bg-gradient-to-r from-white/90 to-white/80 text-black font-black py-4 rounded-full shadow-[0_8px_40px_rgba(255,255,255,0.12)] hover:scale-105 active:scale-95 transition-all duration-300 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                {processingNext ? '...' : 'NEXT TRUTH →'}
              </button>
            </div>
          </div>
        </>
      )}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(255,165,0,0.2)]">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto text-xl border border-orange-500/20">⚠️</div>
            <div>
              <h3 className="text-lg font-bold text-white">Report Content?</h3>
              <p className="text-gray-400 text-sm mt-1">Is this inappropriate or toxic? <br/>We will remove it from your feed immediately.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition font-medium">Cancel</button>
              <button onClick={async () => {
                const currentPost = posts[currentCardIndex];
                if (!user || !currentPost) return;
                await supabase.from('reports').insert({ reporter_id: user.id, post_id: currentPost.id, reason: 'Inappropriate Content' });
                await supabase.from('seen_posts').insert([{ user_id: user.id, post_id: currentPost.id, viewed_at: new Date().toISOString() }]);
                setShowReportModal(false);
                setViewCount(prev => prev + 1);
                setCurrentCardIndex(prev => prev + 1);
                alert("Thanks. We've removed this from your feed.");
              }} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-900/20">Yes, Report</button>
            </div>
          </div>
        </div>
      )}
      {renderMyDetailModal()}
    </div>
  )
}