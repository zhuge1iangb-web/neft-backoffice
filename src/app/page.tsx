'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

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
    const ok = await login(username, password)
    if (ok) router.push('/dashboard')
    else setError(t.login.loginFailed)
    setLoading(false)
  }

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
          {/* Header — white bg so logo shows naturally without invert */}
          <div className="bg-white px-8 pt-8 pb-5 text-center border-b border-gray-100">
            <div className="flex justify-center mb-4">
              <Image src="/neft-logo.png" alt="NEFT Solution" width={190} height={78} className="h-14 w-auto object-contain" priority />
            </div>
            <div className="w-14 h-0.5 bg-[#E84B0F] mx-auto mb-3 rounded-full" />
            <p className="text-[#0F2654] font-semibold text-sm">{t.login.subtitle}</p>
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

        <div className="text-center mt-4 space-y-1">
          <p className="text-white/40 text-xs">© 2026 NEFT Solution Co., Ltd.</p>
          <a href="/customer-portal" className="inline-block text-blue-300 hover:text-white text-xs underline underline-offset-2 transition-colors">
            🏥 ลูกค้า / Customer Portal →
          </a>
        </div>
      </div>
    </div>
  )
}
