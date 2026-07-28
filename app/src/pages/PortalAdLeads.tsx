import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  AD_LEAD_OWNERS,
  AD_LEAD_STATUSES,
  type AdLead,
  type AdLeadOwner,
  type AdLeadStatus,
} from '../features/ad-leads/adLeadService'

type AdLeadsResponse = {
  leads?: AdLead[]
  unavailableSources?: string[]
}

const LEADS_PER_PAGE = 20

function formatSubmittedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-HK', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function PortalAdLeads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<AdLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE))
  const visibleLeads = useMemo(
    () => leads.slice((page - 1) * LEADS_PER_PAGE, page * LEADS_PER_PAGE),
    [leads, page],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/ad-leads', { method: 'GET' })
      if (!response.ok) throw new Error('load_failed')
      const data = await response.json() as AdLeadsResponse
      setLeads(data.leads || [])
      setPage(1)
    } catch {
      setError('載入廣告新客失敗，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('a2o_staff_auth_v2')) {
      navigate('/portal')
      return
    }

    load()
  }, [load, navigate])

  const updateTracking = async (lead: AdLead, changes: Partial<Pick<AdLead, 'status' | 'owner'>>) => {
    const nextLead = { ...lead, ...changes }
    setSavingKey(lead.sourceKey)
    setError('')

    try {
      const response = await fetch('/api/ad-lead-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceKey: lead.sourceKey,
          status: nextLead.status,
          owner: nextLead.owner,
        }),
      })
      if (!response.ok) throw new Error('save_failed')
      setLeads(current => current.map(item => item.sourceKey === lead.sourceKey ? nextLead : item))
    } catch {
      setError('儲存跟進資料失敗，請稍後再試。')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="min-h-screen bg-a2o-beige text-a2o-black">
      <div className="bg-white border-b border-a2o-warm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/portal/staff')} className="text-a2o-black/60 hover:text-a2o-pink" aria-label="返回後台">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-serif font-bold">廣告新客</div>
            <p className="text-xs text-a2o-black/40">管理廣告表單提交及跟進狀況</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 pb-20">
        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={load} className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              重新載入
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-a2o-black/40 flex justify-center items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 載入中...</div>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-a2o-beige text-left text-xs text-a2o-black/60">
                <tr>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">電話號碼</th>
                  <th className="px-4 py-3 font-medium">填表日期</th>
                  <th className="px-4 py-3 font-medium">來源 Form</th>
                  <th className="px-4 py-3 font-medium">Tag</th>
                  <th className="px-4 py-3 font-medium">客人狀況</th>
                  <th className="px-4 py-3 font-medium">跟進同事</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-a2o-warm">
                {visibleLeads.map(lead => (
                  <tr key={lead.sourceKey}>
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{lead.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatSubmittedAt(lead.submittedAt)}</td>
                    <td className="px-4 py-3">{lead.source || '-'}</td>
                    <td className="px-4 py-3">{lead.tag || '-'}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`${lead.name} 的客人狀況`}
                        value={lead.status}
                        disabled={savingKey === lead.sourceKey}
                        onChange={event => updateTracking(lead, { status: event.target.value as AdLeadStatus })}
                        className="w-full min-w-32 rounded-lg border border-a2o-warm bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                      >
                        {AD_LEAD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`${lead.name} 的跟進同事`}
                        value={lead.owner}
                        disabled={savingKey === lead.sourceKey}
                        onChange={event => updateTracking(lead, { owner: event.target.value as AdLeadOwner })}
                        className="w-full min-w-24 rounded-lg border border-a2o-warm bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                      >
                        {AD_LEAD_OWNERS.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-a2o-black/40">暫時未有廣告新客</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {!loading && leads.length > LEADS_PER_PAGE && (
          <nav aria-label="廣告新客分頁" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-a2o-black/50">第 {page} / {pageCount} 頁・共 {leads.length} 位客人</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded-lg border border-a2o-warm bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">上一頁</button>
              <button type="button" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))} className="rounded-lg border border-a2o-warm bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">下一頁</button>
            </div>
          </nav>
        )}
      </main>
    </div>
  )
}
