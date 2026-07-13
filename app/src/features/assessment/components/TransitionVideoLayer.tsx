import { forwardRef } from 'react'

type Props = {
  src?: string
  visible: boolean
  muted: boolean
  onError: () => void
}

export const TransitionVideoLayer = forwardRef<HTMLVideoElement, Props>(function TransitionVideoLayer(
  { src, visible, muted, onError },
  ref,
) {
  if (!src) return null

  return (
    <video
      ref={ref}
      className={`pointer-events-none absolute inset-0 z-30 h-full w-full object-cover transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      src={src}
      preload="auto"
      playsInline
      muted={muted}
      controls={false}
      disablePictureInPicture
      onError={onError}
      aria-hidden="true"
    />
  )
})
