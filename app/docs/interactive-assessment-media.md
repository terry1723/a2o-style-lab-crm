# Interactive assessment media replacement

The assessment engine is driven by `src/features/assessment/config/assessmentConfig.ts`.
Final Martin and transition media can be introduced without editing the player or state machine.

## Replace a scene

1. Add the final 9:16 MP4 and poster image under `public/media/assessment/` (or use a stable CDN URL).
2. In the matching scene config, replace `sceneVideoUrl` and `posterUrl`.
3. Set `questionCueSeconds` to the authored moment where the question should appear.
4. Update `caption` if the visible caption needs to change.

## Replace a transition

1. Add the final transition MP4 under `public/media/assessment/`.
2. Replace `transitionVideoUrl` on the scene that leads into the next scene.
3. Keep the final scene without a transition URL.

Scene IDs and question IDs are stable CRM/analytics identifiers. Do not rename them when only media or copy changes.

The local placeholder files validate cue timing, audio unlock, two persistent scene buffers, frame readiness, transition fallback, progress recovery and lead handoff. The optional Supabase migration at `../../supabase/migrations/20260713000000_add_interactive_assessment.sql` is not applied by Preview deployments.
