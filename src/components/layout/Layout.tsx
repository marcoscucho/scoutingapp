import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AIAnalystChat from '@/components/chat/AIAnalystChat'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/auth/AuthModal'

export default function Layout() {
  const { user, loading } = useAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-gray-50 dark:bg-apple-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-apple-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  // Require authentication
  if (!user) {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-[#0a0a0a]">
          {/* Subtle granate glow — not overwhelming */}
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[200px]" style={{ background: 'rgba(111,25,41,0.18)' }} />

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }} />

          {/* Decorative lines */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
            <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-20">
            {/* Top - Badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <div className="w-2 h-2 rounded-full" style={{ background: '#9B3A4A' }} />
                <span className="text-white/70 text-sm font-medium tracking-wide">Club Atlético Lanús Platform</span>
              </div>
            </div>

            {/* Center - Logo and text */}
            <div className="flex flex-col items-start">
              <img
                src="/lanus-escudo.png"
                alt="Club Atlético Lanús Platform"
                className="w-32 h-32 xl:w-40 xl:h-40 mb-8 object-contain"
              />

              <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight">
                Club Atlético<br />Lanús Platform
              </h1>

              <p className="text-lg xl:text-xl max-w-md leading-relaxed font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Plataforma institucional del Club Atlético Lanús para la gestión, scouting y análisis integral de jugadores.
              </p>

              <div className="flex flex-wrap gap-3 mt-8">
                {['Análisis avanzado', 'Datos en tiempo real', 'Formaciones'].map(f => (
                  <span key={f} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/60">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom - Stats */}
            <div className="flex gap-12">
              {[['4.500+', 'Jugadores'], ['50+', 'Métricas'], ['10+', 'Ligas']].map(([n, l]) => (
                <div key={l}>
                  <div className="text-3xl font-bold text-white">{n}</div>
                  <div className="text-sm mt-1 text-white/35">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 bg-white dark:bg-apple-gray-900">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-10">
              <img
                src="/lanus-escudo.png"
                alt="Club Atlético Lanús Platform"
                className="w-20 h-20 mx-auto mb-4 object-contain"
              />
              <h1 className="text-2xl font-bold text-apple-gray-900 dark:text-white">Club Atlético Lanús Platform</h1>
            </div>

            {/* Welcome text */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-apple-gray-900 dark:text-white mb-2">
                Bienvenido
              </h2>
              <p className="text-apple-gray-500 dark:text-apple-gray-400">
                Ingresá tus credenciales para continuar
              </p>
            </div>

            <AuthModal
              isOpen={true}
              onClose={() => {}}
              forceOpen={true}
            />

            <div className="lg:hidden mt-12 pt-8 border-t border-apple-gray-200 dark:border-apple-gray-800">
              <p className="text-center text-apple-gray-400 text-sm">
                Plataforma de Scouting Profesional
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-apple-gray-50 dark:bg-apple-gray-900 text-apple-gray-800 dark:text-apple-gray-100 transition-colors duration-300 ease-apple">
      <Navbar />
      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <AIAnalystChat />
    </div>
  )
}
