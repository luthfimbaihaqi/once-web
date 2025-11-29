'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// --- COMPONENT: Ambient Background (Konsisten dengan Login) ---
const AmbientBackground = () => (
    <>
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-emerald-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-cyan-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
)

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle') // idle, encrypting, success, error
  const [msg, setMsg] = useState('')
  
  const router = useRouter()

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus('encrypting')
    setMsg('')

    try {
        const { error } = await supabase.auth.updateUser({ password: password })
        if (error) throw error
        
        setStatus('success')
        
        // Redirect ke Feed setelah sukses
        setTimeout(() => {
            router.push('/feed')
        }, 2000)

    } catch (error) {
        console.error(error)
        setStatus('error')
        setMsg(error.message)
        setLoading(false)
    }
  }

  // --- RENDER BUTTON CONTENT ---
  const renderButtonContent = () => {
      if (status === 'encrypting') return <span className="animate-pulse tracking-widest">ENCRYPTING...</span>
      if (status === 'success') return <span className="flex items-center gap-2 text-green-400">TIMELINE SECURED <span className="text-xl">🔒</span></span>
      return (
          <>
            SECURE TIMELINE 
            <span className="text-lg leading-none group-hover:translate-x-1 transition-transform">→</span>
          </>
      )
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-[#050505] overflow-hidden selection:bg-white/20 selection:text-white">
      
      <AmbientBackground />
      
      <div className="relative z-10 w-full max-w-md p-8 animate-in fade-in zoom-in duration-700">
        
        {/* HEADER */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] select-none">
            RE-SYNC.
          </h1>
          <p className="text-emerald-500/80 text-xs uppercase tracking-[0.3em] font-medium animate-pulse">
            The old key is lost. Forge a new one.
          </p>
        </div>

        {/* FORMULIR */}
        <div className={`backdrop-blur-3xl bg-white/5 border p-8 rounded-[2.5rem] shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors duration-500 ${status === 'success' ? 'border-green-500/30' : 'border-white/10'}`}>
          
          <form onSubmit={handleUpdate} className="space-y-8 relative z-10">
            
            {/* Input Password (Floating Label) */}
            <div className="group relative pt-4">
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="peer w-full bg-transparent border-0 border-b border-white/20 py-3 pr-10 text-white placeholder-transparent focus:border-white focus:ring-0 focus:outline-none transition-all duration-300"
                  placeholder="enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="password" className="absolute left-0 -top-1.5 text-gray-500 text-xs transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-5 peer-focus:-top-1.5 peer-focus:text-white peer-focus:text-xs tracking-widest uppercase cursor-text">
                  New Password
                </label>
                <div className={`absolute bottom-0 left-0 w-0 h-[1px] transition-all duration-500 peer-focus:w-full ${status === 'success' ? 'bg-green-500' : 'bg-white'}`}></div>
                
                {/* Tombol Mata */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {msg && <p className="text-red-400 text-[10px] uppercase tracking-widest text-center animate-pulse font-bold">{msg}</p>}

            {/* Tombol Action */}
            <button
              type="submit"
              disabled={loading || status === 'success'}
              className={`group relative w-full overflow-hidden rounded-2xl py-4 font-black tracking-[0.2em] text-xs transition-all duration-500 hover:scale-[1.02] disabled:opacity-80 disabled:cursor-not-allowed ${status === 'success' ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]'}`}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${status === 'success' ? 'bg-green-400' : 'bg-gradient-to-r from-gray-200 via-white to-gray-200'}`}></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {renderButtonContent()}
              </span>
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}