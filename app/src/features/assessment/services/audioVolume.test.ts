import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fadeAudioParam, fadeAudioVolume } from './audioVolume'

describe('fadeAudioVolume', () => {
  let nextFrameId: number
  let frameCallbacks: Map<number, FrameRequestCallback>
  let requestFrame: ReturnType<typeof vi.fn>
  let cancelFrame: ReturnType<typeof vi.fn>

  beforeEach(() => {
    nextFrameId = 1
    frameCallbacks = new Map()
    requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    })
    cancelFrame = vi.fn((frameId: number) => {
      frameCallbacks.delete(frameId)
    })
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function runFrame(timestamp: number) {
    const next = frameCallbacks.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined
    if (!next) throw new Error('No animation frame is pending')
    const [frameId, callback] = next
    frameCallbacks.delete(frameId)
    callback(timestamp)
  }

  it('linearly fades from the current volume to the exact target', () => {
    const audio = document.createElement('audio')
    audio.volume = 0.1

    fadeAudioVolume(audio, 0.18, 100)
    runFrame(0)
    runFrame(50)

    expect(audio.volume).toBeCloseTo(0.14)

    runFrame(125)
    expect(audio.volume).toBe(0.18)
    expect(frameCallbacks.size).toBe(0)
  })

  it.each([
    { target: -0.5, expected: 0 },
    { target: 1.5, expected: 1 },
  ])('clamps a $target target to $expected', ({ target, expected }) => {
    const audio = document.createElement('audio')
    audio.volume = 0.4

    fadeAudioVolume(audio, target, 100)
    runFrame(0)
    runFrame(100)

    expect(audio.volume).toBe(expected)
  })

  it.each([0, -10])('sets the target synchronously for a %i ms duration', (durationMs) => {
    const audio = document.createElement('audio')
    audio.volume = 0.3

    const cleanup = fadeAudioVolume(audio, 0.6, durationMs)

    expect(audio.volume).toBe(0.6)
    expect(requestFrame).not.toHaveBeenCalled()
    expect(() => cleanup()).not.toThrow()
  })

  it('cancels the pending frame and prevents later volume changes', () => {
    const audio = document.createElement('audio')
    audio.volume = 0.2

    const cleanup = fadeAudioVolume(audio, 0.8, 100)
    runFrame(0)
    const pending = frameCallbacks.entries().next().value as [number, FrameRequestCallback]

    cleanup()
    cleanup()
    pending[1](100)

    expect(cancelFrame).toHaveBeenCalledTimes(1)
    expect(cancelFrame).toHaveBeenCalledWith(pending[0])
    expect(audio.volume).toBe(0.2)
    expect(requestFrame).toHaveBeenCalledTimes(2)
  })
})

describe('fadeAudioParam', () => {
  let nextFrameId: number
  let frameCallbacks: Map<number, FrameRequestCallback>
  let cancelFrame: ReturnType<typeof vi.fn>

  beforeEach(() => {
    nextFrameId = 1
    frameCallbacks = new Map()
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    }))
    cancelFrame = vi.fn((frameId: number) => frameCallbacks.delete(frameId))
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function runFrame(timestamp: number) {
    const next = frameCallbacks.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined
    if (!next) throw new Error('No animation frame is pending')
    const [frameId, callback] = next
    frameCallbacks.delete(frameId)
    callback(timestamp)
  }

  it('linearly fades an AudioParam to the exact target', () => {
    const gain = { value: 0.1 } as AudioParam

    fadeAudioParam(gain, 0.18, 100)
    runFrame(0)
    runFrame(50)
    expect(gain.value).toBeCloseTo(0.14)

    runFrame(100)
    expect(gain.value).toBe(0.18)
    expect(frameCallbacks.size).toBe(0)
  })

  it('sets a clamped gain synchronously when fading is disabled', () => {
    const gain = { value: 0.4 } as AudioParam

    const cleanup = fadeAudioParam(gain, 2, 0)

    expect(gain.value).toBe(1)
    expect(frameCallbacks.size).toBe(0)
    expect(() => cleanup()).not.toThrow()
  })

  it('cancels a pending AudioParam fade', () => {
    const gain = { value: 0.1 } as AudioParam
    const cleanup = fadeAudioParam(gain, 0.18, 100)
    runFrame(0)
    const pending = frameCallbacks.entries().next().value as [number, FrameRequestCallback]

    cleanup()
    pending[1](100)

    expect(cancelFrame).toHaveBeenCalledWith(pending[0])
    expect(gain.value).toBe(0.1)
  })
})
