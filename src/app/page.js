'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

// --- COMPONENT: Ambient Background ---
const AmbientBackground = () => (
    <>
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[120px] animate-pulse-slow delay-1000 pointer-events-none"></div>
    </>
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) throw error
            
            if (data?.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{ id: data.user.id, username: email.split('@')[0] }])
                
                if (profileError) {
                    if (!profileError.message.includes('duplicate key')) throw profileError
                }
            }

            setSuccessMsg('Confirmation link sent to your email!')
            setTimeout(() => setIsSignUp(false), 3000) 
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            router.push('/feed')
        }
    } catch (error) {
        setErrorMsg(error.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-[#050505] overflow-hidden selection:bg-white/20 selection:text-white">
      
      <AmbientBackground />
      
      {/* THE GLASS PORTAL */}
      <div className="relative z-10 w-full max-w-md p-8">
        
        {/* HEADER TYPOGRAPHY (Dynamic Text) */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">
            ONCE.
          </h1>
          {/* Subtitle berubah sesuai mode untuk konteks */}
          <p key={isSignUp ? 'signup-text' : 'login-text'} className="text-gray-400 text-xs uppercase tracking-[0.4em] font-light animate-in fade-in slide-in-from-bottom-2 duration-500">
            {isSignUp ? 'Begin your journey.' : 'Share your truth, just Once.'}
          </p>
        </div>

        {/* FORMULIR FUTURISTIK */}
        <div className="backdrop-blur-3xl bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          
          {/* Subtle Glow Border Animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition duration-1000 pointer-events-none"></div>

          {/* Key pada form memicu animasi ulang saat mode berubah */}
          <form 
            key={isSignUp ? 'signup-form' : 'login-form'} 
            onSubmit={handleAuth} 
            className="space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            
            {/* Input Email (Floating Label) */}
            <div className="group relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="peer w-full bg-transparent border-0 border-b border-white/20 py-3 text-white placeholder-transparent focus:border-white focus:ring-0 focus:outline-none transition-all duration-300"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email" className="absolute left-0 -top-3.5 text-gray-500 text-xs transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-white peer-focus:text-xs tracking-widest uppercase cursor-text">
                Email Address
              </label>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-500 peer-focus:w-full"></div>
            </div>
            
            {/* Input Password (Floating Label) */}
            <div className="group relative">
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="peer w-full bg-transparent border-0 border-b border-white/20 py-3 pr-10 text-white placeholder-transparent focus:border-white focus:ring-0 focus:outline-none transition-all duration-300"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="password" className="absolute left-0 -top-3.5 text-gray-500 text-xs transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-white peer-focus:text-xs tracking-widest uppercase cursor-text">
                  Password
                </label>
                <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-500 peer-focus:w-full"></div>
                
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

            {/* Error / Success Messages */}
            {errorMsg && <p className="text-red-400 text-[10px] uppercase tracking-widest text-center animate-pulse font-bold">{errorMsg}</p>}
            {successMsg && <p className="text-green-400 text-[10px] uppercase tracking-widest text-center animate-pulse font-bold">{successMsg}</p>}

            {/* Tombol Action */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl bg-white py-4 text-black font-black tracking-[0.2em] text-xs transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <span className="animate-pulse">PROCESSING...</span>
                ) : (
                  <>
                    {/* TEKS BUTTON SESUAI PERMINTAAN */}
                    {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'} 
                    <span className="text-lg leading-none group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-8">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); setSuccessMsg(''); }}
            className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-[0.2em] relative group py-2"
          >
            {isSignUp ? 'Already exist? Back to Login' : 'New here? Create Account'}
            <span className="absolute bottom-0 left-1/2 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full group-hover:left-0"></span>
          </button>
        </div>

      </div>
    </main>
  )
}