import { useEffect } from 'react'
import type { AssessmentScene } from '../types/assessment'

export function useVideoPreloader(currentSceneIndex: number, scenes: AssessmentScene[]) {
  useEffect(() => {
    const urls = [
      scenes[currentSceneIndex + 1]?.sceneVideoUrl,
      scenes[currentSceneIndex + 1]?.posterUrl,
    ].filter(Boolean) as string[]

    const links = urls.map((url) => {
      const link = document.createElement('link')
      link.rel = url.endsWith('.mp4') ? 'preload' : 'prefetch'
      link.as = url.endsWith('.mp4') ? 'video' : 'image'
      link.href = url
      if (url.endsWith('.mp4')) link.type = 'video/mp4'
      document.head.appendChild(link)
      return link
    })

    return () => links.forEach((link) => link.remove())
  }, [currentSceneIndex, scenes])
}
