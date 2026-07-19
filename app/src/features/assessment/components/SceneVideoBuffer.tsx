import { forwardRef } from 'react'

type Props = {
  src?: string
  poster?: string
  active: boolean
  muted: boolean
  onTimeUpdate?: () => void
  onEnded?: () => void
  onError?: () => void
}

export const SceneVideoBuffer = forwardRef<HTMLVideoElement, Props>(function SceneVideoBuffer(
  { src, poster, active, muted, onTimeUpdate, onEnded, onError },
  ref,
) {
  return (
    <video
      ref={ref}
      className={`absolute inset-0 h-full w-full object-cover ${
        active ? 'z-10 opacity-100' : 'z-0 opacity-0'
      }`}
      src={src}
      poster={poster}
      preload="auto"
      playsInline
      muted={muted}
      controls={false}
      disablePictureInPicture
      onTimeUpdate={active ? onTimeUpdate : undefined}
      onEnded={active ? onEnded : undefined}
      onError={active ? onError : undefined}
      aria-hidden="true"
    />
  )
})
