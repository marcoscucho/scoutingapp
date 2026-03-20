import { useData } from '@/context/DataContext'

export default function Footer() {
  const { lastUpdated, external, internal } = useData()

  return (
    <footer className="border-t border-apple-gray-200/50 dark:border-apple-gray-800/50 py-4 px-4 sm:px-6 mt-6 bg-white/50 dark:bg-apple-gray-900/50 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/lanus-escudo.png"
            alt="Club Atlético Lanús Platform"
            className="w-5 h-5 object-contain opacity-70"
          />
          <span className="text-xs text-apple-gray-400 dark:text-apple-gray-500">
            Club Atlético Lanús Platform
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-apple-gray-400 dark:text-apple-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse-soft" />
            {external.length + internal.length} jugadores
          </span>
          {lastUpdated && (
            <span>
              Actualizado {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
