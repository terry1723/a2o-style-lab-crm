import { describe, expect, it } from 'vitest'
import { getHeroParallaxOffset } from './useHeroParallax'

describe('getHeroParallaxOffset', () => {
  it('returns no movement for reduced motion or narrow viewports', () => {
    expect(getHeroParallaxOffset({ clientX: 900, clientY: 600, width: 1200, height: 800, reducedMotion: true })).toEqual({ x: 0, y: 0 })
    expect(getHeroParallaxOffset({ clientX: 360, clientY: 300, width: 720, height: 800, reducedMotion: false })).toEqual({ x: 0, y: 0 })
  })

  it('returns small bounded desktop offsets', () => {
    expect(getHeroParallaxOffset({ clientX: 1200, clientY: 800, width: 1200, height: 800, reducedMotion: false })).toEqual({ x: 9, y: 6 })
    expect(getHeroParallaxOffset({ clientX: 0, clientY: 0, width: 1200, height: 800, reducedMotion: false })).toEqual({ x: -9, y: -6 })
  })
})
