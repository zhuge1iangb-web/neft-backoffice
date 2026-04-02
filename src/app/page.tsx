'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const { login, currentUser, lang, setLang } = useAppStore()
  const router = useRouter()
  const t = translations[lang]
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser) router.replace('/dashboard')
  }, [currentUser, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 600))
    const ok = login(username, password)
    if (ok) router.push('/dashboard')
    else setError(t.login.loginFailed)
    setLoading(false)
  }

  const demoLogins = [
    { u: 'admin',   p: 'admin123', label: 'Admin' },
    { u: 'ceo',     p: 'ceo123',   label: 'CEO' },
    { u: 'sales1',  p: 'sales123', label: 'Sales' },
    { u: 'pm1',     p: 'pm123',    label: 'PM' },
    { u: 'finance', p: 'fin123',   label: 'Finance' },
    { u: 'service', p: 'svc123',   label: 'Service' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2654] via-[#1B3875] to-[#2557A7] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#E84B0F] rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F2654] to-[#1B3875] px-8 py-8 text-center">
            <div className="w-16 h-16 bg-[#E84B0F] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-black text-2xl">N</span>
            </div>
            <h1 className="text-white font-bold text-xl">NEFT Solution</h1>
            <p className="text-blue-200 text-sm mt-1">{t.login.subtitle}</p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.username}</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/30 focus:border-[#1B3875] transition-colors"
                  placeholder={t.login.username}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.login.password}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3875]/30 focus:border-[#1B3875] pr-10 transition-colors"
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
                className="w-full bg-[#1B3875] hover:bg-[#0F2654] text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {t.login.loginBtn}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-5">
              <p className="text-xs text-center text-gray-400 mb-2">Demo Accounts</p>
              <div className="grid grid-cols-3 gap-1">
                {demoLogins.map(d => (
                  <button key={d.u}
                    onClick={() => { setUsername(d.u); setPassword(d.p) }}
                    className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-[#1B3875] border border-gray-100 rounded-lg transition-colors text-gray-600"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="mt-4 flex justify-center gap-3">
              {(['th','en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${lang === l ? 'bg-[#1B3875] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {l === 'th' ? 'ภาษาไทย' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">© 2026 NEFT Solution Co., Ltd.</p>
      </div>
    </div>
  )
}
