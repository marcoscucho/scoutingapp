import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import ThemeToggle from './ThemeToggle'
import AuthModal from '@/components/auth/AuthModal'
import { PDFBuilderFloatingButton } from '@/components/pdf/AddToReportButton'

const navLinks = [
  { to: '/', label: 'Inicio', icon: 'home', exact: true },
  { to: '/plantel', label: 'Plantel', icon: 'users' },
  { to: '/analisis', label: 'Análisis Colectivo', icon: 'team' },
  { to: '/seguimiento', label: 'Seguimiento', icon: 'eye' },
  { to: '/evaluar', label: 'Reporte', icon: 'clipboard' },
]

const inferiorLinks = [
  { to: '/inferiores/equipos', label: 'Armado de Equipos', icon: 'layout' },
]

const scoutingLinks = [
  { to: '/oportunidades', label: 'Oportunidades', icon: 'star' },
  { to: '/similares', label: 'Similares', icon: 'search' },
  { to: '/comparacion', label: 'Comparaciones', icon: 'compare' },
  { to: '/formacion', label: 'Formaciones', icon: 'layout' },
  { to: '/dispersion', label: 'Dispersion', icon: 'scatter' },
  { to: '/radar', label: 'Detector', icon: 'radar' },
]

function NavIcon({ icon, className = "w-5 h-5" }: { icon: string; className?: string }) {
  const icons: Record<string, JSX.Element> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    team: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h2m14 0h2M5 10V7a7 7 0 0114 0v3M5 10l-1 8h16l-1-8M9 18v2m6-2v2M7 10h10" />,
    globe: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
    star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    compare: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
    layout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />,
    scatter: <><circle cx="7" cy="17" r="2" strokeWidth={1.5} /><circle cx="12" cy="7" r="2" strokeWidth={1.5} /><circle cx="17" cy="12" r="2" strokeWidth={1.5} /><circle cx="7" cy="7" r="2" strokeWidth={1.5} /><circle cx="17" cy="17" r="2" strokeWidth={1.5} /></>,
    radar: <><circle cx="12" cy="12" r="9" strokeWidth={1.5} /><circle cx="12" cy="12" r="5" strokeWidth={1.5} /><line x1="12" y1="3" x2="12" y2="21" strokeWidth={1.5} /><line x1="3" y1="12" x2="21" y2="12" strokeWidth={1.5} /></>,
    clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
    video: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />,
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[icon]}
    </svg>
  )
}

export default function Navbar() {
  const { theme } = useTheme()
  const { user, userDisplayName, signOut, loading: authLoading } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showScoutingMenu, setShowScoutingMenu] = useState(false)
  const [showInfMenu, setShowInfMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const scoutingMenuRef = useRef<HTMLDivElement>(null)
  const infMenuRef = useRef<HTMLDivElement>(null)

  // Check if current route is a scouting route
  const isScoutingRoute = location.pathname === '/scouting' || scoutingLinks.some(l => location.pathname === l.to)
  const isInfRoute = inferiorLinks.some(l => location.pathname === l.to)

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (scoutingMenuRef.current && !scoutingMenuRef.current.contains(event.target as Node)) {
        setShowScoutingMenu(false)
      }
      if (infMenuRef.current && !infMenuRef.current.contains(event.target as Node)) {
        setShowInfMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-apple-gray-900/90 backdrop-blur-xl border-b border-apple-gray-200/50 dark:border-apple-gray-800/50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img
                src="/lanus-escudo.png"
                alt="Club Atlético Lanús"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-semibold text-apple-gray-800 dark:text-white text-sm tracking-tight leading-none">
                Club Atlético Lanús
              </span>
            </div>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 bg-apple-gray-100/70 dark:bg-apple-gray-800/70 rounded-xl p-1 backdrop-blur-sm">
            {/* Inicio */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Inicio
            </NavLink>

            {/* Plantel */}
            <NavLink
              to="/plantel"
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Plantel
            </NavLink>

            {/* Análisis Colectivo */}
            <NavLink
              to="/analisis"
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Análisis Colectivo
            </NavLink>

            {/* Scouting Interno / Inferiores dropdown */}
            <div className="relative" ref={infMenuRef}>
              <button
                onClick={() => { setShowInfMenu(v => !v); setShowScoutingMenu(false) }}
                className={`flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isInfRoute
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`}
              >
                Scouting Interno
                <svg className={`w-3.5 h-3.5 transition-transform ${showInfMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showInfMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-apple-gray-900 rounded-2xl shadow-xl border border-apple-gray-200 dark:border-apple-gray-800 py-1.5 z-50">
                  {inferiorLinks.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setShowInfMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'text-brand-green font-semibold bg-brand-green/5'
                            : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800'
                        }`
                      }
                    >
                      <NavIcon icon={link.icon} className="w-4 h-4 flex-shrink-0 opacity-60" />
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Scouting Externo dropdown */}
            <div className="relative" ref={scoutingMenuRef}>
              <div className={`flex items-center rounded-lg ${isScoutingRoute ? 'bg-brand-green shadow-sm' : ''}`}>
                <NavLink
                  to="/scouting"
                  className={`pl-3.5 pr-1.5 py-2 text-sm font-medium rounded-l-lg transition-all duration-200 ${
                    isScoutingRoute
                      ? 'text-white'
                      : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-apple-gray-700/50'
                  }`}
                >
                  Scouting Externo
                </NavLink>
                <button
                  onClick={() => { setShowScoutingMenu(v => !v); setShowInfMenu(false) }}
                  className={`pr-2 py-2 rounded-r-lg transition-all duration-200 ${
                    isScoutingRoute
                      ? 'text-white/80 hover:text-white'
                      : 'text-apple-gray-400 dark:text-apple-gray-500 hover:text-apple-gray-700 dark:hover:text-apple-gray-200 hover:bg-white/40 dark:hover:bg-apple-gray-700/50'
                  }`}
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${showScoutingMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {showScoutingMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-apple-gray-900 rounded-2xl shadow-xl border border-apple-gray-200 dark:border-apple-gray-800 py-1.5 z-50">
                  {scoutingLinks.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setShowScoutingMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'text-brand-green font-semibold bg-brand-green/5'
                            : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800'
                        }`
                      }
                    >
                      <NavIcon icon={link.icon} className="w-4 h-4 flex-shrink-0 opacity-60" />
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Seguimiento */}
            <NavLink
              to="/seguimiento"
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Seguimiento
            </NavLink>

            {/* Reporte */}
            <NavLink
              to="/evaluar"
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Reporte
            </NavLink>

            {/* Video Análisis */}
            <NavLink
              to="/videoanalisis"
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-apple-gray-600 dark:text-apple-gray-300 hover:text-apple-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-apple-gray-700/50'
                }`
              }
            >
              Video Análisis
            </NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <PDFBuilderFloatingButton />
            <ThemeToggle />

            {/* User menu */}
            {!authLoading && (
              user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-700 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-green to-brand-greenHover flex items-center justify-center text-white text-sm font-semibold">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300 max-w-24 truncate">
                      {userDisplayName}
                    </span>
                    <svg className="w-4 h-4 text-apple-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-apple-gray-800 rounded-apple shadow-apple-lg dark:shadow-apple-dark-md border border-apple-gray-200 dark:border-apple-gray-700 py-1 animate-scale-in origin-top-right">
                      <div className="px-4 py-2 border-b border-apple-gray-100 dark:border-apple-gray-700">
                        <p className="text-sm font-medium text-apple-gray-800 dark:text-white truncate">{userDisplayName}</p>
                        <p className="text-xs text-apple-gray-500 truncate">{user.email}</p>
                      </div>
                      <NavLink
                        to="/evaluaciones"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Gestionar evaluaciones
                      </NavLink>
                      <button
                        onClick={() => {
                          signOut()
                          setShowUserMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-700 transition-colors"
                      >
                        Cerrar sesion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-greenHover text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Ingresar</span>
                </button>
              )
            )}

            {/* Hamburger button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl bg-apple-gray-100 dark:bg-apple-gray-800 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile menu panel */}
      <div
        className={`fixed top-14 right-0 bottom-0 z-40 w-72 bg-white dark:bg-apple-gray-900 shadow-2xl transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="h-full overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="home" className="w-5 h-5" />
              Inicio
            </NavLink>
            <NavLink
              to="/plantel"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="users" className="w-5 h-5" />
              Plantel
            </NavLink>
            <NavLink
              to="/analisis"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="team" className="w-5 h-5" />
              Análisis Colectivo
            </NavLink>
          </div>

          {/* Scouting Interno Section */}
          <div className="mt-4 pt-4 border-t border-apple-gray-200 dark:border-apple-gray-800 space-y-1">
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-apple-gray-400 dark:text-apple-gray-500">
              Scouting Interno
            </p>
            {inferiorLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-green text-white'
                      : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                  }`
                }
              >
                <NavIcon icon={link.icon} className="w-5 h-5" />
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Scouting Externo Section */}
          <div className="mt-4 pt-4 border-t border-apple-gray-200 dark:border-apple-gray-800">
            <NavLink
              to="/scouting"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="globe" className="w-5 h-5" />
              Scouting Externo
            </NavLink>
            <div className="mt-1 ml-4 space-y-1">
              {scoutingLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-green/10 text-brand-green dark:bg-brand-green/20'
                        : 'text-apple-gray-600 dark:text-apple-gray-400 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                    }`
                  }
                >
                  <NavIcon icon={link.icon} className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Seguimiento + Reporte */}
          <div className="mt-4 pt-4 border-t border-apple-gray-200 dark:border-apple-gray-800 space-y-1">
            <NavLink
              to="/seguimiento"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="eye" className="w-5 h-5" />
              Seguimiento
            </NavLink>
            <NavLink
              to="/evaluar"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="clipboard" className="w-5 h-5" />
              Reporte
            </NavLink>
            <NavLink
              to="/videoanalisis"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-apple-gray-700 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
                }`
              }
            >
              <NavIcon icon="video" className="w-5 h-5" />
              Video Análisis
            </NavLink>
          </div>

          {/* Footer in menu */}
          <div className="mt-8 pt-6 border-t border-apple-gray-200 dark:border-apple-gray-800 px-4">
            <p className="text-xs text-apple-gray-400 dark:text-apple-gray-500">
              Club Atlético Lanús v1.0
            </p>
          </div>
        </nav>
      </div>
    </>
  )
}
