import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle, Mic, PhoneCall, ShieldCheck, Volume2, X } from 'lucide-react'

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'
type GeminiMessage = {
  serverContent?: { modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> }; turnComplete?: boolean }
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }
}

const GEMINI_MODEL = 'gemini-3.1-flash-live-preview'
const GEMINI_WEBSOCKET = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

const A2O_VOICE_INSTRUCTIONS = `You are the A2O AI image consultant for a Hong Kong men's image-improvement and styling business.
Speak in natural Cantonese by default. Switch to Mandarin or English only when the visitor asks. Be warm, concise, practical and never judgmental.
Answer only about the A2O image assessment, general image and styling consultation, how to make a booking request, and what happens after leaving a request. The assessment helps identify priorities, while the A2O team confirms exact service scope, price and availability. Never invent pricing, stock, dates, guarantees, medical advice, or service details not stated here.
If a visitor wants to book, collect only name, WhatsApp phone number, main goal, preferred contact method and preferred time. Before calling create_booking_request, clearly obtain their explicit, current confirmation that A2O may use these details to contact them about this request. Never call it without this confirmation. Explain this is a booking request, not a confirmed time slot. Marketing messages are separate and optional.`

const BOOKING_TOOL = {
  functionDeclarations: [{
    name: 'create_booking_request',
    description: 'Save an explicitly authorized A2O booking request after the visitor confirms A2O may use their contact details to follow up.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Visitor name' },
        phone: { type: 'STRING', description: 'Hong Kong WhatsApp phone number' },
        goal: { type: 'STRING', description: 'Main image or styling goal' },
        preferred_contact: { type: 'STRING', description: 'Preferred contact method, normally WhatsApp' },
        preferred_time: { type: 'STRING', description: 'Preferred date or time for a follow-up' },
      },
      required: ['name', 'phone', 'goal', 'preferred_contact', 'preferred_time'],
    },
  }],
}

function getConversationId() { return crypto.randomUUID().replace(/-/g, '') }

function base64FromBytes(bytes: Uint8Array) {
  let value = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) value += String.fromCharCode(...bytes.subarray(index, index + chunk))
  return btoa(value)
}

function bytesFromBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function downsampleToPcm16(samples: Float32Array, sourceRate: number) {
  const targetRate = 16_000
  if (sourceRate === targetRate) {
    const output = new Int16Array(samples.length)
    for (let index = 0; index < samples.length; index += 1) output[index] = Math.max(-1, Math.min(1, samples[index])) * 0x7fff
    return output
  }
  const ratio = sourceRate / targetRate
  const output = new Int16Array(Math.round(samples.length / ratio))
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(samples.length, Math.floor((index + 1) * ratio))
    let sum = 0
    for (let offset = start; offset < end; offset += 1) sum += samples[offset]
    output[index] = Math.max(-1, Math.min(1, sum / Math.max(1, end - start))) * 0x7fff
  }
  return output
}

export function VoiceAdvisor() {
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [notice, setNotice] = useState('')
  const [bookingSaved, setBookingSaved] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const nextAudioTimeRef = useRef(0)

  const stopCall = () => {
    socketRef.current?.close()
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach(track => track.stop())
    if (contextRef.current && contextRef.current.state !== 'closed') void contextRef.current.close()
    socketRef.current = null
    processorRef.current = null
    sourceRef.current = null
    streamRef.current = null
    contextRef.current = null
    nextAudioTimeRef.current = 0
    setStatus('idle')
  }

  useEffect(() => () => stopCall(), [])

  const send = (message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(message))
  }

  const playPcm = (base64: string) => {
    const context = contextRef.current
    if (!context) return
    const bytes = bytesFromBase64(base64)
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2))
    const audioBuffer = context.createBuffer(1, pcm.length, 24_000)
    const channel = audioBuffer.getChannelData(0)
    for (let index = 0; index < pcm.length; index += 1) channel[index] = pcm[index] / 0x8000
    const source = context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime, nextAudioTimeRef.current)
    source.start(startAt)
    nextAudioTimeRef.current = startAt + audioBuffer.duration
  }

  const saveBookingRequest = async (call: { id?: string; args?: Record<string, unknown> }) => {
    const args = call.args || {}
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
    const payload = await result.json().catch(() => ({})) as { ok?: boolean }
    const ok = result.ok && payload.ok === true
    if (ok) setBookingSaved(true)
    send({ toolResponse: { functionResponses: [{
      name: 'create_booking_request', id: call.id,
      response: { result: ok
        ? { ok: true, message: 'Booking request saved. Tell the visitor the A2O team will follow up by their preferred contact method.' }
        : { ok: false, message: 'The request could not be saved. Ask the visitor to use the booking form; do not claim a booking is confirmed.' } },
    }] } })
  }

  const handleMessage = async (event: MessageEvent<string | Blob>) => {
    const raw = typeof event.data === 'string' ? event.data : await event.data.text()
    let message: GeminiMessage
    try { message = JSON.parse(raw) as GeminiMessage } catch { return }
    const parts = message.serverContent?.modelTurn?.parts || []
    for (const part of parts) if (part.inlineData?.data) playPcm(part.inlineData.data)
    if (parts.length) setStatus('speaking')
    if (message.serverContent?.turnComplete) setStatus('listening')
    for (const call of message.toolCall?.functionCalls || []) {
      if (call.name === 'create_booking_request') void saveBookingRequest(call)
    }
  }

  const startCall = async () => {
    if (!consented) return
    setNotice('')
    setBookingSaved(false)
    setStatus('connecting')
    try {
      const tokenResponse = await fetch('/api/voice-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: getConversationId() }),
      })
      const tokenPayload = await tokenResponse.json().catch(() => ({})) as { token?: string; error?: string }
      if (!tokenResponse.ok || !tokenPayload.token) {
        setNotice(tokenPayload.error === 'voice_not_configured'
          ? 'AI 語音顧問正在準備中。你可先使用預約表格，我們會以 WhatsApp 跟進。'
          : '語音服務暫時未能啟動，請稍後再試。')
        setStatus('error')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const context = new AudioContext()
      contextRef.current = context
      await context.resume()
      const socket = new WebSocket(`${GEMINI_WEBSOCKET}?access_token=${encodeURIComponent(tokenPayload.token)}`)
      socketRef.current = socket
      socket.onopen = () => {
        send({ setup: {
          model: `models/${GEMINI_MODEL}`,
          responseModalities: ['AUDIO'],
          systemInstruction: { parts: [{ text: A2O_VOICE_INSTRUCTIONS }] },
          tools: [BOOKING_TOOL],
        } })
        const source = context.createMediaStreamSource(stream)
        const processor = context.createScriptProcessor(4096, 1, 1)
        const silentGain = context.createGain()
        silentGain.gain.value = 0
        source.connect(processor)
        processor.connect(silentGain)
        silentGain.connect(context.destination)
        processor.onaudioprocess = audioEvent => {
          const pcm = downsampleToPcm16(audioEvent.inputBuffer.getChannelData(0), context.sampleRate)
          send({ realtimeInput: { audio: { data: base64FromBytes(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } } })
        }
        sourceRef.current = source
        processorRef.current = processor
        setStatus('listening')
      }
      socket.onmessage = event => { void handleMessage(event) }
      socket.onerror = () => { setNotice('語音服務暫時未能回應，請稍後再試或改用預約表格。'); setStatus('error') }
      socket.onclose = () => {
        if (socketRef.current === socket) {
          setNotice('語音連線已中斷，請重新開始。')
          setStatus('error')
        }
      }
    } catch {
      stopCall()
      setNotice('未能使用咪高峰或建立語音連線。請檢查瀏覽器權限後重試。')
      setStatus('error')
    }
  }

  const close = () => { stopCall(); setOpen(false); setNotice('') }
  const active = status === 'connecting' || status === 'listening' || status === 'speaking'
  const statusLabel = status === 'connecting' ? '正在連接' : status === 'speaking' ? '顧問正在回應' : status === 'listening' ? '正在聆聽' : '準備開始'

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full bg-a2o-black px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-a2o-pink focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2" aria-label="開啟 AI 語音顧問"><PhoneCall className="h-4 w-4" /> AI 語音顧問</button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="A2O AI 語音顧問">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.18em] text-a2o-pink">A2O VOICE ADVISOR</p><h2 className="mt-1 text-xl font-bold text-a2o-black">先用語音了解，再決定下一步</h2></div><button type="button" onClick={close} className="rounded-full p-2 text-a2o-black/50 hover:bg-a2o-beige" aria-label="關閉"><X className="h-5 w-5" /></button></div>
        {!active && !bookingSaved && <div className="space-y-4"><p className="text-sm leading-6 text-a2o-black/70">你可以直接問 A2O 的形象分析、風格方向和預約流程。預約是否合適，A2O 團隊會再以 WhatsApp 跟進確認。</p><label className="flex cursor-pointer gap-3 rounded-2xl bg-a2o-beige p-3 text-sm leading-5 text-a2o-black/75"><input type="checkbox" checked={consented} onChange={event => setConsented(event.target.checked)} className="mt-1 h-4 w-4 accent-a2o-pink" /><span><span className="font-semibold text-a2o-black">我同意啟動即時語音服務。</span><br />聲音會由 AI 即時處理；A2O 不會保存本功能的錄音或完整對話。如你明確授權留下預約資料，A2O 才會把該資料寫入 CRM 作跟進。</span></label><label className="flex cursor-pointer gap-3 text-sm leading-5 text-a2o-black/70"><input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-a2o-pink" /><span>我願意透過 WhatsApp 接收 A2O 有關形象服務、穿搭、髮型、活動、優惠及套餐的推廣資訊。我明白可隨時退出，而不影響預約查詢。</span></label><button type="button" onClick={() => void startCall()} disabled={!consented} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"><Mic className="h-4 w-4" />開始語音對話</button></div>}
        {active && <div className="py-7 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-a2o-pink/10 text-a2o-pink"><Volume2 className="h-7 w-7" /></div><p className="font-semibold text-a2o-black">{statusLabel}</p><p className="mt-2 text-sm text-a2o-black/60">你可以直接說出想改善的形象問題，或說「我想預約」。</p><button type="button" onClick={stopCall} className="btn-secondary mt-6 justify-center">結束對話</button></div>}
        {bookingSaved && <div className="rounded-2xl bg-green-50 p-4 text-center"><ShieldCheck className="mx-auto mb-2 h-7 w-7 text-green-600" /><p className="font-semibold text-a2o-black">預約意向已交給 A2O 團隊</p><p className="mt-2 text-sm leading-5 text-a2o-black/65">這不是已確認的時段；團隊會按你留下的聯絡方式跟進。</p><Link to="/booking" onClick={close} className="btn-primary mt-4 justify-center">繼續填寫預約表格</Link></div>}
        {notice && <div className="mt-4 rounded-xl bg-a2o-beige p-3 text-sm leading-5 text-a2o-black/70">{notice}<Link to="/booking" onClick={close} className="mt-2 block font-semibold text-a2o-pink underline">前往預約表格</Link></div>}
        {status === 'connecting' && <LoaderCircle className="mx-auto mt-4 h-5 w-5 animate-spin text-a2o-pink" />}
      </div>
    </div>}
  </>
}
