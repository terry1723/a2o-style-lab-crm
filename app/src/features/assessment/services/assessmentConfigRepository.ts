import { assessmentConfig } from '../config/assessmentConfig'

// The existing project has no content/settings table. Keeping this boundary lets a
// future Supabase-backed config source replace the local fallback without touching
// the media engine or state machine.
export function getAssessmentConfig() {
  return assessmentConfig
}

export function getEnabledAssessmentScenes() {
  return assessmentConfig.scenes
    .filter((scene) => scene.enabled)
    .sort((a, b) => a.order - b.order)
}
