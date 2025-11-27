'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// Helper Icon sesuai Type Reaction
const REACTION_ICONS = {
  'Love': '❤️',
  'Laugh': '😂',
  'Crying': '😭',
  'Hug': '🫂'
}

export default function Notifications() {
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState([])
  const router = useRouter()

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // 1. Ambil Notifikasi + Data Pelaku (Username/Avatar)
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles:actor_id ( username, avatar_url )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) // Batasi 50 terakhir biar ringan

      setNotifs(data || [])
      setLoading(false)

      // 2. Tandai semua sebagai "Sudah Dibaca" (Mark as Read)
      if (data && data.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
      }
    }

    fetchNotifs()
  }, [router])

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 font-sans">
      
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="p-6 flex items-center sticky top-0 bg-[#050505]/80 backdrop-blur-md z-40 border-b border-white/5">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition text-xl mr-4">
          &larr;
        </button>
        <h1 className="font-bold tracking-widest text-sm uppercase">Resonance</h1>
      </header>

      {/* CONTENT LIST */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
           <div className="text-center py-20 text-xs text-gray-500 animate-pulse tracking-widest">LISTENING TO ECHOES...</div>
        ) : notifs.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
              <span className="text-4xl grayscale">🔕</span>
              <p className="text-xs text-gray-500 uppercase tracking-widest">No resonance yet</p>
           </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    !item.is_read 
                    ? 'bg-white/10 border-white/20' // Unread Style (Lebih terang)
                    : 'bg-transparent border-transparent opacity-60' // Read Style
                }`}
              >
                {/* Avatar Pelaku */}
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">
                        {item.profiles?.avatar_url ? (
                            <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {item.profiles?.username?.[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    {/* Icon Reaction Kecil */}
                    <div className="absolute -bottom-1 -right-1 text-sm bg-[#050505] rounded-full p-0.5 border border-black">
                        {REACTION_ICONS[item.type]}
                    </div>
                </div>

                {/* Teks Notifikasi */}
                <div className="flex-1">
                    <p className="text-sm text-gray-200">
                        <span className="font-bold text-white mr-1">{item.profiles?.username}</span>
                        <span className="font-light">sent a {item.type}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                {/* Indikator Belum Dibaca (Dot Biru) */}
                {!item.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}