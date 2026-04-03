import { getTeamShield } from '@/constants/teamShields'

interface ShieldImgProps {
  team: string
  size?: number        // px, default 32
  className?: string
  fallbackInitials?: boolean
}

function initials(name: string): string {
  return name
    .split(/[\s-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export function ShieldImg({ team, size = 32, className = '', fallbackInitials = true }: ShieldImgProps) {
  const src = getTeamShield(team)

  const style = { width: size, height: size, minWidth: size }

  if (!src) {
    if (!fallbackInitials) return null
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-apple-gray-700 text-apple-gray-200 font-bold select-none ${className}`}
        style={{ ...style, fontSize: Math.max(9, Math.floor(size * 0.35)) }}
        title={team}
      >
        {initials(team)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={team}
      title={team}
      className={`object-contain ${className}`}
      style={style}
      onError={e => {
        const el = e.target as HTMLImageElement
        el.style.display = 'none'
        if (fallbackInitials) {
          const span = document.createElement('span')
          span.className = 'inline-flex items-center justify-center rounded-full bg-apple-gray-700 text-apple-gray-200 font-bold select-none'
          span.style.cssText = `width:${size}px;height:${size}px;min-width:${size}px;font-size:${Math.max(9, Math.floor(size * 0.35))}px`
          span.textContent = initials(team)
          el.parentNode?.insertBefore(span, el)
        }
      }}
    />
  )
}

// Competition badge (liga / copa / internacional)
interface CompBadgeProps {
  competition: string  // 'liga' | 'copa' | 'internacional'
  size?: number
  className?: string
}

const COMP_LABELS: Record<string, string> = {
  liga: 'Liga Profesional',
  copa: 'Copa Argentina',
  internacional: 'Sudamericana',
}
const COMP_SHIELDS: Record<string, string> = {
  liga: '/escudos/competiciones/liga-argentina.png',
  copa: '/escudos/competiciones/copa-argentina.png',
  internacional: '/escudos/competiciones/conmebol.png',
}

export function CompBadge({ competition, size = 20, className = '' }: CompBadgeProps) {
  const src = COMP_SHIELDS[competition]
  const label = COMP_LABELS[competition] ?? competition
  if (!src) return null
  return (
    <img
      src={src}
      alt={label}
      title={label}
      className={`object-contain ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    />
  )
}
