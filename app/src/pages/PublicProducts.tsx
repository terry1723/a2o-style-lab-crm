import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn } from 'lucide-react'
import MemberPicks from '../components/MemberPicks'
import type { ClientData } from '../lib/clientData'

const guestClient = {
  id: 'public-guest',
  name: '訪客',
  phone: '',
  status: 'active',
} as ClientData

export default function PublicProducts() {
  const navigate = useNavigate()
  const { productId } = useParams()

  return (
    <div className="min-h-screen bg-a2o-beige">
      <div className="bg-white border-b border-a2o-warm">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-a2o-black/60 hover:text-a2o-pink">
            <ArrowLeft className="w-4 h-4" /> 首頁
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/experience')} className="text-sm text-a2o-black/60 hover:text-a2o-pink">
              形象體驗
            </button>
            <button onClick={() => navigate('/crm/login')} className="inline-flex items-center gap-1 rounded-full bg-a2o-black px-3 py-1.5 text-sm text-white hover:bg-a2o-pink">
              <LogIn className="w-4 h-4" /> 客戶登入
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto p-4 md:px-8 pb-20">
        <MemberPicks client={guestClient} clientPhone="" initialProductId={productId} publicMode />
      </main>
    </div>
  )
}
