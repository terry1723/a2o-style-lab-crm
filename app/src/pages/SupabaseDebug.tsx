import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

type CheckResult = {
  table: string
  status: 'idle' | 'success' | 'error'
  count?: number | null
  rows?: any[] | null
  error?: {
    message?: string
    code?: string
    details?: string
    hint?: string
  } | null
}

const maskKey = (value: string) => {
  if (!value) return '未設定'
  if (value.length <= 12) return '已設定，但長度異常'
  return `${value.slice(0, 8)}...${value.slice(-6)} (${value.length} chars)`
}

const getProjectRef = (url: string) => {
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/i)
  return match?.[1] || '未能解析 project ref'
}

export default function SupabaseDebug() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<string>('')

  const runCheck = async () => {
    setLoading(true)
    setLastRun(new Date().toLocaleString('zh-HK'))

    const tables = [
      { table: 'clients', columns: 'id,name,phone,status,created_at' },
      { table: 'services', columns: 'id,client_id,service_id,name,count' },
      { table: 'service_sessions', columns: 'id,client_id,service_id,date,time,status' },
      { table: 'users_custom', columns: 'id,phone,name,role' },
      { table: 'staff_profiles', columns: 'id,name,role' },
    ]

    const results: CheckResult[] = []

    for (const item of tables) {
      try {
        const { data, error, count } = await supabase
          .from(item.table)
          .select(item.columns, { count: 'exact' })
          .limit(5)

        if (error) {
          results.push({
            table: item.table,
            status: 'error',
            count,
            rows: null,
            error: {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            },
          })
        } else {
          results.push({
            table: item.table,
            status: 'success',
            count,
            rows: data || [],
            error: null,
          })
        }
      } catch (error: any) {
        results.push({
          table: item.table,
          status: 'error',
          rows: null,
          error: { message: error?.message || String(error) },
        })
      }
    }

    setChecks(results)
    setLoading(false)
  }

  useEffect(() => {
    runCheck()
  }, [])

  return (
    <div className="min-h-screen bg-a2o-beige p-4 md:p-8 text-a2o-black">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-a2o-warm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">A2O Supabase Debug</h1>
              <p className="text-sm text-a2o-black/60 mt-1">用嚟檢查 live site 實際連緊邊個 Supabase project，以及每個 table 是否讀到資料。</p>
            </div>
            <button
              onClick={runCheck}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-a2o-black text-white text-sm disabled:opacity-50"
            >
              {loading ? '檢查中...' : '重新檢查'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-a2o-warm">
          <h2 className="font-bold mb-3">Environment</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="bg-a2o-beige rounded-xl p-3">
              <p className="text-a2o-black/50">isSupabaseConfigured()</p>
              <p className="font-mono font-bold">{String(isSupabaseConfigured())}</p>
            </div>
            <div className="bg-a2o-beige rounded-xl p-3">
              <p className="text-a2o-black/50">Project Ref</p>
              <p className="font-mono font-bold break-all">{getProjectRef(supabaseUrl)}</p>
            </div>
            <div className="bg-a2o-beige rounded-xl p-3 md:col-span-2">
              <p className="text-a2o-black/50">VITE_SUPABASE_URL</p>
              <p className="font-mono font-bold break-all">{supabaseUrl || '未設定'}</p>
            </div>
            <div className="bg-a2o-beige rounded-xl p-3 md:col-span-2">
              <p className="text-a2o-black/50">VITE_SUPABASE_ANON_KEY</p>
              <p className="font-mono font-bold break-all">{maskKey(anonKey)}</p>
            </div>
            <div className="bg-a2o-beige rounded-xl p-3 md:col-span-2">
              <p className="text-a2o-black/50">Last Run</p>
              <p className="font-mono font-bold">{lastRun || '-'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {checks.map(check => (
            <div key={check.table} className="bg-white rounded-2xl p-5 shadow-sm border border-a2o-warm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold font-mono">public.{check.table}</h2>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  check.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {check.status === 'success' ? `SUCCESS · count ${check.count ?? 'unknown'}` : 'ERROR'}
                </div>
              </div>

              {check.error ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700 space-y-1">
                  <p><strong>message:</strong> {check.error.message || '-'}</p>
                  <p><strong>code:</strong> {check.error.code || '-'}</p>
                  <p><strong>details:</strong> {check.error.details || '-'}</p>
                  <p><strong>hint:</strong> {check.error.hint || '-'}</p>
                </div>
              ) : (
                <pre className="bg-a2o-beige rounded-xl p-3 text-xs overflow-auto max-h-72">
                  {JSON.stringify(check.rows, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-a2o-warm text-sm text-a2o-black/70">
          <h2 className="font-bold text-a2o-black mb-2">判斷方法</h2>
          <p>如果 Project Ref 唔係 <strong>gxobscepkunpusatrzaf</strong>，即係 Vercel 仍然連錯 Supabase project。</p>
          <p>如果 clients 顯示 SUCCESS 但 count 係 0，即係 live site 連到嘅 project 入面 public.clients 真係係空。</p>
          <p>如果 clients 顯示 ERROR，就睇 error message / code，通常係 RLS、grant、anon key 或 table 欄位問題。</p>
        </div>
      </div>
    </div>
  )
}
