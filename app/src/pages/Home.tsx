import { AssessmentSection } from '../features/assessment/components/AssessmentSection'
import { A2OHomepageContent } from '../features/homepage/components/A2OHomepageContent'

export default function Home() {
  return <A2OHomepageContent assessment={<AssessmentSection />} />
}
