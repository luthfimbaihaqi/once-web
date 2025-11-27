'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const MOOD_COLORS = {
  'Happy': 'bg-yellow-400 shadow-yellow-400/50',
  'Sad': 'bg-blue-500 shadow-blue-500/50',
  'InLove': 'bg-pink-500 shadow-pink-500/50',
  'Angry': 'bg-red-500 shadow-red-500/50',
  'Gloomy': 'bg-gray-400 shadow-gray-400/50',
  'Boring': 'bg-orange-400 shadow-orange-400/50',
  'FlatFace': 'bg-slate-500 shadow-slate-500/50',
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

const MOOD_ADVICE_POOL = {
  'Happy': [
    "Keep shining! Your energy is contagious today.",
    "Mission: Share this joy with a stranger.",
    "Happiness looks gorgeous on you.",
    "Save this feeling. Bottle it up for a rainy day.",
    "You are the sun in someone else's sky today."
  ],
  'Sad': [
    "It's okay not to be okay. Take a deep breath.",
    "Mission: Listen to your favorite slow song.",
    "Tears are just words the heart can't say.",
    "Be gentle with yourself. You're healing.",
    "This too shall pass. Just breathe."
  ],
  'InLove': [
    "Love is in the air! Enjoy this beautiful feeling.",
    "Mission: Send a text to someone you appreciate.",
    "The world looks brighter through your eyes today.",
    "Hold onto this warmth. It's rare.",
    "Heart full, vibes high. Enjoy the flutter."
  ],
  'Angry': [
    "Channel that fire into something creative.",
    "Mission: Put your phone down and take a walk.",
    "Don't let the noise disturb your inner peace.",
    "Anger is an energy. Use it wisely, don't burn out.",
    "Deep breath in. Deep breath out. Let it go."
  ],
  'Gloomy': [
    "Even the darkest clouds have a silver lining.",
    "Mission: Go outside and look at the sky.",
    "It's a slow day, and that is perfectly fine.",
    "Rest if you must, but don't you quit.",
    "Stars only shine when it's dark enough."
  ],
  'Boring': [
    "Maybe it's time to try something new?",
    "Mission: Read a book or watch a documentary.",
    "Boredom is the birthplace of creativity.",
    "Do one thing that scares you today.",
    "Routine is safe, but adventure is waiting."
  ],
  'FlatFace': [
    "Just flowing with the day. Stay chill.",
    "Mission: Drink a glass of water. Hydrate.",
    "Neutral is a powerful place to be.",
    "No drama, no stress. Just being.",
    "Peace is the new luxury."
  ],
}

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) 
  const [myPosts, setMyPosts] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [stats, setStats] = useState({ dominant: null, total: 0, streak: 0, calendar: [], advice: '' })
  
  const [selectedPost, setSelectedPost] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [editForm, setEditForm] = useState({ username: '', bio: '', avatarFile: null, avatarPreview: null })
  const [saving, setSaving] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)
      fetchProfileData(user.id) 
      fetchMyPosts(user.id)
    }
    getData()
  }, [router])

  const fetchProfileData = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) {
        setProfile(data)
        setEditForm({ 
            username: data.username || '', // Safety check kalau null
            bio: data.bio || '', 
            avatarFile: null, 
            avatarPreview: data.avatar_url 
        })
    }
  }

  const fetchMyPosts = async (userId) => {
    const { data } = await supabase
      .from('posts')
      .select('*, reactions(reaction_value)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setMyPosts(data)
      generateStats(data)
    }
    setLoading(false)
  }

  const generateStats = (posts) => {
    const counts = {}
    posts.forEach(p => counts[p.mood] = (counts[p.mood] || 0) + 1)
    let dominant = null
    let max = 0
    Object.entries(counts).forEach(([mood, count]) => {
      if (count > max) { max = count; dominant = mood }
    })

    let selectedAdvice = ""
    if (dominant) {
        const pool = MOOD_ADVICE_POOL[dominant]
        const randomIndex = Math.floor(Math.random() * pool.length)
        selectedAdvice = pool[randomIndex]
    }

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

    setStats({ dominant, total: posts.length, streak: currentStreak, calendar, advice: selectedAdvice })
  }

  // --- LOGIKA EDIT PROFILE (SAFE MODE) ---
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    e.target.value = ''

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too big! Please choose an image under 5MB.")
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setEditForm(prev => ({ 
            ...prev, 
            avatarFile: file, 
            avatarPreview: reader.result 
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
        const updates = {
            id: user.id,
            username: editForm.username, 
            bio: editForm.bio,
            updated_at: new Date(),
        }

        // FIX: Hanya jalankan validasi username jika 'profile' ada dan username berubah
        // Jika profile null (user baru/error), anggap boleh update
        if (profile && editForm.username !== profile.username) {
            const lastChanged = profile.username_last_changed ? new Date(profile.username_last_changed) : null
            const now = new Date()
            
            if (lastChanged) {
                const diffTime = Math.abs(now - lastChanged)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
                
                if (diffDays < 30) {
                    alert(`Username can only be changed once every 30 days. Try again in ${30 - diffDays} days.`)
                    setSaving(false)
                    return
                }
            }

            const { data: existing } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', editForm.username)
                .neq('id', user.id) 
                .single()
            
            if (existing) {
                alert('Username already taken!')
                setSaving(false)
                return
            }

            updates.username_last_changed = new Date()
        }

        if (editForm.avatarFile) {
            const fileName = `avatar_${user.id}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
                .from('posts') 
                .upload(fileName, editForm.avatarFile)
            
            if (uploadError) throw uploadError

            const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName)
            updates.avatar_url = publicUrlData.publicUrl
        }

        const { error } = await supabase.from('profiles').upsert(updates)
        if (error) throw error

        await fetchProfileData(user.id)
        setIsEditing(false)
        alert('Profile updated successfully!')

    } catch (error) {
        console.error(error)
        alert('Error updating profile: ' + error.message)
    } finally {
        setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    const { error } = await supabase.from('posts').delete().eq('id', deletingId)
    if (!error) {
        const updatedPosts = myPosts.filter(p => p.id !== deletingId)
        setMyPosts(updatedPosts)
        generateStats(updatedPosts)
        setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getReactionCount = (reactions, type) => {
    return reactions?.filter(r => r.reaction_value === type).length || 0
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-black text-white pb-10 font-sans relative">
      
      {/* --- MODAL EDIT PROFILE --- */}
      {isEditing && (
        <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
                
                <h3 className="text-xl font-bold mb-6 text-center">Edit Profile</h3>
                
                <div className="space-y-6">
                    
                    {/* GHOST INPUT UPLOAD */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-600 group">
                            
                            {editForm.avatarPreview ? (
                                <img src={editForm.avatarPreview} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl pointer-events-none">📸</div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold pointer-events-none">CHANGE</div>

                            <input 
                                type="file" 
                                onChange={handleAvatarChange} 
                                accept="image/png, image/jpeg, image/jpg, image/webp" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                            />
                        </div>
                        <span className="text-[10px] text-gray-500">Tap image to change</span>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase tracking-widest pl-1">Username</label>
                        <input 
                            type="text" 
                            value={editForm.username}
                            onChange={(e) => setEditForm({...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition"
                        />
                        <p className="text-[10px] text-gray-600 pl-1">Change limit: Once every 30 days.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase tracking-widest pl-1">Bio</label>
                        <textarea 
                            value={editForm.bio}
                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                            maxLength={80}
                            rows={2}
                            placeholder="Tell your truth..."
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition resize-none"
                        />
                        <div className="text-right text-[10px] text-gray-600">{editForm.bio.length}/80</div>
                    </div>

                    <button 
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DETAIL & DELETE --- */}
      {selectedPost && (
         <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
            <div className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex gap-2 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5">
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
                    <button onClick={() => { setDeletingId(selectedPost.id); setSelectedPost(null) }} className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2 text-sm font-bold"><span>🗑️</span> Delete Memory</button>
                </div>
            </div>
         </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {deletingId && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl border border-red-500/20">⚠️</div>
                  <div><h3 className="text-lg font-bold text-white">Delete Forever?</h3><p className="text-gray-400 text-sm mt-1">This memory and all its reactions will be lost.</p></div>
                  <div className="flex gap-3 pt-2">
                      <button onClick={() => setDeletingId(null)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition font-medium">Cancel</button>
                      <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition shadow-lg shadow-red-900/20">Yes, Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MAIN PAGE --- */}
      <div className="max-w-md mx-auto min-h-screen bg-black border-x border-gray-900 shadow-2xl relative">
        <header className="p-6 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-40">
          <button onClick={() => router.push('/feed')} className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition">&larr;</button>
          <span className="font-bold tracking-widest text-sm">PROFILE</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-500 transition">LOGOUT</button>
        </header>

        {/* PROFILE INFO */}
        <section className="flex flex-col items-center pt-4 pb-8 relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 mb-4">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-4 border-transparent overflow-hidden">
               {/* Gunakan avatar dari profile, atau editForm (preview), atau inisial */}
               {(profile?.avatar_url || user?.email) ? (
                   <img src={profile?.avatar_url} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
               ) : null}
               
               {!profile?.avatar_url && (
                   <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-pink-400 absolute">
                     {user?.email?.[0].toUpperCase()}
                   </span>
               )}
            </div>
          </div>
          
          <h2 className="text-xl font-bold">{profile?.username || user?.email?.split('@')[0]}</h2>
          
          {profile?.bio && (
              <p className="text-sm text-gray-400 mt-2 max-w-[200px] text-center italic">"{profile.bio}"</p>
          )}

          <button 
            onClick={() => setIsEditing(true)}
            className="mt-4 px-4 py-1.5 rounded-full border border-gray-700 text-xs font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            Edit Profile
          </button>

          <div className="flex gap-4 mt-6 text-center">
            <div><span className="block font-bold text-lg">{stats.total}</span><span className="text-xs text-gray-500 uppercase">Once</span></div>
            <div className="w-[1px] bg-gray-800"></div>
            <div><span className="block font-bold text-lg">{stats.streak}</span><span className="text-xs text-gray-500 uppercase">Streak</span></div>
          </div>
        </section>

        {/* MOOD CALENDAR */}
        <section className="px-6 mb-8">
          <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">This Week</h3>
          <div className="flex justify-between items-start bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
            {stats.calendar.map((day, idx) => (
              <div key={idx} className={`flex flex-col items-center gap-3 ${day.isFuture ? 'opacity-30' : 'opacity-100'}`}>
                <span className="text-[10px] font-bold text-gray-500 uppercase">{day.dayShort}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${day.mood ? `${MOOD_COLORS[day.mood]} shadow-lg scale-100` : 'bg-gray-800 scale-90 border border-gray-700'}`}></div>
              </div>
            ))}
          </div>
        </section>

        {stats.dominant && (
          <section className="px-6 mb-8">
            <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-20 h-20 blur-3xl opacity-20 ${MOOD_COLORS[stats.dominant]}`}></div>
              <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Weekly Vibe</h3>
              <p className="text-2xl font-bold text-white mb-2">{stats.dominant}</p>
              <p className="text-sm text-gray-400 italic">"{stats.advice}"</p>
            </div>
          </section>
        )}

        <section className="px-1 pb-12">
          <div className="flex items-center justify-between px-5 mb-4">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Archive</h3>
             <span className="text-xs text-gray-600">Tap to view</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {myPosts.length === 0 ? (
               <div className="col-span-3 py-20 text-center text-gray-600 text-sm">Create your first memory today.</div>
            ) : (
              myPosts.map((post) => (
                <div key={post.id} onClick={() => setSelectedPost(post)} className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-900 hover:opacity-90 transition">
                  <img src={post.image_url} className="w-full h-full object-cover" />
                  <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${MOOD_COLORS[post.mood]}`}></div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}