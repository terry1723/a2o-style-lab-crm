export type TransformationCase = {
  id: string
  image: string
  alt: string
  tags: string[]
}

export const transformationCases: TransformationCase[] = [
  { id: 'case-01', image: '/a2o/cases/case-01.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例一', tags: ['髮型', '比例', '穿搭', '風格'] },
  { id: 'case-02', image: '/a2o/cases/case-02.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例二', tags: ['風格', '色彩', '比例'] },
  { id: 'case-03', image: '/a2o/cases/case-03.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例三', tags: ['髮型', '儀容', '穿搭'] },
  { id: 'case-04', image: '/a2o/cases/case-04.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例四', tags: ['比例', '色彩', '風格'] },
  { id: 'case-05', image: '/a2o/cases/case-05.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例五', tags: ['色彩', '穿搭', '風格'] },
  { id: 'case-06', image: '/a2o/cases/case-06.jpg', alt: 'A2O Style Lab 男士形象 Before and After 設計案例六', tags: ['髮型', '儀容', '比例'] },
]
