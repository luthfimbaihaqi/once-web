'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// DEFINISI GAYA NEON UNTUK MOOD (Saat Dipilih)
const MOOD_SELECTED_STYLES = {
  'Happy': 'bg-yellow-500 text-black shadow-[0_0_25px_rgba(234,179,8,0.6)] border-yellow-400 font-extrabold scale-[1.02]',
  'Sad': 'bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.6)] border-blue-400 font-extrabold scale-[1.02]',
  'InLove': 'bg-pink-500 text-white shadow-[0_0_25px_rgba(236,72,153,0.6)] border-pink-400 font-extrabold scale-[1.02]',
  'Angry': 'bg-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] border-red-500 font-extrabold scale-[1.02]',
  'Gloomy': 'bg-gray-500 text-white shadow-[0_0_25px_rgba(156,163,175,0.6)] border-gray-400 font-extrabold scale-[1.02]',
  'Boring': 'bg-orange-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.6)] border-orange-400 font-extrabold scale-[1.02]',
  'FlatFace': 'bg-slate-500 text-white shadow-[0_0_25px_rgba(100,116,139,0.6)] border-slate-400 font-extrabold scale-[1.02]',
}

// GAYA DASAR MOOD (Saat Belum Dipilih - Glass Effect)
const MOOD_BASE_STYLE = 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300'

const MOODS = [
  { label: 'Happy', emoji: '😊' },
  { label: 'Sad', emoji: '😢' },
  { label: 'InLove', emoji: '😍' },
  { label: 'Angry', emoji: '😡' },
  { label: 'Gloomy', emoji: '☁️' },
  { label: 'Boring', emoji: '😐' },
  { label: 'FlatFace', emoji: '😶' },
]

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      alert('Please select an image file!')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleUpload = async () => {
    if (!file || !mood) {
      alert('Please select a photo and a mood!')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      const fileName = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('posts').insert([
        { user_id: user.id, image_url: publicUrlData.publicUrl, caption: caption, mood: mood }
      ])
      if (dbError) throw dbError

      router.push('/feed')
    } catch (error) {
      console.error(error)
      alert('Upload failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    // CONTAINER UTAMA (Dengan Background Ambience)
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 selection:text-white relative overflow-hidden">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>

      {/* HEADER: Glass Effect */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl px-4 py-4 flex justify-between items-center z-50">
        <button 
          onClick={() => router.back()} 
          className="text-gray-400 hover:text-white transition flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/5"
        >
          <span className="text-lg">←</span> <span className="text-sm font-medium tracking-wide">Cancel</span>
        </button>
        <h1 className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          CREATE
        </h1>
        <div className="w-16"></div> {/* Spacer agar judul di tengah */}
      </nav>

      {/* CONTENT AREA */}
      <main className="pt-24 pb-12 px-6 max-w-md mx-auto space-y-10 relative z-10">
        
        {/* 1. UPLOAD ZONE (Glowing Frame) */}
        <div className={`relative aspect-[4/5] rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center transition-all duration-500 group ${
            preview 
            ? 'border-0 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)]' // Style saat ada foto
            : 'border-2 border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 hover:shadow-[0_0_30px_inset_rgba(255,255,255,0.05)]' // Style saat kosong
        }`}>
            {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
                <div className="text-center p-6 space-y-4 group-hover:scale-105 transition duration-300">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-white/10 to-transparent rounded-full flex items-center justify-center border border-white/10 shadow-lg animate-pulse">
                      <span className="text-3xl">📸</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold tracking-wide">Drop your truth here.</p>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Tap to explore gallery</p>
                    </div>
                </div>
            )}
            
            <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
            />
        </div>

        {/* 2. CAPTION INPUT (Invisible Style) */}
        <div className="group relative">
            <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={240}
                placeholder="What is the essence of this moment?"
                className="peer w-full bg-transparent border-0 border-b-2 border-white/10 py-4 text-lg text-white placeholder-gray-600 focus:border-white focus:ring-0 focus:outline-none transition-all duration-300 resize-none h-28"
            />
            {/* Garis Glow saat fokus */}
            <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 peer-focus:w-full"></div>
            <div className="text-right text-xs text-gray-600 mt-2 tracking-widest">
                {caption.length} / 240
            </div>
        </div>

        {/* 3. MOOD SELECTOR (Neon Grid) */}
        <div>
            <label className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-6 block text-center">Select Your Vibe</label>
            <div className="grid grid-cols-3 gap-3">
                {MOODS.map((m) => (
                    <button
                        key={m.label}
                        onClick={() => setMood(m.label)}
                        className={`px-2 py-4 rounded-2xl text-sm transition-all duration-300 flex flex-col items-center gap-2 border ${
                            mood === m.label 
                            ? MOOD_SELECTED_STYLES[m.label] 
                            : MOOD_BASE_STYLE
                        }`}
                    >
                        <span className="text-2xl filter drop-shadow-lg">{m.emoji}</span>
                        <span className="tracking-wide">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* 4. SUBMIT BUTTON (Enter The Void Style) */}
        <div className="pt-4">
          <button
              onClick={handleUpload}
              disabled={loading || !file || !mood}
              className="group relative w-full overflow-hidden rounded-3xl bg-white py-5 text-black font-black tracking-widest text-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center justify-center gap-3">
                {loading ? (
                   <span className="animate-pulse">TRANSMITTING...</span>
                ) : (
                   <>
                     <span>SHARE ONCE</span>
                     <span className="text-2xl leading-none group-hover:-rotate-45 transition-transform duration-300">✈️</span>
                   </>
                )}
              </span>
          </button>
          <p className="text-center text-gray-500 text-xs mt-4 uppercase tracking-widest">
            By sharing, you lock this truth for 24h.
          </p>
        </div>

      </main>
    </div>
  )
}