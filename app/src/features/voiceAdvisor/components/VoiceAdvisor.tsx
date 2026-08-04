import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle, Mic, PhoneCall, ShieldCheck, Volume2, X } from 'lucide-react'

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

type RealtimeEvent = {
  type?: string
  response?: { output?: Array<{ type?: string; name?: string; call_id?: string; arguments?: string }> }
}

function getConversationId() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function VoiceAdvisor() {
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [notice, setNotice] = useState('')
  const [bookingSaved, setBookingSaved] = useState(false)
  const connectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopCall = () => {
    channelRef.current?.close()
    connectionRef.current?.close()
    streamRef.current?.getTracks().forEach(track => track.stop())
    if (audioRef.current) audioRef.current.srcObject = null
    channelRef.current = null
    connectionRef.current = null
    streamRef.current = null
    setStatus('idle')
  }

  useEffect(() => () => stopCall(), [])

  const sendEvent = (event: object) => {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(event))
  }

  const saveBookingRequest = async (call: { call_id?: string; arguments?: string }) => {
    let args: Record<string, unknown>
    try { args = JSON.parse(call.arguments || '{}') as Record<string, unknown> } catch { args = {} }
    const result = await fetch('/api/voice-booking-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: args.name,
        phone: args.phone,
        goal: args.goal,
        preferredContact: args.preferred_contact,
        preferredTime: args.preferred_time,
        marketingConsent,
        privacyConsent: consented,
      }),
    })
    const payload = await result.json().catch(() => ({})) as { ok?: boolean; error?: string }
    const ok = result.ok && payload.ok === true
    if (ok) setBookingSaved(true)
    sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(ok
          ? { ok: true, message: 'Booking request saved. Tell the visitor that the A2O team will confirm details by their preferred contact method.' }
          : { ok: false, message: 'The request could not be saved. Ask the visitor to use the booking form or contact A2O directly; do not claim the booking is confirmed.' }),
      },
    })
    sendEvent({ type: 'response.create' })
  }

  const handleRealtimeEvent = (raw: MessageEvent<string>) => {
    let event: RealtimeEvent
    try { event = JSON.parse(raw.data) as RealtimeEvent } catch { return }
    if (event.type === 'input_audio_buffer.speech_started') setStatus('listening')
    if (event.type === 'response.created') setStatus('speaking')
    if (event.type === 'response.done') {
      setStatus('listening')
      const bookingCall = event.response?.output?.find(item => item.type === 'function_call' && item.name === 'create_booking_request')
      if (bookingCall) void saveBookingRequest(bookingCall)
    }
    if (event.type === 'error') {
      setNotice('語音服務暫時未能回應，請稍後再試或改用預約表格。')
      setStatus('error')
    }
  }

  const startCall = async () => {
    if (!consented) return
    setNotice('')
    setBookingSaved(false)
    setStatus('connecting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const tokenResponse = await fetch('/api/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: getConversationId() }),
      })
      const tokenPayload = await tokenResponse.json().catch(() => ({})) as { value?: string; error?: string }
      if (!tokenResponse.ok || !tokenPayload.value) {
        stopCall()
        setNotice(tokenPayload.error === 'voice_not_configured'
          ? 'AI 語音顧問正在準備中。你可先使用預約表格，我們會以 WhatsApp 跟進。'
          : '語音服務暫時未能啟動，請稍後再試。')
        setStatus('error')
        return
      }

      const connection = new RTCPeerConnection()
      connectionRef.current = connection
      const audio = new Audio()
      audio.autoplay = true
      audioRef.current = audio
      connection.ontrack = event => { audio.srcObject = event.streams[0] }
      stream.getTracks().forEach(track => connection.addTrack(track, stream))
      const channel = connection.createDataChannel('oai-events')
      channelRef.current = channel
      channel.addEventListener('message', handleRealtimeEvent)
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setStatus('listening')
        if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
          setNotice('語音連線已中斷，請重新開始。')
          setStatus('error')
        }
      }
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenPayload.value}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!sdpResponse.ok) throw new Error('realtime_connection_failed')
      await connection.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() })
    } catch {
      stopCall()
      setNotice('未能使用咪高峰或建立語音連線。請檢查瀏覽器權限後重試。')
      setStatus('error')
    }
  }

  const close = () => { stopCall(); setOpen(false); setNotice('') }
  const active = status === 'connecting' || status === 'listening' || status === 'speaking'
  const statusLabel = status === 'connecting' ? '正在連接' : status === 'speaking' ? '顧問正在回應' : status === 'listening' ? '正在聆聽' : '準備開始'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full bg-a2o-black px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-a2o-pink focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2" aria-label="開啟 AI 語音顧問">
        <PhoneCall className="h-4 w-4" /> AI 語音顧問
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="A2O AI 語音顧問">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold tracking-[0.18em] text-a2o-pink">A2O VOICE ADVISOR</p><h2 className="mt-1 text-xl font-bold text-a2o-black">先用語音了解，再決定下一步</h2></div>
              <button type="button" onClick={close} className="rounded-full p-2 text-a2o-black/50 hover:bg-a2o-beige" aria-label="關閉"><X className="h-5 w-5" /></button>
            </div>

            {!active && !bookingSaved && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-a2o-black/70">你可以直接問 A2O 的形象分析、風格方向和預約流程。預約是否合適，A2O 團隊會再以 WhatsApp 跟進確認。</p>
                <label className="flex cursor-pointer gap-3 rounded-2xl bg-a2o-beige p-3 text-sm leading-5 text-a2o-black/75">
                  <input type="checkbox" checked={consented} onChange={event => setConsented(event.target.checked)} className="mt-1 h-4 w-4 accent-a2o-pink" />
                  <span><span className="font-semibold text-a2o-black">我同意啟動即時語音服務。</span><br />聲音會由 AI 即時處理；A2O 不會保存本功能的錄音或完整對話。如你明確授權留下預約資料，A2O 才會把該資料寫入 CRM 作跟進。</span>
                </label>
                <label className="flex cursor-pointer gap-3 text-sm leading-5 text-a2o-black/70">
                  <input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-a2o-pink" />
                  <span>我願意透過 WhatsApp 接收 A2O 有關形象服務、穿搭、髮型、活動、優惠及套餐的推廣資訊。我明白可隨時退出，而不影響預約查詢。</span>
                </label>
                <button type="button" onClick={() => void startCall()} disabled={!consented} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"><Mic className="h-4 w-4" />開始語音對話</button>
              </div>
            )}

            {active && <div className="py-7 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-a2o-pink/10 text-a2o-pink"><Volume2 className="h-7 w-7" /></div><p className="font-semibold text-a2o-black">{statusLabel}</p><p className="mt-2 text-sm text-a2o-black/60">你可以直接說出想改善的形象問題，或說「我想預約」。</p><button type="button" onClick={stopCall} className="btn-secondary mt-6 justify-center">結束對話</button></div>}

            {bookingSaved && <div className="rounded-2xl bg-green-50 p-4 text-center"><ShieldCheck className="mx-auto mb-2 h-7 w-7 text-green-600" /><p className="font-semibold text-a2o-black">預約意向已交給 A2O 團隊</p><p className="mt-2 text-sm leading-5 text-a2o-black/65">這不是已確認的時段；團隊會按你留下的聯絡方式跟進。</p><Link to="/booking" onClick={close} className="btn-primary mt-4 justify-center">繼續填寫預約表格</Link></div>}

            {notice && <div className="mt-4 rounded-xl bg-a2o-beige p-3 text-sm leading-5 text-a2o-black/70">{notice}<Link to="/booking" onClick={close} className="mt-2 block font-semibold text-a2o-pink underline">前往預約表格</Link></div>}
            {status === 'connecting' && <LoaderCircle className="mx-auto mt-4 h-5 w-5 animate-spin text-a2o-pink" />}
          </div>
        </div>
      )}
    </>
  )
}
