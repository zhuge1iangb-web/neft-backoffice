'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function LoginPage() {
  const { login, currentUser, lang, setLang, theme, setTheme } = useAppStore()
  const router = useRouter()
  const t = translations[lang]
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRed = theme === 'red'

  // Apply red-theme class on mount + whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('red-theme', isRed)
  }, [isRed])

  useEffect(() => {
    if (currentUser) router.replace('/dashboard')
  }, [currentUser, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 600))
    const ok = await login(username, password)
    if (ok) router.push('/dashboard')
    else setError(t.login.loginFailed)
    setLoading(false)
  }

  // สีที่ใช้ใน gradient ตาม theme
  const g = isRed
    ? { c1: '#6B1A1A', c2: '#8B2222', c3: '#A33030', o1: '#8B2222', o2: '#E84B0F', o3: '#C44444' }
    : { c1: '#0F2654', c2: '#1B3875', c3: '#2557A7', o1: '#2557A7', o2: '#E84B0F', o3: '#4A90D9' }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* === Animated Gradient Background === */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${g.c1}, ${g.c2}, ${g.c3}, ${g.c2}, ${g.c1})`,
        backgroundSize: '400% 400%',
        animation: 'gradientShift 12s ease infinite',
        transition: 'background 0.8s ease',
      }} />

      {/* Floating blobs — same layout as Customer Portal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#E84B0F]/8 rounded-full blur-3xl"
          style={{ animation: 'float1 8s ease-in-out infinite' }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: `${g.o1}33`, transition: 'background-color 0.8s ease', animation: 'float2 10s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ backgroundColor: `${g.o1}4D`, transition: 'background-color 0.8s ease', animation: 'float3 7s ease-in-out infinite' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* CSS keyframes */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-40px, 30px) scale(1.08); }
          70% { transform: translate(25px, -20px) scale(0.92); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(-50%, -50%); }
          50% { transform: translate(calc(-50% + 20px), calc(-50% - 30px)); }
        }
      `}</style>

      {/* Theme toggle — มุมบนขวา */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setTheme(isRed ? 'blue' : 'red')}
          title={isRed ? 'Switch to Blue theme' : 'Switch to Red theme'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium backdrop-blur-sm"
        >
          <span
            className="w-3 h-3 rounded-sm inline-block border border-white/30"
            style={{ backgroundColor: isRed ? '#1B3875' : '#8B2222' }}
          />
          {isRed ? 'Blue' : 'Red'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="bg-white px-8 pt-8 pb-5 text-center border-b border-gray-100">
            <div className="flex justify-center mb-4">
              <Image src="/neft-logo.png" alt="NEFT Solution" width={190} height={78} className="h-14 w-auto object-contain" priority />
            </div>
            <div className="w-14 h-0.5 bg-[#E84B0F] mx-auto mb-3 rounded-full" />
            <p className="font-semibold text-sm" style={{ color: 'var(--brand-navy)' }}>{t.login.subtitle}</p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.username}</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none transition-colors"
                  onFocus={e => { e.target.style.borderColor = 'var(--brand-blue)'; e.target.style.boxShadow = '0 0 0 2px var(--brand-ring)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  placeholder={t.login.username}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.password}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none pr-10 transition-colors"
                    onFocus={e => { e.target.style.borderColor = 'var(--brand-blue)'; e.target.style.boxShadow = '0 0 0 2px var(--brand-ring)' }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    placeholder={t.login.password}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--brand-blue)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--brand-navy)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--brand-blue)')}
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {t.login.loginBtn}
              </button>
            </form>

            {/* Language */}
            <div className="mt-4 flex justify-center gap-3">
              {(['th','en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={lang === l
                    ? { backgroundColor: 'var(--brand-blue)', color: '#fff' }
                    : { color: '#9ca3af' }
                  }
                >
                  {l === 'th' ? 'ภาษาไทย' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-white/50 text-xs">© 2026 NEFT Solution Co., Ltd.</p>
          <a href="/customer-portal" className="inline-block text-blue-300 hover:text-white text-xs underline underline-offset-2 transition-colors">
            {lang === 'th' ? '🏥 ลูกค้า / Customer Portal →' : '🏥 Customer Portal →'}
          </a>
        </div>
      </div>
    </div>
  )
}
