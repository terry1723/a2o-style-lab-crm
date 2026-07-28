import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Image, Loader2, Phone, Search, User } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

type ClientLite = {
  id: string
  name: string | null
  phone: string | null
}

type PhotoResult = {
  url: string
  field: string
  raw: string
}

const PHOTO_FIELD_PRIORITY = [
  'before_photo',
  'photo_url',
  'image_url',
  'profile_photo',
  'profile_image',
  'avatar_url',
  'avatar',
  'photo',
  'image',
]

function looksLikePhotoValue(value: unknown) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  return v.startsWith('data:image') || v.startsWith('http://') || v.startsWith('https://')
}

function findPhoto(row: Record<string, unknown> | null): PhotoResult | null {
  if (!row) return null

  for (const field of PHOTO_FIELD_PRIORITY) {
    const value = row[field]
    if (looksLikePhotoValue(value)) {
      return { field, url: String(value), raw: String(value) }
    }
  }

  for (const [field, value] of Object.entries(row)) {
    if (looksLikePhotoValue(value)) {
      return { field, url: String(value), raw: String(value) }
    }
  }

  for (const field of PHOTO_FIELD_PRIORITY) {
    const value = row[field]
    if (typeof value === 'string' && value.trim()) {
      return { field, url: '', raw: value.trim() }
    }
  }

  return null
}

export default function PortalPhotos() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientLite[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingClientId, setLoadingClientId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Record<string, PhotoResult | null>>({})

  useEffect(() => {
    if (!localStorage.getItem('a2o_staff_auth_v2')) {
      navigate('/portal')
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')

      if (!isSupabaseConfigured()) {
        setError('Supabase 尚未設定')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id,name,phone')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
        setClients([])
      } else {
        setClients((data || []) as ClientLite[])
      }
      setLoading(false)
    }

    load()
  }, [navigate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(client => `${client.name || ''} ${client.phone || ''}`.toLowerCase().includes(q))
  }, [clients, search])

  const loadPhoto = async (client: ClientLite) => {
    setLoadingClientId(client.id)
    setError('')

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client.id)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setPhotos(prev => ({ ...prev, [client.id]: null }))
    } else {
      setPhotos(prev => ({ ...prev, [client.id]: findPhoto(data as Record<string, unknown>) }))
    }

    setLoadingClientId(null)
  }

  const copyRaw = async (value: string) => {
    await navigator.clipboard.writeText(value)
    alert('已複製相片資料')
  }

  return (
    <div className="min-h-screen bg-a2o-beige text-a2o-black">
      <div className="bg-white border-b border-a2o-warm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/portal/staff')} className="text-a2o-black/60 hover:text-a2o-pink">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-lg font-serif font-bold">客人相片</div>
              <p className="text-xs text-a2o-black/40">逐個客人按需要先載入相片，不會一開始載入全部圖片</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-100 text-green-700">Lazy Load</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 pb-20 space-y-4">
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-a2o-black/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-sm"
            placeholder="搜索姓名或電話..."
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-a2o-black/40">載入客戶中...</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(client => {
              const photo = photos[client.id]
              const isLoaded = Object.prototype.hasOwnProperty.call(photos, client.id)
              return (
                <div key={client.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-a2o-beige flex items-center justify-center">
                        <User className="w-5 h-5 text-a2o-black/30" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{client.name || '未命名'}</p>
                        <p className="text-xs text-a2o-black/50 flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => loadPhoto(client)}
                        disabled={loadingClientId === client.id}
                        className="px-3 py-2 bg-a2o-black text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {loadingClientId === client.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                        {loadingClientId === client.id ? '載入中' : '載入相片'}
                      </button>
                    </div>
                  </div>

                  {isLoaded && (
                    <div className="mt-4 bg-a2o-beige rounded-xl p-3">
                      {photo?.url ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <img src={photo.url} className="w-24 h-24 rounded-lg object-cover bg-white border border-a2o-warm" />
                          <div className="space-y-2 min-w-0">
                            <p className="text-xs text-a2o-black/50">來源欄位：{photo.field}</p>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => window.open(photo.url, '_blank')} className="px-3 py-2 bg-a2o-pink text-white rounded-lg text-xs font-medium flex items-center gap-1.5">
                                <ExternalLink className="w-3.5 h-3.5" /> 開啟相片
                              </button>
                              <button onClick={() => copyRaw(photo.raw)} className="px-3 py-2 border border-a2o-warm bg-white rounded-lg text-xs">複製連結 / 圖片資料</button>
                            </div>
                          </div>
                        </div>
                      ) : photo?.raw ? (
                        <div className="space-y-2">
                          <p className="text-sm text-a2o-black/70">有搵到相片資料，但唔係可直接開啟嘅圖片 URL。</p>
                          <p className="text-xs text-a2o-black/50">來源欄位：{photo.field}</p>
                          <button onClick={() => copyRaw(photo.raw)} className="px-3 py-2 border border-a2o-warm bg-white rounded-lg text-xs">複製原始相片資料</button>
                        </div>
                      ) : (
                        <p className="text-sm text-a2o-black/40">暫時搵唔到此客人的相片欄位。可能相片存在 Supabase Storage，但 clients table 未有儲存相片 URL。</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
