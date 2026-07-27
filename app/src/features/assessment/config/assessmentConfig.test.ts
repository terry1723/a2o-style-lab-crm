import { describe, expect, it } from 'vitest'
import { assessmentConfig } from './assessmentConfig'

describe('assessmentConfig', () => {
  it('defines exactly four approved single-choice scenes without transition media', () => {
    expect(assessmentConfig.scenes).toHaveLength(4)
    expect(assessmentConfig.scenes.map((scene) => scene.question.title)).toEqual([
      '以 1 至 10 分計算，你會給自己的形象多少分？',
      '你認為目前的形象最影響哪一個場合？',
      '你認為目前的形象，最容易使你錯失哪一種機會？',
      '如果只能優先改善一個形象項目，你最希望從哪裡開始？',
    ])
    expect(assessmentConfig.scenes.every((scene) => scene.question.type === 'single')).toBe(true)
    expect(assessmentConfig.scenes.every((scene) => !scene.transitionVideoUrl)).toBe(true)
    expect(assessmentConfig.scenes[0].question.options.map((option) => option.label)).toEqual(
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    )
  })

  it('uses four stable question video paths', () => {
    expect(assessmentConfig.scenes.map((scene) => scene.sceneVideoUrl)).toEqual([
      '/media/assessment/question-01.mp4',
      '/media/assessment/question-02.mp4',
      '/media/assessment/question-03.mp4',
      '/media/assessment/question-04.mp4',
    ])
  })

  it('uses the approved dark consultation room for the opening and every scene poster', () => {
    expect(assessmentConfig.opening.posterUrl).toBe('/images/assessment-landing.png')
    expect(assessmentConfig.scenes.map((scene) => scene.posterUrl)).toEqual(
      Array(4).fill('/images/assessment-landing.png'),
    )
  })

  it('does not define obsolete resume copy', () => {
    expect('resumeCta' in assessmentConfig.opening).toBe(false)
  })
})
