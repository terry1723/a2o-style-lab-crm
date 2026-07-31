export const companyConfig = {
  companyName: 'Your Company',
  catalogueTitle: 'Member Catalogue',
  catalogueSubtitle: 'Curated products selected for your customers.',
  logoUrl: '',
  whatsappNumber: '85200000000',
  currencyLabel: 'HK$',
  primaryColor: '#111111',
  accentColor: '#d69aa8',
  backgroundColor: '#f5f1eb',
  showMemberPrice: true,
  showCustomerNameInWhatsApp: true,
  cart: {
    enabled: true,
    storageKey: 'white-label-catalogue-cart-v1',
    checkoutLabel: 'Send order via WhatsApp',
    orderIntro: 'Hello, I would like to place the following order:',
  },
  filters: {
    categoryLabel: 'Category',
    styleLabel: 'Style',
    profileLabel: 'Recommended for',
  },
} as const
