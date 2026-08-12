import type { SVGProps } from 'react'

export type EditorialIconName = 'proportion' | 'colour' | 'grooming' | 'style' | 'consultation' | 'wardrobe' | 'shopping' | 'photography' | 'professional' | 'founder'

type Props = SVGProps<SVGSVGElement> & { name: EditorialIconName }

export function A2OEditorialIcon({ name, ...props }: Props) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      <g {...common}>
        {name === 'proportion' && <><path d="M16 39V16m16 23V16M12 20l4-5 4 5m8 0 4-5 4 5M12 35l4 5 4-5m8 0 4 5 4-5"/><path d="M21 12h6M21 43h6"/></>}
        {name === 'colour' && <><path d="M12 34c-5-8-1-20 8-24 9-4 20 2 20 12 0 6-4 9-9 8-4-1-5 1-5 4 0 4-9 5-14 0Z"/><circle cx="19" cy="17" r="2"/><circle cx="27" cy="15" r="2"/><circle cx="34" cy="20" r="2"/><circle cx="16" cy="25" r="2"/></>}
        {name === 'grooming' && <><path d="M12 37 35 14m-16 2 19 19M10 12l28 28"/><circle cx="11" cy="38" r="5"/><circle cx="37" cy="11" r="5"/><path d="M29 10h8m-8 4h8"/></>}
        {name === 'style' && <><path d="m17 11 7 5 7-5 8 7-5 8-4-2v14H18V24l-4 2-5-8 8-7Z"/><path d="M21 17h6m-3 0v21"/></>}
        {name === 'consultation' && <><path d="M9 13h30v21H22l-8 6v-6H9V13Z"/><path d="M16 21h16m-16 6h11"/></>}
        {name === 'wardrobe' && <><path d="M10 8h28v32H10zM24 8v32"/><path d="M19 24h1m8 0h1M15 13h18"/></>}
        {name === 'shopping' && <><path d="M11 17h26l-2 23H13l-2-23Z"/><path d="M18 18c0-8 12-8 12 0M17 28h14"/></>}
        {name === 'photography' && <><path d="M8 16h9l3-5h9l3 5h8v24H8z"/><circle cx="24" cy="28" r="8"/><path d="M35 21h1"/></>}
        {name === 'professional' && <><circle cx="24" cy="13" r="7"/><path d="M10 41c1-11 7-16 14-16s13 5 14 16M18 27l6 7 6-7M24 34v7"/></>}
        {name === 'founder' && <><path d="M9 39h30M13 39V18h22v21M18 18v-7h12v7"/><path d="M19 25h10m-10 6h10"/></>}
      </g>
    </svg>
  )
}
