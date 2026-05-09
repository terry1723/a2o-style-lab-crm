import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getClientById } from '../lib/clientData'
import { CheckCircle, ArrowRight, MessageCircle } from 'lucide-react'

export default function CrmSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<any>(null)
  const id = searchParams.get('id')

  useEffect(() => {
    if (id) {
      getClientById(id).then(c => setClient(c))
    }
  }, [id])

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">資料已提交</h2>
        <p className="text-gray-600 mb-6">
          {client ? `感謝 ${client.name}，我們已收到你的資料。` : '我們已收到你的資料。'}
        </p>
        <div className="space-y-3">
          <button onClick={() => navigate('/crm/dashboard')} className="w-full bg-[#1A1A1A] text-white py-3 rounded-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
            查看我的進度 <ArrowRight className="w-4 h-4" />
          </button>
          <a href="https://wa.me/85254077240" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-lg">
            <MessageCircle className="w-4 h-4" /> WhatsApp 聯繫我們
          </a>
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-[#D4849A]">
            返回首頁
          </button>
        </div>
      </div>
    </div>
  )
}
