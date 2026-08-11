export type Testimonial = {
  id: string
  quote: string
  attribution?: string
}

// Publish only approved client feedback. This intentionally starts empty.
export const testimonials: Testimonial[] = []
