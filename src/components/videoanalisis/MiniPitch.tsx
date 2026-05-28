import type { EventCoordinate } from '@/services/videoAnalysisTypes'

interface MiniPitchProps {
  coordinates: EventCoordinate[]
  className?: string
}

export default function MiniPitch({ coordinates, className = '' }: MiniPitchProps) {
  return (
    <div
      className={[
        '[--pl:rgba(0,0,0,0.24)] dark:[--pl:rgba(255,255,255,0.30)]',
        '[--pls:rgba(0,0,0,0.16)] dark:[--pls:rgba(255,255,255,0.20)]',
        className,
      ].join(' ')}
    >
      <svg viewBox="0 0 105 68" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-lg">
        <rect x="0" y="0" width="105" height="68" rx="3" fill="rgba(10,46,10,0.15)" className="dark:fill-[rgba(10,46,10,0.4)]" />
        <rect x="2" y="2" width="101" height="64" fill="none" stroke="var(--pl)" strokeWidth="0.9" />
        <line x1="52.5" y1="2" x2="52.5" y2="66" stroke="var(--pl)" strokeWidth="0.8" />
        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="var(--pl)" strokeWidth="0.8" />
        <circle cx="52.5" cy="34" r="0.85" fill="var(--pl)" />
        <rect x="2" y="14.5" width="17" height="39" fill="none" stroke="var(--pls)" strokeWidth="0.7" />
        <rect x="2" y="24" width="6" height="20" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M19,27.5 A9.15,9.15 0 0 1 19,40.5" fill="none" stroke="var(--pls)" strokeWidth="0.65" />
        <rect x="86" y="14.5" width="17" height="39" fill="none" stroke="var(--pls)" strokeWidth="0.7" />
        <rect x="97" y="24" width="6" height="20" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M86,27.5 A9.15,9.15 0 0 0 86,40.5" fill="none" stroke="var(--pls)" strokeWidth="0.65" />
        <rect x="1" y="29" width="1.5" height="10" fill="none" stroke="var(--pl)" strokeWidth="0.7" />
        <rect x="102.5" y="29" width="1.5" height="10" fill="none" stroke="var(--pl)" strokeWidth="0.7" />
        <circle cx="12" cy="34" r="0.75" fill="var(--pls)" />
        <circle cx="93" cy="34" r="0.75" fill="var(--pls)" />
        <path d="M2,5 A3,3 0 0 1 5,2" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M100,2 A3,3 0 0 1 103,5" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M2,63 A3,3 0 0 0 5,66" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M100,66 A3,3 0 0 0 103,63" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        {coordinates.map((coord, i) => (
          <circle
            key={i}
            cx={2 + coord.x * 101}
            cy={2 + coord.y * 64}
            r="2.2"
            fill="rgba(111,25,41,0.8)"
            stroke="rgba(111,25,41,1)"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  )
}
