import type { AssessmentAnswerMap, AssessmentConfig, AssessmentResult } from '../types/assessment'

export function calculateAssessmentResult(
  config: AssessmentConfig,
  answers: AssessmentAnswerMap,
): AssessmentResult {
  const scores: Record<string, number> = {}

  for (const scene of config.scenes.filter((item) => item.enabled)) {
    const selected = answers[scene.question.id] ?? []
    for (const option of scene.question.options) {
      if (!selected.includes(option.id)) continue
      for (const [resultId, score] of Object.entries(option.score ?? {})) {
        scores[resultId] = (scores[resultId] ?? 0) + score
      }
    }
  }

  const winningResultId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? config.defaultResultId
  const definition = config.results[winningResultId] ?? config.results[config.defaultResultId]

  return { ...definition, scores }
}

export function getSelectedLabels(config: AssessmentConfig, answers: AssessmentAnswerMap) {
  return Object.fromEntries(
    config.scenes.map((scene) => {
      const selectedIds = answers[scene.question.id] ?? []
      const labels = scene.question.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => option.label)
      return [scene.question.id, labels]
    }),
  )
}
