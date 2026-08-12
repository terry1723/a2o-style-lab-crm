import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react'

type ParallaxInput = {
  clientX: number
  clientY: number
  width: number
  height: number
  reducedMotion: boolean
}

const zeroOffset = { x: 0, y: 0 }

export function getHeroParallaxOffset({ clientX, clientY, width, height, reducedMotion }: ParallaxInput) {
  if (reducedMotion || width < 768 || width <= 0 || height <= 0) return zeroOffset

  const x = Math.max(-1, Math.min(1, (clientX / width - 0.5) * 2))
  const y = Math.max(-1, Math.min(1, (clientY / height - 0.5) * 2))
  return { x: Math.round(x * 9), y: Math.round(y * 6) }
}

export function useHeroParallax(reducedMotion: boolean) {
  const [offset, setOffset] = useState(zeroOffset)

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setOffset(getHeroParallaxOffset({
      clientX: event.clientX - rect.left,
      clientY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      reducedMotion,
    }))
  }, [reducedMotion])

  const onPointerLeave = useCallback(() => setOffset(zeroOffset), [])

  return { offset, onPointerMove, onPointerLeave }
}
