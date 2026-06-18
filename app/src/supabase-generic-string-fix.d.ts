declare global {
  interface String {
    id: string
    phone: string
    plan: string
    plan_price: number
    amount_paid: number
    balance_due: number
    status: string
  }
}

export {}
