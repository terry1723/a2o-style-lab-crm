export function getAssessmentSideMotion(side: 'left' | 'right', reducedMotion: boolean) {
  return {
    initial: { opacity: 0, x: reducedMotion ? 0 : side === 'left' ? -36 : 36 },
    whileInView: { opacity: 1, x: 0 },
  }
}
