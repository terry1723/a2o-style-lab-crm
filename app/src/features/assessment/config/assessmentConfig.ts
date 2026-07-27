import type { AssessmentConfig, AssessmentOption } from '../types/assessment'

const media = (name: string) => `/media/assessment/${name}`

const scoreOptions = Array.from({ length: 10 }, (_, index): AssessmentOption => {
  const score = index + 1
  return {
    id: `q1_${score}`,
    label: String(score),
    value: String(score),
    score: score <= 4
      ? { low_energy_appearance: 2 }
      : score <= 7
        ? { untapped_image_potential: 2 }
        : { style_without_structure: 1 },
  }
})

export const assessmentConfig: AssessmentConfig = {
  version: 2,
  experienceId: 'a2o-four-video-image-assessment',
  opening: {
    headline: '你目前的形象，與你希望留給他人的印象一致嗎？',
    supportingText: '由 Martin 親自提出四個簡單問題，了解你目前最值得改善的方向。',
    cta: '開始形象檢測',
    posterUrl: '/images/assessment-landing.png',
    note: '約2分鐘｜免費個人形象初步檢測',
  },
  whatsappNumber: '85254077240',
  defaultResultId: 'untapped_image_potential',
  results: {
    untapped_image_potential: {
      id: 'untapped_image_potential',
      eyebrow: '你的初步形象分析',
      title: '未被發揮的形象潛力',
      summary: '你已經知道自己想改變，只是仍欠一套清晰、可持續執行的方法。',
      recommendation: '從場合、比例和固定搭配框架入手，能最快帶來整體提升。',
    },
    professional_presence_gap: {
      id: 'professional_presence_gap',
      eyebrow: '你的初步形象分析',
      title: '專業存在感落差',
      summary: '你想呈現成熟可靠的感覺，但目前造型未完全支援你的職場角色。',
      recommendation: '先處理版型、輪廓與精神面貌，能更快建立可信任的第一印象。',
    },
    style_without_structure: {
      id: 'style_without_structure',
      eyebrow: '你的初步形象分析',
      title: '具備風格方向，缺乏搭配結構',
      summary: '你對喜歡的感覺不陌生，但衣櫃與日常配搭仍未形成穩定系統。',
      recommendation: '建立個人色彩、比例和核心單品清單，可令每次選擇更簡單。',
    },
    low_energy_appearance: {
      id: 'low_energy_appearance',
      eyebrow: '你的初步形象分析',
      title: '精神感與整體狀態落差',
      summary: '你目前最值得優先處理的，是讓外觀更乾淨、有精神和有完整感。',
      recommendation: '由髮型、膚況和上半身輪廓開始，通常能帶來最明顯的即時改變。',
    },
  },
  scenes: [
    {
      id: 'scene-01',
      order: 1,
      enabled: true,
      sceneVideoUrl: media('question-01.mp4'),
      posterUrl: '/images/assessment-landing.png',
      questionCueSeconds: 9999,
      idleMode: 'hold-last-frame',
      caption: 'Martin 會先了解你如何看待自己目前的形象。',
      question: {
        id: 'q1',
        type: 'single',
        layout: 'scale',
        title: '以 1 至 10 分計算，你會給自己的形象多少分？',
        options: scoreOptions,
      },
    },
    {
      id: 'scene-02',
      order: 2,
      enabled: true,
      sceneVideoUrl: media('question-02.mp4'),
      posterUrl: '/images/assessment-landing.png',
      questionCueSeconds: 9999,
      idleMode: 'hold-last-frame',
      caption: '你最常出現的場合，決定最需要優先建立的形象。',
      question: {
        id: 'q2',
        type: 'single',
        title: '你認為目前的形象最影響哪一個場合？',
        options: [
          { id: 'q2_a', label: '會見客戶、銷售或商務洽談', value: 'client_sales', score: { professional_presence_gap: 3 } },
          { id: 'q2_b', label: '工作會議、面試或升職', value: 'career', score: { professional_presence_gap: 3 } },
          { id: 'q2_c', label: '約會或認識新對象', value: 'dating', score: { untapped_image_potential: 2 } },
          { id: 'q2_d', label: '社交場合或朋友聚會', value: 'social', score: { untapped_image_potential: 2 } },
          { id: 'q2_e', label: '拍照、影片或個人品牌', value: 'personal_brand', score: { style_without_structure: 2 } },
          { id: 'q2_f', label: '日常生活與自信', value: 'daily_confidence', score: { low_energy_appearance: 2 } },
        ],
      },
    },
    {
      id: 'scene-03',
      order: 3,
      enabled: true,
      sceneVideoUrl: media('question-03.mp4'),
      posterUrl: '/images/assessment-landing.png',
      questionCueSeconds: 9999,
      idleMode: 'hold-last-frame',
      caption: '形象所影響的，往往不只是一套服裝。',
      question: {
        id: 'q3',
        type: 'single',
        title: '你認為目前的形象，最容易令你錯失哪一種機會？',
        options: [
          { id: 'q3_a', label: '客戶信任與成交機會', value: 'client_trust', score: { professional_presence_gap: 3 } },
          { id: 'q3_b', label: '面試、升職或事業發展', value: 'career_growth', score: { professional_presence_gap: 3 } },
          { id: 'q3_c', label: '約會或感情發展', value: 'relationship', score: { untapped_image_potential: 2 } },
          { id: 'q3_d', label: '社交、人脈或合作機會', value: 'networking', score: { untapped_image_potential: 2 } },
          { id: 'q3_e', label: '拍照曝光或建立個人品牌', value: 'visibility', score: { style_without_structure: 2 } },
          { id: 'q3_f', label: '暫時未能明確說明，但知道形象需要改善', value: 'unsure', score: { low_energy_appearance: 2 } },
        ],
      },
    },
    {
      id: 'scene-04',
      order: 4,
      enabled: true,
      sceneVideoUrl: media('question-04.mp4'),
      posterUrl: '/images/assessment-landing.png',
      questionCueSeconds: 9999,
      idleMode: 'hold-last-frame',
      caption: '選擇一個最希望優先處理的方向，我們會從該處開始分析。',
      question: {
        id: 'q4',
        type: 'single',
        title: '如果只能優先改善一個形象項目，你最希望從哪裡開始？',
        options: [
          { id: 'q4_a', label: '髮型與頭部輪廓', value: 'hair', score: { low_energy_appearance: 2 } },
          { id: 'q4_b', label: '皮膚、精神面貌與男士儀容', value: 'grooming', score: { low_energy_appearance: 3 } },
          { id: 'q4_c', label: '身形比例與服裝剪裁', value: 'proportion', score: { untapped_image_potential: 2 } },
          { id: 'q4_d', label: '穿搭配色與衣櫥方向', value: 'styling', score: { style_without_structure: 3 } },
          { id: 'q4_e', label: '整體專業形象定位', value: 'positioning', score: { professional_presence_gap: 3 } },
        ],
      },
    },
  ],
}
