'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// HELPER: Ikon Reaksi
const REACTION_ICONS = {
  'Love': '❤️',
  'Laugh': '😂',
  'Crying': '😭',
  'Hug': '🫂'
}

// --- COMPONENT: Ambient Background ---
const AmbientBackground = () => (
    <>
      <div className="fixed top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
)

// --- COMPONENT: SKELETON LOADER ---
const NotificationSkeleton = () => (
    <div className="space-y-6 pt-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
                <div className="w-16 h-2 bg-white/10 rounded animate-pulse mb-2"></div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10"></div>
                    <div className="flex-1 space-y-2">
                        <div className="w-32 h-3 bg-white/10 rounded"></div>
                        <div className="w-20 h-2 bg-white/10 rounded"></div>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10"></div>
                    <div className="flex-1 space-y-2">
                        <div className="w-24 h-3 bg-white/10 rounded"></div>
                        <div className="w-16 h-2 bg-white/10 rounded"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
)

export default function Notifications() {
  const [loading, setLoading] = useState(true)
  const [groupedNotifs, setGroupedNotifs] = useState({ new: [], today: [], yesterday: [], old: [] })
  const [isEmpty, setIsEmpty] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // 1. Ambil Notifikasi
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles:actor_id ( username, avatar_url )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!data || data.length === 0) {
          setIsEmpty(true)
          setLoading(false)
          return
      }

      // 2. Grouping Logic
      const groups = { new: [], today: [], yesterday: [], old: [] }
      const now = new Date()
      const todayDate = now.toDateString()
      const yesterdayDate = new Date(now.setDate(now.getDate() - 1)).toDateString()

      data.forEach(item => {
          const itemDate = new Date(item.created_at).toDateString()
          
          if (!item.is_read) {
              groups.new.push(item)
          } else if (itemDate === todayDate) {
              groups.today.push(item)
          } else if (itemDate === yesterdayDate) {
              groups.yesterday.push(item)
          } else {
              groups.old.push(item)
          }
      })

      setGroupedNotifs(groups)
      setLoading(false)

      // 3. Mark as Read (Silent Update)
      // Kita tandai read di background agar UX grouping "New" tetap terlihat sebentar saat user masuk
      if (groups.new.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
      }
    }

    fetchNotifs()
  }, [router])

  const handleProfileClick = (actorId) => {
      router.push(`/profile/${actorId}`)
  }

  // --- COMPONENT: Notification Item ---
  const NotificationItem = ({ item, isNew }) => (
      <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
          isNew 
          ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
          : 'bg-transparent border-transparent hover:bg-white/5'
      }`}>
          {/* Avatar (Clickable) */}
          <div 
            onClick={(e) => { e.stopPropagation(); handleProfileClick(item.actor_id) }}
            className="relative cursor-pointer transition-transform active:scale-95"
          >
              <div className={`w-10 h-10 rounded-full bg-gray-800 overflow-hidden border ${isNew ? 'border-white' : 'border-white/10'}`}>
                  {item.profiles?.avatar_url ? (
                      <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {item.profiles?.username?.[0].toUpperCase()}
                      </div>
                  )}
              </div>
              <div className="absolute -bottom-1 -right-1 text-sm bg-[#050505] rounded-full p-0.5 border border-black shadow-sm">
                  {REACTION_ICONS[item.type]}
              </div>
          </div>

          {/* Text Content */}
          <div className="flex-1">
              <p className="text-sm text-gray-300 leading-snug">
                  <span 
                    onClick={() => handleProfileClick(item.actor_id)}
                    className="font-bold text-white mr-1 hover:underline cursor-pointer"
                  >
                      {item.profiles?.username}
                  </span>
                  <span className="font-light opacity-80">sent a reaction</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-1 font-medium tracking-wide">
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
          </div>

          {/* Unread Dot Indicator */}
          {isNew && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
          )}
      </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans relative selection:bg-white/20">
      <AmbientBackground />

      {/* HEADER */}
      <header className="p-6 flex items-center sticky top-0 bg-[#050505]/80 backdrop-blur-md z-40 border-b border-white/5">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition mr-4">
          &larr;
        </button>
        <h1 className="font-bold tracking-[0.2em] text-xs uppercase">Resonance</h1>
      </header>

      {/* CONTENT LIST */}
      <main className="max-w-md mx-auto px-4 pt-2 pb-12 relative z-10">
        
        {loading ? (
           <NotificationSkeleton />
        ) : isEmpty ? (
           <div className="flex flex-col items-center justify-center py-32 opacity-30 space-y-4 animate-in fade-in zoom-in duration-500">
              <span className="text-5xl grayscale mb-2">📡</span>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">No resonance yet</p>
              <p className="text-[10px] text-gray-600">The void is silent.</p>
           </div>
        ) : (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* SECTION: NEW */}
              {groupedNotifs.new.length > 0 && (
                  <section>
                      <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 px-2">New Echoes</h2>
                      <div className="space-y-1">
                          {groupedNotifs.new.map(item => <NotificationItem key={item.id} item={item} isNew={true} />)}
                      </div>
                  </section>
              )}

              {/* SECTION: TODAY */}
              {groupedNotifs.today.length > 0 && (
                  <section>
                      <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Today</h2>
                      <div className="space-y-1">
                          {groupedNotifs.today.map(item => <NotificationItem key={item.id} item={item} />)}
                      </div>
                  </section>
              )}

              {/* SECTION: YESTERDAY */}
              {groupedNotifs.yesterday.length > 0 && (
                  <section>
                      <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">Yesterday</h2>
                      <div className="space-y-1">
                          {groupedNotifs.yesterday.map(item => <NotificationItem key={item.id} item={item} />)}
                      </div>
                  </section>
              )}

              {/* SECTION: OLD */}
              {groupedNotifs.old.length > 0 && (
                  <section>
                      <h2 className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-3 px-2">Past Echoes</h2>
                      <div className="space-y-1">
                          {groupedNotifs.old.map(item => <NotificationItem key={item.id} item={item} />)}
                      </div>
                  </section>
              )}
           </div>
        )}
      </main>
    </div>
  )
}